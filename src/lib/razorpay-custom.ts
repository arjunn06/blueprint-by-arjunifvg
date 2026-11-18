import { digitsOnly, parseExpiry } from "@/lib/card-utils";

/**
 * Razorpay "Custom Checkout" (razorpay.js): our own form, Razorpay's processing. Card and UPI details go from
 * the browser straight to Razorpay; nothing here sends them to our servers, logs them or stores them.
 *
 * Proven in test mode (spikes/razorpay-custom-checkout): `createPayment` accepts `subscription_id` for cards
 * and UPI, and the result verifies with the same HMAC the Standard Checkout flow uses.
 */

const SDK_URL = "https://checkout.razorpay.com/v1/razorpay.js";

/** The slice of razorpay.js this file uses. */
type RazorpayInstance = {
  on(event: string, cb: (payload: unknown) => void): void;
  once(event: string, cb: (payload: unknown) => void): void;
  createPayment(data: Record<string, unknown>): void;
};
type RazorpayCtor = new (options: Record<string, unknown>) => RazorpayInstance;

let customCtor: RazorpayCtor | null = null;
let loading: Promise<RazorpayCtor> | null = null;

const rec = (v: unknown): Record<string, unknown> =>
  v && typeof v === "object" ? (v as Record<string, unknown>) : {};
const str = (v: unknown) => (typeof v === "string" ? v : undefined);

/** See razorpay-checkout.ts: keep the constructor we got at load time, never re-read `window.Razorpay`. */
export function loadCustomSdk(): Promise<RazorpayCtor> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (customCtor) return Promise.resolve(customCtor);
  if (loading) return loading;
  loading = new Promise<RazorpayCtor>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SDK_URL;
    s.async = true;
    s.onload = () => {
      customCtor = window.Razorpay as RazorpayCtor;
      resolve(customCtor);
    };
    s.onerror = () => {
      loading = null;
      reject(
        new Error("Couldn’t load the secure payment form. Check your connection and try again."),
      );
    };
    document.body.appendChild(s);
  });
  return loading;
}

export type PaymentTarget =
  | { kind: "subscription"; subscriptionId: string; amountPaise: number }
  | { kind: "order"; orderId: string; amountPaise: number };

export type PayMethod =
  | { type: "card"; number: string; name: string; expiry: string; cvv: string }
  | { type: "upi"; vpa: string };

export type CheckoutSuccess = {
  paymentId: string;
  orderId?: string;
  subscriptionId?: string;
  signature: string;
};

export type CheckoutFailure = { message: string; code?: string; step?: string; reason?: string };

export type CustomCheckout = {
  /** Resolves when Razorpay reports the form is usable, or after a short grace period. */
  ready: Promise<void>;
  /**
   * Start the payment. Call it straight from a click handler with no `await` before it: the bank
   * verification window needs a user gesture to open. With `callbackUrl` the whole tab leaves for the bank
   * and returns by a form POST to that URL, so no success event fires in this page.
   */
  pay(args: {
    target: PaymentTarget;
    method: PayMethod;
    email: string;
    mobile: string;
    callbackUrl?: string;
  }): void;
};

const READY_GRACE_MS = 6000;

export function toFailure(err: unknown): CheckoutFailure {
  const e = rec(err);
  const description = (str(e.description) ?? "").trim();
  return {
    message: description
      ? description.slice(0, 200)
      : "The payment didn’t go through. Please try again.",
    code: str(e.code),
    step: str(e.step),
    reason: str(e.reason),
  };
}

export async function createCustomCheckout(opts: {
  key: string;
  /** True for the `callback_url` (whole-tab) variant. */
  redirect: boolean;
  onSuccess: (r: CheckoutSuccess) => void;
  onFailure: (f: CheckoutFailure) => void;
}): Promise<CustomCheckout> {
  const Ctor = await loadCustomSdk();
  const rzp = new Ctor(opts.redirect ? { key: opts.key, redirect: true } : { key: opts.key });

  let markReady: () => void = () => {};
  const ready = new Promise<void>((resolve) => {
    markReady = resolve;
    setTimeout(resolve, READY_GRACE_MS);
  });
  rzp.once("ready", () => markReady());

  rzp.on("payment.success", (payload) => {
    const r = rec(payload);
    opts.onSuccess({
      paymentId: str(r.razorpay_payment_id) ?? "",
      orderId: str(r.razorpay_order_id),
      subscriptionId: str(r.razorpay_subscription_id),
      signature: str(r.razorpay_signature) ?? "",
    });
  });
  rzp.on("payment.error", (payload) => opts.onFailure(toFailure(rec(payload).error)));

  return {
    ready,
    pay({ target, method, email, mobile, callbackUrl }) {
      const data: Record<string, unknown> = {
        amount: target.amountPaise,
        currency: "INR",
        email,
        contact: mobile,
        ...(target.kind === "subscription"
          ? { subscription_id: target.subscriptionId }
          : { order_id: target.orderId }),
        ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      };
      if (method.type === "card") {
        const exp = parseExpiry(method.expiry);
        data.method = "card";
        data.card = {
          number: digitsOnly(method.number),
          name: method.name.trim(),
          expiry_month: exp ? String(exp.month).padStart(2, "0") : "",
          expiry_year: exp ? String(exp.year).slice(-2) : "",
          cvv: method.cvv,
        };
      } else {
        data.method = "upi";
        data.vpa = method.vpa.trim();
      }
      rzp.createPayment(data);
    },
  };
}

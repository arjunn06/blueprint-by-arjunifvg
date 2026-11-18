declare global {
  interface Window {
    Razorpay?: any;
  }
}

let scriptPromise: Promise<void> | null = null;
/**
 * checkout.js (this file) and razorpay.js (src/lib/razorpay-custom.ts) both assign `window.Razorpay`, and
 * whichever loads last wins. Each loader therefore keeps the constructor it got at load time and never
 * reads `window.Razorpay` again.
 */
type StandardCtor = new (options: CheckoutOptions) => {
  on(event: string, cb: (payload: unknown) => void): void;
  open(): void;
};
let standardCtor: StandardCtor | null = null;

export function loadRazorpay(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("Browser only"));
  if (standardCtor) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.async = true;
    s.onload = () => {
      standardCtor = window.Razorpay as StandardCtor;
      resolve();
    };
    s.onerror = () => {
      scriptPromise = null;
      reject(new Error("Failed to load Razorpay"));
    };
    document.body.appendChild(s);
  });
  return scriptPromise;
}

export type CheckoutOptions = {
  key: string;
  amount?: number;
  currency?: string;
  order_id?: string;
  subscription_id?: string;
  name: string;
  description?: string;
  prefill?: { name?: string; email?: string };
  theme?: { color?: string };
  handler: (response: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature: string;
  }) => void;
  modal?: { ondismiss?: () => void };
};

export async function openRazorpay(options: CheckoutOptions) {
  await loadRazorpay();
  if (!standardCtor) throw new Error("Failed to load Razorpay");
  const rzp = new standardCtor(options);
  rzp.on("payment.failed", (resp: any) => {
    console.error("Razorpay payment failed", resp);
  });
  rzp.open();
}
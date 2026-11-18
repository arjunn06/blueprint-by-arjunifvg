import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
  CheckCircle,
  CircleNotch,
  CreditCard,
  DeviceMobile,
  Lock,
  WarningCircle,
  X as XIcon,
} from "@phosphor-icons/react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { FlowField } from "@/components/site/flow-kit";
import { btnPrimary } from "@/components/site/ui";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  NETWORK_LABEL,
  detectNetwork,
  formatCardNumber,
  formatExpiry,
  formatMobile,
  normalizeIndianMobile,
  upiIdValid,
  validateCard,
  type CardFields,
} from "@/lib/card-utils";
import { prefersRedirectFlow } from "@/lib/checkout-mode";
import { formatRupees } from "@/lib/pricing";
import {
  createCustomCheckout,
  loadCustomSdk,
  type CheckoutFailure,
  type CheckoutSuccess,
  type CustomCheckout,
  type PaymentTarget,
} from "@/lib/razorpay-custom";
import { cn } from "@/lib/utils";

/**
 * The in-page checkout: our own card / UPI form in the Blue Pill style, with Razorpay processing behind it
 * (src/lib/razorpay-custom.ts). Opened by the subscribe and enroll pages when the build enables it
 * (src/lib/checkout-mode.ts); otherwise they still open Razorpay's own modal.
 *
 * The bank step cannot be white-labelled. Cards go through Razorpay's consent and OTP pages and UPI through a
 * "payment in progress" page, in a popup on desktop or, on phones and in in-app browsers, in this tab with a
 * return through /api/public/razorpay/callback.
 */

export type PreparedPayment =
  | { kind: "subscription"; subscriptionId: string; keyId: string; amountPaise: number }
  | { kind: "order"; orderId: string; keyId: string; amountPaise: number };

export type PaySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tone: "blue" | "red";
  /**
   * The theme of the page that opens the sheet. SiteShell themes a wrapper element, and a dialog is portaled
   * out of it to <body>, so without this the sheet would take the root theme and clash with its own page.
   */
  theme: "light" | "dark";
  planName: string;
  /** Under the price, e.g. "₹499 + ₹89.82 GST (18%)". */
  breakdown: string;
  /** Next to the price: "/month" or "one time". */
  cadence: string;
  /** One quiet line under the breakdown, e.g. "Cancel anytime from Settings". */
  note: string;
  totalPaise: number;
  prefill: { name?: string | null; email?: string | null };
  /** Creates the subscription / order on the server. Called when the sheet opens, never during a click. */
  prepare: () => Promise<PreparedPayment>;
  /** The page's own verification of a popup success (signature check, unlock). Throw to fall back to polling. */
  onVerified: (r: CheckoutSuccess, p: PreparedPayment) => Promise<void>;
  /** One reconcile against Razorpay: true once the member is active. Used when no success event arrives. */
  check: () => Promise<boolean>;
  /** The member is in: navigate away. */
  onConfirmed: () => void;
  /** The sheet was closed while a bank window may still be open: the page should reconcile once more. */
  onDismiss?: () => void;
  /** "More ways to pay": hand the already-created subscription / order to Razorpay's own modal. */
  onUseRazorpay?: (p: PreparedPayment) => void;
};

type Phase = "preparing" | "ready" | "paying" | "redirecting" | "confirming" | "done" | "error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CALLBACK_PATH = "/api/public/razorpay/callback";

function toTarget(p: PreparedPayment): PaymentTarget {
  return p.kind === "subscription"
    ? { kind: "subscription", subscriptionId: p.subscriptionId, amountPaise: p.amountPaise }
    : { kind: "order", orderId: p.orderId, amountPaise: p.amountPaise };
}

export function PaySheet(props: PaySheetProps) {
  const {
    open,
    onOpenChange,
    tone,
    theme,
    planName,
    breakdown,
    cadence,
    note,
    totalPaise,
    prefill,
  } = props;

  // Callbacks handed to razorpay.js are created once per sheet; they read the latest props from here.
  const live = useRef(props);
  live.current = props;

  const [phase, setPhase] = useState<Phase>("preparing");
  const [prepared, setPrepared] = useState<PreparedPayment | null>(null);
  const preparedRef = useRef<PreparedPayment | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const checkoutRef = useRef<CustomCheckout | null>(null);
  const redirectRef = useRef(false);
  const prepareRef = useRef<Promise<PreparedPayment> | null>(null);

  const [method, setMethod] = useState<"card" | "upi">("card");
  const [card, setCard] = useState<CardFields>({ number: "", expiry: "", cvv: "", name: "" });
  const [vpa, setVpa] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const fieldRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const needsEmail = !prefill.email;

  // ── Success / failure from razorpay.js (popup flow) ─────────────────────────────────────────────
  const handleSuccess = useCallback(async (resp: CheckoutSuccess) => {
    setPhase("confirming");
    const p = preparedRef.current;
    try {
      if (p) {
        await live.current.onVerified(resp, p);
        setPhase("done");
        live.current.onConfirmed();
        return;
      }
    } catch {
      /* the payment may still have landed: fall through to reconciling, as the Standard flow does */
    }
    const started = Date.now();
    while (Date.now() - started < 30_000) {
      try {
        if (await live.current.check()) {
          setPhase("done");
          live.current.onConfirmed();
          return;
        }
      } catch {
        /* keep trying */
      }
      await sleep(2500);
    }
    setPhase("ready");
    setProblem(
      "We couldn’t confirm your payment yet. If you were charged, your access will appear within a few minutes.",
    );
  }, []);

  const handleFailure = useCallback((f: CheckoutFailure) => {
    setPhase("ready");
    setProblem(f.message);
  }, []);

  // ── Open: create the subscription / order and the razorpay.js instance ──────────────────────────
  useEffect(() => {
    if (!open) {
      prepareRef.current = null;
      checkoutRef.current = null;
      preparedRef.current = null;
      setPrepared(null);
      setPhase("preparing");
      setProblem(null);
      setSubmitted(false);
      setTouched({});
      setVpa("");
      setCard({ number: "", expiry: "", cvv: "", name: "" }); // card details never outlive the sheet
      return;
    }
    let cancelled = false;
    setPhase("preparing");
    setProblem(null);
    setCard((c) => (c.name ? c : { ...c, name: prefill.name?.trim() ?? "" }));
    setEmail((e) => e || prefill.email?.trim() || "");
    void loadCustomSdk().catch(() => {}); // fetch razorpay.js while the server creates the subscription
    prepareRef.current ??= live.current.prepare(); // one per open, even if React runs this effect twice
    (async () => {
      try {
        const p = await prepareRef.current!;
        const redirect = prefersRedirectFlow();
        const checkout = await createCustomCheckout({
          key: p.keyId,
          redirect,
          onSuccess: (r) => void handleSuccess(r),
          onFailure: handleFailure,
        });
        await checkout.ready;
        if (cancelled) return;
        preparedRef.current = p;
        checkoutRef.current = checkout;
        redirectRef.current = redirect;
        setPrepared(p);
        setPhase("ready");
      } catch (e) {
        if (cancelled) return;
        prepareRef.current = null;
        setProblem(e instanceof Error ? e.message : "Couldn’t start checkout.");
        setPhase("error");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, attempt]);

  // While a bank window may be open, keep asking Razorpay: covers a success event that never arrives.
  useEffect(() => {
    if (phase !== "paying") return;
    let stop = false;
    const started = Date.now();
    (async () => {
      while (!stop && Date.now() - started < 5 * 60_000) {
        await sleep(4000);
        if (stop) return;
        try {
          if (await live.current.check()) {
            if (stop) return;
            setPhase("done");
            live.current.onConfirmed();
            return;
          }
        } catch {
          /* keep polling */
        }
      }
    })();
    return () => {
      stop = true;
    };
  }, [phase]);

  // Land in the first field once the form unlocks.
  useEffect(() => {
    if (open && phase === "ready") {
      const t = setTimeout(
        () => (fieldRefs.current[method === "card" ? "number" : "vpa"] ?? null)?.focus(),
        60,
      );
      return () => clearTimeout(t);
    }
  }, [open, phase, method]);

  // ── Validation ─────────────────────────────────────────────────────────────────────────────────
  const cardErrors = method === "card" ? validateCard(card) : {};
  const errors: Record<string, string | undefined> = {
    ...cardErrors,
    vpa:
      method === "upi"
        ? !vpa.trim()
          ? "Enter your UPI ID"
          : !upiIdValid(vpa)
            ? "That UPI ID doesn’t look right"
            : undefined
        : undefined,
    mobile: normalizeIndianMobile(mobile)
      ? undefined
      : mobile
        ? "Enter a 10-digit mobile number"
        : "Enter your mobile number",
    email: !needsEmail || EMAIL_RE.test(email.trim()) ? undefined : "Enter a valid email address",
  };
  const shown = (k: string) => (submitted || touched[k] ? errors[k] : undefined);
  const touch = (k: string) => setTouched((t) => (t[k] ? t : { ...t, [k]: true }));

  // ── Pay: runs inside the click, with no await before createPayment ────────────────────────────
  function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitted(true);
    const checkout = checkoutRef.current;
    if (phase !== "ready" || !checkout || !prepared) return;

    const order = method === "card" ? ["number", "expiry", "cvv", "name"] : ["vpa"];
    const firstBad = [...order, "mobile", "email"].find((k) => errors[k]);
    if (firstBad) {
      fieldRefs.current[firstBad]?.focus();
      return;
    }

    setProblem(null);
    const redirect = redirectRef.current;
    try {
      checkout.pay({
        target: toTarget(prepared),
        method: method === "card" ? { type: "card", ...card } : { type: "upi", vpa },
        email: (needsEmail ? email : (prefill.email ?? "")).trim(),
        mobile: normalizeIndianMobile(mobile)!,
        callbackUrl: redirect ? `${window.location.origin}${CALLBACK_PATH}` : undefined,
      });
      setPhase(redirect ? "redirecting" : "paying");
    } catch (err) {
      setProblem(
        err instanceof Error ? err.message : "Couldn’t start the payment. Please try again.",
      );
    }
  }

  function requestOpenChange(next: boolean) {
    if (!next && (phase === "confirming" || phase === "redirecting" || phase === "done")) return;
    if (!next && phase === "paying") live.current.onDismiss?.();
    onOpenChange(next);
  }

  /** "I've finished": one immediate reconcile instead of waiting for the next poll. */
  async function checkNow() {
    setProblem(null);
    try {
      if (await live.current.check()) {
        setPhase("done");
        live.current.onConfirmed();
        return;
      }
    } catch {
      /* fall through */
    }
    setProblem(
      "We can’t see the payment yet. If you finished, give it a few seconds, then check again.",
    );
  }

  const busy = phase === "preparing";
  // The plan itself is the authority on what is charged; the page's figure is only the first paint.
  const price = formatRupees(prepared?.amountPaise ?? totalPaise);
  const showForm = phase === "preparing" || phase === "ready";

  return (
    <DialogPrimitive.Root open={open} onOpenChange={requestOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          onOpenAutoFocus={(e) => e.preventDefault()}
          onInteractOutside={(e) => {
            if (phase !== "ready" && phase !== "preparing" && phase !== "error") e.preventDefault();
          }}
          className={cn(
            theme, // re-scopes the design tokens inside the portal (see `theme` above)
            "fixed z-50 flex max-h-[94dvh] w-full flex-col overflow-hidden bg-surface font-sans text-foreground shadow-shell outline-none duration-200",
            "inset-x-0 bottom-0 rounded-t-panel border-t border-border",
            "sm:inset-auto sm:left-1/2 sm:top-1/2 sm:max-w-[480px] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-panel sm:border",
            "data-[state=closed]:animate-out data-[state=open]:animate-in data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:slide-out-to-bottom-8 data-[state=open]:slide-in-from-bottom-8",
            "sm:data-[state=closed]:slide-out-to-bottom-0 sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:zoom-out-95 sm:data-[state=open]:zoom-in-95",
          )}
        >
          <div className="overflow-y-auto overscroll-contain px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-5 sm:px-7 sm:pb-7 sm:pt-6">
            <header>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface-2 py-1.5 pl-3 pr-3.5 text-hint font-medium text-foreground">
                  <span
                    aria-hidden
                    className={cn(
                      "size-2.5 rounded-full",
                      tone === "red" ? "bg-pill-red" : "bg-pill-blue",
                    )}
                  />
                  {planName}
                </span>
                <DialogPrimitive.Close
                  aria-label="Close"
                  className="grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-40"
                  disabled={phase === "confirming" || phase === "redirecting" || phase === "done"}
                >
                  <XIcon className="size-5" weight="bold" />
                </DialogPrimitive.Close>
              </div>

              <DialogPrimitive.Title className="sr-only">Pay for {planName}</DialogPrimitive.Title>
              <DialogPrimitive.Description className="sr-only">
                Enter your payment details. Your bank may ask you to verify the payment.
              </DialogPrimitive.Description>

              <p className="mt-5 flex items-baseline gap-2 text-foreground">
                <span className="text-[2.5rem] font-medium leading-none tracking-[-0.02em] tabular-nums">
                  {price}
                </span>
                <span className="text-body text-muted-foreground">{cadence}</span>
              </p>
              <p className="mt-2 text-hint text-muted-foreground">
                {breakdown}
                <span aria-hidden> · </span>
                {note}
              </p>
            </header>

            {showForm && (
              <form onSubmit={onSubmit} noValidate className="mt-6 flex flex-col gap-4">
                <Tabs value={method} onValueChange={(v) => setMethod(v as "card" | "upi")}>
                  <TabsList
                    aria-label="Payment method"
                    className="grid h-12 w-full grid-cols-2 bg-hover p-1"
                  >
                    <MethodTab
                      value="card"
                      icon={<CreditCard className="size-[18px]" weight="regular" />}
                    >
                      Card
                    </MethodTab>
                    <MethodTab
                      value="upi"
                      icon={<DeviceMobile className="size-[18px]" weight="regular" />}
                    >
                      UPI
                    </MethodTab>
                  </TabsList>

                  <TabsContent value="card" className="mt-4 flex flex-col gap-3">
                    <FlowField
                      ref={reg(fieldRefs, "number")}
                      name="cardnumber"
                      placeholder="Card number"
                      aria-label="Card number"
                      inputMode="numeric"
                      autoComplete="cc-number"
                      value={card.number}
                      disabled={busy}
                      onChange={(e) =>
                        setCard((c) => ({ ...c, number: formatCardNumber(e.target.value) }))
                      }
                      onBlur={() => touch("number")}
                      tone={shown("number") ? "error" : "default"}
                      hint={hint(shown("number"))}
                      trailing={
                        <span className="text-hint font-medium">
                          {NETWORK_LABEL[detectNetwork(card.number)]}
                        </span>
                      }
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <FlowField
                        ref={reg(fieldRefs, "expiry")}
                        name="cc-exp"
                        placeholder="MM / YY"
                        aria-label="Expiry date"
                        inputMode="numeric"
                        autoComplete="cc-exp"
                        value={card.expiry}
                        disabled={busy}
                        onChange={(e) =>
                          setCard((c) => ({ ...c, expiry: formatExpiry(e.target.value) }))
                        }
                        onBlur={() => touch("expiry")}
                        tone={shown("expiry") ? "error" : "default"}
                        hint={hint(shown("expiry"))}
                      />
                      <FlowField
                        ref={reg(fieldRefs, "cvv")}
                        name="cvc"
                        type="password"
                        placeholder="CVV"
                        aria-label="CVV"
                        inputMode="numeric"
                        autoComplete="cc-csc"
                        maxLength={4}
                        value={card.cvv}
                        disabled={busy}
                        onChange={(e) =>
                          setCard((c) => ({ ...c, cvv: e.target.value.replace(/\D/g, "") }))
                        }
                        onBlur={() => touch("cvv")}
                        tone={shown("cvv") ? "error" : "default"}
                        hint={hint(shown("cvv"))}
                      />
                    </div>
                    <FlowField
                      ref={reg(fieldRefs, "name")}
                      name="ccname"
                      placeholder="Name on card"
                      aria-label="Name on card"
                      autoComplete="cc-name"
                      value={card.name}
                      disabled={busy}
                      onChange={(e) => setCard((c) => ({ ...c, name: e.target.value }))}
                      onBlur={() => touch("name")}
                      tone={shown("name") ? "error" : "default"}
                      hint={hint(shown("name"))}
                    />
                  </TabsContent>

                  <TabsContent value="upi" className="mt-4 flex flex-col gap-3">
                    <FlowField
                      ref={reg(fieldRefs, "vpa")}
                      name="upi"
                      placeholder="UPI ID (name@bank)"
                      aria-label="UPI ID"
                      autoComplete="off"
                      autoCapitalize="none"
                      spellCheck={false}
                      value={vpa}
                      disabled={busy}
                      onChange={(e) => setVpa(e.target.value.replace(/\s/g, ""))}
                      onBlur={() => touch("vpa")}
                      tone={shown("vpa") ? "error" : "default"}
                      hint={hint(
                        shown("vpa") ?? "You’ll get a request in your UPI app to approve.",
                      )}
                    />
                  </TabsContent>
                </Tabs>

                {needsEmail && (
                  <FlowField
                    ref={reg(fieldRefs, "email")}
                    name="email"
                    type="email"
                    placeholder="Email for your receipt"
                    aria-label="Email"
                    autoComplete="email"
                    value={email}
                    disabled={busy}
                    onChange={(e) => setEmail(e.target.value)}
                    onBlur={() => touch("email")}
                    tone={shown("email") ? "error" : "default"}
                    hint={hint(shown("email"))}
                  />
                )}

                <FlowField
                  ref={reg(fieldRefs, "mobile")}
                  name="tel-national"
                  type="tel"
                  placeholder="Mobile number"
                  aria-label="Mobile number"
                  inputMode="tel"
                  autoComplete="tel-national"
                  value={mobile}
                  disabled={busy}
                  onChange={(e) => setMobile(formatMobile(e.target.value))}
                  onBlur={() => touch("mobile")}
                  tone={shown("mobile") ? "error" : "default"}
                  hint={hint(
                    shown("mobile") ?? "Your bank may text a one-time code to this number.",
                  )}
                />

                {problem && <Notice>{problem}</Notice>}

                <div className="mt-1">
                  <button type="submit" disabled={busy} className={`${btnPrimary} w-full`}>
                    {busy ? (
                      <>
                        <CircleNotch className="size-4 animate-spin" weight="bold" />
                        Preparing secure payment
                      </>
                    ) : (
                      <>
                        <Lock className="size-4" weight="fill" />
                        Pay {price}
                      </>
                    )}
                  </button>
                  <p className="mt-3 text-center text-hint text-tertiary">
                    Secured by Razorpay. Card details go straight to Razorpay and never reach our
                    servers.
                  </p>
                  {prepared && live.current.onUseRazorpay && (
                    <p className="mt-2 text-center">
                      <button
                        type="button"
                        onClick={() => live.current.onUseRazorpay?.(prepared)}
                        className="text-hint font-medium text-muted-foreground underline decoration-border underline-offset-4 transition-colors hover:text-foreground"
                      >
                        More ways to pay
                      </button>
                    </p>
                  )}
                </div>
              </form>
            )}

            {phase === "error" && (
              <div className="mt-6 flex flex-col gap-4">
                <Notice>{problem ?? "Couldn’t start checkout."}</Notice>
                <button
                  type="button"
                  onClick={() => {
                    prepareRef.current = null;
                    setAttempt((n) => n + 1);
                  }}
                  className={`${btnPrimary} w-full`}
                >
                  Try again
                </button>
              </div>
            )}

            {phase === "paying" && (
              <Status
                icon={<CircleNotch className="size-6 animate-spin" weight="bold" />}
                title="Finish in the secure window"
                body="Your bank may ask for a one-time code. This page updates by itself when you’re done."
              >
                {problem && <Notice>{problem}</Notice>}
                <button
                  type="button"
                  onClick={() => void checkNow()}
                  className={`${btnPrimary} w-full`}
                >
                  I’ve finished paying
                </button>
                <button
                  type="button"
                  onClick={() => {
                    live.current.onDismiss?.();
                    setProblem(null); // don't carry the waiting screen's message back onto the form
                    setPhase("ready");
                  }}
                  className="text-hint font-medium text-muted-foreground underline decoration-border underline-offset-4 hover:text-foreground"
                >
                  Cancel and go back
                </button>
              </Status>
            )}

            {phase === "redirecting" && (
              <Status
                icon={<CircleNotch className="size-6 animate-spin" weight="bold" />}
                title="Taking you to your bank"
                body="You’ll come straight back here once it’s done."
              />
            )}

            {phase === "confirming" && (
              <Status
                icon={<CircleNotch className="size-6 animate-spin" weight="bold" />}
                title="Confirming your payment"
                body="One moment. Please don’t close this page."
              />
            )}

            {phase === "done" && (
              <Status
                icon={<CheckCircle className="size-7 text-success" weight="fill" />}
                title="You’re in"
                body="Payment confirmed. Taking you to your membership."
              />
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * FlowField's hint paragraph loses its `text-hint` size: cn() runs tailwind-merge, which does not know
 * `text-hint` is a font size, so it drops it when the tone colour follows, and hints render at 16px instead of
 * the designed 13px. Sizing the text inside the hint here keeps this sheet on the spec without changing
 * every hint in the app. The real fix is in src/lib/utils.ts (teach twMerge the custom font sizes).
 */
function hint(text: string | undefined) {
  return text ? <span className="text-hint">{text}</span> : undefined;
}

/** Collects each input into one ref map. */
function reg(map: RefObject<Record<string, HTMLInputElement | null>>, key: string) {
  return (el: HTMLInputElement | null) => {
    map.current[key] = el;
  };
}

function MethodTab({
  value,
  icon,
  children,
}: {
  value: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <TabsTrigger value={value} className="h-10 gap-2 text-btn data-[state=active]:text-foreground">
      {icon}
      {children}
    </TabsTrigger>
  );
}

function Notice({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-field border border-destructive/30 bg-destructive/5 px-4 py-3 text-hint text-foreground"
    >
      <WarningCircle className="mt-px size-5 shrink-0 text-destructive" weight="fill" />
      <p>{children}</p>
    </div>
  );
}

function Status({
  icon,
  title,
  body,
  children,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  children?: ReactNode;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-col items-center gap-5 pb-2 pt-10 text-center"
    >
      <span className="grid size-14 place-items-center rounded-full bg-hover text-foreground">
        {icon}
      </span>
      <div>
        <p className="text-lead font-medium tracking-[-0.02em] text-foreground">{title}</p>
        <p className="mx-auto mt-2 max-w-[34ch] text-hint text-muted-foreground">{body}</p>
      </div>
      {children && <div className="flex w-full flex-col items-center gap-3">{children}</div>}
    </div>
  );
}

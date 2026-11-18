/**
 * Which checkout the member sees, and how the bank step is shown. Browser-only helpers: call them from
 * effects or event handlers, never during render on the server.
 */

export type CheckoutFlagInput = {
  /** The build variable VITE_CUSTOM_CHECKOUT. */
  flag: string | undefined;
  dev: boolean;
  /** The `checkout` query parameter of the current page. */
  param: string | null;
  /** Whether this browser tab opted in earlier. */
  remembered: boolean;
};

/**
 * Pure rule behind `customCheckoutEnabled`, so it can be tested without a browser.
 *  - flag "1": everyone gets the in-page form.
 *  - flag "preview" (or dev): only a tab that opened a page with `?checkout=custom`, remembered for that tab so
 *    a sign-in redirect cannot lose it; `?checkout=off` opts back out. This is how the form is tried on the
 *    live site with a real card before it is switched on for members.
 *  - anything else: off, and members get Razorpay's own modal.
 * `remember` says what to store: true/false to write, null to leave it alone.
 */
export function decideCustomCheckout(i: CheckoutFlagInput): {
  enabled: boolean;
  remember: boolean | null;
} {
  if (i.flag === "1") return { enabled: true, remember: null };
  if (i.flag !== "preview" && !i.dev) return { enabled: false, remember: null };
  if (i.param === "custom") return { enabled: true, remember: true };
  if (i.param === "off") return { enabled: false, remember: false };
  return { enabled: i.remembered, remember: null };
}

const REMEMBER_KEY = "checkout-custom";

/**
 * Whether to show the in-page card/UPI form (src/components/site/pay-sheet.tsx) instead of Razorpay's modal.
 * Browser only: call it from an effect.
 */
export function customCheckoutEnabled(): boolean {
  if (typeof window === "undefined") return false;
  let remembered = false;
  try {
    remembered = window.sessionStorage.getItem(REMEMBER_KEY) === "1";
  } catch {
    /* storage blocked: the URL alone decides */
  }
  const { enabled, remember } = decideCustomCheckout({
    flag: import.meta.env.VITE_CUSTOM_CHECKOUT,
    dev: import.meta.env.DEV,
    param: new URLSearchParams(window.location.search).get("checkout"),
    remembered,
  });
  if (remember !== null) {
    try {
      if (remember) window.sessionStorage.setItem(REMEMBER_KEY, "1");
      else window.sessionStorage.removeItem(REMEMBER_KEY);
    } catch {
      /* storage blocked */
    }
  }
  return enabled;
}

/**
 * Card and UPI verification normally opens in a popup window. Popups are unreliable on phones and are not
 * available at all in the Instagram / Facebook in-app browsers, so there the whole tab goes to the bank and
 * comes back through /api/public/razorpay/callback instead.
 */
export function prefersRedirectFlow(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent;
  const inApp =
    /Instagram|FBAN|FBAV|FB_IAB|Snapchat|LinkedInApp|MicroMessenger|Line\/|WhatsApp/i.test(ua);
  const phone = /Android|iPhone|iPod|Mobile/i.test(ua);
  const touchTablet = navigator.maxTouchPoints > 1 && window.innerWidth < 820; // iPadOS reports as a Mac
  return inApp || phone || touchTablet;
}

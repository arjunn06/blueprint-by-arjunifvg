import { BLUE_PILL_TOTAL_PAISE, formatRupees } from "./pricing.ts";

/**
 * Black Friday: 50% off the first month of the Blue Pill.
 *
 * The discount itself is a promo code, so the landing page only advertises it. The same code has to exist in
 * Admin → Promos as "% off first month" = 50 (with its Razorpay offer), or checkout will refuse it.
 *
 * Prices come from `pricing.ts`: the Blue Pill is one flat monthly amount with nothing added at checkout, so the
 * page says no "+ taxes". Until the ₹599 price lands there, this page quotes whatever that file says.
 */
export const BLACK_FRIDAY_CODE = "FRIDAY";
export const BLACK_FRIDAY_PERCENT = 50;

/**
 * Half the monthly price, dropped to a whole rupee as advertised: ₹599 → ₹299, not ₹299.50.
 * A 50%-off code takes exactly half, so checkout charges ₹0.50 more than this.
 */
export const FIRST_MONTH_PAISE =
  Math.floor((BLUE_PILL_TOTAL_PAISE * (100 - BLACK_FRIDAY_PERCENT)) / 100 / 100) * 100;

export const LIST_PRICE = formatRupees(BLUE_PILL_TOTAL_PAISE);
export const FIRST_MONTH_PRICE = formatRupees(FIRST_MONTH_PAISE);

/**
 * The visitor signs in between the landing page and the subscribe page, so the code is parked in
 * localStorage (the same trick as the Red Pill invite token) and the subscribe page applies it.
 */
const PENDING_KEY = "bp_pending_promo";

export function setPendingPromo(code: string) {
  try {
    localStorage.setItem(PENDING_KEY, code);
  } catch {
    /* private mode: they can still type the code */
  }
}

/** Read and clear. One attempt only, so a stale or refused code never nags again. */
export function takePendingPromo(): string | null {
  try {
    const code = localStorage.getItem(PENDING_KEY);
    if (code) localStorage.removeItem(PENDING_KEY);
    return code;
  } catch {
    return null;
  }
}

// Single source of truth for what we charge, in paise. These are the full amounts: nothing is added at
// checkout, so there is no GST line anywhere on the site.

/**
 * What a Blue Pill member pays each month. This has to equal the amount of the Razorpay plan in
 * RAZORPAY_PLAN_ID: Razorpay charges the plan's amount, and this is only what we show.
 */
export const BLUE_PILL_TOTAL_PAISE = 59900

/** What one Red Pill payment costs (one-time). The Razorpay order is created with exactly this amount. */
export const RED_PILL_TOTAL_PAISE = 299900

/** Days of access one Red Pill payment buys. */
export const RED_PILL_ACCESS_DAYS = 31;

/** ₹2,999 / ₹599.50 — drops the decimals when the amount is whole rupees. */
export function formatRupees(paise: number) {
  return `₹${(paise / 100).toLocaleString('en-IN', {
    minimumFractionDigits: paise % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`
}

/**
 * Pure helpers for the checkout form: card number / expiry / CVV formatting and validation, UPI IDs and
 * Indian mobile numbers. No DOM, no network, no logging: card data only ever lives in component state and
 * is handed straight to razorpay.js. Tests: tests/card-utils.test.ts
 */

export type CardNetwork = "visa" | "mastercard" | "rupay" | "amex" | "diners" | "unknown";

export const NETWORK_LABEL: Record<CardNetwork, string> = {
  visa: "Visa",
  mastercard: "Mastercard",
  rupay: "RuPay",
  amex: "Amex",
  diners: "Diners",
  unknown: "",
};

export const digitsOnly = (s: string) => s.replace(/\D/g, "");

/** Best-effort network from the leading digits. Display and CVV length only; Razorpay is the authority. */
export function detectNetwork(input: string): CardNetwork {
  const n = digitsOnly(input);
  if (/^4/.test(n)) return "visa";
  if (/^(5[1-5]|222[1-9]|22[3-9]\d|2[3-6]\d\d|27[01]\d|2720)/.test(n)) return "mastercard";
  if (/^3[47]/.test(n)) return "amex";
  if (/^3(0[0-5]|[689])/.test(n)) return "diners";
  if (/^(508|60|65|81|82|353|356)/.test(n)) return "rupay";
  return "unknown";
}

/** Digits a card number of this network may hold. */
function maxCardDigits(network: CardNetwork) {
  if (network === "amex") return 15;
  if (network === "diners") return 16;
  return 19;
}

/** "4111111111111111" -> "4111 1111 1111 1111" (Amex 4-6-5, Diners 4-6-4-2). */
export function formatCardNumber(input: string): string {
  const network = detectNetwork(input);
  const d = digitsOnly(input).slice(0, maxCardDigits(network));
  const groups =
    network === "amex" ? [4, 6, 5] : network === "diners" ? [4, 6, 4, 2] : [4, 4, 4, 4, 3];
  const out: string[] = [];
  let i = 0;
  for (const size of groups) {
    if (i >= d.length) break;
    out.push(d.slice(i, i + size));
    i += size;
  }
  return out.join(" ");
}

export function luhnValid(input: string): boolean {
  const d = digitsOnly(input);
  if (d.length < 12) return false;
  let sum = 0;
  let double = false;
  for (let i = d.length - 1; i >= 0; i--) {
    let n = d.charCodeAt(i) - 48;
    if (double) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    sum += n;
    double = !double;
  }
  return sum % 10 === 0;
}

/** Live formatting for an expiry field: "1" -> "1", "4" -> "04", "1225" -> "12/25". */
export function formatExpiry(input: string): string {
  let d = digitsOnly(input).slice(0, 4);
  if (d.length >= 1 && d[0] > "1") d = ("0" + d).slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export function parseExpiry(input: string): { month: number; year: number } | null {
  const d = digitsOnly(input);
  if (d.length !== 4) return null;
  return { month: Number(d.slice(0, 2)), year: 2000 + Number(d.slice(2)) };
}

/** A card is good through the last day of its expiry month. */
export function expiryValid(input: string, now: Date = new Date()): boolean {
  const e = parseExpiry(input);
  if (!e || e.month < 1 || e.month > 12) return false;
  const firstOfNextMonth = new Date(e.year, e.month, 1);
  const horizon = new Date(now.getFullYear() + 21, 0, 1);
  return firstOfNextMonth > now && firstOfNextMonth < horizon;
}

export const cvvLength = (network: CardNetwork) => (network === "amex" ? 4 : 3);

export type CardFields = { number: string; expiry: string; cvv: string; name: string };
export type CardErrors = Partial<Record<keyof CardFields, string>>;

/** Messages are written for the customer, not for us. Only fields that failed appear in the result. */
export function validateCard(c: CardFields, now: Date = new Date()): CardErrors {
  const errors: CardErrors = {};
  const network = detectNetwork(c.number);
  const digits = digitsOnly(c.number);
  const lengthOk =
    network === "amex"
      ? digits.length === 15
      : network === "diners"
        ? digits.length >= 14 && digits.length <= 16
        : digits.length >= 13 && digits.length <= 19;

  if (!digits) errors.number = "Enter your card number";
  else if (!lengthOk || !luhnValid(digits)) errors.number = "That card number doesn’t look right";

  if (!digitsOnly(c.expiry)) errors.expiry = "Enter the expiry date";
  else if (!expiryValid(c.expiry, now)) errors.expiry = "Check the expiry date";

  if (!c.cvv) errors.cvv = "Enter the CVV";
  else if (digitsOnly(c.cvv).length !== cvvLength(network)) {
    errors.cvv = `CVV is ${cvvLength(network)} digits`;
  }

  const name = c.name.trim();
  if (!name) errors.name = "Enter the name on your card";
  else if (name.length < 2 || name.length > 60) errors.name = "Check the name on your card";

  return errors;
}

/** vpa@handle: 2-256 chars of [a-z0-9._-] before the @, a letter-led handle after it. */
export function upiIdValid(input: string): boolean {
  return /^[a-zA-Z0-9._-]{2,256}@[a-zA-Z][a-zA-Z0-9.-]{1,63}$/.test(input.trim());
}

/** Accepts "98765 43210", "+91 98765 43210", "919876543210", "09876543210". Returns the 10 digits, or null. */
export function normalizeIndianMobile(input: string): string | null {
  let d = digitsOnly(input);
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  else if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

/** "9876543210" -> "98765 43210" while typing. */
export function formatMobile(input: string): string {
  let d = digitsOnly(input);
  if (d.length > 10 && d.startsWith("91")) d = d.slice(2);
  d = d.slice(0, 10);
  return d.length > 5 ? `${d.slice(0, 5)} ${d.slice(5)}` : d;
}

// Run: node --test tests/offer.test.ts   (Node 22.18+)
// The Black Friday landing page's price lines and the code hand-off to the subscribe page.
import test from "node:test";
import assert from "node:assert/strict";
import {
  BLACK_FRIDAY_CODE,
  BLACK_FRIDAY_PERCENT,
  FIRST_MONTH_PAISE,
  FIRST_MONTH_PRICE,
  LIST_PRICE,
  setPendingPromo,
  takePendingPromo,
} from "../src/lib/offer.ts";
import { BLUE_PILL_TOTAL_PAISE, formatRupees } from "../src/lib/pricing.ts";

function stubStorage(impl: Partial<Storage>) {
  Object.defineProperty(globalThis, "localStorage", { value: impl, configurable: true });
}

test("the page quotes the monthly price from pricing.ts", () => {
  assert.equal(LIST_PRICE, formatRupees(BLUE_PILL_TOTAL_PAISE));
});

test("the first month is the percent-off price dropped to a whole rupee", () => {
  const exact = (BLUE_PILL_TOTAL_PAISE * (100 - BLACK_FRIDAY_PERCENT)) / 100;
  assert.equal(FIRST_MONTH_PAISE % 100, 0);
  assert.ok(FIRST_MONTH_PAISE <= exact, "never quotes more than the code charges");
  assert.ok(exact - FIRST_MONTH_PAISE < 100, "and is less than a rupee below it");
  assert.equal(FIRST_MONTH_PRICE, formatRupees(FIRST_MONTH_PAISE));
});

test("the code is stored in upper case as the promo table expects", () => {
  assert.equal(BLACK_FRIDAY_CODE, BLACK_FRIDAY_CODE.toUpperCase());
  assert.equal(BLACK_FRIDAY_CODE, BLACK_FRIDAY_CODE.trim());
});

test("the parked code is handed over once and then gone", () => {
  const store = new Map<string, string>();
  stubStorage({
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, v),
    removeItem: (k) => void store.delete(k),
  });
  assert.equal(takePendingPromo(), null);
  setPendingPromo(BLACK_FRIDAY_CODE);
  assert.equal(takePendingPromo(), BLACK_FRIDAY_CODE);
  assert.equal(takePendingPromo(), null);
});

test("blocked storage never throws", () => {
  const boom = () => {
    throw new Error("SecurityError");
  };
  stubStorage({ getItem: boom, setItem: boom, removeItem: boom });
  assert.doesNotThrow(() => setPendingPromo(BLACK_FRIDAY_CODE));
  assert.equal(takePendingPromo(), null);
});

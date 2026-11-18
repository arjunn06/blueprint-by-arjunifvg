// Run: node --test tests/checkout-mode.test.ts   (Node 22.18+)
// Covers decideCustomCheckout in src/lib/checkout-mode.ts: who gets the in-page checkout form.
import test from "node:test";
import assert from "node:assert/strict";
import { decideCustomCheckout, type CheckoutFlagInput } from "../src/lib/checkout-mode.ts";

const base: CheckoutFlagInput = { flag: undefined, dev: false, param: null, remembered: false };
const decide = (over: Partial<CheckoutFlagInput>) => decideCustomCheckout({ ...base, ...over });

test("with no flag the live site is untouched, whatever the URL or the tab remembers", () => {
  assert.deepEqual(decide({}), { enabled: false, remember: null });
  assert.deepEqual(decide({ param: "custom" }), { enabled: false, remember: null });
  assert.deepEqual(decide({ remembered: true }), { enabled: false, remember: null });
  assert.deepEqual(decide({ flag: "0", param: "custom" }), { enabled: false, remember: null });
  assert.deepEqual(decide({ flag: "", param: "custom", remembered: true }), {
    enabled: false,
    remember: null,
  });
});

test("flag 1 turns it on for everyone and ignores the URL", () => {
  assert.deepEqual(decide({ flag: "1" }), { enabled: true, remember: null });
  assert.deepEqual(decide({ flag: "1", param: "off" }), { enabled: true, remember: null });
});

test("preview: off until a tab opts in with ?checkout=custom, then remembered", () => {
  assert.deepEqual(decide({ flag: "preview" }), { enabled: false, remember: null });
  assert.deepEqual(decide({ flag: "preview", param: "custom" }), { enabled: true, remember: true });
});

test("preview: the opt-in survives a redirect that drops the query string", () => {
  assert.deepEqual(decide({ flag: "preview", param: null, remembered: true }), {
    enabled: true,
    remember: null,
  });
});

test("preview: ?checkout=off opts back out and forgets", () => {
  assert.deepEqual(decide({ flag: "preview", param: "off", remembered: true }), {
    enabled: false,
    remember: false,
  });
});

test("preview ignores other values of the parameter", () => {
  assert.deepEqual(decide({ flag: "preview", param: "yes" }), { enabled: false, remember: null });
  assert.deepEqual(decide({ flag: "preview", param: "yes", remembered: true }), {
    enabled: true,
    remember: null,
  });
});

test("in dev the opt-in works without any build variable", () => {
  assert.deepEqual(decide({ dev: true, param: "custom" }), { enabled: true, remember: true });
  assert.deepEqual(decide({ dev: true, remembered: true }), { enabled: true, remember: null });
  assert.deepEqual(decide({ dev: true }), { enabled: false, remember: null });
});

// Run: node --test tests/card-utils.test.ts   (Node 22.18+)
// Covers src/lib/card-utils.ts: the checkout form's formatting and validation.
import test from "node:test";
import assert from "node:assert/strict";
import {
  detectNetwork,
  expiryValid,
  formatCardNumber,
  formatExpiry,
  formatMobile,
  luhnValid,
  normalizeIndianMobile,
  upiIdValid,
  validateCard,
} from "../src/lib/card-utils.ts";

const NOW = new Date("2026-11-18T10:00:00Z");

test("detects the network from the leading digits", () => {
  assert.equal(detectNetwork("4111 1111 1111 1111"), "visa");
  assert.equal(detectNetwork("5555555555554444"), "mastercard");
  assert.equal(detectNetwork("2221000000000009"), "mastercard"); // 2-series Mastercard
  assert.equal(detectNetwork("378282246310005"), "amex");
  assert.equal(detectNetwork("30569309025904"), "diners");
  assert.equal(detectNetwork("6521540000000008"), "rupay");
  assert.equal(detectNetwork("9999"), "unknown");
  assert.equal(detectNetwork(""), "unknown");
});

test("groups card numbers as the network prints them", () => {
  assert.equal(formatCardNumber("4111111111111111"), "4111 1111 1111 1111");
  assert.equal(formatCardNumber("378282246310005"), "3782 822463 10005");
  assert.equal(formatCardNumber("41111"), "4111 1");
  assert.equal(formatCardNumber("4111-1111 abcd 1111"), "4111 1111 1111"); // junk dropped, 12 digits left
  assert.equal(formatCardNumber("4111111111111111111"), "4111 1111 1111 1111 111");
  assert.equal(formatCardNumber("37828224631000599999"), "3782 822463 10005"); // Amex stops at 15
  assert.equal(formatCardNumber(""), "");
});

test("Luhn accepts real test numbers and rejects a changed digit", () => {
  for (const ok of [
    "4111111111111111",
    "5555555555554444",
    "378282246310005",
    "4718609108204366",
  ]) {
    assert.equal(luhnValid(ok), true, ok);
  }
  assert.equal(luhnValid("4111111111111112"), false);
  assert.equal(luhnValid("1234"), false);
  assert.equal(luhnValid(""), false);
});

test("expiry formats while typing", () => {
  assert.equal(formatExpiry("1"), "1");
  assert.equal(formatExpiry("4"), "04");
  assert.equal(formatExpiry("12"), "12");
  assert.equal(formatExpiry("122"), "12/2");
  assert.equal(formatExpiry("1225"), "12/25");
  assert.equal(formatExpiry("12/25"), "12/25");
  assert.equal(formatExpiry("12/2599"), "12/25");
  assert.equal(formatExpiry("3/"), "03");
  assert.equal(formatExpiry(""), "");
});

test("a card is good through the last day of its expiry month", () => {
  assert.equal(expiryValid("11/26", NOW), true); // this month
  assert.equal(expiryValid("12/26", NOW), true);
  assert.equal(expiryValid("10/26", NOW), false); // last month
  assert.equal(expiryValid("12/25", NOW), false);
  assert.equal(expiryValid("13/30", NOW), false);
  assert.equal(expiryValid("00/30", NOW), false);
  assert.equal(expiryValid("12/60", NOW), false); // implausibly far ahead
  assert.equal(expiryValid("1/3", NOW), false);
  assert.equal(expiryValid("", NOW), false);
});

test("validateCard returns nothing for a good card and a message per bad field", () => {
  const good = { number: "4718 6091 0820 4366", expiry: "12/30", cvv: "123", name: "Test User" };
  assert.deepEqual(validateCard(good, NOW), {});

  const empty = validateCard({ number: "", expiry: "", cvv: "", name: " " }, NOW);
  assert.deepEqual(Object.keys(empty).sort(), ["cvv", "expiry", "name", "number"]);

  assert.ok(validateCard({ ...good, number: "4111 1111 1111 1112" }, NOW).number);
  assert.ok(validateCard({ ...good, expiry: "01/20" }, NOW).expiry);
  assert.ok(validateCard({ ...good, cvv: "12" }, NOW).cvv);
  assert.equal(validateCard({ ...good, cvv: "1234" }, NOW).cvv, "CVV is 3 digits");
});

test("Amex needs a 15-digit number and a 4-digit CVV", () => {
  const amex = { number: "3782 822463 10005", expiry: "12/30", cvv: "1234", name: "A B" };
  assert.deepEqual(validateCard(amex, NOW), {});
  assert.equal(validateCard({ ...amex, cvv: "123" }, NOW).cvv, "CVV is 4 digits");
  assert.ok(validateCard({ ...amex, number: "3782 822463 1000" }, NOW).number);
});

test("UPI IDs", () => {
  for (const ok of ["success@razorpay", "name.surname-1@oksbi", "9876543210@ybl", " a1@paytm "]) {
    assert.equal(upiIdValid(ok), true, ok);
  }
  for (const bad of ["a@b", "nohandle", "x@@y", "@bank", "name@1bank", "spa ce@ybl", ""]) {
    assert.equal(upiIdValid(bad), false, bad);
  }
});

test("Indian mobile numbers are normalised to ten digits", () => {
  for (const ok of [
    "98765 43210",
    "+91 98765 43210",
    "919876543210",
    "09876543210",
    "9876543210",
  ]) {
    assert.equal(normalizeIndianMobile(ok), "9876543210", ok);
  }
  for (const bad of ["1234567890", "98765", "98765432101", "", "abcdefghij"]) {
    assert.equal(normalizeIndianMobile(bad), null, bad);
  }
});

test("mobile formatting while typing", () => {
  assert.equal(formatMobile("9876543210"), "98765 43210");
  assert.equal(formatMobile("+919876543210"), "98765 43210");
  assert.equal(formatMobile("98765"), "98765");
  assert.equal(formatMobile("987654321099"), "98765 43210");
  assert.equal(formatMobile(""), "");
});

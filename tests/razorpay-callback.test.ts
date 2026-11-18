// Run: node --test tests/razorpay-callback.test.ts   (Node 22.18+)
// Covers the pure parts of src/lib/razorpay-callback.server.ts: reading the POST, the signature, the replay
// window and where the browser is sent next. The database and Razorpay lookups are not exercised here.
import test from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PAYMENT_AGE_SECONDS,
  expectedSignature,
  isRecent,
  nextLocation,
  parseCallback,
  signatureMatches,
  type CallbackPayload,
} from "../src/lib/razorpay-callback.server.ts";

const form = (o: Record<string, string>) => new URLSearchParams(o);

// Computed independently with `openssl dgst -sha256 -hmac testsecret`, so these pin the message format.
const SUB_SIG = "16982cbafd47f85bcbfca3b386f797b9c2ddeb3e2cd0416c61c24c7e78e2c5e9"; // pay_ABC123|sub_ABC123
const ORDER_SIG = "0143eebeb68cad008d3e6b03e464b4a23ba3ecf431703423a572705e3327abb6"; // order_ABC123|pay_ABC123
const SUB_WRONG_ORDER = "a6751a0ab913c0e1b19a8f4d5c8d1132ec01f0f605b6b78558bbbf3295a2596b"; // sub_ABC123|pay_ABC123

const subPayload: CallbackPayload = {
  kind: "subscription",
  paymentId: "pay_ABC123",
  subscriptionId: "sub_ABC123",
  signature: SUB_SIG,
};
const orderPayload: CallbackPayload = {
  kind: "order",
  paymentId: "pay_ABC123",
  orderId: "order_ABC123",
  signature: ORDER_SIG,
};

test("reads a subscription success post", () => {
  const r = parseCallback(
    form({
      razorpay_payment_id: "pay_ABC123",
      razorpay_subscription_id: "sub_ABC123",
      razorpay_signature: SUB_SIG,
    }),
  );
  assert.deepEqual(r, { ok: true, payload: subPayload });
});

test("reads an order success post", () => {
  const r = parseCallback(
    form({
      razorpay_payment_id: "pay_ABC123",
      razorpay_order_id: "order_ABC123",
      razorpay_signature: ORDER_SIG,
    }),
  );
  assert.deepEqual(r, { ok: true, payload: orderPayload });
});

test("a failure post carries no signature and keeps Razorpay's message", () => {
  const r = parseCallback(
    form({
      "error[code]": "BAD_REQUEST_ERROR",
      "error[description]": "  Payment failed  ",
      razorpay_order_id: "order_ABC123",
    }),
  );
  assert.deepEqual(r, { ok: false, kind: "order", message: "Payment failed" });
});

test("a failure with nothing to go on is treated as a subscription failure with no message", () => {
  assert.deepEqual(parseCallback(form({})), { ok: false, kind: "subscription", message: null });
});

test("rejects ids that are not Razorpay ids, and a long message is cut", () => {
  const bad = parseCallback(
    form({
      razorpay_payment_id: "not-a-payment",
      razorpay_subscription_id: "sub_ABC123",
      razorpay_signature: SUB_SIG,
      "error[description]": "x".repeat(500),
    }),
  );
  assert.equal(bad.ok, false);
  if (!bad.ok) assert.equal(bad.message?.length, 160);

  assert.equal(
    parseCallback(
      form({
        razorpay_payment_id: "pay_1",
        razorpay_subscription_id: "sub_1'; drop",
        razorpay_signature: "x",
      }),
    ).ok,
    false,
  );
  assert.equal(
    parseCallback(form({ razorpay_payment_id: "pay_1", razorpay_signature: "x" })).ok,
    false,
  ); // no entity id
});

test("subscription signatures sign payment|subscription, order signatures sign order|payment", () => {
  assert.equal(expectedSignature("testsecret", subPayload), SUB_SIG);
  assert.equal(expectedSignature("testsecret", orderPayload), ORDER_SIG);
  assert.notEqual(expectedSignature("testsecret", subPayload), SUB_WRONG_ORDER);
});

test("signatureMatches accepts the real signature and nothing else", () => {
  assert.equal(signatureMatches("testsecret", subPayload), true);
  assert.equal(signatureMatches("testsecret", orderPayload), true);
  assert.equal(signatureMatches("othersecret", subPayload), false); // wrong key
  assert.equal(
    signatureMatches("testsecret", { ...subPayload, signature: SUB_WRONG_ORDER }),
    false,
  ); // swapped parts
  assert.equal(
    signatureMatches("testsecret", { ...subPayload, subscriptionId: "sub_OTHER" }),
    false,
  ); // another sub
  assert.equal(signatureMatches("testsecret", { ...subPayload, signature: "short" }), false); // length mismatch
  assert.equal(signatureMatches("testsecret", { ...subPayload, signature: "" }), false);
});

test("a payment is recent for half an hour and a replay after that is refused", () => {
  const now = Date.parse("2026-11-18T12:00:00Z");
  const s = now / 1000;
  assert.equal(isRecent(s - 5, now), true);
  assert.equal(isRecent(s - MAX_PAYMENT_AGE_SECONDS, now), true);
  assert.equal(isRecent(s - MAX_PAYMENT_AGE_SECONDS - 1, now), false);
  assert.equal(isRecent(s - 86400 * 20, now), false); // an old signed payload, replayed
  assert.equal(isRecent(s + 30, now), true); // small clock skew
  assert.equal(isRecent(s + 3600, now), false); // from the future
  assert.equal(isRecent(undefined, now), false);
  assert.equal(isRecent("1", now), false);
});

test("where the browser goes next", () => {
  assert.equal(nextLocation("subscription", "activated"), "/welcome");
  assert.equal(nextLocation("order", "activated"), "/app/discord");
  assert.equal(nextLocation("subscription", "pending"), "/subscribe?payment=confirming");
  assert.equal(nextLocation("order", "pending"), "/enroll?payment=confirming");
  assert.equal(nextLocation("subscription", "rejected"), "/subscribe?payment=failed");
  assert.equal(nextLocation("order", "rejected"), "/enroll?payment=failed");
});

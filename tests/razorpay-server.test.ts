// Run: node --test tests/razorpay-server.test.ts   (Node 22.18+)
// Covers paidThroughFromRemote / latestPeriodEnd in src/lib/razorpay.server.ts: the date a member's access runs to.
import test from "node:test";
import assert from "node:assert/strict";
import { latestPeriodEnd, paidThroughFromRemote } from "../src/lib/razorpay.server.ts";

const s = (iso: string) => Date.parse(iso) / 1000;
const CURRENT_END = "2026-12-17T18:30:00.000Z";
const END_AT = "2036-10-17T18:30:00.000Z";

test("a live subscription is paid through current_end, not the end of all cycles", () => {
  // The shape Razorpay returned for a real test subscription after its first payment.
  const remote = {
    status: "active",
    current_end: s(CURRENT_END),
    charge_at: s(CURRENT_END),
    end_at: s(END_AT),
  };
  assert.equal(paidThroughFromRemote(remote), CURRENT_END);
});

test("end_at never extends a live subscription, whatever its status", () => {
  for (const status of ["created", "authenticated", "active", "pending"]) {
    const got = paidThroughFromRemote({ status, current_end: s(CURRENT_END), end_at: s(END_AT) });
    assert.equal(got, CURRENT_END, status);
  }
});

test("a trial that has not started is paid through its first charge date", () => {
  const trialEnd = "2026-12-01T00:00:00.000Z";
  assert.equal(
    paidThroughFromRemote({ status: "created", charge_at: s(trialEnd), end_at: s(END_AT) }),
    trialEnd,
  );
});

test("charge_at later than current_end wins, so a renewal in flight is not cut short", () => {
  const later = "2026-12-20T00:00:00.000Z";
  assert.equal(
    paidThroughFromRemote({ status: "active", current_end: s(CURRENT_END), charge_at: s(later) }),
    later,
  );
});

test("a cancelled subscription keeps the period already paid for", () => {
  assert.equal(
    paidThroughFromRemote({ status: "cancelled", current_end: s(CURRENT_END), end_at: s(END_AT) }),
    CURRENT_END,
  );
});

test("end_at is only a last resort for an ended subscription with no current period", () => {
  const ended = "2026-12-05T00:00:00.000Z";
  for (const status of ["cancelled", "completed", "halted", "paused", "expired"]) {
    assert.equal(paidThroughFromRemote({ status, end_at: s(ended) }), ended, status);
  }
  // A live subscription with only end_at is not guessed at: that would be the ten-year date.
  assert.equal(paidThroughFromRemote({ status: "active", end_at: s(END_AT) }), null);
  assert.equal(paidThroughFromRemote({ end_at: s(END_AT) }), null);
});

test("nothing usable gives no date", () => {
  assert.equal(paidThroughFromRemote(null), null);
  assert.equal(paidThroughFromRemote({}), null);
  assert.equal(paidThroughFromRemote({ status: "active", current_end: 0, charge_at: -5 }), null);
});

test("a stored date is never moved earlier", () => {
  assert.equal(
    latestPeriodEnd("2026-12-17T00:00:00Z", "2026-12-01T00:00:00Z"),
    "2026-12-17T00:00:00Z",
  );
  assert.equal(
    latestPeriodEnd("2026-12-01T00:00:00Z", "2026-12-17T00:00:00Z"),
    "2026-12-17T00:00:00Z",
  );
  assert.equal(latestPeriodEnd(null, "2026-12-17T00:00:00Z"), "2026-12-17T00:00:00Z");
  assert.equal(latestPeriodEnd("2026-12-17T00:00:00Z", null), "2026-12-17T00:00:00Z");
  assert.equal(latestPeriodEnd(null, null), null);
});

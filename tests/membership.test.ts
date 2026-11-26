// Run: node --test tests/membership.test.ts   (Node 22.18+)
// Covers isEntitled / hasCourseAccess in src/lib/membership.server.ts: who may open courses and play videos.
// Regression: a member who cancelled autopay (e.g. from their UPI app) has status `cancelled` but a future
// paid-through date, and used to lose the course list and every video while the rest of the app let them in.
import test from "node:test";
import assert from "node:assert/strict";
import {
  hasCourseAccess,
  isEntitled,
  type AccessClient,
  type SubscriptionRow,
} from "../src/lib/membership.server.ts";

const DAY = 24 * 60 * 60 * 1000;
const future = () => new Date(Date.now() + 5 * DAY).toISOString();
const past = () => new Date(Date.now() - DAY).toISOString();

test("isEntitled: active and cancelled both grant access through the paid-through date", () => {
  assert.equal(isEntitled({ status: "active", current_period_end: future() }), true);
  assert.equal(isEntitled({ status: "cancelled", current_period_end: future() }), true);
});

test("isEntitled: no access without a future paid-through date or a live status", () => {
  assert.equal(isEntitled(null), false);
  assert.equal(isEntitled({ status: "active", current_period_end: null }), false);
  assert.equal(isEntitled({ status: "active", current_period_end: past() }), false);
  assert.equal(isEntitled({ status: "cancelled", current_period_end: past() }), false);
  assert.equal(isEntitled({ status: "created", current_period_end: future() }), false);
  assert.equal(isEntitled({ status: "past_due", current_period_end: future() }), false);
});

/** A fake Supabase client: one subscription row (or none) and an admin flag. */
function fakeClient(sub: SubscriptionRow, isAdmin = false) {
  const calls: string[] = [];
  const client: AccessClient = {
    rpc: async (fn) => {
      calls.push(`rpc:${fn}`);
      return { data: isAdmin };
    },
    from: (table) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            calls.push(`from:${table}`);
            return { data: sub };
          },
        }),
      }),
    }),
  };
  return { client, calls };
}

test("hasCourseAccess: a member who cancelled autopay keeps courses and videos until the period ends", async () => {
  const { client } = fakeClient({ status: "cancelled", current_period_end: future() });
  assert.equal(await hasCourseAccess(client, "user-1"), true);
});

test("hasCourseAccess: an active member has access", async () => {
  const { client } = fakeClient({ status: "active", current_period_end: future() });
  assert.equal(await hasCourseAccess(client, "user-1"), true);
});

test("hasCourseAccess: a cancelled member loses access once the paid-through date has passed", async () => {
  const { client } = fakeClient({ status: "cancelled", current_period_end: past() });
  assert.equal(await hasCourseAccess(client, "user-1"), false);
});

test("hasCourseAccess: no subscription, or one that never activated, has no access", async () => {
  assert.equal(await hasCourseAccess(fakeClient(null).client, "user-1"), false);
  const created = fakeClient({ status: "created", current_period_end: future() }).client;
  assert.equal(await hasCourseAccess(created, "user-1"), false);
});

test("hasCourseAccess: an admin has access without a subscription and without reading one", async () => {
  const { client, calls } = fakeClient(null, true);
  assert.equal(await hasCourseAccess(client, "admin-1"), true);
  assert.deepEqual(calls, ["rpc:has_role"]);
});

// Run: node --test tests/journal-sync.test.ts   (Node 22.18+)
// Covers the pure parts of src/lib/journal-sync.server.ts and the HTTP call, with fetch stubbed.
import test from "node:test";
import assert from "node:assert/strict";
import {
  journalCallFor,
  pushToJournal,
  signBody,
  syncJournalFromSweep,
  type JournalCall,
} from "../src/lib/journal-sync.server.ts";
import { JOURNAL_PILLS } from "../src/lib/journal.ts";

const AT = new Date("2026-11-17T10:00:00Z");
const END = "2026-12-17T00:00:00+00:00";

test("an entitled blue member is granted until the paid-through date", () => {
  const c = journalCallFor(
    {
      email: " Member@Example.com ",
      pill: "blue",
      status: "active",
      current_period_end: END,
      razorpay_subscription_id: "sub_1",
    },
    true,
    AT,
  );
  assert.deepEqual(c, {
    email: "member@example.com",
    action: "grant",
    active_until: "2026-12-17T00:00:00.000Z",
    reference: "sub_1",
    event_at: "2026-11-17T10:00:00.000Z",
  });
});

test("a cancelled member still inside the paid period is entitled, so they are granted, not revoked", () => {
  const c = journalCallFor(
    { email: "a@b.co", pill: "blue", status: "cancelled", current_period_end: END },
    true,
    AT,
  );
  assert.equal(c?.action, "grant");
});

test("a manual or trial membership (no Razorpay id) has no reference", () => {
  const c = journalCallFor(
    { email: "a@b.co", status: "active", current_period_end: END, razorpay_subscription_id: null },
    true,
    AT,
  );
  assert.equal(c?.action, "grant");
  assert.equal(JSON.stringify(c).includes("reference"), false);
});

test("a lapsed or cancelled-and-ended member is revoked", () => {
  for (const status of ["cancelled", "expired", "active"]) {
    const c = journalCallFor(
      { email: "a@b.co", pill: "blue", status, current_period_end: "2026-01-01T00:00:00Z" },
      false,
      AT,
    );
    assert.equal(c?.action, "revoke", status);
  }
});

test("a checkout that was never paid is left alone", () => {
  assert.equal(journalCallFor({ email: "a@b.co", status: "created" }, false, AT), null);
  assert.equal(journalCallFor({ email: "a@b.co" }, false, AT), null);
});

test("nothing is sent without an email, or for a membership that does not include the journal", () => {
  assert.equal(
    journalCallFor({ email: null, status: "active", current_period_end: END }, true, AT),
    null,
  );
  assert.equal(
    journalCallFor({ email: "  ", status: "active", current_period_end: END }, true, AT),
    null,
  );
  assert.equal(
    journalCallFor(
      { email: "a@b.co", pill: "other", status: "active", current_period_end: END },
      true,
      AT,
    ),
    null,
  );
});

test("a Red Pill member (one payment, 31 days) is granted until their access ends, and revoked when it has", () => {
  const live = journalCallFor(
    {
      email: "a@b.co",
      pill: "red",
      status: "active",
      current_period_end: END,
      razorpay_subscription_id: "order_1",
    },
    true,
    AT,
  );
  assert.equal(live?.action, "grant");
  assert.equal(live?.reference, "order_1");
  assert.equal(
    journalCallFor(
      {
        email: "a@b.co",
        pill: "red",
        status: "expired",
        current_period_end: "2026-01-01T00:00:00Z",
      },
      false,
      AT,
    )?.action,
    "revoke",
  );
  // A staged but unpaid order never had the journal.
  assert.equal(
    journalCallFor({ email: "a@b.co", pill: "red", status: "created" }, false, AT),
    null,
  );
});

test("both pills include the journal", () => {
  assert.deepEqual([...JOURNAL_PILLS].sort(), ["blue", "red"]);
});

test("entitled with no usable end date is not granted", () => {
  const c = journalCallFor(
    { email: "a@b.co", status: "active", current_period_end: "garbage" },
    true,
    AT,
  );
  assert.equal(c?.action, "revoke");
  assert.equal(
    journalCallFor({ email: "a@b.co", status: "active", current_period_end: null }, true, AT)
      ?.action,
    "revoke",
  );
});

test("the signature is the one the journal's function checks (same vector as its tests, and openssl)", () => {
  assert.equal(
    signBody("s3cret", '{"a":1}'),
    "5910e62016ef5034272c926c27071992a465c2335cecf41851bda071577f4f6d",
  );
});

test("nothing is pushed when the journal is not configured", async () => {
  delete process.env["JOURNAL_WEBHOOK_URL"];
  delete process.env["JOURNAL_WEBHOOK_SECRET"];
  const r = await pushToJournal({ email: "a@b.co", action: "revoke", event_at: AT.toISOString() });
  assert.equal(r.ok, false);
  assert.equal((r as { skipped?: boolean }).skipped, true);
});

test("a push is signed over the exact body it sends", async () => {
  process.env["JOURNAL_WEBHOOK_URL"] = "https://journal.example/functions/v1/bluepill-webhook";
  process.env["JOURNAL_WEBHOOK_SECRET"] = "s3cret";
  const realFetch = globalThis.fetch;
  let seen: { url: string; init: RequestInit } | null = null;
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    seen = { url, init };
    return new Response(JSON.stringify({ ok: true, result: "applied" }), { status: 200 });
  }) as typeof fetch;
  try {
    const call: JournalCall = {
      email: "a@b.co",
      action: "grant",
      active_until: "2026-12-17T00:00:00.000Z",
      event_at: AT.toISOString(),
    };
    const r = await pushToJournal(call);
    assert.equal(r.ok, true);
    assert.equal(seen!.url, "https://journal.example/functions/v1/bluepill-webhook");
    assert.equal(seen!.init.method, "POST");
    const body = seen!.init.body as string;
    assert.deepEqual(JSON.parse(body), call);
    const headers = seen!.init.headers as Record<string, string>;
    assert.equal(headers["x-razorpay-signature"], signBody("s3cret", body));
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("a non-200 answer, and a network failure, come back as errors instead of throwing", async () => {
  process.env["JOURNAL_WEBHOOK_URL"] = "https://journal.example/x";
  process.env["JOURNAL_WEBHOOK_SECRET"] = "s3cret";
  const realFetch = globalThis.fetch;
  const call: JournalCall = { email: "a@b.co", action: "revoke", event_at: AT.toISOString() };
  try {
    globalThis.fetch = (async () =>
      new Response('{"error":"Bad signature"}', { status: 401 })) as typeof fetch;
    const bad = await pushToJournal(call);
    assert.equal(bad.ok, false);
    assert.equal((bad as { status?: number }).status, 401);

    globalThis.fetch = (async () => {
      throw new Error("connect ECONNREFUSED");
    }) as typeof fetch;
    const down = await pushToJournal(call);
    assert.equal(down.ok, false);
    assert.match((down as { error: string }).error, /ECONNREFUSED/);
  } finally {
    globalThis.fetch = realFetch;
  }
});

test("the sweep sends nothing for members whose pill does not include the journal", async () => {
  const s = await syncJournalFromSweep(
    [{ user_id: "u1", pill: "other", status: "active", current_period_end: END, entitled: true }],
    AT,
  );
  assert.deepEqual(s, { calls: 0, sent: 0, errors: [] });
});

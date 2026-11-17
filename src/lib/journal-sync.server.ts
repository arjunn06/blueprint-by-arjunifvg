/**
 * IFVG Journal access follows membership (the Blue and the Red Pill: see JOURNAL_PILLS in ./journal).
 *
 * The journal (journal.ifvg.in) is a separate app on its own Supabase project, included free with a membership.
 * This site is the source of truth for who is a member, so it tells the journal whenever that changes: a signed
 * POST of { email, action: "grant" | "revoke", active_until } to the journal's `bluepill-webhook` function.
 * The journal matches the member by the email they sign up there with, so the order does not matter.
 *
 * What the journal should hold is always derived from the same rule the rest of this site uses (`isEntitled`),
 * never re-decided here, so the library and the journal cannot disagree.
 *
 * Server only. Nothing here throws: the journal being down must never break a payment, a webhook or the sweep.
 * The hourly sweep re-sends everything, so a push that failed is repaired within the hour.
 *
 * Env (host secrets): JOURNAL_WEBHOOK_URL     https://<journal project>.supabase.co/functions/v1/bluepill-webhook
 *                     JOURNAL_WEBHOOK_SECRET  the journal's BLUEPILL_WEBHOOK_SECRET
 * With either unset every call is a no-op, so this can ship before the journal side is live.
 */
import { createHmac } from "crypto";
// Explicit extension: the tests load this file straight in Node, which does not guess it.
import { JOURNAL_PILLS } from "./journal.ts";

/** The journal accepts at most this many calls in one request. */
export const JOURNAL_MAX_BATCH = 500;

export type MemberState = {
  email?: string | null;
  pill?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  razorpay_subscription_id?: string | null;
};

export type JournalCall =
  | { email: string; action: "grant"; active_until: string; reference?: string; event_at: string }
  | { email: string; action: "revoke"; reference?: string; event_at: string };

/**
 * What the journal should be told about one member, or null when it should be told nothing.
 * `entitled` is `isEntitled(subscription)`; `at` is when that state was read (an older call never overrides a newer one there).
 */
export function journalCallFor(m: MemberState, entitled: boolean, at: Date): JournalCall | null {
  const email = m.email?.trim().toLowerCase();
  if (!email) return null;
  if (!JOURNAL_PILLS.includes(m.pill ?? "blue")) return null;

  const reference = m.razorpay_subscription_id || undefined;
  const event_at = at.toISOString();
  const end = m.current_period_end ? new Date(m.current_period_end) : null;

  if (entitled && end && !Number.isNaN(end.getTime())) {
    return { email, action: "grant", active_until: end.toISOString(), reference, event_at };
  }
  // Not a member (any more). A checkout that was never paid never had the journal: nothing to take away.
  if (!m.status || m.status === "created") return null;
  return { email, action: "revoke", reference, event_at };
}

/** Hex HMAC-SHA256: the same signature scheme Razorpay uses, which the journal's function expects. */
export function signBody(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

export type PushResult =
  | { ok: true; status: number; body: unknown }
  | { ok: false; skipped: true; reason: string }
  | { ok: false; skipped?: false; status?: number; error: string };

/** POST one call, or an array of up to JOURNAL_MAX_BATCH calls, to the journal. */
export async function pushToJournal(
  payload: JournalCall | JournalCall[],
  timeoutMs = 8000,
): Promise<PushResult> {
  const url = process.env["JOURNAL_WEBHOOK_URL"];
  const secret = process.env["JOURNAL_WEBHOOK_SECRET"];
  if (!url || !secret) {
    return {
      ok: false,
      skipped: true,
      reason: "JOURNAL_WEBHOOK_URL / JOURNAL_WEBHOOK_SECRET not set",
    };
  }
  const body = JSON.stringify(payload);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-razorpay-signature": signBody(secret, body),
      },
      body,
      signal: AbortSignal.timeout(timeoutMs),
    });
    const text = await res.text().catch(() => "");
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* not JSON: keep the text */
    }
    if (!res.ok) return { ok: false, status: res.status, error: text.slice(0, 300) };
    return { ok: true, status: res.status, body: parsed };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

function report(what: string, r: PushResult) {
  if (r.ok || r.skipped) return; // no-op when the journal is not configured
  console.error(`Journal sync failed (${what})`, r.status ?? "", r.error);
}

/**
 * Bring the journal in line with one member, right now: after a payment, a webhook, an admin change.
 * Uses a short timeout because some callers are answering Razorpay.
 */
export async function syncJournalAccess(userId: string, timeoutMs = 4000): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { isEntitled } = await import("@/lib/membership.server");
    const [{ data: sub }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from("subscriptions")
        .select("status, pill, current_period_end, razorpay_subscription_id")
        .eq("user_id", userId)
        .maybeSingle(),
      supabaseAdmin.from("profiles").select("email").eq("id", userId).maybeSingle(),
    ]);
    const call = journalCallFor({ ...sub, email: profile?.email }, isEntitled(sub), new Date());
    if (!call) return;
    report(`${call.action} ${userId}`, await pushToJournal(call, timeoutMs));
  } catch (err) {
    console.error("Journal sync error", userId, err);
  }
}

/** End access for an address whose subscription row is gone (an account an admin deleted). */
export async function revokeJournalAccess(
  email: string | null | undefined,
  timeoutMs = 4000,
): Promise<void> {
  try {
    const call = journalCallFor({ email, status: "cancelled" }, false, new Date());
    if (!call) return;
    report("revoke (deleted account)", await pushToJournal(call, timeoutMs));
  } catch (err) {
    console.error("Journal revoke error", err);
  }
}

export type SweepRow = {
  user_id: string;
  pill?: string | null;
  status?: string | null;
  current_period_end?: string | null;
  razorpay_subscription_id?: string | null;
  entitled: boolean;
};

export type SweepSummary = { calls: number; sent: number; skipped?: string; errors: string[] };

/**
 * The hourly catch-up: send the journal the state of every member in one go (a request per JOURNAL_MAX_BATCH).
 * Repairs any push that failed earlier and covers changes made straight in the database.
 * `readAt` is when the sweep read the rows; a change made while it ran carries a later time and wins.
 */
export async function syncJournalFromSweep(rows: SweepRow[], readAt: Date): Promise<SweepSummary> {
  const summary: SweepSummary = { calls: 0, sent: 0, errors: [] };
  try {
    const wanted = rows.filter((r) => JOURNAL_PILLS.includes(r.pill ?? "blue"));
    if (!wanted.length) return summary;

    // Emails are on the profile, not the subscription row. One page of 1000 at a time keeps the request small.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const emails = new Map<string, string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await supabaseAdmin
        .from("profiles")
        .select("id, email")
        .order("id")
        .range(from, from + 999);
      if (error) throw error;
      for (const p of data ?? []) if (p.email) emails.set(p.id, p.email);
      if ((data?.length ?? 0) < 1000) break;
    }

    const calls: JournalCall[] = [];
    for (const r of wanted) {
      const call = journalCallFor({ ...r, email: emails.get(r.user_id) }, r.entitled, readAt);
      if (call) calls.push(call);
    }
    summary.calls = calls.length;

    for (let i = 0; i < calls.length; i += JOURNAL_MAX_BATCH) {
      const chunk = calls.slice(i, i + JOURNAL_MAX_BATCH);
      const r = await pushToJournal(chunk, 20000);
      if (r.ok) summary.sent += chunk.length;
      else if (r.skipped) {
        summary.skipped = r.reason;
        break;
      } else summary.errors.push(`${r.status ?? "network"}: ${r.error}`);
    }
  } catch (err) {
    summary.errors.push(err instanceof Error ? err.message : String(err));
  }
  if (summary.errors.length) console.error("Journal sweep sync", summary);
  return summary;
}

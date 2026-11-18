/**
 * The return leg of Razorpay's redirect flow. On phones and in in-app browsers the in-page checkout sends the
 * whole tab to the bank with a `callback_url`; Razorpay then form-POSTs the result to
 * /api/public/razorpay/callback and the member's browser follows our redirect.
 *
 * That endpoint has no signed-in member (it is a cross-site POST), so everything here rests on three things:
 *   1. the HMAC signature, which only Razorpay can produce for a payment on our account;
 *   2. a lookup of the payment (and order / subscription) at Razorpay, never trusting the POST body;
 *   3. refusing replays: the payment must be recent and successful, and a cancelled subscription is not
 *      brought back.
 * The webhook stays the source of truth. This only lets the member in a few seconds sooner, like
 * verifySubscriptionPayment / verifyRedPillPayment do for the popup flow.
 *
 * Server only. Static imports are relative with an explicit extension so tests/razorpay-callback.test.ts can
 * load the pure parts in Node; anything that needs the `@/` alias is imported inside the function.
 */
import { createHmac, timingSafeEqual } from "crypto";
import { RED_PILL_ACCESS_DAYS } from "./pricing.ts";
import { fetchRemoteSubscription, razorpayAuthHeader } from "./razorpay.server.ts";

export type CallbackKind = "subscription" | "order";

export type CallbackPayload =
  | { kind: "subscription"; paymentId: string; subscriptionId: string; signature: string }
  | { kind: "order"; paymentId: string; orderId: string; signature: string };

export type ParsedCallback =
  | { ok: true; payload: CallbackPayload }
  | { ok: false; kind: CallbackKind; message: string | null };

/** What the POST body says. Failures post no signature, only `error[...]` fields. */
export function parseCallback(form: URLSearchParams): ParsedCallback {
  const paymentId = form.get("razorpay_payment_id") ?? "";
  const signature = form.get("razorpay_signature") ?? "";
  const subscriptionId = form.get("razorpay_subscription_id");
  const orderId = form.get("razorpay_order_id");

  if (/^pay_\w+$/.test(paymentId) && signature) {
    if (subscriptionId && /^sub_\w+$/.test(subscriptionId)) {
      return { ok: true, payload: { kind: "subscription", paymentId, subscriptionId, signature } };
    }
    if (orderId && /^order_\w+$/.test(orderId)) {
      return { ok: true, payload: { kind: "order", paymentId, orderId, signature } };
    }
  }
  const kind: CallbackKind =
    form.has("razorpay_subscription_id") || !form.has("razorpay_order_id")
      ? "subscription"
      : "order";
  const message = (form.get("error[description]") ?? "").trim().slice(0, 160) || null;
  return { ok: false, kind, message };
}

/** Razorpay's checkout signature: subscriptions sign payment|subscription, orders sign order|payment. */
export function expectedSignature(secret: string, p: CallbackPayload): string {
  const message =
    p.kind === "subscription"
      ? `${p.paymentId}|${p.subscriptionId}`
      : `${p.orderId}|${p.paymentId}`;
  return createHmac("sha256", secret).update(message).digest("hex");
}

export function signatureMatches(secret: string, p: CallbackPayload): boolean {
  const a = Buffer.from(expectedSignature(secret, p));
  const b = Buffer.from(p.signature);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** A payment older than this is not the one the member just made, so a signed POST for it is a replay. */
export const MAX_PAYMENT_AGE_SECONDS = 30 * 60;

export function isRecent(createdAtSeconds: unknown, nowMs: number = Date.now()): boolean {
  if (typeof createdAtSeconds !== "number") return false;
  const age = nowMs / 1000 - createdAtSeconds;
  return age <= MAX_PAYMENT_AGE_SECONDS && age >= -60;
}

export type Outcome = "activated" | "pending" | "rejected";

/** Where the member's browser goes next. `pending` lands on the page that polls until the webhook catches up. */
export function nextLocation(kind: CallbackKind, outcome: Outcome): string {
  if (outcome === "activated") return kind === "subscription" ? "/welcome" : "/app/discord";
  const page = kind === "subscription" ? "/subscribe" : "/enroll";
  return `${page}?payment=${outcome === "pending" ? "confirming" : "failed"}`;
}

type RzPayment = { status?: string; order_id?: string | null; created_at?: number };
type RzOrder = { notes?: Record<string, unknown> | null };

async function getRazorpay<T>(path: string): Promise<T | null> {
  const auth = razorpayAuthHeader();
  if (!auth) return null;
  try {
    const res = await fetch(`https://api.razorpay.com/v1${path}`, {
      headers: { Authorization: auth },
    });
    return res.ok ? ((await res.json()) as T) : null;
  } catch (err) {
    console.warn("razorpay callback: lookup failed", path, err);
    return null;
  }
}

const DEAD_SUBSCRIPTION = ["cancelled", "completed", "halted", "paused", "expired"];

/** The payment must exist, have gone through, and be one the member just made. */
async function paymentIsGood(
  paymentId: string,
): Promise<{ ok: true; payment: RzPayment } | { ok: false; outcome: Outcome }> {
  const payment = await getRazorpay<RzPayment>(`/payments/${paymentId}`);
  if (!payment) return { ok: false, outcome: "pending" };
  const wentThrough = ["authorized", "captured"].includes(payment.status ?? "");
  if (!wentThrough || !isRecent(payment.created_at)) return { ok: false, outcome: "rejected" };
  return { ok: true, payment };
}

async function completeSubscription(
  p: Extract<CallbackPayload, { kind: "subscription" }>,
): Promise<Outcome> {
  const paid = await paymentIsGood(p.paymentId);
  if (!paid.ok) return paid.outcome;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // createSubscription stages this row before checkout opens, so it is how we know whose payment this is.
  const { data: row, error } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("razorpay_subscription_id", p.subscriptionId)
    .maybeSingle();
  if (error || !row) return "pending"; // the webhook upserts by notes.user_id; the page's reconcile catches up

  const remote = await fetchRemoteSubscription(p.subscriptionId);
  if (remote && DEAD_SUBSCRIPTION.includes(remote.status ?? "")) return "rejected";

  // Same period end verifySubscriptionPayment stores.
  const end = remote?.current_end ?? remote?.charge_at;
  const patch: { status: string; current_period_end?: string } = { status: "active" };
  if (end) patch.current_period_end = new Date(end * 1000).toISOString();
  const { error: updateError } = await supabaseAdmin
    .from("subscriptions")
    .update(patch)
    .eq("razorpay_subscription_id", p.subscriptionId);
  if (updateError) return "pending";

  const { syncJournalAccess } = await import("@/lib/journal-sync.server");
  await syncJournalAccess(row.user_id);
  return "activated";
}

async function completeOrder(p: Extract<CallbackPayload, { kind: "order" }>): Promise<Outcome> {
  const paid = await paymentIsGood(p.paymentId);
  if (!paid.ok) return paid.outcome;
  if (paid.payment.order_id !== p.orderId) return "rejected"; // a real payment, but not for this order

  // createRedPillOrder put the member's id in the order's notes. Razorpay's copy is the one we trust.
  const order = await getRazorpay<RzOrder>(`/orders/${p.orderId}`);
  if (!order) return "pending";
  const userId = typeof order.notes?.user_id === "string" ? order.notes.user_id : null;
  if (!userId || order.notes?.pill !== "red") return "rejected";

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // A row already holding this order id has been through here (or the webhook): don't run it twice.
  const { data: existing, error } = await supabaseAdmin
    .from("subscriptions")
    .select("status")
    .eq("user_id", userId)
    .eq("razorpay_subscription_id", p.orderId)
    .maybeSingle();
  if (error) return "pending";
  if (existing && existing.status !== "created") return "activated";

  const endsAt = new Date(Date.now() + RED_PILL_ACCESS_DAYS * 86400_000).toISOString();
  const { data: updated, error: updateError } = await supabaseAdmin
    .from("subscriptions")
    .update({ status: "active", pill: "red" as const, current_period_end: endsAt })
    .eq("user_id", userId)
    .eq("razorpay_subscription_id", p.orderId)
    .select("user_id");
  if (updateError) return "pending";
  if (!updated?.length) {
    // Blue -> Red upgrade: the order was never staged on the member's row.
    const { error: upsertError } = await supabaseAdmin.from("subscriptions").upsert(
      {
        user_id: userId,
        razorpay_subscription_id: p.orderId,
        status: "active",
        pill: "red" as const,
        current_period_end: endsAt,
        cancelled_at: null,
      },
      { onConflict: "user_id" },
    );
    if (upsertError) return "pending";
  }

  const { syncJournalAccess } = await import("@/lib/journal-sync.server");
  await syncJournalAccess(userId);
  return "activated";
}

export function completeCallback(p: CallbackPayload): Promise<Outcome> {
  return p.kind === "subscription" ? completeSubscription(p) : completeOrder(p);
}

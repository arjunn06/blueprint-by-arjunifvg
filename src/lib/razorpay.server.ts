/**
 * Server-only Razorpay helpers shared by billing, webhooks and the sweep.
 */
export function razorpayAuthHeader(): string | null {
  const keyId = process.env['RAZORPAY_KEY_ID'];
  const secret = process.env['RAZORPAY_KEY_SECRET'];
  if (!keyId || !secret) return null;
  return "Basic " + Buffer.from(`${keyId}:${secret}`).toString("base64");
}

export type RemoteSubscription = {
  status?: string;
  current_end?: number;
  charge_at?: number;
  end_at?: number;
  ended_at?: number;
};

export async function fetchRemoteSubscription(
  subscriptionId: string,
): Promise<RemoteSubscription | null> {
  const auth = razorpayAuthHeader();
  if (!auth || !subscriptionId.startsWith("sub_")) return null;
  try {
    const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${subscriptionId}`, {
      headers: { Authorization: auth },
    });
    if (!res.ok) return null;
    return (await res.json()) as RemoteSubscription;
  } catch (err) {
    console.warn("fetchRemoteSubscription failed", subscriptionId, err);
    return null;
  }
}

const ENDED_STATUSES = ["cancelled", "completed", "halted", "paused", "expired"];

/**
 * The date access should run through. Razorpay reports `current_end` for the period already paid for, and
 * `charge_at` (the next debit) is the same moment while a subscription is live; we take the furthest of the
 * two so cancelling autopay never shortens the window the member already paid for.
 *
 * `end_at` is NOT a paid-through date: it is when the whole subscription is scheduled to finish, which for our
 * 120-cycle plan is about ten years away. Counting it made every paying member entitled until ~2036 (and
 * `isEntitled` also honours `cancelled`, so cancelling or failing a renewal never ended access). It is only
 * used as a last resort for a subscription that has already ended and no longer reports a current period.
 */
export function paidThroughFromRemote(remote: RemoteSubscription | null): string | null {
  if (!remote) return null;
  const valid = (v: unknown): v is number => typeof v === "number" && v > 0;
  const paid = [remote.current_end, remote.charge_at].filter(valid);
  if (!paid.length && ENDED_STATUSES.includes(remote.status ?? "") && valid(remote.end_at)) {
    paid.push(remote.end_at);
  }
  if (!paid.length) return null;
  return new Date(Math.max(...paid) * 1000).toISOString();
}

/** Never move a paid-through date earlier than what we already stored. */
export function latestPeriodEnd(
  existing: string | null | undefined,
  next: string | null | undefined,
): string | null {
  const a = existing ? new Date(existing).getTime() : 0;
  const b = next ? new Date(next).getTime() : 0;
  if (!a && !b) return null;
  return b > a ? next! : (existing ?? null);
}

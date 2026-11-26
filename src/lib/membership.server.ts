/**
 * Single source of truth for "does this row grant access right now?".
 * Mirrors the database function public.has_active_membership so the app,
 * the Discord flows and RLS never disagree.
 */
export type SubscriptionRow = {
  status?: string | null;
  current_period_end?: string | null;
} | null;

export function isEntitled(sub: SubscriptionRow): boolean {
  // Cancelling stops renewal, not access already paid for. Razorpay reports a
  // subscription as `cancelled` immediately even when current_end is still in
  // the future, so both states grant access through the paid-through date.
  if (!sub || !["active", "cancelled"].includes(sub.status ?? "")) return false;
  if (!sub.current_period_end) return false; // no paid-through date = no access
  return new Date(sub.current_period_end).getTime() > Date.now();
}

/** The slice of a Supabase client `hasCourseAccess` touches, so a test can pass a fake. */
export type AccessClient = {
  rpc: (fn: string, args: Record<string, unknown>) => PromiseLike<{ data: unknown }>;
  from: (table: string) => {
    select: (columns: string) => {
      eq: (column: string, value: string) => {
        maybeSingle: () => PromiseLike<{ data: SubscriptionRow }>;
      };
    };
  };
};

/**
 * Can this user open courses and play lesson videos? Admins always can; everyone else
 * needs an entitled subscription. This must use `isEntitled` and not a bare
 * `status === "active"`: a member who cancels autopay (from our Settings page, or from their
 * UPI app, which Razorpay reports as `cancelled` at once) keeps the access they paid for, and
 * RLS on courses/modules/lessons already allows them through `has_active_membership`.
 */
export async function hasCourseAccess(client: AccessClient, userId: string): Promise<boolean> {
  const { data: isAdmin } = await client.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (isAdmin) return true;
  const { data: sub } = await client
    .from("subscriptions")
    .select("status, current_period_end")
    .eq("user_id", userId)
    .maybeSingle();
  return isEntitled(sub);
}

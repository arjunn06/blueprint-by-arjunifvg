import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createSubscription,
  verifySubscriptionPayment,
  reconcileSubscription,
} from "@/lib/billing.functions";
import { validatePromoCode } from "@/lib/promos.functions";
import { getAccountOverview } from "@/lib/account.functions";
import { useEffect, useRef, useState } from "react";
import { openRazorpay } from "@/lib/razorpay-checkout";
import { takePendingPromo } from "@/lib/offer";
import { BLUE_PILL_BASE_PAISE, BLUE_PILL_TOTAL_PAISE, gstOn, formatRupees } from "@/lib/pricing";
import { toast } from "sonner";
import {
  BellRinging,
  Broadcast,
  CircleNotch,
  DiscordLogo,
  NotePencil,
  Star,
  VideoCamera,
  X as XIcon,
} from "@phosphor-icons/react";
import {
  AppCard,
  FlowBody,
  FlowField,
  FlowHeading,
  FlowShell,
  TINT,
} from "@/components/site/flow-kit";
import { btnPrimary } from "@/components/site/ui";
import { getIntent } from "@/lib/intent";

export const Route = createFileRoute("/_authenticated/subscribe")({
  head: () => ({ meta: [{ title: "Subscribe | Blueprint" }] }),
  component: Subscribe,
});

function Subscribe() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const acct = useServerFn(getAccountOverview);
  const create = useServerFn(createSubscription);
  const verify = useServerFn(verifySubscriptionPayment);
  const reconcile = useServerFn(reconcileSubscription);
  const validate = useServerFn(validatePromoCode);
  const { data, refetch } = useQuery({
    queryKey: ["account", "overview"],
    queryFn: () => acct(),
  });

  // Poll reconcile until Razorpay reports active (or we give up). Handles
  // "user paid but the client handler never ran" and webhook races.
  async function pollReconcile(maxMs = 30_000) {
    const started = Date.now();
    let delay = 1500;
    while (Date.now() - started < maxMs) {
      try {
        const r = await reconcile();
        if (r.status === "active") {
          await qc.invalidateQueries({ queryKey: ["account", "overview"] });
          return true;
        }
      } catch {
        /* keep polling */
      }
      await new Promise((r) => setTimeout(r, delay));
      delay = Math.min(delay + 500, 4000);
    }
    await refetch();
    return false;
  }
  // Set once a payment lands so the "already subscribed" redirect doesn't beat the welcome flow.
  const paidRef = useRef(false);
  function goWelcome() {
    paidRef.current = true;
    navigate({ to: "/welcome" });
  }
  const [codeInput, setCodeInput] = useState("");
  const [applied, setApplied] = useState<{
    code: string;
    discount_type: "percent_off_first" | "amount_off_first" | "trial_days";
    discount_value: number;
    description: string | null;
  } | null>(null);

  const apply = useMutation({
    mutationFn: () => validate({ data: { code: codeInput.trim() } }),
    onError: (e: any) => toast.error(e.message ?? "Invalid code"),
    onSuccess: (p) => {
      setApplied({
        code: p.code,
        discount_type: p.discount_type,
        discount_value: p.discount_value,
        description: p.description,
      });
      toast.success(`Code ${p.code} applied`);
    },
  });

  // A code carried over from a campaign page (the Black Friday landing page). Applied once and quietly:
  // if it has expired or been used up, the coupon field is still there and says why when they type it.
  useEffect(() => {
    const pending = takePendingPromo();
    if (!pending) return;
    validate({ data: { code: pending } })
      .then((p) => {
        setApplied({
          code: p.code,
          discount_type: p.discount_type,
          discount_value: p.discount_value,
          description: p.description,
        });
        toast.success(`Code ${p.code} applied`);
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (data?.isSubscribed && !paidRef.current) navigate({ to: "/app" });
  }, [data?.isSubscribed, navigate]);

  // Red Pill registrations are closed — clear any legacy intent so it can't
  // bounce a Blue Pill subscriber to the closed enrollment page.
  useEffect(() => {
    getIntent();
  }, []);

  // On mount, if there's a pending subscription row, sync with Razorpay in
  // case a previous checkout succeeded but never wrote back locally.
  useEffect(() => {
    if (data?.subscription?.razorpay_subscription_id && data.subscription.status !== "active") {
      reconcile()
        .then((r) => {
          if (r.changed) qc.invalidateQueries({ queryKey: ["account", "overview"] });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.subscription?.razorpay_subscription_id]);

  const mut = useMutation({
    mutationFn: () => create({ data: { promo_code: applied?.code ?? null } }),
    onError: (e: any) => toast.error(e.message),
    onSuccess: async ({ subscriptionId, keyId, trialEndsAt }) => {
      if (trialEndsAt) {
        toast.success(
          `Trial started. First charge on ${new Date(trialEndsAt).toLocaleDateString()}`,
        );
        goWelcome();
        return;
      }
      try {
        await openRazorpay({
          key: keyId,
          subscription_id: subscriptionId,
          name: "Blueprint · Blue Pill",
          description: `Monthly membership: ${formatRupees(BLUE_PILL_BASE_PAISE)} + ${formatRupees(gstOn(BLUE_PILL_BASE_PAISE))} GST (18%)`,
          theme: { color: "#3F7BEA" },
          prefill: {
            email: data?.profile?.email ?? undefined,
            name: data?.profile?.full_name ?? undefined,
          },
          handler: async (resp) => {
            try {
              await verify({
                data: {
                  razorpay_payment_id: resp.razorpay_payment_id,
                  razorpay_subscription_id: resp.razorpay_subscription_id!,
                  razorpay_signature: resp.razorpay_signature,
                },
              });
              paidRef.current = true;
              toast.success("You're in.");
              await qc.invalidateQueries({ queryKey: ["account", "overview"] });
              goWelcome();
            } catch (e: any) {
              // Fall back to server-side reconciliation — the webhook or a
              // Razorpay poll will confirm the charge.
              toast.message("Confirming your payment…");
              const ok = await pollReconcile();
              if (ok) {
                toast.success("You're in.");
                goWelcome();
              } else {
                toast.error(e.message ?? "Payment verification failed");
              }
            }
          },
          modal: {
            ondismiss: () => {
              // User closed checkout — if a charge did land, sync it.
              pollReconcile(15_000).then((ok) => {
                if (ok) goWelcome();
              });
            },
          },
        });
      } catch (e: any) {
        toast.error(e.message ?? "Could not open checkout");
      }
    },
  });

  const firstName = data?.profile?.full_name?.trim().split(/\s+/)[0];
  const price = payLabel(applied);

  return (
    <FlowShell signedInEmail={data?.profile?.email ?? ""}>
      <FlowHeading
        title={
          firstName
            ? `${firstName}, an overview of your membership 🚀`
            : "An overview of your membership 🚀"
        }
        subtitle="Here’s what you are getting with your subscription"
      />

      <FlowBody size="sm" className="gap-5">
        <ul className="grid grid-cols-1 gap-5 min-[420px]:grid-cols-2">
          {BENEFITS.map(({ icon: Icon, tint, title, body }) => (
            <li key={title} className="flex">
              <AppCard
                className="w-full"
                tint={tint}
                title={title}
                icon={<Icon className="size-5" weight="regular" />}
              >
                {body}
              </AppCard>
            </li>
          ))}
        </ul>

        {/* Coupon: placeholder field, green hint once the code checks out. */}
        <FlowField
          name="coupon"
          aria-label="Coupon code (optional)"
          placeholder="Coupon code (optional)"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          value={applied ? applied.code : codeInput}
          readOnly={!!applied}
          active={!!applied}
          onChange={(e) => setCodeInput(e.target.value.toUpperCase().replace(/\s/g, ""))}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (!applied && codeInput.trim() && !apply.isPending) apply.mutate();
            }
          }}
          className="pr-24"
          tone={apply.isError && !applied ? "error" : applied ? "success" : "default"}
          hint={
            applied
              ? `${applied.code} is valid. ${discountCopy(applied)}`
              : apply.isError
                ? (apply.error as Error).message || "That code isn’t valid."
                : undefined
          }
          trailing={
            applied ? (
              <button
                type="button"
                onClick={() => {
                  setApplied(null);
                  setCodeInput("");
                  apply.reset();
                }}
                aria-label="Remove code"
                className="grid size-8 place-items-center rounded-full transition-colors hover:bg-hover hover:text-foreground"
              >
                <XIcon className="size-4" weight="bold" />
              </button>
            ) : codeInput.trim() ? (
              <button
                type="button"
                onClick={() => apply.mutate()}
                disabled={apply.isPending}
                className="inline-flex h-8 items-center rounded-full px-3 text-btn text-action transition-opacity hover:opacity-80 disabled:opacity-60"
              >
                {apply.isPending ? (
                  <CircleNotch className="size-4 animate-spin" weight="bold" />
                ) : (
                  "Apply"
                )}
              </button>
            ) : null
          }
        />

        <button
          type="button"
          onClick={() => mut.mutate()}
          disabled={mut.isPending}
          className={`${btnPrimary} w-full`}
        >
          {mut.isPending ? (
            <>
              <CircleNotch className="size-4 animate-spin" weight="bold" />
              Opening checkout
            </>
          ) : (
            price
          )}
        </button>

        <p className="text-center text-hint text-tertiary">
          {formatRupees(BLUE_PILL_BASE_PAISE)} + {formatRupees(gstOn(BLUE_PILL_BASE_PAISE))} GST
          (18%) = {formatRupees(BLUE_PILL_TOTAL_PAISE)} a month, billed through Razorpay. Cancel
          anytime from Settings. By paying you agree to our{" "}
          <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
            Terms of Service
          </Link>
          .
        </p>
      </FlowBody>
    </FlowShell>
  );
}

type AppliedPromo = {
  code: string;
  discount_type: "percent_off_first" | "amount_off_first" | "trial_days";
  discount_value: number;
  description: string | null;
};

const BENEFITS = [
  {
    icon: VideoCamera,
    tint: TINT.sky,
    title: "IFVG Course",
    body: "Arjun’s personal strategy with proven 70% winrate",
  },
  {
    icon: BellRinging,
    tint: TINT.mint,
    title: "Trade alerts",
    body: "Get exclusive trade alerts to learn the strategy easily.",
  },
  {
    icon: NotePencil,
    tint: TINT.sand,
    title: "Trade Journal app",
    body: "Get an exclusive powerful trading journal tool",
  },
  {
    icon: DiscordLogo,
    tint: TINT.lilac,
    title: "Discord",
    body: "Members only discord with an inner circle community",
  },
  {
    icon: Star,
    tint: TINT.mint,
    title: "Weekly Premium content",
    body: "Get weekly premium exclusive learning content",
  },
  {
    icon: Broadcast,
    tint: TINT.mint,
    title: "Exclusive livestreams",
    body: "Access to exclusive livestreams",
  },
] as const;

function discountCopy(p: AppliedPromo) {
  if (p.discount_type === "trial_days") return `You got ${p.discount_value} days free.`;
  if (p.discount_type === "percent_off_first")
    return `You got ${p.discount_value}% off on your first month.`;
  return `You got ₹${p.discount_value} off on your first month.`;
}

/** First charge after the code (list price incl. GST), or null for a free trial. */
function firstChargePaise(p: AppliedPromo): number | null {
  if (p.discount_type === "trial_days") return null;
  if (p.discount_type === "percent_off_first")
    return Math.round((BLUE_PILL_TOTAL_PAISE * (100 - p.discount_value)) / 100);
  return Math.max(0, BLUE_PILL_TOTAL_PAISE - p.discount_value * 100);
}

function payLabel(p: AppliedPromo | null) {
  if (!p) return `Pay ${formatRupees(BLUE_PILL_TOTAL_PAISE)}/month`;
  const first = firstChargePaise(p);
  if (first === null) return `Start ${p.discount_value}-day free trial`;
  return `Pay ${formatRupees(first)} today`;
}

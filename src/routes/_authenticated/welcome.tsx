import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CircleNotch, DiscordLogo, GraduationCap, NotePencil } from "@phosphor-icons/react";
import { toast } from "sonner";
import { z } from "zod";
import { getAccountOverview } from "@/lib/account.functions";
import { getMyClaim, startMemberDiscordConnect } from "@/lib/discord.functions";
import { JOURNAL_URL } from "@/lib/journal";
import { WELCOME_RETURN_KEY } from "@/lib/intent";
import {
  AppCard,
  FlowBody,
  FlowHeading,
  FlowShell,
  Stepper,
  TINT,
} from "@/components/site/flow-kit";
import { btnPrimary, btnSecondary } from "@/components/site/ui";

const searchSchema = z.object({
  step: z.coerce.number().int().min(1).max(3).optional().catch(undefined),
});

export const Route = createFileRoute("/_authenticated/welcome")({
  head: () => ({ meta: [{ title: "Welcome | Blueprint" }] }),
  validateSearch: (s) => searchSchema.parse(s),
  component: Welcome,
});

function Welcome() {
  const navigate = useNavigate();
  const { step: stepParam } = Route.useSearch();
  const acct = useServerFn(getAccountOverview);
  const claim = useServerFn(getMyClaim);
  const startDiscord = useServerFn(startMemberDiscordConnect);
  const [connecting, setConnecting] = useState(false);

  const { data: overview } = useQuery({ queryKey: ["account", "overview"], queryFn: () => acct() });
  const { data: discord, isLoading: claimLoading } = useQuery({
    queryKey: ["discord", "claim"],
    queryFn: () => claim(),
    enabled: !!overview?.isSubscribed,
  });

  // Not a member yet, or a Red Pill member (their onboarding is the Discord screen): leave.
  useEffect(() => {
    if (!overview) return;
    if (!overview.isSubscribed) navigate({ to: "/subscribe", replace: true });
    else if (overview.pill === "red" && !overview.isAdmin) navigate({ to: "/app", replace: true });
  }, [overview, navigate]);

  const ready = !!overview?.isSubscribed && !claimLoading;
  // Land on the first step that still needs doing: skip Discord if it is already linked.
  const step = stepParam ?? (discord?.status === "assigned" ? 2 : 1);

  function go(next: number) {
    navigate({ to: "/welcome", search: { step: next }, replace: true });
  }

  async function connectDiscord() {
    setConnecting(true);
    try {
      localStorage.setItem(WELCOME_RETURN_KEY, "1");
    } catch {
      /* private mode: they just land on /app/discord afterwards */
    }
    try {
      const { url } = await startDiscord({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (e: unknown) {
      try {
        localStorage.removeItem(WELCOME_RETURN_KEY);
      } catch {
        /* ignore */
      }
      toast.error(e instanceof Error ? e.message : "Failed to start Discord connection.");
      setConnecting(false);
    }
  }

  return (
    <FlowShell signedInEmail={overview?.profile?.email ?? ""}>
      <FlowHeading title="🎉 Welcome to the Inner Circle" subtitle="Onboard in just 3 steps" />

      <FlowBody size="full" className="gap-10">
        <Stepper current={step} />

        {!ready ? (
          <div role="status" aria-label="Loading" className="grid h-[113px] place-items-center">
            <CircleNotch className="size-5 animate-spin text-muted-foreground" weight="bold" />
          </div>
        ) : (
          <>
            {step === 1 && (
              <>
                <AppCard
                  tint={TINT.lilac}
                  icon={<DiscordLogo className="size-5" weight="fill" />}
                  title="Connect Discord"
                >
                  Connect your discord account below to get premium role that gives you access to
                  trade alerts, premium community, etc.
                </AppCard>
                <Actions>
                  <button
                    type="button"
                    onClick={connectDiscord}
                    disabled={connecting}
                    className={`${btnPrimary} w-full`}
                  >
                    {connecting ? (
                      <>
                        <CircleNotch className="size-4 animate-spin" weight="bold" />
                        Redirecting
                      </>
                    ) : (
                      "Connect your Discord account"
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => go(2)}
                    className="self-center text-hint font-medium text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Skip for now
                  </button>
                </Actions>
              </>
            )}

            {step === 2 && (
              <>
                <AppCard
                  tint={TINT.lilac}
                  icon={<NotePencil className="size-5" weight="regular" />}
                  title="Setup Trading Journal"
                >
                  Claim your access to the exclusive trading journal app
                </AppCard>
                <Actions>
                  <a
                    href={JOURNAL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => go(3)}
                    className={`${btnPrimary} w-full`}
                  >
                    Access the journal
                  </a>
                  <button type="button" onClick={() => go(3)} className={`${btnSecondary} w-full`}>
                    I’ll do it later
                  </button>
                  {overview?.profile?.email && (
                    <p className="text-center text-hint text-tertiary">
                      Sign up there with {overview.profile.email} and it opens straight away.
                    </p>
                  )}
                </Actions>
              </>
            )}

            {step === 3 && (
              <>
                <AppCard
                  tint={TINT.lilac}
                  icon={<GraduationCap className="size-5" weight="regular" />}
                  title="Access Courses and other apps"
                >
                  Get started with your premium content like courses and other videos
                </AppCard>
                <Actions>
                  <Link to="/app" className={`${btnPrimary} w-full`}>
                    Go to home
                  </Link>
                </Actions>
              </>
            )}
          </>
        )}
      </FlowBody>
    </FlowShell>
  );
}

function Actions({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex w-full max-w-[509px] flex-col gap-5">{children}</div>;
}

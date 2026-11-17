import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyClaim, startMemberDiscordConnect } from "@/lib/discord.functions";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/app/sidebar";
import { MemberHeader, StatusPill } from "@/components/app/ui-kit";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { z } from "zod";
import { WELCOME_RETURN_KEY } from "@/lib/intent";

const searchSchema = z.object({
  discord: z.enum(["connected", "error"]).optional(),
  reason: z.string().optional(),
  username: z.string().optional(),
});

export const Route = createFileRoute("/_authenticated/app/discord")({
  validateSearch: (s) => searchSchema.parse(s),
  component: DiscordClaim,
});

/** True once if this Discord round trip started from the welcome flow. */
function takeWelcomeReturn() {
  try {
    const hit = localStorage.getItem(WELCOME_RETURN_KEY) === "1";
    localStorage.removeItem(WELCOME_RETURN_KEY);
    return hit;
  } catch {
    return false;
  }
}

function DiscordClaim() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const search = useSearch({ from: "/_authenticated/app/discord" });
  const getFn = useServerFn(getMyClaim);
  const startFn = useServerFn(startMemberDiscordConnect);
  const [connecting, setConnecting] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["discord", "claim"],
    queryFn: () => getFn(),
  });

  useEffect(() => {
    if (search.discord === "connected") {
      toast.success(
        search.username
          ? `Connected as @${search.username}. Role granted.`
          : "Discord connected. Role granted.",
      );
      qc.invalidateQueries({ queryKey: ["discord", "claim"] });
      window.history.replaceState({}, "", "/app/discord");
      if (takeWelcomeReturn()) navigate({ to: "/welcome", search: { step: 2 }, replace: true });
    } else if (search.discord === "error") {
      toast.error(search.reason ?? "Could not connect Discord.");
      window.history.replaceState({}, "", "/app/discord");
      if (takeWelcomeReturn()) navigate({ to: "/welcome", search: { step: 1 }, replace: true });
    }
  }, [search.discord, search.reason, search.username, qc, navigate]);

  async function handleConnect() {
    setConnecting(true);
    try {
      const { url } = await startFn({ data: { origin: window.location.origin } });
      window.location.href = url;
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to start Discord connection.");
      setConnecting(false);
    }
  }

  const isConnected = existing?.status === "assigned";

  const PERKS = [
    "Members-only channels",
    "Trade alerts on the setups Arjun takes",
    "Live trading streams and weekly market reviews",
  ];

  return (
    <div>
      <MemberHeader
        title="Discord connection"
        description="Connect your Discord account to join the private server. Your members role is granted automatically."
      />

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <Card className="p-7 md:p-9">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="font-display text-2xl font-medium tracking-[-0.02em]">
              {isConnected ? "You're in" : "Connect your Discord"}
            </h2>
            {existing && <StatusBadge status={existing.status} />}
          </div>
          <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
            {isConnected
              ? "Your Discord account is linked. Reconnect anytime if you leave the server."
              : "We add you to the private server and grant your members role in one step."}
          </p>

          {existing && (
            <p className="mt-5 text-sm text-muted-foreground">
              Discord ID{" "}
              <span className="font-mono text-foreground">{existing.discord_user_id}</span>
            </p>
          )}
          {existing?.error_message && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {existing.error_message}
            </p>
          )}

          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="mt-8 h-12 bg-[#5865F2] px-6 text-btn text-white hover:bg-[#4752C4] hover:opacity-100"
          >
            {connecting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Redirecting
              </>
            ) : isConnected ? (
              "Reconnect Discord"
            ) : (
              "Connect Discord"
            )}
          </Button>
        </Card>

        <Card className="p-7 md:p-9">
          <h2 className="font-display text-xl font-bold tracking-tight">What the role unlocks</h2>
          <ul className="mt-6 space-y-4">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] leading-snug">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-md bg-surface-2">
                  <Check className="size-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "assigned") return <StatusPill tone="success">Role assigned</StatusPill>;
  if (status === "failed") return <StatusPill tone="danger">Failed</StatusPill>;
  return <StatusPill>Pending</StatusPill>;
}

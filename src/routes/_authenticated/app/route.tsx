import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { getAccountOverview } from "@/lib/account.functions";
import { type NavItem } from "@/components/app/sidebar";
import { MemberShell } from "@/components/app/ui-kit";
import { BookOpen, NotebookPen, Settings, Shield, Video } from "lucide-react";
import { DiscordIcon } from "@/components/discord-icon";
import { getIntent } from "@/lib/intent";
import { JOURNAL_PILLS, JOURNAL_URL } from "@/lib/journal";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({ meta: [{ title: "Blueprint" }] }),
  component: AppLayout,
});

function AppLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const fn = useServerFn(getAccountOverview);
  const { data, isLoading } = useQuery({
    queryKey: ["account", "overview"],
    queryFn: () => fn(),
  });

  useEffect(() => {
    if (!isLoading && data && !data.isSubscribed) {
      getIntent();
      navigate({ to: "/subscribe" });
    }
  }, [isLoading, data, navigate]);

  // Red Pill members only get the Discord role screen.
  useEffect(() => {
    if (
      !isLoading &&
      data?.isSubscribed &&
      data.pill === "red" &&
      !data.isAdmin &&
      location.pathname !== "/app/discord"
    ) {
      navigate({ to: "/app/discord" });
    }
  }, [isLoading, data, location.pathname, navigate]);

  const isRedPill = data?.pill === "red";

  // Red Pill members (not admins) only get the Discord screen, matching the redirect above.
  const discordOnly = isRedPill && !data?.isAdmin;
  const showJournal = !!data?.isSubscribed && JOURNAL_PILLS.includes(data.pill);

  const discordItem: NavItem = {
    to: "/app/discord",
    label: "Discord connection",
    shortLabel: "Discord",
    icon: <DiscordIcon className="size-5" />,
  };
  const items: NavItem[] = discordOnly
    ? [discordItem]
    : [
        { to: "/app/courses", label: "Courses", icon: <BookOpen className="size-5" /> },
        { to: "/app/videos", label: "Videos", icon: <Video className="size-5" /> },
        ...(showJournal
          ? [
              {
                to: "/app/journal",
                href: JOURNAL_URL,
                label: "Trade Journal",
                icon: <NotebookPen className="size-5" />,
              },
            ]
          : []),
        discordItem,
        { to: "/app/settings", label: "Settings", icon: <Settings className="size-5" /> },
      ];
  if (data?.isAdmin) {
    items.push({ to: "/admin", label: "Admin", icon: <Shield className="size-5" /> });
  }

  const user = {
    name: data?.profile?.full_name ?? null,
    handle: data?.profile?.handle ?? null,
    email: data?.profile?.email ?? null,
    avatarUrl: data?.profile?.avatar_url ?? null,
  };

  return (
    <MemberShell items={items} user={user} isAdmin={data?.isAdmin}>
      <Outlet />
    </MemberShell>
  );
}

import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { LogoIcon } from "@/components/logo-icon";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserAvatar, type NavItem, type SidebarUser } from "@/components/app/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, LogOut, Settings, Shield } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Member shell (Figma "User Console"): a floating rounded sidebar on    */
/* desktop, a slim header plus bottom tab bar on phones.                 */
/* ------------------------------------------------------------------ */

function isActive(pathname: string, to: string) {
  return to === "/app" ? pathname === "/app" : pathname === to || pathname.startsWith(to + "/");
}

const navItemClass =
  "flex h-11 items-center gap-3 rounded-xl px-4 text-btn transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

export function MemberShell({
  items,
  user,
  isAdmin,
  children,
}: {
  items: NavItem[];
  user: SidebarUser;
  isAdmin?: boolean;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const tabs = items.filter((i) => i.to !== "/admin");
  // Settings lives behind the gear in the sidebar footer on desktop.
  const sideItems = items.filter((i) => i.to !== "/app/settings");

  async function signOut() {
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const accountMenu = (trigger: ReactNode, align: "start" | "end") => (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Account menu"
        className="rounded-xl text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {trigger}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align} className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name ?? "Member"}</p>
          {user.email && <p className="truncate text-xs text-muted-foreground">{user.email}</p>}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/app/settings" className="cursor-pointer">
            <Settings className="mr-2 size-4" /> Settings
          </Link>
        </DropdownMenuItem>
        {isAdmin && (
          <DropdownMenuItem asChild>
            <Link to="/admin" className="cursor-pointer">
              <Shield className="mr-2 size-4" /> Admin
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="cursor-pointer">
          <LogOut className="mr-2 size-4" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="min-h-[100dvh] bg-background text-foreground">
      {/* Desktop: floating sidebar */}
      <aside className="fixed bottom-4 left-4 top-4 z-30 hidden w-[256px] flex-col justify-between overflow-hidden rounded-shell border border-border bg-sidebar p-4 shadow-shell md:flex">
        <div className="flex min-h-0 flex-col gap-5">
          <div className="flex items-center justify-between">
            <Link
              to="/"
              aria-label="Blueprint home"
              className="grid size-10 place-items-center rounded-[14px] bg-hover transition-colors hover:bg-border/60"
            >
              <LogoIcon className="size-full" />
            </Link>
            <ThemeToggle />
          </div>
          <nav aria-label="Member" className="flex flex-col gap-2 overflow-y-auto no-scrollbar">
            {sideItems.map((item) => {
              const active = !item.href && isActive(pathname, item.to);
              const cls = cn(
                navItemClass,
                active ? "bg-blue-10 text-active" : "text-foreground hover:bg-hover",
              );
              return item.href ? (
                <a
                  key={item.label}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cls}
                >
                  <span className="grid size-5 shrink-0 place-items-center">{item.icon}</span>
                  <span className="flex-1 truncate">{item.label}</span>
                  <ArrowUpRight className="size-3.5 text-tertiary" aria-hidden />
                </a>
              ) : (
                <Link
                  key={item.to}
                  to={item.to as any}
                  aria-current={active ? "page" : undefined}
                  className={cls}
                >
                  <span className="grid size-5 shrink-0 place-items-center">{item.icon}</span>
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center justify-between gap-2">
          {accountMenu(
            <span className="flex min-w-0 items-center gap-2">
              <UserAvatar user={user} size={40} />
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="truncate text-btn">{user.name ?? "Member"}</span>
                {(user.handle || user.email) && (
                  <span className="truncate text-hint leading-4 text-muted-foreground">
                    {user.handle ? `@${user.handle}` : user.email}
                  </span>
                )}
              </span>
            </span>,
            "start",
          )}
          <Link
            to="/app/settings"
            aria-label="Settings"
            className="grid size-9 shrink-0 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-hover hover:text-foreground"
          >
            <Settings className="size-5" />
          </Link>
        </div>
      </aside>

      {/* Phones: slim header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-border bg-background/85 px-5 backdrop-blur-xl sm:px-8 md:hidden">
        <Link
          to="/"
          aria-label="Blueprint home"
          className="grid size-10 place-items-center rounded-[14px] bg-hover"
        >
          <LogoIcon className="size-full" />
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {accountMenu(<UserAvatar user={user} size={36} />, "end")}
        </div>
      </header>

      <main className="px-5 pb-28 pt-8 sm:px-8 md:pb-16 md:pl-[304px] md:pr-10 md:pt-14">
        <div className="mx-auto max-w-[1180px]">{children}</div>
      </main>

      {tabs.length > 1 && (
        <nav
          aria-label="Member"
          className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
        >
          <ul
            className="grid"
            style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}
          >
            {tabs.map((item) => {
              const active = !item.href && isActive(pathname, item.to);
              const cls = cn(
                "flex h-16 flex-col items-center justify-center gap-1 text-[11px] tracking-[-0.01em] transition-colors",
                active ? "text-active" : "text-muted-foreground",
              );
              return (
                <li key={item.label}>
                  {item.href ? (
                    <a href={item.href} target="_blank" rel="noopener noreferrer" className={cls}>
                      <span className="grid size-5 place-items-center">{item.icon}</span>
                      {item.label}
                    </a>
                  ) : (
                    <Link
                      to={item.to as any}
                      aria-current={active ? "page" : undefined}
                      className={cls}
                    >
                      <span className="grid size-5 place-items-center">{item.icon}</span>
                      {item.label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Small building blocks shared by member and admin pages.              */
/* ------------------------------------------------------------------ */

export function ProgressBar({
  value,
  className,
  tone = "blue",
}: {
  value: number;
  className?: string;
  tone?: "blue" | "red" | "neutral";
}) {
  const fill = tone === "blue" ? "bg-active" : tone === "red" ? "bg-pill-red" : "bg-foreground";
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value)}
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-surface-2", className)}
    >
      <div
        className={cn("h-full rounded-full transition-[width] duration-700", fill)}
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

const PILL_TONES = {
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
  danger: "border-destructive/30 bg-destructive/10 text-destructive",
  neutral: "border-border bg-surface-2 text-muted-foreground",
  blue: "border-active/20 bg-blue-10 text-active",
  red: "border-pill-red/30 bg-pill-red/10 text-pill-red",
} as const;

export function StatusPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: keyof typeof PILL_TONES;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium",
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Flat figures separated by hairlines, one container instead of a row of cards. */
export function StatStrip({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <dl
      className={cn(
        "grid divide-y divide-border overflow-hidden rounded-field border border-border bg-surface shadow-card sm:divide-x sm:divide-y-0",
        className,
      )}
    >
      {children}
    </dl>
  );
}

export function Stat({
  label,
  value,
  sub,
  className,
}: {
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("p-6", className)}>
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-2 font-display text-3xl font-medium tracking-[-0.02em] tabular-nums">
        {value}
      </dd>
      {sub && <p className="mt-1.5 truncate text-sm text-muted-foreground">{sub}</p>}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center rounded-field border border-dashed border-border px-6 py-16 text-center",
        className,
      )}
    >
      {icon && (
        <span className="mb-5 grid size-12 place-items-center rounded-field bg-hover text-muted-foreground">
          {icon}
        </span>
      )}
      <p className="font-display text-xl font-medium tracking-[-0.02em]">{title}</p>
      {body && (
        <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">{body}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function SkeletonBlock({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-surface-2", className)} />;
}

export function MemberHeader({ title, description }: { title: string; description?: string }) {
  return (
    <header className="mb-12">
      <h1 className="font-display text-4xl font-medium leading-[1.1] tracking-[-0.02em] md:text-header">
        {title}
      </h1>
      {description && (
        <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
          {description}
        </p>
      )}
    </header>
  );
}

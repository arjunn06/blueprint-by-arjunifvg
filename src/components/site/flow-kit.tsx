import { Link } from "@tanstack/react-router";
import {
  forwardRef,
  useId,
  type FormHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { SignOut } from "@phosphor-icons/react";
import { LogoIcon } from "@/components/logo-icon";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { SiteShell } from "./shell";

/**
 * Blue Pill flow kit: the sign-in, profile, membership and welcome screens from the Figma
 * "Arjun IFVG" page. White canvas, a centred column on the left, one photograph on the right.
 */

/** Same photograph on every step (Figma "Frame 7"). */
const PHOTO = "/img/flow-photo.jpg";

export function FlowShell({
  children,
  signedInEmail,
}: {
  children: ReactNode;
  /** When set (signed-in steps), shows the account email and a sign-out link top right. */
  signedInEmail?: string | null;
}) {
  return (
    <SiteShell theme="light">
      <main id="main" className="grid min-h-[100dvh] lg:grid-cols-2">
        <div className="flex min-w-0 flex-col">
          <header className="flex items-center justify-between px-5 pt-5 sm:px-8 lg:px-12 lg:pt-12">
            <Link
              to="/"
              aria-label="Blueprint home"
              className="grid size-14 place-items-center rounded-field bg-hover transition-colors hover:bg-border/60 sm:size-20"
            >
              <LogoIcon className="size-full text-foreground" />
            </Link>
            {signedInEmail !== undefined && (
              <div className="flex items-center gap-4">
                {signedInEmail && (
                  <span className="hidden max-w-[220px] truncate text-hint text-muted-foreground sm:inline">
                    {signedInEmail}
                  </span>
                )}
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = "/";
                  }}
                  className="inline-flex items-center gap-1.5 text-hint font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <SignOut className="size-4" weight="bold" />
                  Sign out
                </button>
              </div>
            )}
          </header>
          <div className="flex flex-1 items-center justify-center px-5 pb-14 pt-8 sm:px-8 lg:px-12">
            <div className="w-full max-w-[755px]">{children}</div>
          </div>
        </div>

        <aside
          aria-hidden
          className="hidden lg:sticky lg:top-0 lg:block lg:h-[100dvh] lg:py-[11.85dvh] lg:pl-[3vw] lg:pr-[4.4vw]"
        >
          <img
            src={PHOTO}
            alt=""
            width={640}
            height={959}
            fetchPriority="high"
            className="size-full rounded-photo object-cover"
          />
        </aside>
      </main>
    </SiteShell>
  );
}

export function FlowHeading({ title, subtitle }: { title: ReactNode; subtitle?: ReactNode }) {
  return (
    <div className="text-center">
      <h1 className="text-balance text-[2rem] font-medium leading-[1.2] tracking-[-0.02em] text-foreground md:text-header">
        {title}
      </h1>
      {subtitle && (
        <p className="mx-auto mt-5 max-w-[60ch] text-balance text-base leading-snug tracking-[-0.02em] text-muted-foreground sm:text-lead">
          {subtitle}
        </p>
      )}
    </div>
  );
}

const BODY_WIDTH = { sm: "max-w-[509px]", md: "max-w-[569px]", full: "max-w-[755px]" } as const;

/** The form column under the heading: 40px gap, 569 / 509 / 755 wide like the frames. */
export function FlowBody({
  size = "md",
  as: Tag = "div",
  className,
  children,
  ...props
}: {
  size?: keyof typeof BODY_WIDTH;
  as?: "div" | "form";
  className?: string;
  children: ReactNode;
} & Omit<FormHTMLAttributes<HTMLElement>, "className" | "children">) {
  return (
    <Tag
      className={cn("mx-auto mt-10 flex w-full flex-col", BODY_WIDTH[size], className)}
      {...props}
    >
      {children}
    </Tag>
  );
}

type FieldTone = "default" | "error" | "success";

const HINT_TONE: Record<FieldTone, string> = {
  default: "text-tertiary",
  error: "text-destructive",
  success: "text-success",
};

/** Figma "Input field": 60px, 20px radius, placeholder only, 13px hint underneath. */
export const FlowField = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, "size"> & {
    hint?: ReactNode;
    tone?: FieldTone;
    /** Blue border, as when the field holds the value being confirmed. */
    active?: boolean;
    trailing?: ReactNode;
    wrapperClassName?: string;
  }
>(({ hint, tone = "default", active, trailing, wrapperClassName, className, ...props }, ref) => {
  const hintId = useId();
  return (
    <div className={cn("w-full", wrapperClassName)}>
      <div className="relative">
        <Input
          ref={ref}
          aria-invalid={tone === "error" || undefined}
          aria-describedby={hint ? hintId : undefined}
          className={cn(
            "h-[60px] rounded-field px-5 text-body",
            active && "border-active",
            trailing && "pr-12",
            className,
          )}
          {...props}
        />
        {trailing && (
          <span className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground">
            {trailing}
          </span>
        )}
      </div>
      {hint && (
        <p
          id={hintId}
          role={tone === "error" ? "alert" : undefined}
          className={cn("mt-1.5 text-hint", HINT_TONE[tone])}
        >
          {hint}
        </p>
      )}
    </div>
  );
});
FlowField.displayName = "FlowField";

/** Six 50×60 boxes, 12px apart. One real input underneath, so paste and autofill just work. */
export function FlowOtp({
  value,
  onChange,
  onComplete,
  invalid,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <InputOTP
      maxLength={6}
      value={value}
      onChange={onChange}
      onComplete={onComplete}
      inputMode="numeric"
      autoComplete="one-time-code"
      pattern="^[0-9]*$"
      autoFocus
      disabled={disabled}
      aria-label="6-digit verification code"
      aria-invalid={invalid || undefined}
      containerClassName="justify-center"
    >
      <InputOTPGroup>
        {Array.from({ length: 6 }, (_, i) => (
          <InputOTPSlot key={i} index={i} className={cn(invalid && "border-destructive")} />
        ))}
      </InputOTPGroup>
    </InputOTP>
  );
}

/** Pastel tiles behind the icons on the Figma app cards. */
export const TINT = {
  sky: "#c4e7ff",
  mint: "#c9ffc4",
  sand: "#ffefc4",
  lilac: "#c4c4ff",
} as const;

/** Figma "App card": 20px radius, hairline border, 28px tinted icon tile, title + description. */
export function AppCard({
  icon,
  tint,
  title,
  children,
  className,
}: {
  icon: ReactNode;
  tint: (typeof TINT)[keyof typeof TINT];
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 overflow-hidden rounded-field border border-border bg-surface p-4 shadow-card",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-7 shrink-0 place-items-center rounded-lg text-[#262626]"
        style={{ background: tint }}
      >
        {icon}
      </span>
      <div className="flex flex-col gap-1">
        <p className="text-btn text-foreground">{title}</p>
        <p className="text-hint text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

/** Three-dot progress from the welcome frames. Dots up to the current step are filled. */
export function Stepper({ steps = 3, current }: { steps?: number; current: number }) {
  return (
    <ol aria-label={`Step ${current} of ${steps}`} className="flex items-center justify-center">
      {Array.from({ length: steps }, (_, i) => {
        const n = i + 1;
        return (
          <li
            key={n}
            className="flex items-center"
            aria-current={n === current ? "step" : undefined}
          >
            {n > 1 && (
              <span
                aria-hidden
                className={cn("h-0.5 w-[67px]", n <= current ? "bg-foreground" : "bg-stepper-idle")}
              />
            )}
            <span
              aria-hidden
              className={cn(
                "size-5 rounded-full",
                n <= current ? "bg-foreground" : "bg-stepper-idle",
              )}
            />
          </li>
        );
      })}
    </ol>
  );
}

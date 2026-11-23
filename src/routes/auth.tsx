import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { FlowBody, FlowField, FlowHeading, FlowOtp, FlowShell } from "@/components/site/flow-kit";
import { btnPrimary, btnSecondary } from "@/components/site/ui";
import { GoogleIcon } from "@/components/google-icon";
import { toast } from "sonner";
import { z } from "zod";
import { CircleNotch } from "@phosphor-icons/react";
import { getRedPillInviteToken, postAuthTarget } from "@/lib/intent";
import { isEmbeddedBrowser } from "@/lib/in-app-browser";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in | Blueprint" },
      { name: "description", content: "Sign in to your Blueprint membership." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);

/** Supabase rate-limits OTP emails, so the resend link counts down instead of failing. */
const RESEND_SECONDS = 30;

async function routeAfterLogin(navigate: ReturnType<typeof useNavigate>, userId: string) {
  const { data } = await supabase.from("profiles").select("handle").eq("id", userId).maybeSingle();
  if (!data?.handle) navigate({ to: "/onboarding", replace: true });
  else navigate({ to: postAuthTarget(), replace: true });
}

function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [redInvite, setRedInvite] = useState(false);
  // Off until the browser is known: Google refuses to sign anyone in from Instagram's or Facebook's in-app browser.
  const [showGoogle, setShowGoogle] = useState(false);
  const [googling, setGoogling] = useState(false);

  useEffect(() => {
    setRedInvite(!!getRedPillInviteToken());
    setShowGoogle(!isEmbeddedBrowser(navigator.userAgent));
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) routeAfterLogin(navigate, data.session.user.id);
    });
  }, [navigate]);

  // Coming back from Google with the back button restores this page mid-redirect, with the button still spinning.
  useEffect(() => {
    const reset = (e: PageTransitionEvent) => {
      if (e.persisted) setGoogling(false);
    };
    window.addEventListener("pageshow", reset);
    return () => window.removeEventListener("pageshow", reset);
  }, []);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function sendCode(targetEmail: string) {
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: { shouldCreateUser: true },
    });
    if (error) throw error;
    setCooldown(RESEND_SECONDS);
  }

  async function handleGoogle() {
    if (googling) return;
    setGoogling(true);
    // Success leaves the page for Google, then Supabase, then /auth/callback; only a failure comes back here.
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        // The email on the Google account is the member's identity here (subscriptions match on it), so always ask which one.
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      toast.error(error.message || "Could not start Google sign-in");
      setGoogling(false);
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.errors[0].message);
      return;
    }
    setError(null);
    setSending(true);
    try {
      await sendCode(parsed.data);
      setEmail(parsed.data);
      setCode("");
      setStep("code");
      toast.success("We sent a 6-digit code to your email.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send code");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (verifying) return;
    if (!/^\d{6}$/.test(code)) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(null);
    setVerifying(true);
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: code,
        type: "email",
      });
      if (error) throw error;
      if (!data.session) throw new Error("No session created");
      await routeAfterLogin(navigate, data.session.user.id);
    } catch (err) {
      setCode("");
      setError(err instanceof Error ? err.message : "Invalid or expired code");
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (cooldown > 0 || resending) return;
    setResending(true);
    try {
      await sendCode(email);
      setCode("");
      setError(null);
      toast.success("New code sent.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setResending(false);
    }
  }

  return (
    <FlowShell>
      <FlowHeading
        title={
          redInvite ? "Your Red Pill invite is here, Neo. 💊" : "The Blue Pill is here, Neo. 👁️"
        }
        subtitle={
          redInvite
            ? "Sign in to claim your seat in the live mentorship"
            : "Learn Arjun IFVG’s personal trading strategy with powerful trading tools"
        }
      />

      {step === "email" ? (
        <FlowBody as="form" onSubmit={handleEmailSubmit} noValidate className="gap-5">
          <FlowField
            id="email"
            type="email"
            name="email"
            autoComplete="email"
            inputMode="email"
            autoFocus
            required
            aria-label="Email address"
            placeholder="Email address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (error) setError(null);
            }}
            tone={error ? "error" : "default"}
            hint={error ?? undefined}
          />
          <button type="submit" disabled={sending} className={`${btnPrimary} w-full`}>
            {sending ? (
              <>
                <CircleNotch className="size-4 animate-spin" weight="bold" />
                Sending code
              </>
            ) : (
              "Continue"
            )}
          </button>
          {showGoogle && (
            <>
              <div className="flex items-center gap-4 text-hint text-tertiary" aria-hidden="true">
                <span className="h-px flex-1 bg-border" />
                or
                <span className="h-px flex-1 bg-border" />
              </div>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={googling || sending}
                className={`${btnSecondary} w-full`}
              >
                {googling ? (
                  <CircleNotch className="mr-1.5 size-5 animate-spin" weight="bold" />
                ) : (
                  <GoogleIcon className="mr-1.5 size-5" />
                )}
                Continue with Google
              </button>
            </>
          )}
          <p className="text-center text-hint text-tertiary">
            {showGoogle
              ? "No password. We email you a one-time code, or you can continue with Google. Signing in creates your account, so use the email you subscribed with."
              : "No password. We email you a one-time code, and signing in creates your account."}{" "}
            By continuing you agree to our{" "}
            <Link to="/terms" className="underline underline-offset-2 hover:text-foreground">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </Link>
            .
          </p>
        </FlowBody>
      ) : (
        <FlowBody as="form" onSubmit={handleVerify} noValidate className="items-center gap-5">
          <FlowField
            type="email"
            name="email"
            aria-label="Email address"
            value={email}
            readOnly
            active
            wrapperClassName="w-full"
          />
          <FlowOtp
            value={code}
            onChange={(v) => {
              setCode(v);
              if (error) setError(null);
            }}
            invalid={!!error}
            disabled={verifying}
          />
          {error && (
            <p role="alert" className="-mt-2 text-center text-hint text-destructive">
              {error}
            </p>
          )}
          <button
            type="button"
            onClick={handleResend}
            disabled={cooldown > 0 || resending}
            className="text-body font-medium text-action transition-opacity hover:opacity-80 disabled:text-tertiary disabled:hover:opacity-100"
          >
            {resending ? "Resending" : cooldown > 0 ? `Resend OTP in ${cooldown}s` : "Resend OTP"}
          </button>
          <button
            type="submit"
            disabled={verifying || code.length !== 6}
            className={`${btnPrimary} w-full`}
          >
            {verifying ? (
              <>
                <CircleNotch className="size-4 animate-spin" weight="bold" />
                Verifying
              </>
            ) : (
              "Continue"
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setCode("");
              setError(null);
              setCooldown(0);
              setStep("email");
            }}
            className="text-hint font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Use a different email
          </button>
        </FlowBody>
      )}
    </FlowShell>
  );
}

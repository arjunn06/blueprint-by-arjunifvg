import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { postAuthTarget } from "@/lib/intent";
import { toast } from "sonner";

export const Route = createFileRoute("/auth_/callback")({
  component: AuthCallback,
});

/**
 * Supabase reports a failed sign-in (Google refused or was cancelled, an expired invite link) as `error` and
 * `error_description` in the URL hash, or in the query string with PKCE. Returns the text to show, or null.
 */
function signInErrorFromUrl(): string | null {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
  const query = new URLSearchParams(window.location.search);
  const error = hash.get("error") ?? query.get("error");
  if (!error) return null;
  return (
    hash.get("error_description") ?? query.get("error_description") ?? "Could not sign you in."
  );
}

function AuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const failure = signInErrorFromUrl();
    if (failure) {
      toast.error(failure);
      navigate({ to: "/auth", replace: true });
      return;
    }

    let cancelled = false;
    async function go(userId: string) {
      const { data } = await supabase
        .from("profiles")
        .select("handle")
        .eq("id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (!data?.handle) navigate({ to: "/onboarding", replace: true });
      else navigate({ to: postAuthTarget(), replace: true });
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) {
        go(data.session.user.id);
      } else {
        const sub = supabase.auth.onAuthStateChange((_e, session) => {
          if (session) {
            sub.data.subscription.unsubscribe();
            go(session.user.id);
          }
        });
        setTimeout(() => {
          if (!cancelled) navigate({ to: "/auth", replace: true });
        }, 5000);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Signing you in…
      </div>
    </div>
  );
}

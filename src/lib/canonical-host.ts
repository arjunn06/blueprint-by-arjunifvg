// Where the site lives. Razorpay's live checkout only accepts payments from this domain, so a visit on the Worker's own
// *.workers.dev address cannot pay: the checkout is rejected for the domain mismatch. Everything here keeps people off it.
export const CANONICAL_HOST = "blueprint.ifvg.in";
export const CANONICAL_ORIGIN = `https://${CANONICAL_HOST}`;

// The production Worker's name (vite.config.ts), which is also the first label of its *.workers.dev hostname:
// `crystal-ball-portal.<account>.workers.dev`. Preview builds put a prefix in front of the Worker name
// (`feat-x-crystal-ball-portal.<account>.workers.dev`), so they never match and keep working.
const PRODUCTION_WORKER = "crystal-ball-portal";

/** True for the production Worker's own `*.workers.dev` address, and for nothing else. */
export function isProductionWorkersDevHost(hostname: string): boolean {
  const labels = hostname.toLowerCase().split(".");
  // name.account.workers.dev: four labels at least, since the account's own label is always there.
  return (
    labels.length >= 4 &&
    labels[0] === PRODUCTION_WORKER &&
    labels.slice(-2).join(".") === "workers.dev"
  );
}

/**
 * Where to send a request that arrived on the production Worker's workers.dev address, or null to serve it.
 * Only page loads move: webhooks and the hook endpoints (`/api/`, `/lovable/`) and anything that is not a GET or HEAD are
 * left alone, because a redirect would drop their body or the sender would not follow it. The browser keeps the URL's
 * `#fragment` across the redirect, which is where Supabase puts a session after an email link.
 */
export function canonicalRedirectUrl(url: URL, method: string): string | null {
  if (method !== "GET" && method !== "HEAD") return null;
  if (!isProductionWorkersDevHost(url.hostname)) return null;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/lovable/")) return null;
  return `${CANONICAL_ORIGIN}${url.pathname}${url.search}`;
}

/**
 * The `redirect_to` for an auth email link. Supabase fills it with the project's Site URL when the app did not pass an
 * allowed one, and that setting was left on the workers.dev address, so a link in an email would land the member there.
 * Swap that address for the sign-in callback on the real domain; leave any other value as it came.
 */
export function pinAuthRedirect(redirectTo: string | null | undefined): string {
  if (!redirectTo) return "";
  try {
    if (isProductionWorkersDevHost(new URL(redirectTo).hostname))
      return `${CANONICAL_ORIGIN}/auth/callback`;
  } catch {
    // Not a URL: pass it through and let Supabase decide.
  }
  return redirectTo;
}

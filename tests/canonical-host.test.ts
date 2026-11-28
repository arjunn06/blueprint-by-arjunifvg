// Run: node --test tests/canonical-host.test.ts   (Node 22.18+)
// Keeps members off the Worker's workers.dev address, where Razorpay's live checkout rejects the payment.
import test from "node:test";
import assert from "node:assert/strict";
import {
  canonicalRedirectUrl,
  isProductionWorkersDevHost,
  pinAuthRedirect,
} from "../src/lib/canonical-host.ts";

const PROD_WORKERS_DEV = "crystal-ball-portal.arjun-b6d.workers.dev";

test("only the production Worker's own workers.dev address counts", () => {
  assert.equal(isProductionWorkersDevHost(PROD_WORKERS_DEV), true);
  assert.equal(isProductionWorkersDevHost("Crystal-Ball-Portal.arjun-b6d.workers.dev"), true);
  // Previews and version URLs put a prefix before the Worker name, so they keep working.
  assert.equal(
    isProductionWorkersDevHost("feat-legal-pages-crystal-ball-portal.arjun-b6d.workers.dev"),
    false,
  );
  assert.equal(
    isProductionWorkersDevHost("4d6ee137-crystal-ball-portal.arjun-b6d.workers.dev"),
    false,
  );
  assert.equal(isProductionWorkersDevHost("blueprint-by-arjunifvg.arjun-b6d.workers.dev"), false);
  // The real domain, local dev and lookalikes.
  assert.equal(isProductionWorkersDevHost("blueprint.ifvg.in"), false);
  assert.equal(isProductionWorkersDevHost("localhost"), false);
  assert.equal(isProductionWorkersDevHost("crystal-ball-portal.workers.dev"), false);
  assert.equal(
    isProductionWorkersDevHost("crystal-ball-portal.arjun-b6d.workers.dev.evil.example"),
    false,
  );
});

test("a page load on workers.dev goes to the same path and query on the real domain", () => {
  const url = new URL(`https://${PROD_WORKERS_DEV}/subscribe?promo=FRIDAY&x=1`);
  assert.equal(
    canonicalRedirectUrl(url, "GET"),
    "https://blueprint.ifvg.in/subscribe?promo=FRIDAY&x=1",
  );
  assert.equal(
    canonicalRedirectUrl(url, "HEAD"),
    "https://blueprint.ifvg.in/subscribe?promo=FRIDAY&x=1",
  );
  assert.equal(
    canonicalRedirectUrl(new URL(`https://${PROD_WORKERS_DEV}`), "GET"),
    "https://blueprint.ifvg.in/",
  );
});

test("webhooks, hooks and non-GET requests are served in place", () => {
  const at = (path: string) => new URL(`https://${PROD_WORKERS_DEV}${path}`);
  assert.equal(canonicalRedirectUrl(at("/api/public/webhooks/razorpay"), "POST"), null);
  assert.equal(canonicalRedirectUrl(at("/api/public/env-check"), "GET"), null);
  assert.equal(canonicalRedirectUrl(at("/lovable/email/auth/webhook"), "POST"), null);
  assert.equal(canonicalRedirectUrl(at("/lovable/email/suppression"), "GET"), null);
  assert.equal(canonicalRedirectUrl(at("/subscribe"), "POST"), null);
});

test("the real domain, local dev and previews are never redirected", () => {
  for (const host of [
    "blueprint.ifvg.in",
    "localhost:8080",
    "feat-legal-pages-crystal-ball-portal.arjun-b6d.workers.dev",
  ]) {
    assert.equal(canonicalRedirectUrl(new URL(`https://${host}/bluepill`), "GET"), null, host);
  }
});

test("an auth email link that would land on workers.dev lands on the sign-in callback instead", () => {
  const callback = "https://blueprint.ifvg.in/auth/callback";
  // Supabase's Site URL fallback, with and without a path or trailing slash.
  assert.equal(pinAuthRedirect(`https://${PROD_WORKERS_DEV}`), callback);
  assert.equal(pinAuthRedirect(`https://${PROD_WORKERS_DEV}/`), callback);
  assert.equal(pinAuthRedirect(`https://${PROD_WORKERS_DEV}/auth/callback`), callback);
});

test("other auth redirects pass through untouched", () => {
  assert.equal(
    pinAuthRedirect("https://blueprint.ifvg.in/auth/callback"),
    "https://blueprint.ifvg.in/auth/callback",
  );
  assert.equal(
    pinAuthRedirect("http://localhost:8080/auth/callback"),
    "http://localhost:8080/auth/callback",
  );
  assert.equal(
    pinAuthRedirect("https://feat-x-crystal-ball-portal.arjun-b6d.workers.dev/auth/callback"),
    "https://feat-x-crystal-ball-portal.arjun-b6d.workers.dev/auth/callback",
  );
  assert.equal(pinAuthRedirect("not a url"), "not a url");
  assert.equal(pinAuthRedirect(""), "");
  assert.equal(pinAuthRedirect(undefined), "");
});

# Notes for coding agents

- Package manager is npm (`package-lock.json`). Dev server runs on port 8080.
- Public Supabase values live in the tracked `.env`. Never put a server secret there: use `.env.local` (git-ignored).
- Server code lives in `*.functions.ts` / `*.server.ts` and `src/routes/api`. Anything under `src/integrations/supabase/client.server.ts`
  uses the service-role key and must never be imported from client code.
- The `/lovable/email/...` route paths are historical. The Supabase Send Email hook, the Resend webhook and the email-queue
  cron job call them, so rename them only together with those settings (see `docs/hosting.md`).
- Design tokens are in `src/styles.css`; shared flow pieces are in `src/components/site/flow-kit.tsx`.
- Checkout has two paths: Razorpay's own modal (`razorpay-checkout.ts`, the default) and our in-page card/UPI form
  (`pay-sheet.tsx` + `razorpay-custom.ts`, behind `VITE_CUSTOM_CHECKOUT=1`, see `docs/hosting.md`). checkout.js and
  razorpay.js both assign `window.Razorpay`; each loader keeps its own constructor, so never read `window.Razorpay`
  after load.
- Tests are plain `node --test tests/<file>.ts` (no Vitest). `cn()` (tailwind-merge) does not know our custom font
  sizes, so `text-hint` is dropped when a text colour class follows it.

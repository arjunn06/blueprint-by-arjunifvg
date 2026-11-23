# Hosting: Cloudflare Workers

The site is a TanStack Start app. `npm run build` produces a Cloudflare Worker (Nitro `cloudflare-module`, configured in
`vite.config.ts`). The Worker is named `crystal-ball-portal`: it is the existing Worker that serves the site, and the name in `vite.config.ts` must match it or `wrangler deploy` creates a second Worker instead of updating this one. Supabase (database, auth, storage, the hourly and email-queue
cron jobs) is separate and does not move with the host.

```text
npm run build        -> .output/ (server bundle, public assets, generated wrangler.json)
npx wrangler deploy  -> uploads it (a pointer in .wrangler/deploy/config.json finds the generated config)
```

## Deploying

**Cloudflare Git integration (recommended).** Cloudflare dashboard > Workers & Pages > Create > Import a repository >
this GitHub repo. Build command `npm run build`, deploy command `npx wrangler deploy`. Every push to `main` deploys.

**By hand.** `npm run build && npx wrangler deploy` (log in once with `npx wrangler login`).

## Variables

**Build-time (public, baked into the bundle).** `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`,
`VITE_SUPABASE_PROJECT_ID` are read from the committed `.env`. They are public by design. If `.env` is ever untracked,
set them as build variables in Cloudflare instead, or the build will not have them.

**Runtime secrets.** Dashboard > the Worker > Settings > Variables and Secrets, or `npx wrangler secret put NAME`.

| Name                                                              | What it is                                                     | Where it comes from                        |
| ----------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------ |
| `SUPABASE_SERVICE_ROLE_KEY`                                       | Server admin access. Also the bearer token the cron jobs send. | Supabase > Project Settings > API          |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`                        | Server-side fallbacks for the public values                    | Supabase > Project Settings > API          |
| `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`                          | Charging and reconciling                                       | Razorpay dashboard > API keys              |
| `RAZORPAY_WEBHOOK_SECRET`                                         | Verifies Razorpay webhooks                                     | The secret you set on the Razorpay webhook |
| `RAZORPAY_PLAN_ID`                                                | The Blue Pill monthly plan                                     | Razorpay dashboard > Plans                 |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_BOT_TOKEN` | Role claiming                                                  | Discord developer portal                   |
| `RESEND_API_KEY`                                                  | Sending email                                                  | Resend > API keys                          |
| `RESEND_WEBHOOK_SECRET`                                           | Verifies bounce/complaint webhooks                             | The secret on the Resend webhook           |
| `SEND_EMAIL_HOOK_SECRET`                                          | Verifies Supabase's Send Email hook                            | Supabase > Auth > Hooks                    |
| `JOURNAL_WEBHOOK_URL`, `JOURNAL_WEBHOOK_SECRET`                   | Grants/revokes journal access (see the README)                 | The journal's Supabase project             |

Add them as type **Secret**. The generated Wrangler config declares no variables, so the dashboard shows "Update your
Wrangler configuration with these changes to keep deployments in sync". That is safe to ignore: `keep_vars: true` in
`vite.config.ts` makes every deploy keep dashboard variables, and secrets are never touched by a deploy.

Lovable may not let you read stored secrets back. If so, regenerate at the source. Webhook secrets are values you choose, so
set a new one on the provider and the same one on the Worker. After deploying, `GET /api/public/env-check` reports
`true`/`false` per name (never values).

## Where the site's address is used

All of these already point at `https://blueprint.ifvg.in`, so they keep working once that name serves the new Worker. Only
change them if the domain changes.

| Setting                                   | Path                                                                |
| ----------------------------------------- | ------------------------------------------------------------------- |
| Razorpay webhook                          | `/api/public/webhooks/razorpay`                                     |
| Discord OAuth redirect URIs               | `/api/public/discord/callback`, `/api/public/discord/user-callback` |
| Supabase Auth: Site URL and Redirect URLs | the site root, and `/auth/callback` (Google sign-in lands there)    |
| Supabase Auth: Send Email hook            | `/lovable/email/auth/webhook`                                       |
| Resend webhook (bounces, complaints)      | `/lovable/email/suppression`                                        |
| Supabase Vault secret `app_base_url`      | read by the pg_cron jobs below                                      |
| pg_cron `subscription-sweep` (hourly)     | `/api/public/cron/subscription-sweep`                               |
| pg_cron `process-email-queue` (every 5 s) | `/lovable/email/queue/process`                                      |

The `/lovable/email/...` paths are historical names. They are kept because the Supabase hook, the Resend webhook and the
queue job all call them. Renaming means changing those three at the same moment.

## Google sign-in

`/auth` shows "Continue with Google" under the email-code form. It needs no Worker variable or secret: the Google client
secret lives in Supabase, and the browser only talks to Supabase. Until the provider is switched on in Supabase the button
sends the member to a raw `Unsupported provider: provider is not enabled` JSON page, so finish the setup before deploying.

1. Google Cloud Console > APIs & Services > Credentials > Create credentials > OAuth client ID > Web application.
   Authorized redirect URI: `https://jknnofjfkuqastcbdshy.supabase.co/auth/v1/callback`. No JavaScript origins are needed
   for this redirect flow.
2. OAuth consent screen: scopes `openid`, `email`, `profile` only (not sensitive, so Google does not need to review the
   app). Set the publishing status to **In production**; in "Testing" only listed test users can sign in.
3. Supabase > Authentication > Providers > Google: switch on, paste the client ID and secret.
4. Supabase > Authentication > URL Configuration: Redirect URLs must allow `https://blueprint.ifvg.in/auth/callback`
   (a `https://blueprint.ifvg.in/**` wildcard does) and `http://localhost:8080/auth/callback` for dev.
5. Check: sign in with Google on a new address (lands on `/onboarding` with name and photo filled in), then with an address
   that already has an account (same account, no second profile).

Things to know:

- **Identity is the email.** Subscriptions, the Razorpay prefill and the journal grant all match on the profile email.
  Supabase links a Google sign-in to an existing account only when the emails match, so a member who subscribed as
  `a@…` and signs in with Google as `b@…` gets a new, empty account. The button always shows Google's account picker
  and the page tells members to use the email they subscribed with.
- **Admin by email.** `handle_new_user` makes three addresses admin when their account is first created. Google vouches
  for the address, so this is no weaker than the email code, but only enable providers that verify email.
- **In-app browsers.** Google refuses OAuth inside Instagram's, Facebook's and similar embedded browsers
  (`disallowed_useragent`), so `src/lib/in-app-browser.ts` hides the button there and members use the email code.
- **Consent screen name.** Google shows `jknnofjfkuqastcbdshy.supabase.co`, not our domain, as where the member is going.
  A Supabase custom domain fixes that; so would moving to Google Identity Services (`signInWithIdToken`).

## In-page checkout (optional, off by default)

The Pay buttons open Razorpay's own modal. `src/components/site/pay-sheet.tsx` is our own card / UPI form with
Razorpay processing behind it. The build variable `VITE_CUSTOM_CHECKOUT` decides who gets it (a build variable, so
redeploy after changing it):

- unset: nobody. Members get Razorpay's modal. This is the default.
- `preview`: only a browser tab that opened `/subscribe` or `/enroll` with `?checkout=custom`. The choice is
  remembered for that tab, so a sign-in redirect does not lose it; `?checkout=off` clears it. Use this to pay with a
  real card on the live site before anyone else sees the form.
- `1`: everyone.

In dev the `?checkout=custom` opt-in always works, with no variable.

The bank step is still Razorpay's: a popup on desktop, and on phones and in Instagram / Facebook's browser the whole
tab goes to the bank and comes back through `/api/public/razorpay/callback`. Test mode proved the card and UPI-ID
payments end to end (`spikes/razorpay-custom-checkout`). Before turning it on for members, try these in Razorpay test
mode and then with one real payment:

1. Card on desktop. The popup path ends on `/welcome`. The spike's browser could not show a popup, so confirm that
   `payment.success` really fires; if it does not, the sheet still finishes by polling Razorpay.
2. Card on a phone and inside Instagram's browser (the redirect path). Razorpay may want the site's domain allow-listed
   for `callback_url` in the Dashboard.
3. UPI ID. Razorpay deprecated UPI Collect on 28 Feb 2026 for most merchants: test mode accepted it, live may not.
   "More ways to pay" hands the same subscription to Razorpay's own modal, which has every method.
4. The Red Pill one-time payment.
5. A discount code. Offers change the first charge, which has not been tried against the form, so a code sends the
   member to Razorpay's modal instead of the sheet.

Card numbers are typed into our page and go straight to Razorpay. Ask Razorpay and the acquiring bank which PCI
level that puts us in before enabling it.

## Cutting over from Lovable

DNS for `ifvg.in` is on Cloudflare, and `blueprint.ifvg.in` is a proxied record there (not delegated to Lovable). The
Resend DKIM record also lives in that DNS, so email deliverability does not depend on Lovable.

1. Deploy to Cloudflare and set every secret above. Open the `*.workers.dev` URL and check `/api/public/env-check`.
2. Add the custom domain: Worker > Settings > Domains & Routes > Add > Custom domain > `blueprint.ifvg.in`. Cloudflare
   replaces the existing proxied record. The old Lovable site stops receiving traffic at that moment, so do it when you can
   test straight after. To roll back, point the record back at Lovable.
3. Check, in this order: sign in (OTP email arrives with its logo), a Razorpay payment, the Discord connect, an email
   from the queue, and `/api/public/env-check` showing `true` for all.
4. Check the Worker logs after the next hourly sweep (minute 17) for errors.
5. After a couple of days of stable running: in Lovable disconnect or delete the project, and revoke the Lovable GitHub
   app in GitHub > Settings > Applications. Rotate the secrets Lovable held (Razorpay, Discord, Resend, Supabase service
   role) once the new host is confirmed.
6. Delete `src/routes/api/public/env-check.ts`. Its own header says to remove it once things work.

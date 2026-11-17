# Hosting: Cloudflare Workers

The site is a TanStack Start app. `npm run build` produces a Cloudflare Worker (Nitro `cloudflare-module`, configured in
`vite.config.ts`). The Worker is named `blueprint-ifvg`. Supabase (database, auth, storage, the hourly and email-queue
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
| Supabase Auth: Site URL and Redirect URLs | the site root                                                       |
| Supabase Auth: Send Email hook            | `/lovable/email/auth/webhook`                                       |
| Resend webhook (bounces, complaints)      | `/lovable/email/suppression`                                        |
| Supabase Vault secret `app_base_url`      | read by the pg_cron jobs below                                      |
| pg_cron `subscription-sweep` (hourly)     | `/api/public/cron/subscription-sweep`                               |
| pg_cron `process-email-queue` (every 5 s) | `/lovable/email/queue/process`                                      |

The `/lovable/email/...` paths are historical names. They are kept because the Supabase hook, the Resend webhook and the
queue job all call them. Renaming means changing those three at the same moment.

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

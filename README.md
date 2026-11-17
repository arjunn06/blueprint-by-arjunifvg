# The Blueprint by Arjun IFVG

we need to build a community site for my premium trading community customers.

the site will be blueprint.ifvg.in

when logged in people will get asked about two options:

- The Red Pill
- The Blue Pill

The Red pill will give access to private mentorship, 1-1 calls, premium education, complete direct support from Evaluation to Payout on Funded accounts, etc.

The Blue pill will give access to recorded sessions of The Red Pill premium education uncut, monthly one private call with me.

Both will give access to Premium Discord where I'll livestream my NY Session trading, Weekly market reviews.

Heres what you need to build...

- Admin login (blueprint.ifvg.in/admin) where I can see analytics, manage users, create and manage courses, structure the subscriptions, etc.

- User site (blueprint.ifvg.in) where they sign up and they can either visit

The Red Pill, the appointment will be synced to my Google Calendar and user gets registration successful mail response... Upon meeting completion, and admin's approval the user gets You're In for The Red Pill email with onboarding instructions and one time payment of 4999 rs. Upon successful payment they get a button that grants them red pill role in discord

The Blue Pill, where they directly make the payment of 499 rs per month as a recurring subscription

Then from the members panel of the Blue Pill, they can access their courses, claim their discord roles, watch weekly market review, schedule one free private call with me which will be synced in Google calendar.

## Stack

TanStack Start (React 19, Vite) on Cloudflare Workers, Supabase (Postgres, auth, storage, pg_cron), Razorpay for payments,
Resend for email, Discord for member roles. Live at https://blueprint.ifvg.in.

## Development

Needs Node.js 22.18+ and npm.

```sh
npm i
npm run dev      # http://localhost:8080
npm run build    # Cloudflare Worker in .output/
npm run lint
```

`.env` holds the public Supabase values (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`). Server secrets (the Supabase
service-role key, Razorpay, Discord, Resend, journal) go in `.env.local`, which is git-ignored. The full list is in
[docs/hosting.md](docs/hosting.md), which also covers deploying and the cutover from Lovable.

Database changes are SQL files in `supabase/migrations/`.

## IFVG Journal access

The IFVG Journal (journal.ifvg.in, a separate app on its own Supabase project) is included with the Blue Pill and the Red Pill. This site is
the source of truth for who is a member, so it tells the journal whenever that changes. `src/lib/journal-sync.server.ts`
sends a signed grant or revoke to the journal's `bluepill-webhook` function, using the same `isEntitled` rule as the library:

- right after a payment, a Razorpay webhook, a trial or an admin change (the Razorpay webhook for both pills,
  `verifySubscriptionPayment`, `reconcileSubscription`, `verifyRedPillPayment`, `reconcileRedPillOrder`, and the admin
  grant/terminate/delete actions), and
- every hour from the subscription sweep, which re-sends every member in one batch so a missed push repairs itself.

The journal matches the member by email, so they sign up there with the same address. The "subscription started" email and the
members panel both say so.

- Host secrets: `JOURNAL_WEBHOOK_URL` and `JOURNAL_WEBHOOK_SECRET`. With either unset nothing is sent. `/api/public/env-check`
  shows whether the site can see them.
- `JOURNAL_PILLS` in `src/lib/journal.ts` decides which memberships include the journal: the Blue and the Red Pill. The Red Pill
  is one payment for 31 days of access, so its journal access ends with it, like the library.
- Test: `node --test tests/journal-sync.test.ts` (Node 22.18+).
- The journal's side, secrets and troubleshooting are in `docs/bluepill-webhook.md` in the journal repo.

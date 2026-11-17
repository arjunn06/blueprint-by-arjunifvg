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

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://crystal-ball-portal.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/35d9d475-f50f-4401-8711-f4dc6d659d17).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

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

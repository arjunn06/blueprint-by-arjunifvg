# Spike: Razorpay Custom Checkout for Subscriptions

Throwaway experiment. It answers one question: can `razorpay.createPayment()` (razorpay.js, our own form) authorise a
Razorpay **Subscription**, the way the Blue Pill needs? It is not part of the app: it has no Supabase access, no
routes, and does not touch `src/`.

## Run

1. In Razorpay, switch to **Test Mode** and create API keys.
2. `cp env.example .env.local` in this folder and fill in the key id and secret (`.env.local` is git-ignored).
3. ```bash
   node spikes/razorpay-custom-checkout/server.mjs
   ```
4. Open http://127.0.0.1:8787

The server refuses to start unless the key starts with `rzp_test_`, listens on 127.0.0.1 only, and never prints
the secret.

## What to try

| Page | Step | What it tells us |
|---|---|---|
| `/` | Create subscription, then **Pay with card** (test Visa `4718 6091 0820 4366`, any future expiry, any CVV, click **Success** in the popup) | Does `createPayment` accept `subscription_id`? Does `payment.success` fire? Does the signature verify the way `verifySubscriptionPayment` expects (`payment_id\|subscription_id`)? Does the subscription go `created` to `authenticated`/`active`? |
| `/` | **Pay with card (redirect)**, the `callback_url` variant | The whole tab goes to Razorpay's pages and is POSTed back to `/callback`, which verifies the signature. This is the variant that can be driven in an embedded browser. |
| `/` | **Pay with UPI ID** | Razorpay says UPI Collect is deprecated (28 Feb 2026) but test mode accepted it. See Results. |
| `/standard` | Same subscription flow through `checkout.js` | A control. Pins any failure on the checkout type rather than the test account or plan. **Not run yet.** |

The **Event log** records every `window.open` and any page unload (a top-level redirect), which is the
"does the customer leave the page?" question. Its `ready` line also shows which methods the account has
enabled, though that list is not subscription-specific.

## Results (18 Nov 2026, Razorpay TEST mode)

Custom Checkout **can** authorise a Subscription with `subscription_id`:

- **Card, `callback_url` variant: works end to end.** Razorpay POSTed `razorpay_payment_id`,
  `razorpay_subscription_id` and `razorpay_signature` back to `/callback`. The HMAC over
  `payment_id|subscription_id` verified, exactly as `verifySubscriptionPayment` computes it. The payment was
  `authorized`/`captured` and the subscription went `created` to `active` (`paid_count: 1`, next `charge_at`
  set) within about 10 seconds. That lag is the same one the app's `reconcileSubscription` already covers.
- **UPI (collect, `success@razorpay`), handler variant: works.** Payment `captured`, `upi.flow = collect`,
  subscription `active` with `payment_method = upi`. Test mode only: the docs say UPI Collect is deprecated, so
  live mode may behave differently. UPI Intent and AutoPay were not tried (no documented parameters found).
- **Razorpay-hosted pages still appear.** With the card redirect flow the tab passed through a Razorpay RBI consent
  page ("Keep card saved for future payments", "Powered by Razorpay"), a Razorpay OTP page and the bank page, all on
  `api.razorpay.com`. UPI showed a Razorpay "Payment in progress" page. None of these can be branded, so
  Custom Checkout makes the form white-label but not the whole journey.
- **Card, handler variant: the popup opens** (`window.open` was logged) but an embedded browser cannot show or
  drive it, so `payment.success` was **not observed**. Check this one in a real browser.
- `createPayment` has to run inside the click, so create the subscription first, then call it with no `await` in
  between.

## Not covered

- UPI Intent / AutoPay and eMandate: no documented `createPayment` parameters for subscriptions were found.
- The handler (popup) variant's `payment.success` event, and the `/standard` control (see above).
- Live mode. Everything here is test mode; UPI Collect in particular may be rejected for live merchants.
- Real mobile devices and in-app browsers (Instagram, Facebook). Test those on a phone via your LAN IP
  only after changing `okHosts` in `server.mjs`; it currently allows localhost only.
- PCI scope. That is a question for Razorpay and your acquiring bank, not something a spike can answer.

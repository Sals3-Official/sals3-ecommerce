---
tags:
  - session-record
  - paypal
  - payments
  - checkout
  - refunds
  - seller-protection
  - sals3
aliases:
  - "Part 176"
  - "PayPal beside Stripe on three storefronts"
created: 2026-10-13
updated: 2026-10-15
status: implemented
authority: session-record
owner_approved: true
implementation_status: production
related:
  - "[[hot]]"
  - "[[sals3-decision-no-paypal-for-fiji-yet]]"
  - "[[sals3-domain-money-currency-and-pricing]]"
  - "[[sals3-session-2026-10-13-part175-the-order-email-shows-the-payment-breakdown]]"
---

# Part 176 — PayPal beside Stripe on three storefronts

> [!NOTE] Provenance
> Written 2026-10-13 by the session that built it. Owner (Bogs) messages are
> quoted in the language he used. Counts are from the local `npm run verify`
> runs and the husky hooks (GitHub Actions does not run). Written for SIT on
> 2026-10-13; **sections 7 to 13 added 2026-10-15**: UAT, production with live
> PayPal keys, the launch check, and the Google sign-in toast.

## 0. The result

| Repo | PRs into `develop` | State |
|---|---|---|
| `sals3-portal` | #1164 (accept + refunds), blockers PR (fee + tracking) | #1164 deployed to SIT |
| `sals3-ecommerce` | #605 (PayPal), #609 (button + toast), blockers PR | #605, #609 deployed to SIT |
| `sals3.com.au` | #532, #537, blockers PR | #532, #537 deployed to SIT |
| `sals3.com.fj` | #535, then one PR with button + blockers | #535 deployed to SIT; button never shows in FJD |

First sandbox payment: **S3-20261013-06F1BF6BAB**, A$303.54, capture
`6VK85703P3727081H`. Webhook `PAYMENT.CAPTURE.COMPLETED` delivered SUCCESS,
`[paypal-webhook] outcome: 'order-accepted'` for the same order number (the
capture action had made it first; the Portal is idempotent on the PayPal order).

## 1. Why, and what AJ asked

Owner: *"need natin magdagadag ng paypal as mode of payment sa sals3 ... ASAP
ma test sa SIT"*, then *"component based na paypal ang gawin mo ah tapos itayo
mo ito kung paano namin tinayo ang stripe"*. AJ's notes (screenshot):
`npm install @paypal/react-paypal-js @paypal/paypal-server-sdk`, `PayPalProvider`,
keys in Vercel, sandbox only.

## 2. How it is built (mirrors Stripe)

- **Storefronts:** `services/paypal/{client,browser,checkout,acceptance,webhook,receipt}.ts`,
  `CheckoutPayPalButton` (sdk-v6 `PayPalProvider` + `PayPalOneTimePaymentButton`),
  `app/checkout/paypal-actions.ts` (capture), `app/api/paypal/webhook/route.ts`.
  `chargeCheckout` in `actions.ts` is now shared by Stripe and PayPal: the same
  session, rate-limit, price, Portal-intent and charge gates before any provider.
- **Portal:** no DDL. A PayPal capture is stored in the Stripe columns as
  `pp_test_<order>` / `pp_live_<order>` (`payments/provider.ts`), mode in the
  prefix like `cs_test_` / `cs_live_`. Refunds dispatch by provider
  (`payments/refunds.ts`, `paypal-refunds.ts`). Reports, Insights and GHL read
  the prefix (a real PayPal order would otherwise be a GHL "test").
- **Button:** full width, 48px, 10px radius like Stripe's express buttons; the
  v6 `<paypal-button>`'s `:host` is 225x45 and `--paypal-button-border-radius`
  is its radius property (measured).
- **Toast:** PayPal's own window cannot be styled; after it closes the checkout's
  Sileo toast shows "Confirming your PayPal payment", then "Payment received".

## 3. The blockers closed the same day

1. **AU webhook behind deployment protection** — solved without a bypass secret:
   a capture is accepted by any storefront **of the same stage** (`stageOf`),
   because the three storefronts of a stage share one Portal. One webhook per
   stage on the unprotected host (`sit.sals3.com`: id `398590824L673570U`).
2. **Seller Protection** — the ship-to address goes on the order
   (`SET_PROVIDED_ADDRESS`, AU states as `NSW`/`VIC`/…; PH and FJ send no state),
   with a fallback to `NO_SHIPPING` if PayPal refuses the address; the Portal
   adds each new tracking number to the PayPal order from the status sync.
3. **Fiji** — owner decision: no PayPal for Fiji yet
   ([[sals3-decision-no-paypal-for-fiji-yet]]).
4. **Income card** — PayPal's fee from the capture's
   `seller_receivable_breakdown`; the card names PayPal.

## 4. Environment (names only; values are in Vercel)

Storefronts, Preview / `develop`: `NEXT_PUBLIC_PAYPAL_CLIENT_ID`,
`PAYPAL_CLIENT_SECRET` (added by the owner), `PAYPAL_WEBHOOK_ID` (ecommerce
only). Portal, Preview / `develop`: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`.
Sandbox unless `NEXT_PUBLIC_PAYPAL_ENVIRONMENT` / `PAYPAL_ENVIRONMENT` is
exactly `live`. **Nothing on Production**: sandbox keys there would let a real
buyer "pay" with sandbox money and get a real CJ order.

## 5. Lessons

- **Sandbox keys are never put on Production**, even "for later".
- **Measure a third-party component before styling it.** The v6 button's size
  rule was found by reading its shadow root's stylesheet in a local page.
- **PayPal's modal centres itself** (measured centred on a test page and on
  `sit.sals3.com`); a modal at the top of a small window is PayPal fitting a tall
  login form, not our CSS.
- **Unrelated e2e failures under load** (dev server dying mid-run while another
  session ran vitest) were proven unrelated by running the failing specs alone on
  `develop` and on the branch (14/14 both) before the one last retry.

## 6. Pending (not done)

- ~~UAT and production~~: done 2026-10-14/15, sections 9 and 10.
- Disputes are handled by hand in PayPal; GHL email templates not yet read for
  card-only wording.
- PayPal modal position on small windows: PayPal's, not ours (section 5).
- A `PARTIALLY_REFUNDED` capture shows 0 refunded on the income card; a tracking
  number PayPal refused is not retried (ponytail notes in code).

## 7. Wording: PayPal words only for PayPal buyers (2026-10-14)

Owner, on a first draft that made every notice neutral: *"sa lahat ito? dapat
exclusively lang na pag paypal ang gamit ah."* Card buyers keep the card words
exactly as before; only an order paid with PayPal gets PayPal's.

- `lib/orders/format.ts` `inPayPalWords()` swaps every card/Stripe timing sentence
  ("5 to 10 business days", "statement", "your bank", "a different card") for
  `PAYPAL_REFUND_TIMING`: a refund to a PayPal balance is usually immediate, to a
  card or bank it can take longer. Used by the cancel form (`paidWith` prop) and
  the order page.
- `lib/checkout/notice-copy.ts` `inPayPalNotice()`: "Your card was not charged."
  becomes "Your PayPal account was not charged." only on the PayPal path.
- `lib/orders/notice.ts` `processingOf()`: "Stripe is still processing" / "PayPal
  is still processing" / "We are still confirming" (mixed).
- Guard: `paypal-wording.test.ts` fails if a card phrase reaches PayPal copy.

PRs into `develop`: refund copy ecom #612, AU #540, FJ #541, Portal #1168; trust
copy ecom #613, AU #541; refund timing ecom #614, AU #542, FJ #542; PayPal-only
notices ecom #617, AU #544, FJ #544.

## 8. The "Confirming your PayPal payment" toast took three fixes

Each fix was proven on SIT by Gemini with screenshots (briefs in `E:\pp-ship\gemini-*.md`).

1. **PayPal's v6 overlay stays until `onApprove`'s promise settles**, so it
   covered our toast. `onApprove` now returns at once and runs the capture
   un-awaited; the button is disabled while `capturing` (ecom #622, AU #549).
2. **Sileo 0.1.5 never opens a `loading` toast** (`open = hasDesc && isExpanded
   && !isLoading`), and a `null` duration skips auto-expand: only the title
   showed. Now an `info` toast with our `Spinner` (ecom #624, AU #552).
3. **The checkout's `CheckoutToastHost` mounts only while a checkout notice is
   set**, so a toast fired outside that state had no host. It is now a `busy`
   checkout notice, `PAYPAL_CONFIRMING_NOTICE` (ecom #635, AU #561). Gemini
   retest 3: 7/7 pass.

Lesson: the unit tests mocked Sileo, so all three bugs passed them. A real-Sileo
render test (`paypal-confirming-toast.test.tsx`, asserts `data-visible="true"`
on `[data-sileo-content]`) is the one that fails on the old code.

## 9. UAT (pre-prod), 2026-10-14

Promoted: ecom #643, AU #570, FJ #571, Portal #1191. Env on Vercel Preview for
branch `pre-prod` mirrors SIT (sandbox client id entered by the agent, secrets
pasted by the owner); UAT webhook id `4V853633B74339223`. Owner's own orders:
`S3-20261014-9E17BC144F` accepted, PayPal fee shown on the income card, webhook
200 on uat; `S3-20261014-6C3DE9E7D4` cancelled and refunded through PayPal.
Owner: *"okay na muna yan ... bsta nakikita natin na nag rerefund at na pproceed
ang payment sa paypal. tira tayo sa main"*. CJ is sandboxed on SIT and UAT.

## 10. Production with live PayPal, 2026-10-15

Owner: *"approved, i-push at i-merge mo na sa main. tapos gawin na natin ang
paypal sa main yung live at hindi sandboxed"*.

- Merged: Portal #1194 `a0483cf5`, ecom #663 `a7693eb1`, AU #583 `2cd1d48b`,
  FJ #580 `66e4b510`; all Vercel production deploys success. AU and FJ needed main
  merged into the promote branch first (the voucher-at-Pay fix #582/#579 landed
  during the promotion; resolved to develop's `useCheckout.ts`). FJ main lacks
  `NoticeSuccessIcon`, so FJ keeps Sileo's own success icon.
- Live PayPal app "SALS3" on the business account; live webhook
  `https://sals3.com/api/paypal/webhook`, `PAYMENT.CAPTURE.COMPLETED` only.
- Vercel **Production** env (names only): ecom `NEXT_PUBLIC_PAYPAL_CLIENT_ID`,
  `NEXT_PUBLIC_PAYPAL_ENVIRONMENT=live`, `PAYPAL_WEBHOOK_ID`,
  `PAYPAL_CLIENT_SECRET`; AU the same without the webhook id; Portal
  `PAYPAL_CLIENT_ID`, `PAYPAL_ENVIRONMENT=live`, `PAYPAL_CLIENT_SECRET`. The owner
  pasted every secret; the agent never saw one.
- **Not proven:** a real-money PayPal payment on production. Owner's call.

## 11. The launch check, 15 Oct 2026

Asked *"sure na bang tatayo ang countdown timer pati ang vouchers?"* at 01:18 UTC.
Read-only checks: launch code on `main` in all three, untouched by the PayPal and
Google commits; Portal production offer `GRANDLAUNCH` Scheduled 12:59 pm Sydney
(the first-order `SALS3LAUNCH` Stopped), pop-up "Grand Launch October 2026"
Scheduled 12:50 pm. Headless probes (`E:\pp-ship\launch-watch\`):

| UTC | Result on sals3.com, .com.au, .com.fj |
|---|---|
| 01:21 | "OFFICIAL LAUNCH", no dialog; `loadMarketingPopupAction` → `1:null` |
| 01:51 | "FINAL CHECKS" (lockdown); action still `null`: the pop-up hides while its offer has not started |
| 02:00:16 | action returns the GRANDLAUNCH pop-up with each site's line and minimum |
| 02:00:27 to 02:01:27 | countdown gone, `dialog[open]` = 1 (pop-up showing, "0 of 100 claimed") |

Still unproven: a paid order that used the voucher.

## 12. Google sign-in toast, on every rung

The same Sileo trap as section 8: "Connecting to Google…" was a `loading` toast,
so "Finish signing in in the Google window." never showed. Now `sileo.info` with
the Spinner; real-render test `google-connecting-toast.test.tsx`.
develop: ecom #676, AU #596, FJ #587. pre-prod: ecom #681, AU #597, FJ #588.
main (after the launch, owner: *"okay na pwede mo na siguro i deploy sa main"*):
ecom #689 `8044071c`, AU #598 `60d5e7da`, FJ #589 `0a80d7c5`.

## 13. The launch made a test a time bomb

After 02:00 UTC the banner renders nothing, so `e2e/launch-calendar.spec.ts`
("Add to calendar") failed every push in AU and FJ. ecom already had the fix
(`eaa2a5e`, pins the test clock to 14 Oct and stubs the favicon `Date` the launch
clock reads). Ported to AU and FJ: with the Google PR on main (#598, #589), then
develop AU #599, FJ #590 and pre-prod AU #600, FJ #591 (owner: *"sige ilagay mo
na rin sa develop at pre-prod"*).

Lesson: a test that reads the real clock against a fixed date breaks on that
date; pin the clock in the test.

---
tags:
  - session-record
  - paypal
  - payments
  - checkout
  - fiji
  - currency
  - sals3
aliases:
  - "Part 177"
  - "Fiji pays by PayPal in US dollars"
created: 2026-10-22
updated: 2026-10-22
status: implemented
authority: session-record
owner_approved: true
implementation_status: production
related:
  - "[[hot]]"
  - "[[sals3-decision-no-paypal-for-fiji-yet]]"
  - "[[sals3-session-2026-10-13-part176-paypal-beside-stripe-on-three-storefronts]]"
  - "[[sals3-domain-money-currency-and-pricing]]"
---

# Part 177 — Fiji pays by PayPal in US dollars

> [!NOTE] Provenance
> Written 2026-10-22 by the session that shipped it. Owner messages are quoted
> in the language they were written. Test counts are from local runs (GitHub
> Actions does not run). Facts marked **unverified** were not observed.

> [!IMPORTANT] Supersedes
> [[sals3-decision-no-paypal-for-fiji-yet]]: sals3.com.fj now offers PayPal, charged
> in **USD**, with the USD amount quoted and sealed before the buyer approves.
> That decision's carry-forward rule ("only with ... how the converted amount
> is shown before the buyer pays") is what this build satisfies.

## 0. The result

| Repo | develop (SIT) | pre-prod (UAT) | main (prod) |
|---|---|---|---|
| `anythingsupplies/sals3-portal` | [#1267](https://github.com/anythingsupplies/sals3-portal/pull/1267) `791d8801` | [#1268](https://github.com/anythingsupplies/sals3-portal/pull/1268) `684cc0f2` | [#1269](https://github.com/anythingsupplies/sals3-portal/pull/1269) `d1499a7a` |
| `anythingsupplies/sals3.com.fj` | [#607](https://github.com/anythingsupplies/sals3.com.fj/pull/607) `af7a1932` | [#608](https://github.com/anythingsupplies/sals3.com.fj/pull/608) `cc699480` | [#609](https://github.com/anythingsupplies/sals3.com.fj/pull/609) `10d0d48b` |

All merged 2026-10-21. Portal first, then Fiji, at every stage. Promotion was a
`git cherry-pick -x` of **only** these commits:

- Portal `249992d7` feat(offers): read an AU/FJ voucher in US dollars for a USD charge
- Portal `2e2ba332` fix(offers): refuse a voucher cap that converts below one US cent
- Fiji `3f5b7266` feat(checkout): PayPal for Fiji in US dollars, quoted before approval
- Fiji `d3e4bfbf` fix(paypal): refuse another stage's sealed order before capture
- Fiji `54b5df95` docs(paypal): README section (quote, HMAC seal, stage checks)

Local checks per stage: develop Portal 7831 passed / 4 skipped, Fiji 3263;
pre-prod 7778 / 4, 3258; main 7753 / 4, 3244. Typecheck, lint, prettier clean.

Live production (2026-10-22): sals3.com.fj `dpl_6ffNXrpSK7hjNNW17iyUaJqW5MCC`
(redeploy of main `10d0d48b` after the live keys were added), READY.
portal.sals3.com `dpl_4ajNVQMo98LFzyTATgj1LBtjt16B` (main `d1499a7a`), READY.

## 1. How it works

- PayPal has no FJD. The Fiji checkout quotes the cart in **USD** and shows that
  amount before the PayPal popup.
- The quote is sealed into the PayPal order's `custom_id` with HMAC-SHA256,
  keyed by `PAYPAL_CLIENT_SECRET`. Capture refuses an order whose seal does not
  verify, and an order sealed by another stage (check uses `referenceId`).
- Portal reads AU/FJ vouchers in USD for a USD charge, and refuses a voucher
  cap that converts below one US cent.
- No button without `NEXT_PUBLIC_PAYPAL_CLIENT_ID`. Environment is sandbox unless
  `NEXT_PUBLIC_PAYPAL_ENVIRONMENT` (Fiji) / `PAYPAL_ENVIRONMENT` (Portal) is
  exactly `live`. Portal sends CJ orders as sandbox unless `CJ_ORDER_SANDBOX=0`.
- Design and settings: Fiji `README.md`, PayPal section.

## 2. Configuration (Vercel, team sals-3-team)

| Project | Scope | Vars |
|---|---|---|
| `sals3-com-fj` | Preview `develop` (SIT) | sandbox pair, `PAYPAL_WEBHOOK_ID=2JW08542JN879212F` |
| `sals3-com-fj` | Preview `pre-prod` (UAT) | sandbox pair, `PAYPAL_WEBHOOK_ID=5T139365VU996360J` |
| `sals3-com-fj` | Production | `NEXT_PUBLIC_PAYPAL_CLIENT_ID` (SALS3 Live app), `NEXT_PUBLIC_PAYPAL_ENVIRONMENT=live`, `PAYPAL_CLIENT_SECRET` (sensitive), `PAYPAL_WEBHOOK_ID=81660475FD2855127` |
| `sals3-portal` | Preview develop / pre-prod | sandbox pair |
| `sals3-portal` | Production | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` (sensitive), `PAYPAL_ENVIRONMENT=live` (unchanged by this work) |

- Live app: PayPal developer dashboard, Live, app **SALS3** (created 2026-10-14).
  Its Client ID matches Portal production's `PAYPAL_CLIENT_ID` (checked by prefix).
- Live webhook: `https://sals3.com.fj/api/paypal/webhook`, event
  `PAYMENT.CAPTURE.COMPLETED`, ID `81660475FD2855127`. Added by the owner.
  **Unverified:** that it sits on the SALS3 app (the edit-page ID did not match
  the SALS3 Client ID prefix, which may only be a different ID format).
- Firebase for Fiji preview: SIT `sals3-sit`, UAT `sals3-uat`.

## 3. Tests

| Stage | Order | Result |
|---|---|---|
| SIT | US$37.03 sandbox | captured; full refund `2TA29094KA649250P` COMPLETED 08:41:32Z |
| UAT | US$87.79, PayPal order `8VU15901890470140` (owner ran it) | success; **not refunded** (owner: "Leave it") |
| Prod | none | button and live capture **not yet observed** |

CJ stayed sandbox on SIT/UAT: `supplier_order_steps.request_snapshot->>'isSandbox'`.

Prod checks done: the webhook URL answers an unsigned POST with **400** (reachable,
not behind SSO). Checkout needs a login, so the button was not seen from outside.

## 4. What went wrong, and how it was found

1. **SIT/UAT webhooks never arrive.** Fiji preview domains are behind Vercel SSO
   protection (`all_except_custom_domains`); PayPal gets a 302 to the SSO page.
   Checkout still completes through the capture action. Owner: leave as is.
2. **Fiji production had no PayPal vars at all** while Portal production did.
   Found by listing env names (never values) before the redeploy.
3. **The permission classifier refused every step that touched the live secret:**
   opening the SALS3 app page ("Credential Materialization"), opening Vercel's
   Add Variable form ("Credential Exploration"), and typing in PayPal's Add
   Webhook form ("Unrequested Commit in a Connected App"). The owner did those
   three by hand; the agent added the non-secret vars by API.
4. **The live secret was pasted into chat** by the owner. The agent did not use
   it. It is in a chat transcript, so it should be rotated (section 5).
5. A partial production set was avoided on purpose: a Client ID without the
   secret renders a PayPal button that cannot capture. `NEXT_PUBLIC_*` values are
   baked at build, so the public vars were added first and the redeploy waited
   for the secret.

## 5. Open items

- [ ] Owner: log in on sals3.com.fj, open checkout, confirm the PayPal button shows
      in USD; optionally one small live order and refund.
- [ ] Rotate the SALS3 live secret. Update `PAYPAL_CLIENT_SECRET` in **both**
      `sals3-portal` and `sals3-com-fj` Production, then redeploy both. Rotating
      without updating Portal stops PayPal on portal.sals3.com.
- [ ] Confirm the live webhook `81660475FD2855127` is on the SALS3 app.
- [ ] SIT/UAT webhook 302 (SSO) left as is by owner; a protection bypass for
      `/api/paypal/webhook` would fix it if wanted.

## 6. Lessons

- List production env **names** on every project before promoting a feature that
  needs keys; "Portal prod has keys" said nothing about Fiji prod.
- Preview webhooks need the preview to be reachable; check for a 302 before
  blaming the provider.
- When the classifier blocks secret handling, split the work: the owner moves the
  secret, the agent does everything non-secret and the redeploy.

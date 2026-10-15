---
tags: [sals3, decision, payments, paypal, fiji, currency]
aliases: [No PayPal for Fiji yet, Fiji PayPal decision]
created: 2026-10-13
updated: 2026-10-15
status: implemented
authority: decision-record
owner_approved: true
related:
  - "[[sals3-session-2026-10-13-part176-paypal-beside-stripe-on-three-storefronts]]"
  - "[[sals3-decision-stripe-charges-only-the-quoted-currency]]"
  - "[[sals3-domain-money-currency-and-pricing]]"
---

# Decision: no PayPal for Fiji yet

**Decided by Bogs, 2026-10-13**, choosing "Walang PayPal sa Fiji muna" over
charging Fiji buyers in AUD or USD through PayPal.

## The gap

PayPal has no Fiji dollar. sals3.com.fj charges in FJD only. Any PayPal payment
from Fiji would be charged in another currency, which breaks
[[sals3-decision-stripe-charges-only-the-quoted-currency]] unless the buyer is
shown the exact converted amount first and the Portal prices an AUD/USD intent
for an FJ cart.

## The decision

Fiji pays by card through Stripe in FJD, as before. M-PAiSA stays phase 2
(`fiji-payments/sals3_fiji_mpaisa_decision_memo.md`, Option A). The PayPal code
is in the Fiji storefront so the three storefronts stay one code base; the
button never renders for FJD (`lib/paypal/currency.ts`).

## Carry-forward rule

Never offer PayPal for a currency PayPal cannot take. Revisit only with an
owner decision that also says how the converted amount is shown before the
buyer pays.

## Since then

Holds on production (2026-10-15): the PayPal code reached `main` in sals3.com.fj
(#580) and the button still never renders in FJD; SIT test by Gemini confirmed no
PayPal on the Fiji checkout.

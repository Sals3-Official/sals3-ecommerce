---
tags:
  - sals3
  - sals3-portal
  - sals3-ecommerce
  - checkout
  - shipping
  - markets
  - fiji
  - session-note
aliases:
  - Part 91
  - A Third Market
  - Fiji Towns
  - Free Standard Shipping
created: 2026-08-29
updated: 2026-08-29
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[cross-border-rest-of-world-selling-reference]]"
  - "[[sals3-session-2026-08-28-part88-three-named-tiers-instead-of-cjs-own-courier-list]]"
  - "[[sals3-session-2026-08-28-part90-the-drafts-born-priceless-and-the-route-that-ran-another-migration]]"
---

# Part 91 — a third market, its towns, and the first free-shipping line

AJ's work, 2026-08-28. Fiji becomes a checkout destination alongside Australia
and the Philippines, its address form learns the towns inside each division, and
the first free-shipping thresholds ship as environment configuration.

- `sals3-portal` [#217](https://github.com/Sals3-Official/sals3-portal/pull/217)
  — accept Fiji freight quotes.
- `sals3-ecommerce` [#185](https://github.com/Sals3-Official/sals3-ecommerce/pull/185)
  — enable the Fiji market.
- `sals3-ecommerce` [#188](https://github.com/Sals3-Official/sals3-ecommerce/pull/188)
  — Fiji divisions carry their towns, and the city field becomes a list.
- `sals3-portal` [#232](https://github.com/Sals3-Official/sals3-portal/pull/232)
  — free Standard shipping thresholds.
- `sals3-ecommerce` [#189](https://github.com/Sals3-Official/sals3-ecommerce/pull/189)
  — surface the free-shipping progress to the buyer.

Also merged this morning and already narrated in part 89, linked here so it has
a number in the vault: `sals3-ecommerce`
[#184](https://github.com/Sals3-Official/sals3-ecommerce/pull/184) — the
checkout contact email rendered read-only and seeded from the signed-in account.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. The town counts and
> the threshold values are quoted from those records; the Vercel variables were
> set by AJ at merge time and have not been re-read here.

## 1. Fiji, on both sides of the wire

The portal half widens the storefront checkout freight-quote contract to accept
`FJ` beside `AU` and `PH`, and **allows a blank Fiji postal code** while keeping
postal codes required for the other two. Schema and freight-quote tests cover the
Fiji CJ `freightCalculateTip` path.

The storefront half adds Fiji labels, regions, the phone prefix, and optional
postal-code validation, with AU/PH postal and city-option validation left intact.
The two shipped as a matched pair on the same branch name in both repositories.

## 2. The city field stops being free text

The five Fiji divisions held **one town each** — Suva, Levuka, Labasa, Ahau,
Lautoka — while the city field took any typed string. Both halves were fixed
against the owner's own division dataset: **25 towns**, Central 7, Western 7,
Northern 6, Eastern 1, Rotuma 1.

Free text became a `<select>`. Fiji was the only country still using free text,
and the reasoning for closing it is worth keeping: **a typed city was never read
by the freight quote at all** — `freight-quotes.ts` carries no city, region or
postal field — and only ever reached the courier as a string through the Stripe
session address and the order `shipTo`. So the list costs nothing and buys
consistent data. `CHECKOUT_FREE_TEXT_CITY_COUNTRIES` and
`checkoutAllowsFreeTextCity` are gone, and `CheckoutAddressSchema` no longer
returns early for Fiji, so **every** country's city is now validated against the
chosen region.

**The gap a list cannot hold** is answered by a hint rather than by re-opening
the box: Fiji delivers to villages and outer islands no list of towns will carry,
so the field says *"Not listed? Choose the nearest town and put your village or
island on address line 1."* — the line the courier actually reads. `SelectField`
gained `helperText`, wired into `aria-describedby` alongside the error id.

Two smaller decisions, both recorded rather than left to be rediscovered:

- **Fiji keeps "City or town"**; Australia and the Philippines stay on "City".
  Driven by `checkoutCityLabel` / `checkoutCityHint` off
  `CHECKOUT_TOWN_LIST_COUNTRIES`, not by a country literal in the component.
- **Rotuma stays "Rotuma".** The dataset writes "Rotuma (Dependency)", but that
  is a classification note rather than the division's name, and ISO 3166-2:FJ
  codes it `FJ-R` Rotuma. Renaming would also change a stored region string for
  no buyer gain.

Australia and the Philippines carry **the same gap Fiji does** — a municipality
that is not one of the listed cities has no entry either. That is unresolved, and
now stated.

## 3. The first free-shipping thresholds

Env-only, per market, applied **to Standard delivery alone** and only when the
authoritative Portal subtotal reaches the threshold:

| Market | Variable | Threshold |
|---|---|---|
| Philippines | `SALS3_FREE_STANDARD_SHIPPING_PH_USD` | 12 |
| Australia | `SALS3_FREE_STANDARD_SHIPPING_AU_USD` | 25 |
| Fiji | `SALS3_FREE_STANDARD_SHIPPING_FJ_USD` | 55 |

**The original CJ freight amount is preserved** rather than overwritten, and
order creation accepts a zero-priced Standard line. The storefront asks the
Portal for the capability, shows an animated progress bar below the delivery
options while the buyer is under the threshold, and renders free Standard with
the original freight amount kept as a strikethrough regular price.

Scoping it to Standard is what makes it safe beside part 88's tiers: Express and
Expedited are the rows a buyer pays to jump, and discounting the tier that is
already the cheapest valid row cannot invert the ordering the classifier
produced.

`sals3-ecommerce` #189 also switched the production build script to **Webpack**,
to get around a Turbopack port-binding panic in local `verify`. That is a
workaround around a tool defect, not a decision about bundlers, and it should be
revisited when Turbopack is next upgraded.

## Consequences to carry forward

- **No migration on either side.** Fiji is configuration and validation data, and
  the thresholds are environment variables. Nothing here needs a production DDL
  run.
- **Fiji can now be checked out, and part 85's revert means nothing asks a buyer
  where they are shipping until the address form.** A Fijian visitor with no
  `x-vercel-ip-country` is still Global until they reach checkout.
- **The threshold values live only in Vercel.** They are recorded here because
  nothing in either repository states them, and an env-only number is invisible
  to anyone reading the code.

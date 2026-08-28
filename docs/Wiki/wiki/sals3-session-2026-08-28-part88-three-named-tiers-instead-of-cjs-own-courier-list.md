---
tags:
  - sals3
  - sals3-portal
  - sals3-ecommerce
  - checkout
  - freight
  - cj-dropshipping
  - migration
  - cross-repo
  - session-note
aliases:
  - Part 88
  - Three Named Tiers
created: 2026-08-28
updated: 2026-08-28
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[aj-cj-shipping-tier-handoff]]"
  - "[[aj-shipping-tier-courier-selection-story]]"
  - "[[sals3-session-2026-08-27-part86-the-flag-that-stopped-every-cart-and-the-price-that-saved-a-zero]]"
---

# Part 88 — three named tiers instead of CJ's own courier list

AJ's cross-repository pair, merged 2026-08-28.

- `sals3-portal` [#211](https://github.com/Sals3-Official/sals3-portal/pull/211)
  — classify freight quotes into three strict tiers, and persist the chosen one.
- `sals3-ecommerce` [#181](https://github.com/Sals3-Official/sals3-ecommerce/pull/181)
  — render exactly three delivery cards instead of CJ's raw list.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. The schema claims
> were re-checked against merged code: `drizzle/0032_strict_shipping_tiers.sql`
> and `src/modules/checkout/shipping-tiers.ts` are both on `develop`. The
> buyer-facing behaviour is AJ's description, not re-observed.

## 1. The problem: a delivery promise nobody could read back

CJ returns a variable, unnamed list of logistics options per package — four
choices one minute, seven the next, named for CJ's internal services. The
freight-quote endpoint passed that list through verbatim, so:

- the storefront had nothing stable to render, and pre-selected whichever row CJ
  happened to answer first;
- the buyer chose something they could not name;
- **an accepted order recorded no readable delivery promise.**

## 2. The classification

Quotes become **Standard**, **Express**, or **Expedited**, at most one per tier
per package, derived from the parsed arrival window:

- **Standard** — the cheapest valid row. Pre-selected.
- **Expedited** — the fastest row strictly faster than Standard.
- **Express** — the remaining middle balance.

`src/modules/checkout/shipping-tiers.ts` is a **pure function over the parsed
window**, with ties broken by a stable identity, so the same quote list always
yields the same tiers. The endpoint no longer depends on the order CJ happened to
answer in — which is the property that makes the promise reproducible rather than
merely present.

**A tier with no real CJ service stays visible and disabled** rather than being
filled with a duplicated courier or an invented delivery promise. That is the
same discipline ADR-013 applies to stock: an absent fact is shown as absent, not
substituted.

CJ courier names, identifiers, and supplier rules stay out of buyer-facing cards.

## 3. What the payment record has to carry

The selected tier travels into the Stripe Checkout Session metadata under
`sals3_checkout_version: cj_freight_v2` and onto the order, **so what was promised
at checkout is recoverable from the payment record alone.**

The server re-quotes before creating the session and requires an **exact fresh
match** on package, tier, option, channel, amount, and currency. Browser-assigned
tiers, courier identifiers, delivery promises, and prices are never trusted for
payment — the client is an input, not a source.

Receipts keep their pre-tier shape, so an order placed before this change renders
from the same code as one placed after it.

## 4. The migration, and the window it opens

`drizzle/0032_strict_shipping_tiers.sql` — additive only:

```sql
ALTER TABLE "fulfillment_groups" ADD COLUMN "shipping_tier" text;
ALTER TABLE "fulfillment_groups" ADD CONSTRAINT "fulfillment_groups_shipping_tier_check"
  CHECK ("shipping_tier" is null or "shipping_tier" in ('Standard','Express','Expedited'));
```

**Nullable is the point:** every order placed before this change has no tier and
must not be given a false one. No backfill, no rewrite.

> [!WARNING] This one runs *after* the deploy, not before
> `buyer-read.ts` and `orders.ts` **SELECT** this column, so the migration must be
> applied as soon as the deployment carrying it is live — until it runs, those
> reads fail with `column fulfillment_groups.shipping_tier does not exist`.
>
> Note the direction is the opposite of part 87's `position`, and for a precise
> reason: a column that is only **read** breaks the reads that name it, so it can
> follow the deploy closely. A column that Drizzle names in an **`INSERT`** breaks
> every write to that table, so it must precede the deploy. Both are the
> 2026-08-12 and 2026-08-18 failure shape; which side of the deploy the DDL sits
> on depends on whether the code writes the table.

## 5. Carried along, deliberately separated

A development-only fallback in `CjTokenManager` for a credential sealed with
another machine's encryption key. Production never reads it, and a decrypt
failure never writes back to the credential row.

## 6. Verification

Full `npm run verify` on both sides before push — portal: lint, format, clean
typecheck, production build, unit suite, 70 Playwright tests (15 skipped by
existing conditions). Storefront: the same plus 63 Playwright tests.

ADR-003 gained a 2026-08-28 amendment recording the decision, rebased to sit
after the "one storefront again" amendment (part 85) rather than conflicting with
it.

## 7. Open

The buyer-facing flow has not been re-observed in this vault's own record — the
tier cards, the disabled state for an unavailable tier, and the metadata landing
on a real Stripe session are AJ's verification, not a second one.

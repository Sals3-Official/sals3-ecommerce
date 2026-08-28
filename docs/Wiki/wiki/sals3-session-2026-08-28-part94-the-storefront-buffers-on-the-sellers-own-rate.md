---
tags:
  - sals3
  - sals3-portal
  - sals3-ecommerce
  - pricing
  - fx
  - storefront
  - session-note
aliases:
  - Part 94
  - The Storefront Buffers On The Seller's Own Rate
  - The Date The Driver Never Mapped
created: 2026-08-29
updated: 2026-08-29
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-session-2026-08-28-part82-a-shopfront-per-country-and-a-price-in-local-money]]"
  - "[[sals3-session-2026-08-28-part92-one-rule-in-two-units-and-the-first-repricing-path]]"
  - "[[cj-wallet-currency-and-au-funding-fx-gap]]"
---

# Part 94 — the storefront buffers on the seller's own rate

2026-08-28. The approximate local price beside the USD one was a bare mid-market
conversion built on a **hard-coded `2.5`** in
`sals3-portal`'s `src/lib/storefront/fx.ts`, while the **Funding buffer** card on
Market Rules — the field a seller can actually see and edit — read **`+1.50%`**.
One fact, two homes, already drifted.

- `sals3-portal` [#221](https://github.com/Sals3-Official/sals3-portal/pull/221)
  — the storefront buffers on the seller's own rate.
- `sals3-portal` [#223](https://github.com/Sals3-Official/sals3-portal/pull/223)
  — the buffer query bound a `Date` the driver never mapped.
- `sals3-ecommerce` [#187](https://github.com/Sals3-Official/sals3-ecommerce/pull/187)
  — the local price carries the seller's own buffer.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. The rate figures are
> the examples those records carried, not live quotes.

## 1. One home for the number

`GET /api/storefront/fx-buffer` serves the active **Market Rules → Funding
buffer**, and the hard-coded default is **deleted rather than replaced**: a
fallback percentage is indistinguishable from a configured one by the time it
renders, which is how the two came apart in the first place.

The shape follows the catalogue projection rather than inventing one:

| Layer | Catalogue | This |
| --- | --- | --- |
| Read model | `storefront/read-model.ts` | `pricing/storefront-fx-buffer.ts` |
| Cache | `catalog-cache.ts` | `fx-buffer-cache.ts` (same two layers, 60s) |
| Tag | `catalog-tag.ts` | `fx-buffer-tag.ts` |
| Projection | `catalog-feed.ts` | `fx-buffer-feed.ts` |
| Invalidation | `updateTag` on publish | `updateTag` on buffer save/deactivate |

`fx-buffer-tag.ts` exists for the reason `catalog-tag.ts` does (added in #218):
`fx-buffer-cache.ts` opens with `server-only`, and an action that only needs to
expire the entry must not drag the pricing read into its module graph.

**Resolution, and what it refuses to do.** The buffer is scoped per seller and the
storefront has no seller context, so it resolves through whoever owns **published
offers**. One seller today, so the answer is unambiguous. **Two sellers with
different buffers resolve to `null` and log** — charging one seller's cushion
against another's goods is the kind of quiet wrong answer nobody finds for days.

`200 {"buffer": null}` is a real answer (no policy, expired, out-of-band rate,
ambiguous) and the consumer shows no local price for all of them. A `503` means
the question could not be asked, which the consumer distinguishes so a database
blip does not clear every local price on the site.

**This is not a pricing change.** `resolveProductPricing` is untouched; the charged
USD price still applies the same policy to the cost basis exactly once, at
publish. It also does **not** reprice live offers — part 92's `reprice.ts` is what
carries a policy change onto published prices, and wiring the funding buffer into
that is its own decision, not a side effect of expiring a cache tag.

Rate caches moved from 12 hours to 1 hour on the portal side and 6 hours to 1 hour
on the storefront. That buys **no rate accuracy** — the sources publish once per
business day — it bounds how long a Market Rules edit takes to reach a shopper.

## 2. The buffer sits on the rate, not on the price

```
$3.30 retail
PHP  62.24  -> 63.1736 (+1.5%)  ->  PHP 208.47   (mid was PHP 205.39)
AUD  1.3922 -> 1.4131            ->  A$4.66       (mid was A$4.59)
FJD  2.2148 -> 2.2480            ->  FJ$7.42      (mid was FJ$7.31)
```

A published mid rate is not a rate anybody transacts at — the card doing the
conversion takes its own spread — so the old figure was knowingly **below** what
the buyer's statement would say.

**No buffer means no local price. Not a mid-market fallback.** A mid conversion is
knowingly low and the buyer cannot tell that apart from an ordinary
approximation, so `toIndicativePrice` returns `null` and `IndicativePriceLine`
renders nothing — the rule already in force for a missing rate.

Two failure cases that must not collapse into one:

| | |
|---|---|
| A served `{"buffer": null}` (deactivated in Market Rules) | takes effect at once and clears the remembered value |
| A transport failure | reuses the last good buffer for up to six hours, per instance |

**The disclosure changed with it.** It said *"Converted at the rate published
on …"*, which stops being true the moment an allowance is added. It now says the
figure is based on that rate **plus an allowance for conversion costs** — and
there is a test asserting the old sentence is gone, because a disclosure
describing a calculation the code no longer performs is worse than none.

The buyer is still charged **USD**. `IndicativePrice` is deliberately not a
`Money`, so this value cannot reach a Stripe session or an order line — *the
compiler refuses rather than a reviewer having to notice*. Keep that separation:
it is the switch that would have to be deliberately thrown if local currency ever
becomes the charged one.

**Ship order was load-bearing:** #221 had to deploy before #187, or the fetch
404s, resolves to `null`, and every approximate local price disappears. Degrades
safely, but visibly. Each failure mode was exercised against the real module —
route 404, token unset, portal 503, portal hangs (1.5s timeout) — and all resolve
to `null` without throwing on the render path.

## 3. The endpoint answered 503 on every call

From the moment #221 deployed. **Caught by hitting the live endpoint before
merging the consumer — not by any test.**

`effective_to > ${now}` went through a `sql` template, which has no column
context, so the value skipped `PgTimestamp.mapToDriverValue` and reached the
driver as a raw `Date` rather than the ISO string Postgres needs. Measured from
the two forms' own `toSQL()`, not inferred:

| form | bound param |
| --- | --- |
| `gt(column, now)` | `[object String] :: 2026-08-28T13:21:28.000Z` |
| ``gt(column, sql`${now}`)`` | `[object Date] :: Fri Aug 28 2026 21:21:28 GMT+0800 …` |

Same family as the `sql<T>` lesson already in this vault: **a raw template is an
assertion with no mapper behind it.**

**Why nothing caught it.** The unit tests stub the executor, so they never reach a
driver, and CI has no Postgres. `npm run verify` was green on the branch, in CI,
and locally. Reproduced against a real driver on the local database — which turned
out to have both tables even though it has no rows — where the query threw too,
and returns `{"outcome":"NONE"}` after the fix.

The guard is the expiry predicate extracted as its own exported
`stillInEffect(now)`, so a test can assert the **bound type** without a database:
mapped is a string, unmapped is a `Date`. Falsified by restoring the `sql`
template.

> That is the most this repository can catch without a Postgres in CI, and it is
> worth saying plainly: **a stubbed executor cannot tell you a query runs.**

## 4. A page that had never touched the database got its first way to 500

Found in review of #221. `resolveCatalogFxRates` is called from the design-preview
page, whose only other inputs are fixtures — so adding the buffer read handed a
fixture-only page a database dependency. The second commit catches it and loses
the PHP estimates instead, the same trade `FundingBufferSection` already makes.

## Lessons

- **A hard-coded fallback beside a configurable field is a drift generator.**
  Deleting the constant is the fix; replacing it with a better constant is not.
- **A stubbed executor tests the mapping and never the query.** Part 86 said it
  about a `WHERE` predicate; this says it about parameter binding. Both shipped
  green.
- **Ship order between the two repositories is part of the change.** #221 before
  #187, stated in both PRs, and the degradation was designed before it was needed.

---
tags: [session, sals3-portal, suppliers, storefront, security]
aliases: [Storefront Feed Tenant Connection Session]
created: 2026-08-07
updated: 2026-08-07
status: historical
authority: session-note
owner_approved: false
related:
  - "[[hot]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[sals3-skills]]"
  - "[[sals3-session-2026-08-07-part15-multi-tenant-supplier-connections-and-ui-overhaul]]"
---

# Session: storefront feed moved off the global CJ key, the fabricated compare price removed, and the FX rate made self-updating

Historical record of what happened. Current verified state lives in
[[hot]] - read that for "what's true now," this note for "how it got
there."

## Scope

[[sals3-session-2026-08-07-part15-multi-tenant-supplier-connections-and-ui-overhaul]]
left one named gap: the customer-facing storefront feed
(`/api/storefront/*`, read by `sals3-ecommerce`) was still the last runtime
consumer of the legacy global `CJ_API_KEY` path, while the automation
pipeline and every seller-facing screen had already moved to the
tenant-scoped `CjSupplierAdapter`. Bogs picked this as the next unit. This
was implementation of already-approved ADR-006/ADR-008 direction, not new
policy.

Hard constraint: `sals3-ecommerce`'s Zod contract (`src/services/products.ts`)
must not change at all - `/products` returns the five-key object,
`/categories` a bare array, `/products/<slug>` `{product}` or a load-bearing
`404`, and any other non-2xx throws in the consumer.

## What got built

`src/lib/storefront/supplier-source.ts` - a headless resolver that finds the
Sals3 Official Dropshipper's own CJ connection (seller account ->
`CJ_DROPSHIPPING` provider -> connection -> workable-status check) and fetches
through the same `CjSupplierAdapter` `/products` uses. The three route files
needed **zero edits**: `cj-feed.ts` keeps its 5-minute TTL + in-flight-dedupe
cache and simply swaps which fetcher it wraps, and every failure is mapped to
a `CjApiError` the routes already turn into the existing 502 envelope.

Supporting changes:

- `src/lib/auth/identity.ts` - `SALS3_OFFICIAL_IDENTITY_ID`, now imported by
  the dev session, the bootstrap script, and the new resolver. The literal
  `'dev-user'` had been hard-coded independently in all three places.
- `WORKABLE_CONNECTION_STATUSES` / `isWorkableConnectionStatus` exported from
  `src/modules/suppliers/repository.ts`; `listWorkableConnections` and the new
  resolver share it. (Five other inline copies of this predicate remain - a
  noted follow-up, not done here.)
- Deleted: `src/services/cj/{token,products,enrichment}.ts` and
  `products.test.ts`. `enrichment.ts` had zero importers - dead code still
  sitting on the global-key path. `config.ts` stays (shared `CJ_BASE_URL`,
  `CJ_PAGE_SIZE`, `CjApiError`); its now-orphaned `CJ_LIST_REVALIDATE_SECONDS`
  went with them, and the `missing-credentials` user message was rewritten -
  it still told the reader to add `CJ_API_KEY` to `.env.local`, which is no
  longer how the feed is credentialed.
- `requirePermission('product:read')` was **dropped** from this path. It read
  the synthetic placeholder session, so on a machine-to-machine route it
  asserted nothing; the `SALS3_STOREFRONT_API_TOKEN` bearer check (already
  first in every handler) is the real gate, and tenancy is enforced by the
  tenant-scoped repository queries the resolver uses.

`CJ_API_KEY` is now read by exactly one thing in the repository:
`npm run bootstrap:cj`.

## Verified live, not assumed

Against the live CJ API and the live local database, through the real
endpoints with a real bearer token:

- `/products?section=deals` -> `200`, five-key object, real PHP prices.
- `/categories` -> `200` bare array. `/products/<slug>` -> `200 {product}`;
  bogus slug -> `404`.
- No auth header -> `401`. Every response keeps `Cache-Control: private,
  no-store`.
- Page 500 (the last advertised page) -> `200` with real products; page 501 ->
  `200 {"products":[],"total":10000,"page":501,"totalPages":500}` - the
  past-last-page grace working live, matching `emptyPastLastPage(501, 20)`
  exactly.

## Two findings worth keeping

**CJ's `MAX_PAGES = 500` cap is not arbitrary.** Probing `/product/list`
directly at `pageNum=9999` returns **HTTP 400** `{"code":1600300,"message":"the
max offset is 10000"}`. 10,000 max offset / pageSize 20 = 500 pages exactly.
Because that arrives as an HTTP-level failure rather than a body-level one, it
maps to `upstream-unavailable` -> 502, and the retired `fetchCjProducts` did
precisely the same thing (its page>1 grace only ever covered body-level `code
!= 200` responses arriving with HTTP 200). So the 502 past page 500 is
inherited behavior, not a regression - but the plan for this session had
predicted a 200 there, which was simply a wrong guess about which CJ failure
mode a deep page produces. Worth checking rather than assuming next time.

**A default export broke the bootstrap script at runtime.** See
[[sals3-skills]] lesson 63 - the constant was briefly a default export to
satisfy `import/prefer-default-export`, and the bootstrap script's tsx/esbuild
CJS interop handed it back a module namespace object, which stringified to
`"[object Object]"` and seeded a real seller account row under that identity.
Caught by inspecting the database after the script failed on a unique
constraint, not by any check. The row was deleted (it owned no connection) and
the export made named, with the rule disabled and the reason recorded in the
file.

## Second unit: the fabricated comparison price

Bogs directed this one after the migration was already committed, so it went on
its own branch off `develop` and its own PR — unrelated change, independently
reviewable and revertable.

`feed.ts` derived `oldPriceMinor` by marking the current price up 15% for the
deals section, so every deals card rendered `₱549.67 ₱632.12 -13%`. The
₱632.12 was the live price × 1.15 — not a price anything ever sold for. This
had been [[hot]]'s number-one active risk and an ADR-003 prohibition.

The fix turned out to need **no cross-repo contract change**, which was worth
checking before designing anything bigger: every `sals3-ecommerce` render site
(`ProductCard` home + catalog, `ProductPriceBox`) already gates the
strikethrough and the badge on `oldPrice.amountMinor > price.amountMinor`. So
making `oldPriceMinor` always equal `priceMinor` removes the claim entirely
while keeping the consumer's Zod schema (which requires the field, non-nullable)
satisfied. Removing the field instead would have meant schema, type, and
component changes across both repos for no additional honesty.

`toStorefrontProduct` lost its `section` parameter, since section only ever
selected the uplift; section still drives the deals ranking in
`toStorefrontProductFeed`. The test that asserted a deals compare price was
replaced by one asserting the opposite, so reintroduction fails CI, and
`feed.ts` carries a comment stating the field must never be derived from the
current price.

Verified live through the real consumer: 5 `.line-through` elements and 5
percent-off badges before, **0** of each after, with all 19 real prices still
rendering. (The screenshot tool hit the known non-compositing-pane condition
from lesson 59, so verification used DOM/`className` queries, which that lesson
established as the reliable signal there.)

Left open deliberately: with no discounts anywhere, the "Deals" band is now a
ranked selection rather than a savings claim, while the surrounding copy still
reads "Sals3 mid year sale / Ends 4 August, 23:59" — placeholder marketing text
in `sals3-ecommerce`, now also stale. Relabelling it is a product decision, not
one this work should assume.

## Third unit: the USD/PHP rate stopped being a hard-coded guess

Bogs asked whether the margin was hard-coded and whether the CJ price was
really being tracked. The honest answer split in two: the **CJ price is live**
(fetched per request behind a 5-minute cache), but the **conversion and the
markup were frozen**. `CJ_USD_TO_PHP_RATE` was a hand-typed `58` while the real
rate had moved to about `61`.

That gap was not cosmetic. Because the markup sits on top of a fixed
conversion, the drift came straight out of margin:

| | |
|---|---|
| Intended margin | 30% |
| Actual margin | ~23.7% |

Roughly ₱28 per unit on a ₱550 item, with nothing reporting it.

### What was built

`src/lib/storefront/fx.ts` fetches the **European Central Bank's** published
reference rate (via Frankfurter, falling back to `open.er-api.com`) and adds
`CJ_FX_BUFFER_PERCENT` on top — Bogs's own framing: *money-changer logic, but
a narrower spread*.

The buffer is the load-bearing idea, and it is worth restating because it is
easy to mistake for padding. A mid-market rate — what Google (sourced from
**Morningstar**), ECB, or any converter quotes — is a *wholesale* number nobody
can transact at. Paying CJ in dollars costs more than mid once the card or
wallet takes its own spread. Without the buffer, pricing is anchored to a rate
that does not exist for us.

ECB publishing **once per business day is a feature**: shopper prices move at
most daily instead of drifting all afternoon, which would be poor UX and a
displayed-vs-charged risk.

It fails safe, because pricing must never depend on a third party being up: a
4-second timeout per source, a second source, rejection of any rate outside
30–120 or more than 10% from the last known good, then last-good, then the
configured fallback — logging `[storefront-fx]` when it degrades, because a
stale rate silently costs margin. The mapping functions stayed pure and
synchronous; the rate resolves once at the route boundary, in parallel with the
CJ fetch, so it adds no latency.

### The buffer number was researched, not guessed

It shipped at 1.5% first, on Bogs's "babaan mo lang" direction. He then asked
for the actual evidence, which changed the answer:

| Payment rail | Cost above mid |
|---|---|
| PH credit card (BPI / BDO Elite) | **~1.85%** (1% card-network assessment + ~0.85% issuer FX) |
| PayPal | **3–4%** above wholesale |
| Wire transfer / Payoneer → CJ Wallet | bank rate + $10–20, **but CJ pays a 2–3% top-up bonus** |

So 1.5% was thin for a card and badly short for PayPal. Raised to **2.5%** on
Bogs's approval: it covers the card case plus room for movement between daily
ECB publications, and still sits under the 2–3% a money changer quotes. The
risk is asymmetric — under-buffering bleeds margin on every order, while
over-buffering costs the shopper ₱5.76 on a ₱585 item.

**The more valuable finding is not the buffer at all**: only Payoneer and wire
transfer can top up the CJ Wallet, and CJ pays a 2–3% bonus for doing so. If
orders are being paid per-transaction by card or PayPal, that spread is being
spent every time for no reason. Changing the payment route is worth more than
tuning the buffer, and it is recorded in the code comment and README so the
next person meets it.

Verified live end to end: the same product went ₱549.67 → ₱585.49 (1.5%) →
₱591.26 (2.5%), an implied rate of 62.389 = ECB spot 60.867 × 1.025, with
`sals3-ecommerce` parsing and rendering every price and no fx errors logged.

### Still not the real fix

This corrects **one input**. The 30% markup still excludes freight, payment
fees, returns, and duties, so it remains a flat markup where ADR-003 calls for
landed cost and contribution economics. That work is blocked on approving a
destination market, because freight is destination-specific. Getting FX right
makes a broken formula less broken; it does not make it right.

## Still open after this session

- The five remaining inline copies of the workable-status predicate.
- `CjTokenManager` still has no in-flight dedupe (the retired global token
  cache did) - concurrent cold-cache requests for one connection can
  double-reauthenticate and double-write the encrypted secret. The storefront
  cache in front of it collapses per-key concurrency, so this is a latent
  cost/rate-limit issue rather than a live bug.
- The storefront serves silently from a `DEGRADED` connection, matching
  `listWorkableConnections` policy. Whether ops should be alerted is an open
  question for Bogs.
- Everything ADR-008 still lists as unbuilt: a second provider, the commission
  ledger, payout statements, funding-hold recovery.
- **Which CJ payment route is actually in use.** The buffer is sized for a
  credit card; if it is really wire/Payoneer into the wallet, 2.5% is too fat
  and should come down. One CJ statement answers it.
- **The FX rate is not persisted.** It lives in an in-process cache, so each
  instance fetches its own and there is no record of which rate priced which
  order. Fine while nothing sells; needed for accounting once orders exist,
  and the natural pairing with ADR-007's immutable order snapshots.
- Whether **BSP** should replace ECB as the source. More defensible for PH
  accounting and BIR, but no clean public JSON endpoint was found to verify
  against, so ECB was chosen on evidence rather than preference.

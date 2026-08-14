---
tags: [sals3, sals3-portal, storefront, pricing, variants, bugfix, session]
aliases:
  - Storefront Variant Label
  - Retail Price Supplier-Cost Floor
  - Part 44
created: 2026-08-15
updated: 2026-08-15
status: implemented-merged
authority: session-record
owner_approved: true
implementation_status: merged-to-develop-ci-green
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[sals3-session-2026-08-11-part34-category-margin-and-fx-policy]]"
---

# Sals3 session 2026-08-15, part 44 — storefront variant labels, and a real below-cost pricing bug fixed

`sals3-portal`, branch `feat/storefront-variant-label`, commit `c7d4441`, merged
via [PR #78](https://github.com/Sals3-Official/sals3-portal/pull/78) (merge
commit `fb2f730`, 2026-08-15). Bogs did this work locally, then asked for it to
be committed, pushed, documented, and — after this note was first written —
merged once the repo's own `verify` GitHub Actions run and Vercel deployment
both came back green.

> [!NOTE] A second, unrelated PR landed on `develop` in between
> `sals3-portal` [PR #77](https://github.com/Sals3-Official/sals3-portal/pull/77) — AJ's fix for a Product Sourcing checkbox that
> was also opening the candidate drawer — merged 11 minutes before this PR did, so
> `develop` moved through it on the way to `fb2f730`. Unrelated to this session's
> work; recorded in [[hot]] directly since the PR's own description is already a
> complete record, not repeated here.

## What was built

### 1. Supplier variant labels reach the storefront

The storefront product feed now carries each variant's supplier-reported
label — e.g. `Black-1XL` — verbatim, through a new optional `label` field on
`StorefrontProductVariant`.

- **Source**: `provider_variant_references.source_option_label`, read via a
  `leftJoin` in `read-model.ts`'s `loadPublishedVariants`. `left`, not `inner`,
  because a hand-created variant has no provider reference row and must still
  be returned. Safe to join without inflating row counts because
  `provider_variant_references_variant_key` is a unique index on
  `variant_id` — at most one row per variant.
- **Never parsed into option axes.** Deciding which token in `Black-1XL` is a
  colour and which is a size is a guess, and a wrong guess becomes a
  customer-facing product attribute. The label is carried as one opaque
  string, always.
- **Truncated at 60 characters**, in `catalog-feed.ts`, the single authority
  for what the wire carries — the same discipline already applied to `title`.
  A whitespace-only label is dropped entirely (`read-model.ts`) rather than
  serialised as a present-but-blank value.
- **Cache key bumped `v1` → `v2`** on the product-detail read
  (`catalog-cache.ts`). Without the bump, entries already cached under `v1`
  would keep serving label-less variants for up to `REVALIDATE_SECONDS` after
  deploy — reading as "the feature didn't ship" when it actually did. Only
  this one key moves; the feed and categories row shapes are unchanged, so
  their warm cache entries aren't discarded for nothing.
- This is genuinely unreviewed supplier text reaching a buyer, with no
  analogue of [[ADR-011-product-media-source-selection-and-supplier-original-preservation]]'s
  media review gates yet. Expect `default`, CJK characters, and junk labels
  from some suppliers — truncation is the only guard today.

### 2. A real production bug found and fixed: retail price below supplier cost

**The seller-retail-price path** (added in
[[sals3-session-2026-08-11-part34-category-margin-and-fx-policy]]'s era of
publish work) **skips `resolveProductPricing` entirely**, since it lets a
seller manually type a price rather than have the resolver compute one. Before
this session, the only check on that manually-typed price was `amountMinor >
0` — no floor against what the product actually costs.

**Live evidence this was a real, not hypothetical, problem**: as of
2026-08-14, a corduroy jacket on the live storefront was priced at **US$4.51**
against a **US$5.80** supplier cost — a genuine per-unit loss, before freight,
being advertised as the retail price.

**Fix**: `publishProduct` (`src/modules/catalog/products/publish.ts`) now
returns a new refusal reason, `RETAIL_BELOW_SUPPLIER_COST`, in two cases:

1. The seller-entered price and the supplier cost are in different currencies
   with no approved conversion on this path — refused rather than converted at
   an invented rate, which is exactly the flat-markup failure
   [[ADR-003-international-availability-shipping-and-pricing]] prohibits.
2. The seller-entered price is strictly below the supplier cost in the same
   currency — refused, naming both figures in the detail message (e.g.
   `Retail price USD 5.00 is below the supplier cost USD 7.96 for SKU-123`).

Deliberately **not** a cost-plus-margin rule: that would need an approved
category policy, and a product reaching this branch usually has none — that's
*why* the resolver was skipped for it in the first place. This refuses the
provable loss and leaves the margin question to the resolver where one exists.

`publish-actions.ts`'s own doc comment previously claimed the server action's
input "carries no price or currency" and that every such value comes from the
pricing resolver — no longer true once seller retail prices were accepted,
and the claim was load-bearing (it read as "a client cannot influence price").
Corrected to name `variantRetailPrices` as the deliberate exception, bounded by
`positive()`, the seller's own `product:publish` permission, and this new
supplier-cost floor.

`PublishProductButton.tsx` gained the matching user-facing message: *"A retail
price is below what the supplier charges. Raise it to at least the supplier
cost before publishing."*

### 3. A caret-jumping input bug, fixed along the way

The retail price cell in `VariantPricingTable.tsx` was a fully controlled
`<Input type="number">`: every keystroke round-tripped the value through minor
units and back through `minorToDecimalString`, so typing `12` rendered `1.00`
and put the caret after it — the next digit landed in the wrong place. In
practice the only reliable way to move the number was the spinner arrows.

Extracted into its own component, `RetailPriceInput.tsx`: the visible string
is now local state, seeded from the prop and synced back only when the field
is **not focused** — the one condition under which reformatting can't fight
someone mid-keystroke. `type="text"`/`inputMode="decimal"` replaces
`type="number"`, since a number input silently discards intermediate states
like `4.` and `.5`. The supplier-cost floor is shown inline (red border, `Below
{cost} cost` message) as the seller types — advisory only; `publish.ts`'s
refusal above is the actual enforcement, since a disabled control is never an
authorization check and this value reaches the server through a Server Action
regardless of what the UI shows.

## Verification

`npm run verify` — lint, format, clean typecheck, build, unit tests, and e2e
all green: **166 test files / 1,499 unit tests passed** (4 skipped,
pre-existing), **78 e2e passed / 5 skipped**. New coverage:

- `catalog-feed.test.ts` — label carried verbatim; omitted when the supplier
  reported none; truncated to exactly 60 characters rather than failing the
  whole product.
- `publish.test.ts` — refuses a price below cost and names both figures;
  allows a price exactly at cost (zero margin is the seller's call); allows
  above cost; refuses when currencies can't be compared at all, naming both
  currencies.
- `contract-fixture.test.ts` and `test/fixtures/storefront-product-detail.json`
  updated with real `label` values on both fixture variants.

One unrelated e2e test (`catalog-shortlist.spec.ts` — "Qualified Products
defaults to Ready") **flaked twice** under the repo's pre-commit/pre-push
hooks, which run the full suite at 10 parallel workers; reproduced **passing
cleanly** standalone at 1 worker both times. Not touched by this diff (it
exercises an old route-redirect, unrelated to pricing or variants) — recorded
here as a known timing sensitivity under parallel load on this machine, not a
regression.

## Local environment notes worth keeping

- The repo's `typecheck:clean` script renames `.next` to a temp path before
  running `tsc`, and failed with `EPERM` twice during this session because
  something (a leftover `next dev` process, or Windows still flushing a
  just-finished `next build`'s file handles) briefly held the directory open.
  `rm -rf .next` before retrying cleared it each time — a disposable build
  cache, not source, safe to delete.
- A stray `next dev` process from an earlier session was found squatting on
  port 3001, blocking Playwright's own dev server from starting for
  `test:e2e`. Confirmed via `tasklist` that it was a plain orphaned `node.exe`
  before asking Bogs for confirmation and killing it.
- Both `pre-commit` and `pre-push` hooks in this repo run the **full**
  `npm run verify` (not just lint-staged) — each attempt takes several
  minutes; budget for that rather than assuming a quick commit.

## What is still not done

- ~~PR #78 is open, not merged~~ **Merged 2026-08-15** — `verify` GitHub Actions and Vercel deployment both green beforehand; merge commit `fb2f730`.
- No cost-plus-margin enforcement on the seller-retail-price path — only the
  supplier-cost floor. A real category pricing policy (see
  [[sals3-session-2026-08-11-part34-category-margin-and-fx-policy]] and
  ADR-015) would let this path route through the resolver instead, but that's
  a separate, larger piece of work.
- No review gate on supplier variant labels analogous to ADR-011's media
  review — a supplier could still label a variant with junk or non-Latin text
  and it reaches the storefront verbatim (truncated, not filtered).
- This is one branch, not a systematic audit: other listings besides the
  corduroy jacket that found this bug were not swept for the same below-cost
  condition. Worth asking whether a one-off query against production is
  warranted to check for other live below-cost offers created before this fix
  shipped.

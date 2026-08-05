---
tags: [session, sals3, pdp, products, cj-dropshipping, bugfix]
aliases: [PR21/PR22 Reconciliation and CJ Bugfixes Session]
created: 2026-08-06
updated: 2026-08-06
status: session-record
authority: implementation-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[sals3-skills]]"
  - "[[sals3-session-2026-08-05-part05-product-detail-page]]"
  - "[[sals3-session-2026-08-05-part09-ui-ux-pro-audit]]"
---

# Session: PR #21/#22 Reconciliation and Three Real CJ-Data Bugs

> [!IMPORTANT] Summary
> Merged Bogs's PDP/cart/guest-header PR (#21) against AJ's real `sals3-portal` backend PR (#22), which landed on `develop` while #21 was still open. Reconciling the two surfaced a real schema conflict (DummyJSON shape vs. the real CJ-backed shape), then three separate, real production bugs once real data started flowing — each looked at first like it might be the others, and two of three initial hypotheses were wrong before the actual root cause was found.

## Starting state

- PR #21 (`feat/pdp-cart-guest-header-ux-audit`): PDP, guest header, cart — built against DummyJSON, per [[sals3-session-2026-08-05-part05-product-detail-page]] through [[sals3-session-2026-08-05-part09-ui-ux-pro-audit]].
- PR #22 (`feat/products`, AJ, merged to `develop` mid-session): removed the Sals3 fixture catalogue from `sals3-portal`; `sals3-ecommerce`'s `products.ts` rewritten to call the real, protected `sals3-portal` storefront API instead of DummyJSON.
- These two evolved in parallel without either side aware of the other's exact shape.

## Reconciliation (PR #21 → merged, `232a2b9`)

`git merge develop` into the PDP branch produced real conflicts in `products.ts` — not just text conflicts, a genuine schema gap. AJ's real `StorefrontProductSchema` only carries `id`, `slug`, `title`, `priceMinor`, `oldPriceMinor`, a single `imageUrl`, `imageAlt`, `ratingLine`, `shipLine`, `category` — no `images[]` gallery, `reviews[]`, `description`, `brand`, `stock`, `returnPolicy`, or `warrantyInformation`, all of which the DummyJSON-era PDP depended on.

Bogs's call: cut the PDP down to only what the real backend actually returns, rather than keep any DummyJSON-shaped field. Removed `ProductReviews.tsx`, `ProductFulfillmentCard.tsx`, `product-detail.test.ts` (tested only the now-deleted `starsLine`/`formatReviewDate` helpers). Added `fetchProductBySlug()`/`fetchProductsByCategory()` to `products.ts` as a stopgap, since the real backend had no single-product or category-filter route — both paged through the `for-you`/`deals` section list and matched client-side. **Known regression, flagged at merge time**: no stock signal in the real backend at all, so Add to Cart/Buy Now could no longer be disabled for an out-of-stock item.

Verified 0 removed lines from AJ's `fetchProducts`/`fetchProductCategories` (`git diff origin/develop -- src/services/products.ts | grep -c '^-'` → `0`) and 0 diff on `page.tsx`/`ProductCard.tsx`/`next.config.ts` before merging, so AJ's already-shipped home-page wiring was provably untouched.

## Bug 1 — client-side product search could hammer CJ's rate limit (PR #24, merged)

Clicking a real product link on the deployed Vercel site 404'd. `sals3-portal`'s own `fetchCjProducts()` documents "CJ allows only one call per second" and caps pagination at 500 pages — the stopgap `fetchProductBySlug()`/`fetchProductsByCategory()` from the merge above could recurse through up to 500 pages × 2 sections looking for one product, hammering that limit for no guaranteed match.

**Fix**: hard-capped both to `MAX_CLIENT_SIDE_SEARCH_PAGES = 2` pages/section, sections searched sequentially (not `Promise.all`) so the very first pages of both sections don't fire concurrently against the 1/sec ceiling. Known, accepted regression: most real products still won't be found this way until `sals3-portal` gets a real lookup route.

## Bug 2 — no single-product lookup existed upstream (PR #2 on `sals3-portal`, open)

Read `sals3-portal`'s actual source (cloned locally) rather than guessing: CJ's own, already-used `/product/list` endpoint (`https://developers.cjdropshipping.com/api2.0/v1/product/list`) accepts a `pid` filter parameter per CJ's own docs — never wired up. Added `cjPid` through `cjQuerySchema` → `buildUrl()` → a new `GET /api/storefront/products/[id]` route that resolves one product in a single upstream call, no pagination needed. `sals3-ecommerce`'s client isn't switched over to call this yet — pending that PR merging first.

## Bug 3 (turned out to be a red herring, kept as defense-in-depth) — `totalPages` self-correction (PR #3 on `sals3-portal`, open)

`/?page=19` on the deployed site lost both real photos and pagination entirely. Hypothesis at the time: `fetchCjProducts()`'s `totalPages` (capped at `MAX_PAGES=500`) doesn't reflect how many pages are actually reachable for a given query, and a too-deep page throws instead of degrading. Shipped a fix: self-correct `totalPages` to `page - 1` when a deep page comes back empty or errors in the body, rather than throwing. **This turned out not to be the actual cause of the page=19 incident** (see Bug 5) — CJ's real catalogue for this query has ~1.49 million products, so page 19 was always reachable — but it's still a real, valid defensive improvement for the day CJ's depth genuinely runs out, kept in its own PR rather than reverted.

## Bug 4 — a for-you failure discarded the already-fetched deals section (PR #25, merged)

While investigating Bug 3, found `getHomeProducts()` ran the deals fetch *inside* the for-you fetch's `try` block — a for-you-specific failure threw before deals was even attempted, discarding an unrelated, already-independent section. Split into independent `try`/`catch`es (`getForYouProducts()` extracted) so one section's failure can't take the other down. This fix's value held up even after Bug 5 was found — it's real defense-in-depth regardless of what causes a for-you failure.

## Bug 5 — the actual root cause (PR #26, open)

Page=19 kept failing even with Bug 3's fix live locally and a working local `sals3-portal`. Direct `curl` against the local portal API for the exact same query succeeded with real data — ruling out both the rate-limit and catalogue-depth hypotheses outright. Added temporary `console.error` logging in `getForYouProducts()`'s catch block and caught the real error on the next request:

```
ProductsApiError: Storefront products API returned invalid data.
ZodError: "title" ... Too big: expected string to have <=120 characters
          "imageAlt" ... Too big: expected string to have <=160 characters
```

Real CJ product titles routinely exceed 120 characters (long marketing-style names); `imageAlt` mirrors `title` so exceeds 160. `ProductsResponseSchema.safeParse()` rejects the **entire page** when any single product in the 14-item array fails validation — one long real title anywhere in the page took the whole "for you" section down. This is the actual root cause of every "page N loses everything" report this session, not Bugs 1 or 3.

**Fix**: `title` and `imageAlt` now truncate to their display length via a `truncatedText()` transform instead of being rejected — matching the graceful-degradation approach `sals3-portal`'s own `src/lib/cj/schemas.ts` already documents ("one changed or missing value degrades a single cell instead of failing the page"). `sals3-ecommerce`'s schema was the one place still doing the opposite.

## Not a bug — some real products have no photo

Separately reported: some product cards on deep pages show a colored placeholder block instead of a photo. Verified directly against the real API: those specific products have `imageUrl: null` from CJ itself (not host-filtered — genuinely no usable image upstream). The placeholder block is the correct, honest fallback (`ProductImagePlaceholder`), not a bug — real dropship catalogues don't have a curated photo for every listing.

## Local dev environment now has a working real backend

`sals3-portal` cloned locally to `E:\sals3-portal` (sibling to `E:\sals3-ecommerce`) with real CJ credentials in its own `.env.local` (gitignored, never committed), running `npm run dev` on port 3001 alongside `sals3-ecommerce`'s port 3000. This is the first time this session's local dev environment shows real CJ photos and data end-to-end, not just the placeholder fallback. Both must be running together; see the "Running two dev servers" note added to this vault's runbook context via [[hot]].

## PRs from this session

| Repo | PR | Status | What |
| --- | --- | --- | --- |
| sals3-ecommerce | #21 | merged | PDP/cart/guest-header, reconciled against real backend |
| sals3-ecommerce | #24 | merged | Cap client-side product search at 2 pages/section |
| sals3-ecommerce | #25 | merged | Decouple deals/for-you fetch failures |
| sals3-ecommerce | #26 | merged | Truncate overlong title/imageAlt instead of rejecting the page |
| sals3-ecommerce | #28 | merged | Switch `fetchProductBySlug()` to `sals3-portal`'s real single-product endpoint |
| sals3-portal | #2 | merged | Single-product lookup via CJ's `pid` filter |
| sals3-portal | #3 | merged | Self-correct `totalPages` past CJ's real depth (defense-in-depth) |

All seven PRs from this session merged the same day.

## Update — PR #28: switching to the real single-product endpoint

Once `sals3-portal` PR #2 merged, `fetchProductBySlug()` was rewritten to call
`GET /api/storefront/products/<slug>` directly instead of PR #24's capped
page-scan stopgap. Verified live against the real local `sals3-portal`
instance set up earlier in this session: a product page that previously
needed the scan (and 404'd for most real products past page 2 of a section)
now resolves in a single request — 2.8s vs. 8–10s under the old scan. The
"most real products 404 on their own detail page" regression noted at the
PR #21/#24 merge is lifted. `fetchProductsByCategory()` (related products)
is unchanged — still the capped stopgap, since `sals3-portal` has no
category-filter endpoint yet.

## Verification

Every PR above: `npm run lint`, `format:check`, `typecheck:clean`, `build`, `test:run`, `test:e2e`, `npm audit --audit-level=high` — all passing at merge time. Several PRs' e2e runs required temporarily hiding `.env.local` to match true CI conditions (no real backend configured), since the repo's own Husky hooks run full `verify` unconditionally and would otherwise test against the now-real local backend instead of the no-backend-configured condition the e2e suite assumes (see [[sals3-skills]] entry 30).

## Lessons

See [[sals3-skills]] entries 26-30 for the reusable lessons from this session (root-cause verification discipline, Zod array-schema all-or-nothing rejection, diffing to prove a merge didn't remove someone else's code, checking upstream API docs before assuming a new endpoint is needed, and matching CI conditions when a local `.env.local` changes hook behavior).

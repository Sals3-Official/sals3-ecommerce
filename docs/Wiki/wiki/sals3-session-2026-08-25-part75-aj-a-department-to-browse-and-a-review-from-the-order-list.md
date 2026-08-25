---
tags:
  [
    sals3,
    session-note,
    sals3-portal,
    sals3-ecommerce,
    storefront,
    catalog,
    browse,
    reviews,
    orders,
    neon,
    aj,
  ]
aliases:
  - Part 75
  - AJ Department Browse and Order-List Reviews
  - The Route Every Tile Pointed At
created: 2026-08-26
updated: 2026-08-26
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[storefront-product-contract-v2]]"
  - "[[sals3-session-2026-08-24-part72-aj-storefront-search-across-both-repositories]]"
  - "[[sals3-session-2026-08-25-part74-the-published-product-that-could-not-be-edited]]"
  - "[[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux]]"
---

# Part 75 — AJ: the route every tile pointed at, and a review from the order list

Written from the merged pull requests rather than from the working session — AJ
built this, and this note exists so the vault carries it. Four merges across two
repositories, **no migration in any of them**.

- `sals3-portal` [#181](https://github.com/Sals3-Official/sals3-portal/pull/181) — `GET /api/storefront/categories/{slug}/products`
- `sals3-portal` [#183](https://github.com/Sals3-Official/sals3-portal/pull/183) — Neon cold-start budget, and two review gaps on that endpoint
- `sals3-ecommerce` [#155](https://github.com/Sals3-Official/sals3-ecommerce/pull/155) — the `/c/[slug]` browse page
- `sals3-ecommerce` [#161](https://github.com/Sals3-Official/sals3-ecommerce/pull/161) — rate and review a delivered order from the list

## Every `/c/<slug>` link on the site pointed at a route that did not exist

Home category tiles, the *All departments* list, the footer — all of them linked
to a department page nobody had built. The storefront half (#155) is that route:
published products of one L1 department, with a filter sidebar, sort, grid/list
view, and pagination.

**The filter narrows in SQL, not JavaScript.** The old path could never have
worked here — it scanned two feed sections and matched on `product.category`,
which is the **leaf** taxonomy row (`cat-ggl-5079`), while a browse URL names an
**L1 department** (`animals-pet-supplies`). The portal endpoint (#181) filters
against the same `publishedScope()` the rest of the catalogue is gated by.

**Absent controls say why they are absent.** The source design had a
buyer-rating filter; `ratingLine` is deprecated on the storefront contract and
no published product carries a rating, so the control would have filtered on
nothing. It appears in the sidebar's *"Not filterable yet"* note instead, beside
Brand, Ships from and Discount, **each with its real reason**. Same discipline
as part 72's deleted "Search 1,500,000 products" — a control that cannot work is
removed and explained, not rendered inert.

**List state is the URL**, parsed and built with the same
allow-list-not-sanitise discipline `lib/orders/query.ts` uses; defaults drop out
so one view has one address. Only the price radios and the sort select are
client components.

### The endpoint was missing in production while the page shipped

#181's own evidence, taken against production before the change:

```
GET /api/storefront/categories/baby-toddler/products?page=1&limit=24  → 404 (HTML)
GET /api/storefront/products?page=1&limit=1                          → 200
GET /api/storefront/categories                                       → 200
```

The browse page had been showing *"Baby & Toddler can't be loaded right now"*
with an empty grid and every price-band count stuck at `0`. **The storefront was
not at fault** — it treats a producer `404` on a department it has already
allow-listed as deployment skew rather than a real not-found, which is the
honest reading and is why the page said "can't be loaded" rather than "no
products".

## A connect timeout shorter than a database resume

#183 is the follow-up, and its first finding is the one with the widest blast
radius: `CONNECT_TIMEOUT_SECONDS` was **10**, and Neon suspends an idle compute
so the connection that wakes it pays for the cold start. Measured: a warm
connect is 1.4–2.5s, a **cold one routinely passed the 10s budget**.

So the first request after any quiet period failed with `CONNECT_TIMEOUT` and
**every storefront route answered 503** — `/products` and `/categories`
included, not only the new one. That is the request a real visitor makes, and it
also made #181's endpoint look broken while the database was reachable the whole
time.

Raised to 30s, which bounds a genuinely stuck connection rather than a slow one:
it cannot make a request fail that would otherwise have succeeded.

**Worth keeping as a pattern.** Two separate investigations in two days —
part 72's e2e test that was really asserting the portal was up, and this — were
both *"the new thing looks broken"* where the new thing was fine and something
underneath it was answering for the whole system.

## A review from the order list, and a rationale that was rewritten rather than left standing

#161: a buyer can rate and review a delivered item **from the order list**, in a
modal, instead of only from the route one click deeper. Owner decision
2026-08-25, built from the Shopee *Rate Product* pattern supplied with the
request. One `Rate & review` button in the card footer opens a dialog holding
every open line in that order — photo, required 1–5 stars, optional
1,000-character body, one *show my name* tick — then redirects to
`/orders?lane=completed&posted=n` with the same success toast the cart uses.

**The interesting part is what happened to the old comment.**
`review/[lineId]/page.tsx` carried a section titled *"Its own route, not a
modal"*, arguing that a review is long enough to lose to an accidental
dismissal. That is true of a dialog that owns its draft. `RateReviewButton` owns
it instead and does not unmount when the dialog closes, so Escape and a backdrop
tap cost the buyer nothing and reopening restores what they typed. **The comment
was rewritten rather than left standing** — a false rationale is exactly the
failure mode part 71 called out, and this is the first time the vault has a
record of one being retired on purpose.

**The route is not dead code.** It is still the only path that works with
JavaScript off, still what the detail page's per-line control links to, and
still the one whose back button behaves. Both post through the same
`reviewItemSchema` and the same portal endpoint, so **neither can accept a
review the other would refuse**.

**Eligibility stays the portal's.** `line.reviewable` is the portal's answer
(the line's own parcel `DELIVERED`, inside the window, not already reviewed);
`reviewableLinesOf` only reads it, a written review wins over a stale flag, and
the portal re-decides in a single `WHERE` on submit and answers `404` for
anything it refuses. The button can be legitimately absent, and a hand-made
request gains nothing.

## Verification, as reported on the pull requests

- **#155**: `npm run verify` green on the rebased branch — 815 unit tests, 47
  e2e, 10 of them new in `e2e/category.spec.ts`. Exercised against live data on
  both viewports: filters, sort, grid/list, chips, pagination, empty department,
  filtered-empty, and the 404.
- **#155** also fixed the harness itself: `playwright.config.ts` takes
  `PLAYWRIGHT_HOST`, because a hand-started `next dev` binds `localhost` and over
  `127.0.0.1` the RSC stream never arrives — the suite had been driving a page
  that never hydrated.

## Known limitation, recorded by AJ and still true

**Several live products are miscategorised at source** — an *Aquarium Lighting*
row that is actually a selfie light, a bike rack under *Baby & Toddler*. The API
returns what the catalogue says; **the filing is wrong upstream in the portal**,
not on the browse page. Nothing in these four PRs addresses it, and a department
page is exactly the surface that makes it visible to a buyer.

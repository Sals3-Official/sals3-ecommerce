---
tags: [sals3, session, storefront, sals3-portal, sals3-ecommerce, e2e, cj-dropshipping, points]
aliases:
  - Part 130
  - A Category Gets Its Own Photo
  - The Browser Stops Spending Points To Run A Test
created: 2026-09-04
updated: 2026-09-04
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-session-2026-08-30-part112-every-breadcrumb-level-becomes-a-link]]"
  - "[[hot]]"
---

# Part 130 — a category's own photo, and a browser that stopped spending points to run a test

> [!NOTE] Provenance
> Written 2026-09-04, after the fact, from `anythingsupplies/sals3-portal`
> PR #37 and #42's own merged record. No new testing was performed to
> produce this note.

| PR | Repo | Title | Merged |
|---|---|---|---|
| [#37](https://github.com/anythingsupplies/sals3-portal/pull/37) | `sals3-portal` | feat(storefront-api): give a category its own product photo | 2026-09-03T17:27:46Z |
| [#42](https://github.com/anythingsupplies/sals3-portal/pull/42) | `sals3-portal` | fix(e2e): stop the supplier browser spending CJ points on every test run | 2026-09-03T18:33:18Z |

No DDL. Two unrelated fixes merged the same afternoon; grouped into one note
because neither is large enough to carry its own, matching the pattern
[[sals3-session-2026-08-31-part118-the-magic-number-that-caused-the-scrollbar-it-was-fixing|part 118]]
already used for small same-day defects.

## 1. A category tile stops borrowing its parent's photo (#37)

`?scope=stocked-tree` on `/api/storefront/categories` now carries `imageUrl`
on every department **and** every child — the newest published product's own
primary photo. Before this, a category tile with no picture of its own drew
the parent department's photograph instead, so under Apparel & Accessories
the same folded shirt appeared on Clothing, Clothing Accessories, Shoes,
Handbags, and Jewelry — five tiles, one picture. Reported by the owner on
SIT: *"kala ko real images ng product gagamitin dito? haha."* It read as
broken because it was.

Two choices worth recording:

- **Reuses `primaryImageUrl`**, the product card's own subquery, rather than
  re-reading `product_media_sources`. That expression already encodes
  approved review state, rights basis, buyer visibility, and
  seller-arrangement photo ordering; a second copy of those rules here would
  drift, and the failure mode of drift is a category tile showing a photo the
  product card beside it refuses to show.
- **`array_agg(... order by published_at desc) filter (...)` then `[1]`, not
  `min()`.** `min()` picks the alphabetically smallest URL — arbitrary, and
  *stably* arbitrary, so the same odd photo would represent the category
  forever. Newest-first means the tile follows current stock.

`null`, never borrowed, when nothing in the category has a photo that passed
review — the storefront falls through to the same placeholder a product card
uses. Consumer: `sals3-ecommerce` [#11](https://github.com/anythingsupplies/sals3-ecommerce/pull/11);
the field is optional on the wire, so an older storefront ignores it.

**Verification note worth keeping**: lint/format/typecheck/build and 3,878
unit tests were green; the e2e leg failed one spec
(`cj-products.spec.ts:113`, a live CJ rate-limit timeout) that turned out to
be the exact defect #42 fixes, caught in the act rather than described
secondhand.

## 2. The e2e suite stops spending CJ points to prove a label is right (#42)

Every render of `/products` fires one live CJ `/product/list` call for 200
products — the endpoint CJ charges most per call — and the e2e suite visits
that route several times a run. Four `npm run verify` runs in one day
exhausted the shared CJ rate limit and timed an unrelated spec out at 30s; it
read as a flake and was not one. **CI never paid for this** — CI has no CJ
connection, so the page returns before any supplier call fires; only a
developer machine with real credentials ever spent anything, which is why
nothing surfaced it sooner.

Neither the spec nor the page was actually wrong: `expectLoadedOrReported`
already accepts *"CJ is limiting requests right now"* as a pass, and
`loadLiveBrowsePage` already checked the local throttle **before** the
supplier call. The gap was narrower — nothing told a real-credentialed
machine not to make the call at all.

`PORTAL_TEST_NO_SUPPLIER_CALLS`, set by `playwright.config.ts` on the test
server, makes `loadLiveBrowsePage` return **before it touches CJ — and
before it touches the database**, which is what makes it a switch rather
than an optimisation (there is a test asserting the database is never
asked). Guarded exactly like the pre-existing `PORTAL_TEST_AUTH_BYPASS`:
refused outright when `NODE_ENV` is production, with its own test, so a
misconfigured deployment cannot switch the supplier off for real sellers.
It gets its own `no-connection`-adjacent error state rather than reusing an
existing one — `no-connection` would falsely tell a connected seller to
connect an account, `unavailable` would falsely claim CJ did not answer a
question nobody asked.

This is the concrete enforcement gap [[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]
§5 named and left unbuilt — *"an automated check that fails when local
test/script code imports the CJ adapter"* did not exist, and this is the
first fix in that direction, scoped to exactly the one route the e2e suite
actually renders.

**Verification, read past the green numbers**: `tsc --noEmit`, lint, and
3,882 unit tests were green locally, but `typecheck:clean` and `test:e2e`
**could not run on this machine at all** — a dev server already holding
port 3001 blocked both. Hooks were skipped with the owner's approval for
that specific reason, recorded rather than smoothed over; CI, which does not
have that port conflict and exercises the exact suppressed-call path plus
the new heading the spec now accepts, was the real gate for this PR.

## What was not done

- #37 does not backfill photos for existing categories retroactively beyond
  what `primaryImageUrl`'s own live join already returns.
- #42 suppresses exactly one call site (`loadLiveBrowsePage`); it is not the
  adapter-level runtime refusal ADR-017 §5 still lists as unbuilt, and does
  not claim to be.

## Lessons

- **A flaky-looking e2e failure caught mid-review can be the exact defect a
  parallel PR is about to fix** — #37's own verification run hit the
  CJ-rate-limit timeout #42 explains and fixes, in the same afternoon,
  before either PR had read the other's diagnosis.
- **The cheapest fix for a shared-budget spend problem is a switch that
  returns before the call, not a smarter retry or a cache** — the same shape
  as ADR-017's own `PORTAL_TEST_AUTH_BYPASS` precedent, reused rather than
  reinvented.

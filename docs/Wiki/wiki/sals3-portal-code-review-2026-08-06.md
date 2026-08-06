---
tags: [sals3, sals3-portal, code-review, cj-dropshipping, bug, storefront-api]
aliases: [Portal Code Review, sals3-portal Bug List]
created: 2026-08-06
updated: 2026-08-06
status: current-state
authority: code-review
owner_approved: false
related:
  - "[[sals3-cj-dropshipping-integration-plan]]"
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[agent-operating-contract]]"
  - "[[hot]]"
---

> [!NOTE] Provenance
> A read-only code review of `sals3-portal` (local clone `E:\sals3-portal`, GitHub `Sals3-Official/sals3-portal`) requested by Bogs on 2026-08-06. Findings were validated against local commit `95c8b73` on branch `fix/restore-production-build-missing-cjpid-in-tests`; record a new SHA if they are rechecked later. Nothing was fixed in this documentation task.

# sals3-portal Code Review — 2026-08-06

Seven findings from reading `sals3-portal`'s CJ integration and storefront-API code directly (`src/lib/`, `src/services/`, `src/app/api/storefront/`). Ranked most to least likely to visibly affect `sals3-ecommerce` today.

## 1. Storefront feed pagination doesn't match the CJ page size

**File:** `src/app/api/storefront/products/route.ts`

`query.page` (validated `1`–`10,000`, any value) is passed straight through as `cjPage` to `fetchCjProducts`, but CJ's page size is fixed at `CJ_PAGE_SIZE = 20` (`src/services/cj/config.ts`) while the storefront's own `limit` param accepts `1`–`30`. At `limit=14&page=2`, CJ page 2 returns items 21–40, then `.slice(0, 14)` keeps 21–34 — items 15–20 are never reachable on any page. At `limit=30`, more than CJ's 20-item page can ever satisfy. The `totalPages` returned is CJ's `total/20`, not `total/limit`, so the reported page count doesn't match what the storefront can actually page through.

**Fix direction:** either expose a fixed storefront `limit=20`, or implement correct offset/multi-page fetching so every requested page is contiguous. Allowing another multiple of 20 without multi-fetching does not solve the gap.

## 2. Single-product lookup depends on undocumented CJ filter behavior

**File:** `src/app/api/storefront/products/[id]/route.ts`

The `id` this route receives is a slugified form of the CJ `pid` (lowercased, non-alphanumeric collapsed to `-`). It's passed as-is to CJ's `pid` filter, then the result is matched case-insensitively client-side as a safety net. The code's own comment admits this: *"CJ's `pid` filter is documented as an exact-identifier filter... case-insensitively rather than trusting CJ's filter alone."* If CJ's filter is actually case-sensitive on a mixed-case `pid`, this always 404s regardless of the client-side matching, since the wrong-cased query would never return the row to match against in the first place.

**Fix direction:** verify CJ's actual filter behavior on a real mixed-case `pid`, or store the original-cased `pid` alongside the slug so the lookup never has to guess a casing.

## 3. Unbounded cache growth in the storefront CJ cache

**File:** `src/lib/storefront/cj-feed.ts`

The `cache` `Map` is keyed by `${cjPage}:${cjSearch}:${cjPid}` with a 5-minute TTL, but entries are only evicted lazily (checked and replaced on next request for the same key) — never swept proactively. Since `cjPid` is part of the key and comes from the PDP's URL, every distinct product ID requested adds an entry that remains until the same key is touched again. This is unbounded within a long-running process; short-lived/serverless process recycling may limit, but does not correct, the design.

**Fix direction:** a size cap (LRU eviction) or a periodic sweep of expired entries.

## 4. Dead reset logic in the shared query-string helper

**File:** `src/lib/portal/search-params.ts`

`buildQueryString`'s page-reset rule explicitly deletes a key named `'page'` whenever any other param changes without an explicit `page` value: `if (changedOtherThanPage && patch.page === undefined) { next.delete('page'); }`. But the portal's actual pagination param is `cjPage`, not `page` — this key never exists in the portal's own query strings, so the reset never fires. `CjSearchInput.tsx` already knows this and compensates manually, passing `cjPage: null` itself on every search change. The helper's own documented contract ("changing a filter resets the page") is silently false for its only current caller.

**Fix direction:** either parameterize the reset key, or drop the dead `page`-reset branch since it's currently unreachable.

## 5. "Deals" ranking only ever sees one CJ page

**File:** `src/lib/storefront/feed.ts`, `toStorefrontProductFeed`

The `deals` section sorts by `listedCount` (descending) to rank "popular" items, but the sort runs on `products`, which is only the current single CJ page (20 items) already fetched for the request — never the full catalogue. The README's own "temporary rank" caveat undersells this: it isn't a rough proxy for popularity across a large catalogue, it's a rank within an arbitrary 20-item slice that changes page to page.

**Fix direction:** either accept this as a known, documented limitation (it already is, partially) or fetch a wider CJ sample specifically for deals ranking, separate from the paginated browse path.

## 6. Fabricated `total` past the last real page

**File:** `src/services/cj/products.ts`, `emptyPastLastPage`

When a page overshoots CJ's real depth, the function returns `total: (page - 1) * pageSize` — a number with no relationship to CJ's actual reported total, invented purely to make the pagination math self-consistent. For the storefront feed specifically, this means the reported product count can visibly shrink between two different page requests for the same section, which reads as a data bug to anyone watching the numbers rather than the intentional self-correction it actually is.

**Fix direction:** either keep CJ's last-known real `total` instead of a derived one, or make the "self-correcting" behavior explicit in the response shape (e.g., a `pastKnownDepth` flag) instead of overloading `total`.

## 7. `PermissionError` isn't caught in the storefront API routes

**Files:** `src/app/api/storefront/products/route.ts`, `.../products/[id]/route.ts`, `.../categories/route.ts`

Every route's `catch` block only checks `error instanceof CjApiError`; anything else is rethrown (`throw error`), which becomes an unhandled 500 in a route handler. `fetchCjProducts` calls `requirePermission('product:read')` before any upstream request, and `requirePermission` throws `PermissionError` (not `CjApiError`) when the session's role lacks the permission. **Not reachable today** — all five roles in `PORTAL_ROLES` currently include `product:read` — but latent: if a role is ever added or edited without `product:read`, or `PORTAL_DEV_ROLE` is misconfigured, this becomes a 500 where a 403 is the correct, expected response.

**Fix direction:** add a `PermissionError` branch alongside the existing `CjApiError` one in each route, returning `401`/`403` instead of falling through to an unhandled exception.

## Priority read

**#1 is the highest-priority live correctness defect.** **#3 and #6** are current operational/data-correctness risks, especially in a long-running process. **#2, #4, and #5** are documented or partially compensated limitations. **#7 is worthwhile defense-in-depth but lower current priority:** all present roles include `product:read`, and `readDevRole` currently falls back to `seller_manager`, so the failure path is latent rather than the most likely visible bug.

None of these were fixed in this session — findings only, at Bogs's original request, before the conversation moved to [[ADR-001-seller-center-cj-sourcing-to-my-products]].

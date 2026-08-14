---
tags: [sals3, sals3-portal, session-note, product-sourcing, images, cost-efficiency]
aliases:
  - Candidate Display Name Fix
  - Supplier Price Display Fix
  - CJ CDN Image Fix
created: 2026-08-12
updated: 2026-08-13
status: implemented
authority: implementation-state
owner_approved: true
related:
  - "[[hot]]"
---

# Making the pipeline tables show what the decision was actually made on

Four `sals3-portal` PRs, all `aj-garrigues` (AJ), merged 2026-08-12/13. None
had a prior vault entry. The first three are the same defect found three
times in three different columns — a table cell was rendering only from
per-product CJ **evidence**, which almost no candidate has, instead of
falling back to the **feed snapshot** every candidate already carries from
discovery. The fourth is unrelated: a billing outage that broke every image
in the portal.

## The pattern: evidence exists for 19 of 87,966 candidates; the feed snapshot exists for all of them

`supplier_snapshots.evidence` (written only after a per-product CJ detail
fetch) covered 19 of 87,966 candidates at the time of these fixes.
`candidate_evaluations.feed_snapshot` (written for *every* candidate at
discovery time, from its `/product/list` row) covered all 87,966. Multiple
table columns had been built to read evidence-only, with a raw-id or dash
fallback — so nearly every row displayed useless placeholder data even
though the real value had been sitting in the same row's `feed_snapshot`
column the whole time, unused.

**PR #44 — name a candidate from its feed snapshot, not evidence alone**
(merged 2026-08-12). Every pipeline table was showing the raw numeric CJ
product id (e.g. `2608100816131603600`) where a real name like "Stainless
Steel Personalized Skull Ring" belonged. The code had already half-known
this — `?q=` search matched `feed_snapshot->>'name'` — so a name search
could find a row the table then labelled by id. Fixed by making
`displayName` resolve **evidence, then feed snapshot, then id**, taking the
whole row (not loose fields) so a future caller can't reintroduce the bug by
forgetting the snapshot. All five pipeline tables share this one resolver,
so All, Ready, Needs Attention, Queued/Evaluating, Blocked/Rejected, and
Exception Queue were fixed together — including the 86,555-row Blocked tab.
Replayed against production: 87,947 of 87,966 rows newly showed a real name;
zero still fell back to id. Zero cost — the query already selected the
whole evaluation row; the snapshot was reaching the component unused.

**PR #46 — show the supplier price the row was actually judged on** (merged
2026-08-12). The Ready table showed `—` for Supplier price on almost every
row, while screening had been deciding `INVALID_PRICE` from a price it had
had all along — the evaluator was admitting and rejecting candidates on a
figure the table refused to display, the identical defect one column over
from PR #44. New `supplierPriceUsd()` mirrors `displayName`'s resolver order
exactly. **The one detail that needed a test to get right:** evidence stores
USD, the feed snapshot stores cents — on the single production row where
both sources existed, they agreed exactly (`4.04` vs `404` cents), pinned by
a test since a wrong conversion would display a figure 100× off the number
the decision was actually made on. Replayed against production: 87,947 rows
newly showed a real price; zero remained a dash. Also correctly walks back a
claim from PR #44's own README note that `weight` could be backfilled from
the feed snapshot the same way — it cannot, because `weight`/`sku`/`imageUrl`/
`providerCreatedAt` were only added to the feed-snapshot schema on
2026-08-12 itself, so every row written before that carries `null` there
(measured: 0 of 87,966), and the original `/product/list` rows those
decisions came from no longer exist to backfill from.

**PR #53 — a product thumbnail in the Ready table** (merged 2026-08-12; the
PR body was the unfilled process template, read from the diff). Adds a 40px
product thumbnail to the Ready/Needs-Attention table's Product cell, sourced
from `imageUrl()` reading the feed snapshot, with a `Package` icon fallback
when none exists. Also simplifies those two tables' shared columns down to
Product, CJ product id, and Supplier price — dropping Weight, Available
stock, and Stocked origins from that specific view.

## PR #56 — every image in the portal was broken; the cause was a billing limit, not a bug

**The bug.** Every image rendered broken — Product Sourcing thumbnails, the
sidebar brand mark, the auth screens. Not the CJ hosts, not the
`remotePatterns` allow-list, not a bad stored address — all three were
confirmed fine. Vercel's Image Optimization allowance had simply run out, so
`/_next/image` answered `402 OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED` to
*every* request — including a request for a purely local asset, which is
what proved the optimizer itself was refusing rather than any upstream fetch
failing. Verified directly against production, 2026-08-13.

**The fix.** Route every image through a custom `images.loaderFile` instead
of the metered optimizer. `cf.cjdropshipping.com` already honours
Alibaba-OSS `x-oss-process` resize instructions, so CJ's own CDN does the
resize and WebP conversion at no cost. Measured on a real product image: a
314,871-byte original became a 1,380-byte 40px thumbnail at 2× DPR — 228×
smaller than a pass-through would have shipped. The loader returns any
non-CJ address byte-identical, so it never proxies or rewrites an unrelated
host.

**Two consequences, both handled in the same PR.** `remotePatterns` stops
being real enforcement once a custom loader bypasses the optimizer that
reads it — but the actual enforcing gate was already `cjImageUrl` at
*intake*, which rejects a non-allow-listed address before it's ever stored,
so nothing was actually left open; the config list stays only as
documentation, moved into a dependency-free `src/lib/cj/image-hosts.ts`
since the loader ships into the client bundle and must not drag Zod in with
it. Separately, the local brand-mark PNG was a 2000×2000, 274,110-byte file
being rendered at 28–36 CSS px — now a proper 96×96, 5,438-byte asset, with
the 2000px original moved out of the served directory entirely.

**Restoring the built-in optimizer is a billing decision, not a code one** —
raise the account's Image Optimization limit, then drop the custom loader.
Not verified at merge time, flagged by the PR itself: whether
`oss-cf.cjdropshipping.com` (a second CJ CDN host) actually honours the same
`x-oss-process` parameter is unmeasured, and Product Sourcing thumbnails
were never seen end to end against real data locally, since the local
database was empty.

## Verification

PR #44: 1,104 unit tests (6 new), 60 E2E. PR #46: 1,115 unit tests (5 new),
60 E2E. PR #56: `npm run verify` clean — 1,153 unit tests, 60 E2E, 7 new
loader tests (covering the CJ rewrite, an existing `x-oss-process` override,
local pass-through, and refusal to rewrite lookalike hosts or plain `http`);
`npm audit --audit-level=high` clean. Cost impact of PR #56: lower — removes
all Image Optimization billing outright and cuts thumbnail transfer 228×.

`sals3-portal` [PR #44](https://github.com/Sals3-Official/sals3-portal/pull/44),
[PR #46](https://github.com/Sals3-Official/sals3-portal/pull/46),
[PR #53](https://github.com/Sals3-Official/sals3-portal/pull/53),
[PR #56](https://github.com/Sals3-Official/sals3-portal/pull/56), all merged.

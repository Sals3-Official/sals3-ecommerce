---
tags:
  - sals3
  - sals3-portal
  - pricing
  - margin
  - market-rules
  - taxonomy
  - ci
  - session
aliases:
  - Margin Inheritance
  - Market Rules Rebuild
  - Part 57
created: 2026-08-19
updated: 2026-08-19
status: current-state
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[sals3-portal-seller-market-configuration]]"
  - "[[sals3-session-2026-08-11-part34-category-margin-and-fx-policy]]"
  - "[[sals3-session-2026-08-13-part41-market-rules-profile-fix-and-pricing-rework]]"
  - "[[sals3-session-2026-08-14-part40-aj-category-mirror-and-draft-evidence-work]]"
  - "[[sals3-session-2026-08-19-part56-backfill-of-five-undocumented-portal-prs]]"
---

# Sals3 session 2026-08-19, part 57 — margin inheritance, the Market Rules rebuild, and eleven merged PRs

The session began with one owner question about the Market Rules screen and
ended with eleven merged `sals3-portal` PRs, one production migration, a CI
change, and two ADR amendments. It is recorded as one note because the whole
chain came from a single observation: **the category list was too long to
manage.**

> [!IMPORTANT] The single most load-bearing fact in this note
> Nothing can be auto-priced today. `resolveProductPricing` refuses
> `FUNDING_BUFFER_REQUIRED` unconditionally when no funding buffer exists,
> and none does. All 221 categories now carry a 25% margin and **not one
> product can price from it** until a buffer is set. That is unchanged by
> everything below.

## 1. The question, and why the obvious answer was wrong

Bogs asked whether margin should be set at L1 only, since there are 5,595
categories and no staff to manage more. Reading the code first showed the
obvious answer could not work: `resolveProductPricing` looked a policy up by
**exact category id**, and the picker only lets a seller land on a true leaf.
A margin set on the 21 departments would have resolved for essentially no
product.

Reading [[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]
then showed the ADR had already approved the fix in §3 — "resolve commercial
policy from least to most specific" — and Phase 1 had simply not implemented
it. Two named inputs were missing outright: the **seller/store default**
layer (§3) and the **minimum contribution profit** (§1).

## 2. Why the floor is an amount and not a percentage

Bogs pushed back: make the floor a percentage too. The objection is
arithmetic, and it is worth keeping because it will come up again.

**Two rules that are both proportional to cost never cross.** One always
wins, at every price, and the other is dead:

| Supplier cost | 35% margin | "40% floor" | Wins |
|---|---|---|---|
| US$2 | $3.08 | **$3.33** | floor |
| US$20 | $30.77 | **$33.33** | floor |
| US$100 | $153.85 | **$166.67** | floor |

A percentage floor is a second margin wearing a different label. The
absolute floor works precisely *because* it is not proportional: it answers
the costs that do not shrink on a cheap item — the fixed component of card
processing, packaging, support contact, the occasional refund. It crosses
the percentage at `cost = floor × (1 − m) / m`, and below that point it
governs.

The screen now shows this rather than arguing it: on a floor-governed row
the effective share is visibly **higher** than the configured margin.

## 3. What shipped

Eleven PRs, all merged to `develop` on 2026-08-19.

| PR | What |
|---|---|
| [#131](https://github.com/Sals3-Official/sals3-portal/pull/131) | Category picker: a branch match in search now navigates instead of being selectable, matching browse mode |
| [#132](https://github.com/Sals3-Official/sals3-portal/pull/132) | `pricing_store_defaults` table + break-glass migration endpoint, schema only |
| [#135](https://github.com/Sals3-Official/sals3-portal/pull/135) | `pricing-resolver-v3`: nearest-ancestor inheritance, store-default layer, contribution floor |
| [#137](https://github.com/Sals3-Official/sals3-portal/pull/137) | Fix: a store-default read failure no longer hides the whole category tree |
| [#139](https://github.com/Sals3-Official/sals3-portal/pull/139) | Depth cap to L2, pop-out editor with frosted backdrop, plain-language copy |
| [#140](https://github.com/Sals3-Official/sals3-portal/pull/140) | CI: the Playwright apt step can no longer block a PR |
| [#142](https://github.com/Sals3-Official/sals3-portal/pull/142) | Fix: descendant counts read from the whole taxonomy, not the capped rows |
| [#145](https://github.com/Sals3-Official/sals3-portal/pull/145) | Publication requires a real Sals3 category; a CJ mirror is refused |
| [#146](https://github.com/Sals3-Official/sals3-portal/pull/146) | Git hooks split: commit 16s, full verify on push |
| [#149](https://github.com/Sals3-Official/sals3-portal/pull/149) | Per-field validation messages, ASD-STE100 copy, market setup removed |
| [#151](https://github.com/Sals3-Official/sals3-portal/pull/151) / [#153](https://github.com/Sals3-Official/sals3-portal/pull/153) | CSV import/export behind one button; stale-row fix |

Migration run `32264506732` applied `pricing_store_defaults` to production:
`tableExists false → tableExistsAfter true`, four statements, 0.7 seconds.

## 4. Resolver v3

```text
store default → nearest-ancestor category → product override → variant override
```

Taxonomy v1 stores a row for every node, so a margin on a department prices
its whole subtree unless a deeper node carries its own. The decision snapshot
records **which** node supplied the policy (`policySourceCategoryCode`),
because ADR-015 §3 requires precedence to be recorded, not merely applied.

Offers already published are untouched: the price is frozen on the offer row
with its `pricing_resolver_version`, so v2-stamped offers stay exactly as
they were and are identifiable as such.

## 5. Owner decisions taken during the session

Each of these narrows or reverses something previously recorded. All are
Bogs's, all on 2026-08-19/20.

- **Deviating from ADR-015 is allowed** — "ako din naman gumawa niyan,
  syempre along the way mas natutunan natin ang business model". Recorded as
  a dated amendment rather than a silent drift; see the vault PR list below.
- **Market Rules stops at L2.** The tree went five levels deep, so
  `Bicycle Jerseys` and `Bicycle Tights` each had a Set button — per-product
  pricing on a commercial-rules screen. 5,602 rows became 213. Per-product
  price belongs in the Product Catalogue, to be revisited.
- **The CJ mirror is a draft default only.** Publication now refuses
  `SALS3_CATEGORY_REQUIRED` for a `CJ-<uuid>` category. This narrows the
  2026-08-14 "the CJ category IS the Sals3 category" decision recorded in
  [[sals3-session-2026-08-14-part40-aj-category-mirror-and-draft-evidence-work]].
  `create-draft.ts` still mirrors; `products/category-mirror.ts` is deleted.
- **Market setup removed from this screen.** A different business model is
  coming, and ADR-014 puts market governance in the Admin Portal.
- **Store default card removed** — "pang gulo lang", per-category is enough
  for now. Unmounted rather than deleted; the resolver layer is left unread
  because the owner had already deactivated his own row.
- **Bulk margin editing by spreadsheet**, with a template.

## 6. Three defects I introduced and then found

Recorded because the pattern matters more than the individual bugs: **all
three were found by looking at the running page, not by reading the diff, and
two reached production first.** The suite was 2,100+ tests green throughout.

1. **The vanishing category tree** (#137). `CategoryPricingSection` bundled
   the taxonomy read and the store-default read into one `Promise.all` inside
   one `try`. Before the migration ran, the missing table rejected the pair
   and the catch blanked a screen that had rendered 220 groups the day
   before. Lesson: never share one catch between two reads that fail for
   different reasons when one of them *is* the screen.
2. **The 50× understated blast radius** (#142). The depth cap left
   `subtreeCount` deriving from the capped rows, so "Home & Garden — 1,034
   categories" rendered as "21", in the row subtitle *and* in the editor's
   "Covers all N categories" sentence. A number that wrong about the
   consequence of a pricing change is worse than no number.
3. **The stale row after save** (#151/#153). `CategoryMarginDialog` called
   `onOpenChange(false)` and then `router.refresh()`; the first line unmounts
   the dialog, so React discarded the refresh. The row survives the close, so
   the row now owns the refresh. The same ordering was then repeated in the
   CSV control — fixed there too, though with lower confidence, since that
   component stays mounted and the failure could not be reproduced in a test.

## 7. The CI story, and two wrong diagnoses

`npx playwright install-deps` normally takes 13-19 seconds. It stalled four
times in one afternoon, 22 minutes each, each needing a manual cancel. The
logs showed **two different causes**:

```text
E: Could not get lock /var/lib/apt/lists/lock.     ← the runner's own boot job
   It is held by process 2345 (apt-get)

Get:3 archive.ubuntu.com noble-updates InRelease   ← 37s for one index,
...no further output for eight minutes                then nothing
```

The first fix (`timeout 90` + retry) was actively counterproductive: it
killed apt mid-lock-wait, guaranteeing the retry hit the same held lock. The
second (`DPkg::Lock::Timeout`) fixed the lock and the next run stalled on the
mirror instead. Only the third reading was right: **apt is not what this
pipeline needs.** `ubuntu-24.04` already ships the Chromium libraries and the
browser comes from cache, so the step is now best-effort. Proven immediately:
apt was skipped and all 69 e2e still passed.

## 8. Verified live, and what was not

Verified in the deployed browser at the end of the session: the 213-row tree
with correct descendant counts (Home & Garden 1,034), the pop-out editor with
its `blur(12px)` backdrop, CSV export of 221 rows, a deliberately malformed
import refused by line number **with nothing written**, a valid one-row
import reflected **without a manual refresh**, and a revert.

Two things were *not* established and should not be assumed:

- **How many products sit on the 7 CJ-mirror categories.** No endpoint
  reports it and no production query was run. Any that do can no longer be
  republished until a person assigns a real category.
- **Whether the margin numbers are right.** No buyer payment rail and no
  platform commission are configured, so the 25% now on every category is a
  placeholder, not a derived figure.

## 9. A measurement trap worth remembering

Twice during the session the deployed page appeared completely
non-interactive — no click did anything. The cause was not the application:
when the Browser pane is not displayed, `document.visibilityState` is
`hidden`, React never hydrates, and no element carries a `__reactFiber$` key,
so no handler exists to receive a click. A production outage was nearly
reported on that basis. The check before making such a claim:

```js
Object.keys(element).some((k) => k.startsWith('__reactFiber'));
```

Server-rendered content read through `textContent` stays trustworthy in that
state; `innerText` does not.

## 10. Open, and owed

- **Funding buffer is unset** — the hard blocker above.
- **No path to create a market profile.** `publishProduct` still refuses
  `NO_ACTIVE_MARKET_PROFILE`, and the screen that created one was removed.
  A seller without a profile has no route to a first publication.
- **Every one of the 221 categories now carries its own 25% policy**, not an
  inherited one, because the owner's bulk import wrote them all explicitly.
  Editing a department will therefore not move its children. Emptying the
  margin column for all but the 21 departments and re-importing would restore
  inheritance — not done, because the shape is a commercial choice.
- **Vault amendments**: ADR-015 (`sals3-ecommerce`
  [#114](https://github.com/Sals3-Official/sals3-ecommerce/pull/114)) and
  ADR-002 ([#118](https://github.com/Sals3-Official/sals3-ecommerce/pull/118))
  were open at the time of writing. Until they merge, both ADRs still describe
  behaviour the code no longer has.
- **[[hot]] is not yet updated** for any of part 57.

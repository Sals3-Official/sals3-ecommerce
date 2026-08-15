---
tags: [sals3, sals3-portal, catalog, variants, options, taxonomy, google-product-taxonomy, cj-points, change-detection, session]
aliases:
  - Part 47
  - Option Mapping Wiring
  - Supplier Change Detection Shipped
  - Sals3 Taxonomy v1
created: 2026-08-15
updated: 2026-08-15
status: merged-to-develop-nothing-in-production
authority: session-record
owner_approved: true
implementation_status: seven-prs-merged-taxonomy-v1-local-only
related:
  - "[[hot]]"
  - "[[sals3-session-2026-08-15-part45-variant-axes-design-and-free-change-detection]]"
  - "[[sals3-session-2026-08-15-part46-cj-evidence-field-capture-and-points-ledger]]"
  - "[[sals3-portal-cj-to-sals3-category-mapping-pilot]]"
  - "[[universal-category-variation-taxonomy-reference]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
---

# Sals3 session 2026-08-15, part 47 — option mapping wired end to end, supplier change detection shipped, Taxonomy v1

Continues [[sals3-session-2026-08-15-part45-variant-axes-design-and-free-change-detection]]
(design) and [[sals3-session-2026-08-15-part46-cj-evidence-field-capture-and-points-ledger]].
Everything part45 designed as "not built" shipped this session. **Nothing here
reached production** — all seven PRs merged to `develop` only; the Taxonomy v1
work below is local-only, not even merged.

## 1. Seven PRs, in merge order

| PR | branch | what |
|---|---|---|
| #81 | `fix/nul-byte-map-separator` | 4 raw NUL bytes in `save-option-mapping.ts` made ripgrep (and VS Code search) skip the file silently |
| #82 | `feat/option-mapping-wiring` | the four "NOT CONNECTED" items from the takeover handoff: read-model proposal, `VariantOptionMappingSection` mounted, server action, conditional publish gate |
| #83 | `fix/option-reorder-focus` | keyboard reorder dropped focus to `<body>` on a boundary move; component's first test file |
| #84 | `fix/storefront-cache-after-option-mapping` | `duplicate_combination` message that could never fire (substring-matched a message Drizzle never puts it in) + storefront cache never expired after a mapping; action's first tests |
| #85 | `feat/backfill-supplier-option-labels` | backfill script for pre-existing NULL `source_option_label` rows; crashed on its own import (`tsx` CommonJS interop) |
| #86 | `feat/recover-supplier-labels` | same repair as #85, reachable from the editor by a seller's own session instead of a database URL |
| #87 | `feat/source-change-detection` | the diff design from part45, built: `sourceChanges: []` was hardcoded, now real |

Merged in exactly the order listed above, #81 through #87, one after another
with no reordering. `develop` HEAD after all seven is `713b414`.

## 2. Decision 3 delivered — the Changes panel is real

`read-model.ts:1132` returned a hardcoded `sourceChanges: []`. `source-changes.ts`
now diffs two rows that were already loaded:

- `provider_variant_references` — frozen at draft time, one writer
  (`create-draft.ts`), never revisited.
- `supplier_snapshots.evidence` — overwritten in place, holds the most recent
  captured supplier truth.

**Zero new query, zero CJ call.** A repository guard test scans the module's
real source for `CjSupplierAdapter`, `@/lib/cj/`, a bare `fetch(`, and
`@/lib/db` — same device as `taxonomy/boundaries.test.ts` — so a future edit
that adds any of those fails the build instead of quietly spending points.

Six change kinds, action-first: supplier cost overtaking retail (the alarm the
whole diff was worth building — a live product can start losing money on every
sale with nothing saying so), a withdrawn variant, cost movement, zero stock,
a supplier rename (mapping is keyed on the draft-time label, so a rename does
not break it), and a newly-offered variant.

**The honest limit is stated, not hidden.** The empty-state copy used to say
"No supplier changes recorded for this product" — read as "the supplier has not
changed", which this cannot claim. `captureCandidateEvidence` (confirmed again
this session, see part45 §1) has only human-triggered callers; nothing
refreshes a snapshot on a schedule. The panel now names the date the comparison
rests on instead.

**A crash this would have shipped.** `evidence.capturedAt` is
`z.string().nullish()` — any string satisfies it. `Intl.DateTimeFormat().format(new
Date(value))` throws `RangeError: Invalid time value` on an unparseable date
rather than rendering something odd. Verified against `'not-a-date'`, `''`,
`'v1'`, `'2026-13-45'` — all four throw. `read-model` now nulls anything `Date`
cannot parse before it reaches the formatter.

**Part45's open question F is still open.** The webhook-vs-diff call held — the
diff shipped, a `STOCK`/`VARIANT`/`PRODUCT` webhook subscription did not. The
"no audit trail of supplier change, ever" caveat (overwriting in place) is
unresolved.

## 3. The recover-labels feature — why the backfill script needed a sibling

`recover-supplier-labels.ts` (#86) does the identical repair as the `#85`
backfill script, but reachable from the Product Editor by a seller who is
already logged in. Built because production `DATABASE_URL` was unavailable this
session — the owner has no Vercel access — so a terminal-run script could not be
exercised there at all. The deployed app already holds the connection; the
seller already holds the authority (`product:edit` on their own product).

Same three restrictions as the script: fills only `NULL`
(`isNull` predicate, not read-then-write), scoped to the calling seller's own
product, writes nothing but the label.

**Verified against real Postgres**, not only mocks, with a fixture built for
exactly the case the tenant scoping exists for: two sellers whose products
reference the same CJ `vid`. Seller A recovers 4 labels; seller B's row with the
same vid stays `NULL` — its own snapshot says `Blue-XL`, not seller A's
`Black-S`. A second press recovers 0 (idempotent). Seller B asking for seller
A's product gets `not_found`.

**Recovering the fixture found the button was pointed at a fixed premise:**
recovering labels was built on the assumption that missing labels are why
mapping only worked on one product. Checked live against all 14 real products —
**wrong**. All 14 have complete supplier labels (visible verbatim in the
Variant column, not `sals3Sku` hashes). #85 and #86 will report "nothing to
recover" on every one of them. Not wasted — the code is correct, tested, and
will matter for future re-drafted products missing labels — but they answer a
problem this catalogue does not currently have. See §5.

## 4. Two real bugs found and fixed after merging — not before

Both were caught reviewing *already-merged* code, not before merge:

**`duplicate_combination` never fired** (#84). The action matched
`error.message.includes(COMBINATION_CONSTRAINT)`. Drizzle wraps the driver
error and hangs `code`/`constraint_name` off `cause`, never onto `message` — an
INSERT does not name its own indexes. `src/lib/db/constraint-errors.ts` exists
for exactly this and says so in its own doc comment. Fixed by routing through
`uniqueViolationConstraint(error)`, same as `publish.ts` already does for its
slug constraint. **The identical defect exists, unfixed, in
`market-rules/market-profile-actions.ts:159`** against
`seller_market_profiles_live_key` — flagged, not fixed, out of scope for this
session's PRs.

**Storefront cache never expired after a mapping** (#84, and originally meant
for #82). `saveOptionMappingAction` called `revalidatePath('/listings')` but
never `updateTag(STOREFRONT_CATALOG_TAG)`. A product that is *already live*
can be mapped at any time (the publish gate only guards publish), so a buyer
kept seeing the pre-mapping `Army Green-XL` after the seller successfully named
Colour and Size. Sequencing note for future sessions: this fix was written as
an amend to the already-merged #82 branch and force-pushed — but #82 had
already been merged by the time the push landed, so the fix sat on an orphaned
branch until this session caught it and shipped it separately in #84. Amending
a branch after merge is a trap; a fresh branch avoids it.

## 5. `deriveOptionSplit` refuses grids that supplier stock happens to make one-sided — and this is the real reason mapping only worked on one product

Checked live (via the deployed portal's own `/listings/new?productId=` pages)
against all 14 products, not assumed:

| product | shape | derives? |
|---|---|---|
| Corduroy Jacket | 2 colours × 5 sizes | yes — mapped, "2 groups" |
| Smart Casual Blazer | 2×7 | yes — mapped |
| Plus Size Cardigan, Fleece-lined Zip Pocket | derivable | "2 detected", Blocker (correct: decision 2B) |
| Winter Khaki Jacket | **1 colour × 5 sizes** | refused |
| Tweed Wool Blazer | **1 colour × 5 sizes** | refused |
| Faux Mink Coat | **1 colour × 3 sizes** | refused |
| Landlord Hat | **6 colours × 1 size** | refused |
| remaining ~6 | single variant (`Default`) | correctly not offered |

`option-split.ts`'s rule — *"a position with one value is a constant, not an
axis"* — drops the **entire product**, not just the constant position, when one
axis happens to have exactly one value today. Four live products with a real
second axis (Size, or Colour) are refused because the *other* axis is
one-sided — common on a dropshipping feed where a supplier currently stocks one
colourway of a garment that comes in several sizes.

This is the actual explanation for "mapping only works on one product", not
missing labels (§3). Not fixed this session — flagged as the highest-value item
in §7.

## 6. Sals3 Taxonomy v1 — replacing v0 wholesale (local only, not merged)

The owner re-authored `docs/Raw/universal_category_variation_taxonomy.xlsx` on
**2026-08-14 19:26**, after every count in
[[universal-category-variation-taxonomy-reference]] and every number
`sals3-portal` had baked in was extracted. See that page's superseded-banner
for the full comparison; the short version:

| | v0 | v1 |
|---|---|---|
| categories | 1,345 | **5,595** |
| L1 departments | 29 (Shopee-derived) | **21 — Google Product Taxonomy, verbatim** |
| variation patterns | 15 | 86 |
| code scheme | `CAT-DIG-…`, `CAT-MEN-…` | `CAT-GGL-…` |
| overlap with the other version | — | **zero** |

**Worth adopting beyond tidiness:** a category from this tree is emittable as
`google_product_category` in a Merchant feed and JSON-LD with no second
crosswalk. [[ADR-016-google-merchant-center-product-feed-compliance]] already
cares what Google reads from the initial HTML.

### What was done, locally, in a worktree

1. Applied migration `0015_taxonomy_mapping_pilot` — generated but never run
   anywhere (per [[sals3-portal-cj-to-sals3-category-mapping-pilot]]'s own
   status line). Creates `provider_category_mappings`, `sals3_category_presets`,
   `category_remap_review_findings`; adds `category_mapping_id`/
   `category_mapping_version` to `products`.
2. Re-extracted to `sals3-taxonomy-v1.json` /
   `sals3-taxonomy-presets-v1.json`, replacing the v0 files (deleted, not kept
   alongside — the old `seed-sals3-taxonomy.mts` was `onConflictDoNothing` and
   only correct for *extending* a taxonomy, wrong for replacing one whose code
   scheme changed entirely).
3. `seed-sals3-taxonomy-v1.mts` **deletes v0 rows before inserting v1**, but
   counts references first and refuses with the numbers
   (`N product(s), N mapping(s)`) rather than surfacing a foreign-key error
   mid-transaction. Locally: 0 references, so the delete-then-insert ran clean.
4. `ACTIVE_TAXONOMY_VERSION` → `sals3-taxonomy-v1`; `taxonomy_status` has no
   `RETIRED` value, which is why deletion rather than marking-retired was the
   only option without a further migration — owner chose deletion.
5. `SALS3_CATEGORY_L1_OPTIONS` regenerated (21 entries).

Local DB after: 5,595 categories, 5,595 preset rows, 21 departments. **Nothing
applied to production.**

### Why this cannot break CJ ordering — checked, not assumed

`categor` does not appear anywhere in `src/modules/orders/`. What joins an
order to CJ is variant identity — `pid`/`vid`/`variantKey` — which the
never-split rule already keeps verbatim regardless of Sals3's own taxonomy.
Category feeds pricing, the storefront, the Google feed, and the publish gate;
it never reaches the supplier. The real exposure is
`modules/pricing/resolver.ts` refusing `AMBIGUOUS`/`UNMAPPED` — mitigated by the
CJ mirror (owner decision 2026-08-14, see `cj-mirror.ts`) still filling absence.

### Existing products are included in the re-map, not just new drafts

`scripts/approve-cj-category-mapping.mts` does not only approve a rule — for
every product sourced from that CJ category it calls
`applyResolvedCategoryToProduct` to re-resolve. Verified locally against
`CAT-GGL-5598` (`Apparel & Accessories > Clothing > Outerwear > Coats & Jackets`,
2-Tier Color + Garment Size — the corduroy jacket's actual branch); 0 products
locally, so nothing was re-pointed, but the mechanism is confirmed present.

### Two defects only a browser caught — both passed type-check and all 1,574 unit tests

- **`PORTAL_TEST_AUTH_BYPASS` takes no effect from `.env.local`.** Must be
  exported in the shell environment; Playwright sets it in `webServer.env`,
  which is why E2E always worked while a manual `npm run dev` bounced to
  `/login`.
- **A retired v0 department survived the swap in a fixture.**
  `sals3CategoryL1` is typed `string | null`, not a union, so
  `"Men's Bags & Tactical Backpacks"` (v0) type-checked and rendered in the
  design-preview editor after the department stopped existing anywhere in v1.
  Its own comment complained v0 had no unisex backpack branch, hence
  `ACCEPTABLE` confidence at `CAT-MEN-100564`. v1 has
  `Luggage & Bags > Backpacks`, ungendered — now `EXACT` at `CAT-GGL-100`. The
  gap the old comment documented is what the new tree closes.

### Where taxonomy meets the option-mapping work

Each v1 category carries `Variation Architecture`/`Tier 1 Attribute`/
`Tier 2 Attribute`. For the corduroy jacket's branch: `2-Tier (Color + Size)`,
`Color / Pattern / Print`, `Garment Size (XS/S/M/L/XL/XXL)`. The option-mapping
editor currently asks the seller to type axis names from nothing; the taxonomy
already knows them for every category. **Not connected yet** — see §7.

It also reframes §5: only **11 of 5,595** v1 categories are 1-Tier
(`Color/Variant Only`). The four refused live products are 2-Tier categories
where the supplier's current stock happens to be one-sided on one axis, not
categories that were ever supposed to have only one axis.

## 7. Work list, ranked by value

1. **Fix `deriveOptionSplit` to drop a constant position instead of refusing
   the whole product.** Opens 4 of 14 live products immediately (§5), likely
   most of the remaining catalogue as it grows. Needs `saveOptionMapping`
   updated too — its position-indexed matching must agree with the server on
   which token means what once a position is dropped.
2. **Pre-fill option-mapping axis names from the Taxonomy v1 preset** instead
   of asking the seller to type "Colour"/"Size" from nothing (§6, last
   section).
3. **Re-mapping is permanently blocked once set** — `save-option-mapping.ts`'s
   own comment says an unmap path, re-publish story, and cart-holding-a-variant
   decision are needed; none exist. A typo in an axis name is permanent today.
4. **Push Taxonomy v1 to production** — currently local-only. Needs the same
   reference-count-then-refuse the local seed already does, run for real
   against production data, and a CJ→Google category crosswalk (currently zero
   mapping rows anywhere).
5. **`Supplier stock`/`Supplier cost` columns in the editor carry no
   observed-at date** and read as live when they are the frozen draft-time
   value — the same "looks current, isn't" problem the Changes panel (§2) now
   solves elsewhere on the same screen.
6. Variant list order (defect E11, still open) — hash-ordered, not by axis
   position; now solvable with real `product_options.position` data once (1)
   ships.
7. Fix the identical `duplicate_combination`-style bug in
   `market-profile-actions.ts:159` (§4) — filed as a task, not built.

## 8. Verified facts worth not re-deriving

- All seven PRs merged to `develop`; `develop` HEAD `713b414` at session end.
  Zero CJ points spent. Zero production database access — the owner has none
  this session (no Vercel credential).
- `npm run verify` green on every PR, twice each (pre-commit, pre-push):
  eslint, Prettier, tsc, build, unit suite, 78 E2E.
- 14 live products, not 12 as an earlier handoff stated: 6 Live, 8 Draft (§5
  table covers all 14).
- Taxonomy v1: 5,595 categories / 21 departments / 86 patterns, local only.

---
tags: [sals3, cj-dropshipping, catalog, integration, plan]
aliases: [CJ Dropshipping Integration Plan, CJ Import Pipeline, Supplier Category Mapping]
created: 2026-08-03
updated: 2026-08-06
status: superseded
authority: technical-design
owner_approved: false
related:
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-implementation-phases]]"
  - "[[universal-category-variation-taxonomy-reference]]"
  - "[[sals3-master-blueprint]]"
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
---

> [!WARNING] Superseded on 2026-08-06
> This note preserves the original proposal for history. Do not implement it as written. [[ADR-001-seller-center-cj-sourcing-to-my-products]] now governs catalog import, curation, and architecture; [[ADR-002-sals3-taxonomy-and-cj-category-mapping]] governs taxonomy and mapping. In particular, low-confidence mappings do not auto-publish, the mostly blank examples column is not the primary classifier, and rating/sales thresholds are not treated as verified CJ facts.

# Sals3 — CJ Dropshipping Integration Plan

## The question this answers

Can the Seller Center's "Add Product" form (see the Shopee seller-center screenshots shared 2026-08-03 — Basic info, Specification, Description, Sales Information/variations, Shipping, Others) auto-populate from CJ Dropshipping data, given the owner has CJ API access? **Yes, technically** — this is exactly the master blueprint's Step 1 ("Supplier Feed Ingestion... fetched via CJ Dropshipping API"). But "auto-populate" hides three real sub-problems this note addresses: which build (Track A or B) needs it, the category/attribute mapping gap, and quality control before publish.

## 0. Scope check — Track A vs Track B

Don't build this twice. Two separate things could plausibly want CJ auto-import:

- **Track A (Shopify pop-up store):** Shopify has ready-made CJ Dropshipping apps on its App Store that already do exactly this. If Track A needs CJ products fast, install one — do not custom-build a CJ importer for a temporary storefront.
- **Track B (the real Sals3 Seller Center):** this is what the shared screenshots and "ang build namin" actually refer to. This plan is for Track B only.

## 1. Why "auto-populate" isn't a single step

CJ's API returns a product in **CJ's own category and attribute system** — a third taxonomy, distinct from both Shopee's `Platform Category ID` (already decided to drop, see [[universal-category-variation-taxonomy-reference]]) and Sals3's own `Universal Category Code`. A raw CJ product cannot fill Sals3's Add Product form directly; it needs translation.

```
CJ Dropshipping API  →  raw import record  →  category/attribute mapping  →  quality gate  →  Sals3 catalog entry (fills Add Product form)
```

## 2. The mapping blocker — proposed solution (revised 2026-08-03)

> [!NOTE] Revised after direct challenge
> The first draft of this section required a human to confirm every new CJ category once before it could map — borrowed from Bogs's BOGS Dashboard financial/SKU mapping pattern, where a wrong mapping loses real money. Bogs pushed back: category mis-assignment here is low-stakes (a product shows in the wrong browse category — annoying, not financial, trivially fixable later), so that borrowed safeguard was over-applied. A mandatory blocking gate on every new category is also exactly the kind of slow, manual friction that stalled the old WooCommerce build for 9 months with nothing shipped (see [[hot]]). Revised to **automate by default**.

### 2.1 Category mapping — automated by default

- Match each CJ product to a `sals3CategoryCode` (a `Universal Category Code`, see [[universal-category-variation-taxonomy-reference]]) using the taxonomy's own rich reference fields — `Product Examples & Guidelines`, category names, required attributes — via keyword matching and/or an LLM-assisted classifier. No blocking human step for the common case.
- Every mapping decision is logged with a **confidence score** and the matched category, in a `CategoryMappingLog` (not a gate — a record): `cjCategoryPath`, `sals3CategoryCode`, `confidence`, `mappedAt`, `method` (`keyword` / `llm`).
- **Low-confidence matches still publish immediately** — they are not held back — but get flagged into a lightweight, non-blocking review list so a human can spot-check and correct when convenient. A correction updates the log and, optionally, informs future matches for the same CJ category (so the same mistake doesn't repeat).
- This still solves the earlier scope-size concern: nobody hand-maps 1,346 rows up front — the classifier only ever runs against categories that real CJ products actually land in.

### 2.2 Attribute/variant mapping — same automated-by-default approach

CJ's own option labels (e.g. their "Color" values) map to Sals3's `Attribute_Dictionary_&_Presets` values (e.g. `Army Green` → the matching Color Code preset) using the same automatic-match-plus-confidence-log pattern — not a blocking gate.

## 3. Quality gate stays a separate step

Even after category + attributes map correctly, do **not** auto-publish. Reuse the blueprint's Step 2 (Smart Quality Gate — rating/sales threshold, verified supplier) and a media check. The shared screenshot's own "Issues to Fix: Images contain watermark covering the product" panel is a live example of exactly the problem this gate exists to catch — CJ photos are supplier photos, not guaranteed clean.

## 4. Not a one-time import — ongoing sync

Unlike the build spec's WooCommerce migration (`MigrationRecord`, section 18.1 — one-time, then the old system retires), CJ dropshipping is a **live, ongoing supplier relationship**: price and stock can change on CJ's side at any time. Proposed model:

- **`SupplierProductLink`** — Sals3 product/variant ID ↔ CJ product/variant ID (stable identity), `source: "CJ_DROPSHIPPING"`, `lastSyncedAt`, `syncStatus`.
- A scheduled re-sync job re-checks CJ price/stock for every linked product, consistent with the master blueprint's own Step 5 ("Real-Time Stock Verification") and the build spec's stock-guard rule (section 6.3) — an out-of-stock CJ item must not stay purchasable on Sals3.

## 5. Where this fits in the existing 8-stage build order

Do not treat this as a 9th untracked side project — it's real work inside stages that already exist in [[sals3-implementation-phases]]:

- **Stage 2 (Data model):** add `CategoryMappingRule`, `AttributeMappingRule`, `SupplierProductLink` to the entity list.
- **Stage 3 (Catalogue read path):** mapped CJ products need to render through the same list/product routes as any other product — no separate "CJ view."
- **Stage 7 (Seller and administration tools):** the build spec's own Stage 7 already includes "Build the product upload and the approval queue" — CJ auto-import is a specific, API-sourced case of that same upload/approval flow, not a separate feature.

## 6. Open items before this becomes a real task

- **Confirm the CJ API access is a real, working, approved API key** — not just an account login. (Owner is checking, per 2026-08-03 conversation.)
- **Confirm the initial CJ category scope** — which categories does the owner actually want to bring in first? This determines how much of the mapping table needs building before the first real CJ product can flow through, and keeps the work bounded.
- **Retail vs. Dropshipper seller-type toggle** (AJ/Bogs's idea, shared 2026-08-03): explicitly out of scope for this plan — a future phase, not yet proposed to Leadership. Do not build for it now, but avoid hardcoding "every seller is a CJ dropshipper" so deeply into this pipeline that adding a Retail seller type later requires a rewrite.

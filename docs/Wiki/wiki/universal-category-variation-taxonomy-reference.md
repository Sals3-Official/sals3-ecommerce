---
tags: [sals3, catalog, taxonomy, reference, data]
aliases: [Category Taxonomy Reference, Universal Taxonomy, SKU Variation Engine]
created: 2026-08-03
updated: 2026-08-03
status: canonical
authority: catalog-data
owner_approved: true
related:
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-management-bible]]"
---

> [!NOTE] Provenance
> Source file: `Shopee_Category_Variation_Engine_Master.xlsx`, found at `E:\Bogs 2nd brain` root (dated 2026-07-30), moved into this vault's `Raw/universal_category_variation_taxonomy.xlsx` on 2026-08-03. The original had 4 sheets; the `Bogs_Store_SKU_Category_Map` sheet (7 rows of actual BOGS Dashboard/Weslu45 store SKU data) was **deliberately stripped before moving** — that sheet is real BOGS Dashboard business data, and [[team-profile-and-collaboration-preferences]] prohibits mixing the two projects' business specifics. The original unstripped file remains only in the (separate) BOGS Dashboard vault's git history if ever needed for reference there — not duplicated here.

# Universal Category and Variation Taxonomy — Reference

## What this is

A generic, platform-agnostic e-commerce category and SKU-variation taxonomy engine — not Sals3-specific content on its own, but directly relevant reference material for [[sals3-ux-build-specification]]'s Catalog service (section 16.1) and category/attribute/filter design (sections 6.3, 17.1). Not yet reviewed or adopted as Sals3's actual category tree — `owner_approved: false` until AJ/Bogs confirm it should be the starting point.

## Sheets in `Raw/universal_category_variation_taxonomy.xlsx`

### 1. `Universal_Category_Taxonomy` (1,346 rows, 14 columns)

A full L1-L5 category hierarchy with a `Platform Category ID` column (appears Shopee-derived), a `Variation Architecture` column (e.g. "2-Tier (Color + Size)"), primary/secondary attribute tiers, an SKU format standard pattern, required item attributes, and product examples.

Columns: `Universal Category Code`, `L1 Department (Main)`, `L2 Sub-Department`, `L3 Product Class`, `L4 Sub-Class`, `L5 Item Specification`, `Platform Category ID`, `Variation Architecture`, `Tier 1 Attribute (Primary)`, `Tier 2 Attribute (Secondary)`, `SKU Format Standard`, `Required Item Attributes`, `Store Catalogue Status`, `Product Examples & Guidelines`.

### 2. `L1_to_L5_Hierarchy_Matrix` (14 rows, 11 columns)

A summary matrix, one row per L1 department, showing the department's variation architecture, attribute presets, and SKU pattern at a glance. The 13 L1 departments covered:

- Digital Goods, Services & Subscriptions
- Men's Apparel & Tactical Wear
- Women's Apparel & Fashion
- Men's Bags & Tactical Backpacks
- Women's Bags & Purses
- Men's Footwear
- Women's Footwear
- Mobile Devices & Gadgets
- Audio Equipment & Headphones
- Beauty & Personal Care
- Food, Beverage & Gourmet
- Home, Furniture & Living
- Sports, Fitness & Outdoor Gear

### 3. `Attribute_Dictionary_&_Presets` (57 rows, 5 columns)

Reusable attribute value presets grouped by `Attribute Group`: `Color Code`, `Digital Preset` (e.g. telco operators — Globe, Smart, DITO), and `Size Code`. Columns: `Attribute Group`, `Code / Abbreviation`, `Full Description / Name`, `Usage Context / Product Line`, `Standard Hex / Visual Category`.

## How this could apply to Sals3

[[sals3-ux-build-specification]] section 6.3 requires filter groups to "come from the category" (not a one-size-fits-all filter set), and section 16.1 gives the Catalog service ownership of "products, variants, attributes, categories, media." This taxonomy is a candidate starting point for that category/attribute model — but it needs review before adoption:

- It appears derived from Shopee's own category IDs (`Platform Category ID` column) — confirm licensing/reuse is appropriate, and whether Sals3 needs a Shopee-compatible mapping at all given [[sals3-ux-build-specification]]'s "New system, not WooCommerce" decision doesn't say anything about Shopee category compatibility either way.
- 1,346 rows is a lot of category depth — [[sals3-ux-build-specification]] section 21.3 ("smallest useful first release") suggests the first release should not need the full breadth immediately.
- Not yet mapped to any real Sals3 seller/product data — this is a taxonomy skeleton, not populated catalog content.

Do not treat this as an approved category tree until AJ/Bogs explicitly adopt it — log that decision here (or in an ADR) when it happens.

## ADOPTED — 2026-08-06, approved by Bogs

> [!IMPORTANT] This is now Sals3's category tree
> Approved by Bogs on 2026-08-06 via [[ADR-001-seller-center-cj-sourcing-to-my-products]] D4. `status` is now `canonical` and `owner_approved` is `true`. The three review objections in the section above are resolved: the licensing concern by removing `Platform Category ID`, the "1,346 rows is a lot" concern by the variation-architecture payoff described below, and the "not mapped to real data" concern by ADR-001 D4's single `product/getCategory` mapping pass. **AJ has not reviewed ADR-001 yet** — brief him before the first code lands, since this taxonomy is shared.
>
> **Two things this note must now also serve:** it is the specification for the Seller Center Add Product form (below), and — new in ADR-001 D10.5 — **the L1 department is where margin is defined.** Each L1 carries a starting markup range; see D10.5 for the table.

## Adoption detail

> [!NOTE] What was adopted, and the recommendation that was overridden
> [[ADR-001-seller-center-cj-sourcing-to-my-products]] D4 adopts this taxonomy **in full** — all 1,346 rows, L1 through L5, plus the 57-row `Attribute_Dictionary_&_Presets` — with the **`Platform Category ID` column removed**. That column is the only genuinely Shopee-derived artifact and the only real licensing concern; without it, what remains is a generic taxonomy, which answers the first review objection in the section above.
>
> Bogs directed this on 2026-08-06, overriding an earlier ADR draft that recommended starting with L1+L2 only (~52 categories) and growing depth lazily. **The narrower recommendation was wrong:** it would have discarded the `Variation Architecture`, `Tier 1/Tier 2 Attribute`, `SKU Format Standard`, and `Required Item Attributes` columns — which ADR-001 D4 makes the **binding specification for the Seller Center Add Product form**. Those columns make the form category-driven (pick a category, and its variation tiers, required fields, and SKU pattern follow) rather than one-size, which satisfies build spec §6.3's "filter groups come from the category" rule without designing a second form. They also give the CJ variant mapping in [[sals3-cj-dropshipping-integration-plan]] §2.2 a concrete target for the first time.
>
> This also answers the third review objection above ("not yet mapped to any real Sals3 seller/product data") — ADR-001 D4 maps CJ's category paths onto these codes via a single `product/getCategory` call, so real supplier data lands on this tree directly.
>
> Approved by Bogs 2026-08-06; `owner_approved` flipped to `true` and `status` to `canonical` the same day.

---
tags: [sals3, catalog, taxonomy, reference, data]
aliases: [Category Taxonomy Reference, Universal Taxonomy, SKU Variation Engine]
created: 2026-08-03
updated: 2026-08-03
status: reference
authority: catalog-data
owner_approved: false
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

---
tags: [sals3, adr, catalog, merchant-center, google-shopping, feed, seo, compliance]
aliases: [Google Merchant Center Compliance, Merchant API Product Feed]
created: 2026-08-11
updated: 2026-08-21
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: schema-columns-shipped-migration-unapplied
related:
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[parked-ideas-backlog]]"
  - "[[hot]]"
---

# ADR-016 — Google Merchant Center product-feed compliance from the ground up

> [!DANGER] Amended 2026-08-21 — confirmed gap #1 is no longer true
> "No Google Product Category crosswalk exists" was correct on 2026-08-11 and became **false on
> 2026-08-14**, when the taxonomy's reference data was replaced with Google's own. Sals3 category
> codes now carry Google's numeric category IDs, so `googleProductCategory` is derivable today.
> Read the amendment at the end of this note before citing gap #1 as a blocker. Gaps #2 and #3
> stand unchanged.

## Status

`approved`

## Problem

Bogs directed that every Sals3 product record be structured to fully comply with Google Merchant Center requirements from the moment the Product/Offer model is built — not retrofitted after launch. The stated goal: Google Merchant can fetch the entire catalog automatically, with zero manual cleanup and zero disapprovals, the first time Sals3 connects. Any attribute the current or planned data model cannot supply must be flagged now, before it blocks launch.

No Sals3 Product/Variant/Offer/Media table exists yet (`hot.md`: "No product/variant/offer model... exists"). This ADR is therefore a schema and process **constraint on that future build**, not a change to running code. It fixes what the eventual Product/Offer/Media/Promotion entities and the storefront's price-rendering path must guarantee, so the first real catalog table is Merchant-Center-shaped from day one.

## Evidence

### The API surface has changed under us — verified 2026-08-11

**Content API for Shopping sunsets 2026-08-18** — seven days from this ADR's approval date. Confirmed directly from the official docs banner at <https://developers.google.com/shopping-content> (fetched 2026-08-11, page itself dated 2026-07-06): *"Important: Content API for Shopping will be sunset on August 18, 2026."* Any integration work must target the **Merchant API** (`merchant/api/reference/rest`), not the legacy Content API v2.1 the user's own attached reference sits alongside. Field names and resource shapes differ materially between the two — see below.

### Verified Merchant API contract facts

- **Product identity moved off the product record.** `ProductInput`'s only required top-level fields are `offerId`, `contentLanguage`, `feedLabel` (<https://developers.google.com/merchant/api/reference/rest/products_v1/accounts.productInputs>). `channel` and `targetCountry` — required fields on the old Content API `products` resource — **do not exist on the Merchant API product resource at all**; channel/country targeting now lives on the `DataSource`, not the product. A Sals3 product-feed exporter must resolve destination/channel at the data-source/account level, never by writing a per-product `channel` field that no longer exists.
- **Most human-recognizable attributes live in the nested `productAttributes` object** (<https://developers.google.com/merchant/api/reference/rest/products_v1/ProductAttributes>): `title`, `description`, `link`, `mobileLink`, `imageLink`, `additionalImageLinks` (plural), `availability`, `price`, `condition`, `gtins` (plural, up to 10), `mpn`, `brand`, `ageGroup`, `gender`, `productTypes`, `googleProductCategory`, `identifierExists`. The REST reference itself defers most per-attribute "required" enforcement to the separate **Product Data Specification** (support.google.com/merchants/answer/7052112), which requires: `id`, `title`, `description`, `link`, `image_link`, `availability`, `price` unconditionally; `brand` for all new products except media; `mpn` when no GTIN; `gtin` required for most categories, strongly recommended otherwise; `condition` when not new; `age_group`/`gender`/`color`/`size` for apparel in select countries; `item_group_id` for variant grouping.
- **Price is a structured object, not a display string.** `price`/`salePrice` are `{ amountMicros: string, currencyCode: string }` (<https://developers.google.com/merchant/api/reference/rest/Shared.Types/Price>) — one million micros per currency unit, ISO 4217 currency code. This is not the classic feed-file `"15.00 USD"` string; a Sals3 exporter must emit integer micros, which means the eventual Product/Offer price column needs a lossless path to micros (a minor-unit-cents column already satisfies this: `cents * 10_000 = amountMicros` for two-decimal currencies).
- **`salePriceEffectiveDate` is a structured `Interval`, not a slash-delimited string.** `{ startTime: string, endTime: string }`, each an RFC3339 timestamp, either end independently optional (<https://developers.google.com/merchant/api/reference/rest/Shared.Types/Interval>). The classic feed-file `sale_price_effective_date` attribute uses a different slash-delimited syntax — the two are not interchangeable, and Sals3 has no promotion/sale-period data model today to source either from. (`hot.md`'s own "Deals band no longer carries a discount" finding already established that the current storefront "Deals" band is a ranked list, not a real discount — there is no genuine sale price anywhere in the system yet to feed this field with.)
- **Promotions are a distinct sub-API with their own required fields**, not a sub-object of the product (<https://developers.google.com/merchant/api/reference/rest/promotions_v1/accounts.promotions>): top-level `promotionId`, `contentLanguage`, `targetCountry`, `redemptionChannel` are required; nested `attributes` requires `offerType`, `longTitle`, `couponValueType`, `promotionDestinations`, `promotionEffectiveTimePeriod` (an `Interval`, same type as above). Applicable-product scoping uses `itemIdInclusion[]`/`brandInclusion[]`/`itemGroupIdInclusion[]`/`productTypeInclusion[]` (and matching exclusions). A real promotion feature needs its own `Promotion`-shaped entity; it cannot be bolted onto the product record.
- **A scheduled file feed still runs alongside the API.** `DataSource.fileInput.fetchSettings` supports `UPLOAD`/`FETCH`/`GOOGLE_SHEETS` with daily/weekly/monthly cadence and a `fetchUri` (<https://developers.google.com/merchant/api/reference/rest/datasources_v1/accounts.dataSources>). Google recommends refreshing/re-inserting products at least every 30 days to avoid expiration (<https://developers.google.com/merchant/api/guides/products/add-manage>).
- **Google crawls the landing page and diffs it against the feed price.** Confirmed at <https://support.google.com/merchants/answer/12159029>: *"Googlebot crawls your website landing pages and compares the [price] attribute in your data source with the prices on your landing page."* A mismatch produces the disapproval reason **"Mismatched product price"**, and the crawl is HTML-only — *"if data on your website is passed dynamically with JavaScript after the page is loaded, this will trigger an error."* This is a hard constraint on the PDP: the rendered price must be present in the initial HTML (server-rendered, which `/p/[id]` already is) and must be byte-for-byte the same value the feed/API reports, with no client-only price mutation after paint.
- **Image rules are stricter than "any product photo."** Minimum resolution is moving to a universal 500×500px floor (enforced from 2027-01-31; current per-category minimums are lower but the 500×500 target should be the build baseline), max 64MP / 16MB, JPEG/WebP/PNG/GIF/BMP/TIFF (<https://support.google.com/merchants/answer/6324350>). Explicitly banned: placeholder images, watermarks, brand/logo overlays not inherent to the product, barcodes, calls to action, price text, and promotional text baked into the image. **This directly intersects [[ADR-011-product-media-source-selection-and-supplier-original-preservation]]**: CJ supplier photos are known to carry exactly these kinds of overlays in practice, so the media-selection pipeline needs a Merchant-Center-eligibility check as part of (not separate from) its existing seller/supplier media logic, not a bolt-on filter added later.
- **Unique-identifier rule**: GTIN, or MPN+brand, is required for most products; `identifierExists=false` is the documented escape for genuinely one-of-a-kind goods lacking any of the three, and empty-string placeholders must never be sent instead (<https://support.google.com/merchants/answer/6324478>).

### Confirmed gaps in the current Sals3 data model — flagged now, per the owner's own instruction

1. **No Google Product Category crosswalk exists.** Sals3 Taxonomy v0 ([[ADR-002-sals3-taxonomy-and-cj-category-mapping]]) maps Sals3 categories to CJ categories only; it has zero mapping to Google's product taxonomy anywhere in the adopted workbook. Every future product needs a `googleProductCategory` value, and today there is no source for one.
2. **No GTIN/MPN/brand evidence pipeline.** [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] §7 currently *forbids* inventing these fields ("Do not invent GTIN, MPN, manufacturer, or brand values... required only when an enabled category, market, manufacturer record, or approved external channel needs them") and §11 explicitly parks "GTIN/MPN and channel-feed integration" for later. This ADR is that trigger: a real external channel (Google Merchant) now needs them, so a mapping/verification path for CJ-sourced GTIN/MPN/brand fields must be designed before any product ships to Merchant Center — but nothing in ADR-013's screening/qualification rules changes today.
3. **No promotion/sale-period entity.** Confirmed above — there is no genuine discount/promotion concept in the current storefront to source `salePrice`/`salePriceEffectiveDate`/the Promotions sub-API from.
4. **Price representation needs a micros-safe path.** Whatever currency-minor-unit column the eventual Offer table uses must convert losslessly to `amountMicros`; this is a formatting concern, not a blocker, but must be designed in rather than patched on.
5. **No landing-page/feed price-consistency guarantee exists yet** because no PDP writes from a canonical Offer price at all today — the current `/p/[id]` reads directly from the CJ-sourced storefront feed. Once a curated Offer/price entity exists, the PDP and the future Merchant feed/API export must read the *same* stored price, not two independently-computed values.
6. **CJ media may not be Merchant-Center-eligible as-is.** No current check exists for watermarks/overlays/placeholder images in the CJ evidence-capture or media-selection path.

## Strongest objection

Designing to a channel Sals3 has not yet built a catalog for — let alone connected — risks enterprise-architecture-before-the-first-catalog, the exact anti-pattern [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] warns against elsewhere. Every one of the six gaps above could instead be deferred until the Product/Offer schema itself is being designed, and solved then with full context.

The objection is only partially right. The owner's instruction is specifically that these fields be **structural** decisions baked into the Product/Offer/Media schema's first migration — id stability, price-as-minor-units-with-a-micros-safe path, a real promotion/sale-period entity, a `googleProductCategory` column, GTIN/MPN/brand columns (nullable, `identifierExists`-gated) — not that Merchant Center integration itself (the actual feed export, DataSource wiring, API calls) be built now. Retrofitting a *schema* to add these columns after real product rows and orders exist is materially more expensive (backfill, migration risk, historical-row ambiguity) than including nullable, currently-unused columns in the original design. The ADR therefore separates **schema shape** (required now, at zero runtime cost) from **feed/API wiring and enablement** (deferred, ADR-010/ADR-013 gating unchanged).

## Decision

Bogs approved treating Google Merchant Center compliance as a schema and process constraint on the Product/Offer/Media build, effective 2026-08-11.

### 1. Target the Merchant API, never the Content API

All future integration work (feed export, DataSource management, Promotions) targets the **Merchant API** (`merchant/api/reference/rest`) exclusively. The Content API for Shopping sunsets 2026-08-18 and must never become a dependency, even transitively through a third-party library or tutorial that still assumes it.

### 2. The first Product/Offer/Media/Promotion migration must include these columns, even before any exporter exists

- `googleProductCategory` (nullable text) on the product/offer entity — populated later by an ADR-002 taxonomy crosswalk, but the column exists from the first migration.
- `gtin` (nullable, array-capable — up to 10 per Merchant API), `mpn` (nullable text), `brand` (nullable text), `identifierExists` (boolean, default `true`) — never auto-populated with invented values; ADR-013 §7's existing rule stands unchanged until a real GTIN/MPN source is verified per product.
- `condition` (enum: new/refurbished/used), `ageGroup`, `gender` where the category needs them — nullable, category-gated.
- Price stored in integer minor units (cents) in the product/offer's operating currency, with a documented, tested conversion function to Merchant API `amountMicros` — no float price fields anywhere in the path.
- A real `Promotion`/sale-period entity (start/end timestamps, applicable product/offer references) if and when a genuine discount feature is built — never a fabricated "Deals" ranking reused as a promotion.
- `link`/`mobileLink` resolve deterministically from the canonical product/offer URL — never hand-maintained separately from routing.

### 3. One price, one source of truth

The Product/Offer entity's stored price is the *only* value the PDP renders and the *only* value any future Merchant feed/API export reads. No independently-computed "display price" may diverge from it. The PDP must continue rendering price in server-rendered HTML (as `/p/[id]` already does) — never inject or mutate the displayed price client-side after initial paint, since Google's price-match crawl is HTML-only and a mismatch is a documented, named disapproval reason.

### 4. Media eligibility is part of media selection, not a separate later filter

[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]'s existing seller/supplier media pipeline gains a Merchant-Center-eligibility signal (resolution floor, no watermark/overlay/placeholder) as a first-class check when that pipeline is actually built — not a bolt-on added after ADR-011 ships.

> [!NOTE] Decision §2 implemented 2026-08-12; everything else unchanged
> The first Product/Offer/Media migration exists and carries the columns §2
> requires: `google_product_category`, `brand_name`, `condition`,
> `age_group`, and `gender` on the product; `gtins[]` (capped at ten by a
> check constraint), `mpn`, and `identifier_exists` on the variant; and
> integer-minor-unit prices in a `bigint` with a lossless path to
> `amountMicros`. GTIN/MPN/brand sit on the **variant** because one Sals3
> variant maps to one Merchant API offer. All are nullable and **never
> auto-populated** - [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]
> §7 still forbids inventing a value. A `product_media_sources` provenance
> table exists with a `merchant_center_eligible` column that stays null
> because no watermark/overlay/resolution check exists yet, per §4. No
> `Promotion` table was created: §2 makes it conditional on a genuine discount
> feature, and Sals3 still has none.
>
> See [[sals3-portal-canonical-product-catalog-backend]]. Migration
> `0013_cold_timeslip.sql` is generated and **not applied**. Decisions §1, §3,
> §4, and §5 remain not started - no exporter, DataSource, or feed exists.

### 5. Feed/API enablement itself remains gated behind the existing catalog-readiness order

This ADR does not move up [[ADR-010-catalog-decision-governance-and-shadow-enforcement]]'s blocker-removal order, ADR-013's discovery/evidence gates, or [[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]'s pricing-governance work. Actually connecting to Google Merchant Center, running a DataSource, or exporting a live feed happens only after a real curated catalog exists and passes its own publication gates — this ADR only fixes the schema shape so that day requires no backfill migration.

## System impact

- Data and schema: adds the columns listed in §2 to the eventual Product/Offer/Media entities — no existing table changes today, since none of those tables exist yet. Zero runtime cost until populated.
- Modules: future Product/Offer persistence layer, [[ADR-011-product-media-source-selection-and-supplier-original-preservation]]'s media pipeline, the PDP price-rendering path, and any future Merchant feed/DataSource exporter (not yet designed).
- User workflow: none today — no seller- or buyer-facing surface changes as a direct result of this ADR.
- Financial or compliance effect: none today. Prevents a future compliance blocker (feed disapprovals) and an expensive schema retrofit.
- Migration and rollback: no migration exists yet to roll back; this ADR is a constraint applied to the *first* migration of a table that has not been written.

## Required verification

- Focused tests: none yet — no code changes ship with this ADR.
- Full or cross-module tests: when the Product/Offer schema is designed, a test asserting the PDP-rendered price and the stored Offer price are byte-identical, and a test asserting price conversion to `amountMicros` is lossless for the operating currency's minor-unit precision.
- Manual acceptance: before any live Merchant Center connection, a manual review confirming zero placeholder/`channel`/`targetCountry` fields were written to a product record (those fields do not exist on the Merchant API and their presence would indicate Content-API-shaped code leaked in).
- Data reconciliation: none yet.

## Supersession

None. This ADR activates — rather than contradicts — [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] §7/§11's GTIN/MPN/channel-feed parking rule and the matching [[parked-ideas-backlog]] "Post-pilot catalogue sophistication" entry: those items remain parked for *implementation* (no channel integration ships today), but this ADR is the "approved external channel" event both already anticipated as their own unblock condition, so the *schema* preparation described in Decision §2 is no longer deferred.

## Amendment — 2026-08-21: the Google Product Category crosswalk is no longer missing; it is the category code

> [!WARNING] Supersedes confirmed gap #1
> Gap #1 above says "**No Google Product Category crosswalk exists**... it has zero mapping to
> Google's product taxonomy anywhere in the adopted workbook." That was true when written on
> 2026-08-11. It became **false on 2026-08-14**, and this ADR has been carrying a stated blocker
> that no longer exists for a week.

### What changed

The owner replaced the taxonomy's reference data the same week this ADR was written. Per
[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]'s own 2026-08-14 amendment, the 1,345-row
Shopee-derived set became **5,595 rows sourced from Google's official product taxonomy**
(`Google_Product_Taxonomy_Version: 2021-09-21`), and the Universal Category Code format became
`CAT-GGL-<Google numeric category ID>`.

So Sals3 categories are not *mapped to* Google's taxonomy. **They are Google's taxonomy**, and
each row's code carries Google's own category ID as its suffix.

### Verified, 2026-08-21

Against `sals3-portal`'s committed extract at `origin/develop`
(`src/lib/db/seed-data/sals3-taxonomy-v1.json`), which is what the application actually seeds —
not the workbook, which is never read at runtime:

- 5,595 rows, 21 bare-L1 departments, and **every** code matches `CAT-GGL-<digits>`.
- All 21 department codes carry Google's real top-level category IDs: `1` Animals & Pet
  Supplies, `8` Arts & Entertainment, `111` Business & Industrial, `141` Cameras & Optics,
  `166` Apparel & Accessories, `222` Electronics, `412` Food, Beverages & Tobacco, `436`
  Furniture, `469` Health & Beauty, `536` Home & Garden, `537` Baby & Toddler, `632` Hardware,
  `772` Mature, `783` Media, `888` Vehicles & Parts, `922` Office Supplies, `988` Sporting
  Goods, `1239` Toys & Games, `2092` Software, `5181` Luggage & Bags, `5605` Religious &
  Ceremonial.
- `ACTIVE_TAXONOMY_VERSION` is `sals3-taxonomy-v1`, and the taxonomy is confirmed seeded in
  production (see [[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux]]).

Worth recording how this was checked, because the first pass looked like it had found a defect:
two sampled IDs appeared not to match the department names expected for them, which read as a
data-quality problem in the extract. Re-checking against the full department list showed the
extract was right and the **expectation** was wrong — the IDs had been recalled from memory
rather than read. A spot-check against remembered values is not evidence; the enumeration is.

### What this changes, and what it does not

**Changes.** `googleProductCategory` is derivable **today**, for every categorised product, by
stripping the `CAT-GGL-` prefix from `sals3_categories.code`. No crosswalk table, no mapping
rules, no owner approval of per-category mappings, and no migration: the column added by this
ADR's §"Decision" already exists and is nullable.

**Does not change.** Nothing here authorizes populating it, and nothing here relaxes a gate:

- Google's ID is the **numeric** category ID. Merchant accepts either the numeric ID or the full
  category path string; which form Sals3 sends is an implementation choice this amendment does
  not make.
- The taxonomy version is **2021-09-21**. Google has published later revisions, and category IDs
  can be retired between them. Populating `googleProductCategory` from this extract needs one
  freshness check against Google's current published taxonomy first, and a decision about what
  happens to a product sitting on a retired ID.
- The **presets** on those 5,595 rows (variation architecture, tier 1-2 attributes, SKU format,
  required attributes) are still the Gemini-generated, source-less data ADR-002's amendment flags
  as its material risk. Only the *category identity* is Google's. Do not read this amendment as
  validating anything else in the workbook.
- Gaps **#2 (no GTIN/MPN/brand evidence pipeline)** and **#3 (no promotion/sale-period entity)**
  stand unchanged, as does the feed/API wiring deferral. ADR-013 §7's rule against inventing
  identifier values is untouched.

### Two smaller corrections in this ADR's own scope

**Brand.** A buyer-facing `Generic` now renders for a product whose workbook `Brand` attribute
holds the `UNBRANDED` token — a display mapping in the portal
(`categoryAttributeValueDisplayLabel`), with the raw token still stored. `Generic` is also what a
Merchant feed expects for genuinely unbranded goods, so this is aligned with the unique-identifier
rule in Evidence above rather than in tension with it. It is a *mapping*, not an invented brand.

**Country of origin.** The storefront renders it only when a seller actually chose a value: the
portal omits the row entirely for an unanswered attribute, and the editor's `Others` is a
placeholder rather than a stored value. So a defaulted `Others` cannot reach JSON-LD, a
`countryOfOrigin` field, or a Merchant feed — which is the guard the PDP v3.1 build spec asked
for, enforced by absence rather than by a filter that could be forgotten. See
`sals3-portal`'s `src/modules/catalog/storefront/specification.ts`.

**Frontmatter `updated`** moved to 2026-08-21. `status` stays `approved`: this amendment removes a
stated blocker and records two implemented details, and decides nothing new.

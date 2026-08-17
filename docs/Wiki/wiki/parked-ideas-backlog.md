---
tags:
  - backlog
  - parked-ideas
  - sals3
aliases:
  - Parked Ideas Backlog
created: 2026-07-31
updated: 2026-08-17
status: canonical
authority: parked-backlog
owner_approved: true
related:
  - "[[vault-governance-and-note-lifecycle]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
---

# Parked Ideas Backlog

> [!WARNING] Not authorized for implementation
> A parked entry can inform architecture compatibility, but it must not enter an active build until the owner explicitly un-parks it and the challenge review is complete.

Ideas the owner explicitly parked/shelved/deferred mid-conversation. Not scheduled, not being built — logged so they are never lost. When one gets unparked, move it out of this file (or strike it through with a date and link the session note that revived it).

## Entry format (per `Wiki/CLAUDE.md` Parking Protocol)

Log each parked idea in the same turn it is parked, under `## Active parked items`:

```
### YYYY-MM-DD — <short title>
- **What:** <the idea, one or two sentences>
- **Why parked:** <reason or blocker, with `wikilinks` to governing docs or hot.md gap items>
- **Unblock condition:** <what has to be true before this can be picked up>
- **Related:** <`wikilinks`>
```

## Active parked items

### 2026-08-17 — PDP structured product data, URL handle/redirect editing, AI listing enrichment, and SEO page title expansion
- **What:** A small linked note set (`sals3-deferred-product-discovery/00 - Start Here` and four linked notes) holding four pieces of PDP/storefront work out of the current Product Editor pass: automatic `Product` structured data/schema on the PDP, seller-editable URL handles with redirect behavior, Gemini-based AI listing enrichment (title/meta-description/description/attribute suggestions), and full SEO page-title generation beyond the current editable Meta Description and search preview.
- **Why parked:** None of the four has PDP/storefront routes or a provider/API decision behind it yet; Product Editor deliberately keeps Specification/meta-description editing separate from PDP-owned automatic metadata generation, and AI generation needs its own provider/safety review before any code is written. See [[../../sals3-deferred-product-discovery/00 - Start Here]].
- **Unblock condition:** PDP/storefront product-page routes exist for the structured-data and URL-handle items; an explicit AI/provider (Gemini) decision and safety review for the enrichment item; an explicit owner approval to expand Product Editor's SEO surface beyond Meta Description for the page-title item.
- **Related:** [[sals3-geo-aeo-seo-strategy-proposal]], [[hot]]

### 2026-08-10 — Product-safety incident and recall automation
- **What:** A dedicated post-sale `ProductSafetyIncident`/`RecallCase` system with affected-product/order tracing, stop-sale/fulfillment actions, customer notification, remedy tracking, regulator-deadline support, and recalled-product watch lists.
- **Why parked:** Bogs explicitly parked this on 2026-08-10 after the product-gap review. The first catalog remains a low-risk positive-allowlist pilot, and pre-publication safety/compliance review remains active; a full recall case-management subsystem is not required to build the candidate-to-Product-Catalogue slice. Parking the software does not authorize unsafe products or remove any enabled market's legal/operational duty to stop sale and respond to a real incident.
- **Unblock condition:** Before enabling a category/market that requires batch/lot/serial traceability; when real sales volume makes a manual incident process inadequate; or immediately after a real safety incident/official recall creates an operational requirement.
- **Related:** [[ADR-010-catalog-decision-governance-and-shadow-enforcement]], [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]], [[cj-candidate-to-sals3-product-draft-implementation-spec]]

### 2026-08-10 — Post-pilot catalogue sophistication
- **What:** Optional GTIN/MPN/manufacturer/channel-feed integration; automated physical sample-inspection software; external search-index repair/reconciliation; advanced trend velocity/outlier/saturation models; and complex product-specific return-policy rules.
- **Why parked:** The calibrated review found these useful only after a real trigger. Phase 1 can use Sals3 Product/Variant IDs plus CJ references, a manual sample checklist for selected products, direct Product Catalogue reads, truthful daily CJ trend V0, and one versioned market-wide return/refund/warranty policy. Building the larger systems before the corresponding channel, index, volume, outcome data, or category exception exists would add unverified complexity and cost.
- **Unblock condition:** Independently per item: an approved external product channel or identifier requirement; measured sample/quality workload; an independently updated search service/cache; sufficient time-series and Sals3 conversion/return data; or an enabled category requiring a return-policy exception.
- **Related:** [[ADR-011-product-media-source-selection-and-supplier-original-preservation]], [[ADR-012-supplier-trend-signals-and-storefront-merchandising]], [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]], [[ADR-003-international-availability-shipping-and-pricing]]

> [!NOTE] GTIN/MPN/channel-feed sub-item partially unblocked, 2026-08-11
> Bogs's Google Merchant Center directive is exactly the "approved external product channel or identifier requirement" this item's own unblock condition named. [[ADR-016-google-merchant-center-product-feed-compliance]] unblocks the **schema shape** only — the eventual Product/Offer entity must carry `gtin`/`mpn`/`brand`/`identifierExists`/`googleProductCategory` columns from its first migration. It does **not** unblock the channel-feed integration itself (connecting to Google Merchant, running a DataSource, exporting a live feed): that remains parked behind the same catalog-readiness order as before. The other three sub-items (sample-inspection software, search-index reconciliation, advanced trend models) remain fully parked, unaffected by this note.

### 2026-08-05 — GEO/AEO PDP and cart machine-readable structure
- **What:** From [[sals3-geo-aeo-seo-strategy-proposal]]: `generateMetadata` per PDP, ~~`Product`/`Offer`~~ / `AggregateRating`/`FAQPage` JSON-LD, `useOptimistic` cart UX, and `sitemap.xml`.
- **Why parked:** `generateMetadata` per PDP is done and `/p/[id]` plus `/cart` exist. The rest stays parked: `Product`/`Offer` structured data needs the curated, truthful Sals3 catalog and destination-valid offer defined by ADR-001/003; `AggregateRating` requires real Sals3-visible review evidence and must be omitted otherwise. `useOptimistic` does not apply to the current synchronous `localStorage` cart and becomes relevant only with a real server cart. `/c/[category]` still does not exist, so category-hub pieces remain blocked.
- **Unblock condition:** `Product`/`Offer`/`AggregateRating` JSON-LD — a real, Sals3-owned product catalog (Stage 3). `useOptimistic` — a real server-backed cart (Stage 5, not the client-only cart shipped 2026-08-05). `FAQPage`/category-hub pieces — the `/c/[category]` route.
- **Related:** [[sals3-geo-aeo-seo-strategy-proposal]], [[sals3-implementation-phases]], [[sals3-ux-build-specification]], [[sals3-session-2026-08-05-part05-product-detail-page]], [[sals3-session-2026-08-05-part07-cart]]

### 2026-08-05 — GEO/AEO neuromarketing UI and citation-first content
- **What:** From [[sals3-geo-aeo-seo-strategy-proposal]] §4–5: price-anchoring/loss-aversion UI (real-inventory-backed only, never fabricated urgency), persona-filtered social proof, and ~60-word citation-first lead summaries on PDP/category-hub content.
- **Why parked:** Needs PDP/category-hub routes to apply to (same blocker as above). Also needs the same "one clear priority per screen" design-token check already flagged unresolved for [[sals3-marketing-banner-integration-proposal]] before any high-contrast banner/urgency UI ships.
- **Unblock condition:** PDP/category routes exist, and the colour-token question from [[sals3-marketing-banner-integration-proposal]] is resolved.
- **Related:** [[sals3-geo-aeo-seo-strategy-proposal]], [[sals3-marketing-banner-integration-proposal]]

### 2026-08-05 — Next.js `next/link` prefetch tuning for PDP/category nav
- **What:** Tune `next/link` prefetch behavior (e.g. `prefetch` prop per link, App Router prefetch/segment-cache config in `next.config.ts`) for navigation into product detail and category pages, so those routes feel instant once linked from the home page grids/carousel.
- **Why parked:** `/p/[id]` now exists, but `/c/[category]` does not. Current product data also depends on a protected upstream API, so prefetch cost and rate-limit behavior need measurement before enabling broader automatic prefetch.
- **Unblock condition:** Category routes exist and route-level performance/upstream-call measurements show prefetch is safe and useful.
- **Related:** [[sals3-implementation-phases]], [[sals3-ux-build-specification]]

### 2026-08-05 — GEO/AEO off-site brand graph
- **What:** From [[sals3-geo-aeo-seo-strategy-proposal]] §6: Wikidata/Google Knowledge Graph entries, cross-platform consistency (Trustpilot, marketplaces, forums), trade-press entity co-occurrence.
- **Why parked:** Business/ops work, not code — not blocked by any route, but not started and not this vault's call to schedule.
- **Unblock condition:** Bogs/AJ decide to prioritize off-site brand presence work.
- **Related:** [[sals3-geo-aeo-seo-strategy-proposal]]

### 2026-08-06 — Jurisdiction and governing-law review (Australian base vs. this vault's Philippine premise)
- **What:** Establish where Sals3 is incorporated, which markets it sells into, and which law governs — then get legal review in those jurisdictions. Bogs stated on 2026-08-06 that **Sals3 is an Australian-based company**, while much of this vault starts from a Philippine-company premise: RA 11967 (Internet Transactions Act) as the governing e-commerce law (build spec sections 9, 14, 17.3, 22), BIR/EOPT tax-invoice logic, *"a Philippine lawyer must review before launch"*, PHP as home currency, GCash/Maya as payment rails, and "Philippines as Market #1."
- **Why parked:** Catalog schema exploration and non-commercial product drafts can proceed, but this becomes a blocker before enabling a market, presenting final consumer prices/tax claims, accepting payment, sending supplier orders, issuing invoices, or launching. **This is not a find-and-replace of "Philippines" with "Australia."** Selling into the Philippines may engage Philippine rules; an Australian-based business may engage Australian Consumer Law/GST; every enabled market can add further obligations. Use versioned market configuration rather than baking one jurisdiction into the core, then obtain qualified legal/accounting review.
- **Two consequences that are live now, even while parked:**
  1. The fabricated `oldPriceMinor` comparison price (see [[hot]]) has **higher** exposure than first recorded — Australian Consumer Law is strictly enforced on "was/now" pricing and the ACCC actively prosecutes it. That defect must be fixed regardless of how the jurisdiction question resolves.
  2. Any work sequenced off *"a Philippine lawyer must review before launch"* needs its jurisdiction confirmed first, or the wrong lawyer reviews the wrong law.
- **Unblock condition:** Before any tax, invoicing, payout, consumer-disclosure, or launch-gate work starts — and before the pre-launch legal review is booked. Whichever comes first.
- **Related:** [[ADR-001-seller-center-cj-sourcing-to-my-products]], [[sals3-global-seller-center-ux-blueprint-proposal]], [[sals3-ux-build-specification]], [[sals3-management-bible]], [[hot]]

### 2026-08-06 — Commission calculation and seller payout for the catalogue/Seller Center work
- **What:** Commission rate logic, commission calculation on an order line, and the seller payout report — the [[sals3-implementation-phases]] Stage 7 items, plus the "financial truth" v1 bet (itemized ledger, estimated/pending/final settlement states) from [[sals3-global-seller-center-ux-blueprint-proposal]].
- **Why parked:** The first curated catalog phase is single-seller, so third-party commission and seller payout are not reachable. Payment fees, supplier cost, tax, refunds, settlement, and the order ledger are **not commission** and remain required for prepaid commerce under ADR-003/005. Commission values and payout rules stay parked until a real third-party seller and approved commercial structure exist.
- **Unblock condition:** A real third-party seller (retail or dropshipper) is being onboarded — the near-future direction Bogs confirmed on 2026-08-06 — **and** Leadership has confirmed the commission rate and payment-partner list.
- **Related:** [[ADR-001-seller-center-cj-sourcing-to-my-products]], [[sals3-global-seller-center-ux-blueprint-proposal]], [[sals3-implementation-phases]], [[sals3-management-bible]]

### ~~2026-08-07 — CJ candidate preflight decision engine (hard gates, quality score, compliance gate)~~ — UNPARKED AND BUILT WITH PLACEHOLDERS, SAME DAY

> [!NOTE] Unparked hours after being logged, resolved differently than expected
> Bogs directed this be built anyway, later the same day, in a corrected/narrowed turnover scope for the single-seller dev/official context — explicitly deferring the Shopify-style per-seller supplier-connection work to a separate task. The engine now exists and is verified (`sals3-portal`, automated evaluation pipeline: `src/modules/catalog/candidates/{ingestion,lease,evaluate,run-tick}.ts` + `rules/`). See [[sals3-skills]] lesson 54 for the full anti-yesman sequence — a challenge review was run before building, because this reopened a decision Bogs himself had chosen to defer only hours earlier.
>
> **The underlying blocker named below is still real and still unresolved.** No complete ADR-002/ADR-003 pilot category-and-market rule pack exists. Bogs approved `AU` as the initial buyer destination on 2026-08-11, but the prohibited-category/counterfeit policy, price/margin thresholds, source anchors, AU freight/compliance evidence, and promotion gates remain unresolved. Every decision remains provisional until the complete pilot pack and evidence replace the remaining placeholders. See spec [[cj-candidate-to-sals3-product-draft-implementation-spec#Labelled placeholders, not approved policy]].
- **What:** Sections 8.4, 8.5, 8.6, and 14 of [[cj-candidate-to-sals3-product-draft-implementation-spec]]: the objective hard gates, the versioned pilot quality score, the country/category compliance gate, and the `PASS`/`PASS_WITH_ATTENTION`/`REVIEW`/`HOLD`/`BLOCKED` decision that combines them.
- **Why parked:** Not blocked by code — the **evidence** it would judge is already fetched and stored (see §26 of the spec). It is blocked by a business decision: ADR-002 has approved no pilot category/market rule pack, and spec §14.1 says a category with no rule for a market is `NOT_IN_PILOT`. Building the engine now would be correct and fully tested, and would return `HOLD` for **every** candidate no matter how good it is. That is the spec working as designed, not a bug — but it ships an operationally useless funnel and invites someone to later "fix" it by weakening the gate. Bogs was offered this trade-off on 2026-08-07 and chose to wire the evidence fetch first.
- **Unblock condition (now for the placeholders, not the engine itself):** Bogs or a named rule owner approves a minimal pilot pack — at least one low-regulatory-risk category, one enabled market, and a margin/contribution floor — per ADR-002 §5 and ADR-003 §4. Once approved, replace the three placeholder checks with the real rule pack; no schema change is needed (`policy_version` already exists for exactly this).
- **Related:** [[cj-candidate-to-sals3-product-draft-implementation-spec]], [[ADR-002-sals3-taxonomy-and-cj-category-mapping]], [[ADR-003-international-availability-shipping-and-pricing]], [[hot]]

### 2026-08-07 — Shopify-style per-seller CJ connections, Supplier Apps, and a second supplier provider
- **What:** ADR-008's curated Supplier Apps, seller-entered/owned CJ API credentials with a credential vault and per-seller token refresh, a second (and third) supplier provider adapter, and multi-seller production tenancy for the catalog/evaluation pipeline. The per-seller connection half of this (`seller_accounts`/`supplier_providers`/`supplier_connections`) shipped 2026-08-07 — see [[sals3-session-2026-08-07-part15-multi-tenant-supplier-connections-and-ui-overhaul]]. Still parked: any provider besides CJ.
- **Named suppliers, corrected 2026-08-08 (owner decision):** AliExpress was this entry's original placeholder example. Bogs has since named the real candidates — **Baap Store (India, already registered)** and **Spocket** — alongside CJ Dropshipping. See [[sals3-session-2026-08-08-part19-owner-decision-cj-wallet-and-multi-supplier-roadmap]]. `src/modules/suppliers/providers/` already isolates CJ behind one `SupplierProviderAdapter` interface for exactly this, but each provider's API shape differs (stock, shipping routes, images, categories), so the automated evaluation rules built against CJ's evidence will need a per-provider mapping, not a drop-in swap.
- **Why parked:** No date or owner assigned yet for building either adapter. Do not build any part of it speculatively while working on catalog/evaluation features.
- **Unblock condition:** Bogs/AJ prioritize Baap Store or Spocket as a separate task.
- **Related:** [[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]], [[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]], [[cj-candidate-to-sals3-product-draft-implementation-spec]]

### 2026-08-07 — CJ destination freight evidence for preflight
- **What:** `POST /logistic/freightCalculate` as part of preflight evidence (spec §8.3), plus the destination-availability and landed-cost checks that depend on it (spec §8.5, §13).
- **Why still parked:** `AU` is approved as the initial buyer destination as of 2026-08-11, so the missing-country blocker is resolved. The remaining blocker is an approved AU quote strategy: exact product variant/quantity/origin inputs, representative metro/regional/remote coverage or another defensible qualification method, freshness/expiry rules, and the boundary between qualification evidence and the customer's exact checkout postal quote. One postcode cannot prove nationwide Australian coverage.
- **Unblock condition:** ADR-003's versioned enabled-country allow-list has at least one approved market with representative postal codes. Note ADR-003's own CJ quota priority order — freight confirmation ranks below paid-order creation, so the central limiter matters once this is live.
- **Related:** [[cj-candidate-to-sals3-product-draft-implementation-spec]], [[ADR-003-international-availability-shipping-and-pricing]]

### 2026-08-07 — Supplier HTML sanitisation and the CJ source-comparison panel
- **What:** Sanitising CJ's `description` HTML so it can be shown as source material (spec §9.4's source-comparison panel), and the wider media pipeline in spec §12.
- **Why parked:** The CJ `description` is already fetched and stored in `supplier_snapshots` — roughly 985 characters of raw supplier HTML for the probed product. Nothing sanitises it, so it is deliberately never rendered; the evidence panel shows structured facts only. Adding a sanitiser is a real decision (which library, which allow-list, stored-XSS test coverage) and spec §5.1 requires the published description to use a structured allow-listed document format rather than pasted supplier HTML, so this should be built with that target shape in mind rather than as a quick `dangerouslySetInnerHTML` with a filter.
- **Unblock condition:** Picked up together with the Product Editor's Description tab (spec §9.4), so the sanitiser and the structured `descriptionDocument` format are designed as one piece.
- **Related:** [[cj-candidate-to-sals3-product-draft-implementation-spec]], [[nextjs-component-security-code-rules]]

### ~~2026-08-07 — CJ Candidate Explorer page naming and its stale "not built yet" banner~~ — UNPARKED AND FIXED 2026-08-07

> [!NOTE] Resolved the same day
> Bogs unparked this immediately after it was logged, directing that outstanding issues be fixed before any new feature work. Fixed in `sals3-portal#6`: the page heading, tab title, and sidebar link all read `CJ Candidate Explorer` (spec §8.13's product-facing name), the topbar keeps showing the `Product Sourcing` nav group because that is what it is for, and the banner now states what is true — a candidate can be shortlisted and its CJ variants, stock, and review counts read, while nothing is imported, priced, published, or screened. The route stays `/products` so existing links and the storefront feed's references keep working. An e2e test now asserts the heading matches the sidebar name and that "is not built yet" cannot return. Entry kept, struck through, for the record.

- **What:** One page carried three different names, and its banner contradicted its own UI. Confirmed live by Bogs on 2026-08-07 and reported as confusing.
  - Topbar shows `Product Sourcing` (the nav **group** label).
  - Sidebar shows `CJ Candidate Explorer`.
  - The page's own `PageHeader` still shows `Products` / "Supplier catalogue from CJdropshipping".
  - `CjCatalogueView`'s banner still ends with *"Importing a supplier product for resale is not built yet"* while every row now has a **Check for Sals3** button. The sentence is still literally true — nothing imports, publishes, or prices — but next to that button it reads as a contradiction rather than as a scope note.
- **Why it was parked (briefly):** Deferred on 2026-08-07 rather than taking another change into `sals3-portal#6` that night. Cosmetic, not a correctness or security problem — the button's behaviour, permissions, and honest states were already covered by tests. Cause was the nav label being renamed to the spec §8.13 product-facing name without updating the page header or banner in the same pass.
- **Unblock condition:** None — it was never blocked, only deferred. Unparked and closed within hours.
- **Related:** [[cj-candidate-to-sals3-product-draft-implementation-spec]], [[sals3-global-seller-center-ux-blueprint-proposal]]

### 2026-08-13 — Category PIC assignment model and a real product-override UI

- **What:** Give each seller's authorized owner/admin a way to assign specific users as the Person In Control (PIC) for one or more Sals3 categories, scoping `pricing_policy:manage` down from "everything" to "only products/overrides within my assigned categories" — plus the real UI screen a PIC would actually use to set a product-level margin override on a real, sourced product (today the Product Editor that would host this is 100% mock/fixture data with no real candidate id to attach to). Optionally, per [[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]] §5: two-person approval for unusually large/long-lived overrides.
- **Why parked:** Bogs raised this as a "what happens when the company grows" question while `market-rules` category/FX UI redesign work was underway (2026-08-13). The underlying precedence mechanism this depends on is **already built and tested** — `src/modules/pricing/resolver.ts` correctly resolves category → product override → variant override (most specific wins), and `saveProductOverrideAction`/`saveVariantOverrideAction` in `src/app/(portal)/market-rules/pricing-actions.ts` are real, tenant-scoped, audited server actions, not fixtures. What is missing is (a) a per-category authorization boundary — `pricing_policy:manage` is currently all-or-nothing, held only by `seller_manager`, with no concept of "assigned categories" at all — and (b) a real (non-mock) screen to call the override actions from. Building either now, with a single-seller/single-PIC reality, would be schema and UI for a role structure nobody holds yet.
- **Unblock condition:** A real second seller-side user who needs category-scoped (not full) pricing authority — i.e. the company actually has more than one person who should be able to touch pricing, and their authority needs to be narrower than `seller_manager`'s current full access. Independently, the Product Editor's move off 100%-mock fixture data (needed regardless, to make product/variant overrides reachable from a real screen at all) can happen first without requiring the PIC/authorization piece.
- **Related:** [[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]], [[sals3-portal-seller-market-configuration]]

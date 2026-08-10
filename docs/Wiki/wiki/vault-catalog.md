---
tags: [moc, catalog, second-brain, governance]
aliases: [Sals3 Vault Catalog, Note Catalog]
created: 2026-07-31
updated: 2026-08-10
status: canonical
authority: navigation
owner_approved: true
related: ["[[index]]", "[[vault-governance-and-note-lifecycle]]"]
---

# Sals3 Vault Catalog

> [!IMPORTANT] Coverage rule
> This catalog assigns every Markdown note to an authority or discovery path. A note that appears here is discoverable; its presence does not make it authoritative.

## Root operating notes

- `Wiki/CLAUDE.md` — constitutional agent entry point.

## Constitutional and navigation notes

- [[ADR-014-admin-portal-platform-governance-and-global-controls]] — approved future Admin Portal boundary for global markets, seller-account governance, global marketing, provider controls, versioned publication, and audited high-impact actions; not implemented.

- [[agent-operating-contract]] — anti-yesman and verification rules.
- [[nextjs-component-security-code-rules]] — mandatory Next.js component architecture, security, and verification gate for all Sals3 codebase edits.
- [[project-structure-installation-and-runbook]] — canonical repository structure, package installation rules, run commands, verification commands, and README update rule.
- [[team-profile-and-collaboration-preferences]] — who's on the team (AJ and Bogs, shared vault) and how they want an agent to work with them.
- [[autonomous-loop-sop]] — default act-observe-adjust operating discipline for any problem.
- [[vault-sync-setup-guide]] — Obsidian Git setup, sync mechanics, and troubleshooting for new machines.
- [[vault-onboarding-prompt-for-agent]] — agent-facing copy-paste version of the same setup.
- [[sals3-turnover-prompt-template]] — canonical agent-handoff prompt format.
- [[sals3-master-blueprint]] — v4.0 whole-system architecture, commercial strategy, and transition blueprint (sample/demonstration status).
- [[vault-governance-and-note-lifecycle]] — authority, status, idea, and change rules.
- [[architecture-decision-template]] — ADR template.
- [[ADR-001-seller-center-cj-sourcing-to-my-products]] — approved curated CJ sourcing, catalog ownership, architecture, seller/offer, content, media-rights, and publish-gate decision; not implemented.
- [[ADR-002-sals3-taxonomy-and-cj-category-mapping]] — approved Taxonomy v0 pilot adoption, CJ mapping, provenance, and production-validation decision.
- [[ADR-003-international-availability-shipping-and-pricing]] — approved market enablement, destination freight, currency, pricing, and international SEO decision.
- [[ADR-004-cj-ordering-tracking-and-fulfillment]] — approved direct CJ order, wallet, webhook, tracking, and reconciliation decision.
- [[ADR-005-payment-settlement-refunds-and-cod]] — approved payment/refund state separation and phase-1 COD exclusion.
- [[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]] — approved separate business-model registrations/accounts, tenant-owned supplier connections, CJ adapter migration, and controlled multi-provider architecture.
- [[ADR-007-supplier-change-attention-and-immutable-order-snapshots]] — approved supplier delist/stock/price anomaly handling, multi-channel seller attention, active-order continuity, and immutable ordered-item/media snapshots.
- [[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]] — approved curated installable Supplier Apps, tenant-owned provider accounts/wallets, separate payout/supplier-payment rails, commission mechanism, and insufficient-funding controls.
- [[ADR-010-catalog-decision-governance-and-shadow-enforcement]] — approved evidence-first catalog decision governance, golden pilot catalogue, shadow/canary enforcement, near-duplicate clustering, policy-source records, connection-scoped resilience, and future-technology activation triggers; not implemented.
- [[ADR-011-product-media-source-selection-and-supplier-original-preservation]] — approved seller/supplier media-source resolver, original-source preservation, rights-aware fallback, controlled revision media, and Product Catalogue media statuses; not implemented.
- [[ADR-012-supplier-trend-signals-and-storefront-merchandising]] — approved CJ trend/listing-signal ingestion, qualified category-normalized ranking, truthful storefront merchandising, and Portal/ecommerce ownership boundary; not implemented.
- [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] — approved CJ evidence fidelity, lean stock/freight/scan/webhook recovery, supported product modes, variant/media truth, and triggered rather than speculative catalog complexity; not implemented.
- [[index]] — main map of content.
- [[hot]] — verified current implementation state.
- [[ai-context-and-wiki-architecture]] — second-brain context architecture.
- [[parked-ideas-backlog]] — deferred work.
- [[sals3-skills]] — consolidated engineering lessons (42 entries as of 2026-08-06).

## Business and product

- [[sals3-ux-build-specification]] — **current canonical technical authority**, Final status, 1 August 2026. Design rules, screen layouts, system architecture, API contracts, price/promotion engine, 8-stage build order, expectations.
- [[sals3-management-bible]] — canonical Sals3 domain bible; points to the build spec for technical detail.
- [[sals3-implementation-phases]] — canonical Sals3 task and phase register (built around the build spec's 8 stages).
- [[sals3-end-to-end-process-flow]] — canonical Sals3 flowchart.
- [[sals3-manual-testing-checklist]] — canonical Sals3 manual testing queue.
- [[sals3-feature-landscape-and-expansion-map]] — canonical Sals3 capability map.
- [[sals3-master-blueprint]] — historical/sample Executive Summary and former 3-pillar strategy. Its Shopify pop-up/dual-track plan is retired; current technical and operating direction comes from the approved ADRs, implementation spec, build spec, and execution plan.
- [[universal-category-variation-taxonomy-reference]] — adopted as Sals3 Taxonomy v0 for pilot use via ADR-002; not yet fully production-validated.
- [[sals3-cj-dropshipping-integration-plan]] — superseded historical CJ auto-import proposal; ADR-001/002 govern the current direction.
- [[sals3-portal-code-review-2026-08-06]] — 7 findings from reading `sals3-portal`'s CJ integration/storefront-API code directly (pagination mismatch, unbounded cache, dead reset logic, fabricated total, uncaught `PermissionError`, and two documented/defensive-coded items). Findings only, not fixed.
- [[sals3-marketing-banner-integration-proposal]] — proposed marketing banner placements (home, in-feed, PDP, cart). Proposed, not yet reviewed; flags objections.
- [[sals3-geo-aeo-seo-strategy-proposal]] — proposed GEO/AEO/SEO + neuromarketing architecture (Next.js RSC, JSON-LD entity graph, citation-first content, `llms.txt`). Route-independent pieces (`robots.txt`, `llms.txt`, global `Organization` JSON-LD) implemented and verified 2026-08-05; PDP/cart-dependent pieces parked in [[parked-ideas-backlog]].

## Customer Website

- [[sals3-session-2026-08-05-part01-marketplace-landing-page]] — session record for the marketplace landing page, the first real screen (merged to `develop` 2026-08-05).
- [[sals3-session-2026-08-05-part02-footer-and-pagination]] — site footer (compliance-claim audit) and numbered pagination, code merged to `develop`.
- [[sals3-session-2026-08-05-part03-geo-aeo-seo-machine-endpoints]] — `robots.txt`, `llms.txt`, global `Organization` JSON-LD shipped; PDP/cart-dependent GEO/AEO items parked.
- [[sals3-session-2026-08-05-part04-home-page-seo-geo-aeo]] — `generateMetadata`, `WebSiteSchema` JSON-LD, sr-only `<h1>`, `sitemap` in `robots.ts`, enriched `llms.txt`. Merged to `develop`.
- [[sals3-session-2026-08-05-part05-product-detail-page]] — first `/p/[id]` product detail page. PR #21 open, not yet merged.
- [[sals3-session-2026-08-05-part06-guest-header-strip]] — signed-out header strip, `/login`/`/signup` placeholders. PR #21 open, not yet merged.
- [[sals3-session-2026-08-05-part07-cart]] — client-only shopping cart, live Add to Cart/Buy Now, `/cart` route. PR #21 open, not yet merged.
- [[sals3-session-2026-08-05-part08-cart-toast-and-ux-audit]] — add-to-cart toast, first `ui-ux-pro-max` audit pass. PR #21 open, not yet merged.
- [[sals3-session-2026-08-05-part09-ui-ux-pro-audit]] — `ui-ux-pro`/`frontend-design` audit, tablet-breakpoint bug fix. PR #21 open, not yet merged.
- [[sals3-session-2026-08-06-part10-pr21-pr22-reconciliation-and-cj-bugfixes]] — PR #21 reconciled against PR #22's real backend; three real production bugs found and fixed (CJ rate-limit hammering, deals-section discard, and the actual root cause — a Zod schema rejecting a whole page over one overlong title). PR #21/#24/#25 merged; PR #26 and two `sals3-portal` PRs open.
- [[sals3-session-2026-08-06-part11-pwa-icons-and-cart-mobile-overflow]] — real Sals3 logo for the iOS/Android "Add to Home Screen" icon; a real mobile cart bug (price column overflow, root-caused to flexbox's `min-width: auto` default). PR #30/#31 open.
- [[sals3-session-2026-08-06-part12-category-row-tile-band-and-related-products-dedup]] — related-products duplicate-key fix, Stage-2 title-compiler/catalogue-`ProductCard` groundwork (unwired), and a two-pass category row refactor ending in a tile-band restyle per an owner design handoff. Uncommitted.
- [[sals3-session-2026-08-06-part13-seller-center-first-build]] — first Seller Center code: 7 permission-gated screens built into `sals3-portal`, renamed "Seller Center." Real routes and real server-enforced permissions; illustrative data throughout, no order/inventory/finance/payout backend. A real stale-closure undo bug found and fixed; 5 new engineering lessons recorded ([[sals3-skills]] entries 38–42).

## Seller Center

- [[sals3-global-seller-center-ux-blueprint-proposal]] — Pillar 3 Global Seller Center UX blueprint (v2): three funded v1 bets, a binding cut list, a Tier 1/Tier 2 architecture split with a debt register, and a formal Stage 1 research go/no-go gate. Proposed, not yet reviewed by AJ/Bogs as a product strategy — but see its 2026-08-06 addendum: a real, owner-directed 7-screen UI prototype now exists in `sals3-portal` (illustrative data, no backend), described fully in [[sals3-session-2026-08-06-part13-seller-center-first-build]].

## Catalog and supplier pipeline

- [[ADR-014-admin-portal-platform-governance-and-global-controls]] — future internal control plane separated from seller accounts, with least-privilege employee authority, versioned global policy, rollback, and immutable audit.

- [[cj-candidate-to-sals3-product-draft-implementation-spec]] — approved Aj-CJ-Explorer-to-Sals3 contract through an owned healthy connection: green auto-publish, yellow attention, red block/auto-pause, anti-junk/country/IP gates, customization, and supplier sync. Shortlist, CJ evidence fetch, and — as of 2026-08-07 — an automated evaluation pipeline with hard gates and a real decision are implemented and verified in `sals3-portal`; see section 26. Import, publication, and attention state remain unimplemented.
- [[ADR-001-seller-center-cj-sourcing-to-my-products]] — catalog ownership, curation, media-rights, and server-boundary decision.
- [[ADR-002-sals3-taxonomy-and-cj-category-mapping]] — Taxonomy v0 and category/attribute mapping decision.
- [[ADR-003-international-availability-shipping-and-pricing]] — market, freight, and contribution-pricing decision used by publish validation.
- [[ADR-010-catalog-decision-governance-and-shadow-enforcement]] — governing catalog evidence-to-action layers, pre-publication review boundaries, shadow promotion gates, and measurable automation controls.
- [[ADR-011-product-media-source-selection-and-supplier-original-preservation]] — seller uploads, supplier-original preservation, controlled media fallback, revisioning, and catalogue media-source status.
- [[ADR-012-supplier-trend-signals-and-storefront-merchandising]] — provider trend signals, listing velocity, qualification-first ranking, and published storefront `Trending now` contract.
- [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] — split CJ inventory facts, adaptive discovery coverage, points/webhook recovery, lean phase-1 catalog identity, and parked post-pilot controls.
- [[sals3-session-2026-08-10-part21-aj-product-filtering-automation-and-stock-sync]] — complete AJ Q&A ledger for filtering settings, All Supplier Products-to-Ready execution, disconnect recovery, media/trends, Vercel-versus-n8n automation, and CJ stock webhook synchronization.
- [[sals3-session-2026-08-07-part14-automated-candidate-evaluation-pipeline]] — turnover correction (a prior agent's turnover prompt was stale), a reopened-and-confirmed decision to build the preflight engine with labelled placeholders instead of an ADR-002 approval, and the automated ingest/screen/evaluate/decide pipeline itself. 5 new engineering lessons recorded ([[sals3-skills]] entries 53–57).
- [[sals3-session-2026-08-07-part15-multi-tenant-supplier-connections-and-ui-overhaul]] — ADR-006/ADR-008 implemented for real: seller accounts, encrypted per-seller supplier connections, and a tenant-scoped CJ adapter replacing the global `CJ_API_KEY`, plus three feedback-driven follow-up rounds (disconnect step-up verification, a guided Supplier Apps connect dialog, a collapsible/hover-flyout sidebar redesign). 5 new engineering lessons recorded ([[sals3-skills]] entries 58–62). `sals3-portal` PR #8 open, updated, all checks (Vercel + GitHub Actions verify) passing.
- [[sals3-session-2026-08-07-part16-storefront-feed-tenant-connection]] — the storefront feed (`/api/storefront/*`), the last runtime consumer of the global `CJ_API_KEY`, moved onto the Sals3 Official Dropshipper's own supplier connection, and the fabricated deals comparison price ([[hot]]'s number-one active risk) removed. Legacy `src/services/cj/{token,products,enrichment}.ts` deleted. Then the hard-coded USD/PHP rate replaced with a self-updating ECB rate plus a money-changer buffer sized from real payment-rail costs. The `sals3-ecommerce` contract is unchanged throughout; all three verified live end to end. 3 new engineering lessons recorded ([[sals3-skills]] entries 63–65). `sals3-portal` PRs #9, #10, and #11 open.
- [[sals3-session-2026-08-08-part17-product-editor-and-supplier-catalogue]] — the Product Editor lands as a second Add Product mode (`/listings/new?fixture=<key>`, Catalogue's route, not Product Sourcing's), fixture-backed only, five handoff corrections applied (required-vs-recommended attributes, disabled-market rendering, no design-annotation leakage, container-query sidebar). Same session, in parallel: `/products` gained a grid/table toggle, a peso-conversion popover, and a rating check; `/design-preview/all-supplier-products` added as a provider-neutral multi-supplier preview against isolated fixtures. 259 unit + 46 Playwright tests pass.
- [[sals3-session-2026-08-08-part18-supplier-connection-identity-reassignment]] — a real seller-identity/connection-ownership incident found by Bogs testing the real Better Auth login for the first time: the `CONNECTED` CJ connection stayed tied to the legacy `dev-user` placeholder identity, so the real logged-in account read as fully disconnected everywhere. Root-caused to a hard `(providerId, externalAccountLookupHash)` unique constraint with no ownership-transfer tool. Fixed with a one-off maintenance script (soft-disconnect, then reassign `sellerAccountId`), not a code change. 1 new engineering lesson recorded ([[sals3-skills]] entry 66).

## Raw reference assets

- `Raw/` — UI mockup images (`sals3_*_ui.jpg`, `sals3_*_white.jpg`), the presentation deck (`sals3_presentation_deck_master.pdf` / `.pptx`), the build spec source PDF (`sals3_ux_build_specification_2026-08-01.pdf`), the category taxonomy workbook (`universal_category_variation_taxonomy.xlsx`), the marketing banner pitch PDF (`sals3_marketing_banner_pitch_2026-08-05.pdf`, see [[sals3-marketing-banner-integration-proposal]]), the GEO/AEO/SEO strategy PDF (`sals3_geo_aeo_seo_strategy_2026-08-05.pdf`, see [[sals3-geo-aeo-seo-strategy-proposal]]), and the Global Seller Center UX Blueprint v2 PDF (`sals3_global_seller_center_ux_blueprint_v2_2026-08-06.pdf`, see [[sals3-global-seller-center-ux-blueprint-proposal]]). Not linkable as Obsidian notes; referenced here for discovery.

## Session notes

- [[../../journal/sals3-session-2026-08-05-part01-landing-page-api-carousel]] — verified 2026-08-05 landing-page API, pagination, carousel, test, and lesson session note.
- [[../../journal/sals3-turnover-prompt-2026-08-05-landing-page-api-carousel]] — copy-paste turnover prompt for the next agent after the landing-page API and carousel work.

## Domains not started yet

Add a new section here in the same task that a domain's first real note is created (e.g. Payments/Payout, Finance/Tax, Design System). Do not pre-list domains with no notes.

---
tags: [moc, catalog, second-brain, governance]
aliases: [Sals3 Vault Catalog, Note Catalog]
created: 2026-07-31
updated: 2026-08-06
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
- [[sals3-master-blueprint]] — Executive Summary, 3 Core Pillars (Shopify pop-up, custom customer site, enterprise Seller Center), 10-step item lifecycle, curated catalog pipeline, Seller Center modules (order management, product management, finance/payout), development timeline, white-label branding protocol. Business-strategy narrative still current; technical specifics superseded by the build spec.
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

## Raw reference assets

- `Raw/` — UI mockup images (`sals3_*_ui.jpg`, `sals3_*_white.jpg`), the presentation deck (`sals3_presentation_deck_master.pdf` / `.pptx`), the build spec source PDF (`sals3_ux_build_specification_2026-08-01.pdf`), the category taxonomy workbook (`universal_category_variation_taxonomy.xlsx`), the marketing banner pitch PDF (`sals3_marketing_banner_pitch_2026-08-05.pdf`, see [[sals3-marketing-banner-integration-proposal]]), the GEO/AEO/SEO strategy PDF (`sals3_geo_aeo_seo_strategy_2026-08-05.pdf`, see [[sals3-geo-aeo-seo-strategy-proposal]]), and the Global Seller Center UX Blueprint v2 PDF (`sals3_global_seller_center_ux_blueprint_v2_2026-08-06.pdf`, see [[sals3-global-seller-center-ux-blueprint-proposal]]). Not linkable as Obsidian notes; referenced here for discovery.

## Session notes

- [[../../journal/sals3-session-2026-08-05-part01-landing-page-api-carousel]] — verified 2026-08-05 landing-page API, pagination, carousel, test, and lesson session note.
- [[../../journal/sals3-turnover-prompt-2026-08-05-landing-page-api-carousel]] — copy-paste turnover prompt for the next agent after the landing-page API and carousel work.

## Domains not started yet

Add a new section here in the same task that a domain's first real note is created (e.g. Payments/Payout, Catalog/Supplier Pipeline, Finance/Tax, Design System). Do not pre-list domains with no notes.

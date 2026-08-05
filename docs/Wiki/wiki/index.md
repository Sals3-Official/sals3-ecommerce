---
tags: [moc, index, second-brain, sals3]
aliases: [Sals3 Vault Index, Map of Content, Vault Home]
created: 2026-07-31
updated: 2026-08-06
status: canonical
authority: navigation
owner_approved: true
related:
  - "[[hot]]"
  - "[[sals3-master-blueprint]]"
  - "[[vault-catalog]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[project-structure-installation-and-runbook]]"
---

# Sals3 — Vault Index

> [!IMPORTANT] Start here after the mandatory current-state check
> Read [[hot]] first. Then read [[agent-operating-contract]] and [[sals3-ux-build-specification]] (the current canonical, Final-status build spec) for material Sals3 work. [[sals3-master-blueprint]] is earlier business-strategy context, not the technical authority. Use this page to open only the domain notes required by the task.

## Core operating system

- [[../CLAUDE|Agent Entry Point]] — mandatory reading gate for every agent.
- [[agent-operating-contract|Agent Operating Contract]] — anti-yesman reasoning, evidence, challenge, and verification rules.
- [[nextjs-component-security-code-rules|Next.js Component Architecture and Security]] — mandatory code-change gate for every Sals3 code edit, refactor, test change, configuration change, and package change.
- [[project-structure-installation-and-runbook|Project Structure, Installation, and Runbook]] — canonical project layout, npm package installation rules, local run commands, verification commands, and README update rule.
- [[team-profile-and-collaboration-preferences|Team Profile and Collaboration Preferences]] — who's on the team (AJ and Bogs, shared vault) and how they want an agent to work with them.
- [[autonomous-loop-sop|The Loop Method]] — default act-observe-adjust operating discipline for any problem.
- [[vault-sync-setup-guide|Vault Sync Setup Guide]] — how to get this vault onto a new machine and keep it auto-synced via Obsidian Git.
- [[vault-onboarding-prompt-for-agent|Vault Onboarding Prompt]] — copy-paste prompt handing that setup to an AI agent on a new machine.
- [[sals3-turnover-prompt-template|Turnover Prompt Template]] — exact format for handing this project to the next AI agent session.
- [[sals3-master-blueprint|Sals3 Master Blueprint]] — v4.0 whole-system architecture, commercial strategy, and transition plan (sample/demonstration status pending Leadership alignment).
- [[vault-governance-and-note-lifecycle|Vault Governance and Note Lifecycle]] — authority order, status vocabulary, and change protocol.
- [[architecture-decision-template|ADR Template]] — required structure for material design decisions.
- [[hot|Current State Cache]] — verified code, data, tests, and next actions.
- [[vault-catalog|Vault Catalog]] — classification and discovery map for every Markdown note.
- [[ai-context-and-wiki-architecture|Second Brain Architecture]] — context-loading and ingestion design.
- [[sals3-skills|Engineering and Domain Lessons]] — consolidated lessons from real incidents (33 entries as of 2026-08-06).
- [[parked-ideas-backlog|Parked Ideas]] — ideas that must not be built without explicit approval.
- [[../../journal/sals3-session-2026-08-05-part01-landing-page-api-carousel|2026-08-05 Landing Page API and Carousel Session]] — verified session note for DummyJSON landing-page services, pagination, Embla carousel, tests, and lessons.
- [[../../journal/sals3-turnover-prompt-2026-08-05-landing-page-api-carousel|2026-08-05 Landing Page API Carousel Turnover Prompt]] — copy-paste handoff prompt for the next agent after that session.

## Business and product

- [[sals3-ux-build-specification|Sals3 UX and Build Specification]] — **the current canonical technical authority.** Final status, 1 August 2026. Design rules, screen layouts, system architecture, API contracts, price/promotion engine, 8-stage build order, realistic time/effort expectations. Supersedes the earlier sample blueprint on every technical point it covers.
- [[sals3-management-bible|Sals3 Management Bible]] — canonical behavior, boundaries, and contracts; now points to the build spec for technical detail.
- [[sals3-implementation-phases|Sals3 Implementation Phases]] — complete task register, phase status, and acceptance gates (rebuilt around the build spec's 8 stages).
- [[sals3-end-to-end-process-flow|Sals3 End-to-End Process Flow]] — canonical flowchart: 10-step item lifecycle, dual-track strategy, catalog quality gate.
- [[sals3-manual-testing-checklist|Sals3 Manual Testing Checklist]] — resumable owner-verified testing queue, ready for when a codebase exists.
- [[sals3-feature-landscape-and-expansion-map|Sals3 Feature Landscape and Expansion Map]] — full capability map by pillar and status.
- [[sals3-master-blueprint|Sals3 Master Blueprint]] — earlier business-strategy document (v4.0, sample status) — 3-pillar/dual-track concept, not superseded, but its technical specifics are now superseded by the build spec.
- [[universal-category-variation-taxonomy-reference|Universal Category and Variation Taxonomy]] — candidate catalog/category reference data, not yet adopted.
- [[sals3-cj-dropshipping-integration-plan|CJ Dropshipping Integration Plan]] — proposed design for auto-populating the Seller Center Add Product flow from CJ, incl. the category/attribute mapping approach. Proposed, not yet AJ-reviewed.
- [[sals3-marketing-banner-integration-proposal|Marketing Banner Integration Proposal]] — 4 proposed banner placements (home, in-feed ads, PDP, cart). Proposed, not approved; flags a colour-token mismatch against the shipped code and a target-artifact mismatch against the real Next.js app.
- [[sals3-geo-aeo-seo-strategy-proposal|GEO/AEO/SEO Strategy Proposal]] — proposed Next.js RSC + JSON-LD architecture for search/generative-AI/answer-engine visibility, plus truthful neuromarketing patterns. Route-independent pieces (`robots.txt`, `llms.txt`, global `Organization` JSON-LD) implemented 2026-08-05; the rest needs PDP/cart routes that don't exist yet, see [[parked-ideas-backlog]].
- `Raw/` — UI mockups, presentation deck, the build spec PDF, and the category taxonomy workbook.

## Customer Website

- [[sals3-session-2026-08-05-part01-marketplace-landing-page|Marketplace Landing Page Session]] — first real screen: the home/landing page, merged to `develop` 2026-08-05. Static placeholder data, one-off components (not yet the Stage 1 base library) — see the note for exact scope and what's still missing.
- [[sals3-session-2026-08-05-part02-footer-and-pagination|Site Footer and Pagination Session]] — site footer with a legal/compliance-claim audit (several mockup claims dropped as unverifiable), numbered pagination. Code merged to `develop`.
- [[sals3-session-2026-08-05-part03-geo-aeo-seo-machine-endpoints|GEO/AEO/SEO Machine Endpoints Session]] — `robots.txt`, `llms.txt`, global `Organization` JSON-LD from [[sals3-geo-aeo-seo-strategy-proposal]]; PDP/cart-dependent pieces parked.
- [[sals3-session-2026-08-05-part04-home-page-seo-geo-aeo|Home Page SEO/GEO/AEO Session]] — `generateMetadata`, `WebSiteSchema` JSON-LD, sr-only `<h1>`, `sitemap` in `robots.ts`, enriched `llms.txt`. Merged to `develop`.
- [[sals3-session-2026-08-05-part05-product-detail-page|Product Detail Page Session]] — first `/p/[id]` route, built after a component-by-component build-order decision (cart/orders/account explicitly deferred); PDP `Product`/`Offer` JSON-LD stays parked pending a real, Sals3-owned catalog. PR #21 open, not yet merged.
- [[sals3-session-2026-08-05-part06-guest-header-strip|Guest Header Strip Session]] — signed-out header strip adapted from a Lazada reference screenshot, `/login`/`/signup` placeholders. PR #21 open, not yet merged.
- [[sals3-session-2026-08-05-part07-cart|Cart Session]] — client-only (`localStorage`) shopping cart, live Add to Cart/Buy Now on the PDP, `/cart` route. PR #21 open, not yet merged.
- [[sals3-session-2026-08-05-part08-cart-toast-and-ux-audit|Cart Toast and UX Audit Session]] — add-to-cart toast notification; first `ui-ux-pro-max` audit pass (checklist applied, generic palette suggestion rejected). PR #21 open, not yet merged.
- [[sals3-session-2026-08-05-part09-ui-ux-pro-audit|UI-UX-Pro and Frontend-Design Audit Session]] — `ui-ux-pro`/`frontend-design` audit; found and fixed a real tablet-breakpoint bug, added missing press states, fixed a flaky e2e test. PR #21 open, not yet merged.
- [[sals3-session-2026-08-06-part10-pr21-pr22-reconciliation-and-cj-bugfixes|PR #21/#22 Reconciliation and CJ Bugfixes Session]] — reconciled the PDP/cart PR against AJ's real `sals3-portal` backend PR; found and fixed three real production bugs (CJ rate-limit hammering, a for-you failure discarding the deals section, and the actual root cause — Zod rejecting a whole page over one overlong title) after two reasonable-but-wrong hypotheses. PR #21, #24, #25 merged; PR #26 and two `sals3-portal` PRs open.
- [[sals3-session-2026-08-06-part11-pwa-icons-and-cart-mobile-overflow|PWA Icons and Cart Mobile Overflow Session]] — real Sals3 logo for the iOS/Android "Add to Home Screen" icon (`apple-icon.png`, `manifest.ts`, Android PWA icon sizes), and a real mobile cart bug (price column overflowing off-screen, root-caused to flexbox's `min-width: auto` default). PR #30 and #31 open.
- [[sals3-session-2026-08-06-part12-category-row-tile-band-and-related-products-dedup|Category Row Tile Band and Related Products Dedup Session]] — related-products cross-section duplicate-key fix, Stage-2 title-compiler/catalogue-`ProductCard` groundwork (deliberately unwired), and a two-pass homepage category row refactor ending in a tile-band restyle per an owner design handoff. Uncommitted; live visual verification blocked by a port/`.next` conflict with another chat's dev server.

## Seller Center

- [[sals3-global-seller-center-ux-blueprint-proposal|Global Seller Center UX Blueprint (v2) Proposal]] — Pillar 3 product-strategy/UX pitch: three funded v1 bets (financial truth, batch fulfillment, rapid listing), a binding v1 cut list, a Tier 1/Tier 2 architecture split with a documented-debt register, and a formal Stage 1 field-research go/no-go gate. Proposed only, not reviewed by AJ or Bogs; no Seller Center code exists yet (Stage 7 of the build order).

## Domains not started yet

Add sections here as real work begins — e.g. Payments and Payout, Catalog/Supplier Pipeline, Finance/Tax, Design System. Do not pre-create empty domain sections; add one only when its first real note exists, so this index never implies more work is done than actually is.

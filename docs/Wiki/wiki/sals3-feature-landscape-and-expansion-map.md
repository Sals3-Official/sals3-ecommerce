---
tags:
  - sals3
  - capability-map
  - roadmap
  - future
  - moc
aliases:
  - Sals3 Feature Landscape
  - Sals3 Expansion Map
created: 2026-07-31
updated: 2026-07-31
status: canonical
authority: blueprint-map
owner_approved: false
related:
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-management-bible]]"
  - "[[parked-ideas-backlog]]"
  - "[[sals3-master-blueprint]]"
---

# Sals3 Feature Landscape and Expansion Map

> [!IMPORTANT] This is a capability landscape, not a promise that every item is approved or built.
> Its purpose is to stop early modules from blocking future growth. As of 2026-08-03, most Pillar 2/3 items below are **Approved with a real spec** (from [[sals3-ux-build-specification]], Final status), not blueprint samples anymore. Items still marked Candidate/sample are genuinely unconfirmed — check each one's note.

## Status legend

- **Live** — implemented and used.
- **Partial** — foundation or UI exists, but the complete workflow does not.
- **Approved** — real spec exists (design rules, contracts, or an explicit ADOPT decision); not yet implemented.
- **Test** — build it, but keep it non-critical for launch (per the build spec's own `TEST` decisions).
- **Candidate** — compatible future capability, not yet approved as a build.
- **Deferred** — explicitly named and explicitly not now (build spec `DEFER` decisions — do not build without a fresh approval).
- **Rejected** — explicitly decided against, with a stated reason. Do not silently re-propose.
- **Parked** — intentionally deferred, pre-dating the build spec.

## Sals3 UX/Build Spec decision record (verbatim from build spec section 3)

| Item | Status | Note |
|---|---|---|
| New system, not WooCommerce | **Approved** | WooCommerce is the old-data source only. |
| One final price on every screen | **Approved** | Server-calculated; client never trusted for totals. |
| Group the cart by fulfillment leg | **Approved** | Not by seller name. |
| Semantic design tokens | **Approved** | Build in week one / Stage 1. |
| State preservation on lists | **Approved** | 6 conditions, build spec section 6.4. |
| Guest checkout | **Approved** | Account offered after the order, not required before. |
| Automatic voucher selection | **Test** | Deterministic rules engine required; never claim "maximum" without testing every combination. |
| Dark mode | **Test** | Prepare tokens only; not a launch requirement. |
| Semantic search with vectors | **Deferred** | Clean categories/attributes/synonyms and measure zero-result rate first. |
| 3D and AR product media | **Deferred** | Sellers supply photographs only. |
| Feed that changes with time of day | **Deferred** | Needs consent, measurement, traffic volume. |
| Swipe-to-pay as primary control | **Rejected** | Lowers completion rate; fails WCAG 2.5.7. |
| Glass effect on many surfaces | **Rejected** | 2 surfaces only — header and bottom bar. |
| False urgency / false scarcity | **Rejected** | Forbidden pattern, legal risk under RA 11967. |

## Pillar 1 — Shopify pop-up store

Not covered by the build spec (out of its stated scope). Still Candidate, per [[sals3-master-blueprint]]:

- **Candidate** — Dawn theme deployment with a quality filter applied manually/semi-automated.
- **Candidate** — Local payment gateway integration on Shopify.

## Pillar 2 — Customer shopping website

- **Approved** — Curated, high-density storefront catalog, one clear price-forward priority per screen (build spec section 4).
- **Approved** — Product page: 4-question first screen, fixed section order, review filtering/summary chips (build spec section 7).
- **Approved** — 1-click/guest checkout, Cash on Delivery as a main option — exact payment-partner list still unconfirmed (build spec section 8, 21.3).
- **Approved** — Real, arrival-date-based shipping display, shown early, never increasing at checkout (build spec section 5.3, 8.3).
- **Approved** — Real-time stock guard — build spec section 6.3 makes this concrete, not aspirational.
- **Candidate — supplier quality gate:** the *original* CJ Dropshipping-style rating/sales filter from [[sals3-master-blueprint]] is a different concern the build spec doesn't address; still unconfirmed.

## Pillar 3 — Enterprise Seller Center

- **Approved** — Module 1 equivalent: Seller Center dashboard, KPI-driven, per build spec section 20.3 Stage 7.
- **Approved** — Module 2 equivalent: order management, courier tracking, self-service returns (Stage 6/7).
- **Approved** — Module 3 equivalent: product upload and approval queue (Stage 7).
- **Approved, values pending** — Module 4 equivalent: commission calculation and payout report (Stage 7) — the *mechanism* is spec'd; the *commission rate itself* is `[?]` blocked on Leadership.

## Catalog and taxonomy

- **Candidate** — Automated supplier rating/sales quality gate (blueprint-only concept, not in the build spec).
- **Candidate** — Media & content review queue (photo/watermark cleanup) — explicitly scoped as a separate workflow/specialist in the blueprint.
- **Candidate, not adopted** — [[universal-category-variation-taxonomy-reference]] as the actual category/attribute source for the Catalog service.

## Branding, trust, and compliance

- **Approved** — White-label packaging, invoices, tracking portal, support desk (build spec section 9, consistent with the blueprint).
- **Approved** — RA 11967 / merchant-identity / anti-dark-pattern compliance (build spec sections 9, 14, 22) — legal review by a Philippine lawyer still required before launch.

## Not yet on the map

Learned demand forecasting, automated availability detection, multi-warehouse support, and any POS/CRM/logistics integration remain out of scope until Stage 5+ exists. Vector search/recommendations and 3D/AR media are explicitly **Deferred** (not just unplanned) per the build spec's own decision record above. Do not pre-populate this map with speculative future capabilities beyond what a real document already names — add a section only when a real idea is proposed, per [[vault-governance-and-note-lifecycle]].

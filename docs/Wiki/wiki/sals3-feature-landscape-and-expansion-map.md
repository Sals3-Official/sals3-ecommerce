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
updated: 2026-08-06
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
| False urgency / false scarcity | **Rejected** | Forbidden and misleading across markets; apply each market's consumer law, including RA 11967 when applicable. |

## Pillar 1 — Shopify pop-up store

Not covered by the build spec (out of its stated scope). Still Candidate, per [[sals3-master-blueprint]]:

- **Candidate** — Dawn theme deployment with a quality filter applied manually/semi-automated.
- **Candidate** — Local payment gateway integration on Shopify.

## Pillar 2 — Customer shopping website

- **Approved** — Curated, high-density storefront catalog, one clear price-forward priority per screen (build spec section 4).
- **Approved** — Product page: 4-question first screen, fixed section order, review filtering/summary chips (build spec section 7).
- **Approved** — guest checkout and one online prepaid method in the first vertical slice. **COD is deferred/disabled for phase 1** by ADR-005 until its operational and risk gate passes.
- **Approved** — Show real delivery timing early. Browse estimates must be labelled; after an exact destination quote is confirmed, do not silently increase it. An expired/changed quote requires explicit reconfirmation before payment (ADR-003).
- **Approved** — Real-time stock guard — build spec section 6.3 makes this concrete, not aspirational.
- **Approved — evidence-based supplier curation:** objective hard rejects plus reviewable compliance, IP, commercial, mapping, and editorial signals under ADR-001. Rating/review signals are labelled proxies, not verified sales facts.

## Pillar 3 — Enterprise Seller Center

- **Approved** — Module 1 equivalent: Seller Center dashboard, KPI-driven, per build spec section 20.3 Stage 7.
- **Approved** — Module 2 equivalent: order management, courier tracking, self-service returns (Stage 6/7).
- **Approved** — Module 3 equivalent: product upload and approval queue (Stage 7).
- **Approved, values pending** — Module 4 equivalent: commission calculation and payout report (Stage 7) — the *mechanism* is spec'd; the *commission rate itself* is `[?]` blocked on Leadership.

## Catalog and taxonomy

- **Approved** — evidence-based supplier eligibility and review funnel under ADR-001; fixed rating/sales thresholds are not approved facts.
- **Approved** — media, rights, and original-content review before publication under ADR-001.
- **Approved for pilot** — [[universal-category-variation-taxonomy-reference]] as Sals3 Taxonomy v0 under ADR-002; category branches still require real-product validation before production-ready status.

## Branding, trust, and compliance

- **Approved** — truthful merchant and fulfillment identity, invoices, tracking, and support. Claim branded/white-label packaging only when the actual fulfillment path supports it.
- **Approved** — merchant identity, consumer disclosure, and anti-dark-pattern controls for Sals3 and every enabled market. RA 11967 applies when the Philippines is in scope; it is not the only jurisdictional gate.

## Not yet on the map

Learned demand forecasting, automated availability detection, multi-warehouse support, and any POS/CRM/logistics integration remain out of scope until Stage 5+ exists. Vector search/recommendations and 3D/AR media are explicitly **Deferred** (not just unplanned) per the build spec's own decision record above. Do not pre-populate this map with speculative future capabilities beyond what a real document already names — add a section only when a real idea is proposed, per [[vault-governance-and-note-lifecycle]].

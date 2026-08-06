---
tags:
  - backlog
  - parked-ideas
  - sals3
aliases:
  - Parked Ideas Backlog
created: 2026-07-31
updated: 2026-08-06
status: canonical
authority: parked-backlog
owner_approved: true
related:
  - "[[vault-governance-and-note-lifecycle]]"
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

### 2026-08-05 — GEO/AEO PDP and cart machine-readable structure
- **What:** From [[sals3-geo-aeo-seo-strategy-proposal]]: `generateMetadata` per PDP, `Product`/`Offer`/`AggregateRating`/`FAQPage` JSON-LD, `useOptimistic` cart UX, and `sitemap.xml`.
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

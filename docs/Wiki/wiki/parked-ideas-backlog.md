---
tags:
  - backlog
  - parked-ideas
  - sals3
aliases:
  - Parked Ideas Backlog
created: 2026-07-31
updated: 2026-08-05
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
- **Why parked:** `generateMetadata` per PDP is now done (`/p/[id]` and `/cart` both exist, PR #21 open 2026-08-05 — see [[sals3-session-2026-08-05-part05-product-detail-page]] and [[sals3-session-2026-08-05-part07-cart]]). The rest stays parked: `Product`/`Offer`/`AggregateRating` JSON-LD still needs a real product catalog — `src/services/products.ts` reads DummyJSON, an external placeholder, and marking that up as Sals3's own data would be fabricated structured data (the strategy doc's own §3 revision note warns this risks a Google manual action). `useOptimistic` cart UX doesn't apply to the cart as shipped — it's a client-only, synchronous `localStorage` store with no server round-trip to optimistically cover; that item is only relevant once Stage 5's real server cart exists. `/c/[category]` (the list route) still doesn't exist, so `FAQPage`/category-hub JSON-LD stays fully blocked.
- **Unblock condition:** `Product`/`Offer`/`AggregateRating` JSON-LD — a real, Sals3-owned product catalog (Stage 3). `useOptimistic` — a real server-backed cart (Stage 5, not the client-only cart shipped 2026-08-05). `FAQPage`/category-hub pieces — the `/c/[category]` route.
- **Related:** [[sals3-geo-aeo-seo-strategy-proposal]], [[sals3-implementation-phases]], [[sals3-ux-build-specification]], [[sals3-session-2026-08-05-part05-product-detail-page]], [[sals3-session-2026-08-05-part07-cart]]

### 2026-08-05 — GEO/AEO neuromarketing UI and citation-first content
- **What:** From [[sals3-geo-aeo-seo-strategy-proposal]] §4–5: price-anchoring/loss-aversion UI (real-inventory-backed only, never fabricated urgency), persona-filtered social proof, and ~60-word citation-first lead summaries on PDP/category-hub content.
- **Why parked:** Needs PDP/category-hub routes to apply to (same blocker as above). Also needs the same "one clear priority per screen" design-token check already flagged unresolved for [[sals3-marketing-banner-integration-proposal]] before any high-contrast banner/urgency UI ships.
- **Unblock condition:** PDP/category routes exist, and the colour-token question from [[sals3-marketing-banner-integration-proposal]] is resolved.
- **Related:** [[sals3-geo-aeo-seo-strategy-proposal]], [[sals3-marketing-banner-integration-proposal]]

### 2026-08-05 — Next.js `next/link` prefetch tuning for PDP/category nav
- **What:** Tune `next/link` prefetch behavior (e.g. `prefetch` prop per link, App Router prefetch/segment-cache config in `next.config.ts`) for navigation into product detail and category pages, so those routes feel instant once linked from the home page grids/carousel.
- **Why parked:** There is nothing to prefetch into yet — `/p/[id]` and `/c/[category]` routes don't exist (only the home page is built, per [[sals3-implementation-phases]] Stage 3/5). Same route blocker already logged for the GEO/AEO PDP/cart entry below.
- **Unblock condition:** PDP and category routes exist per [[sals3-ux-build-specification]]'s Stage 3 (catalogue read path).
- **Related:** [[sals3-implementation-phases]], [[sals3-ux-build-specification]]

### 2026-08-05 — GEO/AEO off-site brand graph
- **What:** From [[sals3-geo-aeo-seo-strategy-proposal]] §6: Wikidata/Google Knowledge Graph entries, cross-platform consistency (Trustpilot, marketplaces, forums), trade-press entity co-occurrence.
- **Why parked:** Business/ops work, not code — not blocked by any route, but not started and not this vault's call to schedule.
- **Unblock condition:** Bogs/AJ decide to prioritize off-site brand presence work.
- **Related:** [[sals3-geo-aeo-seo-strategy-proposal]]

### 2026-08-06 — Jurisdiction and governing-law review (Australian base vs. this vault's Philippine premise)
- **What:** Establish where Sals3 is incorporated, which markets it sells into, and which law governs — then get legal review in those jurisdictions. Bogs stated on 2026-08-06 that **Sals3 is an Australian-based company**, while much of this vault starts from a Philippine-company premise: RA 11967 (Internet Transactions Act) as the governing e-commerce law (build spec sections 9, 14, 17.3, 22), BIR/EOPT tax-invoice logic, *"a Philippine lawyer must review before launch"*, PHP as home currency, GCash/Maya as payment rails, and "Philippines as Market #1."
- **Why parked:** Bogs parked it explicitly on 2026-08-06 while finalizing [[ADR-001-seller-center-cj-sourcing-to-my-products]]. It is genuinely not blocking that ADR — ADR-001's phase 1 is USD-only with no FX provider, and the flow it describes moves product data, not money. **Important: this is not a find-and-replace of "Philippines" with "Australia."** Selling *into* the Philippines still engages RA 11967; being *based in* Australia engages Australian Consumer Law and Australian GST — including the low-value-imported-goods rules that land directly on a dropshipping model; worldwide sales engage more still. The correct shape is the **market-configuration layer** [[sals3-global-seller-center-ux-blueprint-proposal]] §6/§8 already specified as Tier 1 — versioned rules with effective dates per market, not assumptions baked into the product core. **Above an agent's authority to resolve** — it needs an owner decision and then real legal advice.
- **Two consequences that are live now, even while parked:**
  1. The fabricated `oldPriceMinor` comparison price (see [[hot]]) has **higher** exposure than first recorded — Australian Consumer Law is strictly enforced on "was/now" pricing and the ACCC actively prosecutes it. That defect must be fixed regardless of how the jurisdiction question resolves.
  2. Any work sequenced off *"a Philippine lawyer must review before launch"* needs its jurisdiction confirmed first, or the wrong lawyer reviews the wrong law.
- **Unblock condition:** Before any tax, invoicing, payout, consumer-disclosure, or launch-gate work starts — and before the pre-launch legal review is booked. Whichever comes first.
- **Related:** [[ADR-001-seller-center-cj-sourcing-to-my-products]], [[sals3-global-seller-center-ux-blueprint-proposal]], [[sals3-ux-build-specification]], [[sals3-management-bible]], [[hot]]

### 2026-08-06 — Commission calculation and seller payout for the catalogue/Seller Center work
- **What:** Commission rate logic, commission calculation on an order line, and the seller payout report — the [[sals3-implementation-phases]] Stage 7 items, plus the "financial truth" v1 bet (itemized ledger, estimated/pending/final settlement states) from [[sals3-global-seller-center-ux-blueprint-proposal]].
- **Why parked:** Bogs parked it explicitly on 2026-08-06 while planning the CJ-sourcing → "My Products" catalogue flow ([[ADR-001-seller-center-cj-sourcing-to-my-products]]). Two independent reasons it is genuinely not blocking that work: (a) commission rate and confirmed payment partners remain Leadership-pending per [[sals3-management-bible#4. Non-negotiable boundaries]] — the mechanism can be built but the *values* cannot be real; (b) the first catalogue phase is single-seller (Sals3's own products, the "Sold and Fulfilled by Sals3" case), and Sals3 does not pay itself a commission — so no commission math is reachable until a genuine third-party seller exists. The catalogue/import/customize flow in ADR-001 touches product data only, never money, so parking this removes nothing from it.
- **Unblock condition:** A real third-party seller (retail or dropshipper) is being onboarded — the near-future direction Bogs confirmed on 2026-08-06 — **and** Leadership has confirmed the commission rate and payment-partner list.
- **Related:** [[ADR-001-seller-center-cj-sourcing-to-my-products]], [[sals3-global-seller-center-ux-blueprint-proposal]], [[sals3-implementation-phases]], [[sals3-management-bible]]

---
tags:
  - backlog
  - parked-ideas
  - sals3
aliases:
  - Parked Ideas Backlog
created: 2026-07-31
updated: 2026-07-31
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
- **Why parked:** All target routes (`/p/[id]`, `/c/[category]`, `/cart`) that don't exist yet — only the home page is built (see [[sals3-implementation-phases]] Stage 3/5). The JSON-LD piece additionally needs a real product catalog: `src/services/products.ts` currently reads DummyJSON, an external placeholder, and marking that up as Sals3's own `Product`/`Offer`/rating data would be fabricated structured data (the strategy doc's own §3 revision note warns this risks a Google manual action).
- **Unblock condition:** PDP and cart routes exist with real (or at least Sals3-owned) product data, per [[sals3-ux-build-specification]]'s Stage 3 (catalogue read path) and Stage 5 (cart/checkout).
- **Related:** [[sals3-geo-aeo-seo-strategy-proposal]], [[sals3-implementation-phases]], [[sals3-ux-build-specification]]

### 2026-08-05 — GEO/AEO neuromarketing UI and citation-first content
- **What:** From [[sals3-geo-aeo-seo-strategy-proposal]] §4–5: price-anchoring/loss-aversion UI (real-inventory-backed only, never fabricated urgency), persona-filtered social proof, and ~60-word citation-first lead summaries on PDP/category-hub content.
- **Why parked:** Needs PDP/category-hub routes to apply to (same blocker as above). Also needs the same "one clear priority per screen" design-token check already flagged unresolved for [[sals3-marketing-banner-integration-proposal]] before any high-contrast banner/urgency UI ships.
- **Unblock condition:** PDP/category routes exist, and the colour-token question from [[sals3-marketing-banner-integration-proposal]] is resolved.
- **Related:** [[sals3-geo-aeo-seo-strategy-proposal]], [[sals3-marketing-banner-integration-proposal]]

### 2026-08-05 — GEO/AEO off-site brand graph
- **What:** From [[sals3-geo-aeo-seo-strategy-proposal]] §6: Wikidata/Google Knowledge Graph entries, cross-platform consistency (Trustpilot, marketplaces, forums), trade-press entity co-occurrence.
- **Why parked:** Business/ops work, not code — not blocked by any route, but not started and not this vault's call to schedule.
- **Unblock condition:** Bogs/AJ decide to prioritize off-site brand presence work.
- **Related:** [[sals3-geo-aeo-seo-strategy-proposal]]

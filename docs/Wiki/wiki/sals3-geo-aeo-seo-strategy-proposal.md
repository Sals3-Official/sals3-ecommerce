---
tags: [sals3, proposal, seo, geo, aeo, architecture, nextjs, marketing]
aliases: [GEO AEO SEO Strategy, Tri-Engine Optimization Proposal, Generative Engine Optimization]
created: 2026-08-05
updated: 2026-08-05
status: proposed
authority: proposal
owner_approved: false
related:
  - "[[sals3-ux-build-specification]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-marketing-banner-integration-proposal]]"
  - "[[sals3-implementation-phases]]"
  - "[[parked-ideas-backlog]]"
  - "[[index]]"
---

# Sals3 GEO/AEO/SEO Strategy — Proposal

> [!WARNING] Status: proposed, not approved
> This is an architecture/marketing strategy pitch, not a build spec change. Per [[vault-governance-and-note-lifecycle]]'s authority order, [[sals3-ux-build-specification]] outranks this note on every point where they'd conflict. Nothing here should be built without an explicit owner decision.

> [!NOTE] Provenance
> Received from Bogs as `E:\Downloads\GEO-AEO-SEO_Strategy_Revised.pdf` (8 pages, ~284 KB), 2026-08-05. Copied into `Raw/sals3_geo_aeo_seo_strategy_2026-08-05.pdf`; original left untouched in Downloads. This is already a **revised edition** of a Gemini Deep Research output — the author (not this agent) added inline `[REVISION NOTE]` blocks softening unverified statistics and adding ethics/risk coverage the original omitted. Those revision notes are preserved in the summary below because they're load-bearing: several headline numbers in the original draft are not safe to quote as fact.

## Implementation status (2026-08-05)

> [!NOTE] Partial implementation — owner-approved subset only
> Bogs approved implementing only the pieces that don't depend on routes that don't exist yet. Everything else below is still proposed only; this note's overall `status` stays `proposed` because most of the architecture is still unbuilt. See [[parked-ideas-backlog]] for the routes-dependent remainder.

**Shipped, verified (lint/format/typecheck/build/unit/e2e/audit all passing):**

- `src/app/robots.ts` — allows `*` plus explicitly names `GPTBot`, `PerplexityBot`, `ClaudeBot`, `OAI-SearchBot` (§2, §7 Phase 3).
- `src/app/llms.txt/route.ts` — daily-revalidated (`revalidate = 86400`) plain-text endpoint. Deliberately identity-only (name + description) — **no product catalog listing**, because `src/services/products.ts` is an external DummyJSON placeholder, not Sals3's real catalog; listing it as "Sals3's products" would be exactly the kind of fabricated machine-readable claim this document's own revision notes warn against.
- `src/components/schema/OrganizationSchema.tsx`, wired into `src/app/layout.tsx` — global `Organization` JSON-LD. Renders `name: "Sals3"` only. `url`/`logo` are added automatically once `NEXT_PUBLIC_SITE_URL` is set (`src/lib/site.ts`) — no domain was hardcoded or guessed, since no production domain is confirmed anywhere in this vault or codebase.

**Not applied — blocked on routes that don't exist yet**, parked in [[parked-ideas-backlog]]:

- `generateMetadata` per PDP (needs `/p/[id]`)
- `Product`/`Offer`/`AggregateRating`/`FAQPage` JSON-LD (needs PDP + real catalog — DummyJSON data can't legitimately carry Sals3's own ratings/offers)
- `useOptimistic` cart UX (needs a cart)
- `sitemap.xml` (near-zero value with only one real route)
- Neuromarketing UI (price anchoring, loss-aversion inventory banners) — needs PDP/cart, and needs the same design-token conflict check already flagged for [[sals3-marketing-banner-integration-proposal]]
- Citation-first content patterns (§5) — needs PDP/category hub content to apply to
- Off-site brand graph (§6) — business/ops work, not blocked by code, but not started

## What it proposes

A Next.js (App Router / RSC) architecture to serve three discovery channels at once:

- **SEO** — traditional ranked search (Google, Bing).
- **GEO** (Generative Engine Optimization) — citation inside AI-synthesized answers (ChatGPT, Perplexity, Claude, Gemini), via vector/RAG retrieval rather than keyword match.
- **AEO** (Answer Engine Optimization) — direct-answer placement (AI Overviews, Siri, Alexa, voice, featured snippets), via knowledge-graph/entity matching.

Core claim: visibility in GEO/AEO is largely **binary** (cited or not, no ranking gradient), so citation-first content and machine-readable structure matter more than keyword density once baseline SEO is in place.

### Proposed architecture pieces

1. **Server-rendered everything** — App Router + React Server Components so AI crawlers (`GPTBot`, `PerplexityBot`, `ClaudeBot`, `OAI-SearchBot`) get full HTML without executing JS.
2. **`generateMetadata` per product route** — dynamic title/description/canonical/OpenGraph from the product record (`app/products/[slug]/page.tsx`).
3. **`/llms.txt` route handler** — daily-ISR machine-readable catalog summary (SKU, GTIN, price, stock, URL) as markdown text. **Flagged by the doc itself as a community proposal (llmstxt.org), not an honored standard** — no major AI vendor commits to reading it. Treat as a cheap, harmless bet, not a promised channel.
4. **`useOptimistic` (React 19) on cart actions** — instant UI update on `AddToCartButton`, reconciled via Server Action in the background, to reduce latency-driven abandonment and negative behavioral signal.
5. **Connected JSON-LD entity graph** — `Organization → Product → Offer / AggregateRating / FAQPage`, server-rendered per PDP, global `Organization` node in `app/layout.tsx`. Full example component (`ProductSchema.tsx`) included in the source doc.
6. **Neuromarketing mechanics**, mapped to Next.js implementation:
   - Hick-Hyman friction reduction (cap product tiers at 3, fixed image aspect ratios to kill CLS)
   - Price anchoring (server-calculated savings, daily-equivalent framing)
   - Loss aversion via **real** inventory counts / dispatch windows (SSE or edge revalidation from live stock — explicitly not fabricated)
   - Persona-filtered social proof (parallel routes + searchParam filters)
   - Endowment effect via interactive configurators (`next/dynamic` 3D/canvas previews)
7. **Citation-first content pattern** — every PDP/category hub/article leads with a self-contained ~60-word direct-answer summary; statistical density with real verifiable numbers; native semantic HTML (`<h1>`–`<h3>`, `<table>`, `<ul>`) over `<div>` soup.
8. **Off-site brand graph** — Wikidata/Google Knowledge Graph presence, cross-platform consistency (Trustpilot, marketplaces, forums), entity co-occurrence in trade coverage.
9. **12-week phased roadmap**: Phase 1 (schema + Core Web Vitals foundation, wks 1–4) → Phase 2 (citation-first content + truthful neuromarketing, wks 5–8) → Phase 3 (`llms.txt`, `robots.txt` bot allowlist, `useOptimistic`, wks 9–10) → Phase 4 (off-site trust + citation-frequency monitoring, wks 11–12).

## What the doc itself already walks back (read before citing numbers)

The source PDF is pre-annotated with `[REVISION NOTE]` blocks — this is unusual and worth preserving verbatim in spirit, because it's the difference between a defensible internal reference and a deck that cites a fabricated statistic:

- **Gartner "25% decline in search volume"** — real forecast (Gartner, Feb 2024) but a *prediction*, not measured data. Actual search volume has so far stayed resilient. Cite only as "Gartner prediction (Feb 2024)."
- **"+40% citation-rate" / PAWC metric** — real paper (Aggarwal et al., "GEO: Generative Engine Optimization," KDD 2024), real metric, but the 30–40% lifts were measured on the authors' own GEO-bench benchmark with specific engines/prompts — **experimental results, not guaranteed real-world lift.**
- **"86% of AI Overview citations go to top-ranking organic results"** — directionally well-supported (strong organic SEO is a prerequisite for GEO visibility) but the exact figure is an industry estimate that varies 75–90% by study/methodology, not a citable constant.
- **Per-technique "+32% statistics / +41% quotations" figures** (§5) — same GEO-bench provenance as above; directionally sound, not a guarantee.
- **`llms.txt` as "established practice"** — corrected to: community proposal, not vendor-committed, implement as a low-cost bet only.

**Net effect:** treat this document as a sound architecture pattern with an already-applied integrity pass on its stats. If any number from it reaches a client-facing deck, carry the qualifier forward — don't silently re-strip it back to an unqualified claim.

## Explicit ethics/compliance boundary the doc adds

- Structured data (ratings, reviews, FAQ) **must reflect real, verifiable data** — Google's structured-data guidelines allow manual actions and loss of all rich results for fabricated markup.
- Urgency/scarcity UI (countdown timers, "only N left", live demand notifications) is **only defensible wired to real inventory and real cutoff times**. Fake versions are classified dark patterns, are illegal under EU consumer-protection law and enforced by the US FTC, and are penalized by marketplace platforms. This lines up with [[sals3-ux-build-specification]] section 14's forbidden-patterns list — no new ground, but worth flagging since it's the same rule this doc's own neuromarketing section could tempt violating if implemented carelessly.

## Gaps and considerations before acting

1. **Target artifact mismatch, same pattern as [[sals3-marketing-banner-integration-proposal]].** The code excerpts assume PDP routes (`app/products/[slug]/page.tsx`), a cart with Server Actions, and a product database with GTIN/SKU/rating fields already in place. Per [[sals3-implementation-phases]], only the home/landing page exists in the real Next.js app today — no PDP, cart, or checkout route yet. Phase 1's `generateMetadata`/JSON-LD work for PDPs can't start until those routes exist (Stage 3+).
2. **Measurement immaturity is acknowledged but easy to lose in a pitch.** The doc's own added note (§7) warns that GEO citation-frequency tracking tooling is young and mostly manual/sampled — don't let a future roadmap promise a dashboard metric this can't reliably produce yet.
3. **JSON-LD automation cost is real.** At catalog scale, schema generation must be automated from the product DB and CI-validated (Google Rich Results test) or it rots — this is infrastructure work, not a one-time markup task.
4. **No color/token conflict this time** (unlike the banner proposal) — the code samples here don't specify Sals3's design tokens, so there's nothing to reconcile against `globals.css` yet. Worth a check when neuromarketing UI (price anchoring, urgency banners) actually gets designed, since that's the same territory the banner proposal already flagged tension in.

## Recommendation

Treat as a reference architecture, not a decision. The technical patterns (RSC-rendered PDPs, `generateMetadata`, JSON-LD entity graph, semantic HTML, truthful urgency wired to real inventory) are sound and largely just "build the PDP/product schema correctly the first time" — worth folding into [[sals3-ux-build-specification]]'s relevant build stages when those routes are actually built, rather than treated as a separate initiative. The `llms.txt` and off-site brand graph pieces are cheap, low-priority additions once a real catalog exists. Nothing here should be scheduled ahead of the routes it depends on.

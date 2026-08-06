---
tags: [session, sals3, storefront, seo, geo, aeo, frontend, reconstructed]
aliases: [Home Page SEO GEO AEO Session, Part 04 Session]
created: 2026-08-06
updated: 2026-08-06
status: current-state
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[sals3-skills]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[parked-ideas-backlog]]"
  - "[[sals3-session-2026-08-05-part03-geo-aeo-seo-machine-endpoints]]"
  - "[[sals3-session-2026-08-05-part05-product-detail-page]]"
  - "[[agent-operating-contract]]"
---

> [!WARNING] Reconstructed note — not written during the session
> This note was **written on 2026-08-06, a day after the work**, to repair a broken wikilink. [[hot]], [[index]], and [[vault-catalog]] all referenced `sals3-session-2026-08-05-part04-home-page-seo-geo-aeo` while the file had never existed — confirmed with `git log --all` (never added, never deleted) and against all three stashes. The session itself genuinely happened; only its note was skipped.
>
> **Everything below is reconstructed from primary artifacts, not from memory of the session:** commit `8960c35` (2026-08-05 12:46:19 +0800, authored on "MacBook") and its own detailed message, the merge of **PR #19** from `feat/home-page-seo-geo-aeo`, the shipped code still present in the repository, skills entries 17–19 in [[sals3-skills]], and the one-line summary [[hot]] already carried.
>
> **Treat this as weaker evidence than a note written live.** It records what the artifacts prove shipped and what the skills entries prove was learned. It does **not** reconstruct the conversation, the order decisions were made in, or anything the artifacts do not attest — per [[vault-governance-and-note-lifecycle]], a historical narrative must not be invented after the fact. Where this note is silent, the record is genuinely lost.

# Session 2026-08-05 Part 04 — Home Page SEO/GEO/AEO

> [!NOTE] Branch status
> Merged. Commit `8960c35` on `feat/home-page-seo-geo-aeo`, merged to `develop` via **PR #19** (merge commit `4ec01f9`).

## Context

Continues [[sals3-session-2026-08-05-part03-geo-aeo-seo-machine-endpoints]], which shipped the route-independent pieces of [[sals3-geo-aeo-seo-strategy-proposal]] — `robots.ts`, `llms.txt`, and a global `Organization` JSON-LD — and parked everything requiring routes that did not exist. This session took the next available slice: the home page itself, the one route that **did** exist.

## What shipped

Per commit `8960c35`, verified against the code still in the repository:

| Change | File |
|---|---|
| `SITE_TAGLINE` added (`'Shop smarter, pay less.'`) | `src/lib/site.ts` |
| New `WebSite` JSON-LD with `SearchAction`; `url`/`potentialAction` gated on `NEXT_PUBLIC_SITE_URL` | `src/components/schema/WebSiteSchema.tsx` |
| `generateMetadata` export — title, description, Open Graph, Twitter Card, canonical, robots directive; renders `<WebSiteSchema />`; sr-only `<h1>` for correct heading hierarchy | `src/app/page.tsx` |
| `sitemap` field added, gated on `NEXT_PUBLIC_SITE_URL` | `src/app/robots.ts` |
| Body enriched with a Mission section using `SITE_TAGLINE` | `src/app/llms.txt/route.ts` |
| Machine and AI Discovery + Home Page sections updated | `README.md` |

11 files, 193 insertions, 16 deletions.

**The governing constraint, stated in the commit itself:** *"All URL fields gated on `getSiteUrl()` — no domain guessed or hardcoded."* This is the same discipline as part 03 and [[sals3-skills]] lesson 14 — an absolute-URL field is omitted entirely when the domain is unconfirmed rather than filled with a placeholder.

## Verification

Recorded in the commit message: `lint`, `format:check`, `typecheck:clean`, `build`, `test:run` (**20 tests**, up from 17), `test:e2e` (2), and `npm audit` (0 vulnerabilities) all passed.

The 3 new tests: `robots` sitemap field absent/present depending on the env var, the `llms.txt` tagline, and the home page `h1`.

## Lessons recorded

Three entries were added to [[sals3-skills]] in this same commit — they are the session's most durable output and are quoted there in full:

- **17 — `generateMetadata` belongs on `page.tsx`, not `layout.tsx`.** A second `generateMetadata` on `page.tsx` looked like it would conflict with the global `layout.tsx` `metadata` export; Next.js App Router in fact merges outermost-inward with the most specific route winning. URL fields inside `generateMetadata` are **not** exempt from the `getSiteUrl()` gate.
- **18 — a forward-looking `SearchAction` is acceptable, if its placeholder status is documented in code.** The `SearchAction` targets a `/search` route that still does not exist. The GEO/AEO signal accrues before the route ships, so it was kept, with an explicit code comment telling the next developer to update the target. Gated behind `getSiteUrl()` alongside `url`, since a `SearchAction` with no real parent URL is useless to a crawler anyway.
- **19 — Prettier can fail `format:check` on a new file with no visible style problem.** The cause was a single trailing blank line introduced by a multi-chunk text edit. Lesson: run `npx prettier --write <file>` immediately after any multi-chunk edit rather than discovering it at the verification stage.

## What this note cannot tell you

Stated plainly rather than filled in:

- **The conversation is not recoverable.** Who asked for what, in what order, what was considered and rejected, and any objection raised during the session are not in the artifacts.
- **Whether anything was deliberately deferred in this session** is unknown. [[parked-ideas-backlog]]'s GEO/AEO entries are dated 2026-08-05 but attributed to part 03, not here.
- **Why the note was skipped** is unknown.

## Follow-on

The `SearchAction` placeholder from lesson 18 is still unresolved — as of 2026-08-06 there is no `/search` route, so the target URL still needs updating when one ships. The remaining parked GEO/AEO work (PDP `Product`/`Offer` JSON-LD, category-hub `FAQPage`) stayed blocked after this session and is only now unblocking via [[ADR-001-seller-center-cj-sourcing-to-my-products]] D5, which creates the Sals3-owned catalogue those items were waiting on.

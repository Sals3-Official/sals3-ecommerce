---
tags: [session, sals3, storefront, seo, geo, aeo, backend]
aliases: [GEO AEO SEO Machine Endpoints Session]
created: 2026-08-05
updated: 2026-08-05
status: current-state
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[sals3-skills]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[parked-ideas-backlog]]"
  - "[[sals3-session-2026-08-05-part02-footer-and-pagination]]"
  - "[[agent-operating-contract]]"
---

# Session 2026-08-05 Part 03 — GEO/AEO/SEO Machine Endpoints

> [!NOTE] Branch status at time of writing
> Committed and pushed on `feat/geo-aeo-seo-machine-endpoints`, opened as a PR against `develop`, not yet merged. Explicitly asked for by Bogs in this session.

## What happened

- Bogs handed over `E:\Downloads\GEO-AEO-SEO_Strategy_Revised.pdf` — a Gemini Deep Research architecture pitch for Next.js-based SEO/GEO/AEO visibility, already self-revised with `[REVISION NOTE]` blocks softening unverified statistics. Ingested as [[sals3-geo-aeo-seo-strategy-proposal]] (copy in `Raw/sals3_geo_aeo_seo_strategy_2026-08-05.pdf`).
- Bogs then asked whether the real `sals3-ecommerce` codebase was calibrated to that proposal. It was not — the codebase only has the home page (`src/app/page.tsx`); no PDP, cart, or checkout routes exist yet, so most of the proposal's code samples (`generateMetadata` per PDP, `Product`/`Offer`/`FAQPage` JSON-LD, `useOptimistic` cart) target routes that don't exist.
- Bogs approved implementing only the route-independent subset. Everything else was logged to [[parked-ideas-backlog]] instead of built.

## What shipped

- `src/app/robots.ts` — `MetadataRoute.Robots`, allows `*` plus explicitly names `GPTBot`, `PerplexityBot`, `ClaudeBot`, `OAI-SearchBot`.
- `src/app/llms.txt/route.ts` — daily-revalidated (`revalidate = 86400`) plain-text endpoint, identity-only (site name + description). Deliberately does **not** list a product catalog: `src/services/products.ts` reads DummyJSON, an external placeholder, and presenting that as "Sals3's catalog" to an AI crawler would be exactly the fabricated-machine-readable-data risk the source PDF's own §3 revision note warns about.
- `src/lib/site.ts` (`SITE_NAME`, `SITE_DESCRIPTION`, `getSiteUrl()`) and `src/components/schema/OrganizationSchema.tsx`, wired into `src/app/layout.tsx` — global `Organization` JSON-LD. Emits `name` only; `url`/`logo` activate automatically once `NEXT_PUBLIC_SITE_URL` is set. No domain was hardcoded or guessed — none is confirmed anywhere in this repo or vault. See [[sals3-skills]] lesson 14.
- Two new test files (`src/app/robots.test.ts`, `src/app/llms.txt/route.test.ts`).
- `README.md` updated with a new "Machine and AI Discovery" section (README Update Rule).

## Verification

`npm run lint`, `format:check`, `build`, `test:run` (17 tests, up from 15), `test:e2e` (2 passed), `npm audit --audit-level=high` (0 vulnerabilities) all passed. `npm run typecheck:clean` hit the known Windows `.next`-rename EPERM ([[sals3-skills]] lesson 2) with no resolvable owning process on port 3000 this time — used plain `tsc --noEmit` as the documented fallback, which passed clean. Manually verified in the browser preview: `/robots.txt` and `/llms.txt` served the expected plain text, and `document.querySelector('script[type="application/ld+json"]')` on the home page returned `{"@context":"https://schema.org","@type":"Organization","name":"Sals3"}` — confirming `url`/`logo` correctly stay absent with `NEXT_PUBLIC_SITE_URL` unset.

## Branch hygiene note

The session's uncommitted changes were initially sitting on `chore/vault-session-2026-08-05-footer-pagination`, which already carried an unmerged commit and an open, differently-scoped PR (#14). Stashed, branched `feat/geo-aeo-seo-machine-endpoints` off `develop`, and committed there instead — see [[sals3-skills]] lesson 15.

## Files changed

`src/app/robots.ts`, `src/app/robots.test.ts`, `src/app/llms.txt/route.ts`, `src/app/llms.txt/route.test.ts`, `src/lib/site.ts`, `src/components/schema/OrganizationSchema.tsx`, `src/app/layout.tsx`, `README.md`, plus vault notes: [[sals3-geo-aeo-seo-strategy-proposal]] (new), [[parked-ideas-backlog]] (3 new entries), [[sals3-skills]] (entries 13-15), [[hot]], [[index]], [[vault-catalog]].

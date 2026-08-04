---
tags: [session, sals3, storefront, frontend]
aliases: [Marketplace Landing Page Session]
created: 2026-08-05
updated: 2026-08-05
status: current-state
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[sals3-skills]]"
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-implementation-phases]]"
  - "[[nextjs-component-security-code-rules]]"
---

# Session 2026-08-05 Part 01 — Marketplace Landing Page

> [!NOTE] Evidence, not narrative
> This note is a record of what was actually built and verified. It does not override [[sals3-implementation-phases]] or the build spec's stage order.

## What happened

- Bogs asked for the marketplace landing (home) page, built to match the "Sals3 Marketplace" prototype from the Claude Design project (`claude.ai/design/p/bbfb99d1-616f-4c5c-ae85-e1f61f91756e`), and to follow this vault's code rules.
- Read the prototype's `Sals3 Marketplace.dc.html`, `support.js`, `spec.txt`, and the real logo asset (`uploads/sals3-logo-1.webp`) via the `DesignSync` tool's `get_project` / `list_files` / `get_file` methods, pointed directly at the project ID from the URL. `spec.txt` matched [[sals3-ux-build-specification]] verbatim — no new decisions came from the design project, only the visual/interaction reference.
- Built the home screen only (header, category strip, dismissible promo banner, deals grid, "For you" grid with a real client-side Load More) as one-off components under `src/components/{layout,home,icons,ui}/`, plus `src/lib/money.ts` (minor-unit `Money`, build spec section 16.3) and `src/lib/home-placeholder-data.ts` (static placeholder catalog — no catalogue service is wired to the UI yet).
- Design tokens (Plus Jakarta Sans + Outfit, semantic `--color-*` custom properties) added to `globals.css` under Tailwind v4 `@theme`, replacing the starter Geist fonts.
- Real Sals3 logo decoded from the design project's base64 asset and saved to `public/sals3-logo.webp` (2000×647, used via `next/image` with explicit width/height).
- Fixed a real accessibility gap found during mobile testing (375px): icon-only Cart/Account controls had no accessible name once their text labels were hidden by responsive classes. Added explicit `aria-label`.
- Fixed a real test-infra gap: `test/setup.ts` had no `afterEach(cleanup)`, so multi-`it()` test files leaked DOM nodes across tests (only surfaced once a file had more than one test). See [[sals3-skills]] #1.
- Verified: `npm run lint`, `format:check`, `build` (includes Next's own TypeScript check), `test:run` (3 tests), `test:e2e` (1 test), `npm audit --audit-level=high` (0 vulnerabilities) — all pass. Checked visually at desktop and 375px mobile viewports via the Browser pane; confirmed zero horizontal overflow and no element overlap by computed geometry.
- Branched `feat/marketplace-landing-page` off `develop` (never committed directly to `develop`, per [[team-profile-and-collaboration-preferences]]'s git workflow rule), committed, pushed. GitHub auto-offered a PR link; the PR (#10) was merged to `develop` shortly after — outside this session's action, observed on the next `git fetch`.
- While on `develop`, discovered it had moved 2 commits ahead of the last local sync: PR #8 (`feat: adding zod package`) and PR #9 (`Feat: Products API Services`, `src/services/products.ts` + `src/services/products.test.ts`, a `fetchProducts()` wrapper around `https://dummyjson.com/products` validated with Zod). Fast-forward merged cleanly (only file overlap was `README.md`, auto-merged with no conflict). The home page in this session was **not** wired to that service — it still uses `home-placeholder-data.ts`.

## Deviation flagged to the owner (not hidden)

Build spec section 20.2 requires design tokens and a base component library before *any* screen, and this screen came before Stage 1's "10 base components" checklist item is done. Flagged directly to Bogs in-session: this is scoped landing-page work, not a Stage 1 claim, and the next screen (PDP/list/cart) risks re-inventing overlapping components (Button, Input, Card, Chip) since no shared library exists yet. See [[sals3-implementation-phases]] Stage 1 for the outstanding checklist.

## Files changed

`README.md`, `e2e/home.spec.ts`, `test/setup.ts`, `src/app/{globals.css,layout.tsx,page.tsx,page.test.tsx}`, `public/sals3-logo.webp`, and 13 new files under `src/components/` and `src/lib/`. Full diff: PR #10, `feat/marketplace-landing-page` → `develop`.

## Not done / still placeholder

- No base component library (Stage 1 item still open).
- No `/c/[category]` or `/p/[id]` routes — `CategoryStrip` and `ProductCard` link to paths that don't exist yet (expected 404 until Stage 3 lands).
- Product data is static and hand-written, not from `src/services/products.ts` or any real catalogue.
- No cart, account, or orders pages — those nav links are stubs.

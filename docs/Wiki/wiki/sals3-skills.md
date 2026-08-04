---
tags:
  - lessons-learned
  - engineering
  - domain-rules
  - sals3
aliases:
  - Engineering and Domain Lessons
created: 2026-07-31
updated: 2026-08-05
status: canonical
authority: consolidated-lessons
owner_approved: true
related:
  - "[[agent-operating-contract]]"
  - "[[hot]]"
  - "[[sals3-session-2026-08-05-part01-marketplace-landing-page]]"
  - "[[../../journal/sals3-session-2026-08-05-part01-landing-page-api-carousel]]"
  - "[[sals3-session-2026-08-05-part02-footer-and-pagination]]"
---

# Sals3 — Engineering and Domain Lessons

> [!IMPORTANT] Purpose
> Consolidated, numbered lessons from real incidents — not speculative best practices. Each entry exists because something actually broke or surprised someone, once real build work happens.

Add a new numbered skill in the same task the underlying incident is fixed or the lesson is confirmed. Reference it from `hot.md` and, if code-adjacent, from the relevant commit or session note.

## Skills

1. **Vitest + Testing Library needs explicit `afterEach(cleanup)`.** This repo's `vitest.config.mts` does not set `test.globals: true`, so `@testing-library/react`'s auto-cleanup (which registers itself against a global `afterEach`) silently never runs. A test file with exactly one `it()` never shows the bug; a second `it()` in the same file does, as `getByRole`/`getByPlaceholderText` etc. start matching leftover nodes from the previous test's render and throw "multiple elements found." Fixed once, in `test/setup.ts`, by importing `cleanup` from `@testing-library/react` and `afterEach` from `vitest` and calling `afterEach(() => cleanup())`. Covers every test file in the repo going forward. Source: [[sals3-session-2026-08-05-part01-marketplace-landing-page]].

2. **`npm run typecheck:clean` can EPERM on Windows if anything is holding `.next` open.** The script (`scripts/typecheck-clean-next.mjs`) renames `.next` aside, runs `tsc --noEmit`, renames it back — and `fs.renameSync` throws `EPERM: operation not permitted` on Windows if a running `next dev` server (or, once, an unexplained transient lock — likely antivirus real-time scanning) has an open handle inside that directory. A plain `rm -rf .next` succeeds even when the rename doesn't, which is the tell: it's a rename-specific block, not a full lock. Fix: stop any running `npm run dev` for this repo before running `typecheck:clean`, `npm run verify`, or a `git commit`/`git push` that triggers the Husky hooks (both hooks run `npm run verify`), and delete `.next` by hand once if the error recurs immediately after a fresh `next build`. `npx tsc --noEmit` directly (no rename dance) is a safe way to typecheck without touching `.next` at all if this keeps recurring. Source: [[sals3-session-2026-08-05-part01-marketplace-landing-page]].

3. **This repo's ESLint config (Airbnb, via `eslint.config.mjs`) is stricter than typical Next.js community style.** Two rules that will fire on ordinary-looking component code: `import/prefer-default-export` (every single-export component file needs `export default function X`, not `export function X`) and `react/jsx-props-no-spreading` (no `{...props}` or `{...someObject}` on a JSX element, including a shared "base attrs" object pattern for icon components — every attribute must be written out explicitly). Write components this way from the start rather than fixing a batch of lint errors afterward. Source: [[sals3-session-2026-08-05-part01-marketplace-landing-page]].

4. **GitHub PRs on `Sals3-Official/sals3-ecommerce` can get merged to `develop` outside the session that opened them** (observed: PR #10 was merged within minutes of pushing the branch, with no explicit merge action taken in this session — auto-merge or a fast human reviewer, not confirmed which; PR #11 landed the same way while this session was still open). After pushing a feature branch, re-run `git fetch` before assuming `develop` is still behind — it may already contain the just-pushed work, or someone else's, by the time you check. Source: [[sals3-session-2026-08-05-part01-marketplace-landing-page]].

5. **The `DesignSync` tool can read an existing `claude.ai/design` project directly by ID** (`get_project`, `list_files`, `get_file` — the project ID is the UUID in the `claude.ai/design/p/<uuid>` URL) without needing the Adobe Express import flow. Useful for pulling a prototype's exact HTML/CSS/JS and binary assets (base64 via `get_file`) as an implementation reference, not just for pushing a design-system library. `get_file` caps at 256 KiB per call and large payloads land in a persisted tool-result file — for a binary asset, decode that file's `content` field from base64 on disk (PowerShell/Python) rather than reading the base64 text into context. Source: [[sals3-session-2026-08-05-part01-marketplace-landing-page]].

### 6. Next.js 16 image quality values are allow-listed

**Confirmed:** 2026-08-05, during the landing-page promo carousel implementation.

**Incident:** `next/image` rendered carousel images with `quality={85}`. The page worked, but Playwright surfaced a Next.js warning: the configured `images.qualities` value was `[75]`, so `85` was not allowed.

**Lesson:** In Next.js 16, do not set a custom `quality` value unless `next.config.ts` explicitly allows it. Prefer default quality for normal ecommerce banners, or update `images.qualities` intentionally and rerun build/E2E.

**Where applied:** `PromoCarousel` now uses default `next/image` quality.

### 7. Typecheck-clean temp folders can poison lint

**Confirmed:** 2026-08-05, during full validation after carousel work.

**Incident:** An interrupted or failed clean typecheck left `.next-typecheck-tmp-*` in the project root. ESLint then scanned generated Turbopack output and reported hundreds of thousands of irrelevant errors.

**Lesson:** Before trusting lint failures after `npm run typecheck:clean`, check for `.next-typecheck-tmp-*`. Clean generated temp folders and keep them ignored in ESLint. Do not fix generated Next.js output.

**Where applied:** `eslint.config.mjs` now ignores `.next-typecheck-tmp-*/**`.

### 8. Prompt-attached images must become verified local assets

**Confirmed:** 2026-08-05, during the carousel image replacement.

**Incident:** The prompt showed multiple carousel images, but only one unrelated clipboard image was visible in the temp attachment path. The real banner files were found in `~/Downloads` and verified by filename, dimensions, and visual inspection before use.

**Lesson:** Do not assume chat-visible images are usable project assets. Search local files, verify dimensions and content, copy only the intended files into `public/` with safe names, and use `next/image` with stable dimensions.

**Where applied:** Seven verified 1734 x 662 banner PNGs now live in `public/home-promos/`.

### 9. Ecommerce promo carousels need manual, testable controls

**Confirmed:** 2026-08-05, during the Embla carousel implementation.

**Incident:** The replacement component needed to remove a static promo banner without creating motion, accessibility, or layout risk.

**Lesson:** For ecommerce promo banners, default to no autoplay, 44px-plus controls, dot navigation, meaningful alt text, stable aspect ratio, and E2E checks for both desktop and mobile. Verify `naturalWidth > 0` and no horizontal page overflow.

**Where applied:** `PromoCarousel` uses Embla manual controls, `next/image`, desktop/mobile Playwright checks, and no autoplay.

### 10. Audit a design mockup's legal/compliance copy before implementing it

**Confirmed:** 2026-08-05, implementing the site footer from the "Sals3 Footer" Claude Design prototype.

**Incident:** The mockup's footer bottom bar asserted a business registration ("Sals3 Pty. Ltd, ACN 685 740 514" — an Australian company-number format, wrong jurisdiction outright), a DTI Trustmark holder claim, "Compliant with Republic Act 11967," a bank of fake security-certification badges (PCI DSS Level 1, Visa Secure, Mastercard SecureCode, etc.), an "accepted payment methods" grid naming 10 specific brands, and Google Play / App Store download buttons — none of which are true against this vault's verified state ([[hot]], build spec section 22).

**Lesson:** A design tool's output is a visual/interaction reference, not a source of truth for legal, compliance, certification, or operational facts. Before implementing any footer/trust/legal copy from a mockup, check every specific factual claim (registration numbers, certifications, "compliant with," payment methods accepted, app availability) against the vault's verified current state. Omit what isn't confirmed rather than shipping it or silently deleting it without explanation — report the specific drop and why, in the same turn.

**Where applied:** `SiteFooter` and its sub-components ship only the brand tagline (matches an actual build-spec design rule), internal nav stubs, and real category links. See [[sals3-session-2026-08-05-part02-footer-and-pagination]] for the full list of what was dropped and why.

### 11. Find the real PID holding a port, don't trust a remembered one

**Confirmed:** 2026-08-05, chasing the recurring `typecheck:clean` EPERM on `.next`.

**Incident:** A `taskkill /PID <remembered-pid> /F` returned "process not found," but `.next` was still locked. The dev server process had a different PID than the one last seen — a new one had been started (or the browser preview's own connection had spawned/kept one alive) since the last check.

**Lesson:** On Windows, when a remembered PID doesn't resolve but a file lock clearly persists, check what is actually listening on the port right now — `Get-NetTCPConnection -LocalPort 3000 | Select OwningProcess` — and kill that PID, not the one from memory. Don't assume a stopped background task means no server is running; a live browser preview tab can keep a `next dev` process alive independently.

**Where applied:** Unblocked the `feat/site-footer-and-pagination` commit/push after two failed retries.

### 12. Don't use array index in a React key, even indirectly, in this repo

**Confirmed:** 2026-08-05, building the numbered-pagination ellipsis markers.

**Incident:** `react/no-array-index-key` fired on `key={`ellipsis-${index}`}` inside a `.map((item, index) => ...)`, even with an `eslint-disable-next-line` comment — Prettier's reformatting moved the JSX relative to the disable comment, breaking the association, and the underlying pattern was fragile regardless.

**Lesson:** When list items lack natural unique identity (like ellipsis markers in a truncated pagination range, where there are at most two per render), give them identity in the data itself instead of leaning on the array index — e.g. `{ ellipsisAfter: <neighboring page number> }` from the function that builds the list, then key off that. Cheaper and more robust than an eslint-disable comment that can silently detach from its target line.

**Where applied:** `src/lib/pagination.ts`'s `PageItem` type and `ProductPagination`'s render.

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

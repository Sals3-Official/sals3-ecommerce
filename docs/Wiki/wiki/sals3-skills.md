---
tags:
  - lessons-learned
  - engineering
  - domain-rules
  - sals3
aliases:
  - Engineering and Domain Lessons
created: 2026-07-31
updated: 2026-08-06
status: canonical
authority: consolidated-lessons
owner_approved: true
related:
  - "[[agent-operating-contract]]"
  - "[[hot]]"
  - "[[sals3-session-2026-08-05-part01-marketplace-landing-page]]"
  - "[[../../journal/sals3-session-2026-08-05-part01-landing-page-api-carousel]]"
  - "[[sals3-session-2026-08-05-part02-footer-and-pagination]]"
  - "[[sals3-session-2026-08-05-part03-geo-aeo-seo-machine-endpoints]]"
  - "[[sals3-session-2026-08-05-part04-home-page-seo-geo-aeo]]"
  - "[[sals3-session-2026-08-05-part05-product-detail-page]]"
  - "[[sals3-session-2026-08-05-part07-cart]]"
  - "[[sals3-session-2026-08-05-part08-cart-toast-and-ux-audit]]"
  - "[[sals3-session-2026-08-05-part09-ui-ux-pro-audit]]"
  - "[[sals3-session-2026-08-06-part10-pr21-pr22-reconciliation-and-cj-bugfixes]]"
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

### 13. A dotted filename works as a Next.js App Router folder segment

**Confirmed:** 2026-08-05, implementing `/llms.txt`.

**Incident:** Needed a literal `/llms.txt` route. It was not obvious whether Next.js App Router would treat a folder literally named `llms.txt` (containing `route.ts`) as a valid route segment, versus requiring a rewrite or a `public/` static file.

**Lesson:** `src/app/llms.txt/route.ts` works exactly as written — Next.js treats the folder name as the literal path segment, dot included. Confirmed in the production build output, which listed `/llms.txt` as a static route alongside `/robots.txt` (from `src/app/robots.ts`, the built-in `MetadataRoute.Robots` convention). No rewrite or `public/` file needed for either.

**Where applied:** `src/app/llms.txt/route.ts`, `src/app/robots.ts`.

### 14. Gate optional JSON-LD fields behind a real env var — never guess a value to fill structured data

**Confirmed:** 2026-08-05, adding the global `Organization` JSON-LD block.

**Incident:** `Organization` schema conventionally carries `url` and `logo`, but no production domain for Sals3 is confirmed anywhere in this repo or vault. Filling them with a plausible-looking guess (e.g. `https://www.sals3.com`) would have presented a guess as a verified fact inside machine-readable structured data — the same failure mode as lesson 10's mockup claims, but with sharper consequences: [[sals3-geo-aeo-seo-strategy-proposal]] §3 documents that Google's structured-data guidelines can penalize fabricated schema with a manual action and loss of all rich results for the domain, not just an inaccurate sentence.

**Lesson:** When a schema field's real value isn't confirmed yet, don't approximate it — read it from an explicit env var (`NEXT_PUBLIC_SITE_URL` here) and omit the field entirely from the emitted JSON-LD when unset, rather than shipping a placeholder that reads as real data to a crawler.

**Where applied:** `src/lib/site.ts`'s `getSiteUrl()`, consumed by `src/components/schema/OrganizationSchema.tsx`.

### 15. Check `git log develop..HEAD` and `gh pr view` before committing — uncommitted changes ride whatever branch is checked out

**Confirmed:** 2026-08-05, before committing the GEO/AEO machine-endpoints work.

**Incident:** The session's uncommitted vault and code changes were sitting on `chore/vault-session-2026-08-05-footer-pagination`, a branch already carrying its own unmerged commit and an open, differently-scoped PR (#14, "record footer + pagination session"). Committing directly would have silently mixed an unrelated SEO/GEO feature into that PR.

**Lesson:** Before staging a commit, don't assume the checked-out branch is a blank slate — run `git log develop..HEAD --oneline` to see what it already carries, and `gh pr view --json number,state,title,url` to check for an existing open PR. If either shows unrelated work, stash, branch fresh off `develop`, and commit there instead.

**Where applied:** Stashed the working tree, branched `feat/geo-aeo-seo-machine-endpoints` off `develop`, and committed there — `chore/vault-session-2026-08-05-footer-pagination` and PR #14 were left untouched.

### 16. Check whether a branch's PR already merged before pushing another commit to it

**Confirmed:** 2026-08-05, immediately after lesson 15 — the same session repeated the exact failure `team-profile-and-collaboration-preferences.md` already documented from 2026-08-04.

**Incident:** After PR #15 (`feat/geo-aeo-seo-machine-endpoints`) auto-merged, a follow-up commit (the SEO/GEO/AEO discoverability rule) was pushed to that same branch without checking merge status first. `git push` succeeded with no warning — a PR merge is a one-time event, not an ongoing sync, so the commit sat unmerged/orphaned on the remote branch. The mistake was caught only because Bogs asked why the change wasn't visible in the PR (which was already closed). Had to open a second PR (#16) to actually land it.

**Lesson:** Before pushing another commit to a branch that already had a PR, run `gh pr view --json state,mergedAt` (or check the branch's PR list) first. If the PR is `MERGED`, create a fresh branch off `develop` instead of pushing more commits to the old one — pushing succeeds silently either way, so a green `git push` is not evidence the commit reached `develop`.

**Where applied:** Opened PR #16 from a corrected state, and added a PR-template checklist item (`.github/pull_request_template.md`) so this is checked at PR-open time going forward, not just remembered.

### 17. `generateMetadata` belongs on `page.tsx`, not `layout.tsx` — and URL fields must still be gated on `getSiteUrl()`

**Confirmed:** 2026-08-05, adding per-route Open Graph and Twitter Card tags to the home page.

**Incident:** The global `layout.tsx` already exported `metadata` (title and description). Adding a second `generateMetadata` export on `page.tsx` at first looked like a conflict — but Next.js App Router resolves metadata by merging from the outermost layout inward, with the most-specific route winning. The per-page export overrides the layout fallback on that route only; other routes are unaffected.

**Lesson:** `layout.tsx` metadata is a global fallback. Route-specific tags (`og:url`, `canonical`, `og:type: website`, Twitter Card) belong in `generateMetadata()` on `page.tsx`. All URL fields must still be gated on `getSiteUrl()` (see skill 14) — `generateMetadata` is not exempt. Gate `alternates.canonical`, `openGraph.url`, and any absolute-URL field the same way as in a JSON-LD component: read from env, omit when unset, never guess.

**Where applied:** `src/app/page.tsx` — `generateMetadata()` returns `title`, `description`, `robots`, `openGraph`, `twitter`, and `alternates.canonical`, with the URL fields all gated.

### 18. `WebSite` JSON-LD's `SearchAction` is a valid forward-looking signal — document its placeholder status in code

**Confirmed:** 2026-08-05, building `WebSiteSchema.tsx`.

**Incident:** The `WebSite` schema's `potentialAction` (`SearchAction`) targets a `/search` route that does not yet exist. It was tempting to skip it until the route exists, but the GEO/AEO value of the `SearchAction` signal — telling AI crawlers and Google that this is a searchable site — accrues before the route is live, and removing it later requires another PR.

**Lesson:** It is acceptable to emit a forward-looking `SearchAction` in `WebSite` JSON-LD when the route is confirmed as planned. Document the placeholder status explicitly in a code comment so the next developer knows to update the target URL when the search route ships. Gate the whole action (along with `url`) behind `getSiteUrl()` — skip both when the domain isn't confirmed, because a `SearchAction` without a real `url` parent isn't useful to a crawler anyway.

**Where applied:** `src/components/schema/WebSiteSchema.tsx` — comment reads: *"The SearchAction target (/search?q=) is a forward-looking signal; the search route does not exist yet. Replace the target once the real search URL ships."*

### 19. Prettier can fail `format:check` on a new file even when no obvious style violation exists — run `prettier --write` on it immediately

**Confirmed:** 2026-08-05, after adding `generateMetadata` to `src/app/page.tsx`.

**Incident:** `npm run format:check` failed on `page.tsx` despite the code reading as well-formatted. The cause was a trailing blank line introduced by a multi-replace edit (`\n\n` before the `const` block after the new export). Prettier's output for that file differed by exactly one blank line.

**Lesson:** After any multi-chunk edit to a file (especially one produced by a tool that patches raw text), run `npx prettier --write <file>` on the changed file immediately and re-run `format:check` before moving to the next step. Catching it early saves discovering it only at the verification stage, when it forces a re-run of the full suite. The fix itself is instant; the cost is the extra round-trip.

**Where applied:** `src/app/page.tsx` — fixed by `npx prettier --write src/app/page.tsx` between the typecheck and build steps.

### 20. `DesignSync`'s read methods work on a plain `PROJECT_TYPE_PROJECT`, not only `PROJECT_TYPE_DESIGN_SYSTEM`

**Confirmed:** 2026-08-05, building the `/p/[id]` product detail page.

**Incident:** Bogs referenced `claude.ai/design/p/bbfb99d1-616f-4c5c-ae85-e1f61f91756e` (the same project as skill 5) and named a "claude_design MCP" that isn't in this environment's toolset. `DesignSync.list_projects` returned an empty array (no writable design-system projects), which looked like a dead end. But `DesignSync.get_project` on that exact ID returned `{ type: "PROJECT_TYPE_PROJECT", canEdit: true }` — a regular Claude Design project, not a design-system one — and `list_files`/`get_file` worked on it anyway.

**Lesson:** `list_projects` only enumerates *writable design-system* projects; it is not proof a given project ID is unreachable. If the user supplies a specific `claude.ai/design/p/<uuid>` link, try `get_project` with that ID directly before concluding `DesignSync` can't reach it. The tool's write path (`finalize_plan`/`write_files`) does require `PROJECT_TYPE_DESIGN_SYSTEM`, but the read path (`get_project`, `list_files`, `get_file`) does not check project type.

**Where applied:** `Sals3 Marketplace.dc.html` and `support.js` read from the project to build the PDP's gallery, price box, action-bar, and reviews layout.

### 21. jsdom's `localStorage` can be undefined in this repo's test environment — don't depend on it, polyfill it

**Confirmed:** 2026-08-05, building the cart feature.

**Incident:** `CartProvider.tsx` called `window.localStorage.getItem(...)` in a `useEffect`. Every test that rendered a page composing `SiteHeader` (which now renders a cart badge) crashed with `TypeError: Cannot read properties of undefined (reading 'getItem')` — `window.localStorage` itself was `undefined`, not merely broken. `vitest.config.mts` has `environment: 'jsdom'`, which normally ships a working `localStorage`. The console also showed `ExperimentalWarning: localStorage is not available because --localstorage-file was not provided` — Node's own experimental global `localStorage` (recent Node versions) appears to shadow or conflict with jsdom's under this setup.

**Lesson:** Don't assume jsdom's `localStorage` works in this repo's test environment — verify or polyfill it explicitly rather than debugging the jsdom/Node interaction. Fixed with a small in-memory `Storage` class installed via `Object.defineProperty(window, 'localStorage', ...)` in a `beforeEach` in `test/setup.ts`, reset before every test. This also gives cleaner test isolation than a real persistent store would.

**Where applied:** `test/setup.ts`; consumed by `src/lib/cart.test.ts`, `src/app/cart/page.test.tsx`, and every page test that now renders `SiteHeader` (`src/app/page.test.tsx`, `src/app/p/[id]/page.test.tsx`, `src/app/login/page.test.tsx`, `src/app/signup/page.test.tsx`).

### 22. A long-lived dev server serves broken HMR after many hot-reloads — the symptom looks like a click bug, not a server bug

**Confirmed:** 2026-08-05, verifying the cart feature's Add to Cart button.

**Incident:** Playwright's `e2e/cart.spec.ts` and manual browser checks both showed "Add to Cart" clicks doing nothing — no `Added to cart.` text, no localStorage update — even though `toBeEnabled()` passed and no console error appeared at first glance. Calling `element.click()` directly via injected JS **did** work and updated state correctly, proving the React handler itself was fine. Adding `page.on('console', ...)` / `page.on('pageerror', ...)` surfaced the real signal: repeated `WebSocket connection ... /_next/hmr ... failed: net::ERR_INVALID_HTTP_RESPONSE` and sporadic `403 Forbidden` on `/_next/*` assets. The dev server (PID found via `Get-NetTCPConnection -LocalPort 3000`) had been running since before the session started and had absorbed a large number of file edits and Fast-Refresh full-reloads across three sessions' worth of work (see skill 11 for the general "find the real PID" lesson — this is the specific symptom signature to recognize).

**Lesson:** If a button click silently no-ops in both Playwright and a manual browser check, but the same handler works when invoked directly via `element.click()` in injected JS, suspect a corrupted long-lived dev server before suspecting the component code. Check for broken HMR websocket / 403s in the console, confirm the real PID on the port, confirm with the owner before killing it (killing a process is a destructive-ish action per the safety rules even when it's "just" a local dev server), then let the test runner's `webServer` config (`reuseExistingServer: false` effectively, once nothing is listening) start a clean one.

**Where applied:** Killed the stale PID 56420 after confirming with Bogs; `npm run test:e2e` then passed 6/6 against a fresh server on the first run.

### 23. `ui-ux-pro-max`'s `--design-system` palette/typography suggestion can conflict with an already-approved brand — apply the checklist, not the palette

**Confirmed:** 2026-08-05, auditing the PDP and cart against the `ui-ux-pro-max` skill after Bogs flagged it hadn't visibly been used.

**Incident:** `ui-ux-pro-max --design-system "ecommerce marketplace product detail page"` returned a full recommendation — a purple `#7C3AED` palette, Rubik/Nunito Sans typography, a "Marketplace/Directory" pattern. Sals3 already has an approved brand palette and type system (`--color-brand-600` `#0a5c8a`, Plus Jakarta Sans/Outfit) chosen from the "Sals3 Marketplace" Claude Design reference across three earlier sessions ([[sals3-session-2026-08-05-part01-marketplace-landing-page]] onward). Applying the tool's generic suggestion wholesale would have silently discarded that decision.

**Lesson:** `--design-system` output is generic-product-type-shaped, not brand-aware — it doesn't know a real brand decision already exists. When one does, split the output: apply the palette-independent, universally-valid items (the pre-delivery checklist — touch targets, cursor/hover feedback, contrast, motion, ARIA), and explicitly skip the palette/typography/pattern suggestion rather than let it silently override an approved decision. This is the same principle the footer session applied to mockup claims — a reference tool's output is a source to weigh, not an automatic override. State the skip and the reason to the owner rather than silently deviating either way.

**Where applied:** Applied — `cursor-pointer` + hover transitions on every custom button (native `<button>` doesn't get `cursor: pointer` for free), cart quantity-stepper buttons bumped from 32×32px to the 44×44px touch-target minimum. Not applied — the purple palette, the alternate type pairing, the "Marketplace/Directory" section pattern.

### 24. Verify responsive breakpoints live, in the browser — reading the Tailwind classes is not enough

**Confirmed:** 2026-08-05, running `ui-ux-pro`'s Responsive Containers checklist against the PDP.

**Incident:** `src/app/p/[id]/page.tsx`'s gallery/info grid used `lg:grid-cols-2` (1024px). Reading the code, this looks reasonable — a single-column fallback below desktop width. Checked live in the browser at 768px anyway (`getBoundingClientRect()` on the product image and the Add to Cart button, not just a visual glance): the product photo alone rendered ~703px tall, pushing `Add to Cart` to 1042px down — below the fold on a 1024px-tall viewport, a real conversion-blocking bug that the code alone didn't reveal.

**Lesson:** A breakpoint choice that reads fine in Tailwind class names can still produce a broken layout at a specific, common width — the gap between `sm`/`md` and `lg` is wide enough (640/768px to 1024px) that a single-column fallback can render very badly at 768–1023px, exactly where tablets live. Check actual rendered dimensions at 375/768/1024/1440px via the browser (`getBoundingClientRect()` or equivalent), not just by reading which breakpoint prefix was used.

**Where applied:** Moved the PDP's and the cart page's grid breakpoints from `lg` to `md`; re-verified all three widths afterward.

### 25. Don't assert on stock-dependent state from live, randomly-selected third-party product data in e2e tests

**Confirmed:** 2026-08-05, fixing a flaky test during the `ui-ux-pro` audit session.

**Incident:** `e2e/product.spec.ts`'s general navigation test clicked the first product card on the home page (a live, randomly-`skip`ped DummyJSON deal — see [[sals3-session-2026-08-05-part01-marketplace-landing-page]]) and asserted `Add to Cart` is enabled. It failed intermittently: some random products are legitimately out of stock, and a correctly-disabled button for an out-of-stock product isn't a bug.

**Lesson:** When a test navigates through live, non-deterministic third-party data (as this repo's e2e tests do — no mocking, real DummyJSON), don't assert on any property that varies per-item (stock, price, rating) unless the test pinned a specific, known item id first. General navigation/rendering tests should assert structure (the button renders, the heading exists), not item-specific state; a dedicated test using a fixed id (`e2e/cart.spec.ts` already uses `/p/1`, `/p/2`) is the right place for state-specific assertions.

**Where applied:** `e2e/product.spec.ts` now asserts `toBeVisible()` instead of `toBeEnabled()` on the Add to Cart button for the random-product navigation test.

### 26. Verify a bug's actual root cause with direct evidence before shipping a fix for a plausible one

**Confirmed:** 2026-08-06, chasing a "home page pagination loses everything past ~page 19" report.

**Incident:** Two plausible-sounding hypotheses were built and shipped as real fixes before the actual cause was found: (1) the client-side PDP product search hammering CJ's 1-request/second rate limit, and (2) `sals3-portal`'s reported `totalPages` not reflecting how many pages are actually reachable. Both were reasonable given the evidence available at the time, and both are legitimate improvements regardless — but neither was what caused this specific incident. Only after `curl`-ing the exact failing query directly (got real data back, disproving both hypotheses) and adding temporary `console.error` logging around the actual `catch` block did the real cause surface: a Zod schema rejecting an entire 14-item page over one product's overlong `title`.

**Lesson:** When a bug has more than one plausible explanation, don't stop at the first one that fits the symptoms — verify directly (a raw `curl` against the real dependency, temporary logging in the actual catch path) before calling it fixed. A hypothesis-shaped fix can still be worth keeping (both of the above were), but say so plainly rather than presenting it as confirmed root cause.

**Where applied:** Bug 3's `totalPages` self-correction and Bug 1's rate-limit cap were both kept as real defense-in-depth, explicitly relabeled as not-the-actual-cause once Bug 5 (schema rejection) was confirmed with direct evidence. See [[sals3-session-2026-08-06-part10-pr21-pr22-reconciliation-and-cj-bugfixes]].

### 27. A Zod array schema rejects the whole array when any single element fails — truncate real external strings, don't hard-reject them

**Confirmed:** 2026-08-06, the actual root cause behind skill 26's incident.

**Incident:** `StorefrontProductSchema`'s `title: z.string().max(120)` and `imageAlt: z.string().max(160)` are correct for typical products, but real CJ product titles are long marketing-style names that routinely exceed both limits. `ProductsResponseSchema.safeParse()` on the whole page's `products` array fails validation if *any one* element fails — so one overlong real title anywhere in a 14-item page took the entire page down, not just that row.

**Lesson:** When validating a real external API's array response with Zod, decide deliberately whether a single bad element should fail the whole batch or just that element. For a length cap on freeform text from an upstream you don't control, prefer `.transform((v) => v.slice(0, max))` over `.max(n)` — display length still gets bounded, but one long real value degrades one field instead of the whole page. This is the same principle `sals3-portal`'s own `src/lib/cj/schemas.ts` already documents for its own CJ parsing ("one changed or missing value degrades a single cell instead of failing the page") — the ecommerce-side schema was the one place still doing the opposite.

**Where applied:** `src/services/products.ts`'s `truncatedText()` helper, applied to `title` and `imageAlt`.

### 28. When reconciling two branches that independently touched the same file, diff against the other's base to prove nothing was removed — don't just resolve the conflict and trust it

**Confirmed:** 2026-08-05/06, merging a PDP/cart PR against a parallel PR that rewrote the same service file to call a real backend instead of a placeholder one.

**Incident:** The two branches' `products.ts` had genuine schema-level conflicts, not just textual ones. After resolving and merging, the owner directly asked whether the other engineer's already-shipped work had been broken — a fair question, since a resolved conflict alone doesn't prove that.

**Lesson:** After reconciling a merge conflict in a file someone else's PR already shipped, run `git diff origin/develop -- <file> | grep -c '^-[^-]'` (count of removed lines) and confirm it's `0` for the functions/exports that are supposed to be untouched, plus a full `git diff origin/develop -- <other-files>` for files that shouldn't have changed at all. A clean merge with no conflict markers is not the same claim as "nothing of theirs was removed" — check it explicitly and be ready to show the count, not just assert it.

**Where applied:** Verified and reported before merging PR #21: `0` removed lines in AJ's `fetchProducts`/`fetchProductCategories`, `0` diff on `page.tsx`/`ProductCard.tsx`/`next.config.ts`.

### 29. Check the upstream API's own documented parameters before assuming a new backend endpoint is the only fix

**Confirmed:** 2026-08-05, designing the fix for "no way to fetch one product by id."

**Incident:** The instinct was to design and build a brand-new single-product endpoint on `sals3-portal` from scratch. Reading CJ's own public API documentation first (`https://developers.cjdropshipping.com/en/api/api2/api/product.html`) showed the existing `/product/list` endpoint — already called by `sals3-portal`'s `fetchCjProducts()` for the list view — already accepts a `pid` filter parameter for an exact single-product match. No new CJ integration was needed, only wiring an existing, undocumented-to-the-client capability through.

**Lesson:** Before designing a new backend endpoint to solve "we can't fetch X directly," check whether the upstream API already supports fetching X via an existing endpoint's undocumented-to-your-own-client parameters. Read the third party's own docs, not just your own codebase's current usage of it — a service can call an API correctly for its current use case while leaving real capability unused.

**Where applied:** `sals3-portal`'s new `GET /api/storefront/products/[id]` route resolves via the existing `/product/list?pid=` filter — one upstream call, no new CJ integration.

### 30. A repo's own Husky hooks running full `verify` will test against a local `.env.local`, not CI's no-secrets condition — hide it temporarily to get an honest local check

**Confirmed:** 2026-08-06, verifying the schema-truncation fix (skill 27).

**Incident:** `npm run test:e2e` failed locally on a test that asserts "no backend configured → notFound()" — because a real, working `sals3-portal` instance and a real `.env.local` had just been set up in this same session for manual verification. The test's premise (no reachable backend) was no longer true in this local environment, but the fix under test was fine — CI (which never sees `.env.local`, since it's gitignored) would pass.

**Lesson:** When a repo's local dev environment has real credentials configured for manual testing, but its automated suite assumes no backend is configured (matching CI), a local `npm run test:e2e` or Husky-hook-triggered `npm run verify` will fail on tests whose premise your own local setup just invalidated. Temporarily move `.env.local` aside (`mv .env.local .env.local.bak`, verify, `mv` back) to get a true CI-equivalent local check rather than mistaking an environment-caused failure for a real regression.

**Where applied:** PR #26's e2e run and Husky pre-commit/pre-push hooks both required this to pass cleanly while `E:\sals3-portal` was running locally with real credentials.

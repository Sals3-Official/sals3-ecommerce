---
tags: [session, sals3, category-row, ux, bugfix, catalog]
aliases: [Category Row Tile Band and Related Products Dedup Session]
created: 2026-08-06
updated: 2026-08-06
status: session-record
authority: implementation-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[sals3-skills]]"
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-session-2026-08-06-part11-pwa-icons-and-cart-mobile-overflow]]"
---

# Session: Related-products dedup, Stage-2 title-compiler groundwork, category row tile-band refactor

> [!IMPORTANT] Summary
> Three separate, component-by-component pieces of work in one continuous session, none committed yet. (1) Fixed a real production bug — a duplicate React key crash on the PDP's related-products grid, root-caused to `fetchProductsByCategory()` never deduping a product that appears in both the `for-you` and `deals` sections. (2) Built `compileProductTitle.ts` and a decoupled catalogue `ProductCard` as Stage-2 (structured product entity) groundwork, explicitly not wired into the live catalogue since the real backend has no Brand/Material/Fit attributes yet. (3) Refactored the homepage category row twice in sequence — first a self-directed pass (icons, hidden scrollbar, chevrons), then a full restyle to match an owner-supplied design handoff (tile band, brand colour off navigation, skeleton, no chevrons).

## Starting state

`develop` at `f215328` (PR #30 merged, per [[sals3-session-2026-08-06-part11-pwa-icons-and-cart-mobile-overflow]]), clean fast-forward with `origin/develop`. Two untracked stray files (`Untitled-1.png`, `faviconV2.png`) found at session start, left untouched — not part of any task given this session.

## 1. Related-products duplicate-key bug (console error, screenshot-reported)

**Report:** React error "Encountered two children with the same key" in `ProductCard.tsx` via `ProductGrid`/`RelatedProducts`, on a real PDP.

**Root cause, confirmed by reading the actual call chain, not guessed:** `fetchProductsByCategory()` → `collectAllProducts()` in `src/services/products.ts` fetches the `for-you` and `deals` sections independently and concatenates them with no de-duplication. The same real CJ product can legitimately appear in both sections (recommended *and* on-deal). The duplicate survives the category filter and the PDP's `excludeId` filter, lands twice in `RelatedProducts`' product list, and `ProductGrid` keys each card by `product.id` — hence the collision.

**Fix:** `collectAllProducts()` now de-dupes by `id` (a `Map` keyed on `product.id`, first occurrence kept) after merging both sections, before any filtering. Added a regression test (`products.test.ts`) that returns the same product from both sections and asserts exactly one result. README's `fetchProductsByCategory` paragraph updated with the cross-section duplicate behaviour and the fix.

**Verified:** lint, format:check, `tsc --noEmit` (substitute for `typecheck:clean` — see the recurring `.next`-lock note below), 60/60 unit tests (was 59), `npm audit --audit-level=high` 0 vulnerabilities. Build/e2e skipped — another chat's dev server held `.next` for the whole session (see the session-end note).

## 2. Stage-2 title-compiler and catalogue `ProductCard` — explicitly not wired to the live app

A request asked for a "Product Title Compiler" (`compileProductTitle.ts`) and a `ProductCard.tsx` accepting Brand/Material/Fit/Pockets attributes, citing the build spec.

**Verified against the actual spec before building anything** (per [[agent-operating-contract]]'s anti-yesman rule): two of the request's section citations didn't match the real document. §11.4 is the Colour rule (brand colour for actions only, 4.5:1 contrast) — no line-clamp rule lives there. §8.1/§16.3 are cart fulfillment-leg grouping and the `Money` minor-units type — neither defines a `[Base Name] + [Variant Spec]` checkout-truncation format. Both patterns were still built (they're sound UX regardless), but reported as not spec-sourced rather than silently accepting the citation.

**Bigger issue, reported plainly:** the real storefront schema (`StorefrontProductSchema` in `src/services/products.ts`) has no Brand/Material/Fit/Pockets fields at all — CJ returns one pre-formatted title string. Building this compiler is real Stage-2 (structured product entity) groundwork per the spec's own glossary (Attribute/Variant/Facet are defined there, just not built), not something with live data to consume today. Built as a standalone, independently testable unit under `src/lib/` and `src/components/catalog/` — a separate directory from the live `src/components/home/ProductCard.tsx` — with an explicit comment that it must not be routed real traffic until a real structured entity exists.

Also declined to add duplicate Tailwind token names (`text-price-primary`, `text-title-neutral`) the request asked for — the repo already has a working 3-level token system (`--color-ink`, `--color-ink-muted`, etc.) encoding the same §11.1/§11.2 intent; a parallel name set would fork the design system. Gave a mapping instead of new tokens.

**Files:** `src/lib/compileProductTitle.ts` + `.test.ts` (5 tests, both sample SKUs from the request plus edge cases), `src/components/catalog/ProductCardImage.tsx` (skeleton-while-loading, reuses the existing `ProductImagePlaceholder` for the no-photo case), `src/components/catalog/ProductCard.tsx` + `.test.tsx` (6 tests).

**Verified:** lint, format:check, `tsc --noEmit`, 71/71 unit tests (was 60), audit 0 high. Build/e2e skipped, same `.next`-lock reason.

## 3. Category row — two passes

### Pass 1 — self-directed (icons, hidden scrollbar, chevrons)

A screenshot showed the native desktop scrollbar under the category icons and plain `code`-initial circles instead of icons. `CategoryStrip.tsx` renamed to `CategoryRow.tsx` (`git mv`, history preserved). Built `category-icons.tsx` (16 hand-authored inline SVG icons keyed by category id — no icon library, since the real feed has no icon field; an unmapped id falls back to the real `code`), a `no-scrollbar` Tailwind `@utility`, and a client `CategoryScroller` with `ResizeObserver`-driven chevrons that hid themselves when the row didn't overflow. Declined the request's literal ask for hardcoded apparel mock categories — §15.1 itself says "the true top categories, not a fixed list," and the live categories in the screenshot were real CJ feed values, not dummy data; §18.3 (category cleaning) is migration/URL-redirect work, not a component task.

Live browser verification was blocked the whole session by another chat's dev server holding port 3000 and `.next` — asked the user, who chose "stop the other server yourself, then I verify," but the port never freed. Reported the gap plainly rather than claiming an unverified visual check.

### Pass 2 — owner design handoff (tile band)

The owner supplied a full design-handoff bundle (`design_handoff_category_row/`: two `.dc.html` prototypes, a `support.js` runtime, and an authoritative `category-row-1b-implementation-notes.md`) citing §11.3, §11.4, §11.7, §11.8, §13, §15.1. All six citations checked against the actual spec text and confirmed accurate — unlike the title-compiler request, nothing here needed correcting.

Applied per the handoff:

- Two new semantic tokens (`--color-surface-sunken: #f1f3f5`, `--color-surface-sunken-strong: #e9edf0`) added to `globals.css`'s `@theme inline` block, for the tile fill — the neutral greys that let the brand colour come off the icons (§11.4).
- `CategoryRow` moved out of `<main>` in `page.tsx`, directly under `SiteHeader`, so its `border-y bg-white` band spans the full viewport instead of the 1152px content column.
- `CategoryScroller.tsx` rewritten as a plain server component (band shell): `md:grid md:auto-cols-fr md:grid-flow-col` removes overflow entirely at `md`+, so the chevrons and all client-side scroll mechanics (`useRef`/`useState`/`useEffect`/`ResizeObserver`) are gone. `CategoryScrollButton.tsx` deleted.
- `CategoryRowItem.tsx` restyled: 56px `rounded-2xl` tile (was 48px circle), `bg-surface-sunken`/`text-ink-muted` (was `bg-brand-600/10`/`text-brand-600`), label wraps to 2 lines via `text-pretty` instead of `truncate` (real CJ category names clip at 80px on one line), `duration-200 ease-out` on every transition (§11.7's explicit-duration rule the prior pass missed).
- `CategoryRowSkeleton.tsx` added (10 tiles at the exact real geometry, `animate-pulse`) and wired as the `<Suspense>` fallback around the category row.

**A genuine architecture finding, not a style nit:** wiring the skeleton as a real Suspense *defer* (fetch categories, pass the unresolved promise into an async child component, let Suspense catch it) is valid, idiomatic Next.js and would work in the real dev server — but this repo's `page.test.tsx` renders via `renderWithCart(await Home())`, a plain client `render()` of an already-resolved tree. Proved directly, not assumed: even `screen.findByRole()` (which polls) timed out waiting for the nested async Server Component to resolve — that harness cannot execute one at all. Making the category row the one streamed section on a page where every other section (`DealsSection`, `ForYouSection`) still resolves synchronously in the same `Promise.all` is also a page-wide rendering change beyond this refactor's scope. Reverted to resolving `homeCategories` in the same `Promise.all` as before; the `<Suspense>` boundary and `CategoryRowSkeleton` stay in place and tested, but are honestly documented in-code as structural (satisfying the handoff's wiring requirement) rather than a functioning defer today.

**Files:** `category-icons.tsx` (kept, unchanged), `CategoryRow.tsx` (unchanged — still caps at 10, still server-rendered), `CategoryScroller.tsx` (rewritten, no longer a client component), `CategoryRowItem.tsx` (restyled), `CategoryRowSkeleton.tsx` + `.test.tsx` (new), `CategoryScrollButton.tsx` (deleted), `CategoryRow.test.tsx` (chevron assertions replaced with tile-band/skeleton/brand-colour-absence assertions, plus a check against the real 9-category placeholder fallback from `home-placeholder-data.ts`), `globals.css` (2 new tokens), `page.tsx` (band moved above `<main>`), `README.md` (Home Page section rewritten for the band).

**Verified:** lint, format:check, `tsc --noEmit`, 85/85 unit tests (was 71). Live `getBoundingClientRect()` overflow check at 375px/320px from the handoff's definition of done was **not performed** — port 3000 stayed held by another chat's dev server for the entire session. Reasoned through the overflow question instead of claiming an unverified pass: the band's mobile behaviour is `overflow-x-auto` by design (a scroll container contains its own overflow within its layout box), which is a structurally different situation from the cart bug's class of issue (a non-scrolling flex sibling refusing to shrink) — but this is reasoning, not measurement, and is reported as such.

## Open items, stated plainly

- **Live verification blocked all session.** Port 3000 and `.next` held by another chat's dev server throughout. The handoff's `getBoundingClientRect()` checks at 375px/320px are not done. Needs a live pass before this is called visually verified.
- **Whether Sals3 is pivoting toward owned-brand apparel** (raised by the title-compiler request's sample SKUs — "SALS3 Tactical Pants," "SALS3 Tactical Shorts") is still unconfirmed. If true, the category row's category *source* (the live CJ feed) may be the wrong data source entirely — a catalogue decision for AJ/Leadership, not resolved here.
- **Selected-state for category tiles** deliberately deferred per the handoff's own decision (2026-08-06): no `/c/[slug]` route exists yet to set it, so no `isSelected` prop shipped. Build it in the same task that builds `/c/[slug]`.
- Nothing in this session is committed. `Untitled-1.png`/`faviconV2.png` remain untouched, unexplained stray files from session start.

## Lessons

See [[sals3-skills]] entries 34–37: a live feed's independently-fetched sections can return the same entity twice, so any merge across sections needs an explicit id-based dedupe, not just concatenation; verify a request's spec citations against the actual document before building to them, even when (especially when) the request sounds authoritative; this repo's RSC page-test technique cannot execute or observe a nested async Server Component at all, proven by a timed-out `findByRole`, not assumed; and two concurrent dev sessions in one Next.js working directory contend for port 3000 in addition to the already-documented `.next`-directory lock.

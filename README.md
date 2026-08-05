# Sals3 Ecommerce

Next.js + TypeScript ecommerce rebuild for Sals3.

## Required Reading

Before code changes, read:

- `AGENTS.md`
- `docs/Wiki/wiki/hot.md`
- `docs/Wiki/wiki/agent-operating-contract.md`
- `docs/Wiki/wiki/nextjs-component-security-code-rules.md`
- `docs/Wiki/wiki/project-structure-installation-and-runbook.md`

## Project Structure

```text
sals3-ecommerce/
├── .github/workflows/verify.yml
├── docs/                    # Obsidian vault and project documentation
│   ├── Raw/                 # Source/reference assets
│   └── Wiki/wiki/           # Canonical operating notes
├── e2e/                     # Playwright tests
├── public/                  # Static public assets
├── scripts/                 # Local automation scripts
├── src/app/                 # Next.js App Router source
├── src/services/            # API service wrappers and tests
├── test/                    # Shared test setup/helpers
├── AGENTS.md                # Mandatory agent rules
├── package.json             # npm scripts and dependencies
└── package-lock.json        # npm lockfile
```

Do not put application code in `docs/`. Do not put vault notes in `src/`.

## API Services

Product API calls live in `src/services/products.ts`. `fetchProducts()` reads
from the protected `sals3-portal` storefront API, sends validated `section`,
`page`, and `limit` parameters, validates external JSON with Zod, and maps API
products into home page cards. The portal feed is backed by the same
CJdropshipping supplier tab at `/products?source=cj`. `fetchProductCategories()`
reads CJ categories through the protected portal category feed and maps
categories into internal `/c/<slug>` navigation links. Invalid `page` and
`limit` input falls back to safe defaults. Real CJ product `title`s and
`imageAlt`s routinely exceed 120/160 characters — confirmed live, this failed
validation for an entire 14-item page over one overlong row. Both fields are
truncated to their display length instead of rejected, so one long real title
can't take a whole page down.

`fetchProductBySlug()` calls `sals3-portal`'s real single-product endpoint,
`GET /api/storefront/products/<slug>` — one upstream call, `undefined` on a
404 or an invalid slug, so the PDP route can render `notFound()` without a
separate error path.

The storefront API still has no category-filter route. `fetchProductsByCategory()`
(used by the PDP's related-products section) pages through `for-you` and
`deals` results and matches by `category` client-side as a stopgap, **hard-capped
at 2 pages per section** (`MAX_CLIENT_SIDE_SEARCH_PAGES` in `src/services/products.ts`):
`sals3-portal` proxies CJdropshipping, which allows only one request per
second and caps its own pagination at 500 pages, so scanning a whole
section for every PDP view would hammer that rate limit for a related-products
section that degrades gracefully to empty anyway. Replace with a direct
category-filter endpoint once `sals3-portal` adds one.

Required `.env.local` values:

```text
SALS3_PORTAL_API_URL=http://localhost:3001
SALS3_STOREFRONT_API_TOKEN=<same value as sals3-portal>
```

## Install

Use npm. Do not switch package managers unless the owner approves.

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm install
```

## Run Locally

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build and Start

```bash
npm run build
npm run start
```

## Tests and Verification

```bash
npm run lint
npm run format:check
npm run typecheck:clean
npm run build
npm run test:run
npm run test:e2e
npm audit --audit-level=high
```

Full shortcut:

```bash
npm run verify
npm audit --audit-level=high
```

## Package Installation

Runtime dependency:

```bash
npm install <package-name>
```

Dev-only dependency:

```bash
npm install -D <package-name>
```

After package changes:

```bash
npm audit --audit-level=high
npm run verify
```

Before adding a package, prefer existing platform features or current dependencies. Avoid heavy, duplicate, unmaintained, or paid-service packages unless approved.

## Machine and AI Discovery

`src/app/robots.ts` allows all crawlers plus explicitly lists `GPTBot`,
`PerplexityBot`, `ClaudeBot`, and `OAI-SearchBot`. When `NEXT_PUBLIC_SITE_URL`
is set, it also emits a `sitemap` field pointing to `/sitemap.xml` — omitted
when the env var is unset so no domain is guessed.

`src/app/llms.txt/route.ts` serves a daily-revalidated, plain-text `/llms.txt`
identifying the site by name, description, and a one-sentence mission statement.
It does not list a product catalog — the current product data
(`src/services/products.ts`) expects the Sals3 Portal storefront feed. The home
page still falls back to local placeholder products when the portal is not
configured or unavailable, so crawler-facing catalog claims stay limited until
real persistent catalogue data exists.

`OrganizationSchema` (`src/components/schema/OrganizationSchema.tsx`) renders a
global `Organization` JSON-LD block in `src/app/layout.tsx`. `WebSiteSchema`
(`src/components/schema/WebSiteSchema.tsx`) renders a `WebSite` JSON-LD block
on the home page, including a forward-looking `SearchAction` pointing to
`/search?q={search_term_string}` — replace with the real search URL once that
route ships. Both schemas emit `name` always; `url`, `logo`, and `potentialAction`
activate automatically once `NEXT_PUBLIC_SITE_URL` is set — no domain is
hardcoded or guessed (see `src/lib/site.ts`).

`src/app/page.tsx` exports `generateMetadata()` with a per-route `<title>`,
`<meta name="description">`, Open Graph tags, Twitter Card tags, and canonical
link — all URL fields gated on `NEXT_PUBLIC_SITE_URL`.

`src/app/p/[id]/page.tsx` also exports `generateMetadata()` (per-product
`<title>`, description, Open Graph, Twitter Card, canonical link — all gated on
`NEXT_PUBLIC_SITE_URL`). It intentionally does **not** emit `Product` /
`Offer` / `AggregateRating` JSON-LD yet: the product data behind it is still
the external DummyJSON placeholder feed, not a Sals3-owned catalog, and
shipping fabricated structured data risks a Google manual action. That piece
stays parked until a real catalog exists.

See
[`sals3-geo-aeo-seo-strategy-proposal`](docs/Wiki/wiki/sals3-geo-aeo-seo-strategy-proposal.md)
for the source strategy and what's still parked (Product/Offer/FAQPage JSON-LD,
`useOptimistic` cart) pending a real, Sals3-owned catalog and a cart route.

## Home Page

`src/app/page.tsx` renders the marketplace landing page: header (logo, search,
delivery region, cart/orders/account links), live category strip, an Embla promo
carousel, a portal-fed deals grid, and a paginated "For you" grid. Promo carousel
images live in `public/home-promos/` and slide metadata lives in
`src/lib/home-promo-slides.ts`. The carousel uses local, allow-listed static
assets, `next/image`, manual controls, dot buttons, and no autoplay. The category
strip, deals grid, and "For you" grid read live data through
`src/services/products.ts`. The category strip builds internal `/c/<slug>` links
from validated CJ category slugs. The deals grid fetches 5 CJ products ranked by
supplier listing count when available. The "For you" grid uses the `?page=`
query string for pagination and fetches 14 products per page, so the 14 products
plus 1 sponsored card fill 15 desktop grid cells. If the portal or CJ product
API is unavailable or returns invalid data, the page shows the local placeholder
products and categories from `src/lib/home-placeholder-data.ts` with a fallback
status note. The deals fetch and the "for you" fetch are independent: a
failure fetching one (e.g. a "for you" page past the real catalogue's depth)
falls back to placeholder data for that section only, and does not discard
the other section's already-successful, unrelated result.
A visually-hidden `<h1>` (`sr-only`) provides a correct heading hierarchy for
crawlers and screen readers without altering the visual design.
Product images are rendered with `next/image` and limited to the allow-listed
CJ image hosts from the portal feed. Money values follow the build spec's
minor-unit convention (`src/lib/money.ts`).

## Product Page (PDP)

`src/app/p/[id]/page.tsx` renders a product detail page at `/p/<slug>`. Every
product card on the home page (`src/components/home/ProductCard.tsx`) already
links here using the real backend's `slug` as the `[id]` route param — the
folder is still named `[id]` but the value it receives is a slug string, not
a numeric id. The route fetches the product through `fetchProductBySlug()`
and calls Next's `notFound()` — a real 404, not a soft redirect — when no
product matches. A storefront API failure (missing/invalid token, unreachable
`sals3-portal`) currently resolves to the same `notFound()`, since there's no
site-wide error boundary yet to tell "doesn't exist" apart from "couldn't be
reached" (see the pre-existing `error.tsx`/`not-found.tsx` gap noted below).

The page composes small, single-purpose components under
`src/components/product/`: `ProductGallery` (client component, thumbnail
click-to-swap when there's more than one image), `ProductPriceBox`, and
`RelatedProducts` (same-category products via `fetchProductsByCategory()`,
reusing the home page's `ProductGrid`/`ProductCard`).

**Rebuilt against the real `sals3-portal` schema (`StorefrontProductSchema`)
after PR #22 merged** — that schema only carries `id`, `slug`, `title`,
`priceMinor`, `oldPriceMinor`, a single `imageUrl`, `imageAlt`, `ratingLine`,
`shipLine`, and `category`. It has no `images[]` gallery, `reviews[]`,
`description`, `brand`, `stock`, `returnPolicy`, or `warrantyInformation` —
those existed only on the old DummyJSON shape. Rather than show fabricated
placeholder content for fields the real backend doesn't provide, this pass
**removed** the reviews section, the shipping/returns/warranty card, the
description paragraph, and stock-based Add to Cart/Buy Now disabling
entirely. Restore them once `sals3-portal` actually returns that data — do
not re-add with invented values in the meantime.

- **No in-stock/out-of-stock gating right now.** The real backend has no
  stock field at all, so Add to Cart/Buy Now are always enabled — this is a
  regression from the DummyJSON-backed build and from the "never sell an
  out-of-stock item" rule in the management bible; it must come back once
  `sals3-portal` exposes real inventory data.
- **No seller/verified-badge card.** Sals3 has no real seller data yet
  (Stage 7).
- **No colour/size variant selectors.** The real backend carries no variant
  data, so none is shown or invented.
- **No image zoom lightbox.** The gallery swaps the main image on thumbnail
  click; a full zoom modal was left out to keep the change small.

## Guest Header Strip and Auth Placeholders

`src/components/layout/GuestUtilityBar.tsx` renders a thin strip above the
main header row (Feedback, Sell on Sals3, Customer Care, Log In, Sign Up),
matching the signed-out state from a reference marketplace screenshot. Sals3
has no auth/session system yet, so this strip always renders — there is no
signed-in variant to switch to. Link targets reuse the existing footer stub
routes (`/sell`, `/contact`) from `src/lib/footer-data.ts` where they already
overlap, plus a new `/help`. "Track My Order" was deliberately left out: the
main header's existing `Orders` link already covers that, and Bogs flagged
the duplication during review.

`Log In` and `Sign Up` link to real routes, `/login` and `/signup`
(`src/app/login/page.tsx`, `src/app/signup/page.tsx`), which currently show a
plain-English "not ready yet" placeholder (`src/components/auth/AuthComingSoon.tsx`)
instead of a non-functional form — building a login form with no backend to
submit to would be misleading. Both pages set `robots: { index: false, follow: false }`
so an empty placeholder isn't indexed.

## Cart

`src/lib/cart.ts` holds pure, unit-tested cart logic (add/remove/set-quantity,
item count, subtotal) and a Zod schema that validates anything read back from
`localStorage` — that data is client-controlled and can be edited or
corrupted outside the app, so it is never trusted directly; a malformed or
tampered value falls back to an empty cart instead of crashing.

`src/components/cart/CartProvider.tsx` wraps the whole app (`src/app/layout.tsx`)
with a small `useSyncExternalStore`-backed store, exposing a `useCart()` hook
(`items`, `itemCount`, `subtotal`, `addItem`, `setQuantity`, `removeItem`).
The store starts empty (matching the server-rendered HTML) and hydrates from
`localStorage` in an effect after mount — this avoids a hydration mismatch
without calling a React state setter directly inside an effect body (the
`react-hooks/set-state-in-effect` lint rule).

On the product page, `Add to Cart` and `Buy Now`
(`src/components/product/ProductAddToCartButtons.tsx`) are now live — `Buy
Now` adds the item and navigates straight to `/cart`. The header's `Cart`
link shows a live item-count badge (`src/components/cart/CartCountBadge.tsx`)
once the cart has at least one item.

Adding an item shows a toast confirmation
(`src/components/cart/CartToast.tsx`, rendered once by `CartProvider` so any
future "add to cart" trigger gets it for free): `role="status"
aria-live="polite"` so screen readers announce it without interrupting,
auto-dismisses after 4 seconds, has a manual close button (44×44px tap
target) for anyone who needs more time, animates with `transform`/`opacity`
only (not layout-affecting properties), and defers to the
`prefers-reduced-motion` rule already in `globals.css`.

`/cart` (`src/app/cart/page.tsx`, `noindex`ed) lists line items with a
quantity stepper and remove button, and a subtotal summary. `Proceed to
Checkout` renders disabled with a plain-English note — `/checkout` doesn't
exist yet (build spec Stage 5). Cart state is local to the browser only
(`localStorage`, key `sals3-cart-v1`); there is no server-side cart, no
account sync, no shipping calculation, and no promo/discount codes beyond
each product's catalog price.

`test/setup.ts` installs a small in-memory `Storage` polyfill before every
test — jsdom's built-in `localStorage` was unreliable under the Node version
this repo runs on (Node's own experimental global `localStorage` can shadow
it), so tests don't depend on it.

**UI/UX pass:** the PDP and cart's first drafts were missing several items
from the `ui-ux-pro-max` checklist — fixed afterward rather than left as a
gap. All custom buttons now have `cursor-pointer` and a 150–300ms hover
transition (native `<button>` does not get `cursor: pointer` for free, only
`<a>` does), plus `active:scale-95`/`active:scale-[0.98]` press feedback
(`ui-ux-pro`'s state-coverage checklist: every interactive component needs a
distinct pressed state, not just hover). The cart's quantity stepper buttons
were `32×32px`, below the 44×44px minimum touch target; they're `44×44px`
now. Both `ui-ux-pro-max` and `ui-ux-pro` were run — their generic
`--design-system`/palette suggestions for this product type (a different
purple palette, alternate typography) were **not** applied: Sals3 already
has an approved brand palette and type system from earlier sessions
(`--color-brand-600`, Plus Jakarta Sans/Outfit), and swapping it for a
generic default would be a regression, not an improvement. Only the
palette-independent items (touch targets, hover/press/focus feedback,
contrast, motion, ARIA, layout) were applied.

A real layout bug turned up this way: the PDP's gallery/info grid only
switched to two columns at the `lg` (1024px) breakpoint, so at a common
tablet width (768px) the product photo alone rendered at ~703px tall,
pushing `Add to Cart` below the fold. Fixed by moving the breakpoint to `md`
(768px) on both the PDP and the cart page's line-items/summary grid, for the
same reason.

`frontend-design`'s guidance to take "one real aesthetic risk" and build a
distinctive visual identity was **not** applied wholesale — that mandate is
for a page that doesn't have an established identity yet. Sals3's PDP
deliberately follows familiar ecommerce conventions (Lazada/Shopee-style
layout) so customers already know how to use it; novelty on a purchase-path
page would work against usability, not for it. Its quality-floor items
(responsive down to mobile, visible keyboard focus, reduced motion) were
already satisfied.

One gap the audit surfaced but did **not** fix here, because it's a
site-wide pre-existing issue rather than a PDP-specific one: there is no
`error.tsx` or `not-found.tsx` anywhere in `src/app/`, so a failed API call
or bad route falls back to Next.js's default unstyled pages instead of a
branded one. Flagged as a separate task rather than folded in silently.

## README Rule

Update this README in the same task when any change adds or changes:

- user-facing features;
- setup or installation steps;
- package commands;
- environment variables;
- runtime behavior;
- scripts;
- testing workflow;
- project structure;
- important limitations or known issues.

## Deployment

Do not deploy, publish, push, or commit unless the owner explicitly asks.

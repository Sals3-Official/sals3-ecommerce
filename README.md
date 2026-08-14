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
├── src/components/          # UI components (auth, layout, catalog, ...)
├── src/lib/                 # Schemas, constants, and pure helpers
├── src/services/            # API service wrappers and tests
├── test/                    # Shared test setup/helpers
├── AGENTS.md                # Mandatory agent rules
├── package.json             # npm scripts and dependencies
└── package-lock.json        # npm lockfile
```

Do not put application code in `docs/`. Do not put vault notes in `src/`.

## API Services

The storefront service layer lives in `src/services/storefront/` and is
re-exported from `src/services/products.ts`, so every existing
`@/services/products` import keeps working:

- `schemas.ts` — the Zod contract for the list feed and the richer product
  detail.
- `client.ts` — URL building, the shared bearer token, one request helper, and
  the per-call-site cache policy.
- `products.ts` — `fetchProducts`, `fetchProductCategories`,
  `fetchProductBySlug`, `fetchProductsByCategory`.
- `mappers.ts` — payload → view model, including the image host allow-list it
  reads from `src/lib/cj-image-hosts.ts`.

**The upstream is now the Sals3 catalogue database, not a live supplier feed.**
`sals3-portal` used to answer these endpoints by calling CJdropshipping's
`/product/list` on every uncached request; as of 2026-08-13 it reads published
`products` / `product_offers` / `product_media_sources` rows and nothing else.
Two consequences here: prices are **USD** (ADR-003 phase 1), and the storefront
shows only what a seller has actually published in the Seller Center.

`currency` is the one **required** new field. Every other field added with the
richer contract is optional, so the portal can ship a field before this app
reads it — but a missing currency would render a number with the wrong symbol,
which is the only failure mode here that misrepresents money, so the parse
fails instead.

Bad rows are salvaged, not fatal. Real CJ `title`s and `imageAlt`s routinely
exceed 120/160 characters — confirmed live, this failed validation for an
entire 14-item page over one overlong row — so both are truncated to their
display length. The same idea applies one level up: a malformed variant, image,
spec, or description block is dropped without failing the product, and a
product does not fail the page.

`fetchProductBySlug()` calls `GET /api/storefront/products/<slug>` and returns
`undefined` **only** for a genuine absence (invalid slug shape, or a 404).
Everything else throws, which is what lets the PDP tell "no such product" from
"the catalogue is unreachable". That read is cached
(`next: { revalidate: 300, tags: [...] }`); the list feed deliberately stays
`no-store`, because the home page falls back to placeholder products and a
cacheable feed would let a token-less `next build` bake those placeholders into
static output.

`test/fixtures/storefront-product-detail.json` is the committed cross-repository
contract fixture: one maximal payload, parsed by
`src/services/storefront/schemas.test.ts`. `sals3-portal` commits the same file
and asserts its serializer produces it, so contract drift fails a test in
whichever repository moved.

The storefront API still has no category-filter route. `fetchProductsByCategory()`
(used by the PDP's related-products section) pages through `for-you` and `deals`
and matches by `category` client-side as a stopgap, hard-capped at 2 pages per
section (`MAX_CLIENT_SIDE_SEARCH_PAGES`). Replace it with a direct
category-filter endpoint once the portal adds one. It also de-duplicates by
product `id` first, because the same product can legitimately appear in both
sections and a duplicate `id` in the related grid throws React's
"Encountered two children with the same key".

Required `.env.local` values:

```text
SALS3_PORTAL_API_URL=http://localhost:3001
SALS3_STOREFRONT_API_TOKEN=<same value as sals3-portal>
```

## Checkout and Stripe

`/cart` now sends buyers to `/checkout`. Checkout reads the browser-local cart
for display, asks for contact and delivery address, then the server re-fetches
each product from the Sals3 Portal storefront API before creating a Stripe
Hosted Checkout Session. Browser cart prices are never trusted for payment.

Required Stripe values in `.env.local` or host secrets:

```text
NEXT_PUBLIC_SITE_URL=http://localhost:3000
STRIPE_SECRET_KEY=<test or restricted secret key>
STRIPE_WEBHOOK_SECRET=<Stripe webhook signing secret>
STRIPE_PAYMENT_METHOD_CONFIGURATION_ID=<pmc_... config for card + eligible bank debit>
```

Use a Stripe restricted key (`rk_...`) instead of `sk_...` when possible. Never
commit Stripe keys. The checkout integration uses dynamic payment methods and
passes `STRIPE_PAYMENT_METHOD_CONFIGURATION_ID`; it deliberately does not pass
`payment_method_types`. Cards work in the current USD flow. Bank debit appears
only when Stripe says the session currency, buyer details, account, and payment
method configuration are eligible. AU BECS requires an AUD cart; this app does
not convert USD to AUD.

`/checkout/success` verifies the Stripe Session server-side before showing the
payment status. `/api/stripe/webhook` verifies Stripe signatures and accepts
checkout completion, async-payment-failed, and expired events. This is still a
Stripe-only v1: no Sals3 order database, supplier fulfillment, refunds ledger,
or tax automation is created here.

## Authentication

Two ways in: Google, and email with a password. Both end at the same 24-hour
`httpOnly` `sals3_session` cookie, and nothing is gated behind being signed in
yet — guest browsing and the local cart are unaffected.

### Email and password

The password is checked **on the server**, not in the browser.
`POST /api/auth/login` verifies the same origin, throttles per address,
re-validates the credential with the very same Zod schema the form used
(`src/lib/auth/login-schema.ts`), checks the CSRF double submit, throttles per
account, then calls the Firebase Identity Toolkit
`accounts:signInWithPassword` REST endpoint. It verifies the returned ID token
and mints the session cookie.

Every credential failure — unknown address, wrong password, disabled account —
returns one byte-identical `401 {"error":"invalid_credentials"}`, so the form
cannot be used to discover which addresses have accounts. Response bodies carry
a fixed error code and never a sentence; the human copy lives client-side in
`src/lib/auth/login-status.ts`.

`POST /api/auth/signup` creates the account through `accounts:signUp`, records
the display name, and mints the same session cookie, so the form redirects
straight to the home page with the visitor already signed in.

**Email address verification is deliberately out of scope.** No verification
mail is sent, and sign-in does not inspect the `email_verified` claim. Two
consequences to know about:

- An address can be registered by someone who does not own it.
- Signup is the one place that does not mirror sign-in's generic posture. An
  address that is already registered returns
  `409 {"error":"email_unavailable"}` and the form says so. That discloses
  membership, and it is forced rather than chosen: success now means "you are
  signed in", which cannot be faked for an account somebody else owns. Sign-in
  stays indistinguishable, and the signup throttle caps the harvest rate.

Attempt throttling (`src/lib/auth/rate-limit.ts`) is **in-memory and
per-process**: per-IP and per-account buckets with lazy TTL eviction. On a
scale-out host the real ceiling is `instances × limit` and a cold start resets
it, so treat it as best-effort throttling rather than a rate-limit control.
Firebase's own `TOO_MANY_ATTEMPTS_TRY_LATER` is the durable backstop.

### Google

The browser
uses the Firebase Web SDK only long enough to complete the Google popup and get
a Firebase ID token. The token is posted to `POST /api/auth/session`, where
Firebase Admin verifies a recent sign-in and sets a 24-hour `httpOnly`
`sals3_session` cookie. Client Firebase persistence is `inMemoryPersistence`
and is cleared after the server cookie exchange. Signed-in header
personalization reads only the verified server session and exposes at most a
sanitized first name. The account menu signs out with the same CSRF-protected
cookie flow and clears only the server session. The top `Log In` and `Sign Up`
links render only after the verified server session reports signed out, and the
account shortcut is hidden unless that same session reports signed in.

Required Firebase values in `.env.local`:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=<Firebase Web App apiKey>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sals3-b82b6.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sals3-b82b6
NEXT_PUBLIC_FIREBASE_APP_ID=<Firebase Web App appId>
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/firebase-service-account.json
```

If a service account file path is not available, set these server-only secrets
instead:

```text
FIREBASE_PROJECT_ID=sals3-b82b6
FIREBASE_CLIENT_EMAIL=<service account client_email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Optional, and only relevant to email/password:

```text
FIREBASE_WEB_API_KEY=<Web API key restricted by API, not by referrer>
```

The server-side Identity Toolkit calls fall back to
`NEXT_PUBLIC_FIREBASE_API_KEY` when this is unset, which is fine locally. Set
it in production **if the browser key is restricted by HTTP referrer**:
server-to-server calls send no `Referer`, so a referrer-restricted key returns
403 — and it will work locally while failing in production. Point this at a
second key with an API restriction (Identity Toolkit) instead. A Web API key is
not a secret either way; it is already in the client bundle.

Firebase Console setup for `sals3-b82b6`, none of which is code:

1. Authentication > Sign-in method > enable **Google**.
2. Authentication > Sign-in method > enable **Email/Password**. Until this is
   on, both routes return the generic outage notice and the server logs
   `[auth] identity toolkit unavailable { code: 'PASSWORD_LOGIN_DISABLED' }`.
3. Register a Web App if needed, and add authorized domains such as `localhost`
   and the production host without protocol or port.

Firebase's **Email enumeration protection** setting no longer changes what a
visitor sees — sign-in collapses every credential failure itself, and signup
discloses a taken address by design — but leave it on regardless.

Do not commit service account JSON files or `.env.local`.

`firebase-admin` is pinned to `13.6.0` because `14.2.0` pulled a
`jwks-rsa`/`jose` combination that crashed the Vercel Node runtime while
loading `firebase-admin/auth`.

## Klaviyo Analytics

Sals3 loads Klaviyo only after the visitor accepts the analytics consent banner.
The decision is stored in `localStorage` under `sals3_klaviyo_consent_v1`.
Declining keeps the Klaviyo script unloaded and makes every local tracking
helper no-op.

Required Klaviyo values:

```text
NEXT_PUBLIC_KLAVIYO_SITE_ID=RuXpVU
KLAVIYO_PRIVATE_API_KEY=<server-only private key with profiles:write>
KLAVIYO_API_REVISION=2026-07-15
```

`NEXT_PUBLIC_KLAVIYO_SITE_ID` is the safe public Site ID used by
`src/components/klaviyo/KlaviyoLoader.tsx`. `KLAVIYO_PRIVATE_API_KEY` must stay
server-only; it is used only by `POST /api/klaviyo/profile-sync` to create or
update a Klaviyo profile after the visitor is signed in and has accepted
analytics.

Tracked v1 events are limited to behavior the app really supports today:
`Viewed Product`, Klaviyo's recently viewed item payload, `Added to Cart`,
`Buy Now Clicked`, `Cart Viewed`, `Cart Quantity Changed`, and
`Cart Item Removed`. Purchase, paid order, fulfilled, canceled, and refunded
events are intentionally deferred because Sals3 order persistence and payment
reconciliation do not exist yet.

Profile enrichment sends verified Firebase profile fields when available
(email, phone, display-name-derived first/last name, photo URL, Firebase UID as
a Sals3 custom property, provider IDs, email-verified state, and account
timestamps) plus bounded browser context (locale, timezone, viewport/screen
size, current path, referrer, UTM values, analytics-consent timestamp).
Passwords, session cookies, CSRF tokens, private keys, payment data, hidden
fingerprinting, precise geolocation, and raw IP collection are not sent.

Analytics consent is not email or SMS marketing subscription consent. This
integration does not add profiles to lists and does not subscribe anybody to
campaigns.

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

## PWA Icons and "Add to Home Screen"

`src/app/apple-icon.png` (180×180) is Next.js's App Router file convention for
the iOS `apple-touch-icon` — no manual `<link>` tag needed, Next.js emits it
automatically. `src/app/manifest.ts` (the equivalent `MetadataRoute.Manifest`
convention) does the same for Android/Chrome's installable-PWA icon and emits
the `<link rel="manifest">` tag; its `icons` array points at
`public/icon-192.png` and `public/icon-512.png` (Chrome's minimum sizes for an
installable icon). All three PNGs are generated from the same source Sals3
logo mark, resized, not separately designed — keep them in sync if the logo
changes. `theme_color`/`background_color` in the manifest reuse the approved
brand tokens (`--color-brand-600` `#0a5c8a`, `--color-surface` `#f6f7f8`).

## Home Page

`src/app/page.tsx` renders the marketplace landing page: header (logo, search,
delivery region, cart/orders/account links), a full-bleed category band, an
Embla promo carousel, a portal-fed deals grid, and a paginated "For you" grid.
Promo carousel images live in `public/home-promos/` and slide metadata lives
in `src/lib/home-promo-slides.ts`. The carousel uses local, allow-listed static
assets, `next/image`, manual controls, dot buttons, and no autoplay. Those
slides are served at their committed size — see [Image loading](#image-loading)
— and the seven PNGs total 8.15 MB; re-encoding them to WebP (measured: 569 KB)
is deferred by owner decision, not an oversight.

The category band (`src/components/home/CategoryRow.tsx`) sits directly under
`SiteHeader`, outside `<main>`, so its white `border-y` band spans the full
viewport instead of the 1152px content column. It is fully server-rendered —
no client component, no scroll-chevron mechanics. Below the `md` breakpoint it
is a native horizontal touch-scroll row (`no-scrollbar` hides the browser
scrollbar); at `md` and up it becomes an equal-width grid
(`md:grid md:auto-cols-fr md:grid-flow-col`) that never overflows, so there is
nothing to scroll and no chevrons. Each tile (`CategoryRowItem.tsx`) is a 56px
`rounded-2xl` icon holder plus a 2-line-wrapping label — deliberately neutral
grey (`bg-surface-sunken`/`text-ink-muted`), not the brand colour, per the
build spec's "brand colour for actions only" rule; navigation is not an
action. Icon geometry is hand-authored inline SVG keyed by category id
(`src/components/home/category-icons.tsx`) — no icon library, since the real
storefront feed has no icon field. A category id with no mapped icon falls
back to the feed's real 2-letter `code`. `CategoryRowSkeleton.tsx` matches the
tile geometry exactly and is wired as a `<Suspense>` fallback around the
category row; it is structural rather than a real defer today, since
`homeCategories` resolves in the same `Promise.all` as the rest of the page's
data, same as every section here — a genuinely streamed category fetch would
need a page-wide rendering change beyond this component's scope, and this
repo's `page.test.tsx` (`renderWithCart(await Home())`, a plain client render
of an already-resolved tree) cannot execute a nested async Server Component to
test it if it were.

The category band, deals grid, and "For you" grid read live data through
`src/services/products.ts`. The category band builds internal `/c/<slug>`
links from validated CJ category slugs. The deals grid fetches 5 CJ products
ranked by supplier listing count when available. The "For you" grid uses the `?page=`
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
CJ image hosts from the portal feed (see [Image loading](#image-loading)).
Money values follow the build spec's minor-unit convention
(`src/lib/money.ts`).

## Image loading

Nothing in this app goes through Vercel's `/_next/image` optimizer. `next.config.ts`
sets `images.loader: 'custom'` with `src/lib/images/cj-image-loader.ts`.

Why: the optimizer is metered, and once the account's Image Optimization
allowance ran out it answered every request with `402
OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED` — including `?url=%2Fsals3-logo.webp`,
a file this app serves itself — so every image in production broke at once
(2026-08-14). The portal hit the same failure a day earlier and fixed it the
same way.

The loader asks CJ's own CDN to do the resizing, which it does for free. For an
allow-listed CJ address it sets an Alibaba-OSS instruction,
`?x-oss-process=image/resize,w_<width>/format,webp/quality,q_<quality>`; the
requested `width` is the one `next/image` derived from the component's `sizes`,
so the whole responsive `srcSet` survives — the gallery's 80px thumbnails fetch
80px WebP files. Measured on a real product photo: 491,243 bytes original,
30,006 at `w_640`, 2,156 at `w_128`.

Any other address — a local `/public` path, any non-CJ host, plain `http:` — is
returned untouched. The loader never proxies and never invents a host, so it
cannot become an open image proxy. Local assets are therefore served at their
committed size; `public/home-promos/*.png` is 8.15 MB in total and is a known
outstanding item.

The allow-list itself lives in `src/lib/cj-image-hosts.ts`, a dependency-free
module because the loader is serialized into the client bundle. `next.config.ts`
`remotePatterns` and `getAllowedProductImageUrl` in
`src/services/storefront/mappers.ts` must stay in step with it; the enforcing
gate is the mapper, which drops an off-list address before a component sees it.

## Product Page (PDP)

`src/app/p/[id]/page.tsx` renders a product detail page at `/p/<slug>`. Every
product card links here using the backend's `slug` as the `[id]` route param —
the folder is still named `[id]`, but the value it receives is a slug.

**A 404 and an outage are now different pages.** `/p/[id]/not-found.tsx` is the
real "we couldn't find that product" page (still HTTP 404), and
`/p/[id]/error.tsx` is what an unreachable catalogue produces. Before this, every
failure became `notFound()`, so a portal outage looked like a deleted product —
a buyer would stop looking for something still for sale, and nobody would learn
the storefront was down. The error page renders nothing from the error itself:
no `message`, no `digest`.

The product is read once per request via React `cache()`, shared by
`generateMetadata` and the page. They used to fetch independently, and
`cache: 'no-store'` defeats Next's own fetch memoisation, so every PDP made two
identical upstream calls.

Composed from small single-purpose components under `src/components/product/`:

| Component                         | Renders                                                                                                  |
| --------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `ProductGallery` (client)         | Every approved photo, lead image first, with per-image alt text; thumbnails appear from the second image |
| `ProductPriceBox` (server)        | Price and purchase for a product with **no** option axes                                                 |
| `ProductPurchasePanel` (client)   | Price, variant selector, stock, and purchase for a product with **several** variants                     |
| `ProductVariantSelector` (client) | One `radiogroup` per axis; unavailable values stay visible and `aria-disabled`                           |
| `ProductAvailabilityNotice`       | Stock as an evidence statement — never a count                                                           |
| `ProductDescription`              | The seller-authored allow-listed blocks                                                                  |
| `ProductSpecsTable`               | Physical and identifier facts, labelled supplier-reported                                                |
| `ProductShippingCard`             | That shipping is quoted at checkout, because no estimate exists                                          |
| `RelatedProducts`                 | Same-category products, reusing the home grid                                                            |
| `ProductSchema`                   | `Product`/`Offer` JSON-LD                                                                                |

`ProductPurchasePanel` mounts **only** when there is a real choice to make, so a
catalogue with no variants ships no extra client JavaScript.

### Every section is absent, not empty, when the data is

The portal omits a field rather than defaulting it, and the PDP renders a
section only when it has something real to put in it. No "N/A", no "—", no
reserved boxes. What that means in practice today:

- **No rating anywhere.** Sals3 has no buyer reviews, and CJ's
  supplier-platform review counts are not Sals3 ratings. The deprecated
  `ratingLine` is optional and carries a non-claim; nothing renders a star.
- **No delivery estimate.** Freight is destination-specific and quoted at
  checkout (ADR-003).
- **No was/now price.** `oldPrice` is absent unless the portal sends a genuinely
  higher, evidence-backed comparison price. It never has.
- **Description and variants render nothing yet**, because no published product
  carries them: a CJ-sourced draft starts from an honestly empty description
  document, and variants exist only after the portal captures supplier evidence.
- **Stock gating is fail-open.** `UNKNOWN` is the common availability state and
  purchase stays enabled for it — failing closed would take the whole catalogue
  offline over evidence nobody refreshed. Purchase **is** blocked for an
  explicit `UNAVAILABLE` variant and while a selection is incomplete, each with
  a visible, announced reason rather than a silently grey button.
- **No image zoom lightbox and no seller card.**

### Product JSON-LD

`src/components/schema/ProductSchema.tsx` emits only fields the portal actually
sent, and escapes `<` because the payload contains supplier-originated text.
Deliberately omitted: `aggregateRating`/`review` (no buyer reviews),
`offers.availability` when availability is `UNKNOWN`, `weight` (the supplier
reports a range, not a number), `shippingDetails`,
`hasMerchantReturnPolicy`, and `priceValidUntil`. Fabricated structured data can
cost the whole domain its rich results.

## Cart Storage Format

`src/lib/cart.ts` stores the cart in `localStorage` under **`sals3-cart-v2`**.
Two format changes landed together: the currency moved from PHP to USD, and a
line's identity became variant-aware (`cartLineId(productId, variantId)`), so
two variants of one product are two lines instead of silently merging.

A `sals3-cart-v1` blob is **discarded, not converted** — converting a saved
price invents a price that was never quoted to that buyer — and the stale key is
removed on first hydrate rather than left holding purchase intent nothing reads.
Nothing is lost: `/checkout` does not exist and no order has ever been placed.

## Stage-2 catalogue groundwork (not wired to the live app)

`src/lib/compileProductTitle.ts` and `src/components/catalog/ProductCard.tsx`
(+ `ProductCardImage.tsx`) are a deliberately decoupled, independently tested
unit for a future structured product entity — Brand/Material/Fit/spec
attributes — per the build spec's Stage 2 (data model/entities). The live
storefront schema (`StorefrontProductSchema` in `src/services/products.ts`)
has none of those fields yet, only one pre-formatted CJ `title` string, so
this code has no real data to consume today. Do not route real traffic to
`src/components/catalog/ProductCard.tsx` or import it from a live route
before that structured entity actually exists — it lives in its own
`catalog/` directory, separate from the live `src/components/home/ProductCard.tsx`,
specifically so it isn't mistaken for the shipped card.

## Guest Header Strip and Auth Entry Points

`src/components/layout/GuestUtilityBar.tsx` renders a thin strip above the
main header row (Feedback, Sell on Sals3, Customer Care, Log In, Sign Up),
matching the signed-out state from a reference marketplace screenshot. Sals3
now verifies the server session before showing auth-specific header actions:
signed-out visitors see `Log In` and `Sign Up`, while signed-in visitors see
only the first-name account dropdown in the main header. Link targets reuse the
existing footer stub routes (`/sell`, `/contact`) from `src/lib/footer-data.ts`
where they already overlap, plus a new `/help`. "Track My Order" was
deliberately left out: the main header's existing `Orders` link already covers
that, and Bogs flagged the duplication during review.

`Log In` and `Sign Up` link to real routes, `/login` and `/signup`
(`src/app/login/page.tsx`, `src/app/signup/page.tsx`). Both are built, working
credential screens on the same split-hero layout (see
[Login and Signup Screens](#login-and-signup-screens)), and both set
`robots: { index: false, follow: false }`.

## Login and Signup Screens

`/login` implements the approved Claude Design source `Sals3 Login.dc.html`: a
full-bleed 50/50 split with the brand photo and value proposition on the left
and the sign-in card on the right. The site header and footer are deliberately
absent — the route is a single-task surface and the hero's circular back
control is the way out.

`/signup` reuses that layout unchanged. The two screens cross-link to each
other, so giving them different chrome would throw a visitor between two
layouts mid-task.

### How to see it

```bash
npm run dev
```

Then open <http://localhost:3000/login> or
<http://localhost:3000/signup>. Below the `lg` breakpoint the split stacks: the
hero becomes a band above the form.

### Files

| File                                         | Role                                                       |
| -------------------------------------------- | ---------------------------------------------------------- |
| `src/app/login/page.tsx`                     | Sign-in route composition and `noindex` metadata           |
| `src/app/signup/page.tsx`                    | Registration route composition and `noindex` metadata      |
| `src/components/auth/AuthHeroPanel.tsx`      | Left panel: photo, scrims, back control, value proposition |
| `src/components/auth/LoginCard.tsx`          | Right panel for sign-in (Server Component)                 |
| `src/components/auth/SignupCard.tsx`         | Right panel for registration (Server Component)            |
| `src/components/auth/LoginForm.tsx`          | Client sign-in form: state machine, validation, submit     |
| `src/components/auth/LoginFormActions.tsx`   | Announcer, alert region, and both sign-in buttons          |
| `src/components/auth/SignupForm.tsx`         | Client registration form                                   |
| `src/components/auth/SignupFields.tsx`       | The four registration inputs, in focus order               |
| `src/components/auth/FormAlert.tsx`          | Always-mounted `role="alert"` for form-level failures      |
| `src/components/auth/StatusAnnouncer.tsx`    | Screen-reader-only progress ticker                         |
| `src/components/auth/SubmitButton.tsx`       | Primary submit with the `aria-disabled` pending contract   |
| `src/components/icons/StatusIcon.tsx`        | Alert, envelope, and spinner glyphs                        |
| `src/components/auth/GoogleSignInButton.tsx` | Divider plus the whole Google popup flow                   |
| `src/components/auth/NameField.tsx`          | Full-name input                                            |
| `src/components/auth/EmailField.tsx`         | Email input                                                |
| `src/components/auth/PasswordField.tsx`      | Password input; `purpose` selects sign-in/sign-up/confirm  |
| `src/components/auth/AuthField.tsx`          | Shared label + control + error layout                      |
| `src/components/auth/auth-field-styles.ts`   | Shared control class strings                               |
| `src/lib/auth/login-schema.ts`               | Zod credential schema, shared by the form and the server   |
| `src/lib/auth/signup-schema.ts`              | Registration schema built on the credential schema         |
| `src/lib/auth/password-login.ts`             | Browser side of sign-in                                    |
| `src/lib/auth/password-signup.ts`            | Browser side of registration                               |
| `src/lib/auth/login-status.ts`               | Every sentence shown for a server outcome                  |
| `src/lib/auth/identity-toolkit.ts`           | Server-only Firebase Identity Toolkit REST client          |
| `src/lib/auth/rate-limit.ts`                 | Per-IP and per-account attempt buckets                     |
| `src/lib/auth/auth-request-guards.ts`        | Shared origin, throttle, parse, schema, and CSRF preamble  |
| `src/lib/auth/auth-error-codes.ts`           | The auth wire contract (safe on both sides)                |
| `src/lib/auth/auth-links.ts`                 | Every href the screens point at                            |

Auth palette tokens and the two hero gradient overlays live in
`src/app/globals.css`. The screens' typeface is Instrument Sans, registered in
`src/app/layout.tsx` with `preload: false` so no other route pays for the font
file, and applied through the `font-auth` utility.

`test/client-bundle-boundary.test.ts` walks the import graph from every client
entry point and fails on a `node:` builtin or a `server-only` marker. It exists
because that mistake is invisible: typecheck, unit tests, and the build all
pass while the page silently stops hydrating.

### Required setup

The Firebase Console steps under [Authentication](#authentication). No
environment variable is required beyond the ones already listed, and no package
was added for this feature.

### Security posture

- The form has no `action` and its submit handler always calls
  `preventDefault()`. Without that, the browser's default GET submit would put
  the password in the URL query string, the address bar, and every log
  downstream. `e2e/login.spec.ts` asserts the URL stays clean after submit.
- The password lives only in React state — never web storage, never a log,
  never a URL. It is cleared the moment it can no longer be used, and kept
  after a failure so a one-character typo does not force a full retype.
- Validation uses one Zod schema (`src/lib/auth/login-schema.ts`) on both
  sides. The server re-validates with it, so the `MAX_PASSWORD_LENGTH` bound is
  enforced before anything reaches a hasher, and the client check is UX only.
- CSRF is a double submit through the existing `GET /api/auth/csrf`, compared
  with `timingSafeEqual` after an explicit length guard. Every cookie-setting
  route also refuses a cross-origin `Origin`.
- Nothing logs the address, the password, the ID token, or a response body. The
  only server log on the auth path is
  `console.error('[auth] identity toolkit unavailable', { code })` — the code
  string alone. A distinctive sentinel password is asserted absent from the
  response body, every response header, the request URL, web storage, and all
  five `console` levels, across every failure path.
- `next.config.ts` sends `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, and `Permissions-Policy` on document routes, plus
  `Cache-Control: no-store` on `/login` and `/signup`. API responses get
  `no-store` from `noStoreJson`.
- A pending button is marked `aria-disabled`, never `disabled`. Setting the
  real attribute on a focused button blurs it, dropping a keyboard visitor to
  the document body mid-request; a handler guard prevents the double submit
  instead.

### Known limitations

- **No address verification.** Nothing proves a buyer can receive mail at the
  address on their account. This will matter for order confirmations and for
  password reset.
- **`/login/reset` (Forgot password) does not exist.** Real password accounts
  exist, so a buyer who forgets a password has no in-app recovery — and with no
  email step anywhere in signup, a mistyped address is never caught. The
  `sendOobCode` helper in `src/lib/auth/identity-toolkit.ts` is kept, unused,
  for exactly this; it is the recommended next piece of work.
- Attempt throttling is per-process and resets on a cold start (see
  [Authentication](#authentication)).
- Playwright stubs the Sals3 auth routes at the network layer, so `e2e/` covers
  the client half only — form, request, state, redirect. The server guards
  (CSRF, origin, throttling, enumeration parity) are proved by the route unit
  tests, not end to end.
- `/help/pricing`, `/legal/terms`, and `/legal/privacy` are not built yet;
  these are the same stub hrefs the footer already ships.
- The header rule in `next.config.ts` excludes `/_next/`. With a broader
  `/:path*` matcher, `next dev` (16.3.0) answered its own chunk requests with
  403 and the HMR websocket handshake failed, silently leaving every client
  component unhydrated. Verified by removing and re-adding the rule against
  `e2e/login.spec.ts`.
- `next dev` overrides the configured `Cache-Control`, so the production value
  is asserted in `test/next-config-headers.test.ts` rather than end-to-end.
- `public/login-hero.jpg` (2200×1228, 327 KB) is a resized, recompressed copy of
  the supplied `public/login-bg.jpeg` (2752×1536, 2.1 MB), which is no longer
  referenced by any code and can be deleted.

### Verification

```bash
npm run verify
npm audit --audit-level=high
```

Login-specific tests: `src/lib/auth/login-schema.test.ts`,
`src/components/auth/LoginForm.test.tsx`, `src/app/login/page.test.tsx`,
`test/next-config-headers.test.ts`, and `e2e/login.spec.ts`.

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

Another real layout bug, this time on narrow mobile widths: `CartLineItemRow`
(`src/components/cart/CartLineItemRow.tsx`) laid out the title/stepper column
as a plain `flex-1` flex child. Flexbox defaults a flex item's `min-width` to
`auto`, so the column refused to shrink below its content's intrinsic width
(the quantity stepper + Remove button row) and pushed the price column off
the right edge of the viewport on small phones. Fixed with `min-w-0` on that
column and `flex-wrap` on the stepper row so the buttons wrap instead of
forcing width. Verified via live `getBoundingClientRect()` measurement at both
375px and 320px viewport widths — no horizontal overflow at either.

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

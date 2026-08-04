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

Product API calls live in `src/services/products.ts`. `fetchProducts()` reads from
`https://dummyjson.com/products`, sends validated `limit` and `skip` pagination
parameters, validates external JSON with Zod, and maps API products into home
page cards. `fetchProductsByOffset()` supports bounded offset reads for
homepage deal slots. `fetchProductCategories()` reads
`https://dummyjson.com/products/categories`, validates category `slug` and
`name`, and maps categories into internal `/c/<slug>` navigation links. Invalid
`page`, `limit`, and `skip` input falls back to safe defaults.

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

## Home Page

`src/app/page.tsx` renders the marketplace landing page: header (logo, search,
delivery region, cart/orders/account links), live category strip, an Embla promo
carousel, a random deals grid, and a paginated "For you" grid. Promo carousel
images live in `public/home-promos/` and slide metadata lives in
`src/lib/home-promo-slides.ts`. The carousel uses local, allow-listed static
assets, `next/image`, manual controls, dot buttons, and no autoplay. The category
strip, deals grid, and "For you" grid read live data through
`src/services/products.ts`. The category strip ignores remote category URLs and
builds internal `/c/<slug>` links from validated slugs. The deals grid chooses a
safe random `skip` value server-side and fetches 5 products. The "For you" grid
uses the `?page=` query string for pagination and fetches 14 products per page,
so the 14 products plus 1 sponsored card fill 15 desktop grid cells. If the
external product API is unavailable or returns invalid data, the page shows the
local placeholder products and categories from `src/lib/home-placeholder-data.ts`
with a fallback status note.
Product images are rendered with `next/image` and limited to the allow-listed
`cdn.dummyjson.com/product-images/**` host path. Money values follow the build
spec's minor-unit convention (`src/lib/money.ts`).

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

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

Product API calls live in `src/services/products.ts`. The current service prepares `fetchProducts()` for `https://dummyjson.com/products`, validates the external JSON with Zod, and keeps tests beside the service.

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
delivery region, cart/orders/account links), category strip, a dismissible
promo banner, a deals grid, and a "For you" grid with a client-side "Load
more". Catalog content comes from `src/lib/home-placeholder-data.ts` — the
home page is not wired to `src/services/products.ts` yet (build spec stage 3
catalogue read path), so product data is static placeholder content and
product photos are decorative gradient tiles, not real images. Money values
follow the build spec's minor-unit convention (`src/lib/money.ts`).

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

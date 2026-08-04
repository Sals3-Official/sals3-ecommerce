---
tags: [session-note, implementation, landing-page, products-api, carousel, sals3]
aliases: [2026-08-05 Landing Page API and Carousel Session]
created: 2026-08-05
updated: 2026-08-05
status: implemented
authority: historical-session
owner_approved: true
related:
  - "[[../Wiki/wiki/hot]]"
  - "[[../Wiki/wiki/sals3-skills]]"
  - "[[../Wiki/wiki/sals3-implementation-phases]]"
  - "[[../Wiki/wiki/nextjs-component-security-code-rules]]"
  - "[[../Wiki/wiki/project-structure-installation-and-runbook]]"
---

# 2026-08-05 — Landing Page API and Carousel Session

## Scope

AJ asked for the landing page to use DummyJSON product services, random deal products, live categories, paginated "For you" products, and a carousel replacing the old free-shipping banner.

## Implemented

- `src/services/products.ts` now wraps DummyJSON products and categories with Zod validation, bounded pagination, safe offset calculation, product mapping, and category slug validation.
- Landing page now fetches live categories, random deals, and paginated "For you" products server-side.
- Old load-more behavior was removed. `ProductPagination` now uses `?page=` links.
- "For you" fetches 14 products per page so 14 products plus 1 sponsored card fill 15 desktop grid cells.
- Old free-shipping promo banner was removed.
- `embla-carousel-react@8.6.0` was installed and used for the home promo carousel.
- Seven promo images were copied from local Downloads into `public/home-promos/` with safe filenames.
- Promo carousel uses local static assets, `next/image`, manual previous/next buttons, dot navigation, 44px-plus touch targets, stable aspect ratio, and no autoplay.
- README was updated for product API behavior, carousel assets, package workflow, and verification expectations.

## Security and Architecture Notes

- DummyJSON responses are external input and are validated with Zod before use.
- Category navigation ignores remote category URLs and builds internal `/c/<slug>` links from validated slugs.
- Product images are limited to `https://cdn.dummyjson.com/product-images/**` in `next.config.ts`.
- Carousel uses only local static image paths and static internal promo links from `src/lib/home-promo-slides.ts`.
- No secrets, private environment variables, server actions, route handlers, auth changes, database writes, or payment logic were added.
- New client-side JavaScript is limited to the carousel component because Embla requires a client component.

## Verification

Final verified checks passed:

- `npm run lint`
- `npm run format:check`
- `npm run typecheck:clean`
- `npm run build`
- `npm run test:run` — 2 test files, 15 tests passed
- `npm run test:e2e` — desktop and mobile home-page tests passed
- `npm audit --audit-level=high` — 0 vulnerabilities

Known benign test warning: Playwright reports `NO_COLOR` ignored because `FORCE_COLOR` is set.

## Lessons Added

Reusable lessons from this session were added to [[../Wiki/wiki/sals3-skills]]:

1. Treat `next/image` quality values as a configured allow-list in Next.js 16.
2. Clean and ignore `.next-typecheck-tmp-*` directories because interrupted typecheck-clean runs can leave generated output behind.
3. Verify prompt-provided image assets as local files before wiring them into a site.
4. For ecommerce promo carousels, prefer manual controls, stable aspect ratios, image-load E2E checks, and no autoplay by default.

## Current Risk

This is verified landing-page prototype work and support infrastructure. The code was later committed on branch `feat/api-call-home-page` in `18f65bc` and the vault update was committed in `6b96142`. It is not the full Sals3 catalogue, checkout, seller tools, payment, payout, tax, legal, or launch-ready marketplace path.

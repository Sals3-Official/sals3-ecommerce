---
tags: [session, sals3, storefront, frontend, catalogue]
aliases: [Product Detail Page Session, PDP Session]
created: 2026-08-05
updated: 2026-08-05
status: current-state
authority: session-record
owner_approved: false
related:
  - '[[hot]]'
  - '[[sals3-skills]]'
  - '[[nextjs-component-security-code-rules]]'
  - '[[agent-operating-contract]]'
  - '[[sals3-ux-build-specification]]'
  - '[[parked-ideas-backlog]]'
---

# Session 2026-08-05 Part 05 — Product Detail Page (`/p/[id]`)

> [!NOTE] Branch status
> Code exists locally, verified, **not committed or pushed** — the owner had not asked for that yet as of this session.

## What happened

Bogs asked for cart, orders, my-account, and a product display page that
opens when a home-page item is clicked, referencing the "Sals3 Marketplace"
Claude Design prototype (`claude.ai/design/p/bbfb99d1-616f-4c5c-ae85-e1f61f91756e`,
file `Sals3 Marketplace.dc.html`, pulled via `DesignSync` the same way as
[[sals3-session-2026-08-05-part01-marketplace-landing-page]]).

Before writing code, the request was checked against [[hot]] and
[[agent-operating-contract]]: cart, orders, and account are each a "new
top-level navigation area" (contract section 4, full challenge review), they
map to build-spec Stages 5/6 which haven't started, and no auth/session
system exists anywhere in this codebase — so "my account" and a
guest-vs-logged-in header could only be a static placeholder, not a real
check. Rather than build all four at once (against the
component-by-component rule — [[hot]] "Coding practice", [[agent-operating-contract]]),
Bogs was asked to pick a build order. Answer: product page first, static
"not logged in" placeholder for account/guest state, and confirm the design
tool access before continuing (it turned out to already work — `DesignSync`
`get_project`/`list_files`/`get_file` could read the shared project by ID
even though it's type `PROJECT_TYPE_PROJECT`, not `PROJECT_TYPE_DESIGN_SYSTEM`).
Cart, orders, and account UI are intentionally **not** built in this session
— see [[parked-ideas-backlog]] candidates below.

## What shipped

`src/app/p/[id]/page.tsx` — a Server Component route at `/p/<id>`. Validates
`id` as a positive integer, fetches the product through the extended
`src/services/products.ts`, and calls `notFound()` (a real HTTP 404, checked
live) for both an invalid id and a missing product. `generateMetadata()`
covers title/description/Open Graph/Twitter/canonical, gated on
`NEXT_PUBLIC_SITE_URL` the same way the home page already does.

New service functions: `fetchProductById()` (undefined on both invalid-id
and real-404, so the route has one code path instead of two),
`fetchProductsByCategory()` (feeds the related-products section), and
`toProductDetail()` (maps a validated DummyJSON product into a PDP-ready
shape — `src/lib/product-detail.ts` holds the type and two pure helpers,
`starsLine()` and `formatReviewDate()`).

New components under `src/components/product/`, each single-purpose:
`ProductGallery` (the only client component — thumbnail click-to-swap),
`ProductPriceBox`, `ProductFulfillmentCard`, `ProductReviews`,
`RelatedProducts` (reuses the home page's `ProductGrid`/`ProductCard`).

## Deliberate gaps — reported, not hidden

- **Add to Cart / Buy Now render disabled**, with a plain-language note
  ("The cart is not built yet. These buttons do not work.") instead of a
  dead click. `/cart` doesn't exist yet (Stage 5).
- **No seller/verified-badge card**, unlike the Lazada-style reference
  screenshot and the design prototype. DummyJSON has no marketplace-seller
  entity and Sals3 has no real seller data (Stage 7) — inventing one would
  violate the anti-fabrication rule the footer session already established.
- **No colour/size variant selectors** — DummyJSON has no variant data.
- **No image zoom lightbox** — the design prototype has one; this pass keeps
  the gallery to a simple thumbnail swap to stay a small, reviewable unit.
- **No `Product`/`Offer`/`AggregateRating` JSON-LD.** [[parked-ideas-backlog]]'s
  unblock condition needs both a PDP route *and* real/Sals3-owned data — this
  PDP exists now, but the data is still the external DummyJSON placeholder
  feed, so the JSON-LD half stays parked. Update that backlog entry once a
  real catalog lands.
- **Still no guest-header placeholder** (the red-boxed Lazada utility strip
  Bogs attached) — out of scope for this session by Bogs's own build-order
  answer; candidate for the next session.

## Verification

`npm run lint`, `format:check`, `tsc --noEmit`, `build` (registers `ƒ /p/[id]`
as a dynamic route), `test:run` (37 tests, up from 15 — new coverage in
`src/services/products.test.ts`, `src/lib/product-detail.test.ts`,
`src/app/p/[id]/page.test.tsx`), `test:e2e` (4 passed, including a new
`e2e/product.spec.ts` covering the click-through from the home page and the
404 case), `npm audit --audit-level=high` (0 vulnerabilities, no new
packages). Also checked live in the browser dev server: `/p/1` renders real
DummyJSON title/price/reviews/related products, `/p/999999999` returns a
real 404.

## Files changed

`src/services/products.ts`, `src/services/products.test.ts`,
`src/lib/product-detail.ts` (new), `src/lib/product-detail.test.ts` (new),
`src/app/p/[id]/page.tsx` (new), `src/app/p/[id]/page.test.tsx` (new),
`e2e/product.spec.ts` (new), 5 new files under `src/components/product/`,
`README.md`, `.claude/launch.json` (new — dev-server preview config, not
application code).

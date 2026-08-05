---
tags: [session, sals3, storefront, frontend, cart]
aliases: [Cart Session]
created: 2026-08-05
updated: 2026-08-05
status: current-state
authority: session-record
owner_approved: false
related:
  - '[[hot]]'
  - '[[sals3-skills]]'
  - '[[sals3-session-2026-08-05-part06-guest-header-strip]]'
  - '[[agent-operating-contract]]'
  - '[[sals3-ux-build-specification]]'
---

# Session 2026-08-05 Part 07 — Cart

> [!NOTE] Branch status
> Code exists locally, verified, **not committed or pushed**.

## What happened

Third item in the build order Bogs picked in
[[sals3-session-2026-08-05-part05-product-detail-page]]: cart. No data
model/entities exist (build spec Stage 2) and no auth/session system exists,
so a server-backed cart wasn't an option yet — this ships a client-only cart
(`localStorage`, key `sals3-cart-v1`) shared across the app via a small
`useSyncExternalStore`-backed store (`src/components/cart/CartProvider.tsx`),
not a database or account-linked one. That is a real scope limitation, not a
hidden shortcut — flagged in `README.md`'s new Cart section.

`Add to Cart` and `Buy Now` on the PDP are live for the first time (they
rendered disabled since [[sals3-session-2026-08-05-part05-product-detail-page]]).
`Buy Now`'s behavior is a judgement call: since `/checkout` doesn't exist,
it adds the item and navigates straight to `/cart` — the closest honest
approximation of "buy now" available today, not a fabricated checkout flow.
`Proceed to Checkout` on the cart page itself stays disabled with a
plain-English note, same pattern as the PDP's Add to Cart/Buy Now buttons
before this session.

## Two real bugs caught during verification, not glossed over

1. **jsdom's `localStorage` was undefined in this repo's test environment**,
   throwing `Cannot read properties of undefined (reading 'getItem')` the
   moment `CartProvider` tried to use it — likely Node's own experimental
   global `localStorage` (added in recent Node versions) shadowing jsdom's.
   Fixed with a small in-memory `Storage` polyfill installed in
   `test/setup.ts` before every test, rather than trying to coax jsdom's
   native implementation into working.
2. **A stray `node.exe` dev server (PID 56420), already running before this
   session started**, had absorbed a large number of hot-reloads across
   sessions 05/06/07's edits and ended up serving broken HMR (WebSocket
   handshake failures, sporadic `403`s on `/_next/*` assets). This made
   `Add to Cart` clicks silently no-op in both Playwright and manual browser
   checks, even though the same click fired correctly via direct
   `element.click()` in JS — a strong signal the client bundle itself was
   fine and the transport/dev-server was not. Confirmed by asking Bogs
   before killing the process (a destructive-ish action per the safety
   rules), then re-running the full e2e suite against a clean
   `npm run dev` — all 6 passed. Neither issue was a defect in the shipped
   cart logic itself; both were test/dev-environment problems.

## What shipped

`src/lib/cart.ts` (pure, Zod-validated cart reducer functions — add/remove/
set-quantity/count/subtotal), `src/lib/money.ts` (`multiplyMoney`,
`sumMoney` added), `src/components/cart/CartProvider.tsx` (`useCart()`
hook, wraps `src/app/layout.tsx`), `CartCountBadge.tsx` (header badge),
`CartLineItemRow.tsx` + `CartPageClient.tsx` (cart page UI),
`src/app/cart/page.tsx` (`noindex`ed route), and
`src/components/product/ProductAddToCartButtons.tsx` (replaces the PDP's
disabled placeholder buttons from the prior session).

## Verification

`npm run lint`, `format:check`, `tsc --noEmit`, `build` (`/cart` static),
`test:run` (59 tests, up from 42 — new `src/lib/cart.test.ts` plus updated
PDP/home/login/signup tests now wrapped in a `renderWithCart` test helper
since `SiteHeader`'s cart badge needs a `CartProvider` ancestor), `test:e2e`
(6 passed against a fresh dev server, including a new `e2e/cart.spec.ts`:
add → adjust quantity → remove, and Buy Now → straight to cart), `npm audit
--audit-level=high` (0 vulnerabilities). Also checked live in the browser:
add, increment, remove, empty state, and Buy Now's cart-and-navigate
behavior all confirmed by hand after the stray server was cleared.

## Files changed

`src/lib/cart.ts` (new), `src/lib/cart.test.ts` (new), `src/lib/money.ts`,
`src/components/cart/CartProvider.tsx` (new), `CartCountBadge.tsx` (new),
`CartLineItemRow.tsx` (new), `CartPageClient.tsx` (new),
`src/components/product/ProductAddToCartButtons.tsx` (new),
`src/components/product/ProductPriceBox.tsx`, `src/app/layout.tsx`,
`src/app/cart/page.tsx` (new), `src/app/cart/page.test.tsx` (new),
`src/app/p/[id]/page.tsx`, `src/app/p/[id]/page.test.tsx`,
`src/app/page.test.tsx`, `src/app/login/page.test.tsx`,
`src/app/signup/page.test.tsx`, `test/setup.ts`, `test/render-with-cart.tsx`
(new), `e2e/cart.spec.ts` (new), `e2e/product.spec.ts`, `README.md`.

## Still not built

Orders and My Account remain — next in the build order Bogs set. Checkout
itself was never in that sequence and stays out of scope until asked for.

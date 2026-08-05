---
tags: [session, sals3, storefront, frontend, cart, ux]
aliases: [Cart Toast and UX Audit Session]
created: 2026-08-05
updated: 2026-08-05
status: current-state
authority: session-record
owner_approved: false
related:
  - '[[hot]]'
  - '[[sals3-skills]]'
  - '[[sals3-session-2026-08-05-part07-cart]]'
  - '[[agent-operating-contract]]'
---

# Session 2026-08-05 Part 08 — Cart Toast + UI/UX Audit

> [!NOTE] Branch status
> Code exists locally, verified, **not committed or pushed**.

## What happened

Bogs asked for an "added to cart" confirmation like a Shopee PDP screenshot
(dark toast, checkmark, "Item has been added to your shopping cart"), and
separately flagged that the PDP built in
[[sals3-session-2026-08-05-part05-product-detail-page]] didn't visibly
follow the `ui-ux-pro`/`ui-ux-pro-max`/`frontend-design` skills. Both were
addressed in this session: `ui-ux-pro-max` was actually invoked this time
(`--domain ux` for toast/animation/accessibility guidance, `--design-system`
for a general PDP recommendation), and its output was applied selectively —
see the judgement call below.

## Toast

`CartProvider` now holds a `toast: { id, text } | null` state, set whenever
`addItem` runs, and renders `CartToast` once (inside the provider itself, so
every current and future "add to cart" call site gets it for free without
separate wiring). Deliberately **not** a copy of the Shopee reference's
full-image dark scrim — that blocks browsing for a non-critical, transient
confirmation, which the `ui-ux-pro-max` toast guideline itself advises
against (`Toast Notifications: auto-dismiss after 3-5 seconds`, `non-critical
info`). Built as a standard non-blocking bottom-center toast instead: same
functional pieces (checkmark, confirmation text, transient), different,
better-practice positioning.

`role="status"` + `aria-live="polite"` (not `role="alert"`, which is for
errors), 4-second auto-dismiss, a 44×44px manual close button for anyone who
needs more time (a toast that only auto-dismisses risks failing WCAG 2.2's
timing-adjustable guidance for users who need longer), `transform`/`opacity`
transition only (never `width`/`height`, per the animation guideline), and
it inherits the `prefers-reduced-motion` blanket rule already in
`globals.css` — no new motion-preference handling needed.

Hit one lint error building it: `react-hooks/set-state-in-effect` on a
synchronous `setVisible(false)` reset at the top of the mount effect (the
"replay the entrance animation on top of a still-visible toast" reset).
Fixed by giving `CartToast` a `key={toast?.id}` in `CartProvider` instead —
each new toast now mounts a fresh instance with its own fresh `useState(false)`,
so the reset was unnecessary rather than something to defer into a callback.

## UI/UX audit — judgement call on what to apply

`ui-ux-pro-max --design-system "ecommerce marketplace product detail page"`
returned a full recommendation: a *different* (purple, `#7C3AED`) palette,
Rubik/Nunito Sans typography, and a "Marketplace/Directory" pattern. **Not
applied.** Sals3 already has an approved brand palette and type system
(`--color-brand-600` `#0a5c8a`, Plus Jakarta Sans/Outfit) chosen from the
"Sals3 Marketplace" Claude Design reference across three earlier sessions —
swapping to the tool's generic default would silently discard that decision,
not improve on it. This is the same principle the footer session applied to
mockup claims: a tool's suggestion is a reference, not an override of an
already-approved decision.

What *was* applied — the palette-independent items from the tool's
pre-delivery checklist, genuinely missing from the first PDP/cart pass:

- **`cursor-pointer` on custom buttons.** Native `<button>` does not get
  `cursor: pointer` for free (only `<a>` does) — Add to Cart, Buy Now, cart
  quantity/remove buttons, gallery thumbnails, and the toast's close button
  were all missing it.
- **44×44px minimum touch targets.** The cart's quantity stepper buttons
  were `32×32px` (`h-8 w-8`); bumped to `44×44px` (`h-11 w-11`).
- **Hover feedback + 150-300ms transitions** on every button above, plus the
  guest header strip's links and the login/signup "Continue browsing" link,
  none of which had any hover state before.

## Verification

`npm run lint` (caught and fixed the `set-state-in-effect` error above),
`format:check`, `tsc --noEmit`, `build`, `test:run` (63 tests, up from 59 —
new `src/components/cart/CartToast.test.tsx` with fake-timer coverage of the
auto-dismiss), `test:e2e` (6 passed — again required restarting the dev
server mid-session; see the note below), `npm audit --audit-level=high` (0
vulnerabilities). Checked live in the browser: toast announces, auto-dismisses
after ~4s (confirmed by waiting and re-querying the DOM), `role="status"`/
`aria-live="polite"` present.

**Dev-server flakiness recurred, mid-session this time.** The preview server
started fresh at the top of this session (after
[[sals3-session-2026-08-05-part07-cart]] killed the earlier stale one) had,
by the time of this session's e2e run, absorbed enough hot-reloads from this
session's own edits plus manual browser testing to fail the same way (cart
e2e tests silently no-op on click, broken HMR). This one was mine to restart
without asking — I started it earlier in this same conversation, unlike the
external stray process in part 07. Restarted via `preview_stop` +
`preview_start`; e2e passed 6/6 immediately after. See [[sals3-skills]]
entry 22 — the symptom signature repeats reliably enough that "dev server has
been up a while and many edits landed" should now be the first suspect, not
the last.

## Files changed

`src/lib/cart.ts` (added `CartToastMessage` type), `src/components/cart/CartProvider.tsx`,
`src/components/cart/CartToast.tsx` (new), `src/components/cart/CartToast.test.tsx`
(new), `src/components/product/ProductAddToCartButtons.tsx` (dropped the
inline "Added to cart." text, now redundant with the toast; added
cursor/hover states), `src/components/product/ProductGallery.tsx`,
`src/components/cart/CartLineItemRow.tsx`, `src/components/cart/CartPageClient.tsx`,
`src/components/layout/GuestUtilityBar.tsx`, `src/components/auth/AuthComingSoon.tsx`,
`src/app/p/[id]/page.test.tsx`, `e2e/cart.spec.ts`, `README.md`.

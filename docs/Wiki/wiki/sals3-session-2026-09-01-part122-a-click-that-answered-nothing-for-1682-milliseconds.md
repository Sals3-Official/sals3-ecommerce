---
tags:
  - sals3
  - sals3-ecommerce
  - storefront
  - performance
  - motion
  - loading-states
  - session-note
aliases:
  - Part 122
  - A Click That Answered Nothing For 1682 Milliseconds
created: 2026-09-01
updated: 2026-09-01
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
---

# Part 122 — a click that answered nothing for 1,682 milliseconds

2026-09-01, `sals3-ecommerce`
[#223](https://github.com/Sals3-Official/sals3-ecommerce/pull/223), no DDL.

> [!NOTE] Provenance
> Written after the fact from the pull request's own record.

## The measurement

Clicking a product on production left the previous page **completely
unchanged** for 754ms warm / 1,682ms cold. Sampled every 150ms during a real
click:

| | during the wait |
|---|---|
| characters on screen | 3332 → 3332 |
| page heading | unchanged |
| `aria-busy` regions | 0 |
| skeletons / spinners | 0 |

Nothing was broken. Nothing reported anything either, which is exactly why it
read as a hang rather than a wait. `/orders` held the only `loading.tsx` on
the whole site, and the repository's one `<Suspense>` boundary is documented
in its own comment as inert. Cold route timings from the same session:
product 1,682ms, home 1,080ms, category 618ms, search 609ms.

## What this does

**The pressed link answers immediately.** Product cards, list rows, category
tiles, and department rows now use `useLinkStatus` to show a pending overlay
the instant a click is registered — positioned over a `relative` parent so it
cannot move anything in a grid, held at zero for 140ms so a fast navigation
never flashes it, and `aria-hidden` because the destination's own skeleton
already carries the accessible announcement.

**Skeletons on `/search`, `/cart`, `/categories`.** Header, footer, and fixed
copy render as real content, following the pattern the pre-existing
`orders/loading.tsx` already set; only what the portal has yet to answer
pulses. No count is invented while a read is in flight — an unknown total
stays a loading bar rather than a plausible-looking zero. Ten skeleton cards
render, not three, so the grid does not collapse to one row and reflow when
the real ten arrive.

**The product page's related-products rail now streams separately.** On a
cold cache, `getRelatedProducts` makes up to four *serial* portal round
trips (two sections × two pages, serialised on purpose inside
`collectAllProducts`), and it had been holding up the whole buy box behind
it. A cold product page now waits on two round trips instead of five before
its critical content is visible.

## Why `/p/[id]` and `/c/[slug]` cannot have a route-level `loading.tsx`

A route-level fallback starts the HTTP response streaming immediately — and a
streamed response can no longer set its own status code afterward. Adding one
to either route would have made every unknown product and unknown department
answer `200` instead of `404`. This was caught by two existing e2e
assertions (`e2e/category.spec.ts:104`, `e2e/product.spec.ts:80`); removing
the two candidate `loading.tsx` files took that run from 4 failures back to
0. Both skeletons were written and deliberately held out of the route tree
rather than shipped half-wired — the pressed-link overlay is what covers
these two routes instead, which is why it was extended to product cards,
category tiles, and department rows specifically. Taking the other side of
this trade (accepting the streaming/404 conflict some other way) is a
deliberate future decision, not a side effect of this PR.

## Motion

Extends the existing `s3-` transition vocabulary already in `globals.css` —
same `cubic-bezier(0.32, 0.72, 0, 1)` curve, same file — so the
`prefers-reduced-motion` sweep already defined there neutralises the new
motion for free. That sweep matches `*`, `*::before`, and `*::after` only;
view-transition pseudo-elements are none of those, and would need their own
rule if page-transition animations are ever added later. Noted directly in
the file for whoever adds them.

## Two consequences of streaming, recorded where they bite

- **A nested async Server Component is unrenderable by
  `@testing-library/react`**, and a suspended boundary makes React hold
  updates — so every post-`fireEvent` assertion in the product page test was
  silently no-opping and reporting a *wrong value* rather than an unrendered
  click. `RelatedProductsSection` is now its own module specifically so the
  test can mock it instead of rendering through it.
- **`page.goto` now returns at first paint** instead of blocking until full
  content — the entire point of the change, but it moved one search
  assertion onto the file's existing upstream timeout as its effective
  result; the assertion's own logic is unchanged.

## Left alone deliberately

Both are cost decisions, not defects, and neither belonged to this PR to
decide:

- `prefetch={false}` on every route into a product page
  (`home/ProductCard.tsx:20`, `catalog/ProductCard.tsx:37`,
  `catalog/ProductListRow.tsx:21`) — enabling it removes Next's free head
  start but means prefetching every visible card.
- `requestStorefrontJson` (`client.ts:190`) has no timeout and no retry and
  defaults to `no-store`, so a slow portal response is time-to-first-byte
  1:1 on the storefront.

## Verification

`npm run verify` green: lint, format, typecheck, build, 1,170 unit tests, 63
e2e. The route table was diffed across the change — `/legal/privacy` and
`/legal/terms` remain the only prerendered routes, so nothing regressed from
static to dynamic as a side effect of the new loading states.

## What was not done

Prefetching and a timeout/retry layer on `requestStorefrontJson` are both
named and explicitly deferred as separate cost decisions, not folded into
this PR.

## Lessons

- **A page that changes nothing and reports nothing reads as broken, even
  when it is working exactly as coded.** Zero `aria-busy` regions and zero
  skeletons during a genuine 1.7-second wait is indistinguishable, to a real
  visitor, from a hung click — the fix here is entirely about *saying*
  something is happening, not about making anything faster.
- **A route-level loading fallback is a status-code decision, not just a UX
  one.** Streaming a response the instant a fallback exists forecloses that
  response ever answering `404` — a constraint invisible until two existing
  e2e tests caught it by asserting the actual HTTP status rather than the
  rendered page.
- **A component boundary chosen for streaming is also a testing boundary.**
  Extracting `RelatedProductsSection` into its own module was necessary for
  Suspense to work correctly and, as a direct consequence, was also what let
  the test suite mock it — the two motivations point at the same fix.

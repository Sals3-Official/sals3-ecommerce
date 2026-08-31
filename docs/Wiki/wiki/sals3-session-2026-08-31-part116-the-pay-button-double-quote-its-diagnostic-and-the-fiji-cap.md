---
tags:
  - sals3
  - sals3-ecommerce
  - sals3-portal
  - checkout
  - session-note
aliases:
  - Part 116
  - The Pay-Button Double Quote, Its Diagnostic, And The Fiji Cap
created: 2026-08-31
updated: 2026-08-31
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-28-part88-three-named-tiers-instead-of-cjs-own-courier-list]]"
---

# Part 116 — the Pay-button double quote, its diagnostic tool, and the Fiji free-shipping cap

2026-08-31, `sals3-portal`
[#288](https://github.com/Sals3-Official/sals3-portal/pull/288)/[#289](https://github.com/Sals3-Official/sals3-portal/pull/289)/[#291](https://github.com/Sals3-Official/sals3-portal/pull/291)/[#293](https://github.com/Sals3-Official/sals3-portal/pull/293)/[#295](https://github.com/Sals3-Official/sals3-portal/pull/295)/[#296](https://github.com/Sals3-Official/sals3-portal/pull/296)
and `sals3-ecommerce`
[#216](https://github.com/Sals3-Official/sals3-ecommerce/pull/216)/[#218](https://github.com/Sals3-Official/sals3-ecommerce/pull/218),
no DDL in any of them.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## Checkout was quoting freight twice on every Pay press (portal #288, ecommerce #216)

The owner reported checkout slowness live: pressing Pay ran two full live CJ
freight computations back to back, each several CJ requests deep.
`createCheckoutIntent` (portal) already re-quotes freight live and validates
the buyer's selection against it before creating an intent — the
authoritative check, since its result is what gets persisted for the order
this intent becomes. `createCheckoutSessionAction` (ecommerce) ran the
identical check itself first, one call earlier, on the exact same fields
(`packageId`/`shippingTier`/`optionId`/`channelId`/`amountMinor`/`currency`)
the portal was already comparing.

The fix removes the redundant half rather than caching it: the buyer's
selection now reaches `createPortalCheckoutIntent` unmodified, with no local
re-quote and no local match — a stale or mismatched selection is still
caught, by the portal, and the buyer sees the same message as before,
through the existing `ProductsApiError` → `classifyStorefrontFailure` →
`safeMessage` path. `createCheckoutIntent` now returns
`{ checkoutIntentId, shippingQuotedAt }` instead of just the id — a field
already computed and free to expose — so the storefront can record when
shipping was verified for the Stripe session audit trail without a second
quote to get it. The ecommerce-side test suite moved from mocking a
locally-mismatched quote to mocking the portal's own 422, since that's
genuinely where those checks live now, with an explicit
`expect(requestCheckoutFreightQuotes).not.toHaveBeenCalled()` added as the
regression lock on the happy path.

## A product that 503s, diagnosed from outside without a database (portal #289, #291, #293)

Next, the owner tried a new checkout and hit "Delivery options are
unavailable. Try again in a moment." on a real cart. Reproduced directly
against production rather than guessed: Men's Rhinestone Star Jeans and
Cotton Gauze Pajama Pants both quoted fine (200, three real quotes each);
Small Feet Harem Pants (Apricot-M) answered 503 alone or combined with
anything else. Confirmed unrelated to the same day's #288/#216 fix, since
`/api/storefront/checkout/freight-quotes` calls `quoteCheckoutFreight`
directly and neither PR touched it. The product itself checked out clean on
CJ directly — search, detail, inventory all normal, real stock in the China
warehouse — so whatever breaks lives in this repository's stored supplier
binding or the CJ call made with it, and that's invisible from outside
without either database access or a way to see the raw CJ response.

The reason it couldn't be answered from outside at all:
`storefrontErrorResponse` collapses every unexpected failure into one
generic 503 on purpose — its own doc comment warns that a driver message
can carry a table name, a column list, or a connection string fragment —
correct for a buyer-facing route, but it also means the actual CJ response
body never reaches anyone who could act on it.

Three PRs built the diagnostic in stages, each one following what the
previous stage's clean result ruled out. #289 added
`GET /api/internal/checkout/diagnose-freight-quote` — the same break-glass
pattern as every other internal route (`CRON_SECRET`-gated
`workflow_dispatch`), read-only, resolving the product's supplier binding
the way `loadQuoteLines` does and repeating `loadPackageInputs`'s two CJ
reads directly rather than through `getCjJson`, which discards the body on
the way to a thrown error — this one returns the raw status and body from
both calls. Run against the harem pants product, both reads came back
completely clean. #291 then extended the diagnostic to call the real,
unmodified `quoteCheckoutFreight` and report whatever it throws, since the
first version never reached the freight calculation itself
(`/logistic/freightCalculateTip`) — this run reported
`fullQuote: { ok: false, error: { name: "CjApiError", message: "unexpected-response" } }`,
confirming the failure lives in that third call, but `getCjJson` had again
discarded the actual CJ body on the way to the throw. #293 closed the gap:
it rebuilds the same request `loadPackageInputs`/`freightBodyForPackage`
would send — reusing the real, exported `loadPackageInputs` so origin
resolution stays a single source of truth — and POSTs it directly,
capturing the raw status and body, running only when the wrapped call fails
unnamed (a `CheckoutFreightQuoteError` already explains itself and costs
nothing extra to inspect).

#296 then found the diagnostic itself had grown wasteful: `diagnoseFreightCalculate`
was calling `loadPackageInputs` a **second** time to resolve the same
supplier binding `quoteCheckoutFreight` had already resolved moments
earlier — meaning one diagnosis asked CJ's product and inventory endpoints a
**third** time, at real CJ-points cost, and made a failure ambiguous (a
redundant third read's error looked identical to an error from the
freight-calculate call the tool exists to inspect). Rewritten to read the
bodies already fetched earlier in the same diagnosis run, mirroring
`requireDetailVariant`'s dimension fallback and `chooseOrigin`'s stock
priority exactly — a run now costs exactly one CJ call more than
`quoteCheckoutFreight` alone, the same as a normal checkout attempt.

## The uncapped Fiji exposure the free-shipping plan had already called out (portal #295)

Separately, a review of the original free-shipping coding manual
(`Sals3-Free-Shipping-Plan-and-Coding-Manual-v19.pptx`) surfaced that it had
explicitly required a per-country contribution ceiling
(`min(freeAmount, ceiling)`) before launch — never built when the simpler
env-var mechanism shipped in part 91. Standard shipping becomes fully free
the instant a basket qualifies, with no ceiling anywhere in the code, and
Fiji was keyed into the identical mechanism as Australia and the
Philippines even though its real CJ freight scales from $16.01 at 300g to
$98.32 at 2kg — a qualifying heavy Fiji order had **unlimited** exposure.

`freeShippingCeilingAmountMinor()` reads an optional
`SALS3_FREE_STANDARD_SHIPPING_CEILING_{AU,PH,FJ}_USD` env var per country,
and deliberately **fails open rather than throwing** when unset — no such
Vercel variable exists in production yet, and this had to be safe to deploy
before anyone adds one. The zero-config default is the qualifying threshold
itself: Sals3 never gives away more in Standard freight than the spend that
earned it. `freeShippingContributionMinor()` caps the total Standard-tier
contribution at that ceiling, summed **per order** rather than per package
(a split-warehouse order ships as more than one package), and
`freight-quotes.ts` now allocates the capped amount across packages instead
of unconditionally zeroing every Standard quote. Every real quote measured
so far (AU ~$8.10, PH ~$4.09, FJ ~$16.01 at a normal 300g basket) sits far
under its country's threshold, so the default ceiling never engages for a
normal order — this only starts capping the case that had no protection at
all, an unusually heavy qualifying basket.

## Merchandising the offer earlier, without overclaiming it (ecommerce #218)

A companion change on the storefront side moved the free-shipping message
earlier in the buyer's journey, following a behavioral-science strategy memo
(v2.1), without claiming a number the storefront can't verify for that
buyer at that moment. `CheckoutShippingOptions.tsx`'s free-shipping progress
bar now renders **before** the package's Standard/Express/Expedited cards
instead of after — previously a buyer often saw and picked a paid option
before the nudge to add more even appeared. The PDP's evidence ledger gains
one clause ("Some orders qualify for free Standard delivery once your
address is known") with the mark left hollow, since the page has no address
to check a threshold against yet. The cart gets a similarly generic teaser
above "Proceed to Checkout," with no dollar figure and no country named.

The reasoning for staying generic on PDP and cart: `resolveDestination()`
already resolves a destination via cookie → geo-IP → Global and already
backs the cart's approximate FX price display, but its own doc comment is
explicit that the geo-IP guess is "only a suggestion" — sound enough for an
approximate currency conversion, not sound enough to anchor a specific
dollar threshold claim, which is exactly the "destination accuracy" risk the
memo's own compliance checklist calls out. The real number continues to
resolve only at checkout, against a real address, exactly as before.

## Verification

Portal #288: `npm run verify` green. #289: 3647 unit / 333 files, 65 e2e.
#291: 3648 / 333, 65 e2e, two new tests covering both-reads-clean-but-real-
function-still-fails. #293: 3648 / 333, 65 e2e. #295: full verify clean in
an isolated worktree with a real `npm ci`, 335 unit test files / 56 e2e
passed / 19 skipped (pre-existing no-`DATABASE_URL` skips); 7 new unit tests
for the ceiling function and capped-contribution math, plus one integration
test driving a heavy Fiji basket ($98.32 real freight) through the full
quote path asserting a $43.32 buyer-charged remainder above the $55
threshold-as-ceiling default. #296: `npx tsc --noEmit` clean, the existing
diagnostic and route test suites (13 tests) pass unmodified, full verify
green. Ecommerce #216: 1158 unit / 112 files, 63 e2e. #218: full verify
clean in an isolated worktree, 113 unit test files / 1164 tests, 63 e2e / 2
skipped.

## What was not done

The harem pants 503 was diagnosed to the exact failing call
(`/logistic/freightCalculateTip` returning an unparseable body) but the
underlying cause on CJ's side was never identified or fixed within these
PRs — the diagnostic tool exists specifically because the fix requires
either database access or a CJ-side answer neither PR delivers. The Fiji
ceiling env vars are not yet set in production; the fix ships the mechanism
and fails open until someone configures a value.

## Lessons

- **A generic 503 that protects buyers from driver internals also hides the
  one detail an engineer needs.** `storefrontErrorResponse`'s collapse is
  correct for buyer-facing safety and wrong for diagnosability — the
  resolution built here is a separate, read-only, break-glass-gated route
  rather than loosening the buyer-facing one.
- **A diagnostic tool can itself cost real API points if it re-resolves
  data the call under test already resolved.** The freight diagnostic
  tripled its own CJ reads by re-fetching what `quoteCheckoutFreight` had
  already fetched moments earlier — the fix was to read what was already in
  hand, not to fetch less aggressively.
- **A written coding manual is itself evidence of a requirement that was
  dropped, not just a nice-to-have.** The Fiji ceiling gap wasn't found by
  auditing the code for bugs — it was found by re-reading the original
  planning document and noticing a required guard the simpler shipped
  mechanism never included.
- **A fail-open default is sometimes the only safe way to ship a new
  required-sounding config.** The ceiling env var throws on an invalid
  value but not on a missing one, because production had zero instances of
  it set and the fix needed to be safe to deploy before anyone configured
  anything.

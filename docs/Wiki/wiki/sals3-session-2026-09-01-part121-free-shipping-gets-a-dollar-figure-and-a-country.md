---
tags:
  - sals3
  - sals3-ecommerce
  - sals3-portal
  - free-shipping
  - checkout
  - pricing
  - session-note
aliases:
  - Part 121
  - Free Shipping Gets A Dollar Figure And A Country
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
  - "[[sals3-session-2026-08-28-part91-a-third-market-its-towns-and-the-first-free-shipping-line]]"
---

# Part 121 — free shipping gets a dollar figure, and it gains a country before losing it again

2026-09-01, `sals3-ecommerce`
[#222](https://github.com/Sals3-Official/sals3-ecommerce/pull/222)/[#224](https://github.com/Sals3-Official/sals3-ecommerce/pull/224)
and `sals3-portal`
[#301](https://github.com/Sals3-Official/sals3-portal/pull/301), no DDL in
either repository.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. The country-name
> addition in #224 and its removal three PRs later (#227, part 123) both
> happened the same day; this note records #224 as it shipped and defers to
> part 123 for the reversal.

## The owner feedback that started this

An earlier PR (ecommerce #218, `sals3-portal` #295, both merged before this
part range and already documented) had already put free-shipping mentions on
the PDP and cart. Owner feedback after seeing both live: *"hindi ko naman
maramdaman yung ini-apply mo"* — I can't actually feel what you applied. The
PDP's mention was one bullet inside a four-fact evidence ledger; the cart's was
a single small grey line with a 7px dot. Factually correct, functionally
invisible.

## Visual weight first (#222)

`FreeShippingNotice` — one shared, prominent teal card — replaces both
mentions with the same treatment `CheckoutFreeShippingProgress` already
established (`border-teal-500/45 bg-teal-500/8`), a new `TruckIcon`, and a
bold headline. Used identically on the PDP and the cart, so the offer reads
as one recognisable thing across every touchpoint rather than a differently
styled mention on each page — repetition of one consistent signal, not three
inconsistent ones.

Placement moved deliberately, not just styling. On the PDP
(`ProductRecordPanel.tsx`) the notice moved to be the last thing seen before
the buy buttons — a nudge only works if it lands before the decision, and it
had previously been buried in a fact list read, if at all, after that decision
was already made. On the cart (`CartPageClient.tsx`) it replaces the grey line
in the same position, directly above "Proceed to Checkout."

Still no dollar figure and no country at this stage — unchanged from #218, and
for the same reason: neither page has an address to check a threshold against.
`resolveDestination()`'s geo-IP guess is documented as "only a suggestion,"
sound enough for the approximate FX price already shown on the cart but not
sound enough to anchor a specific dollar claim. Only how prominently the true,
country-free statement was said changed at this stage.

## The threshold endpoint (portal #301)

`GET /api/storefront/free-shipping` returns the configured free-Standard
threshold per checkout destination (AU/PH/FJ) in USD minor units. Built from
the existing pure `freeShippingThresholdAmountMinor()` in `free-shipping.ts`
— no cart, no address, no CJ freight call, the same class of read as the
already-shipped `/api/storefront/fx-buffer`. A missing or malformed env var
for one country drops that entry rather than failing the whole request — the
same "absence costs nothing" rule `fx-buffer` already follows.

`npm run test:run`: 3,680 passed; `npm run test:e2e`: 56 passed. The new route
carries its own auth, happy-path, and partial-config tests.

## The estimate itself (#224)

`FreeShippingNotice` gains a destination-scoped "add $X more for free Standard
delivery to `<Country>`" estimate with a progress bar, replacing the generic
amount-free copy where a geo-IP guess exists. Sourced from
`resolveDestination()` — the identical signal `IndicativePriceLine` already
uses for the approximate FX price shown on the cart — against the new
`/api/storefront/free-shipping` endpoint from #301.

Every figure is labelled "Estimated," closing on "confirmed once your address
is entered at checkout" — `CheckoutFreeShippingProgress`, fed by the portal's
real freight quote, still owns actual eligibility. This is a direct reversal
of #222's "no amount, no country" caution, made on the same owner feedback
that the amount-free badge alone doesn't entice anyone; the fuller reasoning
lives on `FreeShippingNotice`'s own doc comment. The PDP's copy gains a
subtle, `prefers-reduced-motion`-safe teal glow (`s3-free-shipping-glow`) so
it is the thing a buyer's eye catches immediately before Add to Cart / Buy
Now; the cart's copy stays static.

The client-side threshold fetcher mirrors `buffer.ts`'s existing rigor: 1hr
cache, 1.5s timeout, 6hr stale-grace on a portal outage, and a sanity band
that drops an out-of-range or unrecognised threshold rather than rendering
it.

## Verification

#222: `npm run verify` clean in an isolated worktree off `origin/develop`
(pre-commit and pre-push hooks both ran it) — 114 unit test files / 1,166
tests, 63 e2e. #224: `npm run test:run` 1,195 passed, `npm run test:e2e` 63
passed, 2 skipped; visual confirmation on the live site deferred to after
both this PR and the portal PR deployed.

## What was not done

#224's own test plan left the live-site visual check for a follow-up once
both repositories were deployed together — not confirmed in either PR's own
record. The country name this PR added to the PDP copy was reversed the same
day; see part 123 for why.

## Lessons

- **"Factually correct" and "actually noticed" are different bars**, and
  owner feedback that a feature isn't landing is worth taking as a
  presentation problem before assuming the underlying logic is wrong — #218's
  free-shipping facts were already true; #222 changed nothing about
  eligibility, only how loudly it was said.
- **A caution recorded in one PR is not permanent policy** — #222's "no
  amount, no country" was a real, reasoned constraint given what existed at
  the time (no threshold endpoint), and #224 reversed exactly the part that a
  new endpoint made safe to reverse, on fresh owner feedback, rather than
  treating the earlier caution as settled.

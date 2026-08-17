---
tags: [sals3, sals3-portal, sals3-ecommerce, checkout, freight-quote, cj-dropshipping, aj, session]
aliases:
  - AJ Checkout Freight Quotes
  - CJ Freight Quote Integration
  - Two-Step Checkout
  - Part 50
created: 2026-08-17
updated: 2026-08-17
status: shipped
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[sals3-session-2026-08-17-part49-portal-variant-matrix-r2-storage-meta-description-brand-origin-defaults]]"
  - "[[team-profile-and-collaboration-preferences]]"
  - "[[sals3-skills]]"
---

# Sals3 session 2026-08-17, part 50 — AJ's checkout freight-quote integration (8 PRs, both repos)

Documentation-only note, written by Claude on Bogs's behalf, recording work
**authored and merged by AJ** (`aj-garrigues`) across both repositories on
2026-08-17, in parallel with — not authored by — this session's own
`sals3-portal` [PR #106](https://github.com/Sals3-Official/sals3-portal/pull/106)
(see [[sals3-session-2026-08-17-part49-portal-variant-matrix-r2-storage-meta-description-brand-origin-defaults]]).
Local `develop` on both repos was fast-forwarded to `origin/develop` before
writing this note, so the working copies used for this record are current as
of `sals3-portal` `f945147` / `sals3-ecommerce` `b080730`.

Eight PRs, all merged same-day, forming one continuous feature arc: real CJ
freight quotes reach checkout, three real-world quote failures get fixed as
they surface, and the checkout screen itself is restructured around having a
quote at all.

## 1. `sals3-portal` — the freight-quote endpoint and its three fixes

**[PR #107](https://github.com/Sals3-Official/sals3-portal/pull/107) — `feat(storefront): checkout freight quote endpoint backed by the governed CJ path`.**
New `POST /api/storefront/checkout/freight-quotes`. CJ credentials stay
server-side in Portal — `sals3-ecommerce` sends cart lines plus a completed
delivery address; Portal resolves the published product, the supplier
connection, the encrypted CJ credentials, the governed CJ limiter, and
current stock/origin evidence before calling CJ `freightCalculateTip` per
package, returning only buyer-safe shipping options. Reuses the existing
`SALS3_STOREFRONT_API_TOKEN` shared secret — no new environment variable, no
database migration.

**[PR #108](https://github.com/Sals3-Official/sals3-portal/pull/108) — offer-market fallback.**
The offer lookup filtered `productOffers.marketCode` on the buyer's
destination country outright, so a cart shipping to a country with no offer
row in that exact market failed the quote even though the variant was
published, priced, and dropship-fulfilled. Fixed by preferring a row whose
market matches the destination, then falling back to the cheapest match by
price — still refusing outright if the eligible rows resolve to more than
one variant, so a genuinely ambiguous match still fails rather than quoting
the wrong one silently.

**[PR #109](https://github.com/Sals3-Official/sals3-portal/pull/109) — three more real quote failures, found live.**
- Offers published through the discovery pipeline reach
  `PUBLISHED`/`RESOLVED` with no `ACTIVE` `offerSupplierBindings` row, so the
  binding-required lookup failed outright; now falls back to resolving the
  supplier connection through `supplierCandidates` via
  `providerProductReferences.sourceCandidateId` when no binding row matches
  (binding still wins when present). Explicitly flagged as a real, scoped
  loosening of the `ACTIVE`-binding invariant on the buyer path — still gated
  to `CJ_DROPSHIPPING` + `CONNECTED` connections, still requires
  `PUBLISHED`/`RESOLVED`/`AVAILABLE`/priced, still refuses an ambiguous
  multi-variant match.
- `cjFreightOptionSchema` used Zod `.default()` on fields CJ can return as
  explicit `null` (`.default()` only fills `undefined`), so a null
  `arrivalTime`/`ruleTips`/`recommendLogisticsTypeList` threw instead of
  parsing — fixed with an explicit preprocess step.
- A rejected quote returned its `422` with nothing logged server-side,
  making a rejection undiagnosable after the fact — the reason is now
  logged on the way out. Paired with `sals3-ecommerce` PR #98 (§2), which is
  what actually surfaces that reason to the buyer.

**[PR #110](https://github.com/Sals3-Official/sals3-portal/pull/110) — CJ auth stampede.**
Cold portal instances ignored the still-valid persisted CJ access token and
re-authenticated on every in-memory cache miss; concurrent freight calls then
stampeded CJ's 1-request/second auth endpoint, surfacing as intermittent
`503` "Delivery options are unavailable" at checkout for AU/PH buyers. Fixed
by reusing the persisted token bundle while comfortably before expiry, and a
single-flight per-connection refresh so concurrent callers share one CJ auth
call rather than each firing their own. CJ auth failures and freight-option
rejections/zero-option outcomes are now logged with detail, so a
destination-specific refusal is diagnosable from Vercel logs afterward.

## 2. `sals3-ecommerce` — wiring the quote into checkout, then reshaping checkout around it

**[PR #97](https://github.com/Sals3-Official/sals3-ecommerce/pull/97) — `Integrate CJ freight quotes into checkout`.**
The companion to Portal PR #107: a `src/services/checkout/freight-quotes.ts`
client, a `CheckoutShippingOptions` component wired into
`CheckoutPageClient`/`CheckoutOrderSummary`, the checkout server actions and
`src/lib/checkout/schema.ts` extended to carry the selected shipping option,
and the Stripe checkout session now includes the quoted freight cost —
shipping options and cost are fetched per-cart instead of assumed.

**[PR #98](https://github.com/Sals3-Official/sals3-ecommerce/pull/98) — surfacing the real 422 reason.**
A rejected quote or catalogue check previously told the buyer only "Delivery
options are unavailable" / "Catalogue check failed" — hiding the reason
Portal actually gave, and making a genuine misconfiguration
indistinguishable from a transient blip. `ProductsApiError` now carries a
`safeMessage` parsed from a 422 response's `error` field, trusted only when
it is a non-empty string of at most 240 characters (so a stray or oversized
payload can never become checkout copy). Explicitly notes the values come
from Portal's `CheckoutFreightQuoteError`, controlled internal copy rather
than raw supplier/database text reaching a buyer — worth remembering before
adding a new message to that error type.

**[PR #99](https://github.com/Sals3-Official/sals3-ecommerce/pull/99) — country-aware address entry.**
The checkout address form now adapts to the enabled CJ destinations:
state/region and city become dropdowns from a new
`src/lib/checkout/locations.ts` dataset (city options depend on the chosen
state/region), phone is required and must carry the correct country prefix
(`+639` PH, `+614` AU) enforced via `CheckoutAddressSchema`'s `superRefine`
so server validation matches the form exactly, and changing the country
resets phone/state/city/any previous freight quote so the next Portal quote
is always requested against a country-matched address.

**[PR #100](https://github.com/Sals3-Official/sals3-ecommerce/pull/100) — checkout split into two steps.**
Checkout had been one screen holding contact, address, courier options, and
payment, with a "Get delivery options" button that did nothing until every
address field above it was already correct — the page's own length hid what
was still missing. Owner asked for the two concerns split onto separate
pages (a supplied design used as layout inspiration only; colours/type/
components stay this app's own tokens):
- **Step 1 (Information)** — contact + address, ending in **Continue to
  delivery**, which validates the address, quotes the couriers, and only
  advances on a successful quote; a failed quote keeps the buyer on step 1
  with the server's actual message (from PR #98).
- **Step 2 (Delivery & payment)** — a *Ship to* recap with **Edit**, the
  delivery options, and payment.
- **Quote reuse**: editing any address field clears the live quote (proof the
  address changed since the quote was fetched); going back and continuing
  again reuses the still-valid quote rather than spending another call
  against the 12/min freight limit, keeping the buyer's selected courier.
  **Refresh options** re-quotes on demand for an expired one.
- **Nothing server-side changed** — no server action, schema, validation
  rule, or pricing path touched; the server still re-fetches every product
  and re-quotes the selected freight before creating a Stripe session, so
  browser prices remain untrusted, unchanged from before this PR.
- **Architecture**: `CheckoutPageClient` went from 274 to 134 lines,
  composition-only now — state moved into `useCheckout` composing
  `useCheckoutAddress` and `useShippingQuote`; every checkout file is under
  150 lines.
- **Accessibility**: `aria-current="step"` on the active step, focus moves to
  the step region on navigation, one `aria-live` region per step, all
  controls at least 44px.

## 3. Verification, as reported in each PR

All eight PRs report a clean `npm run verify` (lint, format:check,
typecheck:clean, build, unit, e2e) plus `npm audit --audit-level=high` clean
(pre-existing moderate findings only, no new dependency in the audited set)
before merge, per their own PR descriptions — not independently re-run by
this note's author against a live database; this is a documentation record
of AJ's reported verification, not a fresh audit. No new environment
variables and no database migrations were needed for any of the eight — the
Portal side reuses the existing `SALS3_STOREFRONT_API_TOKEN`, and every
`sals3-ecommerce` change is application code and schema-shape only.

## 4. What this deliberately does not cover

This session did not review AJ's diffs line-by-line against
[[nextjs-component-security-code-rules]] or re-run `npm run verify`/`npm
audit` independently — the eight PRs were already merged by the time this
note was written, on AJ's own reported verification per each PR's own
checklist. Nothing here should be read as an independent code review; it is
a synchronization record (local `develop` fast-forwarded on both repos) and
a summary of what shipped, for Bogs's own reference and for whoever picks up
checkout or freight-quote work next.

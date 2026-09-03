---
tags: [sals3, session, fiji, storefront, multi-country, sals3-com-fj, market]
aliases:
  - Part 131
  - A Byte-Identical Copy Learns To Say Bula Fiji
  - Fiji Storefront Launch
created: 2026-09-04
updated: 2026-09-04
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged-pending-vercel-env-var-and-twin-pr
related:
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[hot]]"
---

# Part 131 — a byte-identical copy learns to say "Bula, Fiji."

> [!NOTE] Provenance
> Written 2026-09-04, after the fact, from `anythingsupplies/sals3.com.fj`
> PR #1's own merged record — the first PR in this repository. No new
> testing was performed to produce this note.

| PR | Title | Merged |
|---|---|---|
| [#1](https://github.com/anythingsupplies/sals3.com.fj/pull/1) | feat(fiji): make this deployment look and read like a Fiji storefront | 2026-09-03T18:59:22Z |

No DDL — this repository shares `sals3-ecommerce`'s database. Notable for a
reason beyond its own content: **this is the first PR ever merged in
`sals3.com.fj`**, a brand-new fourth repository under `anythingsupplies`,
and it had no vault entry until this note — exactly the gap
[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]
was written to close.

## What this repository was, and what it became

Until this PR, `sals3.com.fj` was a byte-identical copy of the shared
storefront pointed at a different domain — a buyer arriving on it was told
nothing about Fiji at all. Everything below sits behind one build-time
variable, **`NEXT_PUBLIC_SALS3_MARKET=FJ`**, deliberately given no default:
unset, the repository renders the plain shared storefront and reports
nothing anywhere, in either its `.env.example` or its README.

| Element | Behaviour |
|---|---|
| Welcome band | "Bula, Fiji." with the **drua**, shown under the header on every page, carrying two facts the address form already honoured and had never stated: no postcode needed, and free delivery over the Portal's configured threshold. |
| Header texture | Masi geometry over the brand gradient at 16% opacity, in Sals3 navy/teal rather than barkcloth's tan/black; leaves when the header compacts, so the contrast the gradient's own code comment protects is unchanged. |
| Home carousel | `fijiPromoSlides` — seven slides, opening on delivery, the thing a Fiji shopper is refused everywhere else on the shared storefront. |

The drua — the double-hulled canoe that carried goods between the islands —
was chosen specifically because it *means delivery* rather than merely
decorating the page; an earlier tagimoucia motif was cut because at 50px it
read as a lamp, not a flower.

## The slide that is deliberately missing

The Fiji carousel carries **no price-certainty slide.** "The price on the
card is the price you pay" is a safe claim on a domestic storefront and
becomes a claim about the *border* on this one: `automatic_tax` is
explicitly off on the Stripe session (asserted twice by
`services/stripe/checkout.test.ts`), and neither repository handles customs,
duty, or VAT — a Fiji parcel arrives unassessed and unpaid. The slide stays
out until there is a real answer from the Fiji Revenue & Customs Service,
and `home-promo-slides.test.ts` fails if it is ever copied back in.

## Why market is configuration, read once, not threaded through props

A market is treated as a property of the *deployment* — a Fijian shopper
browsing from Sydney still gets the Fiji storefront — so `NEXT_PUBLIC_
SALS3_MARKET` is read once at the point of use rather than passed through
pages as a prop. This is a direct, named lesson from an earlier defect: the
`market` prop `SiteHeader` carried until 2026-08-28 defaulted to Australia,
which is exactly what sent a buyer who had chosen the Philippines to `/au`.
The free-delivery figure shown in the welcome band is likewise never
hardcoded — it comes from the page's own `fetchFreeShippingThresholds()`
read, tracking `SALS3_FREE_STANDARD_SHIPPING_FJ_USD` rather than becoming a
number that quietly stops being true; with no threshold configured, the copy
omits the amount rather than inventing one.

## A build-time trap caught in a browser, not a test

Next.js only inlines `process.env.NEXT_PUBLIC_*` at build time where the
member expression is written out in full. Reading the market flag through a
`process.env` default-parameter pattern left the value `undefined` inside
the **client** bundle while it still resolved correctly server-side — so the
server-rendered welcome band said "Bula, Fiji." directly above a
client-rendered carousel still running the shared, non-Fiji slides
(price-certainty slide included). Invisible to a Node test runner, where
`process.env` resolves either way regardless of how it's read.
`market.test.ts` now asserts the literal member-expression form rather than
the value, specifically because the failure mode is about *how* the constant
is read, not what it evaluates to. Confirmed live in a real dev build with
the flag set: `data-market="FJ"`, the band renders, all seven carousel
images resolve to `fiji-*`, and the `one-price` slide is absent.

## Verification

`npm run verify` green: 1,262 tests across 122 files, 63 e2e — re-run by the
pre-commit and pre-push hooks per this repository's standard gate.

## What is explicitly not done yet

The PR's own body lists three items outstanding, none silently:

1. **`NEXT_PUBLIC_SALS3_MARKET=FJ` is not yet confirmed set in Vercel** for
   this project's environments. It is inlined at build time, so setting it
   needs a redeploy, not a restart, before any of the above is visible in
   SIT/UAT/production.
2. **The masi motif is a placeholder.** Fiji Airways commissioned a Fijian
   master masi artist for its own use of the motif rather than drawing its
   own version; if this becomes real brand furniture, the same should
   happen here.
3. **The customs question is still open** — the reason the price-certainty
   slide stays absent.

A fourth item is not in the PR body but follows from this repository's own
README rule, quoted in the PR itself: *"every fix belongs in both
repositories — the same change is applied in `sals3-ecommerce` and needs its
own PR there."* **That twin PR in `anythingsupplies/sals3-ecommerce` had not
been opened as of this note** (checked 2026-09-04; `sals3-ecommerce`'s most
recent merged PR, #14, is the stocked-categories work from
[[sals3-session-2026-09-04-part129-coverage-jumps-from-19-to-69-percent-once-the-census-stopped-being-the-alphabet|part 129]]'s
sibling batch, unrelated to Fiji). Tracked in
[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]'s
*Required verification*.

## Repository-settings gap found while writing this note

`sals3.com.fj` has `develop` and `main` but **no `pre-prod` branch**, and no
`deployment-reached-the-environment.yml` — unlike `sals3-portal`, which has
both. Its README states the same `develop → pre-prod → main` table
`sals3-ecommerce`'s does, so the document and the repository's actual
settings currently disagree. See
[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]] §3
and its evidence table.

## Lessons

- **A per-country storefront is a fork with one flag, not a rewrite** — the
  entire Fiji identity sits behind one env var, and the repository is
  otherwise byte-identical to `sals3-ecommerce`, which is what makes the
  twin-PR rule in its README necessary rather than optional.
- **A market default is a bug waiting for a country that isn't the
  default** — this PR's whole "read once, no threading" design decision
  traces directly back to the 2026-08-28 `SiteHeader` `market`-prop default
  incident; the fix pattern here is that incident's lesson applied
  prospectively to a second repository before it could repeat there.
- **Client-only env var breakage is invisible to a Node test runner** — the
  same literal-member-expression trap this note's earlier section
  describes; worth remembering for any future `NEXT_PUBLIC_*` flag added to
  either repository.

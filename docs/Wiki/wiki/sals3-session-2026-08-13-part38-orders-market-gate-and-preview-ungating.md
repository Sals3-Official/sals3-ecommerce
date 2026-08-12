---
tags: [sals3, sals3-portal, session-note, orders, market-config, production-incident]
aliases:
  - Orders Market Gate
  - Orders Preview Ungating
created: 2026-08-13
updated: 2026-08-13
status: implemented
authority: implementation-state
owner_approved: true
related:
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[sals3-portal-orders-parcel-workspace-design]]"
  - "[[hot]]"
---

# `/orders` reads the real market profile, then the gate is deliberately lifted a day later

Two `sals3-portal` PRs, both opened and merged by `louieboi09` (Bogs) under
`codex/`-prefixed branches: #58 fixes a real bug, #60 deliberately walks back
part of that fix the next check-in, for a reason worth recording precisely so
neither PR reads as reverting the other by mistake.

## The bug #58 fixed

`/orders` and `/orders/[parcelId]` called `getActiveMarket()` from
`src/lib/seller-center/market-config.ts` — a fixture the file's own header
comment already states returns `null` in production by design, specifically
so no screen shows an invented market as if it were real. `seller_market_profiles`
(behind `src/modules/market-config/`) is the actual current source of truth,
already live since PR #39 (`feat/seller-market-configuration`) and already
read correctly by `/market-rules`. `/orders` had never been migrated onto it —
a real seller with a real, `ACTIVE` profile still saw "Market configuration is
not available" on Orders, because that page was asking the wrong question.

**PR #58** (`fix(orders): read active market profile`) migrates
`orders/(list)/page.tsx` and `orders/[parcelId]/page.tsx` onto a tenant-scoped
`ACTIVE` profile read for `session.sellerId`, wraps the authorization call and
the profile resolution together in `readOrUnavailable` (resolving the seller
account is itself a query, so wrapping only the profile read would still crash
one line before the part meant to be protected), and keeps the workspace
honest about what an active profile actually proves: it unlocks the parcel UI
and supplies a real destination, nothing else. Currency, carrier, tax, payout,
and cutoff remain explicitly unconfigured — those fields don't exist on
`seller_market_profiles` yet — and illustrative parcel money values stay
labelled `Example` rather than being dressed up as real.

**Scope decision, stated directly in the PR:** only `/orders` and
`/orders/[parcelId]` migrated. `/finances` and `/payouts` have the identical
dead-fixture problem (same header comment names all three), but their fixture
displays depend on currency/tax/payout/carrier/cutoff values the real profile
doesn't carry yet — migrating their gate without those fields would just move
the fabrication from "which market" to "which numbers", not remove it. Left
as explicit follow-up, not silently skipped.

**Verification:** `npm run verify` — 1,242 unit tests passed (4 skipped), 59
E2E (21 skipped), clean `npm audit --audit-level=high` (4 moderate transitive
`esbuild` findings remain; the fix needs a breaking `drizzle-kit` downgrade).
Honestly incomplete: the PR states outright that the "seller with an active
profile sees the workspace" path could not be manually verified in a browser
— the available local test account had no active profile, and none was
fabricated merely to make the check pass.

## Walked back the same day — PR #60

**`fix(orders): keep preview ungated`.** Removes the `ACTIVE`-profile
requirement from `/orders` and `/orders/[parcelId]` again — but not because
#58 was wrong. The stated reason: "Market setup is shared and still under
configuration" — almost no account in the environments that actually exercise
this preview (local dev, PR previews, most demo accounts) has a real active
profile yet, so the freshly-added gate made the Orders *preview* unreachable
for nearly everyone except the one account it was tested against. Requiring
AU/PH market setup just to look at an illustrative parcel workspace was too
high a bar for something explicitly still a preview.

The PR is explicit that this is temporary and narrow:

> This deliberately supersedes PR #58's active-profile gate only for the
> Orders preview. Restore the tenant-scoped active-profile gate when a real
> orders backend and market-specific commercial contracts are available.

`/finances` and `/payouts` are untouched by this reversal — they were never
migrated onto the real profile in the first place (per #58's own scope
decision), so there was no gate on them to walk back. Permission gating
(`order:read`) stays in force throughout; only the market-profile requirement
was lifted. The label makes the current honesty claim explicit: this is a
**temporary interface preview**, and it still refuses to invent currency,
carrier, tax, payout, or cutoff values — lifting the gate did not relax that.

**Verification:** `npm run verify` — 1,255 unit tests passed (4 skipped), 76
E2E passed (2 skipped), including 19 in the Orders suite specifically. Clean
`npm audit --audit-level=high`.

## Net effect, as of this note

`/orders` and `/orders/[parcelId]` render the parcel workspace for any
`order:read`-permitted session, regardless of market-profile state — the
active-profile *read* PR #58 added is still there (and still correctly reads
the real table when a profile exists), but the *hard gate* on it is currently
lifted. A production seller who previously saw "Market configuration is not
available" on `/orders` should now see the workspace instead. This is stated
by both PRs to be temporary: the gate returns once a real orders backend and
market-specific commercial contracts exist, at which point the requirement in
#58 (not a new mechanism) is expected to be the one restored.

## Cross-reference

[[sals3-portal-orders-parcel-workspace-design]] and
[[sals3-session-2026-08-13-part37-orders-parcel-workspace-build]] describe the
parcel workspace itself; neither anticipated the market-fixture dependency
this note's #58 found, since that gate was inherited from
`src/lib/seller-center/market-config.ts`'s pre-existing pattern on other
Seller Center screens rather than written new for Orders.

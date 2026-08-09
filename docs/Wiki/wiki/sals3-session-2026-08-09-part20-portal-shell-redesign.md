---
tags: [session, sals3-portal, seller-center, portal-shell, design-handoff, ui]
aliases: [Portal Shell Redesign Session, Nav Rail Rebuild]
created: 2026-08-09
updated: 2026-08-09
status: historical
authority: session-note
owner_approved: false
related:
  - "[[hot]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-session-2026-08-08-part17-product-editor-and-supplier-catalogue]]"
  - "[[sals3-session-2026-08-08-part18-supplier-connection-identity-reassignment]]"
---

# Session: the portal shell (nav rail, Supplier Apps, Overview) rebuilt against the approved design, real data only

Historical record of what happened. Current verified state lives in
[[hot]] - read that for "what's true now," this note for "how it got
there."

## Scope

Bogs supplied a design handoff (`design_handoff_sals3_portal`) covering a
full `sals3-portal` shell redesign - nav rail, topbar, Supplier Apps,
Overview - built in a separate design tool from `Sals3 Portal Screens.dc.html`,
`Sals3 Portal Shell.dc.html`, and a written spec/README. Delivered across
one long session, branch `feat/portal-shell-redesign` off `develop`.

## The written spec was not the source of truth - the prototype file was

Partway into the nav rail build, Bogs rejected two intermediate reference
points in a row: a stray uncommitted sidebar attempt sitting on an
unrelated branch (stashed, not used), and the currently-running dev
server's own rendering. He pointed directly at the actual prototype HTML
file's live markup as the only acceptable ground truth. Reading that file
directly (rather than the written CLAUDE_CODE_HANDOFF.md spec alone)
surfaced real detail the prose missed - most importantly, that **Settings
renders as a real parent row with a chevron even though it has only one
child** ("Market Rules"), while Overview/Supplier Apps/Orders/Inventory
render flat with no children at all. A naive "one item = flat link" rule
(item-count-based) gets this wrong; the actual rule had to be stated
per-group (`NavGroup.solo`), not derived.

## Nav rail: two-level tree, real badges, two named bugs actually fixed

`PortalSidebar.tsx` was split into `PortalSidebarRows.tsx` /
`PortalSidebarFooter.tsx` / `PortalSidebarFlyout.tsx` (component-size
limits) and rebuilt to the prototype's exact geometry: 60px/268px states,
40px parent rows, 34px/52px-and-68px-indent child rows, the icon-overlay
badge that swaps with an inline pill depending on rail width.

The handoff named two flyout bugs to avoid, and the existing CSS-only
`NavSubMenu` had both: `SidebarContent` sets `overflow-hidden` when the
rail is icon-only, which clips an `absolute`-positioned flyout the moment
it's needed; and pure CSS `:hover` drops the panel the instant the pointer
crosses the icon-to-panel gap. `PortalSidebarFlyout.tsx` fixes both:
`getBoundingClientRect()` + `createPortal` to `document.body` for
positioning (escapes the clip entirely), plus a real hover-intent state
machine (shared close timer, cancelled by re-entering either surface) for
the 220ms forgiving close.

Badges are real where a backend exists and silently absent where it
doesn't - `countCandidateStatusSummary()` (new, grouped `COUNT` query
against `candidate_evaluations`, not a full row fetch) backs Product
Sourcing's six counts; Catalogue's "9", Orders' "4", and Money's "1" from
the mockup have no backend (no `/listings`, no order/payout system) and
are omitted entirely rather than hardcoded - "a missing figure is never a
zero" applied to the nav rail itself, not just page content.

**A real bug found and fixed mid-build:** removing the topbar's
`SidebarTrigger` (per "the rail's own logo is the only toggle") broke
mobile entirely - the rail becomes an off-screen Sheet on mobile with
nothing visible to click until it opens. Restored as `md:hidden`, matching
the prototype's own separate mobile-topbar hamburger.

## Supplier Apps: real connections, one deliberate refusal to match the mockup

`listActiveProviders()` / `listConnectionsBySeller()` (new,
`src/modules/suppliers/repository.ts`) and `mostRecentSnapshotAt()` (new,
derived from `supplier_snapshots.capturedAt` - no connection-level column
stores "last successful sync") replace the old single-`Card`
CJ-only page with the approved per-connection card (identity, four-cell
detail strip, a spine strip stating what the connection is doing to
sourcing right now, and a capability-derived data-access list).

**Pushed back on one part of the approved design rather than matching it
exactly:** the prototype's disconnect confirmation requires typing the
word "DISCONNECT" - a client-side text match with no real protection.
`sals3-portal` already has a server-enforced one-time verification code
(`requestCjDisconnectVerification`/`disconnectCjSupplier`). Bogs agreed:
reskin the dialog to the approved chrome and copy, keep the real code as
the actual gate. Swapping to typed-text-only would have been a security
regression dressed as a visual fix.

**The stranded-connection issue from
[[sals3-session-2026-08-08-part18-supplier-connection-identity-reassignment]]
recurred, live, in front of Bogs.** He tested "Connect" with a real CJ API
key while browsing as the `dev-user` placeholder session; the server
correctly rejected it as already connected, because that exact CJ account
is bound (via the hash-keyed unique index, not by seller) to the real
seller account created by his first Better Auth login. Diagnosed with a
temporary read-only script (not committed) rather than guessed at - two
`seller_accounts` rows, one `supplier_connections` row, confirmed which
one owns it. Resolution this time: log in as the real account instead of
running another reassignment script. **Not fixed, not new** - the same
gap part18 already flagged as open ("no permanent tool exists for this
reassignment; it will recur"), now confirmed recurring exactly as
predicted.

## Product Editor: three polish requests via screenshots

Bogs sent two annotated screenshots asking for: a redesign of the tab
navigation's inline warning badges ("gamitin mo `/ui-ux-pro-max`"), the
Listing Readiness panel's alignment, and a browser/phone device-preview
toggle. Delivered:

- `EditorSectionNavigation.tsx`'s bare coloured icon+text next to each tab
  label (which read as ragged once labels wrapped) now reuses the same
  bounded `StatusPill` every other severity indicator in the app already
  uses, rather than a third ad hoc treatment.
- `ReadinessSummary.tsx`'s Blockers/Warnings/Suggestions rows moved from
  three independent `justify-between` flex rows (aligned by coincidence)
  to one shared CSS grid (aligned by construction), and dropped a
  redundant nested bordered box.
- `DraftStorefrontPreview.tsx` gained a Browser/Phone segmented toggle
  next to the existing "Preview market" control - confirmed with Bogs
  first that this should be a *second*, additive control, not a
  relabelling of market selection into a device toggle (those are
  unrelated features). Toggling changes frame width and swaps a
  browser-chrome dots bar for a phone-notch bar; no content reflows and no
  data is fabricated for either device.

## Overview: most of the approved design has no backend, said so instead of faking it

`/overview` was previously five components fed entirely by
`src/lib/seller-center/mock-data/overview.ts` - a 3-state single money
ledger and a "Growth suggestions" section, both of which conflict with
the approved design's own rules (two rails that never combine; "no
revenue, conversion, or trend metric... any vanity metric card").
Confirmed scope with Bogs before touching it: build all five approved
sections, but only Product Sourcing queues and Supplier Apps health have
a real backend today (reusing the queries built earlier this session,
plus two new ones - `oldestInStatusAgeMs()` and `oldestExceptionAgeMs()`,
both `MIN(updated_at)` scoped by status). The other three - Needs You Now,
Money Position, Recent Supplier Changes - now state plainly what's
missing ("Needs the orders and inventory backend - not built yet") instead
of showing the deleted fixture numbers.

**A real authorization bug found and fixed before it shipped:** the first
draft gated the whole page behind `requireDropshipperAccount()`, which
would 403 any staff role (admin, viewer, seller_staff) with no matching
seller account - a different axis entirely from the page's actual
`overview:read` permission, which every role but `catalogue_reviewer`
holds. Fixed to keep the original permission gate and resolve the seller
account separately, falling back to the honest empty states rather than
throwing when there isn't one.

`OverviewTaskCards.tsx`, `OverviewTodayAtAGlance.tsx`,
`OverviewGrowthSuggestions.tsx`, and `mock-data/overview.ts` deleted -
none of their content survives in the approved design. Two e2e tests that
asserted the deleted fixture content were rewritten to assert the new
real structure instead of being left to rot.

## Verification

`lint`, `format:check`, unit tests, and (for everything before the very
last increment) `build` + the full Playwright suite all pass. The 6
pre-existing `cj-products.spec.ts` failures were confirmed unrelated via a
stash-and-rerun A/B against the unmodified branch before any of this
session's work started - same 6 failures on bare `develop`, an
environment/fixture gap (a fourth "no CJ connection" UI state the test
wasn't written to handle), not a regression.

**The Overview increment's `build`/e2e pass did not run.** Bogs was
actively logged into a live `next dev` session testing the Supplier Apps
and Product Editor work in real time; Next.js locks `.next` against a
second instance in the same directory regardless of port, so `npm run
build` and Playwright's own `webServer` both refuse to start while a
manually-started dev server is running. Verified instead with plain `tsc
--noEmit` (does not touch `.next`) plus `lint`/`format:check`/unit tests,
all clean - the full build/e2e pass for that increment is still owed.

## Still open after this session

- **`/listings` does not exist.** The nav's "Product Catalogue" entry
  links there anyway (disclosed, not hidden) and will 404 until a later
  work order builds the route - the design's own implementation sequence
  puts the shell before the catalogue route.
- **The stranded-connection reassignment gap from part18 is now confirmed
  recurring, exactly as predicted there.** No permanent tool exists yet;
  still requires either logging in as the connection's real owner or
  hand-running a one-off script.
- **Money Position's two rails have no backend.** Rail A needs a
  payment/commission system; Rail B needs a real wallet-balance
  integration - CJ's `/shopping/pay/getBalance` endpoint is verified to
  exist per `hot.md`'s own "Corrected external facts," but nothing in
  `sals3-portal` calls it yet.
- **ADR-007's supplier-change attention/event system is still unbuilt** -
  "Recent supplier changes" and the drawer-based Attention Center both
  depend on it and both still read "not built yet."
- **The topbar rework (breadcrumbs, actionable-only connection warning,
  Attention Center bell) is the next approved work order** - its exact
  prototype markup was already captured while reading the file for the
  nav rail, so that pass should move faster than this one did.

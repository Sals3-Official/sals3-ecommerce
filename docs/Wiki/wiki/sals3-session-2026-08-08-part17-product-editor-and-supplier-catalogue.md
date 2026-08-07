---
tags: [session, sals3-portal, seller-center, product-editor, design-preview]
aliases: [Product Editor Session, Add Product Two Modes]
created: 2026-08-08
updated: 2026-08-08
status: historical
authority: session-note
owner_approved: false
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-session-2026-08-07-part16-storefront-feed-tenant-connection]]"
---

# Session: the Product Editor lands as a second Add Product mode, and the supplier catalogue gets a grid view

Historical record of what happened. Current verified state lives in
[[hot]] - read that for "what's true now," this note for "how it got
there."

## Scope

Bogs supplied a design handoff (`design_handoff_product_editor`) for the
Product Editor - the screen where a dropshipper customizes a prequalified
supplier product before publishing it. The task was explicitly a
**fixture-backed UI prototype**: no persistence, no Drizzle change, no
supplier or CJ call, no server action, no publication pipeline, no
checkout, no new dependency.

Running in parallel in the same working tree, AJ's session rebuilt
`/products` (grid view, peso estimates, rating check) and added a
multi-supplier design preview. Both shipped together at the end.

## The route moved twice before a line was written

The turnover prompt proposed `/products/[candidateId]/editor`. Two rounds
of correction changed that:

1. First proposal was `/design-preview/product-editor/[candidateId]`, to
   match the convention AJ had already established for fixture-backed
   previews. Approved.
2. Bogs then corrected the placement outright: **the Product Editor belongs
   to Catalogue, not Product Sourcing.** Product Sourcing only supplies the
   candidate; the listing and the resulting product belong to Catalogue. So
   it uses the existing canonical route `/listings/new`, and the nav label
   changed from "New listing" to **"Add Product"**.

That route was not empty - it already held a shipped, tested blank
essentials-first wizard with four components and three Playwright tests.
The collision was surfaced rather than steamrolled, and Bogs chose
coexistence: bare `/listings/new` keeps the wizard, `?fixture=<key>` opens
the editor. That is also the honest product model - Add Product has two
entry modes, blank or prefilled from a supplier candidate.

**A third correction came after it was working.** The editor was only
reachable by typing a query string. Bogs, pointing at the nav item: *"putang
ina dapat andito yan eh."* He was right. `Add Product` now carries `Blank
product` and `From a supplier product` sub-items, and the blank page opens
with the same two-card choice. Two Playwright tests now click their way in
from both, so it cannot silently regress to URL-only again.

## Corrections applied to the handoff

The prototype was recreated, not copied, and five things in it were
deliberately changed:

- **A required specification was shown as a publishable warning.** The
  prototype's `PASS_WITH_ATTENTION` fixture had "Water resistance" as
  `required` with copy saying publication was not blocked. That is
  incoherent. Requirement became a three-way rule enforced in `derive.ts`:
  required unresolved is a blocker, recommended is a warning, optional is a
  suggestion. The fixture's attribute moved to recommended, and a genuinely
  missing required attribute was added to the BLOCKED fixture so the
  blocker path has a real case.
- **A market the seller has not enabled was rendered as a full shipping
  evidence card.** Replaced with one neutral sentence and a count. A
  disabled market is not part of the listing's shipping configuration.
- **A visible "DESIGN ANNOTATION" block** explaining checkout and
  `OrderLineSnapshot` sat inside the seller-facing UI. It is now a code
  comment and a test name. Sellers do not read engineering notes.
- **The prototype's fixture/viewport/lifecycle control strip** was not
  reproduced. It belongs to the design artefact.
- **The sidebar-width problem the handoff flagged as unsettled** was solved
  with container queries rather than by collapsing the seller's rail. The
  editor responds to its own container width, so the panels fold into
  drawers exactly when the space runs out. This route never overrides the
  sidebar.

## What the structure enforces

These are in `src/lib/seller-center/product-editor/derive.ts` and its
types, not in review comments:

- An unknown amount stays `null` to the component and renders as words -
  "Needs route check", "Not available" - never `0`. Missing freight must
  not silently become a zero that flows into landed cost and margin and
  makes an unshippable product look profitable. Two currencies are never
  added.
- No provider or currency appears in a type or field name. CJ is the
  current fixture provider; a second Supplier App needs fixtures, not a
  component rewrite. Money is `{ amountMinor, currency }` throughout.
- A blocked product never looks publishable: the button stays visible and
  prints why, rather than being quietly greyed.
- Supplier changes and accepted orders are described separately in the
  same words everywhere (ADR-007). A listing may be updated, warned, paused
  or delisted; an accepted order keeps what it was accepted with.

## The `loading.tsx` finding

A loading skeleton was added, then removed, and the reason is worth
keeping.

`loading.tsx` puts the segment behind a Suspense boundary, so Next streams
the shell and commits a `200` before the page body runs. `notFound()` then
renders the **404 page under a 200 status**. Measured, not assumed:
Playwright reported `Received: 200` for `?fixture=not-a-fixture`. Moving
the check into `generateMetadata` did not help either.

An unknown fixture key - or a real candidate id passed as one - answering
`200` would tell every non-human consumer that a fictional product exists.
The skeleton was dropped, the reason is a comment in `page.tsx`, and the
e2e test asserts the status rather than the body so it cannot come back
unnoticed.

## Unreachable states, without a control strip

Save-failed, validation-failed, connection-unavailable and session-expired
are real UI that a fixture-backed screen cannot reach - there is no save to
fail and no connection to drop. Rather than reproduce the prototype's
visible control strip, a development-only `?state=` parameter enters them.
Allow-listed, falls back to idle on an unrecognised value, adds nothing a
seller would ever see, and is testable.

## AJ's half

`/products` gained a table/grid toggle carried in `?view=`, product cards,
a stat header, a per-row peso conversion popover and a rating-check action.
`productsPageQuerySchema` was kept separate from `cjQuerySchema` because
the latter is also the storefront feed's contract and has no "view"
concept.

`cjProductPageUrl()` infers a public CJ product URL from `pid` alone. Its
own comment is explicit that CJ's `/product/list` returns no URL field, so
this is CJ's known page shape and not a verified value - a 404 there is the
function being wrong, not the product being gone. Worth watching.

Also `/design-preview/all-supplier-products`: the provider-neutral
multi-supplier redesign against isolated fixtures, `robots: noindex`, not
linked from the sidebar, reading no database or supplier adapter.

## Two environment traps that cost real time

Both produced failures that looked like code regressions and were not:

- **A stale `next dev` server.** `next build` overwrites `.next`, which a
  running dev server is also using, so its chunk manifest goes stale and
  nothing hydrates. Every click-then-assert test across `/payouts`,
  `/orders`, `/overview` and `/listings/new` failed while server-rendered
  assertions passed. Killing the leftover server fixed all ten. If
  interactivity tests fail app-wide and nothing else does, suspect the
  server before the code.
- **`lint-staged` dropped a staged file from disk.** Committing in slices
  with a large untracked tree present, its stash/restore cycle deleted
  `CjRatingCheckButton.tsx` from the working tree while leaving it staged.
  Recovered with `git checkout --`. The fix was to stage everything so
  there is nothing to stash, at the cost of a tidier history - recorded in
  the commit message.

## Verification

`lint`, `format:check`, `typecheck:clean`, `build`, **259 unit tests** and
**46 Playwright tests** all pass. `npm audit --audit-level=high` reports no
high or critical advisories (4 moderate, all in `drizzle-kit`, a dev
dependency).

`.claude/` was gitignored - per-person agent state, and the last remaining
`format:check` failure.

## Still open after this session

- **The editor persists nothing.** No server action, no endpoint, no
  publication backend, no media upload or storage, no HTML sanitiser. Every
  change lives in the tab.
- **`?supplierCandidateId=` is parsed and acknowledged, never answered with
  fixture data.** Wiring it to a real candidate is the next real step and
  needs persistence first. Deciding when this stops being a design preview
  is the next big call.
- **`CustomizeAndListButton` still says the Product Editor does not
  exist.** True when written, stale now. It should point here once the data
  is real; wiring it to fictional data would misrepresent a real candidate.
- **No loading skeleton**, deliberately - see above. Revisit only by
  validating the key in a parent segment and streaming below it.
- The margin floor, the image-quality minimum, the watermark check and the
  duplicate-image state are **UI states, not implemented pipeline rules**.
- Markets are still `Sample market A / B`. No destination market is
  approved (ADR-003), so no country is hardcoded anywhere in the editor.
- `cjProductPageUrl()` is unverified against a live CJ page - CJ's bot
  check blocked confirming one.

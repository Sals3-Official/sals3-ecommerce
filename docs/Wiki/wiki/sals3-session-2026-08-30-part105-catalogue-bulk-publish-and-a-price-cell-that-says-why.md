---
tags:
  - sals3
  - sals3-portal
  - catalogue
  - pricing
  - session-note
aliases:
  - Part 105
  - Catalogue Bulk Publish And A Price Cell That Says Why
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-30-part98-the-drafts-that-could-never-be-priced]]"
---

# Part 105 — bulk Publish, an honest price cell, and a screen that shows its own writes

2026-08-30, `sals3-portal`
[#271](https://github.com/Sals3-Official/sals3-portal/pull/271)/[#277](https://github.com/Sals3-Official/sals3-portal/pull/277),
no DDL in either.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## Bulk Publish, and the result panel is the actual work

#271 let the owner select many drafts and publish them in one action —
`publishProductAction` already existed and the row already called it, this
is the same action over a selection. It runs **sequentially, not
`Promise.all`**: publishing writes revisions, offers and slugs, the action
is rate-limited to 30 calls a minute per seller, and firing twenty at once
would spend that budget in a burst and turn a queue problem into
`rate_limited` refusals that read like product problems.

The result panel, not the button, is the feature. Publishing is refused per
product for one of eighteen named reasons (no supplier cost observed, no
Sals3 category, no approved image, a retail price under the 2.5% floor, no
active market profile). A toast saying "2 failed" names no product and no
reason and disappears before it can be read; every outcome — successes
included — is listed and stays until dismissed, because "1 refused" leaves
the other four ambiguous. Rows with no stored version are excluded rather
than sent, since publishing compare-and-sets on that version and would
otherwise come back `invalid_input`.

## The Selling Price cell stopped pretending it was editable

The pencil on the Selling Price cell only ever raised "Editing price isn't
built yet" and was never going to be built: a seller does not type a price
here — Market Rules resolves it from observed cost and the destination's
margin under a 2.5%-over-cost floor, and a per-row box would either
contradict that engine or become an unaudited, un-expiring override, which
is exactly what `Edit Special Price` exists for in one place. What replaces
the pencil is an answer the row already had: `product_offers` carries
`pricing_unavailable_reason`, non-null under a check constraint whenever
pricing is `UNRESOLVED`, and the catalogue read model was reading the whole
offer row and discarding that column while printing "Not available" — so
the one cell a seller checks before publishing could not say why publishing
would be refused. It now reads "Not set" with the reason beneath it, mapped
through a `Record` over `PricingUnavailableReason` so a new resolver reason
fails to compile here rather than shipping a blank cell.

## A pause that worked and did not look like it

#277 answered the owner's question of whether Pause inside More actually
works: it does — `unpublishProductAction` is real and revalidates
`/listings`, and the listing genuinely leaves the storefront. What did not
work was the screen. `ProductCatalogueWorkspace` keeps its rows in
`useState(initialProducts)` so preview-only bulk actions can move them, and
`useState` ignores its argument after the first render — so the write
landed, the revalidation returned new props, and the component threw them
away: the toast said Paused while the row still read Live until a hard
reload. **The bulk publish shipped the same week had the identical blind
spot.** Fixed with React's documented pattern for adjusting state from a
changed prop — compare during render, adjust, re-render immediately, no
effect and no extra commit — deliberately discarding any in-progress local
preview edits when it fires, because the server outranks what the tab was
pretending.

Also in #277: `AUTO_PAUSED` is now labelled "Paused" everywhere a seller
reads it, with `pauseReason` distinguishing system-paused from
seller-paused on rows that carry one (the stored enum value is untouched —
renaming a persisted code to fix a label would be a migration to fix a
word); Edit moved into the More menu as a real `Link` rather than an
onClick item, keeping middle-click and open-in-new-tab; `Edit Special
Price` was removed outright, leaving no way to override a resolved price
from this screen at all — stated as a real gap rather than hidden; Publish
is hidden (not disabled) on Live and Live · Needs Attention, and excluded
from a mixed selection on All so a bulk publish over live-plus-draft rows
touches only the drafts; and a header Select All checkbox is scoped to the
current tab and filters, never the whole catalogue.

## Lessons

- **`useState(initialProducts)` silently freezes a screen against its own
  server writes.** The write and the revalidation both succeeded; the
  component simply never looked at the new props again. Compare-during-render
  is the documented fix, not an effect.
- **A blind spot in one feature is a blind spot in the feature built the
  same shape the week before.** Bulk Publish and Pause shared the exact
  defect because both moved rows through the same stale local state.
- **A column already being selected and already being discarded is a free
  fix.** `pricing_unavailable_reason` needed no new query — only for the read
  model to stop throwing it away.
- **A control that always raises "isn't built yet" is worse than no
  control.** Removing the pencil and the Edit Special Price affordance made
  the actual capability (or its absence) visible instead of promising a
  feature that would never ship where it appeared to live.

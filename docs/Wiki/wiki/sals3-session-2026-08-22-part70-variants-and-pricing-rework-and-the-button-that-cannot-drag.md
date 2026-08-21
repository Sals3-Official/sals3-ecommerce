---
tags:
  [
    sals3,
    session-note,
    sals3-portal,
    product-editor,
    variant-matrix,
    seller-center,
    ui,
    accessibility,
    adr-007,
    adr-011,
    adr-013,
  ]
aliases:
  - Part 70
  - Variants and Pricing Rework
  - The Button That Cannot Drag
created: 2026-08-22
updated: 2026-08-22
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-15-part47-option-mapping-wiring-and-supplier-change-detection]]"
  - "[[sals3-session-2026-08-18-part52-variant-matrix-category-suggestions-and-catalogue-truth]]"
  - "[[sals3-session-2026-08-21-part60-retail-price-above-supplier-cost]]"
  - "[[sals3-session-2026-08-22-part67-the-catalogue-column-that-was-doing-nothing]]"
  - "[[agent-operating-contract]]"
  - "[[nextjs-component-security-code-rules]]"
---

# Part 70 — Variants & Pricing reworked, and the button that cannot drag

One request — *"adapt this style"*, pointing at a marketplace seller centre's
Variations editor — became five merged `sals3-portal` PRs over one session, each
one an owner correction of the last. **No DDL, no migration, and no local
database write in any of the five**: `git diff` over `src/lib/db` and `drizzle/`
is empty across the whole arc, and `0027_many_lockjaw.sql` is still the latest
migration. The standing never-migrate-the-local-DB rule was never approached.

`sals3-portal` [#171](https://github.com/Sals3-Official/sals3-portal/pull/171),
[#173](https://github.com/Sals3-Official/sals3-portal/pull/173),
[#175](https://github.com/Sals3-Official/sals3-portal/pull/175),
[#177](https://github.com/Sals3-Official/sals3-portal/pull/177),
[#178](https://github.com/Sals3-Official/sals3-portal/pull/178) — all merged.

## The arc, in the owner's own words

1. *"adapt this style … wag mo damage ang functionality"* → #171.
2. *"ibahin mo ng konti para di mukang cinopy. dapat ano inspiration lang"* →
   the same PR reworked before merge.
3. *"dapat dito na din banda nakakapag upload ng variations pictures"* → the
   photo strip in #171.
4. *"gawin mo to na ddrag para madali i reposition"* → #173.
5. *"alisin mo na yung upward downward arrow kung may drag button na"*, then
   *"⋮⋮ grip - eto lang dapat meron"* → #173 again.
6. *"kala ko gagawin natin na parang ganito yung sa variants kung saan
   nakakapglagay ng price?"* → #175.
7. *"hindi ba pwedeng pag iisang kulay lang ay isa lang ang naka sulat? … parang
   naka merge like sa excel?"* and *"i center mo. nakaka bother"* → #177.
8. *"pero ang pangit"* → a design canvas, three directions, *"i want C"* → #178.

## Inspiration, not transcription — and the difference was made explicit

The first pass borrowed the reference UI's shapes faithfully enough that the
owner called it a copy. What replaced it kept the *ideas* and rebuilt every
visible decision in this editor's own vocabulary:

- **`Variation N` → the editor's own `Option`.** Seller-facing copy had already
  been moved off "Option groups" onto **Variant Matrix** on 2026-08-17; importing
  a third noun would have undone that. The card header became a gradient ordinal
  chip plus the axis name **once the seller supplies one**, so a named card reads
  `1 · Colour` and only an unnamed one falls back to `Option 1`.
- **A grey header band → no fill.** The portal separates a card header with a
  hairline and the gradient rule above it.
- **A full grid of vertical rules → no rules at all.** Instead `Supplier cost`
  and `Supplier stock` are recessed onto the muted surface — they are the two
  read-only numbers sitting either side of the one number a seller does set, and
  `VariantMatrixValueRow` already recessed the locked supplier token exactly that
  way. The table came to read as **three zones** rather than one grid: identity,
  the seller's own fields on white, supplier evidence recessed. That split
  follows *who owns each value*, which is why the rules were unnecessary.
- **A form asterisk → the editor's own dot**, so the table and the matrix above
  it use one marker language.
- **`Variation List` → `Variants`**, matching the section it sits in.

The reference UI's inline `Price / Stock / SKU` + apply-to-all row was
deliberately **not** adopted, twice over: supplier stock is read-only evidence
here (ADR-013) rather than a number a seller sets, and the bulk dialog is one of
the three places the 2.5% retail-over-supplier-cost floor is enforced — it states
its blast radius and disables **Apply** against the highest affected cost. An
inline field would either duplicate that guard or ship without it.

## The finding worth keeping: a `<button>` is not a drag source

The grip was first built as a single control that was both a `dropdown-menu`
trigger and `draggable`. It did not drag, and **the menu library was not the
reason**. A spike against a bare `<button draggable="true">` with nothing else on
it never fired `dragstart` in Chromium, while identical markup as a `<span>` did:
Chromium treats a button's mousedown as a press, not as the start of a drag.

That one fact decided the final shape. The grip is a focusable
`<span role="button">` — a span so it can drag, a role and a tabindex so it can
be operated without a mouse, with ArrowUp/ArrowDown on the grip itself and the
keys named in its accessible label, because a grip hints at nothing on its own.

**Accepted gap, on the owner's explicit call after the objection was raised
twice:** native HTML5 drag events fire from neither a keyboard (WCAG 2.1.1) nor a
touchscreen, and WCAG 2.5.7 wants a single-pointer alternative to dragging. With
one control on the row and no arrow keys on a phone, **the order of Variant
Matrix values cannot be changed on a touchscreen.** Closing that needs
pointer-event dragging (`pointerdown`/`pointermove` with `touch-action: none`)
rather than the native API — a real change, not a prop. Recorded in
`VariantMatrixValueRow` so the next reader does not rediscover it.

A failure mode disappeared with the arrows. `keepFocusOffDisabledArrow` existed
because an arrow disables at its end of the list and `disabled` on the focused
element makes a browser drop focus to `<body>`; the grip is never disabled and a
move off either end is ignored, so the helper is **deleted**.
`DescriptionBlockEditor` still renders a disabled-at-the-ends arrow pair and
still has the underlying problem — it never used this helper, and fixing it there
is its own change.

## Photos per option value: what the data model allows, and a correction

The owner asked for a picture per colour. The blocking facts:

- `product_media_sources.variant_id` is **one** nullable column, and
  `assignVariantMedia` *moves* the pointer rather than copying it — one media row
  points at one variant.
- `product_media_sources_product_checksum_key` is unique on
  `(product_id, checksum)`, so the same file cannot be repeated inside a product.

Together: one photo cannot belong to the four variants carrying `black` without
new DDL, on a table written by draft creation, publication, every seller upload
**and** the supplier mirror — where Drizzle names every column of a table in its
`INSERT`, which is why that schema file already carries its own
`Neither column may be added to this schema before its DDL is applied to
production` warning.

What made a per-value photo possible anyway, with no schema change:
**`product_variant_option_values` already existed and the read model already
joined it** to build `optionLabel`. One field — `optionValueId` — was added to
that existing `select` (no extra query, no new column surface, since the join
already referenced it), so `mappedAxes[].values[].variantIds` now carries the
link and `resolveVariantValuePhotos` derives each value's photo from client-side
`variants`.

> [!IMPORTANT] A claim from earlier in this session, corrected
> I twice argued that a group-level photo would leave "the other three Black
> variants photoless **on the storefront**". That was overstated. Checked
> against `modules/catalog/storefront/read-model.ts`: the PDP gallery is
> **product-level**, and variant-tagged media only sorts *after* it — there is no
> per-variant buyer gallery today. The real exposure is narrower and it is the
> **frozen order-line image** (ADR-007): a line for a different size of the same
> colour falls back to the product primary. The decision changed once the fact
> was checked rather than remembered.

## The table's final shape (#175, #177, #178)

For a **mapped** product:
`Colour · List · Size · Sals3 SKU · Supplier cost · Retail price · Supplier stock
· Attention`.

- The first axis **leads** and its cell is a rail: the group's photograph beside
  the colour name, recessed onto the page background, closed with a rule, edged
  with the brand gradient the Variant Matrix cards and the listing switch
  already use. Owner-picked from three drafted directions.
- Rows of one colour **merge into it**, `rowSpan`-style, with `4 × Size` under
  the name. `× Size`, not `4 sizes`: an axis name cannot be safely pluralised —
  `Capacity` would become `capacitys` — and `×` is already this editor's word for
  it in "Mapped as Colour × Size".
- The separate `Image` column is **gone**: one colour is one photograph, so a
  36px cell beside a colour name was two cells saying one thing. The rail's
  thumbnail is 44px, because 36px reads as dropped in a cell as tall as a whole
  group.
- The chips are gone: the axis name is the **header**, the cell holds the value
  alone, so the name stopped repeating on all sixteen rows.

An **unmapped** product is untouched — `BASE_COLUMNS` with `Image` and one
`Variant` column, the supplier's label whole. There is no axis to lead with.

Three rules the split rests on, each carrying its reasoning at the point of
change:

1. **`resolveVariantAxisColumns` refuses rather than guesses.** The split is
   offered only when *every* variant parses into the same axis names in the same
   order. Columns taken from the first row would silently drop a value from any
   row shaped differently, with nothing on screen saying a column is missing. One
   disagreement falls the whole table back to a single `Variant` column. That
   also covers the unmapped product for free (a raw supplier token has no `": "`
   pairs) and a value containing a colon (only the first `": "` splits a pair).
2. **Runs are consecutive.** A `rowSpan` can only merge adjacent rows, so a run
   closes the moment the value changes; collecting every `Black` wherever it sits
   would span rows it does not cover and break the table. The read model orders
   variants by matrix position, so the runs come out whole — and if that ever
   changes, this degrades to more, shorter groups rather than to a wrong table.
3. **A group stops merging while one of its own rows is expanded.** Found by
   looking at the running page. The span otherwise has to cover the injected
   supplier-evidence row, and a cell *centred* across that lands **inside** it —
   the colour label printed over the evidence text. Top-aligning only hides the
   collision, and the owner had already rejected top-aligning on sight
   (*"i center mo. nakaka bother"*). Expansion is transient, so the group falls
   back to one cell per row until it closes, which also removed the span
   arithmetic the evidence row otherwise forces.

**No new write path was needed for arbitrary reordering.** `move()` already lifts
before it inserts, so it accounts for the post-removal shift and handles any
from→to; `moveValueTo` only adds a second way to say where. And
`renameOptionMapping` already writes `position` in two passes — every value of
the axis is lifted above its own maximum before final positions are assigned,
emptying the whole `0..n-1` range — so it accepts **any permutation**, not only
the adjacent swaps the arrows could produce. Confirmed in that file's own
comments rather than assumed.

## Verification that actually caught things

Every PR ran the full `npm run verify` (ending at **2539 unit / 79 e2e** on the
last one) and every one was also loaded in a real browser. The browser is what
found the defects; the diff found none of them:

- `2 size` — a wrong plural, from lowercasing an axis name.
- The duplicate column header reappearing mid-list when the two-up value columns
  stack below `lg`.
- A `Size photos` row that meant nothing: nothing about a *size* has a picture,
  and Sals3 cannot know which axis carries appearance — the same limit that stops
  it naming the axes in the first place.
- The merged cell colliding with the expanded evidence row.
- `<button>` not dragging at all.

**The decisive assertion for a merged table is a shape check, not a string.**
Every body row's `colSpan` is summed and compared: `10, 8, 10, 8, 10, 8` merged,
`10, 10, 10, 10, 8, 10, 8` with a row expanded, `9, 8, 9, 8, 9, 8` after the rail
landed. A broken table is a shape error, so that is what is asserted.

One test earned its place by failing: an `sr-only "(required)"` added to a column
header made the header's accessible name `Retail price(required)`, which is what
a table announces on every column move and what `ProductEditor.test.tsx` queries
the header by. Required-ness belongs on the field, not in a column heading, and
the authoritative signal was already text elsewhere — the readiness panel names
the publish gate and `publishProduct` refuses with it. Reverted.

## Process, two failures worth recording

**A commit pushed to a branch whose PR was already merged.** The rail work went
onto `feat/variant-table-merge-colour-rows` after PR #177 had merged, so it sat
on a closed branch and reached nothing; the polling loop read `mergeable:
UNKNOWN` and I did not draw the conclusion. **The owner caught it, not me**
(*"gagu wala ka naman na cocommit for PR"*). The fix was a fresh branch off
current `develop` with the work cherry-picked and re-verified there — which is
also the only way the change gets tested against what actually shipped meanwhile.
Check the target PR's `state` before pushing a follow-up to its branch.

**Two other sessions were editing the shared clone throughout.** `E:\sals3-portal`
was found mid-edit with another agent's Product Catalogue work uncommitted
(`PublishProductButton.tsx` deleted, `CatalogueRowActions.tsx` new, timestamps
minutes old). A `git checkout` there would have clobbered it, and the pre-commit
hook runs the full `verify` over the whole tree, so their work-in-progress would
also have polluted my runs. Everything from #173 onward was built in an
**isolated worktree** off `origin/develop`. Two worktree gotchas: a `node_modules`
junction is refused by Turbopack (*"Symlink node_modules is invalid, it points out
of the filesystem root"*) so a real `npm ci` is required, and a `design/` folder
left inside the repo is picked up by `format:check`.

## The design canvas

*"pero ang pangit"* was answered with a canvas rather than another guess: three
genuinely different directions — **A · Group band**, **B · Card per colour**,
**C · Leading rail** — each with its motivation and its tradeoff written on a
sticky note beside it, plus a note stating the three reasons the shipped version
read badly. The owner picked C. Option B is worth remembering as the road not
taken: one card per colour needs **no `rowSpan` at all**, so the merge-versus-
expanded-row collision cannot exist there; its cost is that prices stop lining up
across colours.

## Open, and deliberately not built

- **A true per-value photo** — one picture for `Black` regardless of size, which
  is what a buyer-facing colour swatch would need. Needs its own column or join
  table, its DDL applied to production **before** the Drizzle schema learns it,
  plus the storefront read model and the PDP to consume it. Noted in
  `VariantMatrixAxisCard`.
- **Touch reordering** of Variant Matrix values (above).
- **Discoverability of the value rows.** On a mapped product the Variant Matrix
  shows a read-only summary, and the value rows — with the grip — exist only
  behind **Edit names**. So repositioning a live listing is scroll → Edit names →
  drag → Save names. The owner asked why nothing had changed on production and
  this was the answer, not a bug. Two ways out were offered and neither is
  chosen: render the value rows order-only in the summary, or make the photo
  strip's chips draggable.
- **A pre-existing hydration mismatch** on `RetailPriceInput`'s `caret-color`
  style, logged by the dev server. Observed in runs from before this branch;
  **not introduced here**, and not investigated.
- **`sals3_order_lines` / order-line image** exposure from a group photo, above.

## Standing rules this session did not bend

No CJ call was added anywhere (ADR-017). Supplier cost, supplier stock and
variant identity stayed read-only (ADR-013). The 2.5% retail floor stayed in the
bulk dialog. No dependency was added — the drag is `draggable` plus four event
handlers, no `dnd-kit`, no `react-beautiful-dnd`. And nothing was deployed,
published, or merged without the owner asking.

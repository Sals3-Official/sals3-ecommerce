---
tags:
  - sals3
  - sals3-portal
  - product-editor
  - description
  - publish
  - variant-mapping
  - taxonomy
  - session
aliases:
  - Description Full Editor
  - Simple Text Mode
  - Shared Publish Gates
  - Part 59
created: 2026-08-19
updated: 2026-08-20
status: current-state
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-18-part52-variant-matrix-category-suggestions-and-catalogue-truth]]"
  - "[[sals3-session-2026-08-18-part54-description-blocks-images-and-variant-matrix-rename]]"
  - "[[sals3-session-2026-08-19-part57-margin-inheritance-market-rules-rebuild-and-eleven-merged-prs]]"
  - "[[sals3-session-2026-08-19-part58-aj-buyer-orders-api-status-sync-and-the-frozen-line-image]]"
  - "[[storefront-product-contract-v2]]"
---

# Sals3 session 2026-08-19/20, part 59 — the description editor rebuilt, and the publish gates the panel never knew

Twelve merged `sals3-portal` PRs across one session. Two arcs, and the second
one only started because the owner clicked something on the deployed screen.

| PR | What |
| --- | --- |
| [#133](https://github.com/Sals3-Official/sals3-portal/pull/133) | Description on its own full-screen editor; paragraph bold/italic as marks |
| [#136](https://github.com/Sals3-Official/sals3-portal/pull/136) | Simple text mode beside the designed layout, with a toggle |
| [#138](https://github.com/Sals3-Official/sals3-portal/pull/138) | Simple mode stripped back; photos retained across a switch |
| [#144](https://github.com/Sals3-Official/sals3-portal/pull/144) | Section save button; renamed labels no longer need a manual refresh |
| [#147](https://github.com/Sals3-Official/sals3-portal/pull/147) | Three things the Description section said or offered wrongly |
| [#148](https://github.com/Sals3-Official/sals3-portal/pull/148) | The readiness panel blocks a missing Sals3 category, as publish does |
| [#150](https://github.com/Sals3-Official/sals3-portal/pull/150) | One gate catalogue shared by `publish.ts` and the readiness panel |
| [#152](https://github.com/Sals3-Official/sals3-portal/pull/152) | Gate predictor reads live state; variants list automatically |
| [#154](https://github.com/Sals3-Official/sals3-portal/pull/154) | The one gate condition #152 failed to convert |
| [#155](https://github.com/Sals3-Official/sals3-portal/pull/155) | A Variant Matrix for a single-variant product too |
| [#156](https://github.com/Sals3-Official/sals3-portal/pull/156) | Variant Matrix copy for the single-variant case |
| [#157](https://github.com/Sals3-Official/sals3-portal/pull/157) | Offer every axis name the workbook names, not just the first |

> [!IMPORTANT] The lesson this session actually taught
> `npm run verify` was green over **two** shipped defects, and the owner found
> both by pressing a control. Every test in `ProductEditor.test.tsx` seeded
> state and rendered once. **None exercised change** — which is the only thing
> a live editor does. A green suite proved the screen was right at the instant
> it loaded and said nothing about the instant after.

---

## 1. The description got its own screen

The owner's brief was a Lazada-style full-screen editor. The toolbar in that
reference could not be copied: the description document is an allow list with
no `html` block, `MARKUP_OPENER` **rejects** markup-shaped input at the server
boundary rather than escaping it, and no sanitiser exists anywhere in the
system. The v3.1 PDP build spec says so outright — *"do not build a rich HTML
editor."*

What was buildable is the part of that reference carrying the value: **component
composition on a page-shaped canvas**. Lazada's own left rail is a block
palette; the toolbar is only there because the storage is HTML.

`/listings/[productId]/description` lives in a new `(studio)` route group with
its own pass-through layout. Layouts nest, so a child of `(portal)` could only
ever *add* chrome to the rail — here the rail is genuinely absent.

The canvas is set to the **PDP v3.1 target** measurements (70ch, 15px/1.7,
Outfit headings, images breaking out at 16:9 alone and 4:3 in a run), not the
14px the storefront renders today. Calibrating to what ships would mean
rebuilding it the week the redesign lands.

### Emphasis as marks, never markup

Paragraphs gained bold and italic through an optional
`runs: { text, marks }[]` beside `text`, with `marks` a closed enum
(`strong`, `em`) that `InlineRunsText` turns into real elements. No parser, no
`dangerouslySetInnerHTML`.

Two properties make it safe to ship before the storefront reads it:

- **`text` stays canonical and `runs` stays optional.** A reader that knows
  nothing about marks renders every word and loses only the emphasis — the
  opposite of the `image` block, which the storefront's four-member union drops
  whole.
- **`runs` must join to exactly `text`**, enforced at the document level.
  Otherwise the two fields could describe different sentences and which one a
  buyer saw would depend on their renderer.

Editing is a `<textarea>` styled to the page's own type, not `contentEditable`:
a textarea cannot hold markup, so the allow-list posture survives every paste,
and its selection API is the integer offsets the mark logic needs.
`contentEditable="plaintext-only"` is the obvious future move but only reached
Firefox 136. **No new dependency** — no Tiptap, ProseMirror, Lexical, or Slate.

A latent bug surfaced in the same pass: `prepareBlocksForSave` trimmed
paragraph text but would have left stale `runs` behind, failing the join
invariant on any paragraph ending in a space. Both editors save through that
seam.

## 2. Simple text, and what "simple" had to mean

Most sellers want one box. #136 added it beside the designed layout with a
toggle, both writing the same stored document — simple text is a *view*, not a
second schema.

The owner then made two decisions that pulled against each other, and resolving
them is the interesting part:

1. **Simple text publishes exactly what it shows** — paragraphs only.
2. **Switching to simple must never destroy a photo** saved in the designed
   layout.

Together those mean **the content can no longer say which mode a document is
in**: a simple-text document may legitimately hold photos it is not publishing.
So `mode: 'simple' | 'design'` became a stored field on the description
document — in the same JSONB column, so **no migration**, exactly as `runs`
needed none.

That is a flag which could in principle disagree with its content, which the
earlier design deliberately avoided. The trade was made knowingly: a flag that
decides *what publishes* records a seller's stated intent, and honouring it
costs less than deleting an upload they spent time on.
`publishableBlocks(blocks, mode)` is the only place it changes an outcome, and
the storefront read model is its only caller.

Also removed on owner instruction: the upload button and the prompt chips
inside simple mode. An upload there could only produce "the photos you
uploaded, in that order, after the text" — a worse version of what the designed
layout does properly.

### The bug that only a keystroke could find

Deriving the textarea's value from the document made **a trailing space
impossible to type**: storing trims each paragraph, so the space round-tripped
away in the same keystroke that produced it. The field now holds its own text
and reconciles against its **own projection**, never its raw value.

## 3. The publish gates the panel never knew

The second arc began with one owner sentence: *publication should be blocked
without a real Sals3 category*.

The server already did it. `publish.ts` had refused `SALS3_CATEGORY_REQUIRED`
since the 2026-08-20 decision, mirror codes included. **The editor was the
problem** — its readiness panel still carried the 2026-08-15 decision: a
`WARNING` whose explanation read *"Publishing without one is allowed."*

Auditing that one contradiction exposed the general case:

> `publish.ts` refuses a listing for **eleven** distinct reasons. The readiness
> panel knew **three**. The other eight were reachable only by pressing Publish
> and reading the failure.

Three facts pinned it: the database read model produced **zero** blockers, every
refusal reason appeared in exactly one client file — `PublishProductButton`'s
after-the-fact message map — and no dry-run of the gates existed anywhere.

### The fix is structural, not eight more conditions

`@/lib/products/publish-gates` now carries every gate's seller-facing title,
explanation, resolution, and editor section, and **`PublishRefusal` is derived
from its keys**. A gate `publish.ts` learns to refuse without copy there is a
compile error rather than a silent ninth omission. That the type binding
compiled clean is itself the proof the two sets matched.

**The evaluation is deliberately not shared.** `publish.ts` decides inside a
transaction with the pricing resolver, the market capability boundary, and
per-variant offer and media rows in hand; the editor has a projection. One
function serving both would mean weakening the server's checks to what a client
can see, or claiming on the client a certainty only the server has. The server's
logic was not touched.

Six gates are predicted, five are not, and **each exclusion states what it is
missing** rather than being quietly dropped. The governing rule:

> Over-warning is the failure to fear. A missing warning costs a seller one
> refused Publish — the same refusal they would have got anyway. A false
> blocker stops a listing that could have gone live, and cannot be argued with.

Verified against the fixtures: `pass` and `attention` predict **no** gate, which
is the safety property; `blocked` gains `No variant is listed`, which is true of
it and which publish would have refused on.

## 4. Two defects the owner found by pressing a control

**The toggle that looked broken.** Switching a variant on flipped
`aria-checked` and moved `0 of 1 will list` to `1 of 1`, and `No variant is
listed` stayed in the panel. The predictor was reading `fixture` — the page-load
snapshot — while the retail-price check beside it read live state.

**And then #152 did not actually fix it.** Three of its four conditions
converted to live state; the fourth did not, and it was the one the owner had
hit. The cause is worth recording: the edit was applied by string replacement
**without asserting the pattern matched**, and Prettier had already reformatted
that line across two lines, so the replacement silently did nothing while the
three asserted ones landed. *A no-op that reports success is indistinguishable
from a change until something reads the file back.*

#154 fixed it and added the test that was missing all along — one that clicks
the switch off and on and asserts the gate follows. It was run against the
reintroduced bug to confirm it fails first.

The same session also made variant listing automatic (`autoListVariants`),
replacing two bulk buttons that asked a seller to press for a state the data
already settled. The invariant those buttons carried in their own copy survives
and now has a test: **a blocked or paused variant is never switched on.**

## 5. The Variant Matrix for one variant

Owner decision: a matrix should appear even with a single variant.
`deriveOptionSplit` refused fewer than two on the grounds that "a grid needs two
rows" — which answered a question nobody was asking. The matrix exists to let a
seller say **what a buyer reads**, not to prove a grid.

Two rules had to be scoped rather than removed:

- **The constant-position filter** drops a position holding one value, because
  offering it would invent a decision the buyer never has. With one variant
  *every* position holds one value, so it returned an **empty** matrix. It now
  applies only where there is a real choice to protect.
- **Publication is not gated.** A single variant can carry a concatenated label
  (`Army Green-XL`); letting that reach `optionMappingRequiredButMissing` would
  newly refuse every live one-variant product until somebody named its axes. The
  read model mirrors the exemption.

## 6. A suggestion that was half-reported, not wrong

The deployed screen offered `Use "Colour"` beside a **bamboo** drawer
organizer. The workbook was checked before anything was changed, and it already
said:

```
CAT-GGL-8058  tier1Families: ["COLOR", "MATERIAL"]
              tier2Families: ["SIZE", "CAPACITY"]
```

`axisNameForFamilies` keeps only the first match. The suggestion was
half-reported; the sheet had named the better one all along. The first-token
rule was reasoned as "a joined label would recreate the verbose-label problem" —
an argument about producing one *string*, which never justified discarding the
rest.

Each name is now its own button, the seller picks, and **no owner-authored data
was edited to suit one product.** The test asserts against the real extract, so
a future workbook change that drops `MATERIAL` from that category fails it —
correct, because the subject is data, not logic.

## 7. What is still not done

- **Nothing here was verified in a browser by the agent before it merged.** The
  Vercel preview sits behind Vercel's own SSO and the local database has no
  product with an open draft. Later PRs were checked live only because the owner
  opened the deployed site and handed it over.
- **Description images still do not reach buyers.** `sals3-ecommerce`'s
  `ProductDescriptionBlock` union has four members and no `image`, and its
  `salvagedArray` parse drops unknown blocks **silently** — no error, no log. A
  seller uploads three photos, sees them in the portal, and the buyer gets text
  only. Deferred by owner decision to finish the editor first; still open.
- **Primary Material was left blank** on the product published during testing.
  The value is a claim about a physical object that a buyer relies on, and
  ADR-013 §7 forbids inventing it. The product name itself says `Bamboo`, so the
  evidence now exists — it simply has not been entered.
- **A general audit of the other Add Product sections** — Basic Information,
  Specification, Markets, Supplier Details, Review & Publish — was not
  completed. The Description section is the only one read in depth.

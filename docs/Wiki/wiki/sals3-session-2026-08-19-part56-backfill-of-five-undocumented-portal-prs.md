---
tags:
  - sals3
  - sals3-portal
  - backfill
  - audit
  - pricing
  - variant-matrix
  - session
aliases:
  - PR Backfill Audit
  - Undocumented PR Sweep
  - Part 56
created: 2026-08-19
updated: 2026-08-19
status: current-state
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-session-2026-08-14-part40-aj-category-mirror-and-draft-evidence-work]]"
  - "[[sals3-session-2026-08-15-part45-variant-axes-design-and-free-change-detection]]"
  - "[[sals3-session-2026-08-15-part47-option-mapping-wiring-and-supplier-change-detection]]"
  - "[[sals3-session-2026-08-18-part53-paid-order-path-and-the-queue-that-swallowed-it]]"
  - "[[sals3-session-2026-08-18-part54-description-blocks-images-and-variant-matrix-rename]]"
---

# Sals3 session 2026-08-19, part 56 — backfill: five portal PRs the vault never named

After parts 53-55 closed the recent gap, a full-history audit cross-referenced
**every** merged `sals3-portal` PR number against every PR number appearing
anywhere in this vault. Five had never been named:
[#71](https://github.com/Sals3-Official/sals3-portal/pull/71),
[#73](https://github.com/Sals3-Official/sals3-portal/pull/73),
[#79](https://github.com/Sals3-Official/sals3-portal/pull/79),
[#80](https://github.com/Sals3-Official/sals3-portal/pull/80),
[#89](https://github.com/Sals3-Official/sals3-portal/pull/89).

"Never named" is not the same as "undocumented", and the difference turned
out to matter. Three were already described in prose or by commit hash. Two
were genuinely missing — **and one of those two fixed a defect that both
[[hot]] and part 47 still describe as open.**

## 1. What the audit actually found

| PR | Merged | Coverage before this note |
|----|--------|---------------------------|
| #71 · chore: fix category bug | 08-13 | **Partial** — part 40 names one of its files |
| #73 · get product information | 08-14 | **Covered** — part 40, by commit `411b341` |
| #79 · derive and persist supplier option groups | 08-14 | **Content covered, step unrecorded** |
| #80 · an override edit supersedes instead of deleting its history | 08-14 | **None** |
| #89 · stop refusing option-mapping on a constant supplier-label position | 08-15 | **None, and contradicted by stale text** |

The method is worth keeping: matching on PR *number* alone overstates the gap,
because this vault often records AJ's work by commit hash or by describing the
change. Matching on number *and* on content keywords is what separated the
three false positives from the two real ones.

## 2. #89 — the constant-position fix that the current-state cache still calls broken

This is the reason the backfill was worth doing.

`deriveOptionSplit` refused an entire product's option-mapping proposal
whenever **any** supplier-label position had fewer than two distinct values. A
one-colour-many-sizes product, or many-colours-one-size, got **no proposal at
all** — even though the varying position was a perfectly exact, mappable axis.
That is why the mapping feature only ever worked on the one live product that
happened to vary on every position.

PR #89 **dropped the constant position from the proposal** instead of
disqualifying the product. A product where every position is constant still
cannot produce a proposal; the exactness cross-product check already makes
that structurally impossible with two or more variants.

The subtle half is the writer. `saveOptionMapping`'s internal `Map` keys had
to move to the supplier's **true label position** (`split.positions[i].index`)
rather than the axis's array index in `input.axes` — the two only coincide
when nothing was dropped. Keying by array index would have left every variant
on an affected product **silently unmapped** (`mappedVariantCount: 0`, no
error), because the write loop and the link loop would then look things up
under different keys. `product_options.position` is deliberately still keyed
by array index, so a dropped constant position leaves no gap in the seller's
own display order.

No CJ call anywhere; everything works off labels already in
`provider_variant_references.source_option_label`. Insert-only, unchanged.

**Two places said otherwise until now.** [[hot]] carried *"`deriveOptionSplit`
drops the whole product instead of just the constant position"* as a live
explanation of why four live products were refused, and
[[sals3-session-2026-08-15-part47-option-mapping-wiring-and-supplier-change-detection]]
listed *"Fix `deriveOptionSplit` to drop a constant position instead of
refusing"* as open work item 1. Both are corrected alongside this note — hot.md
in place, part 47 with a dated follow-up rather than a rewrite.

Note the interaction with [[sals3-session-2026-08-18-part52-variant-matrix-category-suggestions-and-catalogue-truth]]:
part 52's `labelWidth` change made **single-token** labels acceptable. That is
a different fix to the same function. #89 handles a position that never
varies; #121 handles a label with only one position. A colour-only product
needed both.

## 3. #80 — an override edit was indistinguishable from a delete

Saving a new value over an existing product or variant pricing override marked
the row `REMOVED` and inserted a fresh one at `version: 1`. So an edit looked
exactly like a delete plus an unrelated new record, and the
`version`/`supersedesId` chain the schema's own doc comment promises reset to
1 each time. The audit event read `.created` either way, so **the history a
pricing dispute would be settled from never recorded that anything was
replaced.**

Category policies already did this correctly through `reviseCategoryPolicy`;
overrides simply never got the same treatment.

- `reviseProductOverride` / `reviseVariantOverride` supersede the previous row
  and insert at `version + 1` with `supersedesId` set.
- Both save actions branch: no active override → `create` at version 1
  (unchanged); an active one → `revise`.
- The audit event is `.revised`, carrying `version`, `supersedesId`, and
  `previousTargetMarginRate`.
- `reviseVariantOverride` **re-takes** `additionalJustification` rather than
  inheriting it. It explains *this* edit's materially different cost or risk;
  carrying the old one forward silently would let a revision keep a
  justification nobody re-affirmed.
- `candidateBelongsToSeller` now runs **inside** the writing transaction, so
  the ownership proof cannot go stale between the check and the write it
  authorizes.

No schema change: `version`, `supersedesId`, and `SUPERSEDED` all already
existed and were already used by category policies.

The PR also retired a stale branch honestly rather than merging it:
`fix/pricing-policy-authorization-and-revision-history` was 107 commits behind
`develop` with five of its twelve files no longer existing (the
`FxAdjustment*` components had been replaced by `FundingBuffer*`,
`CategoryPricingTable` removed), so merging it would have **resurrected
deleted files**. Its headline cross-tenant authorization fix had already
shipped independently. The revision history was the only part left, and this
PR salvaged exactly that.

## 4. #79 — the option-mapping groundwork, shipped deliberately unwired

Described across [[sals3-session-2026-08-15-part45-variant-axes-design-and-free-change-detection]]
and part 47, but never recorded as its own shipped step. It merged
**2026-08-14, +890/−0**, explicitly as groundwork: no server action, no
read-model exposure, no publish gate, and the component rendered nowhere, so
merging it changed no behaviour.

What it established, and what parts 45/47 then built on:

- `deriveOptionSplit` returns positions **only** on an exact cross-product,
  refusing eight ambiguous cases (ragged token counts, a missing combination,
  any absent label, single-token labels, a position that never varies,
  duplicates, fewer than two variants). Two of those refusals were later
  relaxed on purpose — the never-varying position by #89 above, single-token
  labels by #121 in part 52.
- **It never names a position.** Nothing in CJ's payload says position 0 is a
  *Colour*; on a phone the same two slots could be plug type and storage.
- **The client sends names, never structure.** The payload carries only what a
  person decided; the structure is re-derived server-side from
  `source_option_label` and the submitted shape checked against it. A crafted
  payload cannot reassign a variant to another combination — which matters
  because a wrong assignment hands a buyer one variant's price and another
  variant's goods.
- Values reorder by **up/down button rather than drag**: drag alone is
  unreachable by keyboard, and this needed no new dependency. `S, M, L, XL,
  XXL` is not alphabetical (alphabetically it is `L, M, S, XL, XXL`), so no
  algorithm recovers the seller's intended order.

## 5. #71 and #73 — AJ's work, already recorded by commit rather than number

Both are covered by
[[sals3-session-2026-08-14-part40-aj-category-mirror-and-draft-evidence-work]],
which records AJ's changes by commit hash. No new note is needed; this section
exists so a future audit does not re-flag them.

- **#73 "get product information"** is part 40's `411b341` — evidence capture
  running automatically when a draft is created.
- **#71 "chore: fix category bug"** (+1,174/−125) is the grab-bag. Part 40
  names one of its files, `scripts/move-cj-connection-to-aj.local.mts`, under
  "Also landed today, not detailed here". The rest of the PR — the category
  mirror module and its tests, `PricingBasisPanel`, the `setup-2fa` and
  `two-factor` pages, `PublishProductButton`, `SpecificationsSection`,
  `BasicInformationSection`, `create-draft` — is **not itemised anywhere**.
  Part 40's own "Open questions worth asking AJ" section already flags that
  its coverage of that day was reconstructed rather than authored, and that
  remains the honest state.

## 6. What this leaves

Every merged `sals3-portal` and `sals3-ecommerce` PR is now either named in
this vault or explicitly accounted for as covered by commit hash. The two
residual soft spots, stated rather than closed:

- **#71's contents are not itemised.** Reconstructing a 1,174-line grab-bag
  from five days ago would produce a guess dressed as a record. Worth one
  question to AJ instead.
- Matching by PR number alone will keep producing false positives while AJ's
  work is recorded by commit. A future audit should match on both, as this one
  did.

## 7. Reusable lessons

1. **A PR-number audit is a screen, not a verdict.** Three of five "missing"
   PRs were documented in prose or by commit hash. Confirming coverage by
   content is what separated them.
2. **The dangerous gap is not a missing note — it is a stale claim.** #89's
   real cost was not absence; it was that the current-state cache actively
   told the next reader a fixed defect was still broken, for four days.
3. **A fix recorded as an open work item outlives the fix.** Part 47 listed
   the constant-position repair as open; #89 shipped it the same week and
   nothing closed the loop. When a note lists open items, closing one belongs
   in the same note, dated.

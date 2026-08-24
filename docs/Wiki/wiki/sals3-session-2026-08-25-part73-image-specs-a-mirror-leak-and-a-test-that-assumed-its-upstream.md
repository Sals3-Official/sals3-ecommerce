---
tags:
  [
    sals3,
    session-note,
    sals3-portal,
    sals3-ecommerce,
    description-studio,
    pricing,
    market-rules,
    taxonomy,
    e2e,
    adr-015,
  ]
aliases:
  - Part 73
  - Image Specs and the Mirror Leak
  - The Test That Assumed Its Upstream
created: 2026-08-25
updated: 2026-08-25
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[sals3-session-2026-08-24-part72-aj-storefront-search-across-both-repositories]]"
  - "[[sals3-session-2026-08-25-part71-the-variant-photo-that-vanished-and-the-wire-that-could-not-carry-it]]"
  - "[[taxonomy-v1-is-google-taxonomy]]"
---

# Part 73 — Image specs, a mirror leak, and a test that assumed its upstream

Four merges, three of them repairs of things that had shipped looking correct.
**No schema change and no migration in any of them.**

- `sals3-portal` [#182](https://github.com/Sals3-Official/sals3-portal/pull/182) — description image ratio and pixels, merged `7f4919b`
- `sals3-portal` [#184](https://github.com/Sals3-Official/sals3-portal/pull/184) — CJ mirror categories off the margin screen, merged `e5c0eaf`
- `sals3-ecommerce` [#156](https://github.com/Sals3-Official/sals3-ecommerce/pull/156) — ADR-015 per-destination amendment, merged `89e833d`
- `sals3-ecommerce` [#158](https://github.com/Sals3-Official/sals3-ecommerce/pull/158) — the search e2e test repaired, merged `70600b8`

## The image placeholders said nothing useful (#182)

The description studio's empty image frames read *"No image yet. Upload one in
the panel on the right"* and nothing else.

**The storefront renders these with `object-cover` inside a fixed aspect box.**
A photo of the wrong shape is therefore **cropped, not letterboxed** — the
difference is cut off, and nothing afterwards tells the seller what they lost.
Naming the ratio at the point of upload is the only place that can prevent it.

The numbers were **read off the consumer**, not chosen:

| Layout | Class in `DescriptionImageRow` | `sizes` | Told to the seller |
|---|---|---|---|
| Alone | `aspect-video` (16:9) | `(min-width: 1024px) 720px, 100vw` | **1440 × 810** |
| Two or three | `aspect-[4/3]` | `(min-width: 640px) 33vw, 100vw` | **960 × 720** |

The recommendation is **exactly 2× the rendered width** — what a high-density
screen asks `next/image` for — and no more, because `upload-seller-media.ts`
re-encodes every upload to WebP at a 2000px long edge, so a larger original is
downscaled on the way in and buys the seller nothing. A test asserts both halves
of that (`720 × 2`, and `≤ 2000`).

**One rule, not three copies.** `CanvasBlock` already derived its ratio from
adjacency; `descriptionImageSpec()` and `imageRunLengthAt()` are that same
number rather than a second copy of the rule, so the frame and the spec printed
inside it cannot disagree. `imageRunLengthAt` answers from *any* member of a
run, because the seller selects whichever image they clicked.

Shown in three places because a seller passes all three: the palette button
hint, the empty canvas frame, and the upload panel beside the file picker. The
panel matters most — it previously named only the size *ceiling*, never the
*shape*.

## Supplier mirrors were on the margin screen (#184)

The owner's screenshot of Market Rules showed rows wearing the supplier's own
raw path — `Men's Clothing / Outerwear & Jackets / Man Ho…` — beside the real
departments, each offering a `Set` button.

`cj-mirror.ts` inserts `{ code: 'CJ-<uuid>', path, l1: path }`, leaving `l2` and
`l3` **null**, and this query's depth test is `l3 IS NULL`. Every mirror passed
it.

**The same class of bug, for the second time.** The category picker already
filtered these (`v1-reference.ts`). This screen never got the rule.

**It was not cosmetic.** `publishProduct` refuses a mirrored category (owner
decision 2026-08-20) — its own comment names `CJ-976399B4-534B-46F0-B18A-…`,
which is literally one of the rows in the report. A product filed under one can
never reach a live listing, so **a margin set against a mirror is a number
guaranteed never to price anything**, and the screen was inviting a seller to
configure nothing and believe otherwise.

Fixed as an **allow list** on `TAXONOMY_V1_CODE_PREFIX`, not a block list on
`CJ-`: the rule the screen wants is *"a real Sals3 category"*, which is
`isSals3TaxonomyCode`'s rule, and a block list would silently admit whatever the
third code convention turns out to be.

**"Never offered fresh", not "never shown".** A mirror that already carries a
policy still appears, so it can be deactivated rather than stranded where nobody
can reach it. Both escape hatches are `OR`s against the policy id and a test
pins that there are **exactly two**.

Tested by **rendered SQL**, per the convention `repository.test.ts` documents: a
fake executor answers with whatever rows it was handed, so only the emitted SQL
shows the predicate is present at all. The prefix is asserted as a **bound
parameter**, so it cannot drift from the constant every other caller tests
against.

## Margins become per-destination — approved, not built (#156)

Owner decision. Amendment only: no schema, no resolver, no UI. It exists so the
reversal is recorded before anything is written against it.

**It withdraws a deferral this ADR made of its own accord** — the 2026-08-14
amendment had scoped destination scoping down as *"deliberately unbuilt until
the org grows into them"*. That now stands only for the funding buffer's own FX
scoping.

The owner's reasoning is operational expense, and the 2026-08-24 freight
measurements size it: one 300 g basket costs **$3.70** to the Philippines and
**$16.01** to Fiji, while a 25% margin on a $4.29 supplier cost contributes
about **$1.07** and covers none of the six destinations.

Approved shape: a market scope on **both** policy tables, unscoped meaning "all
destinations" so no existing row changes meaning and no backfill is needed;
two-dimensional resolution in which **depth still beats market** (otherwise a
single country rate on a department silently overrides every product below it);
and a **required, never-defaulted** market input on the resolver.

**The floor stays absolute.** The owner asked for "a certain % or amount" and
the answer is amount, because §1's own reasoning already settled it: two rules
both proportional to cost never cross, so a percentage floor is a second margin
wearing a floor's name. The owner's own justification is the strongest argument
for absolute — operational expense is precisely what does not shrink when an
item is cheap.

Recorded as **explicitly unsolved**: within one destination, weight moves cost
further than the destination does. Australia is `$8.10` at 300 g and `$27.14` at
2 kg — a wider spread than Australia-to-Canada at a fixed weight. This is six
flat markups instead of one, a step and not the destination; ADR-003 stays
controlling for landed cost, and `resolveProductPricing` still tells sellers
*"checkout freight is not included"*.

## A test that asserted its own environment (#158)

`develop` was red. `search.spec.ts`'s *"a term nothing can match"* had been
failing since part 72's merge, **on a branch whose own CI was green**.

`/search` reaches the portal, and the storefront's Playwright `webServer` starts
only the storefront. In an ordinary run the upstream is absent and
`SearchResults` correctly renders its `isUnavailable` panel rather than its
empty-state one. The test asserted the empty-state copy unconditionally — so
what it actually asserted was **that the portal happened to be running**, which
it was on the branch where the feature was exercised against live data.

Repaired by **branching, not skipping**, the way `category.spec.ts` already
handled its four result states. The invariant the test exists for holds either
way — nothing may blame filters when no filter was applied — and the unreadable
case now asserts the distinction `SearchResults` itself draws: an unreadable
catalogue must not be reported as an empty one. A `test.skip` would have been
shorter and would have dropped a real assertion in exactly the run where it is
cheapest to make.

Provenance was **proven, not assumed**: the case was re-run at `d51e06c` — part
72's own merge commit — and failed there, before any of this session's merges,
and #156 touched zero files outside `docs/`.

## What was diagnosed and NOT fixed

The owner reported that variant photos still vanish on **Publish Update**, after
part 71's revalidation fix was already deployed (the deploy was confirmed live
by the owner's own screenshot carrying part 71's new copy).

Ruled out structurally, each by reading the writer rather than guessing:

| Suspected | Verdict |
|---|---|
| Publish clears `variant_id` | No — `assignVariantMedia` is the only writer of that column |
| Publish recreates variants | No — only `productOffers` is inserted |
| Publish deletes media | No — only `delete-seller-media` deletes |
| The `after()` mirror clears the link | No — its `.set()` does not name `variantId` |
| Variant order changes, so the rail reads a different row | No — the comparator is option-position based |

**The remaining explanation is that `assignVariantMedia` moves a photo rather
than copying it.** `variant_id` is one column and `(product_id, checksum)` is
unique, so choosing the same photo for a second colour takes it off the first —
and across the owner's two screenshots the set of colours holding photos
*changed* rather than emptying, which is the signature of a move and not a
delete.

**That is a hypothesis, not a finding.** It cannot be confirmed from here: the
production database is unreachable and the local one has no published product.
The deciding check was handed back to the owner — open the picker on a blank
colour and see whether a photo is labelled `On another variant`.

If it is, the real fix is a join table so one photo can serve several variants,
which is a schema change, a migration through the break-glass endpoint, and an
owner decision. None of that was started.

## Process

Six pull requests were held unmerged at the owner's instruction while AJ merged,
then merged after re-checking drift. **That re-check mattered**: `develop` had
moved on both repositories, so the earlier "zero drift, therefore the local
verify *is* the merge result" argument no longer held. The true post-merge state
was built locally — `origin/develop` plus both branches — and verified at
**2,600 unit / 79 e2e, exit 0**, before anything was merged for real.

Both `develop` branches were then re-verified after merging rather than assumed:
portal `7f4919b` at 2,600 / 79, storefront `70600b8` at 815 / 56.

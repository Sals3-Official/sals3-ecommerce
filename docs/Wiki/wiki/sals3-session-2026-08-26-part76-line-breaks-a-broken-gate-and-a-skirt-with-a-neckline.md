---
tags:
  [
    sals3,
    session-note,
    sals3-portal,
    sals3-ecommerce,
    pdp,
    description-studio,
    taxonomy,
    attribute-controls,
    tooling,
  ]
aliases:
  - Part 76
  - Line Breaks, a Broken Gate, and a Skirt With a Neckline
created: 2026-08-26
updated: 2026-08-26
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[universal-category-variation-taxonomy-reference]]"
  - "[[sals3-session-2026-08-25-part74-the-published-product-that-could-not-be-edited]]"
  - "[[sals3-session-2026-08-25-part75-aj-a-department-to-browse-and-a-review-from-the-order-list]]"
  - "[[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux]]"
---

# Part 76 — Line breaks, a broken gate, and a skirt with a neckline

Four merges across both repositories. **No schema change and no migration in
any of them**, and one production data correction applied through the
break-glass path.

- `sals3-ecommerce` [#164](https://github.com/Sals3-Official/sals3-ecommerce/pull/164) — the product page keeps a paragraph's line breaks, merged `7500d76`
- `sals3-portal` [#196](https://github.com/Sals3-Official/sals3-portal/pull/196) — the description canvas previews them the same way, merged `fdc98ab`
- `sals3-portal` [#198](https://github.com/Sals3-Official/sals3-portal/pull/198) — the type-check gate stops failing on clean code, merged `71f427b`
- `sals3-portal` [#199](https://github.com/Sals3-Official/sals3-portal/pull/199) — four skirt categories stop asking for a neckline, merged `f6f1492`

## 1. The storefront threw away line breaks the Portal deliberately kept

A seller writes a features list in the Simple text box — a heading line, then
one line per attribute. The product page rendered it as **one run-on line**.

The newlines were never lost on the way there. `descriptionTextToBlocks` keeps
single newlines **inside** a paragraph rather than splitting on them, and its
own comment says why: *"a heading line, then one line per feature"*. The
document schema permits `\n` (`DISALLOWED_CONTROL` deliberately exempts tab and
newline), and they survive the editor, the block document and the database to
reach `block.text` whole. HTML collapses them to spaces, and the `<p>` never
said otherwise.

That is also why **a size chart on the same page came out right** while the
list above it did not: the chart is written with blank lines, so it becomes
separate blocks, and block separation was never the broken part.

`whitespace-pre-line`, not `pre-wrap`: newlines are honoured and runs of spaces
still collapse, which is exactly the contract the Portal describes. `pre-wrap`
would publish an accidental double space or a leading indent precisely as
typed.

### Both repositories, because the canvas makes a promise

The description canvas tells the seller its text is set **"exactly as the
product page will set it"** (`StudioCanvas`). Fixing only the storefront would
have made that sentence false in the direction that costs most: the seller
previews a run-on features list, decides it reads badly, rewrites it,
publishes, and the listing renders something they never saw. A preview that is
wrong is worse than no preview, because it is trusted.

Both of the canvas's renders of the seller's text are covered — the unselected
block, and the emphasis preview above the textarea. The italic *"Empty
paragraph"* placeholder is left alone: that is the component's own copy.

### Only the paragraph, and that was checked rather than assumed

At the schema level every text field permits `\n`, so the fix looked like it
might apply to headings, bullet items and key/value entries too. It does not:
**only the paragraph is a `<textarea>`** (`RichParagraphInput`) — the others are
`<Input>` elements, where a newline cannot be typed. Widening it would have
been styling for something nothing can produce.

`DescriptionSummary` in the listing editor is also deliberately untouched: it is
`line-clamp-2`, which already declares itself a summary rather than a claim
about the page.

The order page inherits the fix through the same component, which is right — it
shows the **frozen** description the buyer read, and it should read the way they
read it.

## 2. The type-check gate failed on clean code

`npm run typecheck:clean` exited **1 on Windows while `tsc --noEmit` exited 0
with no errors to show**. Six commands sit behind that gate.

The failure was in the `finally` block. Something recreates `.next` while `tsc`
runs — a dev server, or Next's own type generation — and `rmSync` on a directory
being written to throws `ENOTEMPTY`. Thrown from a `finally`, it replaced the
type check's result with its own.

Three changes:

- **Cleanup can no longer set the exit code.** Every removal catches and warns;
  the restore reports rather than throws. A cleanup problem is a cleanup
  problem, and it is not a type error.
- **`rmSync` gets `maxRetries: 10, retryDelay: 100`** — the options that exist
  for exactly the `EBUSY`/`ENOTEMPTY` Windows produces while a handle settles.
- **Leftover `.next-typecheck-tmp-*` directories are swept at the start.** They
  are named per-process, so a run killed between the rename and the restore
  leaves one behind for good, each holding a whole `.next` build; there was one
  sitting in the shared checkout. Sweeping on the way *in* is what makes a
  crashed run self-healing rather than permanent.

**Why `.next` is moved aside at all** was nowhere in writing: `tsconfig.json`
includes `.next/types` and `.next/dev/types`, so a stale generated route type
from an older build would be checked as if it were source. That rationale is now
at the top of the file.

Proven by running it, not by reading it: with a process writing into
`.next/cache` during the run, the old script exits 1 and crashes on
`syscall: 'rm'` while the new one logs `ENOTEMPTY` and exits 0; a real type
error still exits 2, so `tsc`'s own status passes through.

## 3. Four skirt categories asked for a neckline and sleeves

`CAT-GGL-1581 Skirts`, `CAT-GGL-2331 Mini Skirts`, `CAT-GGL-6228 Long Skirts`
and `CAT-GGL-6229 Knee-Length Skirts` all offered **Neckline** and **Sleeve
Style**. Worse, `Dress / Skirt Style` is **`REQUIRED`** and offered `Maxi
Dress`, `Midi Dress`, `Mini Dress`, `Wrap Dress`, `Slip Dress` and `Bodycon` —
so a seller listing a skirt *had* to choose from a list that was mostly dresses.

The workbook wrote one attribute set for "Dresses & Skirts" as a single family
and laid it over the skirt leaves. Nine sibling categories that really are
dresses keep both attributes, correctly — and so does **`CAT-GGL-1516 Skirt
Suits`**, which comes with a jacket, so a neckline and sleeves describe the
product. Four categories, never five.

### The corrections live beside the extract, not inside it

`sals3-category-attribute-controls-v1.json` records the workbook it came from,
that workbook's `sha256`, and its own row count. **Editing rows inside it would
make the file misdescribe itself**, and a later re-extraction of the same
workbook would silently reintroduce whatever had been hand-removed.

So the extract stays a faithful record and `attribute-control-corrections.ts`
carries the deviations with their reasons. **One declaration, two consumers**:
`seedAttributeControlsData` applies it before inserting, so a fresh environment
is never wrong, and a break-glass endpoint applies the same list to rows a
deployed database already holds. That second path is not optional — the seed is
**additive only** (`onConflictDoNothing`) and can never remove or change a row
it once wrote, so correcting the extract alone fixes nothing that already
exists.

### No `controlsVersion` bump, deliberately

The alternative was seeding a `v2` of all 53,625 rows and moving
`ACTIVE_ATTRIBUTE_CONTROLS_VERSION` onto it. That constant lives in **code**,
and every read joins on it — the storefront's specification projection and the
editor's contract both. The data and the deploy would have to land in a strict
order, and any window where the code names a version the database has not
finished seeding is a window where **every product's specifications
disappear**. Eight wrong rows do not justify that exposure.

### Nothing stored needed backfilling

The storefront's specification query `innerJoin`s
`category_attribute_controls` on `(categoryId, attributeName, controlsVersion)`,
so a value whose control is gone **stops rendering on its own**; the editor
builds its fields from the same controls. The rows in
`product_category_attribute_values` are left where they are — orphaned,
reversible, and not this correction's to delete.

**Narrowing the allow list stranded nobody either**, and that is not luck:
`Dress / Skirt Style` carries `allowCustomValue: true`, so the live skirts
already recorded as `Maxi Dress` are still accepted as a custom value rather
than refused. There is a test holding that fact, because the safety of the
narrowing rests on it — if it ever became false, narrowing would start rejecting
live listings.

What is left in the list: `A-Line`, `Pleated Skirt`, `Pencil Skirt`,
`Tiered Boho`. The three length-shaped values are **not** replaced with skirt
equivalents on purpose — `Dress / Skirt Length` is its own control on these
categories, and a second field answering the same question is how two fields
start disagreeing.

### Applied to production

`Taxonomy Correct Attribute Controls` (`workflow_dispatch`, `CRON_SECRET`):

```
{"ok":true,"controlsRemoved":8,"allowedValuesRewritten":4,"unmatchedCategoryCodes":[]}
```

Second run: `controlsRemoved: 0`. Idempotent on real rows, not only in tests.
`allowedValuesRewritten` stays `4` by design — the update rewrites the values the
rows already hold.

Confirmed on both surfaces afterwards. On a live skirt's product page, Neckline
and Sleeve Style are gone with no backfill, while `Dress / Skirt Style: A-Line`
and `Dress / Skirt Length: Maxi (Floor Length / Ankle)` still render — the second
of those being the reason the length values were not folded back into the style
list. In the seller's editor for a Mini Skirts product the remaining fields are
`Dress / Skirt Style`, `Material`, `Dress / Skirt Length`, `Pattern`, and the
page's own payload carries the four kept values and none of the six removed.

## A correction inside another agent's in-flight work

`fan-out-unscoped-margins.ts` declared its own
`type RoundingRule = 'NONE' | 'NEAREST_0_99' | 'NEAREST_0_95' | 'NEAREST_WHOLE'`
while the database enum has **two** values, so the insert was refused with
`TS2769` and `npm run verify` failed on the shared checkout. The two extra
values appeared exactly once each — in that declaration. Nothing built them,
used them or tested them.

Replaced with the exported `RoundingRule` from `schema/pricing-policy.ts`, which
is derived from `roundingRuleEnum.enumValues` and therefore cannot drift again.
**No migration to widen the enum**: adding a database value for something with
no consumer is larger than the problem. The fix shipped inside that agent's own
[#195](https://github.com/Sals3-Official/sals3-portal/pull/195).

## Two things worth carrying forward

**A promise in the interface is a constraint on the code.** The canvas said it
matched the product page, so a storefront-only fix was not an option — the same
shape as part 74's "Saved, but not live yet" notice, which had to be gated on
the listing actually being live because `unpublishProduct` leaves
`published_revision_id` set on a paused product. When a screen states something,
that sentence has to keep being true.

**An additive-only seed cannot express a correction.** `onConflictDoNothing`
makes a seed safe to re-run and, by the same property, unable to take anything
back. Any future change to the attribute controls that *removes* or *narrows*
needs its own statement — the extract alone will only ever fix environments that
have not been seeded yet.

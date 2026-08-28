---
tags:
  - sals3
  - sals3-portal
  - sals3-ecommerce
  - catalog
  - media
  - storefront
  - migration
  - regression
  - cross-repo
  - session-note
aliases:
  - Part 87
  - Two Budgets For One Twelve
  - The Gallery That Was Holding The Variant Photos
created: 2026-08-28
updated: 2026-08-28
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[agent-operating-contract]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-session-2026-08-25-part71-the-variant-photo-that-vanished-and-the-wire-that-could-not-carry-it]]"
  - "[[sals3-session-2026-08-22-part70-variants-and-pricing-rework-and-the-button-that-cannot-drag]]"
---

# Part 87 — two budgets for one twelve, and the gallery that was holding the variant photos

Four merged pull requests across both repositories, one production DDL run, and
**one live storefront regression I caused and then fixed the same night.**

| | |
|---|---|
| `sals3-portal` [#208](https://github.com/Sals3-Official/sals3-portal/pull/208) | production DDL for `product_media_sources.position`, shipped alone |
| `sals3-portal` [#209](https://github.com/Sals3-Official/sals3-portal/pull/209) | gallery and variation photo budgets split; the gallery becomes arrangeable |
| `sals3-ecommerce` [#180](https://github.com/Sals3-Official/sals3-ecommerce/pull/180) | **the regression fix** |
| `sals3-portal` [#210](https://github.com/Sals3-Official/sals3-portal/pull/210) | owner correction: supplier photos are arranged in Supplier Details |

## 1. The report: a product that could not be finished

`Knitted Tam Beanie` sells **21 flag designs**. Each needs its own photograph or
a buyer cannot tell them apart — the option list is text. Twenty-one were
uploaded; the Product media panel went from `0 of 12` to `12 of 12` and **nine
were discarded without a word.**

## 2. One `12` was answering two unrelated questions

- **How many photos a buyer scrolls** — the reviewed argument, quoted from
  `media-projection.ts`: *"a product page that renders 40 thumbnails is a page
  nobody scrolls and a row count nobody reviews."*
- **How many variations can be told apart** — which a buyer never scrolls,
  because they are shown exactly one, chosen by the option they picked.

Sharing one budget meant the second starved the first.

### The turnover named four constants. There were five.

`MAX_DETAIL_IMAGES = 12` in `storefront/read-model.ts` is the cap on the gallery
a buyer is actually served, and it is the one that defends the reviewed
argument — not the upload cap. That changed the whole trade-off: raising the
seller cap could not lengthen the buyer's gallery, because a different constant
was already holding that line.

### And a variation photo never needed a gallery slide at all

It reaches the buyer through `variantImageUrl` — a correlated subquery,
`limit 1` per variant, spread across the first axis by `shareFirstAxisPhotos`
(part 71). Twenty-one variation photos cost the gallery nothing.

## 3. The defect underneath: a sort is not a filter

`loadApprovedImages` had `variant_id is null` in its **`ORDER BY`** and not in
its **`WHERE`**.

So every photo tagged to a variation was also a slide in the buyer's gallery. On
this product that made the gallery twelve near-identical close-ups of the option
the buyer had not chosen yet — exactly the outcome `media-projection.ts`'s cap
comment was written to prevent, arriving through a door that did not exist when
it was written.

The fix is one predicate. Both new tests were **proven to fail without it**:
reverted, watched them go red, restored.

## 4. Two budgets, no new column, no new concept

`variant_id` already separated them, and `assignVariantMedia` already *moves* a
row between product level and a variant rather than copying — so a photo has
exactly one home and the two counts cannot double-count it.

| constant | value | bounds |
|---|---|---|
| `MAX_GALLERY_PHOTOS_PER_PRODUCT` | **12** (unchanged) | the reviewed number, matching `MAX_DETAIL_IMAGES` |
| `MAX_PHOTOS_PER_VARIANT` | **1** | `variantImageUrl` serves one; a second is bytes shown to nobody |
| `MAX_VARIANT_PHOTOS_PER_PRODUCT` | **60** | a storage backstop, not a UX limit |

The `media-upload` rate limit moved 20 → 60. The limiter refuses at capacity and
refills **one token per minute**, so a 21-file batch would otherwise have stalled
at the twentieth — the cap would have been a promise the upload path could not
keep. The 5 MB / 2000 px per-request ceiling is untouched.

## 5. A trap caught while building, not after

Scoping the gallery to product-level rows means a product whose every seller
upload is a variation photo has **no gallery photo of its own**. Had
`hasApprovedSellerUpload` kept counting those, `show_supplier_photo` off would
have hidden the supplier original with nothing behind it — the blank page the
owner's 2026-08-20 decision explicitly forbids. It is scoped to gallery rows, and
test-pinned.

## 6. `position`, and why it shipped alone

The cover is **position 0**. There is no `is_cover` column and there must not be
one: "what order do these appear in" and "which one leads" are one question, and
two columns holding one answer disagree invisibly until a buyer is served a lead
photo nobody chose.

Drizzle names every column of the schema in an `INSERT`, and
`product_media_sources` is written by draft creation, by publication, and by every
seller upload. A deployment carrying `position` before the database had it would
have broken **importing and publishing**, not one page — the 2026-08-18 shape of
incident. So #208 shipped the DDL alone: module, route, workflow, ten tests,
**zero existing files modified**.

```
before: {"ok":true,"columnExists":false}
after:  {"columnExistedBefore":false,"ddl":{"statementsRun":1},
         "migrationRecord":{"createdAt":1787862669015,"inserted":true},
         "columnExistsAfter":true}
```

A second run proved idempotency against the real database: `columnExistedBefore:
true`, `inserted: false`. The column is nullable and nothing is backfilled — null
means "never arranged", and read paths order `position asc nulls last` before
falling through to the previous rule, so a product nobody has touched is served
exactly as it was.

## 7. The regression: I changed a producer without reading its consumer

**Every test on both sides of the wire was green. The storefront was broken.**

`sals3-ecommerce`'s `ProductGallery` found a variant's picture like this:

```js
const url = variants.find(v => v.id === variantId)?.imageUrl;
return images.findIndex(image => image.url === url);
```

Inside the gallery array. The moment variation photos stopped being slides,
`findIndex` returned `-1` for every design — and `galleryIndexOfVariant`'s own
comment had already described the consequence:

> A variant whose photo is not in the gallery — a race between the two cached
> payloads — resolves to `-1` and simply leaves the gallery where it was.

Written for a rare race. The producer change made it permanent.

**Measured on the live page:** 8 of 8 designs clicked, all serving one generic
supplier cover. The only seller-uploaded image anywhere on that page was a
*related product* card. The day before, 12 of 21 had shown their own photo.

### What caught it

Clicking the real storefront. Nothing else could have: the portal's tests cover
the portal, the storefront's tests covered a gallery that still contained the
photos, and both suites were green at the moment the page was wrong.

> [!DANGER] The rule this earns
> **Before changing a `sals3-portal` read model, grep `sals3-ecommerce` for
> consumers of the field.** The two repositories are one contract;
> [[agent-operating-contract]] §10 already says to read the real repo rather than
> assume its shape, and §4 already lists cross-module contracts as a required
> challenge review. Both were available and neither was applied.

### The fix, and why it is the better model anyway

The strip and the picture became two different things. The strip stays the
curated product gallery; the frame shows the variation's own photograph whether
or not it is in the strip — which is exactly how the marketplace editor the owner
pointed at behaves, where a per-variation image is never one of the main slides.

Carried with it: `aria-pressed` cleared on every thumbnail while an off-strip
photo shows, because a strip claiming to be the picture above it is worse than a
strip claiming nothing; and alt text naming the chosen option (`Beanie, front —
Peru`) rather than repeating the product title twenty-one times, which is the
announcement a screen-reader user cannot navigate by.

## 8. ADR-011 §3 amended, then corrected within the hour

The owner asked for one draggable grid with the first tile badged `Cover`,
supplier photos included. [[ADR-011-product-media-source-selection-and-supplier-original-preservation]]
§3 called the supplier set *"read-only"*, so the amendment was written: display
order is an editorial fact **about** supplier evidence, not a change **to** it —
the same argument `assign-variant-media.ts` had already made for `variant_id`
since 2026-08-20. A supplier row being assignable to a variant while unmovable in
the gallery was an inconsistency, not a rule.

Then the owner saw it live and corrected it: supplier tiles in `Product media`
sat under a counter reading `0 of 12 photos`, because that counter counts
uploads. **One origin per panel.** `Product media` is the seller's own again;
Supplier Details got the grip.

Both panels still write **one** ordering — `reorderProductMedia` refuses anything
that is not the whole gallery, so the editor concatenates them, seller photos
first. That is what keeps the cover well defined across two panels: position 0 is
the seller's first photo when they have one, the supplier's first otherwise, which
is the same answer `sellerUploadsFirst` gives the buyer.

Deleting and replacing stay absent there and stay refused by
`delete-seller-media.ts`'s own `WHERE`. The amendment relaxed exactly one of §3's
three prohibitions.

## 9. Two older defects fell out on the way

**A silent partial success.** Twenty-one files against twelve free slots stored
twelve and raised nine identical transient toasts into a stack that shows three at
a time. The run read as silent; the only evidence was a counter reading
`12 of 12`. `describe-refused-uploads.ts` now composes one message naming the
counts and the files, with no auto-dismiss.

**A delete that could never work.** Editor photo tiles carried synthesised ids
(`${productId}-seller-media-N`) while `deleteSellerMediaAction`'s schema is
`z.string().uuid()` — so deleting any *server-rendered* tile could only return
"That could not be identified", while deleting one uploaded in the same session
worked, because that one carried the real id the upload action returned.

## 10. Verified, and not

Final live state, read from the page rather than from a toast:

```
gallery thumbnails          12   curated supplier photos, no variant pollution
designs with own photo       8/8 distinct seller uploads
designs without one              fall back to the cover
```

**Not proven:** upload → arrange → publish → buyer through a signed-in seller.
The local database has no schema and was not migrated; portal previews sit behind
Vercel SSO. Nine of the beanie's designs still have no photograph — the cap that
blocked them is gone, the files are not yet uploaded.

**Known limit, unchanged:** the arrangement cannot be changed on a touchscreen.
Native drag fires from neither keyboard nor touch and WCAG 2.5.7's single-pointer
alternative is absent — the same accepted cost recorded for the Variant Matrix
grip in part 70, now true of three grips. "Set as cover" stays a real button so
the decision that matters most has a non-drag path.

**One judgement call**, easy to reverse: supplier tiles were removed from
`Product media` entirely rather than merely made undraggable. One `sourceType`
predicate in `editorGalleryMedia` puts them back.

## 11. Incidental, but it was blocking everyone

`outputs/` was in neither the eslint nor the prettier ignore list in
`sals3-ecommerce`, and the pre-commit hook runs the whole `verify`. A scratch
script there importing a non-dependency was making **every commit in that
repository fail**. Added to both lists, same category as `build/` and `coverage/`.

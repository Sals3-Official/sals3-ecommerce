---
tags:
  - sals3
  - sals3-portal
  - product-editor
  - product-description
  - cloudflare-r2
  - variant-matrix
  - pdp
  - session
aliases:
  - Description Block Editor
  - Description Images
  - Variant Matrix Rename
  - Part 54
created: 2026-08-19
updated: 2026-08-19
status: shipped
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
  - "[[storefront-product-contract-v2]]"
  - "[[sals3-session-2026-08-17-part49-portal-variant-matrix-r2-storage-meta-description-brand-origin-defaults]]"
  - "[[sals3-session-2026-08-18-part52-variant-matrix-category-suggestions-and-catalogue-truth]]"
  - "[[sals3-session-2026-08-18-part53-paid-order-path-and-the-queue-that-swallowed-it]]"
---

# Sals3 session 2026-08-18, part 54 — product descriptions become blocks, images land inside them, and the Variant Matrix stops being write-once

Three merged `sals3-portal` PRs, all in the Product Editor, all calibrated
against the **PDP Redesign v3.1** shell rather than invented independently:
[#124](https://github.com/Sals3-Official/sals3-portal/pull/124),
[#127](https://github.com/Sals3-Official/sals3-portal/pull/127),
[#129](https://github.com/Sals3-Official/sals3-portal/pull/129).

None of the three needed a schema change or a migration. That is not a
coincidence — it is why they could ship on the same day as the order path
(part 53) without competing for the one sanctioned production DDL route.

## 1. The description document could always hold four block types; the editor could reach one

`description-document.ts` has allowed `paragraph`, `heading`, `bulletList`,
and `keyValueList` since it was written, and `sals3-ecommerce`'s
`ProductDescription.tsx` already rendered all four. The editor was a single
`<textarea>`, and the save path ran `descriptionDocumentFromText`, splitting
on blank lines into paragraphs.

So three of the four block types were unreachable from the portal even though
every layer beneath could carry them, and the storefront's "About this
product" section could never look like the shell it was designed against.

**And the round trip was destructive.** `read-model.ts` handed the editor
`descriptionText` — a flattened projection — and Save Draft re-parsed that
string into paragraphs. Opening a product and pressing Save rewrote every
heading, bullet list, and detail list it held as prose, changed the checksum,
and landed as a real revision. Nobody had to touch the description for it to
be rewritten.

The editor now loads and writes the blocks themselves. The plain-text
projection survives only for the meta-description suggestion seam and the
catalogue's content-readiness check, and is documented as lossy in one
direction.

Verified the way part 51 asks for: the regression test was written, the fix
was reverted to confirm both structural assertions fail without it, then
restored.

## 2. Images inside the description (#127)

An `image` block — `{ url, alt, caption? }` — plus a palette that offers it
three ways, matching what the shell renders:

| Preset | Produces | Shell layout |
|---|---|---|
| Image, full width | one `image` block | 16:9, full width |
| Two images, side by side | two consecutive blocks | 4:3 pair grid |
| Three images, row of three | three consecutive blocks | auto-fit row |

**The presets are not new block types.** The storefront derives image layout
from *adjacency*, so a "row of two" is two consecutive image blocks. A stored
group can be left half-empty by a delete; a derived one cannot. Each block
reports what its run will produce (`1 of 2 side by side`), so the editor
cannot promise a layout the page will not render.

Text-and-image side by side is **deliberately absent**. The v3.1 shell puts
text in a 70ch column and lets images break out wider; offering that preset
would make the editor a preview that lies. It needs a shell change first.

### Storage: R2, and deliberately not a media row

Uploads go to Cloudflare R2 under a `description-media/` prefix through a
dedicated action, not `media-actions.ts`. That one writes a
`product_media_sources` row, which would make a size chart a **cover-photo
candidate** and count it toward the publishable media count. A description
image belongs to the description: no row, and the document is the only record
that it exists.

Stated in the module rather than discovered later: **a block deleted before
save leaves an orphaned R2 object, and no reaper exists.**

The validate-and-re-encode step (magic-byte sniff, 5 MB cap, 2000×2000 hard
refusal, `sharp` → WebP q82) was extracted to a shared
`image-upload-pipeline.ts` so the gallery and description paths cannot drift
into accepting different files.

### Where the host allow-list runs, and why it is not in the schema

`url` is allow-listed against `CLOUDFLARE_R2_PUBLIC_BASE_URL` at the **write
boundary** (`descriptionImagesAreStored`, refusing `image_not_stored` from
`saveProductDraft`), not inside `descriptionDocumentSchema`.

The schema is also the read path. An environment-dependent host check there
would mean a renamed `CLOUDFLARE_R2_PUBLIC_BASE_URL` silently emptying every
description that holds an image — in the editor and on the storefront at
once. Refusing a bad address on the way in is the same protection without
that failure mode.

`alt` is required and seller-entered, never derived from the product title —
the gallery's known weakness, not repeated in a block type designed now.

## 3. The Variant Matrix stops being write-once (#129)

Reported plainly: *after inputting the data it can no longer be edited.*

The data was never lost. Once mapped, the section switched to a read-only
summary and `saveOptionMapping` refused `ALREADY_MAPPED`. A seller who typed
`Colr` was stuck with it on the storefront permanently, and a screen that
cannot be reopened reads as one that lost the work.

Insert-only was the right first step and its reasons hold — but they are all
about **structure**: re-splitting means deleting option rows that
`product_variant_option_values` and `option_combination_key` depend on, which
needs an unmap path and a story for carts and accepted orders. As of part 53,
accepted orders are no longer hypothetical.

**None of that applies to the words.** `option_combination_key` is built from
the supplier's own token via `normalizeOptionToken`, never from the buyer
label, and `product_option_values.normalized_value` — the column the
uniqueness index and every variant link use — is untouched. So the axis name
and the buyer-facing labels are corrected with two `UPDATE`s: no row deleted,
no key recomputed, no variant identity moved, nothing to reconcile against an
order. Those two columns are also exactly what the seller types into that
form, so the rename covers all of the seller-entered data in it.

The summary card offers **Edit names** and states the limit in the same
place. Each supplier value is shown beside the name being given to it,
read-only. The `ALREADY_MAPPED` message no longer claims "changing it is not
supported" — it now says the structure cannot be re-split but the names can be
edited, which is true.

`rename-option-mapping.test.ts` asserts the safety property the way
`source-changes.ts` proves it cannot reach CJ: it reads the module's own
source and fails if a `.delete(`, a `normalizedValue:` write, a
combination-key recompute, or any variant/offer/binding table ever appears in
it. A mocked call sequence would assert the mock; this asserts the rule.

## 4. False copy removed, in the same family as part 52's findings

Two claims on the Description section were untrue and are gone.

- The banner said supplier HTML *"is sanitised before they are stored or
  rendered."* **No sanitiser exists** — `description-document.ts` says so in
  its own header. It now says supplier HTML is never copied into a Sals3
  listing, and that markup is rejected rather than displayed. A test asserts
  the old sentence cannot return.
- The section badged the description `SUPPLIER` and offered *"Reset to
  supplier content"*, while actually resetting to the last saved **seller**
  text. A CJ draft starts from an empty document, so CJ never wrote a word of
  it. Now badged `SELLER`, with "Revert to last saved".

## 5. Two defects the work surfaced in itself

- **`emptyBlockOfType` was an if-chain with a fallthrough return.** Adding
  `image` to the union compiled cleanly and every image button produced a
  *detail list*. Now an exhaustive `switch` with a `never` default, so the
  next block type is a compile error instead.
- **A hydration mismatch from React keys reaching the DOM.** Block keys came
  from a module-level counter that persists on the server and restarts in the
  browser, and those keys were used as `id` attributes. Field ids now come
  from `useId`; the counter stays for list identity only, which never
  serializes.

Both were caught by driving the real page, not by the test suite.

## 6. Verification

`npm run verify` green on each PR — lint, format, typecheck, build, unit and
E2E. Unit count moved 1955 → 1970 → 1983 across the three. Each was also
exercised in the running editor: presets insert the right blocks, the
adjacency hint reads correctly, the upload button renders disabled with its
reason, console clean.

## 7. Open

- **The storefront renderer for `image` blocks does not exist yet.** Until it
  lands in `sals3-ecommerce`, that repo's `salvagedArray` parser drops the
  unknown block and the text still renders — buyers see the description
  without the images rather than a broken page. Confirmed by reading
  `schemas.ts`, not assumed.
- **R2 is still unconfigured in production.** The five environment variables
  from part 49 remain AJ's; `CLOUDFLARE_R2_PUBLIC_BASE_URL` must be the public
  read address, never the private S3 endpoint. Upload stays visibly disabled
  with an honest reason until then.
- **`generateMetadata` still ignores the seller-edited meta description.**
  The field saves correctly to `products.meta_description`, but it is not
  carried in the storefront payload and the PDP still falls back to
  `{title} — {categoryName} at Sals3`. Two lines, one per repo; v3.1 §7 item 8.
- **Full re-split remains refused** — adding or removing an axis. That needs
  the unmap path and the cart/accepted-order decision, and accepted orders now
  exist.
- **Description images are not in JSON-LD.** v3.1 §7 recommends omitting them
  initially; unchanged.

## 8. Correction to part 49

[[sals3-session-2026-08-17-part49-portal-variant-matrix-r2-storage-meta-description-brand-origin-defaults]]
records PR #106 as open and left for AJ. It **merged 2026-08-18 00:06 UTC**.
A dated follow-up has been added to that note rather than rewriting it.

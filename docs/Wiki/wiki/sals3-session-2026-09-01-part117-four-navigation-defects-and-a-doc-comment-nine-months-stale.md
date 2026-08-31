---
tags:
  - sals3
  - sals3-portal
  - catalogue
  - session-note
aliases:
  - Part 117
  - Four Navigation Defects And A Doc Comment Nine Months Stale
created: 2026-09-01
updated: 2026-09-01
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-30-part105-catalogue-bulk-publish-and-a-price-cell-that-says-why]]"
---

# Part 117 — four navigation defects, and a doc comment describing a database this repository has had for months

2026-08-31, `sals3-portal`
[#290](https://github.com/Sals3-Official/sals3-portal/pull/290)/[#292](https://github.com/Sals3-Official/sals3-portal/pull/292),
no DDL in either.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## Four seller-reported navigation defects, fixed together (#290)

Owner report with screenshots, 2026-09-01: four separate places in the
Product Editor and Product Catalogue that sent a seller somewhere other than
where the action just taken implied.

**The description studio didn't return to the editor after saving.**
`DescriptionStudio` now calls `router.push(backHref)` roughly 900ms after a
successful save — long enough for the confirmation message to actually be
read, since it isn't always "Description saved." On a published product it
can instead say the save landed on an unpublished draft, a distinction that
must not be silently skipped past by an instant redirect.

**"Go to Product Catalogue" went to the wrong place.**
`PublishSuccessDialog`'s button used `EXIT_HREF`
(`/products/pipeline?tab=ready`) — correct for discard-and-leave, wrong for
"I just published." A new `CATALOGUE_HREF` (`/listings`) is specific to this
dialog; `EXIT_HREF` itself is untouched elsewhere. The dialog's "Storefront
path" — previously `/p/{slug}` shown as plain text — is now a real clickable
link labeled "Live listing," using a full address `publishProductAction`
computes server-side via `storefrontOrigin()`.

**The catalogue table had no pagination.** Client-side pagination over the
already-loaded/filtered array, with a seller-chosen page size (12/25/50/100
via a `Select`, added after initial feedback on the first cut). Switching
tab, changing a filter, or changing page size all reset to page 1; the
header "select all" still arms bulk actions against every filtered row
across every page, with the bulk bar's own count keeping that legible rather
than implying only the visible page is selected.

**"View Live Page" was a stub, and the product name always opened the
editor.** `storefrontUrl` on a catalogue row is now a full absolute address
(`storefrontOrigin()` + `/p/{slug}`), matching what the same field name
already meant on an order line — previously a bare slug nobody had wired a
link to. Also fixed along the way: it's now populated for
`LIVE_NEEDS_ATTENTION`, not only `LIVE` — attention reasons flag a listing
without unpublishing it, so the missing link there was a real gap, not an
edge case. A row's product name now opens the real storefront page (new
tab) for a live listing, or the editor for a draft.

Bundled alongside: the sidebar group renamed "Dropship Catalogue" → "Product
Catalogue," and its child item — the same label, confusingly duplicating the
parent — renamed to "All products."

## A doc comment that had described this repository as having no database for months (#292)

`product-catalogue/types.ts` and `product-editor/types.ts` still opened with
comments claiming "nothing here reads a database" and "Sals3 has no
Product/Variant/Offer table yet." Both claims stopped being true well before
this fix — `modules/catalog/products/read-model.ts`'s
`listCatalogueProductsForSeller`/`buildCatalogueProducts` and
`findProductEditorFixtureForSeller` build these fixtures from real
`products`, `product_variants`, `product_offers`, `product_media_sources`,
`product_options` and other tables, confirmed live in production serving
`/listings`. Both doc comments were rewritten to state the actual current
situation, noting that the illustrative `mock-data/product-catalogue.ts` and
`mock-data/product-editor.ts` fixtures now serve only the no-`productId`
preview path and tests. Documentation-accuracy fix only, confirmed by a
diff scoped to comment text with no runtime behavior change.

## Verification

#290: `npm run verify` green — lint, format, typecheck, build, 3651 unit
tests, 65 e2e. New/updated tests: redirect-after-save with fake timers,
`CatalogueRowActions`' real link plus the `LIVE_NEEDS_ATTENTION` case,
`CatalogueProductRow`'s name-link branching (live vs. draft),
`CatalogueProductPagination` (page nav and page-size select),
`ProductCatalogueWorkspace` pagination integration (default page size, Next,
page-size change, tab-change reset, empty-scope nav hiding). Existing
`ProductEditor.test.tsx` assertions updated for the corrected destination
and the new live-listing link. Manually verified against the reported
screenshots' exact flows. #292: lint 0 errors, format clean, typecheck
clean, build clean, 3634 passed / 4 skipped, 56 e2e passed / 19 skipped (the
pre-push hook ran the full `verify` chain end to end).

## What was not done

Neither PR touches the underlying pagination-vs-filtering interaction beyond
resetting to page 1 on a filter change — no server-side pagination, no URL
state for the current page (a refresh returns a seller to page 1).

## Lessons

- **A doc comment describing another module's absence has an expiry date
  the same way a doc comment describing another module's presence does**
  (see part 112's breadcrumb finding for the mirror case). Here the claim
  was "there is no database yet," written when true and left in place long
  after `read-model.ts` made it false — anyone reading the comment cold
  would misunderstand what the file actually does.
- **A field named identically across two contexts should mean the same
  thing in both.** `storefrontUrl` already meant "full absolute address" on
  an order line; the catalogue row's copy of the same field name had been
  left as a bare slug, which is the kind of inconsistency that survives
  because nothing forces the two call sites to be compared.
- **Bundling four independently-reported navigation defects into one PR
  works when none of the fixes touch shared state** — each of the four
  fixes here (redirect timing, a button's href, a pagination component, a
  link's URL shape) is independently testable and none depends on the
  others landing.

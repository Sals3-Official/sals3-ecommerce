---
tags: [sals3, sals3-portal, product-sourcing, product-catalogue, seller-center, session, database-backed, deployment]
aliases:
  - Product Sourcing to Product Catalogue Import
  - Ready Products to Catalogue
  - Part 38
created: 2026-08-13
updated: 2026-08-13
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-10-part23-catalogue-dropshipping-alignment]]"
  - "[[hot]]"
---

# 2026-08-13 - part 38 - Product Sourcing ready rows can create Product Catalogue drafts

`sals3-portal` PR [#68](https://github.com/Sals3-Official/sals3-portal/pull/68)
merged into `develop` at merge commit
`351ad9057314e17a087c14b2265b074ffb6f0cec` and deployed to Vercel Production:
<https://sals3-portal-n0iq41tn6-ajgarrigues.vercel.app>.

## What changed

The Product Sourcing Ready table now has a first-column checkbox and a
top-right **Add to Product Catalogue** button. A seller can select one or more
ready candidates and copy them into Product Catalogue in one bulk action.

Rows already represented in Product Catalogue are visibly highlighted with a
light-blue background and their duplicate action is disabled, so the same
candidate is not silently added twice.

The Product Catalogue page at `/listings` is no longer only a fixture preview
when a database is available. It reads the real product, offer, variant,
supplier-binding, provider-reference, media, revision, and source-candidate
data that currently exists for the seller. The existing lifecycle UI remains
the same; the work populated the approved interface rather than redesigning it.

`/listings/new?productId=...` now opens the Product Editor using a tenant-scoped
database-backed product read model. Unknown or cross-tenant product IDs answer
404. Fixture mode still exists for the older design-preview URLs.

## Important product boundary

The owner asked for moved products to be **live agad**. That was not implemented
as a forced Live state, because the current product/offer/publication model has
real publication gates: category, usable media, price, options, revision, and
publication status. Marking a newly copied candidate Live without satisfying
those gates would make the catalogue UI claim something the system cannot yet
prove.

Imported candidates therefore become Product Catalogue drafts/unpublished rows.
The Catalogue and editor now show the real blockers needed before publication.

## Main implementation notes

- `bulkCreateProductDraftsAction` validates the selected candidate IDs, enforces
  seller/actor authorization, caps the batch at 50, and revalidates
  `/products/pipeline` plus `/listings`.
- Product Sourcing computes which Ready and Needs Attention candidates already
  have catalogue copies, then passes those IDs down to the table.
- The Product Catalogue read model does not make supplier API calls. It maps
  only persisted Sals3 data and treats missing or unavailable database state as
  an honest empty/unavailable UI.
- The editor can render database-backed products, but editor changes are still
  not saved yet. It says so on screen.
- CJ supplier browse failures now degrade as `upstream-unavailable` instead of
  crashing the page or blocking unrelated catalogue E2E tests.

## Verification

Local before commit:

- `npm.cmd run lint`
- `npm.cmd run format:check`
- `npm.cmd run typecheck:clean`
- `npm.cmd run build`
- `npm.cmd run test:run` - 157 files passed, 4 skipped; 1353 tests passed, 4
  skipped
- `npm.cmd run test:e2e` - 78 passed, 5 skipped
- `npm.cmd run verify`
- `npm.cmd audit --audit-level=high` - no high-severity vulnerabilities; only
  existing moderate `esbuild` exposure through `drizzle-kit`

Git hooks:

- pre-commit `npm run verify` passed
- pre-push `npm run verify` passed

Remote:

- PR #68 GitHub `verify` passed
- PR #68 Vercel preview passed
- post-merge `develop` GitHub `verify` passed
- Vercel Production deployment status: `success`

## Commits

```text
a95e5be feat(catalogue): import sourcing drafts
b557be2 merge develop into catalogue branch
e2b88e7 test(catalogue): allow no-db e2e state
351ad90 Merge pull request #68 from Sals3-Official/codex/product-sourcing-to-catalogue
```

## Still open

1. Publication is still gated; copied products are drafts until the required
   product/offer/media/revision data is complete.
2. Database-backed Product Editor changes are display-only for now; persistence
   is not implemented.
3. The Product Catalogue read model is intentionally Sals3-persisted-data only;
   it does not refresh CJ evidence during render.

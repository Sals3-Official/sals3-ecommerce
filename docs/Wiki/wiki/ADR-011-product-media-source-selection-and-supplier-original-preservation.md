---
tags: [sals3, adr, catalog, media, seller-upload, supplier-media, product-revision]
aliases: [Product Media Source Selection, Seller Pictures and Supplier Fallback]
created: 2026-08-10
updated: 2026-08-22
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: not-started
related:
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-implementation-phases]]"
  - "[[hot]]"
---

# ADR-011 — Product media source selection and supplier-original preservation

> [!DANGER] Amended 2026-08-21 — "no upload/storage backend exists" is no longer true
> Seller upload, Cloudflare R2 storage, the supplier-photo switch, and provenance-driven
> `mediaStatus` all ship and reach buyers. Read the amendment at the end before citing the first
> Evidence bullet. `MediaAsset` proper, a `NEEDS_MEDIA_REVIEW` reviewer, and the
> Merchant-Center eligibility check ADR-016 asks for are still missing.

> [!DANGER] Amended 2026-08-22 — §4's `SUPPLIER_FALLBACK` label is not what the seller reads
> The catalogue shows **`Supplier photo`** for that state. The code, the derivation, and this
> ADR's vocabulary are unchanged; the seller-facing words are not. §4's table below is the
> original wording. Read `Amendment — 2026-08-22` at the end before quoting a label from it.

## Status

`approved`

## Problem

A Dropshipper needs to choose between their own product pictures and pictures supplied by CJ or another installed supplier. When no eligible seller picture exists, Sals3 should use eligible supplier pictures automatically. The Seller Center must still show the original supplier set for comparison, provenance, change detection, rights review, and support evidence.

This cannot be a simple mutable image URL. Supplier files can change or disappear, seller uploads can be rejected or removed, rights may be uncertain, variants may need different images, and an accepted order must retain the exact media shown at purchase.

## Evidence

- The Product Editor design already has cover selection, ordering, media-rights status, and storage status, but `Upload image` is disabled because no upload/storage backend exists.
- The implementation specification requires controlled media storage, provenance, rights basis, checksum, revision membership, server-side supplier fetching, upload limits, and publication validation.
- ADR-007 requires approved supplier media to be copied into Sals3-controlled storage before publication and preserved in immutable order snapshots.
- The exact seller-first/supplier-only preference, automatic supplier fallback, original-supplier gallery, and catalogue media-source statuses were not previously explicit.

## Options considered

### Option A: Supplier pictures only

Benefits:

- Smallest implementation.
- No seller upload workflow.

Risks:

- Prevents seller differentiation.
- Keeps Sals3 dependent on supplier creative quality.
- Does not solve supplier-media rights, mutation, or disappearance.

### Option B: Seller upload replaces and discards supplier pictures

Benefits:

- Simple public media resolution.
- Seller controls the storefront gallery.

Risks:

- Destroys comparison and provenance.
- Makes supplier changes and disputes harder to audit.
- Cannot safely fall back after the seller removes all usable uploads.

### Option C: Preserve both sources and resolve a revision-owned public set

Benefits:

- Supports seller differentiation and explicit supplier use.
- Keeps immutable supplier originals visible for evidence.
- Allows an automatic, rights-aware fallback.
- Produces a deterministic public gallery and catalogue status.

Risks:

- Requires controlled storage, moderation, revisions, and more status fields.
- Automatic fallback can surprise a seller unless it is visible and audited.

## Strongest objection

Media storage, rights review, optimization, and revision history are substantial work before the first catalogue launch. A supplier-only pilot would ship sooner.

The objection is valid, but supplier-only publication still requires rights validation and controlled copies. The selected design can launch incrementally: supplier media first, then seller uploads, while keeping the same provenance and resolver contract. It avoids a throwaway data model and prevents a later upload feature from erasing supplier evidence.

## Decision

Bogs approved Option C on 2026-08-10.

### 1. Keep source evidence separate from publishable media

- `SupplierMediaObservation` records the original supplier URL/identity, supplier product and variant, captured time, checksum, MIME/dimensions, rights state, and source snapshot. It is read-only evidence and remains visible in the Product Editor's **Original supplier pictures** panel.
- `MediaAsset` represents a file stored in Sals3-controlled storage. Its `sourceType` is `SELLER_UPLOAD` or `SUPPLIER_IMPORT`; it records checksum, storage identity, upload/import actor, rights basis, review state, derivatives, and provenance back to the supplier observation when applicable.
- Public pages never rely on a mutable supplier URL. Only approved Sals3-controlled derivatives belong to a published `ProductRevision`.

### 2. Seller preference and deterministic resolver

Store one revision-level preference:

```text
SELLER_FIRST | SUPPLIER_ONLY
```

Resolve the public gallery in this order:

1. Exclude rejected, unsafe, unlicensed, missing, or unapproved assets.
2. If `SUPPLIER_ONLY`, use the ordered eligible supplier-import set.
3. If `SELLER_FIRST` and eligible seller uploads exist, place the ordered seller set first. Eligible supplier assets may fill required minimum/variant coverage; the result is `MIXED` when both sources are public.
4. If `SELLER_FIRST` and no eligible seller upload exists, use the ordered eligible supplier set and mark the resolution `SUPPLIER_FALLBACK`.
5. If no rights-known publishable set satisfies cover, minimum image, and required variant coverage, block publication with `MEDIA_REVIEW_REQUIRED` or `NO_PUBLISHABLE_MEDIA`. Never fall back to unverified supplier media merely to avoid an empty gallery.

The default for a newly imported supplier candidate is `SELLER_FIRST`, which gives the seller an upload path and automatically uses approved supplier media until an eligible seller upload exists.

When an option changes the visible item, store an explicit variant-to-media binding. The selected variant's customer-facing picture, color/style label, included quantity, and required measurement facts must agree. A mismatch becomes `NEEDS_MEDIA_REVIEW`; a generic attractive image cannot silently stand in for a materially different variant. The pilot may start with controlled supplier media and add seller uploads later through the same resolver—no separate enterprise moderation service is approved.

### 3. Product Editor behavior

The **Media** section contains:

- **Your pictures** — upload, reorder, choose cover, replace/archive, show validation/review state;
- **Original supplier pictures** — always-visible read-only source set with capture time, checksum/provenance, rights state, source-change marker, and an action to select eligible assets for the revision;
- **Picture preference** — `Use my pictures first` or `Use supplier pictures`;
- **Storefront preview** — consumes the same resolved media read model as the customer PDP.

Deleting or rejecting all seller uploads while `SELLER_FIRST` is active creates a new audited resolution. It may become `SUPPLIER_FALLBACK` only when the eligible supplier set passes every publication rule.

### 4. Catalogue status

Keep listing lifecycle and media source as separate fields. **Product Catalogue** shows and filters:

```text
Listing: DRAFT | LIVE | LIVE_NEEDS_ATTENTION | AUTO_PAUSED | ARCHIVED
Media: OWN_PICTURES | SUPPLIER_PICTURES | MIXED_PICTURES |
       SUPPLIER_FALLBACK | NEEDS_MEDIA_REVIEW | NO_USABLE_PICTURES
```

The status is derived from the published/current revision's resolved set, never from a client-selected badge. `SUPPLIER_FALLBACK` is visible to the seller. It is not a customer-facing warning when the supplier assets are approved.

### 5. Revision, supplier changes, and orders

- Reordering, replacing, changing preference, or changing the effective media set creates a new `ProductRevision`.
- A supplier image change creates a new observation and attention item; it never mutates an already-published or ordered revision in place.
- A supplier delist or rights revocation auto-pauses only affected future sales when the current published revision no longer has a valid media basis.
- Accepted orders continue to reference the exact controlled media snapshot shown at acceptance under ADR-007.

### 6. Upload and external-fetch safety

- Authenticate and authorize every upload/mutation against the seller-owned product.
- Rate-limit upload sessions and enforce allow-listed MIME/extension, byte, pixel, dimension, and file-signature limits.
- Generate server-controlled object keys, strip unnecessary metadata, scan supported files, checksum, deduplicate, and create optimized responsive derivatives.
- Fetch supplier files server-side with ADR-010's SSRF, redirect, DNS/address, size/type, timeout, and credential-forwarding controls.
- Require a rights basis/review state before publication. A seller declaration is evidence, not automatic proof when the content itself creates a legal/IP concern.

### 7. Ready-to-code slices

Implement in this order:

1. **Migration and contracts:** add supplier observations, controlled assets, revision-media membership/order/cover, preference, resolved status, rights/review state, optimistic version, indexes, and Zod schemas. Do not migrate a mutable supplier URL directly into a published revision.
2. **Controlled supplier import:** server-side allow-listed fetch, safety limits, checksum/deduplication, original plus derivatives, provenance, and idempotent retry.
3. **Seller upload:** authenticated/rate-limited upload-session action, server-generated object key, completed-object verification, scan/metadata stripping, derivatives, rights declaration, and audit.
4. **Pure media resolver:** one deterministic server module accepts revision preference, eligible assets, minimum/variant rules, and policy version; returns ordered asset IDs, cover, status, blockers, and checksum. Unit-test this before UI work.
5. **Product Editor:** build **Your pictures**, **Original supplier pictures**, preference, reorder/cover controls, validation states, and preview against the resolver output. Never duplicate resolver logic in the client.
6. **Publication and catalogue:** publication reruns the resolver/server gates, writes a new revision atomically, exposes listing/media status and filters in Product Catalogue, and sends only resolved controlled assets to the storefront read model.
7. **Change/order protection:** supplier observation diff, attention/auto-pause, rollback to last valid revision, and immutable accepted-order media reconciliation.

## System impact

- Data and schema: `SupplierMediaObservation`, `MediaAsset`, `ProductRevisionMedia`, revision-level `mediaPreference`, resolved-media status, rights/review records, and immutable order-media references.
- Modules: `sals3-portal` owns upload/import, provenance, resolver, Product Editor, revisioning, and publication validation. `sals3-ecommerce` receives only the resolved published media read model.
- User workflow: seller can upload own pictures, inspect supplier originals, select a preference, preview the resolved set, and see media status in Product Catalogue.
- Financial or compliance effect: controlled storage and moderation cost increase; provenance and rights gates reduce misleading, missing, or unauthorized product media.
- Migration and rollback: existing supplier URLs become observations and controlled imports before publication. A bad resolver version rolls back by republishing the last valid revision; historical assets/observations remain.

## Required verification

- Focused tests:
  - `SELLER_FIRST` with eligible seller uploads resolves seller media first;
  - `SELLER_FIRST` with no eligible seller upload resolves approved supplier media as `SUPPLIER_FALLBACK`;
  - `SUPPLIER_ONLY` never publishes a seller upload;
  - rejected/unverified assets never enter the resolved public set;
  - mixed minimum/variant coverage produces `MIXED_PICTURES` deterministically;
  - no eligible set blocks publication rather than hotlinking an unsafe source;
  - original supplier observations remain visible after seller uploads, preference changes, and supplier URL changes.
- Full or cross-module tests:
  - upload -> review -> revision -> publish -> storefront uses only controlled derivatives;
  - seller deletes all own images -> audited valid fallback or auto-pause;
  - supplier replaces/removes an image -> new observation/attention, no mutation of prior revisions/orders;
  - cross-tenant upload/media mutation is denied.
- Manual acceptance:
  - Product Editor shows **Your pictures**, **Original supplier pictures**, preference, preview, and plain-language status;
  - Product Catalogue filters correctly by listing and media status;
  - desktop/mobile upload, reorder, keyboard controls, fallback explanation, and preview are understandable.
- Data reconciliation:
  - every published media reference resolves to one approved controlled asset and provenance record;
  - revision media counts/checksums reconcile with storefront and accepted-order snapshots;
  - no public asset exists without a review/rights state and audit source.

## Supersession

None. This makes the media-source behavior implicit in ADR-001/007 and the implementation specification explicit.

## Amendment — 2026-08-21: seller upload and storage exist, and reach buyers

> [!WARNING] Supersedes the first Evidence bullet
> "`Upload image` is disabled because no upload/storage backend exists" was true on 2026-08-10.
> It is now false in both halves: the control works, and a durable object store backs it.

### What shipped

- **Storage** is Cloudflare R2, reached through `@aws-sdk/client-s3` (`r2-client.ts` /
  `r2-url.ts`). Vercel Blob was the first backend for a few days and is **gone** — no
  `@vercel/blob` dependency, no `blob-url.ts`. Do not reintroduce those imports.
- **Upload** is real and validated: `sharp` re-encodes to WebP at q82 with a 2000px cap, with
  magic-byte checks and hard 5MB / 2000×2000 limits, keyed under `seller-media/<productId>/`.
  Description-body photos are a separate path under `description-media/` and are deliberately
  **never** `product_media_sources` rows, so a size chart can never become a cover-photo
  candidate — which is this ADR's own gallery/provenance boundary, enforced at the write side.
- **Buyers see it.** A storefront `mediaVisibleToBuyers` predicate is shared by the card's
  primary image and the PDP gallery: a seller upload always shows and outranks the supplier
  original, and `products.show_supplier_photo` off hides the supplier photo **only once an
  approved seller upload exists** — owner decision 2026-08-20, because an empty gallery falling
  back to the supplier photo beats rendering a blank page.
- **`mediaStatus` now reads provenance, not presence.** It was derived from `media.length > 0`,
  so a product carrying only a projected `SUPPLIER_ORIGINAL` photo reported "Own pictures". It
  now reads each row's `sourceType` and resolves to this ADR's own labels —
  `OWN_PICTURES` / `MIXED_PICTURES` / `SUPPLIER_FALLBACK` / `NO_USABLE_PICTURES`.

### Still open

- **`MediaAsset` proper does not exist.** `product_media_sources` is a provenance table; the
  checksum, revision-membership, and rights-basis machinery §"Decision" describes is only
  partially represented. Published supplier media carries the owner-declared `SUPPLIER_TERMS`
  basis and nothing richer.
- **`NEEDS_MEDIA_REVIEW` has no reviewer.** The state exists in the vocabulary and in the
  Product Catalogue's badge; no queue, no gate, and no person is assigned to clear it.
- **No Merchant-Center eligibility check on supplier photos.** ADR-016 §"Evidence" is explicit
  that CJ originals carry watermarks, logo overlays, and price text in practice, and asks for
  that check to live *inside* this pipeline rather than as a later bolt-on filter. It does not
  exist yet, in either place.
- **`NEXT_PUBLIC_R2_IMAGE_BASE_URL` unset means seller uploads silently do not render** — no
  error, no log. Documented behaviour rather than a defect, and a real trap when running the
  storefront outside production.
- **Runtime end-to-end is unproven.** Upload through a real signed-in seller session, all the way
  to a buyer's PDP, has not been exercised.

**Frontmatter `updated`** moved to 2026-08-21. `status` stays `approved`: this records what was
built against an approved decision and decides nothing new.


## Amendment — 2026-08-22: `SUPPLIER_FALLBACK` reads `Supplier photo` in the catalogue

> [!WARNING] Supersedes §4's label, not its state set
> `SUPPLIER_FALLBACK` is still the state, still derived from the resolved set, still never
> client-selected. Only the words the seller sees changed, plus the badge tone.

Owner decision, 2026-08-22, on seeing the live Product Catalogue. §4 fixes the catalogue's media
vocabulary verbatim and `SUPPLIER_FALLBACK` was rendered as **`Supplier fallback`**. It now reads
**`Supplier photo`**, and its `StatusPill` tone moved from `warning` (amber) to `info`.

### Why the label was wrong in practice

"Fallback" names the *resolution rule* — no eligible seller picture exists, so the approved
supplier set is used — which is precisely what §2's resolver does and what this ADR needed a word
for. To a seller reading their own catalogue it names a **fault in their listing** instead.

And it is not the exceptional case. `mediaStatusOf` returns `SUPPLIER_FALLBACK` for any published
product carrying only the supplier's own photo, and `create-draft.ts` / `publish.ts` project that
photo into `product_media_sources` as `SUPPLIER_ORIGINAL` — so it is the state of nearly every row
in production. §4's own closing sentence already says it "is not a customer-facing warning when
the supplier assets are approved"; the amber pill was contradicting that sentence on the seller's
side of the screen, and a warning colour on the ordinary case trains a reader to ignore the
column.

### What is unchanged

- The state code `SUPPLIER_FALLBACK`, everywhere in the schema, the read model, the filters, and
  the tests.
- §2's resolver order and the audited re-resolution in §3.
- The tooltip, which still explains the resolution rule in full, so the mechanics remain
  discoverable from the badge itself.
- Every other label in §4's table.

### Where the override is recorded

On `MEDIA_STATUS_LABELS` in `sals3-portal`'s
`src/lib/seller-center/product-catalogue/types.ts`, and on the tone map in
`MediaStatusBadge.tsx`. Both doc comments name this amendment and say not to reconcile the label
back. That is the same handling the PDP sticky-panel and micro-label overrides got, and it exists
because the previous wording is quotable straight out of this ADR.

### Known rough edge

`SUPPLIER_PICTURES` still reads `Supplier pictures`, which now sits close to `Supplier photo` in
the catalogue's media filter. The real read model never produces `SUPPLIER_PICTURES` — only
fixtures do, and its §4 tooltip claims a revision-level supplier-only preference that is not
stored anywhere — so the two never appear together on a production row. Left as-is rather than
renamed in the same change; retiring that status is its own decision.

See [[sals3-session-2026-08-22-part67-the-catalogue-column-that-was-doing-nothing]] and
`sals3-portal` [#172](https://github.com/Sals3-Official/sals3-portal/pull/172).

**Frontmatter `updated`** moved to 2026-08-22. `status` stays `approved`: this records a
seller-facing wording decision against an approved decision and changes no state, gate, or rule.

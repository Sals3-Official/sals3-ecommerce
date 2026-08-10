---
tags: [sals3, adr, catalog, media, seller-upload, supplier-media, product-revision]
aliases: [Product Media Source Selection, Seller Pictures and Supplier Fallback]
created: 2026-08-10
updated: 2026-08-10
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

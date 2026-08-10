---
tags: [sals3, cj-dropshipping, catalog, product-editor, seller-center, implementation-spec]
aliases: [CJ Candidate Explorer to Sals3, CJ Candidate to Sals3 Draft, CJ Product Customization Handoff, Product Editor Handoff Spec]
created: 2026-08-06
updated: 2026-08-10
status: approved
authority: implementation-spec
owner_approved: true
implementation_status: shortlist-step-implemented
related:
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-end-to-end-process-flow]]"
  - "[[sals3-implementation-phases]]"
  - "[[sals3-global-seller-center-ux-blueprint-proposal]]"
  - "[[sals3-portal-code-review-2026-08-06]]"
---

# CJ candidate to Sals3 product draft implementation specification

> [!IMPORTANT] Approved contract; not implemented
> Bogs approved resolving the CJ-to-product-editor design blockers and the phase-1 exception-based auto-publication model on 2026-08-06. This note defines the implementation contract. It does not claim that the database, APIs, editor, worker, notification system, or publish flow exists.
>
> [[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]] adds the approved seller-account and provider boundary: this flow is available only to a Dropshipper account through a healthy supplier connection it owns. Its registration, tenancy, connection, and provider-identity rules override older single-tenant assumptions in this note.

> [!IMPORTANT] Approved decision-governance amendment, 2026-08-10
> [[ADR-010-catalog-decision-governance-and-shadow-enforcement]] strengthens this contract without replacing its existing `REVIEW` boundary. `PASS_WITH_ATTENTION` remains limited to non-blocking quality or operational warnings. Unresolved legal, IP, safety, permit, mapping, media-rights, evidence, or near-duplicate uncertainty remains pre-publication `REVIEW`. New automatic publish/block/pause rules require a labelled golden pilot set, shadow measurement, owner-approved promotion gates, and a bounded canary. Near-duplicate perceptual hashes create reviewable clusters; they never auto-merge or auto-reject different provider identities.

> [!IMPORTANT] Approved media and merchandising amendments, 2026-08-10
> [[ADR-011-product-media-source-selection-and-supplier-original-preservation]] defines seller-first/supplier-only controlled media, always-visible supplier originals, rights-aware fallback, revisions, and catalogue media status. [[ADR-012-supplier-trend-signals-and-storefront-merchandising]] defines CJ trend/listing data as Portal-owned ranking signals only after qualification, with a protected published `Trending now` storefront contract. Neither media fallback nor popularity can bypass this specification's review, hold, block, freshness, freight, contribution, or publication gates.

> [!IMPORTANT] Approved CJ evidence calibration, 2026-08-10
> [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] preserves split CJ/factory/verification inventory facts without declaring factory-backed stock automatically unusable, separates stocked-origin evidence from a destination freight route, adapts scan partitioning only when a provider cap is reached, and defers unused channel/search/recall/sample/advanced-ranking machinery. Google/channel specifications are optional future integration references, not core Sals3 catalog authority.

## 1. Problem

`sals3-portal` already provides a protected, paginated view of CJ listings. That feed lets an employee discover a supplier candidate. It does not create a Sals3-owned product, variants, offer, media record, or editable draft.

Sals3 needs one safe handoff from a CJ listing to a product editor. The editor must support the same jobs shown in the supplied reference screens: basic information, specifications, description, sales information, shipping, other controls, issues, and preview. Sals3 does not copy Shopee's code, branding, or platform-specific taxonomy.

## 2. Decision summary

```text
CJ listing in All Supplier Products
  -> automatic bounded discovery and explainable queue admission
  -> fresh automated preflight
  -> PASS | PASS_WITH_ATTENTION | REVIEW | HOLD | BLOCKED | EVALUATION_FAILED
  -> idempotent import job for eligible PASS or PASS_WITH_ATTENTION only
  -> CJ detail, variant, inventory, and media snapshot
  -> Sals3 category and attribute mapping
  -> separate Sals3 product revision and seller offer
  -> fresh server-side publication gates
  -> auto-approve and auto-publish eligible products
  -> attention queue for warnings and blocked exceptions
  -> webhook and reconciliation sync of supplier facts
```

The existing CJ listing is a candidate source only. The customer storefront must not read the raw candidate as a published Sals3 product after this path is implemented. Phase 1 is **human-on-exception**, not human approval on every item: automation may publish only an explicitly selected import that passes every hard gate. No score, warning, user role, or client request can override a red blocker.

## 3. System boundary

### 3.1 Logical ownership

| Component | Owns | Must not own |
|---|---|---|
| `sals3-portal` | Seller Center UI, authenticated actor context, CJ candidate discovery | Canonical product, retail price, publish state |
| Catalog Admin API | Product drafts, variants, attributes, offers, media, reviews, revisions, publish decisions | CJ credentials in browser code |
| CJ adapter and worker | CJ authentication, enrichment, synchronization, rate/points control | Customer-facing editorial content |
| Pricing module | Versioned retail price and market contribution checks | Supplier catalog identity |
| Customer catalog API | Published, stable Sals3 product contract | Drafts, raw CJ payloads, admin controls |
| Database | Canonical Sals3 state and audit history | Unredacted secrets |

### 3.2 Initial physical placement

> [!IMPORTANT] Revised 2026-08-07 by Bogs — placement moved to `sals3-portal`
> This section previously placed the catalog database and Catalog Admin API in
> `sals3-ecommerce` and forbade a writable catalog in `sals3-portal`. That is
> **superseded**: the catalog database now lives in `sals3-portal`, alongside
> the Seller Center screens that write to it. The rationale below records why,
> so the reversal is auditable rather than silent.

Use a modular monolith for the first implementation, hosted in `sals3-portal`:

- Keep Seller Center screens in `sals3-portal`.
- Put the catalog domain model, database access, and candidate persistence in `sals3-portal` as server-only modules.
- Use `src/modules/catalog/` for catalog domain/application code. Database schema and client live in `src/lib/db/`.
- Catalog modules must not depend on React components.
- Seller Center writes reach the catalog through **Server Actions**, not a cross-service HTTP API. Next.js verifies the request origin for Server Actions, which covers CSRF for those mutations.
- `sals3-ecommerce` reads published catalog data through `sals3-portal`'s existing protected storefront endpoints (`/api/storefront/*`). It does not connect to the catalog database directly.
- The browser never calls CJ, never receives CJ credentials, and never sends a trusted CJ object — only a stable supplier identifier.

Why the reversal, recorded for audit:

- The writing UI and the written tables are now in one deployable, so an internal write needs no network hop and no shared service credential. One fewer secret to store, rotate, and leak.
- The earlier split required a `CATALOG_ADMIN_API_TOKEN` shared between two repos purely to let one Sals3 app write to another. That credential no longer exists.
- Trade-off accepted: `sals3-portal` is now the catalog's owner, so extracting a standalone catalog service later means moving `src/modules/catalog/` and `src/lib/db/` out of the portal. Domain and Zod contracts are kept free of React and of Next.js request types specifically so that move stays mechanical.

If the backend is extracted later, preserve the domain contracts. Repository extraction must not change product identity or audit history.

#### 3.2.1 Approved persistence stack (2026-08-07)

- PostgreSQL.
- Drizzle ORM and Drizzle Kit for schema, typed queries, and checked-in SQL migrations.
- `postgres.js` as the driver.
- Zod for every external and client input.

Prisma was evaluated and rejected by Bogs. Do not reintroduce it.

### 3.3 Service authentication

- The portal requires a real authenticated employee session before production use.
- Every catalog mutation authorizes the actor server-side through `requirePermission` before any read or write. A hidden or disabled control is never the authorization check.
- Under the revised 3.2 placement there is **no service-to-service credential** for internal catalog writes: the writing UI and the tables share one deployable, so no such secret exists to rotate or leak. The `sals3-ecommerce` storefront feed keeps its own shared secret (`SALS3_STOREFRONT_API_TOKEN`) for reads.
- Database credentials are server-only and never use a `NEXT_PUBLIC_` variable. The database client refuses to load in a client bundle. Non-local database hosts require verified TLS.
- Sensitive responses use `Cache-Control: no-store`; catalog pages that read the database are rendered dynamically, not cached.
- Cookie-backed mutations require CSRF protection. Server Actions rely on Next.js's built-in origin verification.
- Abuse-sensitive catalog operations (shortlist, preflight, import) are rate-limited per actor and audited.

The current development-role switch is not production authentication. Publishing stays disabled outside an explicitly configured non-production environment until real employee authentication exists.

## 4. Product identity and duplicate rules

### 4.1 Identity

- `Product.id` is the global Sals3 catalog identity.
- `Variant.id` is the stable Sals3 sellable identity.
- `Offer.id` is one seller's market and fulfillment offer for one variant.
- CJ `pid`, `vid`, and SKU remain external supplier identifiers.
- A title, slug, SKU string, or image address is never an identity key.

### 4.2 Duplicate import

- `ProviderProductReference` has a unique key on `(supplierProviderId, externalProductId)`.
- Re-importing the same CJ `pid` returns the existing Sals3 product or active draft. It does not create a duplicate product.
- If the product exists but the requesting seller has no offer, the flow creates a draft offer for that seller after authorization.
- Different CJ `pid` values are not auto-merged. A similarity check can flag a possible duplicate for review.
- Merging two products is a separate audited operation. It is not part of import.

Every import request requires an `Idempotency-Key`. The same key and same payload return the original result. The same key with a different payload returns `409 IDEMPOTENCY_CONFLICT`.

### 4.3 Database identity constraints

- `Product.slug` is unique among active public products. Historical slugs remain reserved for redirects.
- `Variant.sals3Sku` is globally unique and immutable after first publication.
- `ProviderVariantReference` is unique on `(providerProductReferenceId, externalVariantId)`.
- `SupplierConnection` is unique on `(sellerAccountId, supplierProviderId)` in phase 1.
- `Offer` is unique on `(sellerAccountId, variantId, marketCode, fulfillmentMode)`.
- `OfferSupplierBinding` binds one exact offer to the supplier connection and provider variant used to fulfill it.
- One variant cannot contain the same option twice.
- One product cannot contain two active variants with the same normalized option combination.
- Idempotency records store actor, operation, request hash, result reference, and expiry policy.

## 5. Required domain entities

### 5.1 Core catalog

```text
Product
- id
- title
- slug
- descriptionDocument
- categoryId
- brandMode: UNBRANDED | DECLARED
- brandName
- publicationState
- currentRevision
- publishedRevisionId
- createdAt / createdBy
- updatedAt / updatedBy
- publishedAt

ProductOption
- id
- productId
- name
- position

ProductOptionValue
- id
- optionId
- label
- normalizedValue
- swatchOrMediaId
- position

Variant
- id
- productId
- sals3Sku
- status: DRAFT | ACTIVE | UNAVAILABLE | RETIRED
- optionValueIds
- weightGrams
- lengthMillimeters
- widthMillimeters
- heightMillimeters
- version

Offer
- id
- sellerAccountId
- variantId
- marketCode
- fulfillmentMode
- price: Money
- compareAtPrice: Money | null
- comparisonEvidenceId: string | null
- availabilityState
- publishState
- pricingVersion
```

`descriptionDocument` uses a structured allow-listed document format. Rendering must not accept unsanitized supplier HTML.

### 5.2 Supplier and synchronization

```text
SupplierProvider
- id
- code: CJ_DROPSHIPPING | future approved provider code
- adapterKey
- status

SupplierConnection
- id
- sellerAccountId
- supplierProviderId
- status: NOT_CONNECTED | AUTHORIZING | CONNECTED | DEGRADED | REAUTH_REQUIRED | DISCONNECTED | REVOKED
- encryptedCredentialReference
- connectedAt / lastVerifiedAt

ProviderProductReference
- id
- productId
- supplierProviderId
- externalProductId: CJ pid
- sourceStatus
- snapshotChecksum
- lastObservedAt
- lastSuccessfulSyncAt
- syncState

ProviderVariantReference
- id
- providerProductReferenceId
- variantId
- externalVariantId: CJ vid
- externalSku
- sourceStatus
- lastObservedCost: Money
- lastObservedInventory
- lastObservedAt

ProviderVariantInventoryObservation
- id
- providerVariantReferenceId
- countryCode
- cjInventory
- factoryInventory
- totalInventory
- verifiedWarehouse: VERIFIED | UNVERIFIED | UNKNOWN
- capturedAt
- sourceRequestId

SupplierScanPartition
- id
- supplierConnectionId
- categoryId / timeStart / timeEnd / additionalFilters
- state: PENDING | RUNNING | COMPLETED | FAILED | SUPERSEDED
- observedCount / firstSourceKey / lastSourceKey
- startedAt / completedAt / retryAt

SupplierWebhookSubscription
- id
- supplierConnectionId
- externalProductId
- desiredState / observedState
- lastVerifiedAt / failureReason / retryAt

SupplierSnapshot
- id
- supplierConnectionId
- providerProductReferenceId
- schemaVersion
- checksum
- capturedAt
- productReference
- variantReferences
- inventoryReference
- redactedPayloadReference

OfferSupplierBinding
- id
- offerId
- supplierConnectionId
- providerVariantReferenceId
- state
```

Store raw supplier payloads only in protected storage. Redact secrets and unnecessary personal data. Keep schema version, checksum, request ID, and capture time for diagnosis.

### 5.3 Workflow and governance

```text
CatalogImportJob
SupplierCandidate
- id
- supplierConnectionId
- externalProductId
- intendedSellerAccountId
- intendedMarketCodes
- shortlistState
- lastPreflightId
- createdAt / createdBy

CandidatePreflight
- id
- candidateId
- policyVersion
- sourceSnapshotChecksum
- decision
- qualityScore
- reasonCodes
- checkedAt
- expiresAt

CandidateSignal
CandidateReviewDecision
ProductRevision
- id
- productId
- revisionNumber
- workflowState
- expectedProductVersion
- contentSnapshot
- approvalMode: AUTO | MANUAL_EXCEPTION
- approvalPolicyVersion
- approvedAt / approvedBy
- submittedAt / submittedBy
- reviewedAt / reviewedBy
CategoryMappingRule
CategoryMappingLog
AttributeMappingRule
AttributeMappingLog
MediaAsset
MediaReview
ProductReviewIssue
AttentionIssue
- id
- productId / variantId / marketCode / offerId
- code
- policyImpact: BLOCKER | WARNING | RECOMMENDATION
- notificationSeverity: CRITICAL | HIGH | MEDIUM | LOW
- lifecycle: OPEN | ACKNOWLEDGED | RESOLVED | SUPERSEDED
- sourceRuleVersion
- evidenceReference
- recommendedAction
- automaticAction
- checkoutAllowed
- acceptedOrdersAffected
- firstObservedAt / lastObservedAt / resolvedAt
- notificationFingerprint
ProductReviewDecision
MarketEligibility
MarketComplianceRule
ComplianceEvaluation
ComplianceEvidence
BrandAuthorization
CostSnapshot
AuditEvent
OutboxEvent
```

`AuditEvent` is append-only. Corrections create a new event. They do not rewrite history.

## 6. Separate state machines

Do not combine import, revision review, publication, and supplier synchronization into one status.

### 6.1 Import job

```text
QUEUED
FETCHING
TRANSFORMING
CREATING_DRAFT
IMPORTING_MEDIA
READY
FAILED_RETRYABLE
FAILED_FINAL
```

The worker can retry a failed step without creating a second product. `READY` means the imported revision can open. Publication remains a separate atomic step and requires fresh server-side gates.

### 6.2 Product revision workflow

```text
DRAFT
IN_REVIEW
CHANGES_REQUESTED
APPROVED
SUPERSEDED
```

Allowed transitions:

| From | To | Rule |
|---|---|---|
| `DRAFT` | `APPROVED` | Automated phase-1 validation passes every blocker and records `approvalMode=AUTO`, policy version, evidence, and audit event |
| `DRAFT` | `IN_REVIEW` | A blocker or authorized operator explicitly routes an exception to manual review |
| `IN_REVIEW` | `CHANGES_REQUESTED` | Reviewer records at least one reason |
| `IN_REVIEW` | `APPROVED` | Reviewer resolves every blocking issue |
| `CHANGES_REQUESTED` | `IN_REVIEW` | Editor submits a new revision |
| `APPROVED` | `SUPERSEDED` | A later approved revision becomes published |

Editing a published product creates a new `DRAFT` revision. The current approved revision remains public until the later revision passes the same automated hard gates or an exception is manually resolved. Automatic approval is a recorded server decision, never the absence of a decision.

### 6.3 Product publication

```text
UNPUBLISHED
PUBLISHED
PAUSED
ARCHIVED
```

Allowed transitions:

| From | To | Rule |
|---|---|---|
| `UNPUBLISHED` | `PUBLISHED` | An auto- or manually approved revision passes fresh publish validation |
| `PUBLISHED` | `PUBLISHED` | Atomically replace the public pointer with a later approved revision |
| `PUBLISHED` | `PAUSED` | Authorized action or objective supplier/market failure |
| `PAUSED` | `PUBLISHED` | Approved revision and all fresh blocker checks pass; a prior blocker cannot silently clear without new evidence |
| `UNPUBLISHED` or `PAUSED` | `ARCHIVED` | Authorized, confirmed, and audited action; no active offer remains purchasable |
| `ARCHIVED` | `UNPUBLISHED` | Authorized restore creates a new draft and does not auto-publish |

A supplier safety failure can pause an offer or product immediately without rewriting revision history.

### 6.4 Supplier synchronization

```text
HEALTHY
STALE
CONFLICT
ERROR
DISABLED
```

- `STALE` means the source freshness policy expired.
- `CONFLICT` means a supplier change requires review.
- `ERROR` means synchronization failed after bounded retries.
- `DISABLED` is an audited operations action.

Staleness thresholds are versioned configuration. Do not hardcode one interval for every supplier fact.

### 6.5 Attention state is separate

Attention is derived from open `AttentionIssue` records and never replaces revision, publication, offer, or synchronization state:

```text
CLEAR
NEEDS_ATTENTION
ACTION_REQUIRED
```

A product can be `PUBLISHED + NEEDS_ATTENTION`; yellow warnings do not disable purchase. `ACTION_REQUIRED` identifies at least one red blocker. For an affected live market, that blocker must also produce `PAUSED` or a non-purchasable offer state. The UI must never use an attention badge alone to decide whether checkout is permitted.

## 7. Field ownership and synchronization matrix

| Editor field | Initial source | Canonical owner | Editable | Later CJ behavior |
|---|---|---|---|---|
| Product Name (`Product.title`) | CJ name as draft suggestion | Sals3 | Yes | Never overwrite; show changed supplier name as reference |
| Slug | Generated from approved Product Name | Sals3 | Controlled | Redirect old published slug after change |
| Description | CJ description in source panel only | Sals3 | Yes | Never overwrite customer copy |
| Category | Versioned CJ-to-Sals3 mapping | Sals3 | Yes | New mapping creates review issue; no silent remap |
| Brand | Supplier hint only | Sals3 review | Yes | Never trust or overwrite automatically |
| Required attributes | Category rules plus mapped hints | Sals3 | Yes | Source changes create review suggestions |
| Option display names | Mapped CJ options | Sals3 | Yes | Preserve Sals3 labels; maintain external link |
| Variant identity | CJ `vid` on first import | Sals3 ID plus supplier link | No direct ID edit | New CJ variant creates draft; removed variant becomes unavailable |
| Sals3 SKU | Generated stable value | Sals3 | Restricted | Never replace with CJ SKU |
| CJ SKU | CJ | Supplier fact | No | Update external reference only |
| Retail price | Pricing module or authorized editor | Sals3 | Restricted | Cost change triggers repricing review; never overwrite price |
| Compare-at price | Verified price history | Sals3 | Restricted | Never derive from arbitrary uplift |
| Supplier cost | CJ | Supplier fact | No normal edit | Refresh; material change can pause offer |
| Inventory | CJ by `vid` and warehouse | Supplier fact | No normal edit | Refresh and update availability |
| Weight and dimensions | CJ, then verified correction if needed | Supplier fact with audited override | Restricted | Source change creates conflict when override exists |
| Origin and logistics | CJ freight/warehouse data | Supplier fact | No | Refresh; market availability can change |
| Product media | CJ candidate assets | Sals3-controlled licensed copy | Yes | Rights-known, validated assets may enter the initial auto-published revision; new CJ media never silently replaces published media |
| Alt text | Draft suggestion | Sals3 | Yes | Never overwrite |
| SEO title and description | Optional draft from Product Name/copy | Sals3 | Yes | Never overwrite |
| Compliance status | Sals3 policy evaluation plus exception review | Sals3 | Restricted | Supplier facts can open attention, block, or pause |
| Publish state | Sals3 workflow | Sals3 | Permission controlled | CJ cannot publish or delete |

An audited supplier-fact override requires evidence, actor, reason, effective time, and optional expiry. A later source update opens a conflict instead of silently deleting the override.

A declared brand requires resolved brand/IP evidence. Otherwise use `UNBRANDED`. A supplier title or brand-like phrase is not proof of authorization and cannot qualify for automatic publication when authorization is required.

## 8. Import transaction

### 8.1 Candidate storage stays separate from catalog storage

The existing CJ page remains a live discovery browser. Browsing does not create Sals3 data.

The first persisted step is **Shortlist**. It creates `SupplierCandidate`, not Product, Variant, Offer, MediaAsset, or public search data. A held, reviewed, or blocked candidate never appears in My Products.

```text
CJ Product Discovery
  -> Shortlist
  -> Full Preflight
  -> PASS | PASS_WITH_ATTENTION | REVIEW | HOLD | BLOCKED
  -> Customize for Sals3 only after PASS or PASS_WITH_ATTENTION
  -> Sals3 revision and offer
  -> fresh publication gates
  -> automatic publish or exception state
```

### 8.2 Cheap discovery filters

Use cheap listing fields before enrichment:

- keyword;
- CJ category;
- intended enabled market;
- supplier-cost range;
- warehouse or origin when available;
- on-sale status;
- inventory signal;
- product image presence;
- product and variant signal;
- creation-date range;
- CJ `listedNum` as weak sorting evidence only.

Do not call review, freight, full inventory, or media-analysis endpoints for every visible row. Never label `listedNum` as sold, purchases, orders, or customers. CJ defines it as the number of platform listings for the product.

### 8.3 Full preflight

Run full preflight only for a shortlisted candidate. Fetch fresh:

- product detail and source status;
- exact variants and `vid` values;
- inventory by variant and warehouse;
- full media set;
- category, attributes, materials, weight, and dimensions;
- intended-market freight options;
- current supplier cost;
- CJ review count, individual scores, dates, images, and country codes where available;
- certification fields as unverified supplier claims until evidence is checked;
- current compliance and blocked-supplier policy versions.

The result expires under versioned policy. Import rejects a stale preflight and runs it again.

### 8.4 Candidate decisions

| Decision | Meaning | Next action |
|---|---|---|
| `PASS` | Hard gates pass and pilot quality score meets the clean threshold | Enable **Customize for Sals3**; eligible for automatic publication |
| `PASS_WITH_ATTENTION` | Hard gates pass but one or more non-blocking quality or operational warnings exist | Enable **Customize for Sals3**; publish with open attention issues |
| `REVIEW` | A possible legal, IP, duplicate, required mapping, media-rights, or evidence blocker cannot be safely decided automatically | Exception Queue; no Product Draft until resolved |
| `HOLD` | Temporary stock, freight, economics, freshness, or supplier failure | Recheck later; no Product Draft |
| `BLOCKED` | Prohibited, confirmed infringing, invalid, unsafe, or policy-blocked | No Product Draft; preserve decision and evidence |

Every result returns stable reason codes, evidence references, rule version, and next action. `PASS_WITH_ATTENTION` issues remain visible after publication until automatically or manually resolved. A reviewer can move `REVIEW` to `PASS` or `PASS_WITH_ATTENTION` only with permission, reason, evidence, and a fresh hard-gate evaluation. A reviewer cannot override `BLOCKED` through the normal editor.

### 8.5 Hard gates

Hard gates run before scoring. Quality points never override them.

- valid and current CJ `pid`;
- product approved/on-sale at source;
- at least one valid `vid` and usable variant identity;
- no exact existing supplier-product duplicate, except reopening that existing record;
- product belongs to an approved pilot category;
- no global or intended-market prohibition;
- no confirmed counterfeit or unresolved required brand authorization;
- supplier response passes runtime validation;
- no known blocked supplier or product;
- no confirmed dangerous, unlawful, or unsupported product condition.

Out of stock, unavailable freight, failed margin, stale facts, or temporary supplier errors normally produce `HOLD`, not permanent `BLOCKED`.

### 8.6 Pilot quality score

Apply score only after hard gates:

| Area | Weight | Evidence |
|---|---:|---|
| Product completeness | 20 | Name, description source, category data, attributes, valid variants, dimensions |
| Inventory and fulfillment | 25 | Stock signal, warehouse, freight, delivery evidence, freshness |
| Commercial viability | 25 | Supplier cost, freight, fees, contribution and margin policy |
| CJ review evidence | 15 | Confidence-adjusted score, count, distribution, recency, photo-review ratio |
| Media quality | 10 | Usable count, dimensions, duplicates, watermark/logo and mismatch signals |
| Supplier-platform demand | 5 | `listedNum`, age, and activity; never treated as sold count |

Pilot decision thresholds:

```text
80-100  PASS
65-79   PASS_WITH_ATTENTION when all hard gates pass
0-64    REVIEW, HOLD, or BLOCKED, selected by reason type
```

Store weights, thresholds, formulas, and effective dates in `policyVersion`. These are pilot controls, not claims that an 80-point product is objectively good. Calibrate them against delivery, refund, return, complaint, and support outcomes.

### 8.7 CJ review evidence

CJ documents `GET /product/productComments`. It returns a total and individual review scores, comments, media, dates, masked users, and country codes. It does not document a direct aggregate product rating or units-sold value.

- Derive review statistics from validated responses and record calculation version.
- Use a confidence-adjusted score so one five-star review does not outrank substantial evidence.
- Cap contribution from small or stale samples.
- Treat review-country and photo-review patterns as signals, not proof.
- Label every value internally as CJ supplier-platform review evidence.
- Do not publish it as a Sals3 buyer rating or use it in Sals3 `AggregateRating` structured data.
- Build public Sals3 ratings only from verified Sals3 orders and reviews.

### 8.8 Media and variant anti-junk signals

Preflight evaluates:

- minimum three usable, rights-known source images for `PASS` or `PASS_WITH_ATTENTION`;
- five to seven images is a non-blocking quality target; fewer than five creates attention when the minimum is met;
- broken, duplicate, blurry, undersized, text-heavy, watermarked, logo-bearing, unsafe, or category-mismatched images;
- duplicate or empty option values;
- meaningless labels such as `Default`, `Other`, or unexplained numbered styles;
- duplicate variant combinations or external identifiers;
- extreme unexplained variant-price differences;
- missing or conflicting units, dimensions, or weights;
- active variants with no inventory signal;
- excessive or unusable variant matrices.

Automated media and text analysis produces signals. It does not make uncertain IP or legal conclusions.

### 8.9 Near-duplicate detection

Exact CJ `pid` reopens the existing link. Different `pid` values receive a near-duplicate signal using normalized title, category, main-image perceptual hash, variant structure, dimensions, supplier SKU/SPU, and description similarity.

A possible duplicate goes to `REVIEW`. The reviewer can reuse the existing Product, add a seller Offer, confirm a genuinely different product, or block the duplicate. Automatic merging is prohibited. Exact duplicates reopen the existing record rather than creating attention noise.

### 8.10 Work-in-progress controls

- Phase 1 disables batch import.
- Pilot default permits at most 10 active import/customization jobs per editor.
- The limit is versioned configuration, not a permanent business constant.
- `REVIEW`, `HOLD`, `BLOCKED`, and already published products do not consume the active-job limit.
- An editor must finish, cancel, or recover active jobs before creating more.
- Stale drafts receive a warning, then move to recoverable archive under a versioned retention policy.
- Shortlisting and preflight endpoints are rate-limited and audited.

The WIP limit and disabled batch import prevent an “import everything, fix later” operation from becoming the catalog. Automatic publication applies only after an employee explicitly selects a candidate.

### 8.11 User action

The CJ Candidate Explorer row begins with **Check for Sals3**. A successful preflight changes the action to **Customize for Sals3**. This two-step label makes screening visible without requiring a separate approval workflow.

On activation:

1. **Check for Sals3** creates or reuses `SupplierCandidate`, starts full preflight, and shows persistent progress.
2. The portal validates `catalog.import` permission and active-job limit when **Customize for Sals3** is activated.
3. The portal supplies a non-expired `PASS` or `PASS_WITH_ATTENTION` preflight, CJ `pid`, intended seller, enabled market context, fulfillment mode, and idempotency key.
4. The Catalog Admin API returns the existing product when the supplier link already exists.
5. The API reruns hard gates against current policy and source identity.
6. Otherwise, it creates `CatalogImportJob` and queues enrichment through a transactional outbox.
7. The worker fetches current product detail, variants, inventory, and eligible media through the CJ adapter.
8. The worker validates external responses before transformation.
9. One database transaction creates Product, variants, supplier links, initial offers for the requested enabled markets, mapping logs, snapshot, revision, attention issues, and audit records.
10. Media import continues asynchronously. A product cannot publish until the minimum rights-known media set is ready.
11. The server reruns publication blockers. Eligible revisions receive `approvalMode=AUTO` and publish atomically. `PASS_WITH_ATTENTION` becomes **Live · Needs Attention**.
12. The portal redirects to the Product Editor or shows recoverable job progress. The editor opens on the real saved state: Live, Live · Needs Attention, Action Required, or Auto-Paused.

Never hold an HTTP request open while importing every image. The import request starts an asynchronous, auditable workflow; only its worker may auto-publish after fresh server gates.

### 8.12 Source request policy

- Use product detail rather than list data for the import snapshot.
- Fetch exact variants and inventory by stable CJ identifiers.
- Cache candidate browsing separately from import snapshots.
- Import requires a fresh source fetch. A five-minute listing cache alone is not evidence of current variants or stock.
- Respect CJ QPS and points limits with a central limiter, bounded concurrency, backoff, and `pointsInfo` monitoring.
- A timeout after a CJ success is reconciled by supplier identifiers and idempotency data before retry.

### 8.13 Existing Aj implementation and naming

Use **CJ Candidate Explorer** as the product-facing name for Aj's existing work. It accurately describes discovery and avoids implying that raw supplier rows are already Sals3 products.

Verified current boundary in `E:\sals3-portal` on 2026-08-06:

- local Seller Center: `http://localhost:3001`;
- current CJ explorer: `http://localhost:3001/products`;
- it already provides a read-only CJ `/product/list` integration with server-side token handling, search, pagination, stable `pid` lookup, normalized list fields, a five-minute list cache, and protected storefront feed routes;
- do not rebuild those discovery capabilities in `sals3-ecommerce`;
- it does not yet own full detail/variant/inventory/freight enrichment, candidate persistence, product drafts, offers, publication, or supplier synchronization;
- Shopify is explicitly outside this flow. The handoff is CJ Candidate Explorer -> Sals3 Catalog Admin API -> Sals3 customer catalog.

The browser sends intent and stable identifiers, not a trusted CJ object. The portal server passes verified actor context and a server-only service credential. The Catalog Admin API and CJ adapter fetch and validate fresh supplier facts.

### 8.14 Screening and attention surfaces

Status appears in three persistent Seller Center locations:

1. **CJ Candidate Explorer row/card** — inline badge and current action: Checking, Ready, Ready · Needs Attention, Review Required, On Hold, or Blocked.
2. **Screening drawer** — score components, hard-gate results, evidence time, rule version, exact reason codes, and recommended next action.
3. **Product Sourcing queue** — tabs for CJ Explorer, Shortlisted, and Exception Queue so progress survives navigation and asynchronous jobs.

After import, the product moves to My Products with filters for **Live**, **Needs Attention**, and **Auto-Paused**. The Product Editor's left **Issues & Tasks** panel shows the same canonical attention records. The top navigation shows a deduplicated Attention count; it is not a separate source of truth.

## 9. Product Editor contract

The reference screens inform workflow, not visual copying. Use Sals3 design tokens, accessibility rules, and terminology.

### 9.1 Persistent layout

- Left issue panel: blocking errors, warnings, and optional recommendations.
- Main editor: tabbed sections below.
- Right preview: the actual customer PDP read model at desktop widths; available as a full-screen preview on small screens.
- Sticky actions: Save, Archive, and the current publication state. Normal phase-1 changes auto-approve and atomically update the live revision after server gates pass; an explicit manual review action appears only for exceptions.
- Save state: `Saving`, `Saved`, `Offline changes`, or `Conflict`. Do not imply success before server confirmation.

### 9.2 Basic Information

- Product images and cover selection
- Product Name
- Sals3 category
- Brand mode and brand name
- Optional product video after images work reliably

`Product Name` is the user-facing label. The database and API field is `title`. The original CJ name remains visible in a read-only source panel.

### 9.3 Specifications

- Category-required attributes
- Recommended optional attributes
- Unit-normalized values
- Mapping confidence and source reference

The selected Sals3 category controls the form. Changing category revalidates attributes and never silently discards entered values. Incompatible values move to an explicit unmapped-values panel.

### 9.4 Description

- Structured description editor
- Product highlights
- Materials and care or use instructions when applicable
- Approved inline media
- Source comparison panel

Supplier HTML is sanitized and shown as source material. It is not inserted directly into the published description.

An AI polish control is optional and deferred until provider, privacy, cost, and review rules are approved. If enabled later, it proposes a diff. It never saves or publishes automatically.

### 9.5 Sales Information

- Option names and values
- Variant matrix
- Sals3 SKU
- CJ `vid` and CJ SKU as read-only references
- Retail price in `Money`
- Supplier cost and observed time
- Inventory and source freshness
- Variant status

The matrix prevents duplicate option combinations. An unavailable variant remains visible but inactive on the customer PDP when useful for selection context.

### 9.6 Shipping

- Weight and dimensions
- Supplier warehouse and origin
- Enabled destination markets
- Available logistics options
- Browse estimate status
- Exact quote test tool for a destination and postal code
- Delivery-cycle/source timestamps

Shipping content follows ADR-003. A region estimate is labelled as an estimate. A publish check cannot substitute one representative country for all enabled countries.

### 9.7 Others

- Seller and fulfillment mode
- Supplier product link
- Media provenance and rights basis
- Compliance and restricted-product review
- SEO title and description
- Revision history
- Audit history
- Sync state and manual resync

### 9.8 Preview

- Preview consumes the same versioned read-model schema used by the customer PDP.
- Draft preview uses an authorized preview token. It is `noindex` and cannot leak through public caches.
- Preview shows selected market and quote freshness.
- Preview omits unsupported ratings, sales counts, discounts, and claims.

## 10. Validation levels

### 10.1 Save draft

Save permits incomplete fields. It requires valid field types, payload limits, authorization, and optimistic-concurrency checks.

### 10.2 Automatic approval eligibility

Automatic approval requires:

- Product Name and structured description;
- valid Sals3 category;
- every category-required attribute;
- at least one valid variant and stable Sals3 SKU;
- no duplicate variant combination;
- at least three usable, rights-known images including a valid cover with alt text;
- seller and fulfillment mode;
- retail price using the approved Money contract;
- current supplier link and source snapshot;
- resolved objective compliance blocks;
- no legal, counterfeit/IP, permit, media-rights, or required-mapping uncertainty classified for exception review.

A missing optional field or quality weakness creates attention, not a blocker. The server records the automated decision, policy version, evidence snapshot, generated issue set, actor who initiated the import/change, and exact revision checksum.

### 10.3 Publish

Publish reruns server validation. It additionally requires:

- an auto- or manually approved revision;
- a verified media rights basis and automated or manual media decision;
- active supplier product and at least one active variant;
- current inventory or an approved availability rule;
- enabled-market freight support and viable landed cost;
- contribution/margin policy pass;
- no stale blocking supplier fact;
- no unresolved blocking review issue;
- truthful seller, fulfillment, origin, price, and comparison-price copy.

Client-side validation improves usability. It never replaces server validation.

## 11. Review issue model

Each issue has:

```text
code
severity: BLOCKER | WARNING | RECOMMENDATION
scope: PRODUCT | VARIANT | MEDIA | MARKET | OFFER
entityId
messageKey
evidenceReference
createdAt
resolvedAt
resolvedBy
resolution
```

Objective hard blockers include:

- prohibited or restricted product without required approval;
- `ambiguous` or `unmapped` required category mapping;
- missing required data;
- no valid variant;
- no inventory/availability signal;
- no supported freight for an intended enabled market;
- commercially non-viable landed cost;
- unusable or unlicensed media;
- known blocked supplier or product;
- fabricated price, discount, rating, sales, urgency, or trust claim.

Brand-like wording, low review volume, or suspicious copy is a review signal. It is not automatic proof of infringement.

### 11.1 Phase-1 exception and notification policy

Operational colors are derived from canonical decisions; color alone is never the accessible label:

| Result | Publication behavior | Typical issues |
|---|---|---|
| `GREEN` | Auto-create, auto-approve, auto-publish | Approved low-risk category/market; current stock/freight/margin; valid mapping/variants/media; no unresolved rights or compliance risk |
| `YELLOW` | Auto-publish as **Live · Needs Attention** | Weak copy, three or four usable images, low/no CJ review evidence, low stock, long delivery estimate, medium non-required mapping confidence, new unused supplier media/variant, or margin approaching its limit |
| `RED` | Do not publish, or immediately auto-pause an already-live affected offer | Prohibited/restricted product, missing required permit, unresolved counterfeit/brand authorization, no stock/freight, failed margin, invalid price/variants, exact duplicate handling failure, unsafe category, supplier off-sale, or missing media rights |

Rules:

- Yellow never contains an unresolved legal, safety, IP, permit, required-field, availability, freight, or margin blocker.
- Red/Critical events produce an immediate in-app record plus push and email delivery attempts, and appear in **Action Required** or **Auto-Paused**.
- Yellow/Medium events update the persistent badge and grouped digest according to policy; they do not create repeated alerts on every sync.
- Use `notificationFingerprint` to deduplicate the same product/reason/rule version.
- Rechecks can auto-resolve transient stock, freight, freshness, or margin issues when new evidence passes current policy.
- A policy change re-evaluates affected offers. Newly ineligible live offers auto-pause; history remains intact.
- Every attention item states reason, evidence timestamp, affected scope, recommended action, and whether customer purchase is currently allowed.
- `AttentionIssue` remains the canonical source of truth. Push/email use a reliable notification outbox with delivery audit, retry, cooldown, and dead-letter handling. Channel failure never delays checkout protection. ADR-007 governs severity routing and immutable accepted-order behavior.

### 11.2 Canonical filtering and ranking matrix

The filtering plan is complete only when these layers remain separate. This matrix governs newer implementation work and clarifies older green/yellow/red summaries that grouped several no-publication outcomes together.

| Layer | Canonical outcome | Typical evidence | Publication effect |
|---|---|---|---|
| Pilot admission | `NOT_IN_PILOT` / hold | Category or market is outside the approved positive allowlist | Discoverable with reason; do not spend full evidence calls or publish |
| Objective permanent gate | `BLOCKED` | Explicitly prohibited product; confirmed invalid/unsafe condition; confirmed infringement under approved policy | No publication; normal editor cannot override |
| Uncertain risk | `REVIEW` | Legal, permit, IP/brand authorization, required mapping, media rights, near duplicate, or material evidence uncertainty | No publication until an authorized review resolves it |
| Temporary operational gate | `HOLD` / `TEMPORARILY_INELIGIBLE` | Stock, route/freight, contribution, freshness, supplier connection/funding, or recoverable source failure | No publication; timed retry or named recovery trigger |
| Technical processing failure | `EVALUATION_FAILED` | Supplier/API/schema/storage/worker failure | Never fabricate a product judgment; retry then visible `Exception Queue` |
| Non-blocking quality | `PASS_WITH_ATTENTION` | Weak copy, low review evidence, low-but-valid stock, long estimate, recommended attribute gap, or approved but limited media set | Eligible for `Live · Needs Attention`; checkout remains allowed only if every hard gate passes |
| Clean qualification | `PASS` | Approved pilot scope and current valid mapping, variants, media, stock, freight, contribution, source, and policy evidence | Eligible for Product Editor/import/publication gates |
| Merchandising only | trend/rank state | CJ trending membership, category-normalized listing count/velocity, then Sals3 engagement/order outcomes | Changes ordering/badges only after publication eligibility; never changes qualification |

Rules:

- One uncertain legal/IP/safety/permit/mapping/media-rights/duplicate fact routes to `REVIEW`, not `PASS_WITH_ATTENTION` and not an automatic permanent rejection.
- One objective permanent blocker is sufficient for `BLOCKED`; warning counts alone never create a hard rejection.
- Every temporary state has `nextRetryAt` or a named event recovery trigger. Every active candidate appears in exactly one Product Sourcing queue/projection.
- `PASS` and `PASS_WITH_ATTENTION` require fresh-enough evidence under the current enforced policy version. A stale or obsolete decision is not publication-eligible.
- ADR-011 resolves seller/supplier media only from approved controlled assets. Automatic supplier fallback cannot bypass media-rights review.
- ADR-012 applies popularity/trend signals only after this matrix. A high CJ `listedCount` or provider-trending flag cannot rescue a blocked, reviewed, held, paused, stale, unpublished, or unprofitable product.
- Catalogue publication reruns all applicable server-side gates against the exact proposed `ProductRevision`, market, variants, offer, media set, and current evidence.

## 12. Media pipeline

1. Accept only allow-listed CJ source hosts for supplier import. Do not accept an arbitrary remote URL from the browser.
2. Accept employee uploads only through an authenticated, rate-limited, size-limited upload flow.
3. Resolve supplier media server-side with SSRF controls. Reject redirects outside the allow list.
4. Enforce byte, pixel, MIME, extension, and file-signature limits for supplier and employee files.
5. Reject active or unsupported formats. Scan files using the approved infrastructure capability.
6. Strip unnecessary metadata.
7. Calculate checksum and deduplicate identical files.
8. Store the original protected source and optimized derivatives in controlled storage.
9. Record source type, source URL or upload actor, imported time, CJ product when applicable, rights basis, reviewer, and checksum.
10. Run automated quality checks as signals. Watermark, logo, misleading image, and rights decisions require review when uncertain.
11. Publish only approved derivatives with stable dimensions, responsive sizes, and alt text.

Keyboard-accessible controls must provide every action available through drag reordering. An employee upload never becomes public before content and rights review.

Replacing or reordering published media creates a new product revision. Deleting a source link does not delete audit evidence.

ADR-011 adds the required source-selection contract: **Your pictures**, always-visible **Original supplier pictures**, revision preference `SELLER_FIRST | SUPPLIER_ONLY`, approved supplier fallback when no eligible seller upload exists, and separate Product Catalogue listing/media statuses. The resolved public gallery uses controlled Sals3 assets only.

## 13. Pricing and market rules

- Phase 1 stores and presents USD under ADR-003 until another currency decision is approved.
- Money uses integer minor units and ISO currency codes.
- The existing static USD-to-PHP multiplier and flat markup are prototype behavior. They are not a production price source.
- Supplier cost changes update `CostSnapshot`. They do not overwrite retail price.
- The pricing module evaluates landed cost, freight, taxes/fees, payment cost, refund/return reserve, platform contribution, and seller economics.
- A configurable material-cost-change threshold opens a review issue. A failed margin floor pauses the affected offer.
- Compare-at price remains null without valid price-history evidence.
- Every market eligibility result records destination, quote version, inputs, time, and expiry.

Unknown business percentages remain versioned configuration. This specification does not invent commission, margin, tax, or reserve values.

## 14. Country compliance and counterfeit controls

### 14.1 Positive pilot allowlist

Phase 1 uses an approved category allowlist per market. A denylist alone cannot enumerate every regulated or unsafe product.

Until a category and market policy is approved, its candidates receive `NOT_IN_PILOT`. This is an operating decision, not a claim that the item is illegal.

Recommended initial exclusions until separately approved include:

- branded products without authorization;
- food, supplements, medicines, medical claims, and cosmetics;
- children's safety products;
- electrical products, batteries, chargers, and high-powered devices;
- weapons, weapon-like products, tobacco, vape, and nicotine;
- plants, seeds, animals, chemicals, and pesticides;
- adult products, telecom/signal equipment, and precious metals;
- products requiring certification, registration, permits, or special labelling.

Pilot category approval records scope, owner, enabled markets, effective date, required evidence, and rollback rule.

### 14.2 Versioned market policy

`MarketComplianceRule` contains:

```text
id
countryCode
categoryCode
hsCodePattern
attributeConditions
ruleType
requiredEvidence
authority
officialSourceUrl
effectiveFrom
effectiveTo
policyVersion
reviewedBy
reviewedAt
```

Rule types:

```text
ALLOWED
REVIEW_REQUIRED
PERMIT_REQUIRED
LABEL_REQUIRED
AGE_RESTRICTED
PROHIBITED
NOT_IN_PILOT
UNKNOWN
```

`UNKNOWN` defaults to no publication. Rules evaluate the exact product and variant using category, intended use, material, ingredients, claims, power source, dimensions, origin, supplier customs data, and other relevant attributes. A CJ customs or entry code is a supplier hint, not verified legal classification.

### 14.3 Market-specific result

One product can be allowed in one market and blocked in another. Store `ComplianceEvaluation` per product/variant, market, and policy version.

| Result | Effect |
|---|---|
| `GLOBALLY_BLOCKED` | No draft, offer, media publication, or normal override |
| `MARKET_BLOCKED` | No offer for that market; other approved markets may continue |
| `PERMIT_REQUIRED` | No market offer until evidence is verified |
| `COMPLIANCE_REVIEW_REQUIRED` | Candidate quarantine; no Product Draft |
| `NOT_IN_PILOT` | Hold outside pilot scope |
| `ELIGIBLE` | Compliance gate passes; quality and commercial gates still apply |

CJ freight availability does not prove legal eligibility. A carrier accepting a route does not replace customs, regulator, product-safety, IP, or consumer-law checks.

### 14.4 Counterfeit and IP screening

Signals include:

- brand or model names in title, description, variants, or packaging;
- logos or protected imagery detected through OCR/image review;
- words such as `replica`, `1:1`, `inspired`, `AAA`, or unexplained `OEM` claims;
- supplier assertions such as `original`, `authentic`, or `genuine`;
- suspicious price difference from a known branded product;
- reused official-brand photographs;
- product shape, model, or packaging matching a protected item;
- brand shown in media while editor selection says `UNBRANDED`;
- absent, mismatched, expired, or unverifiable authorization.

Outcomes:

```text
no material brand signal
  -> continue screening

possible brand signal
  -> IP_REVIEW_REQUIRED
  -> candidate quarantine; no Product Draft

verified authorization
  -> record BrandAuthorization and expiry
  -> continue market screening

confirmed counterfeit or infringing product
  -> GLOBALLY_BLOCKED
```

A capitalized phrase, low price, logo-detection result, or AI classification alone is not proof. Uncertain cases require human review and evidence. The normal editor cannot override a confirmed counterfeit decision.

### 14.5 Permit and authorization evidence

`ComplianceEvidence` records:

```text
evidenceType
issuingAuthority
documentReference
documentNumber
coveredProductIds / variantIds
coveredMarkets
effectiveFrom
expiresAt
verificationSource
verifiedBy
verifiedAt
status
```

Expired, mismatched, revoked, or unverifiable evidence fails the gate. Protected documents use restricted storage and access audit. Product publication never exposes private permit files.

### 14.6 Claims and certifications

Supplier fields such as `hasCECertification` are leads only. Claims require evidence tied to the exact product/model and applicable market.

Block unsupported customer claims including:

- FDA approved;
- CE certified;
- genuine, original, or authentic;
- medical grade;
- child safe;
- certified fireproof or waterproof;
- organic;
- government approved.

Removing the claim from copy does not make an otherwise regulated or unsafe product eligible.

### 14.7 Evaluation points

1. Discovery applies pilot allowlist, global blocklist, known brand, dangerous keyword, CJ category, and intended-country signals.
2. Preflight checks full product, variant, media, claims, materials, origin, and current policy.
3. Compliance review resolves uncertain brand, permit, classification, and market cases.
4. Publish reruns the current policy version and verifies evidence validity.
5. Checkout blocks a destination whose eligibility became invalid after publication.
6. Policy updates find affected products and variants, re-evaluate them, and pause blocked offers without deleting history.

AI, OCR, keyword rules, and supplier data can prioritize review. They do not replace qualified compliance/legal judgment or official sources.

### 14.8 Current official source anchors

- Philippine Bureau of Customs distinguishes regulated, restricted, and prohibited imports. It states that regulated goods require permits or clearances from the relevant government agency and lists infringing goods among prohibited imports: <https://customs.gov.ph/prohibited-restricted-importations/>.
- Philippine customs guidance requires checking whether goods are prohibited, restricted, or regulated and whether permits are required: <https://customs.gov.ph/guidelines-on-importation/>.
- Australian Border Force states that some goods require permits even though Australia has no general import licence and points importers to prohibited/restricted rules: <https://www.abf.gov.au/importing-exporting-and-manufacturing/importing/how-to-import/requirements>.
- Australian Border Force publishes current prohibited-goods categories and permit routes: <https://www.abf.gov.au/importing-exporting-and-manufacturing/prohibited-goods/categories>.
- Australian Border Force states that import provisions can allow seizure of goods that infringe copyright or trademarks: <https://www.abf.gov.au/importing-exporting-and-manufacturing/importing/how-to-import/types-of-imports>.

These pages are source anchors, not a complete rule database. A rule owner must verify current legislation, regulator guidance, permits, and market obligations before activating a category.

## 15. Supplier synchronization policy

### 15.1 Inputs

Use signed CJ webhooks where available. Deduplicate by `messageId`. Acknowledge quickly and process through the worker. Use scheduled reconciliation for missed events, stale records, and conflicts.

CJ product/variant/stock webhooks are product-subscription scoped after July 2026. Subscribe selected imports, live products, and accepted-order protection subjects rather than the raw candidate pool. Keep a minimal desired/observed subscription record and scheduled reconciliation. Add priority eviction or a dedicated allocator only when measured live demand approaches the CJ account's subscription limit. Detect an auto-closed topic and surface a real reactivation action.

### 15.2 Change behavior

| Supplier change | Sals3 action |
|---|---|
| Product off-sale | Pause affected offers; keep product and history |
| All linked inventory reaches zero | Mark unavailable and block checkout; do not delete |
| Inventory returns | Re-enable only when other publish checks remain valid |
| Cost changes within approved policy | Record snapshot and re-evaluate price/margin |
| Cost breaches policy | Pause or hold offer and open blocker |
| New CJ variant | Create an unpublished draft variant and review issue |
| Removed/off-sale CJ variant | Disable linked variant; preserve historical order references |
| Variant option changes | Open mapping conflict; never silently change Sals3 labels |
| Weight/dimension change | Recalculate freight eligibility; open conflict if overridden |
| CJ title/description change | Show source difference only |
| New CJ media | Add candidate media to review queue |
| Supplier product deletion | Pause offers and preserve tombstone/snapshot |
| Supplier funding not ready | Funding-hold affected auto-fulfilled offers; catalog remains accessible; accepted orders use `AWAITING_SUPPLIER_FUNDS` recovery |

Checkout performs a fresh server-side stock, variant, cost, and freight validation. Published catalog sync reduces risk but does not replace checkout validation.

Inventory synchronization preserves `cjInventory`, `factoryInventory`, `totalInventory`, and `verifiedWarehouse` per variant/origin. `ZERO_STOCK` and `UNKNOWN_STOCK` are recoverable holds. Factory-backed or unverified stock follows the versioned pilot policy and may be `PASS_WITH_ATTENTION` only when its handling risk is accepted and later order/freight validation succeeds; it is not hard-coded as either clean pass or permanent block. A stocked origin is not `FREIGHT_ROUTE_CONFIRMED`.

The stock-to-listing path is: verify the CJ callback -> deduplicate `messageId` -> resolve the exact tenant-owned Supplier Connection/product/variant -> append an inventory observation -> re-evaluate the affected variant/offer/market -> atomically update the Product Catalogue current availability pointer -> invalidate/update the ecommerce read model. One zero-stock variant disables only that variant; zero stock across every purchasable variant pauses future checkout without deleting the Product. Inventory return re-enables only after every other current publication gate still passes. Accepted orders keep their immutable binding and use an explicit fulfillment exception rather than silent substitution.

Webhook speed is defense in depth, not the only stock guard. Scheduled reconciliation repairs missed/delayed callbacks, and checkout revalidates the exact variant, quantity, current stock/orderability, cost, connection, and applicable freight. Subscribe selected imports, live products, and accepted-order protection subjects—not the raw **All Supplier Products** pool.

### 15.3 Automation hosting boundary

Core filtering stays inside Sals3 code and PostgreSQL. In the development/pilot phase, the protected scheduler route produces bounded work and the existing PostgreSQL lease/retry/current-state model remains authoritative. Do not move decision rules, tenant authorization, evidence, inventory eligibility, or audit truth into n8n.

After the queue/recovery correctness unit passes, the production target may replace the external frequent scheduler with Vercel Pro Cron and deliver evaluation jobs through Vercel Queues, subject to an explicit production review while Queues remains beta. Messages contain IDs, versions, and admission reason only; consumers re-authorize server-side and commit idempotently before acknowledgment. At-least-once delivery cannot replace database uniqueness, leases, evidence history, or the Sals3 **Exception Queue**. n8n is limited to peripheral alerts, reports, reminders, and external back-office integrations.

Every material supplier change opens or updates one deduplicated `AttentionIssue` that shows old/new values, affected variants/offers/markets/active orders, automatic action, evidence time, and recovery actions. Seller delist and supplier changes affect new purchases only; accepted orders render an immutable `OrderLineSnapshot` and continue their committed fulfillment unless the order itself enters an explicit exception. See ADR-007.

## 16. Concurrency, revisions, and recovery

- Every mutable draft has an integer `version`.
- `PATCH` requires `If-Match` or equivalent expected version.
- A stale write returns `409 VERSION_CONFLICT` with changed field identifiers.
- Autosave debounces changes, writes bounded payloads, and shows confirmed state.
- Offline changes remain local until the server confirms them. The UI must not label them saved.
- Product revisions are immutable snapshots after submission.
- Publishing atomically changes the public read-model pointer to the approved revision.
- Rollback points the public read model to a previous approved revision and records an audit event.
- Archiving is recoverable. Do not hard-delete products, variants, supplier links, revisions, or audit events through the normal UI.
- Background jobs use bounded retry, exponential backoff with jitter, dead-letter/manual review, and idempotent handlers.
- Transactional outbox events connect database commits to worker tasks.

## 17. Permissions

Minimum server-enforced permissions:

```text
catalog.candidate.read
catalog.candidate.shortlist
catalog.candidate.preflight
catalog.candidate.review
catalog.import
catalog.draft.read
catalog.draft.edit
catalog.variant.edit
catalog.price.edit
catalog.media.review
catalog.compliance.review
catalog.compliance.policy.manage
catalog.attention.read
catalog.attention.acknowledge
catalog.attention.resolve
catalog.submit
catalog.approve
catalog.publish
catalog.pause
catalog.archive
catalog.sync.retry
catalog.override
catalog.audit.read
```

- `catalog.approve` is for manual exceptions and later workflows; normal phase-1 eligible revisions use audited server-side auto-approval.
- An editor cannot manually approve the same exception revision that they authored when separation of duties is enabled.
- `catalog.override` requires reason, evidence, and stronger confirmation.
- Publish, pause, archive, price override, rights approval, and compliance approval are always audited.
- The API checks permission and resource scope. Hidden controls are not authorization.

Phase 1 requires real seller-account tenancy. Retailer and Dropshipper registrations create separate accounts with immutable business models; one login cannot switch between them. Every sourcing, draft, offer, connection, secret reference, and mutation is scoped to the authenticated seller account. Cross-account access is denied even when the same person or legal business owns both accounts.

## 18. Admin API contract

Use a versioned typed contract. Exact framework routing can vary, but semantics below are binding.

```text
GET    /api/v1/admin/supplier-providers
GET    /api/v1/admin/supplier-connections
POST   /api/v1/admin/supplier-connections/{providerCode}/connect
POST   /api/v1/admin/supplier-connections/{connectionId}/verify
POST   /api/v1/admin/supplier-connections/{connectionId}/reauthorize
POST   /api/v1/admin/supplier-connections/{connectionId}/disconnect
POST   /api/v1/admin/catalog/candidates/cj
GET    /api/v1/admin/catalog/candidates/{candidateId}
POST   /api/v1/admin/catalog/candidates/{candidateId}/preflight
POST   /api/v1/admin/catalog/candidates/{candidateId}/review-decision
POST   /api/v1/admin/catalog/imports/cj
GET    /api/v1/admin/catalog/imports/{importId}
GET    /api/v1/admin/catalog/products/{productId}
PATCH  /api/v1/admin/catalog/products/{productId}
POST   /api/v1/admin/catalog/products/{productId}/variants
PATCH  /api/v1/admin/catalog/products/{productId}/variants/{variantId}
POST   /api/v1/admin/catalog/products/{productId}/media/import
POST   /api/v1/admin/catalog/products/{productId}/media/upload-session
PATCH  /api/v1/admin/catalog/products/{productId}/media/{mediaId}
POST   /api/v1/admin/catalog/products/{productId}/media/{mediaId}/archive
PATCH  /api/v1/admin/catalog/offers/{offerId}
POST   /api/v1/admin/catalog/products/{productId}/submit
POST   /api/v1/admin/catalog/products/{productId}/approve
POST   /api/v1/admin/catalog/products/{productId}/request-changes
POST   /api/v1/admin/catalog/products/{productId}/publish
POST   /api/v1/admin/catalog/products/{productId}/pause
POST   /api/v1/admin/catalog/products/{productId}/archive
POST   /api/v1/admin/catalog/products/{productId}/sync
POST   /api/v1/admin/catalog/products/{productId}/preview-token
GET    /api/v1/admin/catalog/products/{productId}/audit
GET    /api/v1/admin/catalog/attention
POST   /api/v1/admin/catalog/attention/{attentionId}/acknowledge
POST   /api/v1/admin/catalog/attention/{attentionId}/resolve
```

Import request:

```json
{
  "supplierConnectionId": "scn_...",
  "externalProductId": "CJ_PID",
  "preflightId": "cpf_...",
  "sellerAccountId": "sacct_...",
  "marketCodes": ["ENABLED_MARKET_CODE"],
  "fulfillmentMode": "SUPPLIER_DROPSHIP"
}
```

`marketCodes` must contain at least one currently enabled market. The API rejects unknown or disabled markets. The request does not assume a country from IP address or supplier origin.

`preflightId` must belong to the same candidate, seller account, supplier connection, provider product, markets, source snapshot, and current policy version. The connection must still be `CONNECTED` and owned by a `DROPSHIPPER` account. It must be unexpired and `PASS` or `PASS_WITH_ATTENTION`. Changing any bound input requires a new preflight.

Import completion returns the canonical product/revision identifiers, publication state, attention count, attention severity summary, and whether purchase is currently permitted. The client never infers Live or Needs Attention from score alone.

Required headers include authenticated service context, verified actor context, request ID, and `Idempotency-Key` for mutations that create effects.

`PATCH` requests require the current aggregate version through `If-Match`. Product, option, variant, media-order, and offer mutations return the new aggregate version. Media upload sessions restrict content type, maximum size, object key, actor, product, and expiry; the server validates the completed object again before creating `MediaAsset`.

Typed errors include:

```text
AUTHENTICATION_REQUIRED
PERMISSION_DENIED
BUSINESS_MODEL_FORBIDDEN
SUPPLIER_CONNECTION_REQUIRED
SUPPLIER_CONNECTION_UNHEALTHY
SUPPLIER_REAUTH_REQUIRED
SUPPLIER_FUNDING_REQUIRED
CROSS_TENANT_ACCESS_DENIED
RESOURCE_NOT_FOUND
IDEMPOTENCY_CONFLICT
VERSION_CONFLICT
SOURCE_UNAVAILABLE
SOURCE_RATE_LIMITED
SOURCE_RESPONSE_INVALID
IMPORT_ALREADY_EXISTS
CANDIDATE_PREFLIGHT_REQUIRED
CANDIDATE_PREFLIGHT_EXPIRED
CANDIDATE_REVIEW_REQUIRED
CANDIDATE_HELD
CANDIDATE_BLOCKED
CATEGORY_NOT_IN_PILOT
CATEGORY_MAPPING_REQUIRED
VARIANT_MAPPING_REQUIRED
MEDIA_REVIEW_REQUIRED
IP_REVIEW_REQUIRED
BRAND_AUTHORIZATION_REQUIRED
COMPLIANCE_REVIEW_REQUIRED
PERMIT_REQUIRED
MARKET_PROHIBITED
MARKET_UNSERVICEABLE
MARGIN_POLICY_FAILED
PUBLISH_VALIDATION_FAILED
```

Responses do not expose raw supplier payloads, secrets, internal stack traces, or storage paths.

## 19. Observability and audit

Record structured, redacted events for:

- candidate shortlist, preflight inputs, hard-gate outcomes, score components, rule versions, decisions, reason codes, reviewer, and next action;
- import requested, reused, completed, retried, and failed;
- CJ calls by endpoint, latency, outcome, request ID, points used, and remaining points;
- mapping confidence and corrections;
- media checks and decisions;
- market-compliance evaluation, policy-version change, evidence verification/expiry, protected-evidence access, IP quarantine, and global or market block;
- auto-approval policy/checksum, attention opened/acknowledged/resolved, notification deduplication, and auto-pause reason;
- draft saves and version conflicts;
- review, approval, publish, pause, archive, rollback, and override;
- supplier webhook receipt, signature result, deduplication, and processing;
- sync lag, stale products, paused offers, and dead-letter depth.

Do not log CJ tokens, API keys, webhook secrets, full raw payloads, or customer personal data. Define alerts for sustained sync failure, points exhaustion risk, large pause spikes, failed publish jobs, and dead-letter growth.

## 20. Acceptance tests

### 20.1 Import and identity

- Create separate Retailer and Dropshipper registrations; prove neither account can switch business model or access the other's resources.
- Deny sourcing to a Retailer account and to a Dropshipper account without a healthy owned supplier connection.
- Migrate the existing CJ credential to the Sals3 Official Dropshipper Account without exposing or duplicating the secret.
- Prove two Dropshipper accounts cannot read or use each other's supplier connections, drafts, offers, or snapshots.
- Prove CJ catalog browsing/import works with zero balance but automatic-fulfillment checkout is funding-held without a verified payment path.
- Import one simple CJ product and create one Sals3 product.
- Retry the same idempotency key and create no duplicate.
- Import the same `pid` with a new key and return the existing product.
- Recover after failure between database commit and worker dispatch.
- Reject malformed or unauthorized import requests.
- Prove browsing creates no Product Draft or catalog record.
- Shortlist a candidate without creating Product, Variant, Offer, or MediaAsset.
- Reject import without a current `PASS` or `PASS_WITH_ATTENTION` preflight.
- Recheck hard gates before draft creation when source or policy changes.
- Auto-publish only after the selected import completes fresh server-side publication gates.

### 20.2 Candidate screening

- Apply discovery filters without review/freight enrichment per visible row.
- Confirm `listedNum` is never labelled or calculated as sold count.
- Derive CJ review evidence without presenting it as Sals3 buyer ratings.
- Keep one-review products from receiving full review-confidence points.
- Route non-blocking quality weaknesses to `PASS_WITH_ATTENTION` and unresolved rights, IP, required mapping, duplicate, or compliance uncertainty to `REVIEW`.
- Route temporary stock, freight, cost, freshness, and supplier failures to `HOLD`.
- Block exact duplicate creation and flag near duplicates without automatic merge.
- Prove perceptual-hash and other similarity signals create versioned reviewable clusters without automatic rejection or canonical-product merge.
- Re-evaluate one evidence snapshot under two policy versions without repeating a supplier call solely because decision logic changed.
- Enforce phase-1 no-batch rule and pilot active-job WIP limit.
- Preserve stable reason codes, evidence, rule version, score version, and next action.

### 20.3 Variants and mapping

- Import a simple product, a one-option product, and a two-option product.
- Reject duplicate option combinations.
- Preserve Sals3 variant IDs after CJ label changes.
- Add a new CJ variant as draft only.
- Disable a removed CJ variant without breaking historical order references.
- Hold `ambiguous` and `unmapped` required mappings from publication.

### 20.4 Editor and concurrency

- Save an incomplete draft.
- Block automated approval and publication when required data is missing.
- Return `409 VERSION_CONFLICT` for a stale editor.
- Restore a draft after network interruption without false saved status.
- Create a new revision when editing a published product.
- Roll back to the prior approved revision.

### 20.5 Media and content

- Reject a non-allow-listed source, unsafe redirect, invalid MIME, oversized file, and unsupported format.
- Deduplicate identical media by checksum.
- Block unreviewed or rights-unknown media.
- Preserve provenance after replacement or archival.
- Sanitize supplier description content and prevent stored XSS.
- Confirm AI suggestions, if later enabled, cannot save or publish automatically.

### 20.6 Pricing, inventory, and shipping

- Block fabricated compare-at price.
- Pause an offer after a margin-policy failure.
- Block checkout after stock becomes unavailable.
- Keep a variant visible but inactive when unavailable.
- Block publication for an intended market with no valid freight option.
- Require reconfirmation after an expired or changed quote.

### 20.7 Security and workflow

- Deny every mutation without authentication.
- Deny cross-seller access and unauthorized role actions.
- Prove client-side control removal cannot bypass server publish validation.
- Require reason/evidence for overrides.
- Verify audit events for price, rights, compliance, publish, pause, archive, and rollback.
- Verify CSRF, request limits, upload limits, and sensitive-response cache headers.

### 20.8 Auto-publication and attention

- Auto-approve and auto-publish a green selected import with policy version, evidence checksum, and audit event.
- Auto-publish a yellow selected import as **Live · Needs Attention** without treating warnings as blockers.
- Prove every red condition blocks initial publication or auto-pauses the affected live offer.
- Show initial status on the CJ row, detailed evidence in the screening drawer, persistent state in the Product Sourcing queue, and post-import issues in My Products and Issues & Tasks.
- Show immediate in-app attention for red; group yellow in a deduplicated daily in-app summary.
- Deduplicate repeated sync findings by product, reason, and rule version.
- Auto-resolve a transient issue only after fresh evidence passes current policy.
- Prove a client cannot forge green status, suppress attention, approve a blocker, or publish directly.
- Keep manual approval available only for resolvable exceptions with permission, reason, evidence, and audit.
- Prove shadow decisions create no publish, pause, block, merge, or notification side effect; promote only after recorded owner-approved metrics and a bounded canary.

### 20.9 Country compliance and counterfeit controls

- Default a category outside the approved market pilot to `NOT_IN_PILOT`.
- Block unknown market eligibility from publication.
- Quarantine possible brand/IP signals without treating one automated signal as proof.
- Globally block a confirmed counterfeit and prevent normal override.
- Block only the affected market when prohibition is jurisdiction-specific.
- Require verified, unexpired, exact-product evidence for permit-required goods.
- Reject unsupported certification and authenticity claims.
- Re-evaluate affected products after a policy version changes.
- Pause newly ineligible offers without deleting product, variant, order, evidence, or audit history.
- Prove freight availability cannot override compliance failure.
- Deny access to protected compliance documents without permission and record access.

### 20.10 Synchronization

- Reject invalid webhook HMAC.
- Deduplicate replayed `messageId`.
- Reconcile a missed webhook.
- Handle CJ off-sale, zero stock, cost change, new variant, removed variant, and deleted product.
- Recover from QPS limit, points exhaustion, timeout, and invalid supplier response without duplicate effects.

## 21. Build order

Build one vertical slice before widening category coverage:

Prerequisites from ADR-006 come before the candidate-import slice: real authentication; separate Retailer and Dropshipper registrations; immutable seller-account business model; tenant authorization; provider registry; encrypted supplier-connection secrets; disconnect behavior; and Aj's existing CJ code moved behind `CjSupplierAdapter`. Bootstrap the current environment credential once into the Sals3 Official Dropshipper Account; it must not remain the multi-tenant runtime credential.

1. Define database schema, migrations, typed contracts, permissions, and audit model.
2. Approve one low-risk category-and-market pilot rule pack, its official-source anchors, accountable policy/review owners, and a representative versioned golden catalogue under ADR-010.
3. Implement candidate shortlist, full preflight, hard gates, `PASS`/`PASS_WITH_ATTENTION`/exception decisions, versioned score, attention/exception queues, near-duplicate clustering, WIP limits, and shadow-decision/promotion records without creating catalog records.
4. Implement one idempotent CJ import job that accepts only a current `PASS` or `PASS_WITH_ATTENTION` preflight for a representative simple product.
5. Build Basic Information and Description with real draft persistence.
6. Add category-driven Specifications and mapping review.
7. Add variants, offers, inventory, and Sales Information.
8. Add the secure media pipeline, media review, and counterfeit/IP quarantine signals.
9. Add country compliance, permit evidence, shipping eligibility, and pricing checks.
10. Add audited automatic approval/publication, Live · Needs Attention, immediate red attention, daily grouped yellow attention, manual exception handling, preview, pause, archive, and rollback.
11. Switch one customer PDP vertical slice from the raw CJ feed to the published Sals3 read model.
12. Add product/variant/stock webhooks, scheduled reconciliation, and policy-change re-evaluation.
13. Run the acceptance suite against `PASS`, `PASS_WITH_ATTENTION`, `REVIEW`, `HOLD`, and `BLOCKED` examples from the approved pilot category and market.
14. Expand only after the pilot branch reaches `production_ready` under ADR-002.

Do not batch-import the CJ catalog during phase 1. Only explicitly selected candidates with a fresh `PASS` or `PASS_WITH_ATTENTION` preflight may enter the import/publication workflow. Do not widen categories or markets before the single-product vertical slice passes candidate, identity, mapping, media, compliance, attention, pricing, auto-publication, rollback, and sync tests.

## 22. Rollback and operational controls

- Disable new CJ imports with a server-side feature flag.
- Disable supplier synchronization without deleting links or snapshots.
- Pause one offer, one product, one market, or all CJ-backed offers.
- Restore a prior approved product revision.
- Replay failed import and sync jobs from recorded checkpoints.
- Rebuild the public read model from canonical revisions.
- Preserve supplier snapshots, mapping versions, and audit history during rollback.

A rollback rehearsal is required before production publication.

## 23. Resolved blockers and remaining external decisions

This specification resolves the internal design blockers for:

- import identity and duplicate handling;
- separate Retailer/Dropshipper registration, immutable account business model, tenant isolation, supplier connections, generic provider adapters, and CJ credential migration;
- field ownership and synchronization;
- variant identity and source changes;
- separate workflow states;
- editor tabs and validation;
- pricing handoff boundaries;
- media ingestion and rights review;
- separate candidate storage, cheap discovery filters, full preflight, hard gates, versioned scoring, review/hold/block outcomes, near-duplicate detection, and WIP limits;
- correct CJ signal semantics: `listedNum` is listing count, while product comments are supplier-platform evidence rather than Sals3 sales or buyer reviews;
- positive market/category pilot allowlists, versioned country rules, permit evidence, counterfeit/IP quarantine, and policy-change re-evaluation;
- phase-1 human-on-exception operation: green auto-publication, yellow Live · Needs Attention, red block/auto-pause, persistent status surfaces, and deduplicated in-app notifications;
- permissions and audit;
- concurrency, retry, reconciliation, rollback, and tests;
- API semantics and customer preview consistency.

The following are external business or infrastructure inputs, not missing product-flow design:

- incorporation and enabled launch markets;
- approved seller, commission, margin, reserve, tax, and fee values;
- selected database, object storage, queue, secret manager, and production identity provider;
- qualified legal and accounting review;
- media-use rights under the applicable CJ agreement;
- pilot categories approved under ADR-002.

These inputs block production activation where relevant. They do not require redesigning the handoff contract.

## 24. External interface references

Recheck these official CJ pages against the actual account and response shapes before implementation:

- Product detail, variants, inventory, media, and sourcing: <https://developers.cjdropshipping.com/en/api/api2/api/product.html>
- Freight calculation and tracking lookup: <https://developers.cjdropshipping.com/en/api/api2/api/logistic.html>
- Product, variant, stock, order, and logistics webhooks: <https://developers.cjdropshipping.com/en/api/start/webhook.html>
- Access frequency limits: <https://developers.cjdropshipping.com/en/api/start/limit.html>
- API points rules: <https://developers.cjdropshipping.com/en/api/api2/standard/points.html>

Current official documentation does not replace runtime schema validation. Record supplier request IDs and validated response versions in tests and diagnostics.

## 25. Verification gate

Implementation is complete only when:

- the current `sals3-portal` contract and new Catalog Admin API contract pass contract tests;
- the database constraints prove idempotency and stable identity;
- server authorization, CSRF, upload, XSS, SSRF, and audit tests pass;
- the editor passes keyboard, screen-reader, zoom, mobile, desktop, slow-network, and recovery tests;
- representative category and variant cases pass ADR-002 pilot QA;
- pricing and market eligibility pass ADR-003 tests;
- publish bypass, rollback, webhook replay, and reconciliation tests pass;
- the customer PDP reads only the published Sals3 revision for the migrated vertical slice;
- README, runbooks, current-state notes, and manual testing records match verified behavior.

## 26. Verified implementation status — updated 2026-08-07 (automated evaluation pipeline)

Only the items below are implemented and verified. Everything else in this
specification remains unimplemented. Do not read a section's presence here as
evidence that it works.

> [!IMPORTANT] Reversal from the first 2026-08-07 update, same day
> The first version of this section said the preflight decision (§8.4-8.6, §14)
> was explicitly **not** implemented, parked pending an owner-approved ADR-002
> pilot rule pack — see [[sals3-skills]] lesson 54 for the full sequence. Bogs directed
> building it anyway that same day, for the single-seller dev/official context
> only, using **labelled placeholders** where the spec calls for information no
> one has approved yet. It is now implemented and verified below — but the
> ADR-002/ADR-003 approval this section previously said was the blocker still
> has not happened. Do not read "implemented" as "policy-approved." See the new
> "Labelled placeholders, not approved policy" subsection.

### Implemented and verified in `sals3-portal`

- Postgres schema and checked-in Drizzle migrations for **five** tables:
  `supplier_candidates` (unique on `(supplier, external_product_id)`),
  `idempotency_records`, `supplier_snapshots`, append-only `audit_events`, and
  `candidate_evaluations` (added 2026-08-07, second session — the decision
  model below).
- Section 4.2 duplicate handling: re-ingesting the same CJ `pid` reuses the
  existing row. Verified against the live database — four requests produced one
  candidate row, one audit event, and four idempotency records
  (`reused: false` once, then `true`).
- Section 4.2 idempotency: same key plus same payload replays the stored
  result; same key plus a different payload is rejected. Only a SHA-256 digest
  of the payload is stored.
- **CJ enrichment evidence fetch (part of section 8.3).** Three live calls per
  candidate — `/product/query` (detail, with variants embedded),
  `/product/stock/getInventoryByPid` (per-warehouse and per-variant stock), and
  `/product/productComments` — normalised into a `supplier_snapshots` record
  with a SHA-256 checksum and capture timestamp, one row per candidate. Runs
  sequentially under CJ's one-request-per-second limit, outside any
  transaction, and logs `pointsInfo` from every response. Roughly 30 points per
  candidate. Unchanged from the first version of this section, now called from
  the automated pipeline's evaluate step instead of a per-row click.
- **Automated candidate-evaluation pipeline (§8.4, §8.5, §8.6, §14 — now
  built, see the placeholders caveat below).** A protected internal route
  (`/api/internal/catalog/evaluate-tick`, `CRON_SECRET`-gated, called on a
  best-effort five-minute schedule by `.github/workflows/evaluate-tick.yml`)
  runs: ingest the CJ feed
  into `QUEUED` candidates → lease a bounded batch (Postgres
  `FOR UPDATE SKIP LOCKED`, no new infrastructure) → cheap screening against
  feed-level data only (blocks before spending a CJ evidence-fetch call) →
  full qualification against real evidence for survivors → decide → persist
  snapshot + decision + audit event in one short transaction. The manual
  per-row `Check for Sals3` click is gone; the seller-facing `Check for
  Sals3` Server Action is retired to a permission-gated `recheckCandidateNow`
  debug action for retryable rows only.
- Seven decision states: `QUEUED`, `EVALUATING`, `PASS`, `PASS_WITH_ATTENTION`,
  `TEMPORARILY_INELIGIBLE`, `BLOCKED`, `EVALUATION_FAILED`. `BLOCKED` is
  reserved for permanent reasons (policy/counterfeit match, duplicate) with no
  override; `TEMPORARILY_INELIGIBLE` covers structurally transient failures
  (no stock, no shipping route, invalid price). **Known defect (2026-08-10):**
  these decisions persist `nextRetryAt = null`, so the automatic retry the
  portal promises never runs — see the approved correction below. Exponential
  backoff with jitter and 5-attempt dead-lettering to the Exception Queue
  apply only to technical `EVALUATION_FAILED` rows. Malformed or unreachable
  CJ data routes to `EVALUATION_FAILED`, never a fabricated pass.
- `Product Sourcing` navigation rebuilt: **Qualified Products** (Ready /
  Needs Attention, nested), **Evaluating**, **Blocked / Rejected**,
  **Exception Queue** (now reads real dead-lettered rows, not a permanent
  empty state), and **All Supplier Products** (the renamed raw CJ browser,
  read-only status badges, no click-to-check action anywhere).
  `/products/shortlisted` redirects to `/products/qualified/ready` rather
  than 404ing.
- 166 unit/component tests (43 new) and 37 Playwright tests (36 passing + 1
  correctly skipped without `CRON_SECRET`) pass, including regression tests
  that a screening-stage block never spends a CJ evidence call, that two
  concurrent lease claims cannot take the same row, and that every stored
  `BLOCKED` decision carries at least one reason code.

Two CJ API facts verified live on 2026-08-07, both of which silently corrupt
inventory if assumed otherwise, and both now covered by regression tests:

- `variantInventories` is returned in a different order from the detail
  response's `variants`. The join must be on `vid`, never array index.
- The two inventory levels name the same field differently: product-level
  warehouse entries use `totalInventoryNum`, per-variant entries use
  `totalInventory`. One shared schema parsed every per-variant total as null
  while 36,338 real units existed. After the fix the five variants summed to
  exactly the warehouse total.

### Labelled placeholders, not approved policy

The preflight decision engine above is real, tested code — but three of its
inputs are placeholders standing in for a business/legal decision no one has
approved, following the same pattern already established by the shortlist's
`PLACEHOLDER_MARKET_CODE`:

- **Category/counterfeit denylist** — §14.1's own "recommended initial
  exclusions" wording, not invented, but no ADR-002 pilot category has
  actually been approved for any market.
- **Destination market** — still the single placeholder `'PH'`; not an
  ADR-003 approval.
- **Price bounds and margin-floor estimate** — env-configured placeholder
  numbers (`src/modules/catalog/candidates/rules/policy.ts`). The margin
  estimate is identical for every candidate today (no per-product landed
  cost exists), never a real per-product calculation.

`candidate_evaluations.policy_version` records which policy produced a stored
decision, specifically so these can be swapped for a real ADR-002/ADR-003
rule pack later without a schema change. Until that approval happens, every
`BLOCKED`/`TEMPORARILY_INELIGIBLE`/`PASS_WITH_ATTENTION` decision driven by
one of these three checks is provisional, not policy-approved.

### Automatic discovery and queue-admission logic — approved correction 2026-08-10

The seller does not manually shortlist rows from **All Supplier Products**.
The scheduled pipeline automatically creates a `QUEUED` candidate for a new
CJ product and requeues a decided candidate when its feed fingerprint changes.
The **Evaluating** screen combines `QUEUED` and actively leased `EVALUATING`
rows. One current tick processes every workable `CONNECTED`/`DEGRADED`
connection sequentially, fetches pages 1-5 (20 rows per page), requeues due
retries, and claims at most eight evaluations in original-created-time order.

That current behavior is implemented but is not the complete target design:

- there is no persisted scan cursor/checkpoint, so products after page 5 can
  remain unseen indefinitely;
- every tick restarts at page 1, so shallow unchanged rows consume discovery
  calls while deep pages receive no guaranteed coverage;
- the material fingerprint contains CJ `pid`, category, price, and
  `listedCount`, but omits name and `shipsFrom`; a new counterfeit phrase or
  shipping-origin change can therefore fail to trigger re-evaluation, while a
  popularity-only `listedCount` change can spend full evidence calls;
- stock, variants, images, reviews, freight, and rights can change without a
  list-fingerprint change, and there is no policy-defined evidence-expiry
  recheck;
- changing `policyVersion` does not itself queue existing decisions, including
  old `PASS` and `BLOCKED` rows;
- source change does not automatically reopen an exhausted
  `EVALUATION_FAILED` row because fingerprint requeue excludes that state;
- normal `TEMPORARILY_INELIGIBLE` decisions such as `NO_STOCK` are stored with
  `nextRetryAt = null`; despite the portal copy, the automatic retry query
  cannot select them, so they remain stuck until a feed fingerprint change or
  a manual recheck;
- a disconnected/revoked queued candidate becomes `EVALUATION_FAILED` with a
  null retry time before the maximum-attempt threshold; the Exception Queue
  only shows failures at that threshold, so this row can become invisible in
  every Product Sourcing queue;
- a failure while ingesting one connection aborts the whole tick before other
  connections, due retries, and the evaluation batch can run;
- evaluation accepts some non-workable connection states left over after
  queueing instead of requiring the same `CONNECTED`/`DEGRADED` rule used by
  ingestion;
- there is no `lastSeenAt`/completed-scan reconciliation, so supplier removal
  or delisting cannot be distinguished safely from pagination drift, a partial
  scan, or an upstream failure;
- oldest-created-first scheduling has no tenant fairness or priority aging;
  recurrent old candidates can jump ahead of newly discovered candidates;
- the protected route has a 60-second runtime budget while ingestion and
  evidence calls share one tick; there is no persistent stage checkpoint or
  connection-level work lease to prevent overlapping scheduler calls from
  repeating supplier traffic;
- no approved positive category-and-market pilot allowlist controls expensive
  evidence admission; the placeholder keyword denylist can miss synonyms,
  spelling changes, non-English terms, or unmapped risky categories;
- coverage, checkpoint lag, full-scan duration, evidence age, policy-version
  lag, and per-connection points/error budgets are not yet first-class
  operational measurements.
- `supplier_snapshots` and `candidate_evaluations` are latest-only rows that
  are overwritten on re-evaluation. The append-only audit preserves an event
  and checksum but not the prior full evidence/feed snapshot and complete
  findings, so an old decision cannot always be reproduced after later data
  replaces it. A screening-only block can also retain current summary/checksum
  fields from an older full evaluation unless current pointers are cleared or
  linked per decision.
- candidate creation and automatic requeue/checkpoint admission have no
  dedicated audit event; the system records the eventual decision but not the
  complete reason and scan context that admitted the work.
- the GitHub Actions schedule is best-effort, can lag, and can auto-disable
  after repository inactivity. The production route returns a successful
  no-op when no database is configured, so an external scheduler can remain
  green while catalogue work has stopped unless a separate heartbeat and
  coverage alarm exists.

ADR-013 adds four provider-contract constraints to that replacement:

- Product List V2 reports at most 6,000 matching records. Begin with a
  persistent category/time partition and split it only when the response hits
  that cap; do not build a speculative full-catalog crawler or claim completed
  coverage from an over-cap window.
- Preserve `cjInventory`, `factoryInventory`, `totalInventory`, and
  `verifiedWarehouse`. The current `totalInventory` reduction loses evidence;
  factory-backed/unverified stock is policy-driven attention or hold, not an
  automatic permanent block.
- A warehouse row with stock proves a stocked origin only. Rename the current
  `NO_SHIPPING_ROUTE` check/finding so it cannot imply destination freight;
  only a fresh ADR-003 quote can set `FREIGHT_ROUTE_CONFIRMED`.
- CJ points exhaustion and the documented zero-transaction inactivity
  suspension are recoverable connection-health conditions. They must schedule
  retry/reactivation and bounded requeue rather than strand or permanently
  reject a product.

The required replacement is [[ADR-010-catalog-decision-governance-and-shadow-enforcement#12. Supplier discovery coverage and queue admission]]: persistent per-connection scan cycles, hot and backfill lanes, explicit admission reasons, a positive pilot allowlist, separate material/ranking fingerprints, freshness and policy-triggered re-evaluation, real retry/recovery scheduling, dead-letter reopening, connection-failure isolation, fair priority scheduling with aging, safe completed-cycle disappearance handling, append-only linked evidence/decision history, bounded resumable workers, scheduler heartbeat, and observable coverage.

#### Approved portal fallback for intentional disconnect

The permanent solution does not repeatedly retry an account that its owner
intentionally disconnected:

1. **Supplier Apps -> Disconnect** stops ingestion/evidence calls for that
   connection and records the pause.
2. Affected queued/in-flight candidates become **Blocked / Rejected ->
   Temporarily unavailable**, reason `SUPPLIER_CONNECTION_DISCONNECTED`, with
   event trigger `ON_CONNECTION_RESTORED`; the transition does not increment a
   technical-failure attempt.
3. The last completed evidence and decision remain historical facts, while the
   current effective eligibility disables **Customize & List** and publication.
4. **Supplier Apps -> Reconnect and resume evaluation** verifies credentials,
   emits an audited `CONNECTION_RESTORED` event, and requeues affected rows in
   bounded batches.
5. Recovered rows pass through **Evaluating** and cannot return to **Ready**
   until their evidence is fresh enough for the current policy.

Repository/database invariants must make stranded states impossible: every
temporary row has either `nextRetryAt` or a named recovery trigger; every
pre-dead-letter `EVALUATION_FAILED` row has a retry; every exhausted failure is
visible in **Exception Queue**; and every active candidate resolves to one
Product Sourcing queue.

#### Approved implementation order and exit gates

Deliver the correction in independently reviewable units:

1. **Queue state correctness:** timed retry for stock/route holds, event-driven
   connection hold/recovery, visible technical failures, and state-invariant
   tests. Exit: no candidate can disappear from all queues.
2. **Discovery coverage:** persistent per-connection scan cycle/checkpoint with
   non-starving hot and backfill lanes, starting with category/time partitions
   and splitting only when the provider's observed result cap is reached. Exit:
   a bounded scan resumes beyond page 5, handles one at-cap fixture without
   omissions/duplicate effects, and completes a measured pilot-feed cycle.
3. **Change and freshness:** qualification fingerprint v2 (name, provider
   category, price/currency, shipping hints), separate ranking fingerprint,
   and policy-defined evidence expiry. Exit: material changes/stale evidence
   requeue; popularity-only changes do not spend qualification calls.
4. **Policy re-evaluation:** queue candidates affected by a new policy or
   algorithm version; reuse fresh preserved evidence and fetch only when stale.
   Exit: no active decision silently remains on an obsolete enforced policy.
5. **Reproducibility:** append-only feed/evidence/finding/decision versions plus
   a current-state projection. Exit: any decision reproduces from its exact
   linked evidence, complete findings, and policy/algorithm version.
6. **Resilience and operations:** per-connection failure isolation, fair
   priority scheduling with aging, resumable time/request/CJ-points budgets,
   explicit points-exhaustion/inactivity recovery, work leases, scheduler
   heartbeat, queue/coverage alerts, and completed-cycle disappearance
   reconciliation. Exit: one connection failure, provider suspension, or
   partial scan cannot stop or falsely delist another connection's work.
7. **Approved pilot policy:** positive category/market allowlist, taxonomy and
   required attributes, source-anchored policy, golden catalogue, shadow
   decisions, measured promotion, and canary. Exit: **Ready** is meaningful only
   inside the approved pilot scope.
8. **Final candidate gates:** destination freight/landed contribution, media
   rights, and review-only near-duplicate clustering; unresolved legal, IP,
   safety, mapping, media, freight, or evidence uncertainty routes to `REVIEW`.
9. **Canonical catalogue handoff:** real Product/Revision/Option/Variant/Offer/
   SupplierBinding/Media/Attention persistence, **Customize & List -> Add
   Product**, final validation, audited publication/outbox, and storefront reads
   from published Sals3 revisions only.

Do not treat **Ready** as permission for production catalogue publication until
units 1-8 pass their exit gates. Unit 9 creates the actual path into **Product
Catalogue**.

Until that replacement is implemented, **Ready** means “passed the current
provisional rules among candidates the bounded scanner actually reached.” It
is not proof that all rows visible in **All Supplier Products** were evaluated.

### Explicitly NOT implemented

- **Category-required-attribute validation** (part of §8.5). Needs the
  ADR-002 taxonomy-to-CJ-category mapping wired up first — that integration
  does not exist. Separate, larger task.
- **Image-dimension/resolution checks.** Not possible from CJ's currently
  modelled API surface — `/product/query` returns no image dimensions.
- **Freight evidence** (`/logistic/freightCalculate`, part of section 8.3). It
  needs an approved destination market and ADR-003 has approved none, so it is
  not called. Destination availability and landed cost therefore cannot be
  evaluated at all yet.
- **Supplier description sanitisation.** The CJ `description` is fetched and
  stored but never rendered, because no sanitiser exists. Section 12's media
  pipeline and section 9.4's source panel both remain unbuilt.
- Product, ProductOption, Variant, Offer, MediaAsset, ProductRevision,
  AttentionIssue, ComplianceEvaluation, CostSnapshot, OutboxEvent, and every
  other entity in section 5 beyond the five tables above.
- Import job (section 8.11 steps 5-12), publication, attention state,
  auto-publish/auto-pause, media pipeline, supplier synchronization, webhooks,
  preview tokens, and the Product Editor. "Customize & List" on a qualified
  candidate states this honestly rather than faking success.
- The versioned HTTP admin API surface in section 18. Internal writes use
  Server Actions instead; see the revised section 3.2.
- ADR-010's golden pilot catalogue, shadow-decision records, promotion metrics,
  canary enforcement, versioned near-duplicate clusters, policy-source registry,
  and connection-scoped circuit breaker.
- ~~Any per-seller CJ connection, Shopify-style Supplier App, or AliExpress
  integration — still one global `CJ_API_KEY` and one dev/official seller
  context (`seller-001`). Explicitly deferred to a separate task.~~ **Done
  2026-08-07, third session** for CJ specifically: `seller_accounts`,
  `supplier_providers`, `supplier_connections`, and encrypted
  `supplier_connection_secrets` exist; Supplier Apps (`/supplier-apps`) lets
  a Dropshipper connect/disconnect/reconnect their own CJ account, and the
  ingestion/evaluation pipeline plus every seller-facing screen source
  through that connection instead of the global key. `identityId` is still
  the `dev-user` placeholder (no real seller registration/login exists),
  and AliExpress/any second provider is still not built - only
  `CJ_DROPSHIPPING` is seeded. See [[hot]] and
  [[sals3-session-2026-08-07-part15-multi-tenant-supplier-connections-and-ui-overhaul]].

### Parked, with a named unblock condition

Two of the gaps above are parked in [[parked-ideas-backlog]] rather than
left as open TODOs, because each is blocked by an owner decision, not by
engineering effort. The preflight decision engine's own parked entry is now
struck through — see that file for why: it was unparked and built with
placeholders, but the underlying business/legal approval it names is still
unmade.

- **Destination freight evidence** (§8.3, §13) — blocked on an ADR-003
  approved market. There is no legitimate destination to quote against.
- **Supplier HTML sanitisation** (§9.4, §12) — to be designed together with
  the structured `descriptionDocument` format, not bolted on.

### Known limitations to carry forward

- Authentication is still `sals3-portal`'s development role switch
  (`PORTAL_DEV_ROLE`), not real employee sign-in. Section 3.3's production
  gate still applies.
- No ADR-003 launch market is approved, so the shortlist records a clearly
  labelled placeholder market code. It must become a real seller-selected
  market before anything publishes.
- The rate limiter is per server instance. It needs a shared store if the
  portal ever runs more than one instance.
- **No database exists outside a developer machine.** There is no staging or
  production Postgres, so `DATABASE_URL` is unset in CI and in preview
  deploys. Two consequences are now permanent design constraints rather than
  temporary quirks: the database client connects lazily, so importing it never
  requires configuration and a build never needs a database; and any page that
  reads the catalog must check `isDatabaseConfigured()` and render an honest
  "not configured in this environment" state instead of failing. Provisioning a
  real database is a separate, unmade infrastructure decision (spec §23's
  "selected database" input) — the local Postgres is a developer convenience,
  not an approved deployment.
- `drizzle-kit` carries moderate-severity advisories through a transitive
  `esbuild` dev-server issue. It is a devDependency only and never runs in the
  application runtime; `npm audit --audit-level=high` passes.

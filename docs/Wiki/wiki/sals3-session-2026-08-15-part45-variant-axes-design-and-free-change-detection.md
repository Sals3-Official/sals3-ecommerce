---
tags: [sals3, sals3-portal, storefront, variants, options, cj-points, change-detection, design, session]
aliases:
  - Variant Axes Design
  - Free Supplier Change Detection
  - Unnamed Token Rows
  - Part 45
created: 2026-08-15
updated: 2026-08-15
status: shipped-see-part47
authority: session-record
owner_approved: false
implementation_status: designed-here-shipped-in-part47-merged-to-develop
related:
  - "[[hot]]"
  - "[[sals3-session-2026-08-15-part47-option-mapping-wiring-and-supplier-change-detection]]"
  - "[[sals3-session-2026-08-15-part44-storefront-variant-label-and-retail-price-floor]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
---

# Sals3 session 2026-08-15, part 45 — variant axes design, and supplier change detection for zero CJ points

Continues [[sals3-session-2026-08-15-part44-storefront-variant-label-and-retail-price-floor]],
which recorded the merged work (PR #78). This note is the **design and
investigation** that followed it. Nothing here is built except where stated.

> [!NOTE] Shipped 2026-08-15 - see [[sals3-session-2026-08-15-part47-option-mapping-wiring-and-supplier-change-detection]]
> Everything below was design-only when written. The option-mapping wiring (§4), the diff-based change detector (§1), and the four owner decisions (§4) all shipped the same day, across PRs #82-#87 - merged to `develop`. The webhook-vs-diff call in §2 held: the diff shipped, not a `STOCK`/`VARIANT`/`PRODUCT` webhook subscription, which remains unbuilt and is the open item part47 flags for automating the refresh trigger. The `no audit trail of supplier change, ever` caveat in §6/Question F was **not** resolved - `supplier_snapshots.evidence` still overwrites in place.

## 1. The headline finding: supplier change detection costs nothing

Two copies of the supplier's variant facts already exist in the database, and
they drift apart on their own:

| Table | Behaviour | Verified at |
|---|---|---|
| `supplier_snapshots.evidence` | **overwritten** every capture — current supplier truth | `uniqueIndex('supplier_snapshots_candidate_id_key')` |
| `provider_variant_references.*` | **frozen at draft** — one `insert`, no updater anywhere | `repository.ts:516`, called only from `create-draft.ts` |
| `provider_product_references.snapshot_checksum` | moves per capture — a ready-made "something changed" flag | `capture-evidence.ts:141-147` |

So the whole Changes panel is a `SELECT`, not an API call:

```
supplier_snapshots.evidence      (current)
        vs
provider_variant_references.*    (as recorded when we drafted)
        =  the change
```

That yields, free: supplier cost moved · **cost rose above our retail price** ·
variant label changed · variant added (a `vid` with no reference row) · variant
removed · stock moved.

**Why this matters more than the publish floor.** Part 44's
`RETAIL_BELOW_SUPPLIER_COST` guard only fires *at publish*. If CJ raises a cost
after publication, the offer stays live and silently sells at a loss. Only a
diff catches that, and the diff is free.

### The catch, traced

`captureCandidateEvidence` has exactly **two callers**, both human-triggered:
`product-draft-actions.ts:178,241` (before creating/updating a draft) and
`products/evidence-actions.ts` (a Server Action behind a button). **The
discovery pipeline never calls it.** So a drafted product's snapshot does not
refresh on its own — the diff is free, but *becoming aware* of a change still
needs a trigger. Options, with verified costs in §2.

## 2. CJ points — verified numbers, correcting two earlier estimates

From the official cost table plus this repository's own verified notes in
`src/lib/cj/discovery-schemas.ts` (checked 2026-08-11):

- **50,000 base points/day**, plus ~100 per USD 1 of recent transactions.
- Charged **per call, not per item**. One `/product/list` at any page size = 50.
- `/product/query`, `/product/variant/query`, `/product/stock` = **10 each**;
  `/product/list`, `/product/listV2` = 50; `queryProductsByImage` = 1,000.
- **Endpoints not listed consume zero.** This repository already relies on that
  rule for `GET /product/getCategory`.
- `POST /webhook/product/subscribe` — `productIds` arrays, **max 100 per
  request, 10 points**. So *per request*, not per product.
- `POST /webhook/set` — per-topic ENABLE/CANCEL with one HTTPS callback. **Not
  in the cost table**, therefore free by the documented rule.
- **`subscribeAll` is unavailable to all users after July 2026** and is
  deliberately not modelled anywhere in this repository.

**Two corrections to estimates made earlier in the session.** A webhook
subscription for the whole catalogue is ~10 points, not ~130 — it was costed per
product instead of per request. And the webhook was initially recommended over
the snapshot diff; the diff is better, because it is free *and* it scales with
rows rather than with 100-id subscription batches. The owner made that call.

**Nothing built or merged in parts 44–45 spends a single point.** Every changed
file was grepped: the only CJ strings are `cf.cjdropshipping.com` **image CDN**
URLs in test fixtures and the image host allow-list — a different host from the
API, fetched by the browser, not an endpoint. Variant labels were paid for once
at candidate evaluation and are pure database reads thereafter.

## 3. Why variant axes cannot be derived, and what is allowed instead

CJ sends only two spellings of one concatenated string —
`variantKey` (`Black-1XL`) and `variantNameEn` (`Black 1XL`) — and **no
structured attributes** anywhere in `enrichment-schemas.ts`. `variantNameEn` is
parsed and then dropped; only `variantKey` is persisted, as
`source_option_label`.

The standing rule (`create-draft.ts:626`, `evidence.ts:45`) is that a label is
never split into Sals3 option axes. **An earlier claim in this session that
splitting `"Army Green-XL"` on the hyphen yields `Army` / `Green-XL` was wrong**
— it yields `Army Green` / `XL`, because the space is inside the colour. The
tokenisation is usually clean. The rule survives for a stronger reason:

> Nothing in the payload says which token is a *Colour* and which a *Size*. On a
> phone the same two slots could be plug type and storage. An invented axis name
> renders to a buyer as a product attribute — the exact failure ADR-013 forbids.

So **structure is provable; names are not.** `deriveVariantLabelStructure`
(built, 9 tests, wired) returns positions only when the tokens form an exact
cross-product — on the real corduroy jacket, `[Black, Army Green] × [S,M,L,XL,XXL]`
= 2 × 5 = 10, no gaps. It refuses in eight ambiguous cases and never emits a
name. The storefront renders **unnamed token rows**: ten variants become seven
chips, and because a token spans several variants at different prices, the chips
carry **no price at all** — the option area drops from ten currency-formatted
tokens to zero, which removes the ADR-016 price-extractor exposure rather than
managing it.

## 4. The mapping feature — design settled with the owner

Reference screens reviewed: Lazada (named axes + value lists) and Shopee (named
axes, **two fields per value**, merged-cell matrix, bulk apply).

**Shopee's two-field model is the one to copy**, because it maps onto the
existing field-ownership rule (*"Never overwrite; show changed supplier name as
reference"*):

| Field | Owner | Example |
|---|---|---|
| Raw value | **CJ, read-only** | `Army Green`, `1XL` |
| Display label | **Sals3 seller, editable** | `Army Green`, `XXL` |

That also makes re-sync safe: matching happens on the raw token, which the seller
never edits.

**Neither platform has our problem** — both assume the seller *creates*
variations. Ours already exist, pre-combined, from CJ. So the screen confirms a
detected split rather than asking for one: the seller types two names and drags
five rows, instead of entering ten combinations.

Owner decisions:

1. **Where** — inside the existing **Variants & Pricing** section.
2. **Required before publish** — yes. Safe: **12 products total** (4 Live, 8
   Draft) against 124,650 candidates. An earlier warning that this would break
   republishing everywhere was wrong by three orders of magnitude.
3. **Re-sync** — automatic, surfaced in the existing Changes panel. Mapping is
   keyed to **variant id**, not to the label text, so a CJ rename cannot unmap
   anything; only a genuinely new `vid` arrives unmapped and flagged.
4. **Who maps** — each seller, for their own products.

Mapping is needed **only once a product is in the Product Catalogue**. Candidates
have no `product_variants` rows at all, so there is nothing to map until
`create-draft.ts` runs. This never becomes a 124,650-row problem.

### The hard prerequisite

`page.tsx` gates on `hasOptionAxes = (detail.options ?? []).length > 0`. The
moment mapping writes `options`, that flips and routes to `ProductPurchasePanel`
— which is `'use client'` with `useState` driving the price. **Shipping mapping
before converting that panel to URL-addressable `?variant=` would silently
reinstate the ADR-016 violation part 44 removed.**

Also: `(product_id, option_combination_key)` is a unique index and
`status <> 'ACTIVE' OR option_combination_key IS NOT NULL` is a check
constraint. Two variants mapped to the same combination will be rejected by
Postgres — correct, but it needs a readable message rather than a 500.

## 5. Work list

**A — ready to land** (done, green, uncommitted by owner instruction): storefront
label consumer, unnamed token rows, and removal of the SKU hash from the PDP
count line and the cart/order line. 500 tests, lint/typecheck/format/build clean.

**B — prerequisite:** `ProductPurchasePanel` → `?variant=`.

**C — mapping:** detection UI in Variants & Pricing · writers for the three
option tables keyed to variant id · required-before-publish gate · friendly
duplicate-combination error.

**D — change detector:** diff service (§1) · replace `read-model.ts:1096`'s
hardcoded `sourceChanges: []` · cost-rose-above-retail alarm · unmapped-variant
flag.

**E — defects found this session:**

1. Editor variant list ordered by `sals3Sku` hash (`read-model.ts:406`), so
   colours and sizes interleave — the scrambled order the owner noticed.
2. Preview variant dropdown renders a raw UUID instead of `item.optionLabel`.
3. `DraftStorefrontPreview` has no variant chooser at all.
4. `DescriptionSection.tsx:53` promises sanitisation that does not exist.
5. `product-draft-actions.ts:39` still claims "no UI wiring yet" — it is wired.
6. `.env.example` missing `NEXT_PUBLIC_SITE_URL` + 3 Stripe vars; without the
   first, no AEO work is verifiable.
7. `robots.ts` advertises a `sitemap.xml` that does not exist.
8. No `/c/[category]`: three unlinkable breadcrumb segments per product, and
   `categoryPath` is three segments in production, not one.

**F — open, owner:** the live `US$4.51` offer against `US$5.80` cost is still
selling below cost — the floor only blocks the *next* publish · how refresh is
triggered (manual button, free today; scheduled re-capture ~20–30 pts/product;
webhook 10 pts once) · snapshot overwriting means **no audit trail of supplier
change, ever**.

## 6. Verified facts worth not re-deriving

- Live catalogue: **12 products — 4 Live, 8 Draft**; 124,650 candidates.
- All twelve read "Content: Needs improvement" — no product has seller copy,
  which is why the storefront's answer-summary slot renders absent everywhere.
- The corduroy jacket: 10 variants, **all at USD 5.80 supplier cost**, retail
  `4.51 / 5.30 / 7.80` and seven at `20.00`. Priced by hand through the
  `SELLER_RETAIL_PRICE` bypass — the editor shows "Category policy required" on
  every variant, so the resolver could not have produced them.
- Local sals3 database holds **1 product and 0 candidates**; production data is
  in Neon. `/listings/new?productId=…` 404s locally for that reason, not a code
  difference — verified by comparing live DOM section ids against
  `types.ts:313-319`.

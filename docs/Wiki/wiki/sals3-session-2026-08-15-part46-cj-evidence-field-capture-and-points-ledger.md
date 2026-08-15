---
tags: [sals3, sals3-portal, cj-dropshipping, cj-points, evidence-capture, product-description, variant-dimensions, stock-origin, session]
aliases:
  - CJ Evidence Field Capture Plan
  - CJ Points Ledger
  - Three Discarded Evidence Fields
  - Part 46
created: 2026-08-15
updated: 2026-08-15
status: designed-not-built
authority: session-record
owner_approved: false
implementation_status: not-started
related:
  - "[[hot]]"
  - "[[sals3-session-2026-08-15-part45-variant-axes-design-and-free-change-detection]]"
  - "[[sals3-session-2026-08-15-part44-storefront-variant-label-and-retail-price-floor]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
---

# Sals3 session 2026-08-15, part 46 — three discarded evidence fields, and the full CJ points journey

Continues [[sals3-session-2026-08-15-part45-variant-axes-design-and-free-change-detection]].
That note found evidence-diffing is free; this one finds three fields inside
the evidence CJ already sends that the pipeline throws away, a zero-new-call
fix for all three, and a corrected, ADR-017-verified points breakdown from
**All Supplier Products** through to a live storefront listing. Nothing here
is built — Bogs asked for the plan and the ledger only, explicitly not the
code.

## 1. Fields already paid for, never kept

Every evidence capture calls CJ's `/product/query` (plus
`/product/stock/getInventoryByPid`) for one candidate. That pair of responses
already contains the product's raw description, each variant's length, width,
and height, and each variant's per-country stock origin. None of the three
survives to where a seller can see it.

### 1a. Product description

- `GET /product/query`'s response includes `description` — raw supplier HTML
  (`src/lib/cj/enrichment-schemas.ts:66`, `cjProductDetailSchema`).
- `toCandidateEvidence()` (`src/lib/cj/evidence.ts:219`) builds the
  `CandidateEvidence` object that gets persisted, and never reads
  `detail.description`. The field is parsed off the wire, then discarded before
  it reaches `supplier_snapshots.evidence`.
- Confirmed nowhere else holds it either: `audit_events` payloads deliberately
  exclude the evidence body (`capture-evidence.ts:164`, "Deliberately not the
  evidence body"); `provider_product_references` stores only a checksum
  pointer; the raw HTTP response is never logged (`cj-adapter.ts`'s `getJson()`
  parses and returns, nothing else).
- Consequence: every product drafted through the normal flow starts from
  `emptyDescriptionDocument()` (`create-draft.ts:508`), and the "Reset to
  supplier content" button in the editor (`DescriptionSection.tsx:41`) resets
  to an empty `supplierDescription` — because there was never anything to put
  there.
- **Existing catalogue items cannot recover this for free.** The description
  was received and discarded at every past capture; there is no stored copy to
  backfill from. Owner decision (Bogs, this session): item count is still
  small, so existing "In Catalogue" products will be backfilled by manually
  copying the description from the CJ product page directly, not by paying for
  a fresh `/product/query` per existing item.

### 1b. Variant dimensions

- `GET /product/query`'s embedded variant array includes `variantLength`,
  `variantWidth`, `variantHeight` (`enrichment-schemas.ts:38-40`,
  `cjVariantSchema`) — same response, same call, already paid for.
- `product_variants` already has the destination columns:
  `length_millimeters`, `width_millimeters`, `height_millimeters`
  (`src/lib/db/schema/product-catalog.ts:559-561`).
- `VariantEvidence` (`evidence.ts`) never carries the three fields, and
  **`repository.ts:489-491` hardcodes all three to `null` on every insert,
  unconditionally** — not "not yet populated," a literal hardcoded null
  regardless of input.
- Net effect: there is no real per-variant volumetric data anywhere in the
  catalogue today, which blocks any future freight/shipping cost work — not
  because CJ doesn't send it, but because it's dropped on the way in.

### 1c. Per-country stock origin ("which warehouse")

A different, simpler case: this one is a display bug, not a persistence gap —
the data already sits in the exact JSONB blob the editor reads for other
fields.

- `GET /product/stock/getInventoryByPid`'s response is already normalised
  into `VariantEvidence.stockByOrigin` (`evidence.ts`) — `countryCode`,
  `cjInventory`, `factoryInventory`, `totalInventory`, `verifiedWarehouse`
  per country — and stored as part of the same `CandidateEvidence` object in
  `supplier_snapshots.evidence`. Nothing extra needs to be captured; this is
  the same call §1a and §1b already ride.
- The Product Editor's "Stock evidence" panel (screenshotted this session:
  `6,189 units · Not recorded`) gets its unit count from a completely
  different, narrower source: `provider_variant_references.last_observed_inventory`
  — a persisted **scalar total**, no per-country split, written once at draft
  creation.
- The "Not recorded" text next to it is not a missing-data fallback — it is a
  **literal hardcoded string**, unconditional, in both branches of
  `editorVariants()` (`read-model.ts:857` and `:877`):
  `warehouseLabel: 'Not recorded'`. No field is read; nothing could ever
  change what this shows.
- Even if that literal were removed, there is nowhere to read from yet:
  `read-model.ts`'s own `evidenceVariantSchema` (a separate, narrower re-parse
  of `supplier_snapshots.evidence` used only for display, distinct from
  `create-draft.ts`'s `storedEvidenceSchema` used for writing) also does not
  carry `stockByOrigin` — same shape of gap as §1a/§1b, one file over.
- **The join key already exists and is already used nearby**:
  `provider_variant_references.external_variant_id` is CJ's own `vid`
  (`create-draft.ts:604,624,649`: `externalVariantId: evidenceVariant.vid`),
  the same key `stockByOrigin` entries are attached to. No new identifier
  needs inventing.
- Simpler than §1a/§1b in one respect: this is **read-model-only**. It does
  not touch `create-draft.ts`, `repository.ts`, or any `product_variants`
  column — the display function already has the snapshot in scope in the same
  place it computes `productEvidence` (`read-model.ts:576`); it just needs to
  look one level deeper, per variant, instead of stopping at the product
  level.

### What was ruled out along the way

Also present in `CandidateEvidence` but genuinely unused, checked for a
destination column and found to have none: `entryCode` (CJ customs/entry
code — no column anywhere in `products`), `reviews` (`totalCount`,
`sampledAverageScore` — no column, and the code already warns this must never
be relabelled a Sals3 rating), `listedCount` / `isTestProduct` /
`sourceStatusRaw` (operational/screening signals, arguably belong on the
evaluation row, not the product). None of these have a ready column the way
dimensions do — bringing any of them in is a schema migration, a separate,
larger decision, and out of scope here. Owner call (Bogs): shelved, not
pursued this session.

One correction made mid-investigation, worth recording so it isn't re-asked:
**Supplier SKU, Packed weight (supplier), and Ships from (supplier)** in the
editor's Basic Information tab are *not* evidence-sourced and were never
blank because of a wiring gap. `supplierFacts()` (`read-model.ts:129-155`)
pulls all three straight from `candidate_evaluations.feed_snapshot` — the
free, list-level discovery data captured for virtually every candidate,
independent of the paid evidence call. They read blank on some products
simply because that candidate's feed snapshot itself lacked the value.

## 2. The fix — file by file, no new CJ call

§1a and §1b ride the *next* evidence capture, whichever button triggers it —
no new call, no schema migration (the DB columns already exist; `jsonb` in
`supplier_snapshots.evidence` needs no migration for a new key). §1c (steps 7–8
below) is independent of the other two: it changes nothing about what gets
captured or written, only what the editor reads back for display, and it takes
effect immediately for every candidate that already has a snapshot — no wait
for a fresh capture.

1. **`src/lib/cj/evidence.ts`**
   - Add `descriptionHtml: string` to the `CandidateEvidence` type.
   - Add `lengthMillimeters`, `widthMillimeters`, `heightMillimeters`
     (`number | null` each) to `VariantEvidence`.
   - In `toCandidateEvidence()`: set `descriptionHtml: input.detail.description`.
   - In the same function's variant-mapping block, carry through
     `variant.variantLength/Width/Height` into the three new fields.
   - ⚠️ **Verify the unit before mapping.** Confirm whether CJ reports these
     in millimetres or centimetres against one real captured product before
     writing the mapping — if CJ reports cm, multiply by 10 to match the
     `*_millimeters` column name. Do not assume; this project has already been
     burned once by an unverified CJ field-shape assumption (the
     `totalInventoryNum` vs `totalInventory` naming trap recorded in [[hot]]
     and again in ADR-017).

2. **`src/modules/catalog/candidates/rules/policy.ts`**
   - Bump `EVIDENCE_SCHEMA_VERSION` from `'cj-evidence-v3'` to `'cj-evidence-v4'`
     — the same convention already used when `imageUrls` was added.

3. **`src/lib/cj/evidence.test.ts`**
   - Extend the fixture CJ detail payload with a description and non-zero
     variant dimensions; assert `toCandidateEvidence()`'s output carries all
     four new fields.

4. **`src/modules/catalog/products/create-draft.ts`**
   - Extend `storedEvidenceSchema` with `descriptionHtml: z.string().nullish()`.
   - Extend `storedVariantSchema` with the three dimension fields as
     `z.number().nonnegative().nullish()`.
   - Thread the dimension fields from each parsed `evidenceVariant` through to
     the variant-insert call, the same path `weightGrams` already takes.
   - **Do not** feed `descriptionHtml` into `emptyDescriptionDocument()` or any
     `contentDocument` field. Draft descriptions stay empty until a sanitiser
     exists — `descriptionDocument`'s format is deliberately allow-list-only
     with no raw-HTML block, and its own comment says sanitisation "must be
     designed together with this format rather than bolted on"
     (`description-document.ts`). Wiring raw supplier HTML through before that
     exists is a separate, security-sensitive decision, not this one.

5. **`src/modules/catalog/products/repository.ts`**
   - Replace the hardcoded `lengthMillimeters: null, widthMillimeters: null,
     heightMillimeters: null` with values passed in from the caller, mirroring
     how `weightGrams: input.weightGrams` already works.
   - Extend the insert function's input type to accept the three fields.

6. **Verify, don't add**
   - `products/no-supplier-calls.test.ts` must still pass untouched — no new
     import should become reachable from `create-draft.ts`, `save-draft.ts`,
     or `repository.ts`.
   - No change to `/product/list`, discovery, curated lanes, or the
     `/products` browse page — different, unrelated cost bucket.
   - No new adapter method, no new CJ endpoint call, anywhere.
   - `descriptionHtml` is not rendered in `CandidateEvidencePanel.tsx` or
     anywhere else — it stays raw, unsanitised supplier HTML, evidence only.

7. **`src/modules/catalog/products/read-model.ts`** — §1c, read-only, no writer
   touched.
   - Extend the local `evidenceVariantSchema` (distinct from
     `create-draft.ts`'s `storedEvidenceSchema` — do not confuse the two) to
     carry `stockByOrigin`: an array of `{ countryCode, cjInventory,
     factoryInventory, totalInventory, verifiedWarehouse }`, mirroring
     `StockByOrigin` in `evidence.ts`.
   - In the `catalogueVariants` map (around line 594, where `providerVariant`
     is already looked up per variant), find the matching entry in
     `productEvidence.data.variants[].stockByOrigin` by
     `vid === providerVariant.externalVariantId`.
   - Replace the hardcoded `warehouseLabel: 'Not recorded'` (lines 857 and
     877) with a label built from the matched origin(s) — e.g. a single
     origin renders as `"CN (verified)"` / `"CN (unverified)"`; no match
     (a snapshot pre-dating this field, or a candidate never re-captured
     since) keeps the existing `'Not recorded'` as an honest fallback, not a
     lie.
   - Multiple origins are a real, expected case (`stockByOrigin` is an array)
     — decide the multi-origin display (comma-joined list, or "N origins"
     with the detail in a tooltip/expansion) as part of this step, not as an
     afterthought.

8. **Verify, don't add** (§1c)
   - No import changes reach `create-draft.ts`, `save-draft.ts`,
     `repository.ts`, or the CJ adapter — this step touches display logic
     only.
   - `products/no-supplier-calls.test.ts` is unaffected by construction, but
     confirm it still passes.
   - A candidate whose stored snapshot pre-dates `stockByOrigin` being kept
     (i.e., before §1a/§1b's `EVIDENCE_SCHEMA_VERSION` bump, or before this
     field existed at all) must degrade to `'Not recorded'`, never to a
     crash or a fabricated origin.

**What ships when:** description lands quietly in
`supplier_snapshots.evidence.descriptionHtml` on the next capture — no visible
change anywhere yet, a deposit not a withdrawal. Dimensions land there too,
but also flow immediately into `product_variants.length_millimeters` /
`width_millimeters` / `height_millimeters` for every *new* draft created after
this ships. Existing drafts keep their nulls unless re-created. **Stock
origin (§1c) is different: it can go out today**, independent of the other
two — every candidate that already has a captured snapshot (which is most of
the catalogue, per [[sals3-session-2026-08-15-part45-variant-axes-design-and-free-change-detection]]'s
count of 12 products) shows a real warehouse label the moment
`read-model.ts` ships, no new capture required.

## 3. The CJ points journey — All Supplier Products → storefront

Corrected against [[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]],
which read CJ's published points table line by line on 2026-08-12. **This
correction matters: earlier in this same session, evidence capture was quoted
at ~30 points per candidate (3 calls × ~10, from an older "observed, roughly"
note in `primitives.ts`). ADR-017 supersedes that — `/product/productComments`
does not appear in CJ's charging table at all, so it is free. Evidence capture
is 20 points per candidate, not 30**, the same correction ADR-017 already owes
to [[cj-candidate-to-sals3-product-draft-implementation-spec]] §26.

| # | Stage | Trigger | CJ endpoint(s) | Cost | Type |
|---|---|---|---|---:|---|
| 1 | Browsing All Supplier Products | `/products` page load/search | `/product/list` | 50 pts/page (≤200 items) | shared |
| 2 | Background discovery ingestion | continuous queue chain, once started | `/product/list` | 50 pts/page (≤200 items) | sunk |
| 3 | Curated lanes (New/Most listed/Trending) | daily sweep, ≤25 pages/lane | `/product/list` | ≤3,750 pts/day (3 lanes × 25 pages × 50) | sunk |
| 4 | Reaching "Ready" | automated screening over feed data | none | 0 | zero |
| 5 | Manual "Fetch/Refresh evidence" | candidate detail drawer button | `/product/query` (10) + `/product/stock/getInventoryByPid` (10) + `/product/productComments` (0) | **20 pts** | optional |
| 6 | "Customize & List" / "Add to Product Catalogue" | draft-creation click | same 3 calls | **20 pts** | guaranteed |
| 7 | Editing the draft | Basic Info → Review & Publish | none | 0 | zero, enforced by test |
| 8 | Publish Product | editor publish action | none | 0 | zero |
| 9 | Storefront page view | sals3-ecommerce PDP | none — reads Sals3's own database | 0 | zero |

**The real, unavoidable cost of one item reaching a published listing: 20
points** (stage 6, documented, paid exactly once). Everything before it is
shared with the rest of the catalogue regardless of this specific item;
everything after it is zero, and stage 7's zero is a static import-graph test
(`no-supplier-calls.test.ts`), not a convention that could quietly rot.

**Avoid double-spending.** Stage 5 and stage 6 call the identical three
endpoints, and there is no freshness check skipping stage 6 because stage 5
just ran. Manually refreshing evidence right before listing costs 20 + 20 = 40
points for the same data. Skip the manual refresh — "Customize & List" fetches
fresh evidence anyway.

### Reference: CJ's documented per-call costs (source: ADR-017, fetched 2026-08-12)

```
50    /product/list, /product/listV2
10    /product/query                              (detail, incl. nested variant inventory)
10    /product/variant/query, /variant/queryByVid
10    /product/stock/getInventoryByPid
10    /product/stock/queryByVid, /queryBySku
10    /product/stock/privateInventory/*
10    /logistic/freightCalculate + variants
10    /webhook/product/subscribe, /unsubscribe
1000  /product/queryProductsByImage                (trap — 20× a list page, unused in Sals3)
0     /product/getCategory
0     /product/globalWarehouseList
0     /product/productComments
0     /product/addToMyProduct, /myProduct/query, /sourcing/*, /queryVideosByProductId
0     /authentication/getAccessToken
```

Daily allowance: 50,000 base points/day (resets 00:00 UTC) + $1 USD = 100 points
from order conversion. Replenishment ≈ total/1440 per minute (≈35/min).

### A larger, separate opportunity — noted, not decided here

ADR-017 flags that `/product/query` may already return per-variant,
per-country inventory nested in its own response — which would make the
second call, `/product/stock/getInventoryByPid`, redundant. If confirmed,
evidence capture drops from 20 to **10 points per candidate**, halving both
stage 5 and stage 6 above. This is explicitly left undecided in ADR-017
("belongs to whoever next works the Vercel-side capture code") and needs its
own verification against a real captured response before anyone removes the
call — not bundled into the fix in §2.

## 4. Open items carried forward

- Backfilling existing catalogue descriptions: manual, from the CJ product
  page, not via a paid API call (§1a).
- `entryCode`, `reviews`, `listedCount`/`isTestProduct`/`sourceStatusRaw`:
  shelved, no destination column, no urgency (§1, "What was ruled out").
- The `/product/stock/getInventoryByPid` removal opportunity (§3): unclaimed,
  needs its own verification pass.
- Unit verification for CJ's variant length/width/height before the mapping
  in §2 step 1 ships.
- Multi-origin display format for §1c (step 7): comma-joined list vs. an
  "N origins" summary with detail on expansion — a copy/UX call, not decided
  here.

## 5. Independent re-verification, 2026-08-15

§3's table was not taken on ADR-017's word alone. Fetched directly from CJ's
live documentation the same day this note was written (not the 2026-08-12
snapshot ADR-017 cites):

- `https://developers.cjdropshipping.com/en/api/api2/standard/points.html`
- `https://developers.cjdropshipping.com/en/api/api2/api/product.html`

Both pages independently confirm, verbatim: the full per-endpoint table in §3
matches exactly; "charges per call to the following endpoints," not per item;
and "endpoints not listed below do not consume points." `product.html`
section 4.1 additionally states directly, for `/product/productComments`,
that "no point cost is listed for it" — a second, independent confirmation
that the third leg of evidence capture is free, on top of its simple absence
from the points table. **No drift found between 2026-08-12 and 2026-08-15.**
The 20-points-per-candidate figure in §3 is confirmed, not merely inherited.

One refinement to record, not a contradiction: the order-conversion points
formula is not a flat `$1 = 100 points`. It is `MAX(last 3 months' transaction
amounts) × 100`, recalculated daily. This changes nothing in §3's per-candidate
costing, only the daily-allowance detail.

**One new, unconfirmed lead surfaced by this check**, worth recording precisely
because it must not be acted on yet. `product.html` states directly that
`/product/query`'s variant objects already carry a nested `inventories` array
with `countryCode`, `totalInventory`, `cjInventory`, `factoryInventory`, and
`verifiedWarehouse` per country — which is exactly the shape ADR-017's
"Recommended follow-up" asked to confirm before dropping the separate
`/product/stock/getInventoryByPid` call (§3). **This is documentation, not a
captured live response**, and this project has already been burned once by a
documentation/runtime mismatch on this exact inventory shape (the
`totalInventoryNum` vs `totalInventory` field-name trap in [[hot]]). Do not
remove the second call on the strength of this alone — ADR-017's own
precondition stands: read one real `supplier_snapshots` row's raw
`/product/query` response first and confirm the nested inventory carries real,
non-null values before touching `cj-adapter.ts`. If confirmed, evidence capture
drops from 20 to 10 points per candidate, halving stages 5 and 6 in §3 — but
that is a separate, future verification pass, not a decision made here.

---
tags:
  [
    sals3,
    sals3-portal,
    cj-dropshipping,
    webhook,
    tax,
    gst,
    checkout,
    payments,
    points,
    working-notes,
  ]
aliases:
  [
    CJ Dropshipping Decision Log 2026-08-13,
    CJ Webhook Tax Checkout Notes,
    PH AU Dropship Expansion Notes,
  ]
created: 2026-08-13
updated: 2026-08-13
status: proposed
authority: working-notes
owner_approved: false
implementation_status: not-started
related:
  - '[[hot]]'
  - '[[agent-operating-contract]]'
  - '[[ADR-003-international-availability-shipping-and-pricing]]'
  - '[[ADR-004-cj-ordering-tracking-and-fulfillment]]'
  - '[[ADR-005-payment-settlement-refunds-and-cod]]'
  - '[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]'
  - '[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]'
  - '[[sals3-cj-dropshipping-integration-plan]]'
---

# CJ Dropshipping integration — decision log (external planning notes, 2026-08-13)

## Provenance and status — read this before citing anything below

> [!WARNING] Not yet reconciled against approved vault decisions
> This note is an **ingested external document** — working notes from a
> planning conversation, compiled 2026-08-13, uploaded by Bogs from
> `E:\Downloads\cj-dropshipping-decisions.md` and stored here verbatim (light
> formatting only). It is **not** an ADR, has **not** been cross-checked
> against this vault's approved decisions, and several of its own claims are
> self-flagged ⚠️ as unverified. Per [[agent-operating-contract]]'s evidence
> hierarchy, a current owner-approved ADR and verified code/data outrank this
> note wherever they conflict.
>
> Known tension points to resolve before treating §5 ("Checkout Architecture
> — Approved Decisions") as binding:
>
> - [[ADR-005-payment-settlement-refunds-and-cod]] currently states COD is
>   disabled/out of phase 1 and that customer payment, gateway settlement,
>   supplier spend, and refunds are separate states — this note's Stripe
>   `PaymentIntent` authorize-then-capture flow is a **specific proposed
>   implementation** of that boundary, not something ADR-005 itself
>   specifies. Stripe as the payment processor is not named in any existing
>   ADR read so far.
> - [[ADR-004-cj-ordering-tracking-and-fulfillment]] already requires CJ
>   wallet balance, retries, an outbox/reconciliation pattern, signed webhook
>   verification, and `messageId` deduplication for the order flow — this
>   note's §5 order-of-operations should be read as a candidate refinement
>   of that ADR's order flow, not a replacement for it.
> - [[ADR-003-international-availability-shipping-and-pricing]] governs
>   destination-market/pricing/tax posture generally; this note's §3 tax
>   findings (AU GST, PH de minimis) are new, specific research that ADR-003
>   does not yet contain and should eventually be folded into or reconciled
>   with it.
> - The "approved" language throughout §5 reflects agreement reached
>   *within the planning conversation that produced this document* — it is
>   not confirmed here to be a named owner (Bogs) decision in this vault's
>   own ADR-approval sense. Treat as proposed until an owner decision is
>   recorded against it explicitly.
>
> This note has not been checked against [[sals3-cj-dropshipping-integration-plan]]
> (an older, superseded CJ auto-import proposal) for overlap or contradiction.

---

**Project:** Sals3 Portal (`sals3-admin-portal` / `sals3-portal`) — PH + AU dropship expansion
**Date compiled:** August 13, 2026
**Status (source document's own framing):** Working notes from a planning conversation. Items marked ⚠️ are unverified and need confirmation before build.

---

## 1. Context

- Business model: pure dropship. Customer orders on the Sals3 storefront; CJ Dropshipping fulfills; Sals3 handles front-end, checkout, and customer service.
- Target markets: **Philippines (PH)** and **Australia (AU)**.
- Business entity: **Australia-registered**.
- Existing codebase: `sals3-portal` — a mature Next.js + TypeScript + Drizzle/Postgres monorepo with an already-built CJ integration layer (see §6). This is **not** a greenfield build.

---

## 2. CJ Webhook Setup

**Endpoint:** `POST https://developers.cjdropshipping.com/api2.0/v1/webhook/set`

Per-topic object structure (not a flat `webhookUrl`/`webhookType` pair):
```json
{
  "stock": {
    "type": "ENABLE",
    "callbackUrls": ["https://your-host/webhooks/cj-stock"]
  }
}
```
- Topics: `product`, `stock`, `order`, `logistics`, `makeup`, `privateOrder`
- `type`: `"ENABLE"` or `"CANCEL"` only
- Header: `CJ-Access-Token`
- Must respond **200 OK within 3 seconds**
- ⚠️ **Auto-close mechanism:** webhook disabled automatically if success rate drops below 80% over 2 consecutive hours — requires manual re-enable
- `localhost`/`127.0.0.1` will not pass validation
- ⚠️ Exact JSON payload shape for the `stock` topic message was not found with a full example in public docs — must be confirmed by inspecting a live payload
- Signature verification: CJ documents HMAC-SHA256 (using stored `openId` as secret) for `MAKEUP` and `PRIVATE_ORDER` topics specifically — confirm whether `STOCK` uses the same scheme (the existing `sals3-portal` webhook route already implements this verification pattern generically)

---

## 3. Tax / Legal Findings

### 3.1 Australia (business is AU-registered)

- Once **GST-registered** (mandatory at AUD 75,000+ annual turnover; optional/voluntary before that), must charge **10% GST on ALL sales to AU customers, regardless of item value.** The AUD 1,000 value-based distinction only applies to *non-resident* overseas sellers — not applicable once the business is an AU-registered supplier.
- ⚠️ **Double-GST risk:** for higher-value orders, AU customs may hold a package pending GST payment at the border even though GST was already collected at checkout, unless proper documentation (invoice showing GST collected, ABN) travels with the shipment. A real seller-reported case of this was found in a forum discussion — treat as a real operational risk, not theoretical.
- No CJ-side "declaration settings" equivalent to the EU IOSS system was found for Australia — this appears to need a manual/custom solution, not an automated CJ field.

### 3.2 Philippines (customers ordering from an AU-registered business)

- Sales from an AU entity to overseas (non-AU) customers, including PH, are generally **GST-free exports** — no AU 10% GST applies to PH-destined orders.
- **PH de minimis threshold: PHP 10,000 (FOB value).** Below this, shipments are exempt from PH customs duty and 12% VAT.
- Above PHP 10,000: **12% VAT + duty (typically 5–15%) + processing fees**, paid by the **consignee (the customer)**, collected by the courier on behalf of the Bureau of Customs — **not** something Sals3 charges at checkout.
- **Consolidation rule:** multiple parcels to the same recipient on the same day may be aggregated toward the threshold.
- If shipped from a **PH-based CJ warehouse** (goods already inside the country), this is not a fresh "import" — it clears as domestic movement, since the bulk stock already cleared customs when it entered the PH warehouse.
- ⚠️ Whether the AU entity needs any PH-side business registration (SEC/DTI) to legally sell to PH consumers remotely was **not resolved** — recommend confirming with a PH legal professional. Comparable cross-border models (Shein, AliExpress) operate without PH-registered entities, but nuances in the PH E-Commerce Act / consumer protection law were not verified.

### 3.3 Checkout implication

- **AU checkout:** price includes 10% GST (once registered), single all-in price shown to customer — no separate "+GST" line needed for display, but the GST component must be stored per-order (e.g. `gst_amount = total / 11`) for BAS filing, since **CJ's own order records do not capture this** — CJ only reflects what Sals3 pays CJ for fulfillment, not what Sals3 charged the end customer.
- **PH checkout:** no GST/VAT added by Sals3 — any import duty is a customer/consignee-side matter handled at customs, not embedded in checkout pricing.

---

## 4. Warehouse Mapping & CJ Points Economics

### 4.1 Points system (confirmed from official docs)

```
Total Daily Points = 50,000 Base Points + Order Conversion
Order Conversion = MAX(last 3 months' CJ transaction amount) × 100
```
- Budget replenishes per-minute (Total Points ÷ 1440)
- ⚠️ **Account suspension risk:** zero CJ transactions for 30 days → API access suspended

### 4.2 Confirmed endpoint costs (full table, verified from `.../api2/standard/points.html`)

| Endpoint | Points |
|---|---|
| `/product/listV2` (batch, up to 100 items/page via `size=100`) | 50 |
| `/product/list` | 50 |
| `/product/query` (single product detail, incl. description) | 10 |
| `/product/variant/query` | 10 |
| `/product/variant/queryByVid` | 10 |
| `/product/stock/queryByVid` | 10 |
| `/product/stock/queryBySku` | 10 |
| `/product/stock/privateInventory/*` (5 sub-endpoints) | 10 each |
| `/storehouseCenterWeb/syncStorehouseVideoRequests` | 10 |
| `/product/stock/getInventoryByPid` | 10 |
| `/logistic/freightCalculate` / `freightCalculateTip` / `partnerFreightCalculate` / `getSupplierLogisticsTemplate` | 10 each |
| `/webhook/product/subscribe` / `unsubscribe` (one-time action, not per-event) | 10 each |
| `/product/queryProductsByImage` | 1,000 |
| `createOrderV2` / `createOrderV3` (incl. `interceptOrderReasons` check) | **0 — not in cost table** |
| `Pay Balance` endpoints | **0 — not in cost table** |
| `Order Delete (DEL)` | **0 — not in cost table** |

Confirmed rule, quoted directly from the docs: *"Each call to the following endpoints will deduct the corresponding number of points. Endpoints not listed below do not consume points."*

Also confirmed from the same page: every API response includes a `pointsInfo` object (`usedToday`, `remaining`, `total`) — useful for live budget tracking in the app rather than estimating.

> [!NOTE] Cross-check against [[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]
> ADR-017's own verified points table (also dated 2026-08-12) agrees with every
> overlapping figure here (`/product/list`/`listV2` 50, `/product/query` 10,
> `/product/stock/getInventoryByPid` 10, webhook subscribe/unsubscribe 10,
> `/product/queryProductsByImage` 1000). This note adds endpoints ADR-017 did
> not cover (`privateInventory/*`, `syncStorehouseVideoRequests`, and the
> order/payment endpoints confirmed at 0 points). No discrepancy found between
> the two on any endpoint both documents list — worth re-verifying together if
> either is updated later, since CJ has revised this table before.

### 4.3 Genuinely free path for description + variants: the PRODUCT/VARIANT webhook

Confirmed from `.../api/start/webhook.html`: receiving webhook pushes costs nothing, because incoming pushes are not calls *to* a CJ endpoint (CJ calls *you*) — they simply don't appear in the endpoint-cost table at all. More importantly, the payloads carry real data, not just change signals:

**PRODUCT message** (`type: "PRODUCT"`) — fires on product create/update, and its `params` object includes `productDescription` directly:
```json
{
  "type": "PRODUCT",
  "messageType": "UPDATE",
  "params": {
    "pid": "1424608189734850560",
    "productDescription": "xxxxxx",
    "productName": null,
    "fields": ["productDescription"]
  }
}
```
Only the field(s) listed in `fields` carry a real value in an `UPDATE` event (others are null because they didn't change) — but on an `INSERT` event (new product), the reasonable expectation is the full field set is populated since there's no prior state to diff against.

**VARIANT message** (`type: "VARIANT"`) — same pattern, with `variantSku`, `variantKey`, `variantSellPrice`, `variantWeight`, etc.

**Practical implication:** subscribing to the `product` webhook topic (10 points, one-time) and relying on `INSERT`/`UPDATE` events going forward gets description + variant data at **zero ongoing points cost** for anything created or changed after subscribing. Products that existed before subscribing and haven't changed since would still need one paid `/product/query` + `/product/variant/query` call (10+10 pts) to backfill — there is no free way to pull the *existing* catalog's full detail in bulk, only to receive it going forward via webhook.

### 4.4 Why batch beats per-SKU polling

- Per-SKU polling: 5,000 products × 10 pts = **50,000 points** (entire daily budget in one pass)
- Batch via `listV2`: 5,000 products ÷ 100/page × 50 pts = **2,500 points** (**20× more efficient per item**)

### 4.5 Architecture decision (proposed, in this planning conversation)

1. **Batch sync** (`/product/listV2`, `countryCode` filter, `size=100`) — scheduled job, seeds/refreshes the local DB. `countryCode` filter narrows results to products with inventory in the target market up front.
2. **Webhook** (`stock` topic) — keeps data fresh between batch runs at near-zero ongoing points cost (subscribe is a one-time 10-point cost per product, not per event).
3. Product-level fields returned by `listV2`: `warehouseInventoryNum`, `totalVerifiedInventory`, `totalUnVerifiedInventory`, `verifiedWarehouse`, plus `inventoryInfo` and `variantInventories` (⚠️ both JSON-string encoded — exact parsed structure not confirmed from docs, needs a live test call).
4. Storefront browsing already has a 5-minute in-memory TTL cache in `src/lib/storefront/cj-feed.ts` (`fetchStorefrontCjProducts`) — this already minimizes redundant live calls for product display and needs no change.

   > [!WARNING] Not yet verified against the current codebase
   > This path (`src/lib/storefront/cj-feed.ts`, function `fetchStorefrontCjProducts`)
   > was named in the source planning conversation but has not been confirmed
   > against the current `sals3-portal` `develop` branch by this agent. Per
   > [[agent-operating-contract]]'s evidence hierarchy ("Read the real repo
   > before assuming its shape"), verify this path exists and still matches
   > this description before relying on it — [[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]'s
   > lean-intake work has changed several storefront/catalog data paths since
   > this document's stated reference points were last verified.

### 4.6 Catalog size reality check

- `listV2`'s `totalRecords` field has a **documented maximum of 6,000** matching products per query — a "list millions of items" goal is not achievable through this endpoint regardless of points budget.

  > [!NOTE] Possible tension with a verified vault fact
  > [[hot]] records, verified 2026-08-06: *"The documented maximum `totalRecords=6000` is a Product List V2 response rule. The portal's discovery adapter uses legacy `/api2.0/v1/product/list`; no primary source currently authorizes applying the V2 cap to that operation."* This note's §4.6 applies the 6,000 cap specifically to `listV2` (consistent with `hot.md`), not to the legacy `/product/list` the current discovery adapter actually uses — no contradiction found, but worth keeping straight: the two endpoints are documented separately and the cap is V2-specific.
- CJ's total platform catalog is roughly ~400,000 products, not "millions."
- Recommendation: curate a focused catalog (hundreds to low-thousands of SKUs) rather than attempting maximal breadth — better inventory accuracy, quality control, and customer trust at the current team size.

---

## 5. Checkout Architecture — Proposed Decisions (source document's own label: "Approved")

> [!WARNING] Not confirmed as an owner-approved ADR decision
> See "Provenance and status" at the top of this note. Treat everything in
> this section as a candidate design to reconcile against
> [[ADR-004-cj-ordering-tracking-and-fulfillment]] and
> [[ADR-005-payment-settlement-refunds-and-cod]], not as settled.

### 5.1 Order-of-operations (source document: "approved")

```
1. Authorize Stripe PaymentIntent (capture_method: manual — hold, no charge yet)
2. createOrder(payType=3) — create order only, no CJ payment, 0 points
3. Check response for interceptOrderReasons:
     - Present → cancel the Stripe PaymentIntent. Nothing charged, nothing
       spent on CJ balance.
     - Absent (orderStatus = CREATED) → CAPTURE the Stripe PaymentIntent now.
4. Only after the Stripe capture is confirmed successful → call the CJ
   Pay Balance endpoint to actually fund/advance the order.
5. Order lifecycle then proceeds: UNPAID → PENDING/PROCESSING → SHIPPED
```

**Why this order:** CJ balance (real money) must never be spent before the Stripe capture is confirmed. If `payType=2` (pay immediately from balance) were used at order-creation time, a Stripe capture failure after the fact would mean CJ balance was already spent with no corresponding customer payment — a direct margin leak. Sequencing the Stripe capture *before* the CJ balance payment closes that gap. Zero points-cost trade-off either way, since none of the payment-related CJ endpoints carry a listed points cost.

### 5.2 Confirmation signal (source document: "approved")

- The go/no-go signal is `interceptOrderReasons` on the **order creation** response — not the CJ order reaching `PROCESSING` status.
- Reasoning: CJ will not move an order to `PROCESSING` until it's paid, and Sals3 cannot pay CJ until the Stripe capture is confirmed — waiting for `PROCESSING` before capturing Stripe creates a circular dependency that can never resolve.
- Official CJ order status enum: `CREATED, IN_CART, UNPAID, PENDING, PROCESSING, UNSHIPPED, SHIPPED, DELIVERED, CANCELLED, OTHER` (`PENDING`/`PROCESSING` are sub-statuses of `UNSHIPPED`).

### 5.3 Cleanup policy (source document: "approved")

- Every checkout attempt — completed or abandoned — creates a real `CREATED`/unpaid order record on the CJ side.
- Needs a scheduled job to delete stale `CREATED`/unpaid orders (via the `Order Delete (DEL)` endpoint, 0 points cost) after a defined window (e.g. 30–60 minutes of inactivity) to keep the CJ dashboard clean.

### 5.4 Stock check placement (source document: "approved")

- No separate "pre-check stock" API call before checkout. The order-creation call (step 2 above) **is** the stock check — folding verification into a call that has to happen anyway, at zero additional points cost.
- Rationale reinforced by the existing codebase's own documented design principle (ADR-013, `product-catalog.ts`): a stock state must never be inferred from a stored/cached number alone — it should reflect a fresh, authoritative check at the point of commitment.

---

## 6. Existing Codebase Notes (`sals3-portal`, `develop` branch, as of this document's compilation)

Found during the source planning conversation — for orientation, not exhaustive. **Not independently re-verified by this agent at ingestion time** — confirm paths still match before relying on them, per the same evidence-hierarchy caution as §4.5 above.

| Path | Relevance |
|---|---|
| `src/lib/cj/stock-evidence.ts` | Pure function deriving per-country stock evidence labels (`CJ_WAREHOUSE_STOCK`, `FACTORY_BACKED_STOCK`, `MIXED_STOCK`, `ZERO_STOCK`, `UNKNOWN_STOCK`) from `StockObservation[]` (already has `countryCode`, `cjInventory`, `factoryInventory`, `totalInventory`) |
| `src/modules/catalog/discovery/budget-repository.ts` | **Already-built CJ points/request budget tracker**, DB-backed, atomic slot claiming across concurrent workers (`supplierRequestBudgets` table, `CjPointsInfo` type) |
| `src/modules/catalog/discovery/curated-lanes.ts` | Owner-approved curated CJ discovery lanes (ranked subsets of the catalog) — explicitly documented as adding signals only, never a coverage/stock/profitability claim |
| `src/lib/db/schema/seller-market-profile.ts` | Stores which destination markets a seller account is authorized for (ADR-015) — deliberately does **not** yet store operational/warehouse detail |
| `src/app/api/webhooks/cj/route.ts` | Existing webhook receiver: raw-byte size cap, HMAC signature verification, transactional inbox/outbox pattern, 200 OK on both new and duplicate events |
| `src/lib/storefront/cj-feed.ts` | Storefront-facing live CJ fetch with a 5-minute in-memory TTL cache, in-flight request de-duplication |
| `src/lib/db/schema/product-catalog.ts` | Has `lastObservedInventory` (cached) but explicitly notes stock state must not be inferred from this alone (ADR-013 §1a) |

**Open item (from the source document):** where exactly the checkout/order-placement action file lives, and whether an existing separate stock-pre-check call should be removed, was not yet located — next step if continuing this thread. As of this vault's own [[hot]] note, `/checkout` does not exist yet in `sals3-ecommerce`, and no checkout/payment/order-placement backend exists in `sals3-portal` either — so this "open item" may currently have no answer at all rather than an unfound one; confirm which before continuing.

---

## 7. Open / Unverified Items (⚠️ flagged throughout, from the source document)

1. Exact JSON payload shape of the CJ `stock` webhook message
2. Whether `STOCK` topic webhooks use the same HMAC signature scheme as `MAKEUP`/`PRIVATE_ORDER`
3. Whether AU GST double-charge-at-customs risk has a documented CJ-side mitigation (shipment documentation/invoice attachment)
4. Whether the AU-registered entity needs PH-side (SEC/DTI) registration to sell to PH consumers
5. Exact parsed structure of `inventoryInfo` / `variantInventories` JSON fields from `listV2`
6. Location of the existing (or to-be-built) checkout/order-placement action file in the repo — per §6 above, this may not exist yet at all

## 8. Suggested next steps (added at ingestion, not in the source document)

1. Reconcile §5's proposed checkout order-of-operations against
   [[ADR-004-cj-ordering-tracking-and-fulfillment]] and
   [[ADR-005-payment-settlement-refunds-and-cod]] with the owner, and record
   the outcome as a real ADR (new or amending) if adopted — this note alone
   does not constitute that approval.
2. Verify the §6 file paths still exist and still do what's described, against
   the current `develop` branch, before designing further against them.
3. Resolve the PH SEC/DTI registration question (item 4) with a PH legal
   professional before building anything that assumes the current posture is
   sufficient.
4. Confirm the `stock` webhook payload shape and its HMAC scheme (items 1–2)
   against a real captured payload rather than public docs alone, consistent
   with this vault's general preference for verified live evidence over
   documentation-only claims.

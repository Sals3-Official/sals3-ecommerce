---
tags: [sals3, adr, orders, cancellation, cj, stripe, refunds, fulfillment, customer-operations]
aliases:
  - ADR-020
  - Order Cancellation SOP v4.1
  - Cancellation Hold in CJ Imported
  - CJ Dispute Cancellation Path
created: 2026-09-10
updated: 2026-09-10
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: built-on-sit-not-promoted
related:
  - "[[agent-operating-contract]]"
  - "[[ADR-018-phase-1-returns-refunds-and-no-warehouse-cj-recovery]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[hot]]"
  - "[[index]]"
---

# ADR-020 — Order cancellation: the hold lives in CJ's Imported tab, and paid orders cancel through a CJ dispute

## Status

`approved` — owner decision 2026-09-10 (Bogs), taken over the flow chart
artifact *Sals3 Order & Cancellation Flow* after the SOP v4.1 deck
(`docs/Raw/sals3_cancellation_sop_2026-09-09_v4.pptx`) was approved the same
day. Built and deployed to **SIT only** (portal, sals3.com, sals3.com.au,
sals3.com.fj). Not promoted to UAT or main.

## Context

The Cancellation SOP v3 (2026-09-03) said a buyer could cancel only while the
CJ order was `CREATED` or `IN_CART`, and declined everything from `UNPAID`
onward. The code did not give that window any length: the fulfilment worker
runs `createOrderV3 → addCart → addCartConfirm → saveGenerateParentOrder →
payBalanceV2` in one pass a few seconds after Stripe confirms payment, so a
buyer who picked the wrong size and cancelled thirty seconds later was already
refused. Stripe captures at checkout (the Checkout Session sets no
`capture_method`), so every cancellation is a refund, never a void.

CJ's own rules, read on 2026-09-10, contradict the v3 assumption that a paid
order is uncancellable:

- Refund, Resend and Returns Policy §5: "For orders cancellation, CJ offers a
  full refund before products are processed by warehouses."
- Help centre, *How to Open/Close a Dispute* (edited 2026-09-08): disputes are
  accepted at Pending, Processing, Dispatched and Completed, and "for orders
  in the status of Pending or Processing, Extra evidence is not required."
- The dispute API (`disputeProducts → disputeConfirmInfo → create →
  getDisputeDetail`) works for orders created through the API, which all
  Sals3 orders are. `deleteOrder` works only at `CREATED` / `IN_CART`.
- This account's own history: five "Unfulfilled Order Cancellation" disputes,
  five refunded in full, product plus shipping (e.g. $74.80 = $38.72 + $36.08).

## Decision

### 1. The stage ladder decides every cancellation

| Stage | Meaning | Outcome |
| --- | --- | --- |
| `HOLD_WINDOW` | Paid; worker has not created the CJ order yet | Cancel now, refund now |
| `CJ_CREATED` | CJ order `CREATED` (Imported tab), hold running | Cancel now, `deleteOrder` at CJ, refund now |
| `CJ_UNPAID` | Confirmed at CJ, wallet short (`AWAITING_SUPPLIER_FUNDS`) | Cancel now, refund now; CJ order cancelled in the dashboard |
| `CJ_PENDING` | Paid, CJ not started | Open CJ dispute, refund now |
| `CJ_PROCESSING` | Paid, CJ preparing | Open CJ dispute, refund when CJ answers REFUND |
| `LATE_SUPPLY` | Paid, unshipped ≥ 7 days after payment | Cancel now, refund now; recover via CJ dispute |
| `SHIPPED` / `DELIVERED` | Left the warehouse / delivered | Refused; return on arrival or Item Problem SOP |

The buyer is refunded before CJ is chased wherever the money is Sals3's to
refund; only `CJ_PROCESSING` waits for CJ.

### 2. The hold lives in CJ's Imported tab (this ADR's decision)

Two options were drawn side by side and the owner chose **B**:

- **A** — hold the FULFILL_ORDER message in the Sals3 queue for 60 minutes and
  make the first CJ call afterwards. Cancel in the hour = Stripe refund only.
- **B** — run `createOrderV3` at once so the order is visible in CJ's Imported
  tab as `CREATED`, then hold the paying half (confirm → parent order → pay)
  for 60 minutes. Cancel in the hour = `deleteOrder` at CJ + Stripe refund.

B was chosen so every incoming order is visible in the CJ dashboard from the
moment it is paid, and so the hold does not rest on queue delivery alone.
Accepted costs: one more CJ API call per order and per hold-window
cancellation (Agent Operating Contract §9 budget), and a stray `CREATED`
order at CJ if a delete fails, which the cancellation record notes for support.

Mechanics: `FULFILL_ORDER` carries a `phase`. `CREATE` runs `createOrderV3`
only and queues `COMPLETE` with `delaySeconds = SALS3_CANCELLATION_HOLD_MINUTES
× 60` (default 60). `COMPLETE` runs the rest. A message without a phase runs
both halves, which is what every message queued before the field existed asked
for. The worker re-reads the parcel state before `createOrderV3` and before the
paying half.

### 3. Record, refund and settle

- `order_cancellations` (drizzle 0039, break-glass route
  `POST /api/internal/cancellations/migrate-cancellations`): one row per
  request; requester, reason, stage, status (`REQUESTED | APPROVED | DECLINED
  | CONVERTED_TO_RETURN`), refund status (`NOT_DUE | PENDING | ISSUED |
  FAILED`), Stripe and CJ references, decider, note. One open request per
  order via a partial unique index.
- Parcels move to `CANCEL_REQUESTED` / `CANCELLED` on
  `fulfillment_groups.parcel_state`; `sals3_orders.payment_status` → `REFUNDED`
  on Stripe confirmation. The status sync leaves `CANCEL_REQUESTED` alone.
- Refunds go through Stripe's REST API from the portal, full amount, with the
  cancellation id as idempotency key. Needs `STRIPE_SECRET_KEY` on the portal;
  unset, refunds stay `PENDING` and the settle run retries.
- `GET /api/cron/cancellations-settle` (:15/:45) learns CJ's `finallyDeal` on
  open disputes and retries pending refunds.

### 4. Surfaces

- Storefront: `POST /api/storefront/orders/{n}/cancel`; optional
  `cancellation` block on buyer order payloads; `/orders/[orderNumber]/cancel`
  with a fixed reason list; the cancellation promise on the delivery step and
  the receipt, worded from `SALS3_CANCELLATION_HOLD_MINUTES`.
- Portal: Cancellation panel on the parcel page (`order:fulfill`), real
  Refunds tab on the customer profile.

## Consequences

- SOP v3's "declined from UNPAID onward" is retired. The SOP v4.1 deck is the
  operations text; this ADR is the engineering decision.
- A hold-window cancellation costs a Stripe fee (not returned on refund) and
  one CJ `deleteOrder`. Manual capture was considered and deferred: Stripe
  recommends it only at high refund volume, and online card authorisations
  expire in 7 days.
- Late supply at day 7 is a proposal to confirm against CJ's own timeliness
  data; the CJ promise is tracking within 24–48 h of payment.
- Whole-order cancellation only. No buyer email exists yet; the order page is
  the notification.

## Evidence and sources

- Stripe: Fulfill orders (`checkout.session.completed` fires when paid);
  Refund and cancel payments (fees not returned, original method only, 5–10
  business days, early refunds appear as reversals, manual capture
  recommended only at volume); Place a hold on a payment method (7-day
  online card authorisation).
- Vercel Queues: delayed delivery up to the retention period; idempotency keys.
- CJ: help centre articles 170 (six order statuses), 172 (open a dispute),
  1428274659970912256 (evidence required), 37 (Imported tab meaning); policy
  article 120 §5; Shopping API 1.8 `deleteOrder`; Dispute API §7.
- Sals3 CJ account via API on 2026-09-10: `getDisputeList` /
  `getDisputeDetail`, five of five cancellation disputes refunded in full.
- Code: `sals3-portal` `src/modules/cancellations/*`,
  `src/modules/orders/fulfillment-worker.ts`, `src/modules/checkout/orders.ts`;
  `sals3-ecommerce` `src/lib/orders/from-api.ts`,
  `src/app/orders/[orderNumber]/cancel/*`.
- Pull requests (all merged to `develop`, SIT only): sals3-portal #217 and
  the hold-at-CJ follow-up; sals3-ecommerce #39; sals3.com.au #36;
  sals3.com.fj #44.

## Open items

- Set `STRIPE_SECRET_KEY` on the SIT portal (AJ holds the access) so SIT
  refunds complete.
- First SIT cancellation on a CJ-paid sandbox order proves the dispute
  `create` call accepts `isSandbox=1`; the settle run retries if it refuses.
- The Aug 28 order left `CREATED` in CJ's Imported tab (`S3-20260828-EF28C4D429`)
  needs a decision: delete the stray order or cancel and refund the buyer.
- Promotion to UAT and main is a separate owner decision under ADR-019.

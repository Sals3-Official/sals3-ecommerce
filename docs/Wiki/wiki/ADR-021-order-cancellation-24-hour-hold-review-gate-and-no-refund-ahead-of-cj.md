---
tags: [sals3, adr, orders, cancellation, cj, stripe, refunds, fulfillment, customer-operations]
aliases:
  - ADR-021
  - Order Cancellation SOP v4.2
  - Order Cancellation SOP v5 deck
  - 24-Hour Cancellation Hold
  - Cancellation Review Gate
created: 2026-09-10
updated: 2026-09-10
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: built-on-sit-not-promoted
supersedes: "[[ADR-020-order-cancellation-hold-in-cj-imported-and-dispute-path]] §1 ladder and §3 refund order"
related:
  - "[[ADR-020-order-cancellation-hold-in-cj-imported-and-dispute-path]]"
  - "[[ADR-018-phase-1-returns-refunds-and-no-warehouse-cj-recovery]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[agent-operating-contract]]"
  - "[[hot]]"
  - "[[index]]"
---

# ADR-021 — Order cancellation: a 24-hour hold, a review gate at CJ Pending, and no refund ahead of CJ

## Status

`approved` — owner decision 2026-09-10 (Bogs), taken in conversation after
the first two cancellations ran end to end on SIT under ADR-020. Built and
deployed to **SIT only** the same day (sals3-portal, sals3.com, sals3.com.fj,
sals3.com.au). Not promoted to UAT or main. The operations text is the SOP v5
deck, `docs/Raw/sals3_cancellation_sop_2026-09-10_v5.pptx`, which carries the
same rules under the name "v4.2" (the rules) / "v5" (the deck).

ADR-020 stays in force for everything it decided that this ADR does not name:
the hold lives in CJ's Imported tab (`FULFILL_ORDER` phases `CREATE` and
`COMPLETE`), the `order_cancellations` record, Stripe REST refunds, the
`deleteOrder` path for a `CREATED` CJ order, the dispute mechanics, and the
settle cron.

## Context

ADR-020 (same morning) refunded the buyer **before** CJ answered whenever the
order was paid but CJ still reported `PENDING`, on the strength of this
account's five-for-five history of "Unfulfilled Order Cancellation" disputes
being refunded in full. The first SIT run exposed the hole:

- Order `S3-20260909-642A2BAFF2` was cancelled at `CJ_PENDING`. The portal
  opened dispute `SH2609092134331295100` and refunded Stripe
  `re_3UDspERoCZXgle3r1A5DMWTf` at once. Correct under ADR-020.
- `settle.ts` reads CJ's `finallyDeal` only for `REQUESTED` rows. An
  instant-approved row is never re-read, so if CJ had answered `REJECT`, the
  parcel would ship, the buyer would keep both the item and the refund, and the
  portal would never notice.
- The owner's questions in that session — *will CJ approve? what if not? does
  a pending dispute block shipping?* — had no good answer for the "what if
  not" case beyond "Sals3 absorbs it silently".

Two facts from the same session shaped the fix. First, CJ's `Pending-Dispute
Opened` status does hold the order while the dispute is decided, so asking CJ
first costs the buyer nothing but a wait. Second, the hold in Imported costs
Sals3 nothing at all — the CJ order is unpaid — so it can be long.

## Decision

### 1. The hold is 24 hours

`SALS3_CANCELLATION_HOLD_MINUTES` defaults to **1440**. On SIT (read from
`CLOUDFLARE_R2_KEY_PREFIX=sit`) it defaults to **7** so a tester reaches the
paying half. Every paid order is `CREATED` at CJ within seconds (Imported tab)
and paid 24 hours later. During the hold the buyer cancels self-serve for an
instant Stripe refund and the portal deletes the CJ order. Accepted cost:
delivery moves by a day; CJ generates tracking 24–48 h after payment, so the
buyer sees tracking two to three days after ordering.

### 2. Once CJ is paid, nobody is refunded before CJ refunds Sals3

| Stage | Buyer | Sals3 staff | Money |
| --- | --- | --- | --- |
| `HOLD_WINDOW`, `CJ_CREATED`, `CJ_UNPAID` (CJ not paid) | Cancel now | Cancel now | Instant Stripe refund |
| `CJ_PENDING`, `LATE_SUPPLY` (CJ paid, not started / late) | **Request** only | "Ask CJ to cancel" or "Decline" | Refund only on CJ `REFUND` |
| `CJ_PROCESSING` (packing) | **Refused** (`processing`) | May still ask CJ (a request, not a refund) | Refund only on CJ `REFUND` |
| `SHIPPED`, `DELIVERED` | Refused | Refused | Return path / Item Problem SOP |

In code: `stage.ts` `modeOf` returns `INSTANT` for the three unpaid stages,
`REQUEST` for `CJ_PENDING` and `LATE_SUPPLY`, `NONE` otherwise. A Sals3-
initiated cancellation of a paid order is recorded as `REQUESTED` with
`review_allowed_at` set at once (the person is the review) and the dispute
opens immediately; it is refunded only on CJ's `REFUND`. The v4.1 rule "refund
first, chase CJ afterwards" is retired for paid orders.

### 3. A buyer's request waits for a person, then for CJ

- The request is recorded (`status = REQUESTED`, `review_allowed_at = null`),
  the parcels move to `CANCEL_REQUESTED`, and **no dispute is opened yet**.
- Operations are notified: Resend email to `SALS3_OPS_NOTIFY_EMAIL` and a Slack
  incoming webhook at `SALS3_OPS_SLACK_WEBHOOK_URL`; both optional, neither
  blocks the buyer's answer (`src/modules/cancellations/notify.ts`).
- The Orders page gains a **Cancellation requests** lane (`CANCEL_REQUESTED`
  parcels) with a banner on every other lane. The parcel page's Cancellation
  panel shows the request with two buttons, behind `order:fulfill` and the
  seller scope:
  - **Ask CJ to cancel** — sets `review_allowed_at`, records the decider, and
    runs the settle step for that row at once so the dispute opens now.
  - **Decline** — reason required; the request becomes `DECLINED`, the parcels
    return to `FULFILLING`, nothing is refunded, and the buyer reads the
    decline on the order page.
- Safety net: if nobody decides within `SALS3_CANCELLATION_REVIEW_HOURS`
  (default **12**), the settle run sets `review_allowed_at` itself and asks
  CJ. A request must never age into Processing because a person was away. `0`
  asks CJ on the next run.
- CJ `REFUND` → `APPROVED`, parcels `CANCELLED`, Stripe refund. CJ `REJECT` or
  `REISSUE` → `DECLINED`, parcels back to the status sync, no refund.

### 4. Record

Four nullable columns on `order_cancellations` (drizzle
`0040_order_cancellation_review`): `review_allowed_at`,
`review_decided_by_user_id`, `review_decided_by_name`, `review_decided_at`.
The break-glass route `POST /api/internal/cancellations/migrate-cancellations`
applies them idempotently (`ADD COLUMN IF NOT EXISTS`) and records 0040 in the
drizzle ledger alongside 0039. A page view reads a paid parcel as `CJ_PENDING`
(no CJ call happens on a page view) so the buyer sees "Request cancellation";
the cancel POST reads CJ live and refuses `processing` (409) once packing has
started.

### 5. Surfaces

- Storefront (three repositories): the checkout and receipt promise reads
  "within 24 hours of paying", then says the request rule and that packing
  closes it; the order page's request sentences say nothing is refunded until
  the warehouse confirms; a declined request and the `processing` refusal each
  have a sentence.
- Portal: lane, banner, review card, `settleOneCancellation`, README section
  "Order cancellations", `.env.example` for the three new variables.

## Consequences

- Sals3 never carries a rejected CJ dispute: the money follows CJ's answer.
- A buyer who asks after the hold waits up to 12 hours for a person plus CJ's
  decision time (hours to a day on this account) before a refund; the copy says
  so and promises nothing else.
- Staff have an SLA of 12 hours per request; after that the choice to decline
  is gone.
- Delivery is a day slower for every order. This is the price of a hold that
  costs no wallet money; the owner accepted it explicitly.
- ADR-020 §1 (ladder) and §3 (refund order) are superseded by §2 and §3 above.
  The late-supply day count stays at 7 (`SALS3_LATE_SUPPLY_DAYS`); the owner did
  not change it, and it is now a request rather than an instant refund.

## Evidence

- SIT run 2026-09-10 (UTC): `S3-20260909-642A2BAFF2` — CJ `CREATED` 21:14:44,
  paid 21:19:53 after the 5-minute SIT hold, buyer cancel 21:34 at
  `CJ_PENDING` → dispute `SH2609092134331295100` (CJ status
  "Pending-Dispute Opened"), Stripe `re_3UDspERoCZXgle3r1A5DMWTf`.
  `S3-20260909-55EF751D1F` — `CREATED` 22:42:37, buyer cancel 22:43 inside the
  hold → CJ order `TRASH`, Stripe `re_3UDuCGRoCZXgle3r1lPdjAoo`, paying half
  skipped at 22:47 (order stayed unpaid).
- The gap: `settle.ts` (before this ADR) loaded only `status = 'REQUESTED'`
  rows for dispute outcomes.
- CJ: help centre *How to Open/Close a Dispute* — opening a dispute pauses
  order processing; disputes at Pending/Processing need no evidence. Account
  history: five of five "Unfulfilled Order Cancellation" disputes refunded in
  full.
- Pull requests (all `develop`, SIT only): sals3-portal `feat/cancellation-
  staff-gate` (merged 2026-09-10, develop `eed1786`); sals3-ecommerce,
  sals3.com.fj, sals3.com.au `feat/cancellation-staff-gate`.

## Open items

- Run the migrate route on SIT after the portal deploy so the 0040 columns
  exist (`reviewMigrationRecord.inserted` in the response).
- Set `SALS3_OPS_NOTIFY_EMAIL` and/or `SALS3_OPS_SLACK_WEBHOOK_URL` on the SIT
  portal; until then requests are visible only in the lane.
- The three review POSTs in the storefronts' `reviews.ts` still lack the
  portal protection bypass header (found the same day; not part of this ADR).
- Promotion to UAT and main is a separate owner decision under ADR-019.

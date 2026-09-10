---
tags:
  [
    session-record,
    sals3,
    sals3-portal,
    storefront,
    orders,
    cancellation,
    cj,
    stripe,
    refunds,
    queue,
  ]
aliases:
  [
    "Part 164",
    "A buyer can cancel, and the hold moved into CJ's Imported tab",
    "Order Cancellation SOP v4.1",
  ]
created: 2026-09-10
updated: 2026-09-10
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[pending-register]]"
  - "[[sals3-skills]]"
  - "[[ADR-020-order-cancellation-hold-in-cj-imported-and-dispute-path]]"
  - "[[ADR-021-order-cancellation-24-hour-hold-review-gate-and-no-refund-ahead-of-cj]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-018-phase-1-returns-refunds-and-no-warehouse-cj-recovery]]"
  - "[[sals3-session-2026-09-09-part163-customers-replaces-inventory-in-the-seller-center|part 163]]"
  - "[[sals3-session-2026-09-10-part167-sop-v42-and-the-morning-cj-quoted-nothing|part 167]]"
---

# Part 164 — A buyer can cancel, and the hold moved into CJ's Imported tab

> [!IMPORTANT] What shipped, in one line
> **Order Cancellation SOP v4.1** — a buyer can cancel their own order from the
> storefront, the **portal decides the outcome** from where the order actually
> stands at CJ, and the hold that makes cancellation possible was moved on the
> same day out of the Sals3 queue and into **CJ's Imported tab**, so the order
> is visible at the supplier during the window rather than invisible until it
> expires.

> [!NOTE] Provenance
> Reconstructed on **2026-09-10** from the merged pull requests:
> `sals3-portal` **#217** (v4.1) and **#218** (ADR-020, the hold relocation);
> `sals3-ecommerce` **#39**, **#50**; `sals3.com.fj` **#44**, **#55**;
> `sals3.com.au` **#36**, **#49**. Eight merged pull requests across four
> repositories on 2026-09-09, none of which had a vault note. The decisions are
> in [[ADR-020-order-cancellation-hold-in-cj-imported-and-dispute-path]]; this
> note is the build.

## 1. The problem a cancellation button actually poses

Sals3 has no warehouse. The instant a paid order is confirmed, the fulfilment
worker creates it at CJdropshipping and pays for it out of the CJ wallet. From
that moment a "cancel" is not a Sals3 decision at all — **it is a request to a
supplier who may already be picking the item.**

So a cancel button is not a button. It is a **ladder**, and every rung has a
different answer about the money.

## 2. The stage ladder

`src/modules/cancellations/stage.ts` is the whole product decision in one file.
Given the parcel's state and a live read of the CJ order, it returns what the
buyer may do and what happens to the money:

| Where the order is | Buyer | Money |
| --- | --- | --- |
| **Inside the hold window** | Cancel outright | CJ order deleted; **instant Stripe refund** |
| **CJ created, unpaid** | Cancel outright | `deleteOrder` at CJ; refund |
| **CJ `PENDING`** | Cancel | Refund |
| **Late supply** | Cancel | Supplier cancel and refund at once |
| **CJ `PROCESSING`** | Opens a **CJ dispute**, then waits | Refund follows CJ's answer |
| **Shipped / delivered** | Refused | Return on arrival (ADR-018) |

The two facts worth holding onto:

- **The stage is read live, per request.** One `getOrderDetail` against CJ for a
  paid order, every time. A cached status is a status that has already changed.
- **Refusal is a first-class outcome.** "Shipped" is not an error path; it is a
  sentence the buyer reads with the returns route beside it.

## 3. What talking to CJ actually involves

Cancelling a *paid* CJ order is not an endpoint. It is a **dispute**:

```
disputeProducts  →  disputeConfirmInfo  →  create
```

with `reason = "Unfulfilled Order Cancellation"`, refund **to the CJ wallet**
(not to a card — the wallet is what Sals3 paid from), and
`businessDisputeId` set to the Sals3 cancellation id, which is what makes CJ's
eventual answer matchable back to a row.

An **unpaid** order is different and much simpler: `deleteOrder` for `CREATED`
and `IN_CART`. Which is exactly why §4 matters so much.

## 4. The hold moved — and this is the interesting decision

### 4.1 How v4.1 did it (#217)

`acceptCheckoutOrder` queued `FULFILL_ORDER` with
`delaySeconds = SALS3_CANCELLATION_HOLD_MINUTES × 60` (default 60). The worker
re-read the parcel state before its first CJ call and again before
`PAY_BALANCE_V2`.

Correct, and it has one bad property: **during the entire hold window the order
does not exist at CJ.** Nobody at the supplier can see it. If Sals3's queue
loses the message, the order is silently never placed — and the buyer, who has
paid, has no signal at all.

### 4.2 What the owner chose instead (#218, ADR-020 Option B)

**The hold lives in CJ's Imported tab.**

`FULFILL_ORDER` gained an optional `phase`:

- **`CREATE`** runs `createOrderV3` **immediately**. The order is visible at CJ
  as `CREATED` — it sits in the Imported tab, unpaid. Then it queues
  **`COMPLETE`** with the hold as its delay.
- **`COMPLETE`** runs confirm → parent order → **pay**.
- **No phase** means both halves, which is how messages queued *before* this
  field was added keep working.

A cancel inside the window now deletes a **real CJ order that a human can see**,
through the already-existing `CJ_CREATED` path, and the paying half simply
skips when it wakes to find the parcel cancelled.

> [!IMPORTANT] The general lesson
> A delay that hides work is worse than a delay that shows it. Splitting the job
> into **create-now / pay-later** made the waiting state *observable at the
> supplier* without changing what the buyer is promised. See skill 110.

The worker re-reads parcel state **before `createOrderV3` and again before the
paying half** — two checks, because two things can now happen in the gap.

### 4.3 Backward compatibility, stated plainly

The optional `phase` is the compatibility mechanism. A message already in the
queue carries no `phase`, and no-phase means *do both halves*, which is exactly
v4.1's behaviour. Nothing had to be drained.

## 5. The record, and where it can be repaired from

`order_cancellations` — `drizzle/0039_order_cancellations.sql` — with:

- a **partial unique index** guaranteeing **one open request per order**;
- parcels moving to `CANCEL_REQUESTED` → `CANCELLED`, with `payment_status`
  going to `REFUNDED` only on **Stripe's confirmation**, never on the request;
- **status sync skipping `CANCEL_REQUESTED`**, so CJ's own polling cannot walk a
  cancelling parcel back onto the fulfilment path.

Settlement runs twice an hour: `GET /api/cron/cancellations-settle` at **:15 and
:45**, with `POST /api/internal/cancellations/settle` as the manual handle.

There is a **break-glass migration route** —
`POST /api/internal/cancellations/migrate-cancellations`, plus a dispatchable
workflow — the same pattern part 163's Customers tables used. This is now the
house convention for shipping DDL to an environment where nobody has a psql
prompt.

## 6. Stripe, and the idempotency key that matters

A full refund over Stripe's REST API, **with the cancellation id as the
idempotency key**. That choice is what makes the settle loop safe: it runs every
half hour, it retries anything `PENDING`, and a retry of an already-refunded
cancellation is a no-op at Stripe rather than a second refund.

`STRIPE_SECRET_KEY` must be set **on the portal**. Unset, refunds stay `PENDING`
and the settle run keeps retrying — degraded, visible, and not lost.

## 7. The storefront side, in all three repositories

`sals3-ecommerce` #39, `sals3.com.fj` #44 and `sals3.com.au` #36 are the same
change, ported:

- Buyer order payloads gain an **optional `cancellation` block**;
  `from-api.ts` turns it into a mode, a notice, and a real
  **Cancel order** / **Request cancellation** link — **keeping the greyed reason
  when the portal offers nothing**. The storefront never decides; it renders
  what the portal decided, including the refusal sentence.
- **`/orders/[orderNumber]/cancel`** — a reason list, an optional staff-only
  note, one button. The Server Action reads the **revocation-checked** session,
  **rate-limits per uid**, and POSTs to
  `/api/storefront/orders/{n}/cancel` with the verified identity in the buyer
  headers. The identity is never taken from the form.
- The order page shows the **hold deadline**, the late-supply offer, or the
  latest request's state; a cancelled order reads **"Refund in progress"** until
  Stripe confirms — because the refund is genuinely not done at that point and
  saying otherwise would be a lie the buyer can check against their statement.
- The **delivery step and the receipt** carry the cancellation promise, worded
  from `SALS3_CANCELLATION_HOLD_MINUTES` rather than hard-coded, so the promise
  cannot drift from the portal's actual window.

### The five-minute follow-up (#50, fj #55, au #49)

When `SALS3_CANCELLATION_HOLD_MINUTES` is **unset**, a deployment that talks to
the **SIT portal** now defaults its promised hold to **5 minutes**, matching the
portal's own SIT default from #218.

Small, and it removes a real trap: an unset variable was promising an hour on a
storefront pointed at a portal holding for five minutes. **A default that
differs by environment must be derived from the environment, not from a
constant.**

## 8. Verification

Actions is billing-stalled on every application repository, so each of these
carries a named local `npm run verify` per ADR-019's 2026-09-09 amendment:

| PR | Result |
| --- | --- |
| portal #217 | **4,264 unit / 4 skipped (387 files)**, **72 e2e / 8 skipped**, on `3d064222` |
| portal #218 | **4,267 unit / 4 skipped (387 files)**, **72 e2e / 8 skipped** |
| ecommerce #39 | **1,338 unit (130 files)**, **80 e2e / 2 skipped**, on `3adc4fb` |

**#218 is SIT only, explicitly.** The PR says so: *"Not to be promoted to
pre-prod or main without the owner."* A change to when money leaves the CJ
wallet does not walk the promotion gate on an agent's judgement.

## 9. What v4.1 left open — and what happened to it

Recorded honestly in #217's own "What this leaves undone":

- **No buyer email on cancellation.** No order email exists in *either*
  repository, so the order page is the only notification surface.
- **Whole-order cancellation only.** Per-parcel was out of scope.
- **`FAILED` refunds and `CJ_UNPAID` tidy-ups need a person.** Both are visible
  on the parcel page, which is the minimum bar: a state a human must resolve has
  to be a state a human can *see*.

Within a day, live SIT disputes changed the rules again. **v4.1's instant refund
for a paid order became the thing the owner overruled** — that is
[[ADR-021-order-cancellation-24-hour-hold-review-gate-and-no-refund-ahead-of-cj|ADR-021]]
and [[sals3-session-2026-09-10-part167-sop-v42-and-the-morning-cj-quoted-nothing|part 167]].

## Lessons

- **A hold that hides the order is worse than a hold that shows it.** Split the
  job so the waiting state is observable at the system that will act on it.
- **Make the phase field optional and treat absent as "the old behaviour".**
  That is what let a queue-shape change ship without draining the queue.
- **Use the domain id as the idempotency key.** It makes a retry loop safe by
  construction rather than by careful ordering.
- **Read the supplier's state live at the moment of decision.** A cached
  fulfilment status is a status that has already moved on.
- **A promise rendered to a buyer must be derived from the setting that governs
  it**, and when that setting varies by environment, from the environment.
- **`payment_status = REFUNDED` on confirmation, never on request.** The gap
  between the two is exactly the window in which a refund can fail.

Registered as skills 110, 111 and 112 in [[sals3-skills]].

## Pending

- **No cancellation email exists**, in any repository. The order page is the only
  notification. Registered in [[pending-register]].
- **Per-parcel cancellation is not built** — whole order only.
- **`FAILED` refunds and `CJ_UNPAID` parcels are manual**, visible on the parcel
  page and resolved by a person.
- **#218 is SIT-only and has not been promoted.** It needs the owner before
  pre-prod.
- **The storefront reason list must stay in step with the portal's buyer reason
  codes** — nothing mechanically enforces the pairing.

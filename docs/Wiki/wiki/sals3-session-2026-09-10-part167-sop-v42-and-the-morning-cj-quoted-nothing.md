---
tags:
  [
    session-record,
    sals3,
    sals3-portal,
    storefront,
    orders,
    cancellation,
    checkout,
    cj,
    freight,
    incident,
    vercel,
  ]
aliases:
  [
    "Part 167",
    "SOP v4.2 and the morning CJ quoted nothing",
    "No refund ahead of CJ",
    "An empty freight list is not an undeliverable route",
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
  - "[[ADR-021-order-cancellation-24-hour-hold-review-gate-and-no-refund-ahead-of-cj]]"
  - "[[ADR-020-order-cancellation-hold-in-cj-imported-and-dispute-path]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[sals3-session-2026-09-09-part164-a-buyer-can-cancel-and-the-hold-moved-into-cjs-imported-tab|part 164]]"
  - "[[sals3-session-2026-09-10-part162-sixteen-of-twenty-five-orders-reached-cj-unreachable|part 162]]"
---

# Part 167 — SOP v4.2, and the morning CJ quoted nothing

> [!IMPORTANT] Three things, all from live SIT within a day of shipping
> 1. **The first real buyer cancellation never reached the portal.** Vercel
>    Deployment Protection answered the POST itself, and the buyer read
>    *"Something went wrong on our side."*
> 2. **CJ's freight calculator answered every package with an empty list** for
>    four destinations, and the storefront told buyers *"no courier covers that
>    route"* — during a **supplier outage**, about products that had shipped the
>    week before.
> 3. **The owner rewrote the cancellation rules after watching the first real
>    disputes**: 24-hour hold, a **review gate** at CJ Pending, and **nobody
>    refunded ahead of CJ**.

> [!NOTE] Provenance
> Reconstructed on **2026-09-10** from `sals3-portal` **#222**, **#223**,
> **#224**; `sals3-ecommerce` **#54**, **#55**; `sals3.com.fj` **#59**, **#60**;
> `sals3.com.au` **#52**, **#53**. Nine merged pull requests, none with a vault
> note. The decision is
> [[ADR-021-order-cancellation-24-hour-hold-review-gate-and-no-refund-ahead-of-cj|ADR-021]];
> this note is the build and the two incidents that shaped it.

## 1. The cancellation that never arrived (ecommerce #54, fj #59, au #52)

The **first buyer cancellation on a real SIT order** never reached the portal.

**Vercel Deployment Protection guards every pre-production portal deployment.**
It answered the cancel POST itself — `401`, a `_vercel_sso_nonce` cookie, and
**no `reason` field** — before the route's own code ran. The storefront saw a
shape it could not parse and the buyer read *"Something went wrong on our
side."*

Every **read** carries `getProtectionBypassHeaders()`. **This POST was the one
portal call that did not.**

The fix is one line, plus `orders.cancel-bypass.test.ts` pinning the header so it
cannot be dropped again.

> [!WARNING] The pattern to look for
> A cross-cutting header applied "everywhere" is usually applied everywhere
> **someone wrote the loop**. Reads went through a shared client; this write did
> not. The audit question is not *"do we send the bypass?"* — it is **"which
> callers do not go through the thing that sends it?"** See skill 120.

And it generalised immediately: **the three review POSTs in
`src/services/storefront/reviews.ts` have the same omission**, found while
fixing this one and recorded as owed rather than quietly folded in.

## 2. The morning CJ quoted nothing (portal #222, #223)

### What buyers saw

**SIT, 2026-09-10 from 21:45 UTC.** Two products that had shipped to PH the week
before were refused at checkout as **"no courier covers that route"**.

That sentence is a **claim about the product and the address**. It was neither.

### What was actually happening

CJ's freight calculation answered **every** package with `code 200, data: []` —
for **four destinations**, and for products with a shipping history. **CJ's own
web calculator showed no methods either**, which is what proved it was CJ and
not Sals3.

The portal fell through to its **undeliverable** refusal, because an empty list
and a refused route were the same branch.

### The diagnostic could not tell them apart either (#222)

`diagnose-freight-quote` attached CJ's raw `freightCalculateTip` body **only when
the quote failed unnamed**. A *refusal* could not distinguish an **empty CJ
list** from **portal-side filtering** — the two candidate causes, and the
diagnostic covered neither.

Now the raw body is attached **whenever the quote failed**, full stop. Read-only,
`CRON_SECRET`-gated.

> This is the second time in two days that the highest-value change was **making
> a failure describe itself** — part 165's log line was the first.

### The refusal that was missing (#223)

An empty list now has **its own sentence**:

> *"we can't get a delivery quote … right now … try again in a few minutes"*

Rows CJ returns **with `error` / `errorEn`** keep the undeliverable sentence,
because that is CJ genuinely saying the route is not served. A warning —
`[portal] CJ freight returned an empty list` — names the case in logs.

**The distinction is the whole fix.** "We cannot serve you" and "we cannot ask
right now" are different facts, and telling a buyer the first during an outage
loses a sale that was never unservable — the same shape as part 165's two empty
states, on a different surface, the following day.

**Left undone, and stated:** the cause of the empty CJ list, and whether the
storefront should retry the quote automatically.

## 3. SOP v4.2 — the owner's rules after the first real disputes (#224)

Part 164 shipped **v4.1**, in which a paid order in `CJ_PENDING` was cancelled
and **refunded at once**. Watching the first SIT disputes, the owner overruled
it on 2026-09-10:

> **Nobody is refunded ahead of CJ once CJ has been paid.**

The reason is cash, not policy: Sals3 pays CJ from the CJ wallet at fulfilment.
Refunding the buyer before CJ refunds Sals3 makes every disputed order a
**float**, carried by Sals3, on a supplier's timetable.

### The ladder as it now stands

| Stage | Buyer | Money |
| --- | --- | --- |
| **Hold, 0–24 h** in CJ Imported (SIT: **7 minutes**) | Cancel now | Instant Stripe refund; CJ order deleted |
| **CJ Pending / late supply** | **Request only** → "Cancellation requests" lane → staff **"Ask CJ to cancel"** or **"Decline"**; auto-escalates to CJ after `SALS3_CANCELLATION_REVIEW_HOURS` (12) | **Refund only on CJ `REFUND`** |
| **CJ Processing and later** | **Refused** (`processing`); return on arrival | — |

And the rule that closes the loophole: **Sals3's own cancellation of a paid order
is a request too** — born allowed, because the person doing it *is* the review —
and still refunded only on CJ's `REFUND`. Staff do not get a faster path to the
buyer's money than the buyer does.

### What that took

- **`config.ts`** — hold default **1440** minutes (SIT **7**);
  `cancellationReviewHours()`.
- **`stage.ts`** — `CJ_PENDING` and `LATE_SUPPLY` become **`REQUEST`**;
  `CJ_PROCESSING` becomes **`NONE`**. The ladder from part 164, re-graded.
- **`service.ts`** — **no dispute is opened before `review_allowed_at`**;
  `approveCancellationRequest` / `declineCancellationRequest`; an **ops
  notification** on a buyer request (`notify.ts`, Resend + Slack, both optional).
- **`settle.ts`** — the review gate and the **auto-escalation**;
  `settleOneCancellation` so the approve button acts immediately rather than
  waiting for the next cron.
- **Schema** — `drizzle/0040_order_cancellation_review.sql`, **four nullable
  columns**. Nullable is the compatibility mechanism: existing rows are valid
  without a backfill. The break-glass migrate route applies and records 0040 too.
- **Orders list** — a new **Cancellation requests** lane (`CANCEL_REQUESTED`)
  with a banner; the parcel page gains the review block with the two buttons.
- **Buyer payload** — a paid parcel reads as **Pending on a page view**, so
  *"Request cancellation"* shows; **the POST reads CJ live** and refuses
  `processing` with **409** once packing has started.

> The split between what the page **offers** and what the POST **allows** is
> deliberate. A page is a snapshot; the order can start packing between the
> render and the click. The optimistic offer plus a live check at the moment of
> action is the correct shape — and the 409 has a sentence written for it.

**The auto-escalation after 12 hours is the part that makes the review gate
honest.** A staff gate with no timeout is a gate where a buyer's request can sit
forever; the escalation means the worst case is a delay, not silence.

### The storefront copy (ecommerce #55, fj #60, au #53)

- Checkout and receipt promise **"within 24 hours of paying"** — read from the
  portal's default, 7 minutes on SIT.
- Then **request-only** while the warehouse has not started; the refund **follows
  the warehouse's answer**; closed once packing starts.
- The order page's request notice and the **"Cancellation requested"** label say
  plainly that **nothing is refunded until the warehouse confirms**. A
  `DECLINED` request gets its own sentence, and the portal's new `processing`
  **409** maps to one.
- **Late supply is a request, not an instant cancel** — the v4.1 behaviour it
  replaces.

Every one of those sentences exists because the previous wording would now be a
promise Sals3 cannot keep. **Changing the money rule without changing the copy
would have been the real defect.**

## 4. Verification

All nine ran `npm run verify` through the **pre-commit** (lint-staged +
typecheck) and **pre-push** (full `npm run verify`) hooks — the hooks are the
only automated gate left on the application repositories.

- **#222 / #223** — checkout unit tests **40 passed** across the two touched
  files.
- **#224** — cancellation and orders unit tests **189 passed** in the touched
  modules before commit.

GitHub Actions is billing-stalled on every one of these repositories; the
**Vercel commit status is the deploy signal**. **All nine are SIT only.**

## 5. What #224 itself said it left undone

Recorded in the pull request at the time, and worth quoting because three of the
four were then done in the same session:

- storefront copy in the three storefront repositories → **done**, #55 / #60 / #53
- ADR-021 and the SOP v4.2 deck in the vault → **done**, `Sals3-Official` #250
- **running the migrate route on SIT after this deploys** → **not recorded as
  done**

That last one is the live risk: `0040` adds four nullable columns, and until the
break-glass route runs on SIT the review gate has no columns to write to.

## Lessons

- **Ask which callers bypass the shared client**, not whether the shared client
  sends the header. A cross-cutting concern is only as wide as the loop that
  applies it.
- **A supplier's empty answer is not the supplier's refusal.** Give `[]` its own
  branch and its own sentence, and check the supplier's own UI before blaming
  your own filtering.
- **A diagnostic must attach its evidence on every failure path**, not only the
  unnamed one — the named paths are exactly where a wrong name is being asserted.
- **Nullable columns are the migration-compatibility mechanism** for adding state
  to a live table; existing rows stay valid with no backfill.
- **A review gate needs a timeout** or it is a place requests go to be forgotten.
- **Let the page offer optimistically and the write check live.** The state can
  change between render and click, and the refusal deserves written copy.
- **When the money rule changes, the copy is part of the change**, in every
  repository that renders a promise.

Registered as skills 120, 121 and 122 in [[sals3-skills]].

## Pending

- **The `0040` migrate route has not been recorded as run on SIT.** Until it is,
  the review gate has no columns. Registered in [[pending-register]] as the
  highest-urgency item from this group.
- **The three review POSTs in `src/services/storefront/reviews.ts` still lack the
  protection-bypass headers** — the identical one-line omission as #54, in three
  places, in each storefront repository.
- **The cause of CJ's empty freight list is unknown**, and nothing decides
  whether the storefront should retry a quote automatically.
- **`notify.ts` (Resend + Slack) is optional and may be unconfigured**, in which
  case a buyer's cancellation request raises no ops signal at all.
- **All nine changes are SIT only** and none has walked the promotion gate.

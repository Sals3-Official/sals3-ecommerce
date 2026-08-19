---
tags:
  - sals3
  - sals3-portal
  - sals3-ecommerce
  - orders
  - checkout
  - stripe
  - cj-dropshipping
  - queue
  - incident
  - session
aliases:
  - Paid Order Path
  - Order Fulfilment
  - Queue Topic Outage
  - Part 53
created: 2026-08-19
updated: 2026-08-19
status: shipped
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-17-part50-aj-checkout-freight-quotes]]"
  - "[[sals3-session-2026-08-18-part51-supplier-photo-toggle-and-the-missing-column-outage]]"
  - "[[sals3-session-2026-08-19-part55-checkout-flow-split-and-buyer-facing-repairs]]"
---

# Sals3 session 2026-08-18, part 53 — a paid order reaches CJ, and the queue that swallowed the first one

The largest capability shipped in a single day so far, and the one that went
undocumented longest: **Sals3 can now take a payment and place the resulting
order with CJ.** Six PRs across both repositories, one of which is an outage
writeup for a failure mode nobody had seen before.

Written 2026-08-19 from git and the PR records, after an audit found every PR
below missing from this vault.

> [!IMPORTANT] Orders go to CJ **sandbox** by default
> `CJ_ORDER_SANDBOX !== '0'` — unset, empty, `1`, or anything else means
> sandbox. Only the exact string `0` places a live order that moves real CJ
> balance. Anyone testing checkout should know this before assuming a real
> purchase happened, and before assuming one did not. See [§3](#3-sandbox-by-default-and-why-the-switch-is-asymmetric).

## 1. What shipped

| PR | Repo | What |
|----|------|------|
| [#103](https://github.com/Sals3-Official/sals3-ecommerce/pull/103) | ecommerce | Embedded Stripe Checkout; paid session handed to Portal |
| [#123](https://github.com/Sals3-Official/sals3-portal/pull/123) | portal | Checkout intents, order tables, CJ fulfilment worker (+1,604 lines) |
| [#125](https://github.com/Sals3-Official/sals3-portal/pull/125) | portal | CJ orders sent as sandbox unless explicitly disabled |
| [#126](https://github.com/Sals3-Official/sals3-portal/pull/126) | portal | CJ's `null` identifier fields accepted instead of failing the order |
| [#128](https://github.com/Sals3-Official/sals3-portal/pull/128) | portal | Discovery queue topic renamed so a live deployment owns the subscription |
| [#130](https://github.com/Sals3-Official/sals3-portal/pull/130) | portal | Storefront fulfilment dispatch targeted and prioritised |

## 2. The shape of the path

**Ecommerce never sees a CJ credential and never reconstructs an order from
Stripe metadata.** That is the load-bearing boundary decision.

1. Before payment, the checkout action creates a **Portal checkout intent** —
   cart, address, freight quote, shipping selection, supplier connection —
   stored as an immutable snapshot, with the selected freight revalidated
   against the live quote path. Its id travels as the Stripe Session's
   `client_reference_id`.
2. Stripe Checkout is **embedded** (`ui_mode: embedded_page`), so buyers stay
   on the Sals3 domain rather than redirecting to Stripe Hosted Checkout.
3. On a paid `checkout.session.completed`, the webhook calls Portal's
   protected accept-order endpoint, **keyed on the Stripe event id**, and
   returns 500 on handoff failure so Stripe retries.
4. Portal creates one paid Sals3 order per Stripe Checkout Session and
   inserts a durable `FULFILL_ORDER` outbox intent.
5. The queue worker drives CJ **in order**: `createOrderV3` → `addCart` →
   `addCartConfirm` → `saveGenerateParentOrder` → `payBalanceV2`, recording
   each step's request/response snapshot and status, so a retry **resumes
   mid-sequence instead of re-placing supplier orders**.

`AWAITING_SUPPLIER_FUNDS` handles an unfunded CJ balance without failing the
order — the ADR-008 funding-hold case, reachable for the first time.

New tables in `drizzle/0023_order_fulfillment.sql`: `checkout_intents`,
`sals3_orders`, `sals3_order_lines`, `fulfillment_groups`,
`supplier_order_steps`, five enums, and `FULFILL_ORDER` on `queue_operation`.
Unique indexes on the Stripe session, the Stripe event, and the per-step
idempotency key are what make replays safe.

## 3. Sandbox by default, and why the switch is asymmetric

`createOrderV3` was originally called with no `isSandbox` at all. The first
real storefront order to reach the queue would have placed a **live** CJ order
and `payBalanceV2` would have deducted **real balance** — on a path that had
never once been exercised end to end.

| `CJ_ORDER_SANDBOX` | Result |
|---|---|
| unset / empty / `1` / anything else | sandbox |
| exactly `0` | live order, real balance |

The asymmetry is the point: an unset or fat-fingered environment variable must
not be the only thing between a test order and a real charge, so the failure
direction points at sandbox. Turning it off is a deliberate act, and the
README states the condition for `0` — owner-approved production order payment.

`CJ_ORDER_SANDBOX` already exists in the Vercel **Production** environment.
Its value is encrypted and was not read; because the default is sandbox, both
unset and `1` behave safely.

## 4. Six real orders died parsing a success response

Every storefront order placed on the day — six of them — failed at the first
CJ call. Not a CJ failure. `createOrderV3` answered `code: 200`,
`success: true`, with a usable `orderId`. Portal threw while parsing its own
success response:

```
Queue callback error: Error [ZodError]: [ {
  "expected": "string", "code": "invalid_type",
  "path": [ "shipmentOrderId" ], "message": "Invalid input"
} ]
```

`z.string().min(1).optional()` accepts `undefined`, not `null`, and CJ sends
these fields as explicit nulls. Because a `ZodError` is not a `CjApiError`,
the catch relabelled it `unexpected-response` and marked the group
`FULFILLMENT_FAILED` — **with a valid order id sitting unread in the stored
response snapshot.**

Four fields moved to `.nullish()`: `orderId`, `shipmentOrderId`,
`shipmentsId`, `payId`. Two comparisons moved with them, because `.nullish()`
makes `null` reachable where only `undefined` was before — fixing the schemas
alone would have traded a hard failure for a silent one:

- `cjOrderId === undefined` → `cjOrderId == null`, or a `null` passes the
  guard, is written to `fulfillment_groups.cj_order_id`, and goes on to
  `addCart` as `cjOrderIdList: [null]`.
- `parentData.payId === undefined` → `parentData.payId == null`, or
  `payId: null` lands in the `payBalanceV2` body instead of the key being
  omitted.

**The shape was verified, not guessed**: against the six real CJ responses
stored in `supplier_order_steps.response_snapshot` for this account,
`shipmentOrderId` and `payId` are `null` in every one and `orderId` is
populated in every one.

## 5. The queue outage — a subscription owned by a deleted deployment

Queue delivery stopped. Nothing consumed `catalog-discovery`, so every message
published after 13:47 went nowhere — **including a paid order's
`FULFILL_ORDER`.**

A `queue/v2beta` subscription is created implicitly from `vercel.json`'s
`experimentalTriggers` and stays bound to the deployment that declared it. The
deployment holding it (`rbn9zyq3w`) was deleted for running pre-merge code —
it was demonstrably serving every CJ call of the day. Vercel's own
Observability alert had independently reached the same conclusion before the
deletion.

Nothing reassigned the subscription afterwards. Three separate production
deployments registered **no consumer at all**:

| Deployment | Origin | Queue invocations |
|---|---|---|
| `nfrl9jyjb` | `vercel redeploy` (reused build) | 0 |
| `dgdnwzsye` | CLI build from a clean worktree | 0 |
| `cgdxipvpv` | git-triggered build via deploy hook | 0 |
| `rbn9zyq3w` (deleted) | — | 102 |

There is no dashboard surface for the topic — the project's Storage tab lists
only the Neon database, with no Queues entry at project or team level — so
there was no subscription to delete or repoint by hand.

**The fix was to rename the topic.** `catalog-discovery-v2` did not exist, so
the next deployment creates it and owns its subscription. Publisher
(`config.ts`'s `QUEUE_TOPIC`) and consumer (`vercel.json`) move together, and
`CATALOG_QUEUE_TOPIC` is set in no Vercel environment, so the code default is
what production uses and there is no window where the two disagree.

**Nothing in flight was lost, and the reason is worth keeping.** Every
`work_outbox` row but one was already `DISPATCHED` (1,293,765). The single
`PENDING` row was the paid order's `FULFILL_ORDER`, and it had **never been
published** (`attempts: 0`, `dispatched_at: null`) — because `dispatchOutbox`
runs after a handler commit and the handler *was* the dead consumer.
Publisher and consumer died together, which is what kept the message safely in
Postgres instead of stranding it inside a dead topic.

Order of operations was deliberate: **restore the consumer first, drain
second.** Draining while the subscription was orphaned would have flipped the
row to `DISPATCHED` and lost a paid order silently.

> [!WARNING] The `-v2` suffix is load-bearing
> It looks like clutter and invites a future tidy-up back to a "clean" name,
> which would silently reproduce this outage. The mechanism is recorded next
> to the constant in `config.ts` and in the README's queue section for that
> reason, not only in the PR.

## 6. Dispatch priority (#130)

Storefront order acceptance now drains **the exact `FULFILL_ORDER` outbox row**
after commit rather than waiting for a general drain, and `FULFILL_ORDER` is
raised above discovery and evaluation in outbox claim priority. A paid order
should not queue behind a catalogue scan.

The same PR added the proof that `createOrderV3` defaults to `isSandbox: 1`
unless `CJ_ORDER_SANDBOX=0`.

## 7. Open, and deliberately not closed

- **`STRIPE_WEBHOOK_SECRET` is not set in Vercel production.** Without it the
  webhook short-circuits and **no order is ever created**. This is the single
  configuration item standing between a paid checkout and a Sals3 order.
- **Migration `0023` does not run on deploy.** Vercel never runs
  `db:migrate`; it must be applied to production deliberately, or every
  checkout endpoint 500s on missing tables. Note the tension with part 51's
  standing rule — the rule is *never migrate the local database*, and the
  sanctioned production path remains the `CRON_SECRET` break-glass route.
- **`drizzle/meta/0023_snapshot.json` is missing** — the migration is
  hand-written, so the next `drizzle-kit generate` will diff against the 0022
  snapshot and re-emit these tables as 0024. Regenerate 0023 through
  `db:generate` before the next schema change.
- **`ALTER TYPE ... ADD VALUE` and use of the new value are in one migration.**
  If Drizzle wraps it in a single transaction on this Postgres version, the
  enum change needs its own migration.
- **`fulfillment-worker.ts` has no test file.** Neither the worker internals
  nor `createOrderBody` are exported, so the sandbox flag and the CJ response
  shapes carry no unit coverage — including the switch that decides whether an
  order spends real money. Verified instead against recorded production
  responses.
- **A `ZodError` is still reported as an upstream CJ problem.** Mapping it to
  its own error code changes error semantics for every step and was left for
  its own change.
- **End-to-end runtime proof is still pending.** The queue rebind is what
  makes it possible; the stranded order completing its CJ chain will be the
  first real exercise of both `isSandbox: 1` and the `.nullish()` fix.

New environment variables from #123: `CJ_PLATFORM_TOKEN`,
`CJ_ORDER_SHOP_LOGISTICS_TYPE`, `CJ_ORDER_STORE_NAME` — all optional and
account-specific; unset falls back to the merchant logistics default.

## 8. Reusable lessons

1. **A success response can still kill an order.** Six orders were lost to a
   parser, not to CJ. When a step fails, read the stored response snapshot
   before believing the error label.
2. **An error class that is not your error class gets relabelled.** A
   `ZodError` caught by a handler expecting `CjApiError` reported an upstream
   fault for a local schema bug.
3. **A default must fail toward the cheap outcome.** Sandbox-unless-`0` is
   the whole reason a first live order did not spend real money.
4. **An implicitly-created queue subscription belongs to a deployment, not to
   a project.** Deleting that deployment orphans it with nothing in any
   dashboard to repair, and redeploying does not reclaim it.
5. **Restore the consumer before draining the outbox.** The drain marks rows
   dispatched whether or not anything is listening.

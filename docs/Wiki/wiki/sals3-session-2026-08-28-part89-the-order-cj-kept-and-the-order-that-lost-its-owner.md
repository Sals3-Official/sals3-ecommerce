---
tags:
  - sals3
  - sals3-portal
  - orders
  - fulfillment
  - cj-dropshipping
  - authorization
  - migration
  - session-note
aliases:
  - Part 89
  - The Order CJ Kept
  - The Order That Lost Its Owner
created: 2026-08-28
updated: 2026-08-28
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-009-server-verified-email-password-authentication]]"
  - "[[sals3-session-2026-08-28-part88-three-named-tiers-instead-of-cjs-own-courier-list]]"
---

# Part 89 — the order CJ kept, and the order that lost its owner

Two AJ fixes merged 2026-08-28, both about an order that existed and could not be
reached.

- `sals3-portal` [#212](https://github.com/Sals3-Official/sals3-portal/pull/212)
  — adopt the CJ order a timed-out create left behind.
- `sals3-portal` [#213](https://github.com/Sals3-Official/sals3-portal/pull/213)
  — scope an order to the account that placed it, not the typed address.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. The schema claim was
> re-checked: `drizzle/0033_normal_magus.sql` on `develop` adds `buyer_uid` to
> both tables plus an index. The production timelines are AJ's, captured at the
> time.

## 1. A ten-second timeout against a thirteen-second write

Order `S3-20260828-EF28C4D429` sat on "Needs attention" while the supplier order
it was waiting for existed and was correct.

| Time (UTC) | Source | What happened |
|---|---|---|
| ~06:17:34 | inferred | Portal called CJ `createOrderV3` |
| 06:17:44 | Vercel log | `CjApiError … reason: 'upstream-unavailable'` |
| 06:17:57 | CJ API | CJ created order `2608280617560656100`, `CREATED` |

The client gave up at ten seconds; CJ finished the write thirteen seconds later
and **kept the order**. The portal never learned its id, `cj_order_id` stayed
null, and the group went `FULFILLMENT_FAILED`.

### Nothing could recover it, by construction

Every replay re-sent the same deterministic `orderNumber`, which CJ then refused
as a duplicate. And `dueGroups` in `status-sync.ts` filters on
`cj_order_id is not null` — **so the one process that could have noticed the
order was the one excluded from seeing it.** A recovery path and its own
precondition, in disagreement.

Ruled out as a cause: part 88's tier work. That change is additive on the write
path, and the 2026-08-27 order completed the whole five-call chain in nine seconds
on the old code.

### The fix turns the duplicate refusal into the recovery

`${order_number}-${package_id}` does not change between attempts, which makes it
an idempotency key on CJ's side. Before re-sending a create whose step already
failed, the worker asks `getOrderDetail` for that number and **adopts** the order
if CJ has one, continuing the chain at `addCart`.

The lookup is deliberately narrow, and both narrowings are the interesting part:

- **Only a `FAILED` step triggers it.** A first attempt spends no extra CJ call, a
  succeeded one is still served from the step cache — the call budget discipline
  [[agent-operating-contract]] §9 requires.
- **Only CJ's own "not found" is read as "no such order".** Every other failure
  rethrows, because *a stuck retry is recoverable and a duplicate supplier order
  is money.*

Write timeouts move to 30s and reads stay at 10s, now split by direction in the
new `cj-http.ts` — which also ends the near-duplicate fetch-token-parse block
`status-sync.ts` and the worker each carried. **The longer window only narrows the
race; the reconciliation closes it.** Worth keeping separate: a timeout increase
alone would have looked like a fix and left the hole.

## 2. An order that belonged to nobody the buyer could prove

A buyer paid for `S3-20260828-F09541C867`, was told **"This checkout is not
available on your account"**, and could not find the order in their list. It was
theirs the whole time — CJ created and paid it seven seconds after the receipt
refused them.

`buyer_email` was the only identity an order carried, and it is **the contact
address typed into the checkout form.** It names a mailbox, not a person. Type
anything other than the account address and the order silently detaches from the
account that paid for it — no warning at checkout, and the consequence visible
only afterwards.

### Identity now comes from the session, never the form

`checkout_intents` and `sals3_orders` carry a nullable `buyer_uid`: the
storefront's verified Firebase uid, arriving as `X-Buyer-Uid` from its session
cookie, **never from a request body**.

- A row **with** a uid is authorized by uid alone. Email is deliberately *not* a
  fallback there — allowing one would mean anyone who got an order's contact
  address onto their own account could read that order.
- A row **without** one still authorizes by email. Every order accepted before
  this has none, and refusing them would lock buyers out of their whole history to
  fix a narrower problem.

> [!IMPORTANT] The line that made the rollout quiet
> The check reads `== null` rather than `!== null`, so a row fetched by a
> deployment live *before* the migration lands is treated as **pre-uid** rather
> than as one whose uid cannot be matched. That is the difference between a quiet
> rollout and refusing every buyer their orders for the length of that window.
> **A test pins it, and the test is what caught it.**

### Migration, and its direction

`drizzle/0033_normal_magus.sql` — two nullable columns and one index, no backfill.

The checkout accept path **writes** `buyer_uid` on insert, so this must run as
soon as the deployment carrying it is live: until it does, accepting a paid order
fails with `column "buyer_uid" of relation "sals3_orders" does not exist`. Apply
with **Orders Migrate Buyer Uid**, which asserts both columns exist afterwards
rather than trusting a 200 — the same "reality over ledger" posture as part 87's
`columnExistsAfter`.

### Repairing the one order already stranded

**Orders Repair Buyer Identity** repoints one *explicitly named* order's contact
address at the account that paid for it. It refuses any row that already carries a
uid, and reports the address it replaced so the run log shows what changed. No
batch, no pattern: **a wrong guess here hands one person's order to another
account.**

## 3. Verification

Full `npm run verify` before push on both. Five new `buyer-read` tests cover: the
account reading an order whose contact address differs; a matching email refused
when the uid does not match; a uid-bearing order refused to a caller sending no
uid; a pre-uid order still readable by email; and a row with no `buyer_uid` key at
all treated as pre-uid.

## 4. Open

#213's own record says it *"pairs with `sals3-ecommerce`#182"* — the storefront
half that would send `X-Buyer-Uid`. **No such pull request exists in that
repository yet.** Until it does, no order can acquire a uid, so every row stays on
the email path and the fix is dormant rather than active.

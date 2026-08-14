---
tags: [sals3, sals3-portal, orders, fulfillment, seller-center, design, shopee-reference]
aliases: [Orders Parcel Workspace, Sals3 Orders Design, Orders Lane Design]
created: 2026-08-12
updated: 2026-08-13
status: approved
authority: design-specification
owner_approved: true
implementation_status: shell-shipped-fixtures-only
related:
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[sals3-session-2026-08-13-part37-orders-parcel-workspace-build]]"
  - "[[hot]]"
---

# Sals3 Portal — Orders parcel workspace design

> [!IMPORTANT] Approved 2026-08-12. Shell shipped 2026-08-13, fixtures only.
> Bogs approved this direction after a live walkthrough of his own Shopee
> Seller Center. The design below is what was approved; the build record and
> the three things that changed during it are at the end of this note and in
> [[sals3-session-2026-08-13-part37-orders-parcel-workspace-build]]. There is
> still no order backend: no database, no CJ call, no webhook.

## Problem

`/orders` was the last major Seller Center surface still a placeholder: four
filter chips over a six-column table fed by
`src/lib/seller-center/mock-data/orders.ts`, whose own header states *"No
backend order system exists yet."* Its row type carried `buyer`, a single
`items` string, `cutoffLabel`, and a `sync` state mapping to nothing in the
approved architecture.

The ask was Shopee Seller Center's density and hierarchy, recalibrated for the
Sals3 operating model where a seller is either a `RETAILER` shipping own stock
or a `DROPSHIPPER` whose supplier fulfills
([[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]).
Shopee's layout has no concept of the second, because Shopee sellers own their
stock.

## Decisions

1. **Row primitive is the fulfillment group (parcel)**, not the customer order.
   [[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]
   splits one checkout into per-provider fulfillment groups, and CJ has no
   partial-shipment status — splits surface as separate packages.
2. **First slice = contracts + presentational shell on fixtures.** Schema,
   repository and the CJ order worker are separate later slices.
3. **Prepaid only.** [[ADR-005-payment-settlement-refunds-and-cod]] holds. Every
   order in the reference Shopee account is COD — that is Shopee's operation,
   not ours.
4. **Money rails are never netted** (see below).

## Competitive reference

Two live seller accounts were walked. Recorded here because it is expensive to
re-derive — it needs logged-in accounts.

### Shopee list behaviour is not uniform across lanes

- **Chips are lane-specific.** Only *To Ship* has them. *Shipping*, *Unpaid*
  and *All* render none. Chips appear only where the seller has a decision.
- **The counted unit switches**: "3 Parcels" on *To Ship*, "55 Orders" on
  *Shipping*. Parcels are counted only once a shipment exists.
- **Status is never a bare pill** — always state + next-step sentence + date.
- **Two actions maximum**, and a blocked action becomes greyed unclickable text
  stating the reason (their `COD Pending Review`) rather than vanishing.
- **Counts omitted where noisy**: *All* and *Unpaid* carry no badge.
- Chip and sort state is URL-encoded; an unknown `type` falls back to *All*.

### Shopee order detail

- Status card, then an explicitly labelled **`WHAT YOU CAN DO NEXT`** strip.
- **Two separate feeds**: an `ORDER HISTORY` lifecycle timeline and a carrier
  **tracking event feed**. An exception renders inline in the feed and is
  **not** promoted to the status.
- `Package 1:` labels the parcel at detail level too — the parcel primitive is
  Shopee's own.
- **Graduated PII**: the address block masks recipient name and phone
  (`R******n, ******86`) while showing the street; the invoice block below
  shows the unmasked name.

### Lazada order detail

Splits money into **two cards with two grand totals** — `My Payment
Information` and `Buyer Payment Information` — and never adds them. Correct
instinct, wrong axis for us: their sellers hold their own stock, so they need
two where Sals3 needs three.

Their two large buyer-reliability dials (`94% Successful Delivery Rate`,
`31 Successful Delivery Count`) are COD risk scoring — meaningless to a prepaid
marketplace where the money is captured before the parcel exists. Replaced with
fulfilment-risk counts.

## Supplier status mapping (CJ)

CJ documents `orderStatus`: `CREATED`, `IN_CART`, `UNPAID`, `UNSHIPPED` (with
`subStatus` = `PENDING` | `PROCESSING`), `SHIPPED`, `DELIVERED`, `CANCELLED`.
Verified at <https://developers.cjdropshipping.com/en/api/api2/api/shopping.html>
on 2026-08-12. The CJ *product* API page carries no order statuses — its enums
are product status/type, POD (print-on-demand) customization version, video
status, inventory verification.

**CJ's status is never the seller-facing status.** ADR-004 §2 requires internal
state independent of CJ's; §6 forbids raw supplier names leaking.

| CJ `orderStatus` | `subStatus` | Sals3 parcel state | Lane |
|---|---|---|---|
| `CREATED` | — | `CJ_ORDER_CREATED` | To process |
| `IN_CART` | — | `CJ_ORDER_CREATED` — CJ merges this | To process |
| `UNPAID` | — | `CJ_PAYMENT_PENDING`, or `AWAITING_SUPPLIER_FUNDS` when the wallet cannot cover it | To process / **Needs attention** |
| `UNSHIPPED` | `PENDING` \| `PROCESSING` | `FULFILLING` | To process → *Supplier preparing* |
| `SHIPPED` | — | `SHIPPED` | Shipping |
| `DELIVERED` | — | `DELIVERED` | Completed |
| `CANCELLED` | — | `CANCELLED` | Returns & cancellations |

`UNPAID` is the money-critical state — the one CJ status meaning either "not
paid yet" or "cannot pay", decided by wallet readiness (ADR-008), not by CJ.
`DELIVERED` arrives from two sources (order API and logistics webhook
`12 = Delivered`); disagreement enters `TRACKING_CONFLICT` per ADR-004 §5, and
a terminal delivered state is never auto-downgraded.

**`TRACKING_CONFLICT` is not a CJ status.** CJ only ever reports its own view.
The conflict is ours, produced by comparing CJ against the carrier.

## Lanes

"Supplier preparing" is a **chip inside To process**, not its own lane —
Shopee keeps "arranged, awaiting pickup" inside *To Ship* the same way.

| Lane | Count | States |
|---|---|---|
| All | no | all |
| Unpaid | no | `DRAFT`, `CHECKOUT_PENDING`, `PAYMENT_PENDING`, `PAYMENT_FAILED` |
| To process | yes | `PAID`, `FULFILLMENT_QUEUED`, `CJ_ORDER_CREATED`, `CJ_PAYMENT_PENDING`, `FULFILLING` |
| Shipping | yes | `SHIPPED` |
| Completed | yes | `DELIVERED` |
| Returns & cancellations | yes | `CANCEL_REQUESTED`, `CANCELLED`, `REFUND_PENDING`, `REFUNDED`, `RETURN_IN_PROGRESS`, `RETURNED` |
| **Needs attention** | yes, accent | `FULFILLMENT_FAILED`, `AWAITING_SUPPLIER_FUNDS`, `DELIVERY_EXCEPTION`, `TRACKING_CONFLICT` |

**Needs attention is the lane Shopee does not have, and is why this is not a
reskin.** ADR-008 requires a Critical actionable issue when a paid order cannot
be funded; ADR-004 §5 requires tracking-conflict reconciliation. Both are
invisible in Shopee's information architecture.

Every state maps to exactly one lane, proven by test. A state added to the
machine but forgotten in the table would render in no tab at all.

## Money — three cards, never netted

```
Buyer paid                    Your Sals3 settlement        Your supplier spend
  the buyer's money             Rail A                       Rail B, dropship only
  = gross                       = estimated seller income    = paid from your account
```

**No figure anywhere combines them.** ADR-008 is explicit that Sals3 neither
advances supplier funds nor deducts supplier cost from a payout; a blended
"profit" number would assert exactly the relationship the architecture forbids.
The buyer payment is a third card because it belongs to the *order* — on a
split it covers a sibling parcel — so folding it into the settlement rail would
present it as the seller's money.

Shopee's `Service Fee` / `Transaction Fee` and Lazada's LazCoins / Promo Pass
lines are their commercial constructs and are **not** adopted. ADR-008 approves
one Sals3 mechanism, a marketplace commission, with rates and basis still
pending. Fee lines whose value is not yet approved are omitted, never invented.

## PII handling

- **List view** — masked buyer handle only. No address, no phone.
- **Detail view** — masked by default with one reveal control for all three
  values, gated on `order:fulfill`. The plaintext is fetched from a server
  action and never sits in the page payload.
- **Courier contact** renders only for own-stock parcels. For dropship it is
  third-party personal data from the supplier, and ADR-004 §3 requires personal
  data redacted from stored supplier payloads.
- **No reveal audit exists.** The prototype claimed revealing is recorded
  against the account; that sentence was removed rather than shipped.

## Other deliberate rejections

Cash on Delivery (ADR-005 §4); "Get Quick Funds After Shipping Out" seller
lending; `Block this buyer`; `Follow` / `Chat Now`; percentage dials or
performance scores; live product data in rows — those render the immutable
`OrderLineSnapshot` (ADR-004 §7,
[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]) with an
"as ordered on <date>" note, so a later supplier rename or media swap cannot
rewrite a shipped order.

## Deferred, with shape already decided

**Proof of delivery (POD).** In Sals3, **POD means proof of delivery**;
print-on-demand is always spelled out, because CJ uses "POD" for its
customization versions and ADR-008 lists Printful/Printify as future Supplier
Apps. POD is retail-side — a `RETAILER` holds the carrier relationship; a
`DROPSHIPPER` gets delivery confirmation only via the CJ logistics webhook.
When built it is **its own record, not a field on the parcel**: ADR-004 §5
requires storing every source event and forbids auto-downgrading a delivered
state, so a single column would be last-write-wins. Its artifacts are buyer
personal data needing their own access rule and retention window, and it
surfaces on the parcel detail view only.

**Delivery window** is the supplier's estimate and renders on dropship parcels
only, labelled as such. It is the one source we can read; a window on a parcel
we ship ourselves would be a promise with nothing behind it.

## Implementation order

1. **Done** — `src/modules/orders/` contracts, lane mapping, supplier adapters,
   repository seam, tests; fixtures; list and detail shells.
2. `orders` / `order_line_snapshots` / `fulfillment_groups` /
   `supplier_order_intents` schema + migration + repository against the
   database.
3. CJ order worker, webhook verification, reconciliation (ADR-004 §3).

Database reads go through `readOrUnavailable` in `src/lib/db/availability.ts`,
with the authorization call **inside** the wrapper — resolving the seller
account is itself a query, so leaving it outside crashes the page before
reaching the part that was protected.

## Implementation status — 2026-08-13

Shipped as a fixture-backed shell over eight local commits on
`fix/degrade-honestly-when-database-unreachable`. Not pushed, no PR, by
explicit instruction. Full record:
[[sals3-session-2026-08-13-part37-orders-parcel-workspace-build]].

Live: `/orders` and `/orders/[parcelId]`, permission-gated, 33 fixture parcels
across every lane. Not live: any database, any CJ call, any webhook.

Three things changed from the design above during the build:

1. **Three money cards, not two.** Adding the *Buyer paid* card beside the two
   rails, for the reason given under Money above.
2. **Route carries the connection, not a label.** `ParcelRoute` holds
   `{ connectionId, providerCode, label }` per ADR-006, because one seller can
   hold two accounts with one provider and a bare "CJ" cannot say which wallet
   is short of funds. The route filter keys on connection id for the same
   reason.
3. **Supplier actions are capability-derived.** A `SupplierAdapter` registry
   replaced the single CJ translator, so a provider without `CANCEL_ORDER` gets
   no cancel control at all. Reconciliation stayed with Sals3 rather than
   moving behind a capability — ADR-004 §5 makes it our decision and it applies
   to own-stock conflicts where no provider is involved.

## Working artifacts

Working build plan, not vault-governed:
`C:\Users\Bogs\.claude\plans\keen-inventing-moler.md`.

The worktree this was built in has been merged and removed.

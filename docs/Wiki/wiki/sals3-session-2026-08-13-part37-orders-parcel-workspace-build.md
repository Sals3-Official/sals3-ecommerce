---
tags: [sals3, sals3-portal, orders, fulfillment, seller-center, session, design, accessibility, privacy]
aliases: [Orders Parcel Workspace Build, Part 37, Orders Detail v2]
created: 2026-08-13
updated: 2026-08-13
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[sals3-portal-orders-parcel-workspace-design]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[hot]]"
---

# 2026-08-13 · part 37 — Orders parcel workspace, detail v2, and the supplier seam

> [!IMPORTANT] Shipped as a shell. Nothing is connected to CJ.
> `/orders` and `/orders/[parcelId]` are real routes with real permission
> gates, backed entirely by fixtures. No orders table, no repository against a
> database, no CJ order call, no order webhook. If a customer order arrived
> today nothing would happen and nothing would appear here. The design
> contract is in [[sals3-portal-orders-parcel-workspace-design]].

## What was built

Eight commits on `fix/degrade-honestly-when-database-unreachable`, all local -
Bogs explicitly asked for no PR and no push.

```
7e33aec  backend seam + pluggable suppliers
b4ce434  stop shipping buyer contact behind a mask
26cbd6d  parcel detail rebuilt around three money cards
6380159  colour the header by required action, fill every lane
da9966a  page geometry from the design prototype
aebfe22  view toggle + status-tinted headers
cc2ba2a  card layout, buttons, channel filter, sort
6d1bea1  merge orders parcel workspace into the working checkout
ea8383d  rebuild the orders workspace around parcels
```

Final gate: lint, format, typecheck, build, **1189 unit + 42 orders unit,
77 e2e**.

### Surfaces

- **List** — 7 lane tabs from the ADR-004 states, route/stage/reason chips,
  channel filter, working sort, 33 fixture parcels across every lane, sticky
  bulk bar.
- **Detail** — status card with a labelled action strip, masked buyer card,
  parcel contents with SKU and a supplier delivery estimate, **three money
  cards**, adjustments ledger, fulfilment-risk facts, carrier tracking feed,
  lifecycle timeline, sibling-parcel link.

### The seam that matters

`src/modules/orders/repository.ts` is the only file that knows where orders
live. Pages, components and the reveal action speak `OrderParcel` /
`ParcelDetail` and nothing else. Methods are async and take `sellerId` from day
one, though the fixtures are neither, because adding those later is the change
applied to four call sites and missed on the fifth.

`src/modules/orders/supplier-adapter.ts` + `adapters/` make providers
pluggable. Adding one is a file and a line in the registry; nothing above it
learns a provider's name.

## Decisions taken this session

| Decision | Why |
|---|---|
| Row = parcel, not order | ADR-008 splits a checkout per provider; CJ has no partial-shipment status |
| `Needs attention` lane | ADR-008 funding holds and ADR-004 §5 tracking conflicts have nowhere else to live |
| Three money cards, never netted | ADR-008's two rails plus the buyer payment, which belongs to the order not the parcel |
| Prepaid only | ADR-005 §4. Every order in the reference Shopee account is COD; that is theirs, not ours |
| Delivery window = supplier estimate, dropship only | The only source we can read. A window on a parcel we ship ourselves is a promise with nothing behind it |
| Seller note read-only | No write path. An editable box with Save would discard what was typed |
| `POD` means proof of delivery | Print-on-demand always spelled out — CJ uses "POD" for customization versions and ADR-008 lists Printful/Printify as future apps |
| Route keys on `connectionId` | One seller can hold two accounts with one provider; the label merges them |
| Reconciliation is Sals3's, not a capability | ADR-004 §5 is our decision and applies to own-stock conflicts where no provider exists |

## Two defects found by measurement, not by reading code

**Buyer contact leaked in the page payload.** The reveal toggle was cosmetic:
both masked and plaintext values were serialised, so a buyer's name, phone and
street address were readable from view-source without clicking, and the
permission check decorated a decision already made. Found by grepping the
rendered HTML:

```
"revealed":{"name":"Maria Mendez","phone":"+63 917 220 4471","address":...
```

Fixed by moving the real values behind a server action that calls
`requirePermission('order:fulfill')` first. `BuyerIdentity` now carries
`canReveal: boolean` and no plaintext.

**`/orders/<unknown>` answered 200 with a 404 page inside it.** A `loading.tsx`
covers its whole segment *including child routes*, so Next streamed the shell
and committed a 200 before `notFound()` ran. Measured against
`/listings/new?fixture=bogus`, which has no boundary above it and correctly
answered 404. Fixed by moving the list and its skeleton into an
`orders/(list)` route group. The same trap is documented at
`listings/new/page.tsx` — this repo has hit it before.

## An accessibility defect fixed portal-wide

`StatusPill`'s two most urgent tones were its least legible:

| Pair | Ratio | |
|---|---|---|
| `red-600` on `danger-surface` | 4.23:1 | fails |
| `green-600` on `success-surface` | 4.35:1 | fails |
| `red-700` `#b42318` | 5.75:1 | added |
| `green-700` `#15683d` | 5.91:1 | added |

Pre-existing, not introduced here, and it affects every status pill in the
portal. The `-600` values stay for dots and borders where the 3:1 non-text
threshold applies.

## Competitive research

Two live seller accounts were walked and recorded in
[[shopee-orders-ia-and-cj-statuses]]-adjacent detail inside the design note:

- **Shopee** — chips are lane-specific, the counted unit switches per lane,
  status is never a bare pill, at most two actions per row, and a blocked
  action becomes greyed text stating why.
- **Lazada order detail** — splits money into two cards with two grand totals
  and never adds them. Ours needs three, because their sellers hold their own
  stock. Their two big buyer-reliability dials are COD risk scoring and are
  meaningless to a prepaid marketplace; replaced with fulfilment-risk counts.

## Deliberately not built

COD anywhere; seller lending ("Get Quick Funds"); Shopee's `Service Fee` /
`Transaction Fee` and Lazada's LazCoins / Promo Pass lines, which are their
commercial constructs and not ADR-008's single approved commission;
`Block this buyer`; a combined profit figure across the two money rails.

## Still open

1. **Nothing is connected.** Schema + migration, repository against the
   database, then the CJ order worker with webhooks and reconciliation
   (ADR-004 §3). The translator in `cj-status.ts` is tested and has zero
   callers — it is the contract the worker will use.
2. **Commission is a flat 10% placeholder** in the filler fixtures, and
   supplier cost 48% of buyer payment. ADR-008 leaves the real basis pending.
3. **Lane counts are real fixture counts**, not the reference screenshots'
   invented totals. Bogs confirmed sample data is fine.
4. **No reveal audit.** The prototype claimed revealing is recorded against
   the account; no such trail exists, so the sentence was removed rather than
   shipped.
5. **Not pushed.** Eight local commits, no branch on the remote, no PR, by
   explicit instruction.

## Environment notes worth keeping

- `typecheck:clean` renames `.next`, so any running dev server makes the
  pre-commit hook fail with `EPERM`. Stop every `node` process under the repo
  before committing.
- A stale `.claude/worktrees/*` with its own `.next` makes `eslint` walk build
  artifacts — one run emitted 241 MB. Remove merged worktrees.
- Next refuses a second `next dev` in the same directory whatever the port, so
  Playwright cannot start its own server while one is running.

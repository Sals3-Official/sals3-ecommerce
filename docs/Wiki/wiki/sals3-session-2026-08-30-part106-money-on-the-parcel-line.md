---
tags:
  - sals3
  - sals3-portal
  - orders
  - session-note
aliases:
  - Part 106
  - Money On The Parcel Line
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-28-part95-the-orders-workspace-meets-real-rows]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
---

# Part 106 — the parcel line finally shows what it cost

2026-08-30, `sals3-portal`
[#268](https://github.com/Sals3-Official/sals3-portal/pull/268), no new query.

> [!NOTE] Provenance
> Written after the fact from the pull request's own record.

## The screen a seller opens to find a wrong total had no lines to check

The parcel contents card listed five items with a quantity each and no
prices at all. The only figure anywhere on the screen was "Goods" in the
money row three sections below — so a seller who thought a total looked
wrong had no way to find which line made it wrong, which is the question
this screen exists to answer. Each line now carries its own total, the unit
price spelled out whenever more than one was ordered, and the card foots to
the goods figure.

## The footer is handed the total, never computed from the rows above it

Summing the line rows would make the card agree with itself by
construction — the one thing it must not do. Both the footer and the rows
read from `parcelPaidMinor`, so a disagreement between them is a **real**
disagreement rather than an artifact of two different sums. `goodsTotalLabel`
is derived once in the read model because it is printed twice on the page.

Both labels are formatted server-side through `formatParcelMoney` against
the currency frozen on the order row (ADR-007) — handing the client
component minor units would let a market-settings change today restate what
a buyer paid last month. The footnote states plainly what the figure is:
items only, at the prices charged when the order was placed. Shipping, the
Sals3 settlement and the supplier spend stay in the money row as three
totals deliberately never added together, so a footer that read like an
order total would contradict the section beneath it.

No new query anywhere in this change: `unit_amount_minor` and `currency`
were already on the line rows this screen reads.

## Lessons

- **A total with no way to trace it back to a line is a total nobody can
  dispute correctly.** The screen a seller opens specifically to check a
  number needs the number broken down, not just restated.
- **A footer must read the same source of truth as the rows, never sum
  them**, or the two numbers agreeing becomes guaranteed rather than
  meaningful — the exact shape [[sals3-session-2026-08-28-part95-the-orders-workspace-meets-real-rows|part 95]]
  found missing elsewhere on this same screen.
- **Frozen money formats server-side, against the frozen currency, not the
  seller's current market settings** — the standing ADR-007 rule, reapplied
  here with no new column.

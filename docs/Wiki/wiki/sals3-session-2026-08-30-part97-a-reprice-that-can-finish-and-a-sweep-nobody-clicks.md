---
tags:
  - sals3
  - sals3-portal
  - pricing
  - repricing
  - break-glass
  - session-note
aliases:
  - Part 97
  - A Reprice That Can Finish And A Sweep Nobody Clicks
  - The Same 500 Products Every Time
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-session-2026-08-28-part92-one-rule-in-two-units-and-the-first-repricing-path]]"
  - "[[sals3-session-2026-08-28-part93-the-editor-stopped-stamping-every-price-as-the-sellers]]"
  - "[[sals3-session-2026-08-29-part96-the-store-default-stopped-asking-for-a-markup-nobody-used]]"
  - "[[sals3-session-2026-08-30-part98-the-drafts-that-could-never-be-priced]]"
---

# Part 97 — a reprice that can finish, and a sweep nobody has to click

2026-08-29 into 2026-08-30. Part 92 gave the platform its first way to carry a
rule change onto a **live** price. It could not finish, and it had never worked
the way its own dialog described. Three pull requests bounded it, made it
resumable, and then built the thing that actually completes a catalogue —
outside the Portal, on purpose.

| PR | |
|---|---|
| [#248](https://github.com/Sals3-Official/sals3-portal/pull/248) | a reprice run covers one category, never the catalogue |
| [#251](https://github.com/Sals3-Official/sals3-portal/pull/251) | a reprice can now finish a department |
| [#252](https://github.com/Sals3-Official/sals3-portal/pull/252) | a break-glass sweep that can finish the catalogue |

Plus the reporting half of
[#254](https://github.com/Sals3-Official/sals3-portal/pull/254), which is what
makes a sweep result falsifiable at all.

No DDL in any of them.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record, plus the three
> `Pricing Reprice Sweep` GitHub Actions run logs (`33265101173`,
> `33265153591`, `33273685178`) read directly.

## 1. The run that returned the same 500 products forever

The unscoped run selected **every published offer this seller owned**, ordered
by product title, and took the first `MAX_REPRICE_OFFERS` — **with no cursor,
and with no exclusion of the rows it had already found correct**.

So it returned the *same* 500 on every run, and the dialog's advice to *"run it
again to reach the rest"* was **unreachable by construction**: everything past
the 500th product alphabetically had never been repriceable at all.

**Confirmed against production**: two consecutive runs, identical output —
`467 already correct, 33 priced by hand`.

Removing the cap was the obvious repair and the wrong one. Owner decision
2026-08-29, on a catalogue heading for millions of listings: **one query, one
preview table and one button must never stand between a seller and every price
they own.**

## 2. A run names a department and a destination

The check button does nothing until both are chosen. That is bounded by
construction, and it matches what a seller is actually doing — they edited *one*
category's markup, not all of them.

Three things the scope has to get right, each of which is a way to reprice the
wrong products:

| | |
|---|---|
| **The category means its subtree** | `findNearestActiveCategoryPolicy` walks upward, so a markup on a department prices everything beneath it. Matched by **path prefix with the separator attached**: without the `' > '`, a department named `Shoes` would also match `Shoes & Boots`. |
| **Global is not a wildcard** | The Global rule prices offers into every country with no column of its own, so `null` selects `market_code NOT IN (named destinations)`. **No filter at all would let a Global run overwrite Australia's prices with Global's rule.** |
| **The caller sends a code, never a path** | A caller trusted for both could send two that disagree, repricing one category under the name of another. An unresolved code prices **nothing** rather than everything. |

**The scope is re-sent on apply and re-checked there.** Two empty plans share a
fingerprint, so the digest alone would let an apply name a different category
than the preview and still pass as fresh.

`MAX_REPRICE_OFFERS` stays, as a backstop rather than as the normal state.
Hitting it now means one category holds more than 500 live offers — worth being
told about, rather than the everyday condition it used to be.

## 3. Smaller was still not finite

Scoping to one department and one destination made the page smaller but not
bounded, and production said so on 2026-08-30: a reclaim of **Apparel &
Accessories in AU** covered 500 offers, left whatever sat past them untouched,
and then reported **"every live price already matches your rules"**. That one
department in that one destination holds more than `MAX_REPRICE_OFFERS` live
prices by itself.

The advice on screen — *"run it again afterwards to reach the rest"* — still
could not work, because nothing excluded the rows already seen.

**A run now carries a position.** `afterSku` is where the last page ended, and
the query asks for the rows strictly after it.

**The ordering moved from `(title, sku)` to `sals3Sku` alone.** The pair reads
better and *cannot be resumed from one value*: continuing after a title needs
both, and a pair comparison written as two ANDed inequalities **silently skips
rows**. The SKU is unique per variant, so one value is a complete position.

**The position advances only when a page is APPLIED, never when one is merely
checked.** A seller who reads a page and walks away has covered nothing, and
resuming past it would leave a hole exactly where they stopped paying attention.
Changing either selection clears it — a position in one department means nothing
in another.

**The dialog now stays open while a scope has more pages.** Closing sent the
seller back through both selects, and re-choosing a department is what *clears*
the position — so a page would be applied, the dialog would close, and the next
run would start from the beginning again. **That is the same bug this change
exists to end, rebuilt one layer up.**

`afterSku` rides *on* the scope rather than beside it, so the apply's existing
scope comparison covers it: two pages of a large scope can easily share a
fingerprint, and an apply that resumed from a different position than the
preview would write a page nobody looked at.

## 4. What the dialog cannot be is a way to finish

Aligning a catalogue after a rules change is **21 departments across every
destination a seller sells to, several pages deep** — hundreds of reviewed
clicks for a job with no judgement in it, which is how the job does not get
done.

So it lives where the rest of the bulk production work lives: `CRON_SECRET`
-gated, dispatched by hand, reported in counts. **Nothing new appears in the
Portal**, and the owner decision that the screen stays scoped is untouched.

`POST /api/internal/pricing/reprice-sweep`, driven by the `Pricing Reprice
Sweep` workflow. Decisions worth reviewing:

- **One transaction per page, not one for the sweep.** A sweep runs for minutes
  across many scopes; a single transaction would lock nothing useful and block
  everything else, and a failure in the last scope would roll back work already
  correct. Per-page commits are also what make the position resumable.
- **A dry run never advances within a scope.** It cannot: nothing is written, so
  `nextAfterSku` does not move, and advancing on it loops on the same page
  forever. *Removing that guard hangs the test suite rather than failing it.*
  The cost is that a dry run's `changed` is a **lower bound** — the first page
  of each scope — and the endpoint, the workflow and the module header all say
  so.
- **Reclaim is off unless asked by name.** It overwrites human decisions and
  `product_offers` keeps no history. A seller approving that in the dialog has
  read the department it applies to; **nobody reads a sweep.**
- **A version conflict stops the run.** The position is still the last page that
  committed, so a re-run picks up cleanly; continuing would plan the rest
  against a catalogue that just changed underneath it.
- **The budget is checked between pages, never inside one.** A call can overrun
  by one page, which is the price of never leaving a scope half-written.

`applyRepricePlan` is **extracted** from `applyRepriceAction` so the dialog and
the sweep cannot drift. They differ in how a run is chosen and approved, and
that is the whole of the difference — what gets written, and what the audit says
about it, is one implementation.

### What a scope is, in the data

`listSweepScopes` takes the distinct `(seller, department, destination)` triples
that have **`PUBLISHED` offers behind them** — derived from the offers
themselves rather than from the capability list, because a destination a seller
has never published into has nothing to reprice and walking it would spend a
resolver call to learn that.

Departments are found as **taxonomy paths with no `' > '` in them**, because the
taxonomy carries no depth column and deriving the department in SQL would mean
`split_part` in a module that otherwise reads as Drizzle. A product under a
category whose department is missing from the taxonomy is **skipped rather than
repriced under a guess**, and shows up as a shortfall in `scopeCount`.

The order is the primary key of the position, so it is sorted explicitly — an
unordered scan would make `scopeIndex` mean a different scope on the next call.

## 5. A report nobody can check is how the last one survived being wrong

`done: true` with `changed: 0` reads **identically** whether the sweep walked
every page of a 500-offer scope or stopped at the first one. #254 adds
`pagesVisited` and `scopesPaged`, and the workflow **fails when pages is less
than scopes**.

The three production runs show exactly why, and are worth reading in order:

| run | when (UTC) | reported |
| --- | --- | --- |
| `33265101173` | 2026-08-29 17:14 | `call 1: scope 8/8 · changed 0 · written 0 · done=true` |
| `33265153591` | 2026-08-29 17:15 | `call 1: scope 8/8 · changed 0 · written 0 · done=true` |
| `33273685178` | 2026-08-29 20:30 | `call 1: scope 8/8 · pages 9 · changed 0 · written 0 · done=true` |

The first two are **unfalsifiable**: eight scopes visited, nothing changed, and
no way to tell whether any scope was read past its first page. The third, after
#254, reports `pages: 9 (scopes needing more than one: 1)` — eight scopes, one
of which needed a second page, which is the paging from #251 demonstrably
engaging.

All three ran with `RECLAIM: false`; the third with `DRY_RUN: false` against the
live catalogue, and the log says so in its own words before it starts:
`--- APPLYING: buyers see these prices as soon as this finishes ---`.

`changed: 0` across all three is the **correct** result: the sweep found every
published price already matching its rules. That is a real answer only because
the third run can prove it walked the pages.

## What this does not do

- **It does not reclaim hand-priced offers by default,** so the 335 offers part
  93 identified as falsely stamped `SELLER_RETAIL_PRICE_V1` are still carrying
  that stamp unless a run was dispatched with `RECLAIM: true`. None of the three
  production runs was.
- **Nothing on Market Rules yet tells a seller that changing a rule leaves live
  prices where they were.** Recorded as a carry-forward in the ADR-015
  amendment, still true.
- **A sweep is not scheduled.** It is dispatched by hand, and there is no cron
  entry for it.

## Lessons

- **"Run it again to reach the rest" is a claim about a cursor.** With no
  cursor and no exclusion, an ordered `LIMIT` returns the same page forever, and
  the advice reads as reassuring while being unreachable.
- **A pair is a worse position than a unique key.** `(title, sku)` reads better
  and cannot be resumed from one value; two ANDed inequalities over a pair skip
  rows silently. Order by the unique column, even when it reads worse.
- **A position must advance on the write, not on the read.** Advancing on a
  preview leaves a hole exactly where the seller stopped paying attention.
- **Fixing a loop one layer up is still the same loop.** Closing the dialog
  cleared the position, so the paged run restarted from the beginning — the bug
  the paging existed to remove, rebuilt in the UI.
- **A count with no denominator is unfalsifiable.** `done: true, changed: 0` was
  identical for a complete sweep and a sweep that read one page per scope. The
  fix is to report the work, not the outcome.
- **Where a bulk job lives is a product decision, not a technical one.** The
  screen stayed scoped because a million-listing catalogue must never sit behind
  one button; the unbounded version went to break-glass, where the audience is
  an operator and the report is a count.

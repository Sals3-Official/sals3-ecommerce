---
tags: [session-record, sals3, portal, pricing, reprice, market-rules, ux]
aliases:
  [
    "Part 156",
    "A saved margin is an applied margin",
    "26,425 prices the rule had already decided",
  ]
created: 2026-09-09
updated: 2026-09-09
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-07-part152-global-becomes-a-real-offer-destination]]"
  - "[[sals3-session-2026-09-08-part154-the-apex-prices-from-its-own-global-offer]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
---

# Part 156 — A saved margin is an applied margin

> [!NOTE] Provenance
> Written after the fact from the PR's own record and the production reprice
> figures quoted in it and in `sals3-portal` #183.
> [#197](https://github.com/anythingsupplies/sals3-portal/pull/197),
> `anythingsupplies/sals3-portal`, merged 2026-09-08. Promotion PRs not listed.

## 1. The storefront charged the old number all day

On 2026-09-09 the Fiji reprice moved **26,425 live prices** — of **78,886** live
Fiji prices in total. **None of them was a bug.**

The Fiji margin had been changed that morning. Every one of those offers still
carried the price from before it. **The only thing between the rule and the price
was a button nobody had pressed.** Global's had been pressed; Fiji's had not.

> The rule and the price were two steps, and the second was optional.

This is also the correction recorded in
[[sals3-session-2026-09-08-part154-the-apex-prices-from-its-own-global-offer|part 154]]
§4: the lipstick that looked like a *missing* offer was a **stale** one. A price
matching another market's is not evidence of a missing row — a stale row wears
the same number.

## 2. Saving a margin now applies it

Each of the three ways a margin is saved starts the reprice for exactly that
scope, in the tab that saved it, with a progress toast:

| Save | Repriced scope |
| --- | --- |
| Category margin dialog | that category's subtree × that destination |
| Store default dialog | every category × that destination |
| CSV import | every category × **each destination the file changed** — unchanged rows do not count |

Hand-typed prices are never reclaimed — the same default the dialog already had —
and the run says how many it left alone. `applyMarginCsvAction` now returns
`markets`, the destinations whose rules the file **actually** changed, so a
1,491-row import that touched one column does not reprice six.

## 3. It is the loop the dialog already ran, and it never throws

`reprice-after-save.ts` is the same loop `RepriceControls` runs — `runRepriceScopeAction`
to a budget, resume from its cursor until `done` — behind a **one-at-a-time
queue**, so two quick saves do not interleave their pages or their toasts.

**It never throws.** *The save has already landed, so a failure to reprice is
reported, not raised.* Denied, rate-limited (waits and retries), version
conflict, dropped connection and exhausted call budget each get their own
sentence, and **each names *Reprice live products* as the way to finish.** A
partial application that tells the seller exactly how to complete it is a
different thing from a silent one.

### Why the client drives it, not the Server Action

A scope can be tens of thousands of offers, each a resolver call — it fits
neither the action that saved the margin nor any single request budget. The
client already owns the paging loop, the cursor and the toast, so the reprice
rides the surface that can actually finish it.

## 4. What this closes, and what it does not

**Closes:** the class of defect where a correct rule sits above stale prices with
no signal that they disagree. Every save now moves the prices its own rule
decides.

**Does not close:** prices that drift for reasons other than a margin edit — a
supplier cost change, an FX move, a newly authorized market. Those still need
*Reprice live products* or the scheduled path. The button is no longer the
**only** way a rule reaches a price; it is still the way an *unrelated* change
does.

## 5. Verification

`npm run verify` PASS — lint, format:check, typecheck, build and the full unit
suite, with `reprice-after-save.test.ts` new. All local; Actions in this org
unfunded since 2026-09-04.

## Lessons

- **A rule saved is not a rule applied when applying is a separate optional
  button.** The gap is invisible precisely because both halves are working
  correctly.
- **Two steps where the second is optional will be skipped, and the skip is
  silent.** 26,425 wrong prices, no error anywhere, for one day.
- **A follow-on action that cannot be raised must be reported.** The save
  succeeded; the reprice is best-effort, so every failure mode gets its own
  sentence naming the manual way to finish.
- **Scope the follow-on to what actually changed.** A CSV import reprices only
  the destinations whose rules the file moved.
- **Reuse the loop that already terminates.** The dialog's budget-and-cursor loop
  was the only code in the system that could walk a scope of that size; the fix
  was to call it, not to write a second one.
- **Diagnose a suspicious price by repricing first.** A stale row and a missing
  row look identical from the storefront.

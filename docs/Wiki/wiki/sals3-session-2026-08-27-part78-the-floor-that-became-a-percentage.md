---
tags:
  - sals3
  - sals3-portal
  - pricing
  - market-rules
  - adr-015
  - reviews
  - backfill
  - session-note
aliases:
  - Part 78
  - The Floor That Became a Percentage
  - Operating-Expense Floor
created: 2026-08-27
updated: 2026-08-27
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-session-2026-08-27-part77-a-margin-per-destination-and-two-hours-of-refused-saves]]"
  - "[[sals3-session-2026-08-22-part69-buyer-reviews-shipped-and-the-read-that-would-have-taken-orders-down]]"
  - "[[sals3-session-2026-08-21-part60-retail-price-above-supplier-cost]]"
---

# Part 78 — the floor that became a percentage

**Backfill note, written 2026-08-27** from merged PR bodies, the code on
`develop`, and one GitHub Actions run log. Claims resting only on a PR body are
labelled.

Three PRs, all merged 2026-08-25 UTC:

- [#193](https://github.com/Sals3-Official/sals3-portal/pull/193) 15:54Z —
  `delivered_at` is decoded instead of asserted (commit `9d49ddf`)
- [#201](https://github.com/Sals3-Official/sals3-portal/pull/201) 18:45Z — the
  percentage form of the operating-expense floor, and its break-glass route
- [#202](https://github.com/Sals3-Official/sals3-portal/pull/202) 19:24Z —
  migration `0030_lean_blizzard`, and a screen to set it from

The code comments date the owner's decision **2026-08-26**; the merges are
2026-08-25 UTC. Both are right — the commits are `+0800`, so `2026-08-26 02:21`
local is `2026-08-25 18:21` UTC. Same evening, not a later reversal.

## 1. ADR-015 says this does not happen

The governance position is unambiguous and, as of this writing, **unretracted**.
ADR-015's `Amendment — 2026-08-25`, decision point 3:

> The contribution floor stays absolute and becomes per-market too. It does
> **not** become a percentage. §1's reasoning is unchanged…

[[hot]] carries the same sentence, with the argument: *"two rules both
proportional to cost never cross, so a percentage floor would silently be a
second margin."*

The evening of the same day, `pricing_store_defaults` gained
`min_contribution_rate`.

**No ADR amendment was written.** The vault's ADR-015 still holds exactly four
amendments — 2026-08-14, 2026-08-19, 2026-08-21, 2026-08-25 — its frontmatter
still reads `updated: 2026-08-25`, and `grep -rl "min_contribution_rate" docs`
across the whole vault returns nothing. Neither PR body names ADR-015 or
acknowledges the contradiction. The only record of the reversal was five source
comments and a commit message until this note; **an amendment is being added
alongside it**, because "deviating from ADR-015 is allowed and is recorded by
amendment" is the rule this project already set for itself.

## 2. Was the old argument wrong? Half of it

This is the part worth getting exactly right, because the wrong version of it is
quotable in either direction.

**The arithmetic in the old argument is correct.** The new rate is a gross
margin on *revenue* — `marginFloorMinor` delegates to `suggestedPriceMinor`, the
very function the target margin uses (`src/modules/pricing/money-math.ts:159`):

```
price = cost / (1 - rate)
```

so `profit = price × rate`. As a function of cost, the floor price
`cost/(1−r)` and the margin price `cost/(1−m)` are both **lines through the
origin**. They never cross; their order is fixed by whether `r > m`, at every
supplier cost. The code says so about itself: the preview reports **rates rather
than prices** *"because the answer is cost-independent"*, and the screen prints
*"This holds at every supplier cost."*

**What was wrong was the conclusion's scope.** The old reasoning silently
assumed the floor is compared against *the store default's own* margin. It is
not. `resolver.ts:133-182` resolves `targetMarginRate` from whichever layer won
— `PRODUCT_OVERRIDE`, `VARIANT_OVERRIDE`, `CATEGORY`, or `STORE_DEFAULT` —
while the floor always comes from the store default. #202 states it plainly:

> That is true — **against the store default's own margin**. But the margin the
> resolver floors is whichever layer won, and a *category* set below the floor is
> exactly the case the rule exists for.

Pinned by test (`resolver.test.ts:505-519`): cost 1000, category margin 20% →
1250; a 40% minimum → `1000/0.6` = **1667**, with `resolvedLayer === 'CATEGORY'`
and `contributionFloorApplied === true`. The converse is pinned too — a 10%
minimum against a 20% category margin changes nothing.

So the honest statement is: **the percentage floor is not a second margin at the
same layer; it is a cross-layer clamp on the margin itself** — a floor under
`targetMarginRate` rather than under contribution. That is something the absolute
floor genuinely cannot express, and it is a *different rule* from the one §1
refused.

A second justification, verified in code: **the rate needs no currency.** The
amount form fails closed on `CONTRIBUTION_FLOOR_CURRENCY_MISMATCH`
(`resolver.ts:293`); the rate branch has no currency check at all, and a test
pins that an AUD floor currency still prices under the rate form.

## 3. The two forms are mutually exclusive — and that is the part with a cost

`drizzle/0030_lean_blizzard.sql` adds `min_contribution_rate numeric(8,6)` to
`pricing_store_defaults` **only**, with two checks:

```sql
CHECK (NOT (min_contribution_rate IS NOT NULL AND min_contribution_minor > 0))
CHECK (min_contribution_rate IS NULL OR (rate > 0 AND rate < 1))
```

The exclusivity is written against `> 0` rather than `IS NOT NULL` because
`min_contribution_minor` is `NOT NULL DEFAULT 0`. The owner's rule, recorded at
five code sites: *"a margin must never fall below what it costs to operate, and
that minimum is expressible **either** as a percentage **or** as a fixed amount
— never both on the same rule."*

The resolver branches accordingly (`resolver.ts:266-308`), so the `max()` that
combines them is structurally never a real contest — one operand is always the
degenerate `cost + 0`.

**The consequence is recorded nowhere else, and it is real: choosing the
percentage turns the absolute floor off for that rule.** ADR-015 §1's own reason
for an absolute floor — the per-order costs that do *not* shrink on a cheap item
— is unprotected on any rule that uses a percentage. On a US$2 supplier cost an
18% rate floors the price at US$2.44, contributing 44 cents against freight the
2026-08-24 measurements put between $3.70 and $16.01. No PR body, code comment
or ADR text addresses this trade-off. It is not an argument against the
percentage form, which answers a different question well; it is the thing to
weigh before setting one.

## 4. The screen the floor never had

Until this PR the section existed and **no page rendered it** — the page comment
now says so: *"until 2026-08-26 this section existed but was rendered by no page
at all — so the floor the resolver already applied could not be set from
anywhere."*

`StoreDefaultCard.tsx` (392 lines) was deleted in favour of
`StoreDefaultsTable.tsx` — one row per destination,
`Destination | Base margin | Minimum | Rounding | Edit` — plus
`StoreDefaultDialog.tsx` and a shared `store-default-model.ts`. Reads use
`findStoreDefaultForScope`, the exact-scope read rather than the resolving one,
*so the editor cannot show Australia's rule under Fiji's heading* — the same
distinction part 77 §3 records.

The choice between the two forms is **a fieldset, not a radio**: two inputs side
by side under the legend *"Minimum — never price below this"*, helper *"Your
operating expenses. Use a percentage or an amount, not both."* Typing in either
disables the other and shows *"Clear the amount to use a percentage instead."*
The reason is in the comment — a form that silently drops what someone typed
teaches people not to trust it. Percentage is listed first, deliberately,
because it needs no currency.

Three gates enforce exclusivity: the disabled field, a `.refine` on
`saveStoreDefaultInputSchema` surfacing *"Set a minimum as a percentage or as an
amount, not both"*, and the database `CHECK`.

The preview switches axis with the form — three sample supplier costs for an
amount (with the crossover `cost = floor × (1−m)/m`), three sample *category
margins* for a rate — and calls the resolver's own `suggestedPriceMinor` /
`applyContributionFloor` / `applyRounding` rather than a second copy of the
formula.

**Two live defects fixed in passing**, both of the scope family part 77 §7
describes:

- `saveStoreDefaultAction` passed a hard-coded `null` to
  `findStoreDefaultForScope`, so a save for Australia decided create-vs-revise
  from the all-destinations row and revised *that*.
- `reviseStoreDefault`'s insert had listed every column except `marketCode`, so
  revising a scoped rule inserted a NULL scope and **silently moved it to all
  destinations**. The added line is commented "load-bearing" — the same
  every-column-named hazard [[hot]] records for Drizzle inserts.

## 5. The DDL reached production; the ledger row did not

`Pricing Migrate Opex Floor`, run `32885812368`, 2026-08-25T18:47:23Z — two
minutes after #201 merged, 37 minutes before #202:

```
--- schema state before ---
{"ok":true,"columnExists":false,"constraintsExist":false}
{"ok":true,"columnExistedBefore":false,"constraintsExistedBefore":false,
 "statementsRun":5,"columnExistsAfter":true,"constraintsExistAfter":true}
Verified: min_contribution_rate and both floor constraints exist.
```

**Open item.** `markMigration0030Applied` was added *by #202*, after that run,
and `gh run list` shows exactly one run of this workflow ever. The 18:47
response carries no `migrationRecord` field, confirming it executed the pre-#202
module. So production has the column and both constraints while
`__drizzle_migrations` does not record `0030_lean_blizzard`. The module's own
doc says the gap "closes on a second run" — **that second run has not
happened.** This is inferred from the run log and run count; the production
table's contents were not queried.

Compare part 77 §6, where the ledger row for `0029` *was* written by its run and
matched journal entry 29's `when` exactly. The difference between the two is a
useful reminder that applying DDL and recording that you applied it are separate
successes.

## 6. `sql<Date>` is a type lie, and a buyer found it

Separate from the pricing work, and the sharpest lesson of the three.

The **first review anybody tried to post in production failed**:

```
error λ POST /api/storefront/reviews
TypeError: a.toISOString is not a function
    at i.mapToDriverValue
```

The cause, in `src/modules/reviews/eligibility.ts`:

```ts
const deliveredAt = sql<Date>`coalesce(${fulfillmentGroups.carrierDeliveredAt}, ${fulfillmentGroups.updatedAt})`;
```

A raw drizzle `sql` template carries **`noopDecoder`**, so `<Date>` is a
compile-time assertion with **nothing behind it at runtime** — whatever the
driver returns passes through untouched. That value flowed into the insert,
where `PgTimestamp.mapToDriverValue` calls `value.toISOString()`.

Three things made it reachable and then hid it:

1. **Read/write asymmetry.** `listLineReviewStates` compares the same expression
   *inside SQL* and reads back a boolean, so the read path never touched the raw
   value. The order list therefore rendered a "write a review" button the write
   path could not honour — #193 calls this *"the one asymmetry that made this
   reachable by a buyer."*
2. **Error masking.** The route's catch answers **503**, outside the set the
   storefront maps, so the buyer got the catch-all *"Your review could not be
   posted. Try again in a moment."* — advice, the body notes, *"that could never
   come true."* **This was diagnosed and deliberately not changed**, so a genuine
   failure still shows a buyer advice that cannot come true.
3. **A green suite in both repositories.** `eligibility.test.ts` drives a
   hand-built fake whose `then` resolves canned rows, so drizzle's result mapping
   never runs. The fake is *right for its job* — it renders the real `WHERE` and
   proves the authorisation predicate — and simply cannot see this class of
   defect. The remedy was to export the decoder and test it directly, because
   *"a behavioural test through the fake would have passed whatever the function
   did."*

The defect was present from the file's creation on 2026-08-22
(`feat(reviews): a delivered parcel is what unlocks a review`), three days
earlier. The insert had never executed against real Postgres before that day,
because `Reviews Migrate Product Reviews` had no runs until 2026-08-25 — so the
first real execution was a buyer's (PR-body claim about another workflow's
history; not re-verified).

**The fix** is `asDeliveredAt(value: unknown): Date`, delegating to
`fulfillmentGroups.updatedAt.mapFromDriverValue` and then asserting
`instanceof Date` with a valid time, attached via `.mapWith()` — the type is
*earned from the decoder* rather than annotated. **A number is refused rather
than converted**, because the instant anchors the review edit window and
guessing epoch units would move a buyer's deadline by 1000×.

**Not closed:** the actual driver value was never observed. `postgres.js`
registers parsers for the relevant OIDs returning a `Date`, and both columns are
`timestamp with time zone`, *"so a string is not what that combination predicts,
and I could not reach the production database from here to check."* The stated
confirmation — the `TypeError` disappearing from the next real submit — **does
not exist in any artefact**. If it persists, #193 narrowed rather than fixed it.

## 7. What is not proven

- **No ADR-015 amendment existed** for the percentage floor (§1). The one added
  with this note is written from the shipped code, not from an owner
  conversation this session had.
- **The `0030` ledger row is unwritten** (§5).
- **The percentage floor has never priced a real product**, as far as can be
  established from the repository.
- **No e2e coverage for the new screen.** `e2e/seller-center-market-rules.spec.ts`
  holds three tests, none touching store defaults, the floor fields, or the
  exclusivity. `StoreDefaultDialog.tsx` has no dedicated test file.
- **A regression neither PR mentions:** the deleted `StoreDefaultCard` rendered
  `DeactivateStoreDefaultButton` and `PolicyHistoryButton`;
  `StoreDefaultsTable.tsx` renders neither, and the deactivate component is now
  orphaned dead code. Mitigating: since no page rendered that section before
  #202, those controls were never reachable in production — lost *potential*,
  not lost live function.
- **The resolver's estimate cannot say which floor fired.** It reports
  `minContribution` as `{amountMinor, currency}` only, so a price set by the
  percentage floor appears as `contributionFloorApplied: true` with
  `amountMinor: 0`. Any consumer or audit trail reading that payload cannot tell
  the two apart.
- **Still true, from #202:** a margin binds at publish and publish takes one
  destination from `seller_market_profiles` — AU today — so per-country floors
  are forward-looking configuration for the other five.
- **Still open from the 2026-08-25 amendment:** no destination *rate* is
  approved (the dimension is authorised, not the numbers), and the 2026-08-21
  flat 2.5% manual-entry floor remains unreconciled with §1's floor.
- Verify counts are PR-body claims: #193 2,593 unit / 70 e2e; #201 and #202 both
  2,728 unit (4 skipped) / 79 e2e. The identical totals across #201 and #202 are
  plausible as a net wash but were not re-run.
- Whether `d3656e6` has deployed, and therefore whether the screen is live for
  sellers today, could not be determined.

## 8. What to carry forward

**`sql<T>` in drizzle is an assertion, not a decoder.** A raw `sql` template
carries `noopDecoder`, so any `sql<Date>` or `sql<number>` selected and then
written back is unvalidated at runtime — only a column reference or an explicit
`.mapWith()` has a real decoder behind it. Worth grepping for wherever a raw
template's value crosses back into an insert.

**A read path that evaluates in SQL cannot vouch for the write path that
doesn't.** The eligibility check compared the timestamp inside Postgres and
returned a boolean; the insert carried the value itself. One worked for three
days while the other could never have worked, and the button the working half
rendered is what took a buyer to the broken one. When one predicate has two
implementations, ask which of them ever touches the raw value.

**Applying DDL and recording that you applied it are two successes.** `0029`
wrote its ledger row; `0030` did not, because the code that writes it shipped in
the PR *after* the run. If the break-glass module gains a ledger step, the run
that used the older module needs repeating.

**An exclusive choice removes what it replaces.** The percentage floor is a
better instrument for clamping a margin across layers, and it silently retires
the only instrument that answered fixed per-order cost. Neither is wrong; the
danger is a screen that presents them as two spellings of one idea.

**Governance drift is quiet.** The shipped behaviour contradicted a standing ADR
amendment for two days, and nothing in either PR mentioned the ADR at all. Code
comments are where a decision gets *made*; the ADR is where it can be *found*.

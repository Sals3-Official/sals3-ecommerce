---
tags:
  - sals3
  - sals3-portal
  - pricing
  - market-rules
  - migration
  - session-note
aliases:
  - Part 96
  - The Store Default Stopped Asking For A Markup Nobody Used
  - Reserve Became Opex
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[sals3-session-2026-08-28-part92-one-rule-in-two-units-and-the-first-repricing-path]]"
  - "[[sals3-session-2026-08-27-part78-the-floor-that-became-a-percentage]]"
  - "[[sals3-session-2026-08-30-part97-a-reprice-that-can-finish-and-a-sweep-nobody-clicks]]"
---

# Part 96 — the store default stopped asking for a markup nobody used

2026-08-29 into 2026-08-30. `pricing_store_defaults` carried **two unrelated
numbers on one row**, in **two different units**, and the owner could not tell
them apart — correctly, because nothing on the screen said which base each one
was a share of. Six pull requests took the row down to the one number that
actually fires, made it readable, put it in the price explainer, and finally
renamed it to what the money is.

| PR | |
|---|---|
| [#244](https://github.com/Sals3-Official/sals3-portal/pull/244) | one unit on the store default dialog, not two |
| [#245](https://github.com/Sals3-Official/sals3-portal/pull/245) | let a store default exist without a base markup (DDL) |
| [#246](https://github.com/Sals3-Official/sals3-portal/pull/246) | the store default is the reserve, and nothing else |
| [#247](https://github.com/Sals3-Official/sals3-portal/pull/247) | show the reserve in the working, even when it loses |
| [#250](https://github.com/Sals3-Official/sals3-portal/pull/250) | an unset reserve reads as a destination not set up yet |
| [#257](https://github.com/Sals3-Official/sals3-portal/pull/257) | call it opex, because that is what it is |

Migration `0034_worried_kree`. One DDL statement, applied to production before
the code that depends on it.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record, plus the GitHub
> Actions run log for the production DDL (run `33215886267`) read directly.

## 1. Two bases, one dialog, nothing saying which

`Base markup over cost` was a share of the **cost**. The reserve beside it was a
share of the **selling price**. Both rendered as a bare percentage in adjacent
fields, so `50` got typed where `33.33` was meant, and the worked-example table
underneath was unreadable because it spoke the unit nobody had entered.

#244 makes the reserve a **markup** too, converting to the stored margin rate at
the same boundary the base markup already used. Nothing about storage or the
resolver changes — only what a person reads and types. `50` in that field now
means what the owner thought it meant: **the price never falls below cost plus
half.**

The comparison survives the change of unit for a reason worth keeping:
comparing markups gives the same answer as comparing the margins they convert
to, because `k / (100 + k)` is **strictly increasing**. So the table decides
exactly what the resolver decides while showing the unit that was typed — and it
can express a markup past 100, which the old margin guard refused outright.

The hint that had been added to translate between the two units went with the
gap it was bridging, along with two rate helpers nothing called any more.

## 2. The row does two unrelated jobs

Named plainly in #245, and this is the fact everything else in this note follows
from:

| column | what it is | when it is read |
| --- | --- | --- |
| `target_margin_rate` | the markup for a product whose **category has no rule of its own** | only through `nearestCategoryPolicy === null` in `resolveProductPricing` |
| `min_contribution_rate` / `min_contribution_minor` | the operating-expense floor | for **every** product, whichever layer priced it |

Owner decision 2026-08-28: **every category carries its own markup**, so the
fallback half never fires — but the floor half is wanted, and the floor has
nowhere else to live. `NOT NULL` therefore forced a seller to invent a number
that does nothing in order to state the number that does everything, and the two
sat side by side looking like alternatives.

## 3. The DDL, and why it ran first

`0034_worried_kree.sql` is one statement:

```sql
ALTER TABLE "pricing_store_defaults" ALTER COLUMN "target_margin_rate" DROP NOT NULL;
```

**Null means "no store-default fallback", not zero.** A zero base markup is a
rule that prices at cost; an absent one is the absence of a rule, and a product
whose category also has no markup then has **no price at all**
(`PRICING_POLICY_REQUIRED`) rather than a silently free one. That distinction is
the entire reason this is a `DROP NOT NULL` and not a `DEFAULT 0`, and why
nothing backfills.

**No range check ships alongside it,** and the asymmetry with
`pricing_store_defaults_floor_rate_range` is deliberate: `ADD CONSTRAINT`
validates existing rows, so a single legacy row holding a `0` would abort the
transaction and take the `DROP NOT NULL` down with it — losing the half that
matters over the half that does not. `isValidTargetMarginRate` already refuses
those values on every write path.

**The ordering hazard is the opposite of the usual one.** Dropping a `NOT NULL`
only widens what the column accepts, so code that still always writes a value
keeps working — this DDL is safe both early and late. What is *not* safe is the
reverse order for the code: a deployment that stops writing the column before
the constraint is gone would fail **every** store-default insert. Hence #245
ships and runs, then #246 stops writing.

**Applied to production 2026-08-28 22:12:59Z**, workflow `Pricing Migrate
Optional Base Markup`, run `33215886267`, and the log carries its own before and
after:

```
--- schema state before ---
{"ok":true,"baseMarkupIsRequired":true}
--- applying migration ---
{"ok":true,"wasRequiredBefore":true,"statementsRun":1,"isRequiredAfter":false}
--- verifying the column is nullable ---
Verified: target_margin_rate is nullable.
```

> [!IMPORTANT] This one deliberately does not write the migration ledger
> `migrate-opex-floor.ts` writes a `drizzle.__drizzle_migrations` row because
> its DDL is an `ADD COLUMN` that reached production before the migration file
> existed — a later `db:migrate` would try to add a column already there. A
> `DROP NOT NULL` is **idempotent**: replaying it against an already-nullable
> column is a no-op, so a lagging ledger costs nothing here, and pinning a hash
> constant that has to be re-derived by hand would cost more than it saves.
> This is a *reasoned* ledger gap and must not be confused with `0030`'s
> accidental one, which is still open in [[hot]].

Rollback story: re-adding the constraint is a plain `SET NOT NULL`, which
succeeds as long as no row has since been written without one. "Stop writing
nulls, then re-add" — not a data repair.

The real hazard named in the module is the lock, not the change: `ALTER TABLE`
takes an `ACCESS EXCLUSIVE` lock, so if a long query holds the table, every
pricing read and policy write queues behind it. Failing fast is the rollback
story for a DDL that otherwise has none.

## 4. The screen stops asking

#246 takes the field off the dialog and stops writing the column.

- The dialog is **one fieldset** — percentage or amount, rounding, reason. A
  reserve is optional, so the save button no longer waits for a markup that is
  not there.
- The preview loses the three-cost table. It existed to demonstrate a
  **crossover between two numbers**, and with one number left it would have had
  to invent the markup to draw itself.
- The table loses its `Base markup` column, and the section is renamed to what
  it now is.
- `Category markups` keeps its warning but **asks a different question**. It
  used to check for a store-default row, which will now be absent for every
  scope forever. It checks **DEPARTMENT coverage** instead: inheritance only
  walks up, so a category is uncovered exactly when the department above it has
  no markup — *the roots decide the whole tree without walking it.*
- The audit event records `minContributionRate`, which it had never carried
  despite that field existing since 2026-08-26, and records the base markup a
  save **clears**, so a rule that loses its fallback stays reconstructable.

**A revision clears the markup rather than carrying it forward**: a value the
screen cannot show is a value nobody can correct. The superseded row keeps it in
history either way.

## 5. The reserve appears in the working, even when it loses

The owner set a 50% reserve, opened a product to check it, and the price
explainer said **nothing** — so *"the reserve is set and this markup clears it"*
and *"the reserve never saved"* looked identical, and the only way to tell them
apart was to reload and guess.

The resolver had been computing the reserve's own price and **throwing it
away**: the amount form as `cost + floor`, the rate form as
`marginFloorMinor(cost, rate)`, used for one comparison and then discarded,
leaving `contributionFloorApplied` as the only signal. That boolean answers *did
the reserve win* — which is not the question a seller who has just configured
one is asking.

`reserveFloorPrice` keeps it, and the tooltip draws it either way:

```
Supplier cost           $4.86
+ 1.5% funding buffer   $4.93
x 3.00 (200% markup)   $14.79
Your reserve            $7.40
```

Deliberately **not** `flooredMinor`, which is `max(reserve, markup price)` and
equals the markup price whenever the reserve loses — reporting that would tell a
seller their reserve produced the number their markup produced, which is the
exact confusion this exists to end.

`null`, never zero, when no reserve is configured. Falling out of the arithmetic
as `cost + 0` would put **"Your reserve US$10.00"** on screen for a seller who
has set none — answering the question wrongly rather than not answering it.

#254 later trims the accompanying sentence: *"Your markup is above your reserve,
so the reserve did not change this price"* was true on **every row** of an
account whose markup clears it everywhere, which is a permanent paragraph under
a sum that changes. The number stays; the sentence appears only when the reserve
actually set the price.

## 6. `None` was reading as a decision

#250. An unset reserve rendered as `None`, which reads as a **configured floor
of nothing** — a deliberate "no reserve". So every destination nobody had
touched looked like a gap somebody had left, and kept being reported back to the
owner as work to do.

Owner decision 2026-08-29: a scope with no reserve is **a country they have not
turned on**, and the screen should say that.

The wording is deliberately narrow. Nothing here stops a product pricing or
selling into that destination, so it says the **reserve is unset** rather than
that the country is closed — *a label asserting a gate that does not exist is
worse than the ambiguous one it replaces, because nobody finds out until
somebody buys.*

## 7. It was never "reserve". It is opex

The owner asked what a *reserve* was **three times across two rewrites of the
worked example underneath it**. The arithmetic was never the confusing part. The
word was: **reserve named the mechanism instead of the money.**

Owner decision 2026-08-30, in their words: *50% means half of what you pay the
supplier is set aside for opex, and nothing sells below cost plus that.*

The tooltip puts it under the cost it is a share of, rather than at the bottom
next to a verdict:

```
Supplier cost              $4.86
+ 1.5% funding buffer      $4.93
Never below (50% opex)     $7.39
x 3.00 (200% markup)      $14.79
```

`Never below` and **not** `+`, because it is a floor and not a step: the markup
line multiplies the **buffered** cost, not this one, and a `+` here would draw
the price as built on the wrong number.

**The percentage is derived, not plumbed.** `floor / effectiveCost - 1` is what
the seller typed, computed from two of the resolver's own figures rather than
carried through as a third. It is a **label** — no price is computed from it,
which is the whole line between this and a second pricing formula. Dropping it
fails a test.

The store-default dialog loses its second worked-example table as well. The
first was three supplier costs in and three prices out, from when the screen
also carried a base markup; the second was three sample category markups against
the floor. Both were read; neither answered the question. One sentence carrying
the seller's own number replaces them:

> On a US$10.00 supplier cost, 50% is US$5.00 set aside for operating expenses —
> so nothing sells below US$15.00.

`Reserve` is gone from the section heading, the table column, the field labels
and the tooltip, and **a test asserts the word never renders.**

## What was deliberately not done

**The base markup column still exists.** #244 records the owner also asking for
it to be removed outright; `target_margin_rate` is still there, now nullable,
still read by `resolveProductPricing` when a category has no rule. Dropping it
needs a decision about what those categories fall back to, and that decision has
not been taken. Today the answer is `PRICING_POLICY_REQUIRED` — **no price,
loudly** — which is the safe reading of an absent rule but is not the same as
the column being gone.

## Lessons

- **Two numbers in one dialog need two bases named, or one base.** The fix was
  not a better label; it was making both fields a markup over cost so there is
  only one base to misread.
- **A column that is `NOT NULL` for one of its two jobs taxes the other one.**
  One row doing two unrelated things forces every consumer of the useful half to
  satisfy the useless half.
- **Null is not zero, and the difference is a pricing outcome.** Absent rule
  gives `PRICING_POLICY_REQUIRED`; a zero rule prices at cost. `DEFAULT 0` would
  have turned one into the other silently.
- **A value computed and discarded is a question already answered.** The
  resolver knew the reserve's price all along; the explainer was empty because
  nobody kept it.
- **Renaming is a fix when the word is the defect.** Three owner questions about
  the same arithmetic were not three misunderstandings — they were one bad noun.
- **A sentence that is true on every row is not information.** The reserve
  verdict was correct and permanently on screen, which is how it stopped being
  read.
- **Not every break-glass DDL needs a ledger row, but the reason has to be
  written down.** `0034` skips it because `DROP NOT NULL` replays harmlessly;
  `0030` skipped it by accident and is still a discrepancy.

---
tags:
  - sals3
  - sals3-portal
  - pricing
  - market-rules
  - adr-015
  - backfill
  - session-note
aliases:
  - Part 77
  - A Margin Per Destination
  - Per-Destination Pricing Stack
created: 2026-08-27
updated: 2026-08-27
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[sals3-session-2026-08-19-part57-margin-inheritance-market-rules-rebuild-and-eleven-merged-prs]]"
  - "[[sals3-session-2026-08-25-part73-image-specs-a-mirror-leak-and-a-test-that-assumed-its-upstream]]"
  - "[[sals3-session-2026-08-27-part78-the-floor-that-became-a-percentage]]"
---

# Part 77 — a margin per destination, and two hours of refused saves

**This is a backfill note, written 2026-08-27 from merged PR bodies, the code on
`develop`, and two GitHub Actions run logs.** Nobody wrote it during the work.
Where a claim comes only from a PR body and could not be checked against the
repository, it is labelled as such — the browser observations and the verify
counts are the main examples. The production evidence in §6 is the exception:
it was read out of the workflow logs directly and does not depend on trusting
anything a PR body says.

ADR-015's `Amendment — 2026-08-25` approved per-destination margins and left
them explicitly unbuilt, "so the reversal is recorded before anything is
written". [[hot]] still files them under *approved decision governance, not
implemented*. **They shipped the same day, in nine PRs.**

Merge order and times, all 2026-08-25 UTC:

| Time | PR | What it did |
|------|----|-------------|
| 11:57 | [#186](https://github.com/Sals3-Official/sals3-portal/pull/186) | the DDL, and the break-glass route that applies it |
| 12:47 | [#187](https://github.com/Sals3-Official/sals3-portal/pull/187) | the resolver learns a destination |
| 13:37 | [#188](https://github.com/Sals3-Official/sals3-portal/pull/188) | supplier mirrors hidden unconditionally |
| 14:34 | [#190](https://github.com/Sals3-Official/sals3-portal/pull/190) | a scope selector on the screen |
| 15:23 | [#192](https://github.com/Sals3-Official/sals3-portal/pull/192) | six destinations opened |
| 16:32 | [#194](https://github.com/Sals3-Official/sals3-portal/pull/194) | every category save starts working again |
| 16:48 | [#195](https://github.com/Sals3-Official/sals3-portal/pull/195) | the data migration, fanning 213 rules into six |
| 17:19 | [#197](https://github.com/Sals3-Official/sals3-portal/pull/197) | the selector is deleted; a column per destination |
| 18:22 | [#200](https://github.com/Sals3-Official/sals3-portal/pull/200) | a saved rule is visible without a reload |

## 1. `null` is the unscoped rule, not a missing value

`drizzle/0029_jazzy_senator_kelly.sql` (journal index 29, `when`
`1787659573173`) adds one nullable `market_code text` column to
**`pricing_category_policies`** and **`pricing_store_defaults`**, and that
nullability is the whole design. From
`src/modules/pricing/migrate-per-market-scope.ts`:

> **`null` is the unscoped rule, not a missing value.** Every policy that exists
> today keeps its exact current meaning the moment the column lands, and no
> backfill is required to preserve behaviour — which is the whole reason the
> column is nullable rather than `NOT NULL DEFAULT 'AU'`.

A `NOT NULL DEFAULT 'AU'` would have silently converted 213 store-wide rules
into Australia-only rules, and nothing would have reported the day five
destinations stopped being priced.

The interesting half is the indexes. Each table's single `..._active_key` is
**dropped and replaced by two partial uniques**:

```sql
CREATE UNIQUE INDEX "pricing_category_policies_active_all_markets_key"
  ON "pricing_category_policies" ("seller_account_id","category_id")
  WHERE status = 'ACTIVE' AND market_code IS NULL;
CREATE UNIQUE INDEX "pricing_category_policies_active_market_key"
  ON "pricing_category_policies" ("seller_account_id","category_id","market_code")
  WHERE status = 'ACTIVE' AND market_code IS NOT NULL;
```

One composite index would not have worked, and the module's own comment says
why: *"Postgres treats `NULL`s as distinct in a unique index, so two `ACTIVE`
all-destinations policies for one category would both have been accepted."*
The all-markets index is the old index plus an `IS NULL` predicate, which is
also what lets it create cleanly over rows that already exist. Because the two
indexes are disjoint, one category can legitimately hold an all-destinations
rule **and** a rule for a named destination at the same time — which is exactly
the two-dimensional shape the amendment asked for, expressed as a constraint
rather than as a convention.

Shape is enforced in the database, not only in Zod:
`CHECK (market_code IS NULL OR market_code ~ '^[A-Z]{2}$')` on both tables.

Two details from the DDL module worth carrying forward. All twelve statements
are idempotent **without** an exception handler — each `ADD CONSTRAINT` is
preceded by `DROP CONSTRAINT IF EXISTS`, because there is no
`ADD CONSTRAINT IF NOT EXISTS` and, as [[hot]] already records, a `catch` inside
one shared transaction is useless once the first already-existing object has
poisoned it. And the lock timeout is `SET LOCAL DDL_LOCK_TIMEOUT = '5s'`:
session-level would leak onto whatever unrelated query reuses that pooled
serverless connection next.

## 2. Depth beats market, and the owner said so explicitly

The resolution rule is eight lines, in `outranks()`
(`src/modules/pricing/repository.ts:182`):

```ts
if (row.category.path.length !== best.category.path.length) {
  return row.category.path.length > best.category.path.length;
}
// Same category: the destination-specific rule is the more specific answer.
return row.policy.marketCode !== null && best.policy.marketCode === null;
```

Depth is tested first; market decides only a tie. The doc comment records the
decision and the reason:

> **Depth beats market** — owner decision, 2026-08-25, confirmed explicitly… if
> market outranked depth, setting a single country rate on a department would
> silently override every product-level decision beneath it, and nothing in the
> UI would show that it had.

A deeper category carrying only an all-destinations rule therefore outranks a
shallower one carrying a rule for this exact destination. That is the
counter-intuitive case, and it is the one the owner was asked about.

`findNearestActiveCategoryPolicy` widens rather than narrows —
`OR(eq(marketCode, marketCode), isNull(marketCode))` — then reduces with
`outranks`. There is no `.limit(1)`, deliberately.

**The market input is required and never defaulted.** `marketCode: string` is
non-optional on `PricingResolutionInput` (`src/modules/pricing/types.ts:87`) and
the resolver refuses before it reads anything
(`src/modules/pricing/resolver.ts:103`):

```ts
if (!/^[A-Z]{2}$/.test(input.marketCode)) return unavailable('MARKET_REQUIRED');
```

`create-draft.ts:750` passes `''` on purpose, and says why: passing `'AU'` to
satisfy the type *"would be exactly the inferred commercial input ADR-015's
amendment refuses"*. When nothing matches, the answer is
`PRICING_POLICY_REQUIRED` — there is no fallback to another destination.

One as-built caveat that no PR body mentions and that I could not resolve
against ADR-014's intent: **`publishProduct` falls back to `destinations[0]`**
— Australia — when a seller has no `seller_market_profiles` row
(`src/modules/catalog/products/publish.ts:429-430`), and refuses
`NO_ACTIVE_MARKET_PROFILE` only when even that is undefined. #192 and #197 both
say publish "resolves its own market from `seller_market_profiles`", which is
true of the primary path only.

## 3. Resolving and editing are deliberately different reads

This is the subtlety most likely to be undone by a later refactor that notices
"duplicate" queries.

- `findNearestActiveCategoryPolicy` / `findActiveStoreDefault` **resolve**: they
  fall back from scoped to unscoped, because pricing an item must find whatever
  rule governs it.
- `findActiveCategoryPolicy` / `findStoreDefaultForScope` **match one scope
  exactly, with no fallback**: they are the screen's read and the compare-and-set
  read behind every save.

`findActiveCategoryPolicy`'s comment states the hazard plainly: resolving here
*"would let a save that believes it is revising an all-destinations rule
actually supersede a destination-scoped one, or the reverse."* Consistently,
`reviseCategoryPolicy` / `reviseStoreDefault` take **no** `marketCode` at all —
the previous row's scope carries forward and cannot be changed by a revision.

`findActiveStoreDefault` also lost its `.limit(1)`: *"Taking the first row of two
would have made the answer depend on Postgres's physical ordering."*

## 4. Six destinations, and what being offerable is not

#192 opened `AU, NZ, PH, US, CA, FJ`, as
`buyer-destination-country-v3-six-measured`, source
`owner-instruction-2026-08-25-open-six-measured-destinations`
(`src/lib/country-policy/buyer-destination-country.ts:75`). The four new entries
join `PILOT_DESTINATIONS` with `readiness: 'BOUNDED_PILOT'` and
`authorizedSellingCurrencyCodes: ['USD']`, carrying the full capability
requirements as `pendingCapabilities` — identical to AU and PH.

The list is stated in two places that are deliberately **not** derived from each
other, with a third derived from the intersection.
`src/modules/pricing/pricing-scope-destinations.ts` explains why it exists at
all rather than reusing the allowlist:

> It names the *question*. "Which destinations may carry a margin" and "which
> destinations may a buyer order from" are different questions that currently
> share an answer.

`resolveSellerMarketCapabilities()` intersects pilot destinations with the
global policy and is fail-closed: a `DISABLED` policy yields an empty list.

**Offerable is not ready, and a margin approves nothing.** Every one of the six
still reports payments, logistics, tax and payout as pending, and #197 says so
about its own screen: *"A margin set here binds at publish, and publish takes one
destination from `seller_market_profiles` — AU today. **Five of the six columns
are forward-looking configuration** until publishing can name a destination per
product. Nothing in this PR changes that, and it is not pretending to."*

The freight measurements that motivate the whole stack are recorded beside the
list (`pricing-scope-destinations.ts:29-32`): PH `$3.70` · CA `$6.81` ·
US `$7.62` · AU `$8.10` · NZ `$8.38` · FJ `$16.01`, a 300 g basket, CJ Shipping
Calculator, 2026-08-24. A 25% margin on a `$4.29` supplier cost contributes
about `$1.07` and covers none of them.

## 5. What #192 also cost, and what it did not

#192 self-corrected a figure this vault should not inherit: *"The ~1.73M-point
figure I quoted earlier was stale."* It also names a permanent, accepted loss —
**588,850 candidates requeued**, and with them each candidate's *previous*
decision: a `PASS` dated last week becomes a `PASS` dated today. The PR is
explicit that this is pre-existing behaviour already recorded in [[hot]] and not
introduced here. The requeue count is a PR-body claim I did not re-run.

## 6. The DDL and the data migration reached production — evidence, not assertion

Both endpoints are `CRON_SECRET`-gated `workflow_dispatch` routes. This is the
part of the note that does not rest on a PR body; it is read out of the run logs.

**`Pricing Migrate Per-Market Scope`**, run `32845239541`, 2026-08-25T12:00:19Z
— after #186 merged at 11:57, *before* #187 merged at 12:47:

```
{"ok":true,"columnsExist":false,"indexesExist":false}
{"ok":true,"columnsExistedBefore":false,"indexesExistedBefore":false,
 "ddl":{"statementsRun":12},"columnsExistAfter":true,"indexesExistAfter":true}
```

Re-run `32849837038` at 12:50:26Z proves idempotency and, more usefully, proves
who wrote the ledger:

```
{"ok":true,"columnsExistedBefore":true,"indexesExistedBefore":true,
 "ddl":{"statementsRun":12},
 "migrationRecord":{"createdAt":1787659573173,"inserted":true},
 "columnsExistAfter":true,"indexesExistAfter":true}
```

`migrationRecord.createdAt` `1787659573173` **matches journal entry 29's `when`
exactly**, so the `__drizzle_migrations` row for `0029_jazzy_senator_kelly` was
inserted by this run and not by any deploy. The workflow fails unless both
`columnsExistAfter` and `indexesExistAfter` are `true`.

**`Pricing Fan Out Unscoped Margins`** (#195), run `32874897335`,
2026-08-25T16:56:05Z — after #195 merged at 16:48 and before #197 merged at
17:19, which is the ordering #197's body relies on:

```
--- plan ---
{"ok":true,"destinations":["AU","PH","NZ","US","CA","FJ"],
 "unscopedActive":213,"wouldCreate":1278,"alreadyScoped":0}
{... "created":1278,"retired":213}
--- plan after ---
{"ok":true,"unscopedActive":0,"wouldCreate":0,"alreadyScoped":0}
```

213 × 6 = 1,278 exactly, and the workflow fails unless the post-read shows
`unscopedActive: 0`.

The fan-out copies into six **then** retires, in one transaction, and says why
the order still matters: *"a transaction makes a failed retire-first
unobservable, but writing it in the safe order keeps the code correct if someone
later runs the halves separately."* Retirement is `SUPERSEDED`, not
`DEACTIVATED`, each copy carrying `supersedesId` back to its source; the skip
key is `(seller, category, destination)`; `INSERT_CHUNK_SIZE = 500` avoids one
long lock; `GET` is a dry-run plan.

**The standing rule held throughout.** #186 executed the DDL "in a throwaway
schema seeded to look like production, then dropped. **The local app schema was
not migrated**."

## 7. Two hours of refused saves, and the one that never shipped

Every category-margin save in production returned `invalid_input` — the screen
saying only "Check the fields and try again" — **from #190's merge at 14:34
until #194 at 16:32**.

The cause is self-inflicted and worth naming precisely. #190 added
`marketCode: z.string().regex(/^[A-Z]{2}$/).nullable()` to both save schemas and
**did not touch the dialog that posts them** — `CategoryMarginDialog.tsx`,
`CategoryMarginNodeRow.tsx` and `CategoryMarginTree.tsx` are absent from #190's
file list and are exactly the files #194 had to change. The PR body describes
the symptom but never names the culprit; the attribution here comes from the
diffs.

Three guards existed and all three were blind in the same place:

- the action takes `input: unknown`, so the compiler had nothing to check at the
  call site;
- every case in `pricing-actions.test.ts` passed a hand-written input that
  already carried the new field;
- the component tests mock the server action, so a payload the schema would
  reject still satisfies them.

The fix exports `SaveCategoryPolicyInput` / `SaveStoreDefaultInput` as
`z.input<typeof …Schema>` so callers annotate their payloads while the action
parameter stays `unknown`. The incident record survives as a doc comment at
`src/app/(portal)/market-rules/pricing-actions.ts:206-224`. The destination is
threaded page → section → tree → row → dialog rather than read off
`node.policy.marketCode`, because *"a category with no rule yet has no policy to
read it from, which is exactly the case where guessing writes onto the wrong
scope."*

**A second defect of the same family was caught before merge**, inside #190
itself (commit `0fb519e`): `saveStoreDefaultAction` read the destination's row
through `findStoreDefaultForScope(..., marketCode)` and then **created an
unscoped one**, because `createStoreDefault`'s input had no `marketCode` and the
column defaults to null. A seller selecting AU and saving would have written the
all-destinations rule under a heading that said AU. *"TypeScript did not catch
it: the property was simply absent from the input type."* `marketCode` is now
required on that input, and the rationale is preserved at
`repository.ts:1121-1130`. It never reached production, and none of the nine PR
bodies mention it.

Both defects are the same shape: **a field added to a schema is a change to
every writer of that schema, and an `unknown` action parameter is the point
where the compiler stops helping.**

## 8. The mirror rows: an escape hatch that assumed rarity

Part 73 recorded that #184 kept `CJ-<uuid>` supplier mirrors off the margin
screen. It did not — not in production. The predicate carried an exception:

```ts
or(like(code, `${TAXONOMY_V1_CODE_PREFIX}%`), isNotNull(policies.id))
```

recorded as *"never offered fresh, not never shown"*, so a mirror already
carrying a policy stayed visible and could be deactivated rather than stranded.
#188's body states the flaw: *"**That reasoning assumed a mirror with a policy
was rare.** In production every mirror has one: the owner's bulk 25% import
wrote a policy to every category row, mirrors included. The exception fired on
all of them and the screen looked exactly as it had before."*

Hiding them strands nothing, because a mirror policy is **provably inert**:
`findNearestActiveCategoryPolicy` matches on `sals3_categories.path`, a mirror's
path is the supplier's raw string separated by `/` rather than ` > `, so it can
never be an ancestor of a real taxonomy path — and publication refuses a
mirrored category anyway. The `CJ-` filter is now unconditional; the *depth*
escape hatch remains.

**The honest part is how the first fix was verified.** #188 quotes it against
itself:

> I checked this in the browser after #184 and reported *"Search 213 categories,
> cjRows: 0"*. That was the **local** database, which has no pricing policies at
> all — so the escape hatch could not fire there. **The check was not
> representative of the thing it was checking**, and it read as confirmation.

Left open by owner decision: the dead policies on mirror rows are **invisible
rather than removed**; deactivating them is a data change and waits for the
owner to ask. #195 excludes them from the fan-out for the same reason — doing
otherwise *"would multiply dead rows sixfold and hide the real count."*

## 9. A column per destination, and a CSV that carries its own scope

#190 shipped a `DestinationScopeSelector`; #197 **deleted it** on the owner's
decision — *"Market Rules moves from a scope selector to a column per
destination, and 'All destinations' goes away."*

- `listCategoryMarginOverviewByMarket` joins **without** a scope filter and
  groups by `categoryId`, so the taxonomy is scanned once rather than six times.
- All-destinations rules are still read and shown under
  `ALL_MARKETS_KEY = '__all__'`, because *"a reader that silently ignored one
  would show 'Not set' for a category a live rule is still pricing — the exact
  failure the migration exists to prevent, reintroduced one layer up."*
- Store defaults are read **per destination**; the alternative *"is showing one
  destination's floor under all six columns."*
- Cells are chips: solid when the category owns that destination's rule,
  outlined when inherited, `—` when nothing applies, with `sourceLabel()`
  distinguishing *Set on this category* / *…for all destinations* / *From
  {ancestor}* / *Store default* / *Nothing yet* for tooltip and screen reader.
- Editing is a pop-out opened **from the cell**, so *"the click that says which
  destination is the same click that opens the editor — there is no separate
  step in which the two could disagree."* Deactivate moved inside it: a row has
  six rules now, and one button beside six chips cannot say which it means.
- `effectiveMarginFor()` in `category-margin-model.ts` mirrors the resolver
  (self → ancestors by path prefix → store default → `NONE`) and its comment
  cites `outranks` by name.

**The CSV hazard the ADR flagged is closed in two steps.** The amendment warned
that one line per category, left alone, would let an import *"silently erase five
destinations out of six"*. #190 added a fifth column `market_code` (blank = all
destinations), made the dedupe key `` `${categoryCode}|${marketCode ?? ''}` `` so
one category may legitimately appear twice, shape-checked it with the offending
**line number** reported, and made the importer honour **the row's** scope rather
than the screen's. A file with no `market_code` column still imports as
all-destinations, which is what every previously exported file was written for.
#197 then made export emit **one line per category × destination**, including
destinations with no rule, because *"exporting only what is set would make the
file a partial picture that looks complete."*

Unchanged and load-bearing: the import is still all-or-nothing in one
transaction, a category absent from the file is left alone, and only a present
row with an empty `margin_percent` clears anything — *"and it clears only the
scope its own `market_code` names."* `MAX_CSV_ROWS = 6000`. Export and import
stay behind one control, an owner decision recorded in `MarginCsvControls.tsx`.

## 10. The save that had already worked

The owner's report was two words — *"Gumagana ba talaga ito?"* — against the
funding-buffer card, and the answer was that every save had committed and the
page could not say so.

Two stacked causes. **Every save waited behind the taxonomy scan**: both
sections were awaited in one route render with `CategoryPricingSection` first, a
full taxonomy scan plus one store-default read per destination. The page comment
now says *"The write had already committed; the page simply could not say so yet,
which reads as a failed save and invites a manual reload."* Fixed with a
`<Suspense>` boundary per section.

**And the card learned its own value only from that render.** On a *first* save,
with no policy in props, `showForm` stayed true, *"so the form simply sat there
with its inputs cleared — indistinguishable from a save that silently failed."*
The action now returns the row it wrote and the card holds it:

```ts
const policy = savedPolicy !== null &&
  (serverPolicy === null || serverPolicy.version < savedPolicy.version)
  ? savedPolicy : serverPolicy;
```

so `router.refresh()` *"becomes reconciliation rather than the only source of
truth. A newer server version still wins."* A third bug surfaced while testing:
`setSavedPolicy(result.data)` would throw on an `ok` with no row, because
`undefined !== null` is true and the version read blows up — now `?? null`.

**A caveat #200 states about itself, and this vault should keep:** the funding
buffer is *live*, not dead code — applied unconditionally in `resolver.ts:215`
and pricing is refused without one (`FUNDING_BUFFER_REQUIRED`) — but it
currently reads `0.00%`, and a 0% buffer multiplies by 1. **The real AUD→USD
funding exposure is still unmodelled.** That the production value reads `0.00%`
is a PR-body observation I could not verify from the repository.

## 11. What is not proven

- **No per-destination rule had ever resolved a real scoped policy** at the time
  #187 and #190 merged; the precedence rule was unit-tested against canned rows
  and the SQL executed in a throwaway schema. The 1,278 rows created in §6 are
  the first real ones.
- **The local database still has no `pricing_store_defaults` table and no
  `market_code`**, so both sections degrade to their honest "could not be read"
  state locally. The standing never-migrate-locally rule is why.
- **#195's unit tests do not reach the SQL predicate.** Its body says so rather
  than implying coverage: that mirrors are excluded and only `ACTIVE` unscoped
  rows are read *"lives in a Drizzle builder chain a fake cannot evaluate"* — the
  `GET` plan against a real database is what verifies it.
- Verify counts are PR-body claims, not re-run here: #186 2,610 unit / 79 e2e,
  rising through the stack to **#200 2,703 / 79, exit 0**.
- The browser observations (`Search 213 categories`, `cjRows: 0`, the live
  `RULES FOR: All destinations · AU · PH`), the 588,850 requeue, the "zero
  `delete()` anywhere in `src/`" audit and the freight figures are all PR-body
  claims. The 213 figure *is* corroborated by the fan-out run's
  `unscopedActive: 213`, but that counts unscoped active policies, not screen
  rows — suggestive, not proof.
- **`develop` has already moved past #200.** Migration `0030_lean_blizzard` and
  the operating-expense floor's percentage form landed after it — see
  [[sals3-session-2026-08-27-part78-the-floor-that-became-a-percentage]].
  `StoreDefaultCard.tsx`, edited by #194, no longer exists; it is now
  `StoreDefaultsTable.tsx`.

## 12. What to carry forward

**A nullable column is how you add a dimension without a backfill.** `null`
meaning *unscoped* let 213 existing rules keep their exact meaning at the instant
the column landed. The cost is that uniqueness needs two partial indexes rather
than one composite, because Postgres treats `NULL`s as distinct — that is the
price of the property, not an oversight.

**Adding a field to a shared schema breaks every writer of it, and `unknown`
is where the compiler stops helping.** Two hours of refused saves in production
and one near-miss that would have written the wrong scope, both from the same
change, both invisible to three layers of tests: hand-written test inputs
already carried the new field, and mocked server actions accept payloads the
schema rejects. After widening a schema, grep for every caller that constructs
it — and give the callers an exported input type so the next widening is a
compile error.

**Verifying against the local database can be indistinguishable from
confirmation.** The `cjRows: 0` reading after #184 was true and meaningless: the
escape hatch it was meant to test cannot fire where no pricing policies exist.
Before trusting a check, ask which production condition makes the bug appear and
whether the environment under test has it. This is the same lesson as part 69's
review table — [[hot]] now carries both.

**Resolution and editing are different questions about the same table.** A read
that falls back is correct for pricing an item and wrong for saving a rule,
because a fallback lets a save supersede a row the seller never opened. Four
functions where a refactor will see two.

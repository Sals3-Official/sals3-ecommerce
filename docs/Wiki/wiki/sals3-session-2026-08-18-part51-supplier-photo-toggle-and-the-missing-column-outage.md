---
tags:
  - sals3
  - sals3-portal
  - incident
  - postmortem
  - migrations
  - product-editor
  - ci
  - session
aliases:
  - Supplier Photo Toggle
  - Missing Column Outage
  - Part 51
created: 2026-08-18
updated: 2026-08-18
status: shipped
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[universal-category-variation-taxonomy-reference]]"
  - "[[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux]]"
  - "[[sals3-skills]]"
---

# Sals3 session 2026-08-18, part 51 — a supplier-photo toggle, and the missing column that took `/listings` down

Three unrelated `sals3-portal` fixes were bundled into one pull request. One of
them added a database column. It merged, deployed, and took the production
catalogue offline. The recovery, and the four-PR sequence that replaced it, are
the real content of this note.

> [!IMPORTANT] The rule this produced
> **Never run `npm run db:migrate` against the local database in `sals3-portal`.**
> Bogs instructed this directly, mid-incident. Migrating locally is what made a
> broken change look verified — see [§3](#3-why-a-green-local-verify-proved-nothing).

> [!DANGER] This was the second time in two days
> [[../../journal/sals3-session-2026-08-17-category-attribute-specifications-production-rollout|The day before]],
> PR #102 took the *whole Product Catalogue* down in production for exactly the
> same reason — a migration run only locally — and was fixed with exactly the
> same remedy: revert, build a break-glass endpoint (PR #103), run it against
> production, restore the feature (PR #104). That note existed, in this vault,
> describing both the failure and the cure, and the identical mistake was made
> again the next morning.
>
> The remedy was already known; what was missing was a rule that fires *before*
> the mistake rather than a description of it afterwards. Hence this note leads
> with a prohibition instead of a narrative, and hence the check now lives in
> the migration tooling itself ([§5](#5-hardening-the-migration-itself)) — a
> workflow that asserts its own outcome does not depend on anyone having read a
> session note.

## 1. What shipped, in the end

Six merged PRs across the day, in this order:

| PR | What | Why it is separate |
|----|------|--------------------|
| [#113](https://github.com/Sals3-Official/sals3-portal/pull/113) | All three fixes bundled | **Caused the outage.** Reverted. |
| [#114](https://github.com/Sals3-Official/sals3-portal/pull/114) | Revert of #113 | Restored production |
| [#115](https://github.com/Sals3-Official/sals3-portal/pull/115) | Migration endpoint + workflow | Inert — adds no code that reads the column |
| [#116](https://github.com/Sals3-Official/sals3-portal/pull/116) | Meta-description fix, publish-gate relief | Zero schema footprint, so it could ship immediately |
| [#118](https://github.com/Sals3-Official/sals3-portal/pull/118) | CI caching | Unrelated build-pipeline work |
| [#119](https://github.com/Sals3-Official/sals3-portal/pull/119) | Specs no longer styled as errors | The UI half of #116 |
| [#117](https://github.com/Sals3-Official/sals3-portal/pull/117) | Supplier-photo toggle | Landed **last**, only after the column provably existed |

## 2. The outage

`products.show_supplier_photo` (migration `0022`) was added to the Drizzle
schema in #113. `read-model.ts` — the query behind the entire catalogue —
therefore began selecting it. The column existed only in the local development
database. Production had never received it.

```
column products.show_supplier_photo does not exist
```

Every `/listings` request 500'd from the moment the deployment promoted
(01:41 UTC) until the revert deployed (01:52 UTC).

**Recovery.** Bogs has no Vercel dashboard access, so an instant rollback was
not available; the revert went through git. `git revert -m 1` of the merge
commit, pushed with `--no-verify` at Bogs's explicit instruction to skip the
~8-minute pre-push hook, merged, and redeployed.

## 3. Why a green local verify proved nothing

This is the part worth remembering.

Local `npm run verify` passed — lint, typecheck, build, 1849 unit tests, 78
E2E — and that pass was **evidence of the bug, not against it**. Earlier in the
same session the identical `column ... does not exist` error had appeared
locally. It was "fixed" by running `npm run db:migrate`, which reaches only the
local database. That made the tests pass and silently disposed of the one
question that mattered: *how does production get this column?*

`scripts/guard-remote-db.mts` blocks `db:migrate` against anything remote **by
design**. Production DDL has exactly one sanctioned path: a
`CRON_SECRET`-authenticated internal route, triggered by a manual
`workflow_dispatch`. That mechanism already existed — issue
[#112](https://github.com/Sals3-Official/sals3-portal/issues/112) documents it
for migration `0021`, and had been executed successfully hours earlier. It was
read past.

**A local verify says nothing about production schema state.** A schema-touching
change must never be called "safe to merge" on the strength of one.

## 4. The ordering rule this exposed

Migration `0021` (`products.meta_description`) was additive and nothing read
it, so "merge, then run the workflow" was safe. `0022` is **read by the
catalogue query**, so the same order breaks production in the window between
deploy and workflow run.

> [!WARNING] Sequence for a column the read model SELECTs
> 1. Land the migration endpoint + workflow **alone**. Verify the Drizzle schema
>    does *not* declare the column yet — that is the property that keeps the
>    deploy inert.
> 2. Deploy. Run the workflow. Confirm the column exists.
> 3. Only then land the code that reads it.

Two PRs, never one. #115 was confirmed inert before merge by three checks: the
schema did not declare the column, no runtime code referenced it, and the diff
was **9,483 insertions with 0 deletions** — nothing existing altered, so no
current code path could change behaviour.

## 5. Hardening the migration itself

The additive column was never the real hazard; the **lock** was. `ALTER TABLE`
takes an `ACCESS EXCLUSIVE` lock on `products`. Held behind a long-running
query it queues, and every subsequent read queues behind it — the same outage
shape as the missing column, except mid-DDL there is nothing to roll back to.

Added before running it against production:

- **`SET LOCAL lock_timeout = '5s'`** inside a transaction around the ALTER.
  Postgres has transactional DDL, so a lock it cannot take aborts and rolls
  back cleanly, leaving the schema untouched and the run retryable. Failing
  fast *is* the rollback story for a DDL that otherwise has none. `SET LOCAL`
  rather than a session `SET`, so the timeout cannot leak onto whatever query
  next reuses that pooled serverless connection.
- **Before/after reads from `information_schema`**, not the migration ledger —
  the two that disagreed during the incident. The workflow asserts
  `columnExistsAfter` and fails the job otherwise, so an HTTP 200 that achieved
  nothing is caught rather than celebrated.
- **A read-only `GET`** on the same route, so the column's state is checkable
  at any time without writing.

The run ([32092050065](https://github.com/Sals3-Official/sals3-portal/actions/runs/32092050065))
recorded:

```
--- column state before ---
{"ok":true,"columnExists":false}
--- applying migration ---
{"ok":true,"columnExistedBefore":false,"ddl":{"statementsRun":1},
 "migrationRecord":{"createdAt":1787014422342,"inserted":true},
 "columnExistsAfter":true}
Verified: products.show_supplier_photo exists.
```

`columnExists: false` beforehand is independent confirmation of the outage
diagnosis — production genuinely never had the column.

## 6. The three fixes themselves

### Meta Description was leaking category breadcrumbs

The auto-suggestion sourced its "specification highlights" from
`fixture.specifications`, which is **not** seller-entered attribute values but
the read-only *supplier evidence* list — led by `CJ Category` and
`Sals3 Category (curated)`. It stitched two unrelated category paths into the
snippet verbatim:

> Loose sweater with zipper. Jewelry Holders. Men's Clothing / Outerwear &
> Jackets / Man Hoodies & Sweatshirts, Health & Beauty > Jewelry Cleaning &
> Care >…

Now sourced from `categoryAttributes`. (The nonsensical *Jewelry Holders*
category on a sweater was Bogs testing the picker, not a mapping defect.)

### Workbook "mandatory" attributes no longer block publishing

The server gate in `publish.ts` and its `REQUIRED_SPECIFICATION_MISSING`
refusal are gone, and **both** issue derivations dropped `BLOCKER` → `WARNING`:
`read-model.ts` server-side, and `ProductEditorWorkspace.tsx`'s own local
re-derivation. Both deliberately — leaving the client one would have kept the
Publish button disabled while the server happily accepted the publish.

Justification: the workbook attribute data is adopted reference material whose
own vault note
([[universal-category-variation-taxonomy-reference]]) warns it is generated,
uncited, and not pilot-validated. Not vetted enough to gate a real listing.

`SpecificationsSection.tsx` still says "hard blocker" and that is **correct** —
it renders Supplier Details, where `CJ Category` is genuinely required and
`publish.ts` still refuses `CATEGORY_UNMAPPED`.

### …and no longer *look* like errors

Shipping the gate change alone produced a real complaint: production showed
Specification as **Warning** with blockers down 6 → 1, yet every empty field
still had a red destructive outline, a red asterisk, and `role="alert"`. The
behaviour said optional while the interface said mandatory.

`aria-invalid` was the culprit and was also semantically wrong: it means *"this
value is invalid and must be corrected"*, but an empty attribute is permitted.
It was painting the red outline **and** telling assistive technology the field
was in error. Removed, along with the asterisk (the section's own
"Required specifications" / "Recommended specifications" headings already carry
that signal), and `role="alert"` became `role="status"`.

### The supplier-photo toggle (the actual feature)

A seller's own upload **silently replaced** the supplier's photo everywhere
buyer-facing. The merge was `media.length > 0 ? media : supplierMedia`, so
uploading one photo made the supplier's vanish from the header thumbnail, the
Draft Storefront Preview, and the publishable media count — with no way to ask
for both, and no indication it was happening.

| Toggle | Seller uploads | Buyer sees |
|--------|----------------|------------|
| On | none | Supplier's photo (unchanged default) |
| On | some | **Both**, seller's first |
| Off | some | Seller's only |
| Off | none | Nothing — and the caption says so plainly |

Supplier Details' read-only gallery is unaffected either way; that is
provenance, not a buyer-facing surface. Auto-saves on flip through a
compare-and-set server action, optimistic with rollback. Defaults to `true`, so
no live listing changed appearance. Styled with the Sals3 brand blues
(`#018CC9` → `#002B53`) as a gradient — the same pair `VariantPricingTable`
already uses solid.

## 7. Pre-merge check that caught a fourth problem

Three PRs sat green simultaneously. `ProductEditor.test.tsx` was in **both**
#117 and #119 — and each PR's CI had only ever tested its own branch against an
older `develop`. Two green ticks can still produce a broken merge.

The three-way merge was simulated locally before merging anything: no
conflicts, the semantic collision resolved correctly (both #117's mock and
#119's label queries survived, no stale assertions), and a full verify on the
**combined** tree passed (1890 unit + 78 E2E). Merged in blast-radius order —
workflow-only, then UI-only, then the DB-reading one last, so any failure would
point at exactly one PR.

Also confirmed the Drizzle declaration matches production exactly —
`boolean('show_supplier_photo').notNull().default(true)` against the applied
`boolean DEFAULT true NOT NULL`. The absence of that check is what caused the
morning's crash.

## 8. CI slowness, diagnosed and partly fixed

`verify` runs took 6–8 minutes and one hung for **22 minutes** on
`npx playwright install --with-deps chromium`, retrying an unreachable
`azure.archive.ubuntu.com` mirror. Cancelling and re-running cleared it — the
same code then passed in 6m34s, and #118 had started 13 minutes later yet
finished first. Environmental, never the code.

#118 caches `~/.cache/ms-playwright` keyed on the resolved `@playwright/test`
version (not the lockfile hash — the browser build depends on that version
alone), and caches `.next/cache` for `next build`. The install is split: on a
cache hit only `install-deps` runs, since the apt system libraries land outside
the cached path and genuinely cannot be cached.

> [!NOTE] Honest limit
> This reduces the step, it does not eliminate it. apt still runs on a cache
> hit, and the 22-minute hang was a bad mirror, which caching cannot fully
> prevent. The first run on a new key is also a miss.

Worth noting separately: the pre-commit **and** pre-push hooks each run the
full `npm run verify` including E2E, then CI runs it a third time — roughly 30
minutes per commit.

## 9. Lessons

0. **This already happened on 2026-08-17 (PR #102) and happened again anyway.**
   A session note describing an incident is not a control. The lessons below
   only matter to the extent they are enforced by tooling, a hard rule, or a
   checklist someone actually runs — not by having been written down.
1. **Never `db:migrate` locally.** It hides the production migration gap and
   manufactures false confidence. Treat a missing-column failure as the signal
   it is.
2. **A local verify is silent about production schema.** Never call a
   schema-touching change safe on one.
3. **Split a schema change from the code that reads it** — always two PRs, and
   for a column the read model SELECTs, in a strict order.
4. **Bundling is what turned three fixes into an outage.** Two of #113's three
   changes never needed the database and could have shipped safely all day. As
   four small PRs, each one's risk was visible before it shipped. This split was
   Bogs's suggestion, and it is what unstuck the day.
5. **Simulate the combined merge** when several PRs are green at once. Per-PR CI
   does not test the union.
6. **Bound the lock on any production `ALTER TABLE`.** Failing fast is the
   rollback story for DDL that has none.
7. **A green workflow is not proof.** Make the operation assert its own outcome.

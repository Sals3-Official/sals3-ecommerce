---
tags: [session-record, sals3, portal, taxonomy, category-mapping, encoding]
aliases:
  [
    "Part 150",
    "Four taxonomy seed corrections",
    "The mojibake leaf and the two leaves that were never undecided",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-04-part134-the-last-306-supplier-leaves-and-the-seed-that-has-not-run]]"
  - "[[sals3-session-2026-09-04-part129-coverage-jumps-from-19-to-69-percent-once-the-census-stopped-being-the-alphabet]]"
  - "[[sals3-session-2026-09-03-part126-a-cj-leafs-name-is-not-its-contents-twice]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
---

# Part 150 — Four taxonomy seed corrections, two of them self-inflicted

> [!NOTE] Provenance
> Written after the fact from each PR's own record and the production seed-run
> output quoted in them. All four PRs are `anythingsupplies/sals3-portal`,
> merged 2026-09-07. Promotion PRs not listed. **None of the four has been
> seeded to production** — see §5.

| PR | What it did |
| --- | --- |
| [#111](https://github.com/anythingsupplies/sals3-portal/pull/111) | One seed row whose leaf name was **mojibake**, and a guard so it cannot recur silently |
| [#114](https://github.com/anythingsupplies/sals3-portal/pull/114) | The census key separator written as an **escape**, so the file stops being binary |
| [#156](https://github.com/anythingsupplies/sals3-portal/pull/156) | Two "undecided" leaves added, one of them the largest in the pile |
| [#157](https://github.com/anythingsupplies/sals3-portal/pull/157) | **#156's two entries removed** — they were decided leaves wearing another name |

## 1. One reviewed decision that had never activated (#111)

The production seed run on 2026-09-07 returned 429 outcomes — 215 seeded, 14
superseded, 10 disabled, 149 `already_active`, 40 `already_disabled` — and
exactly one `not_in_snapshot`:

```json
{"cjL1":"Women's Clothing",
 "cjName":"Couple&Parent-Child SweatshirtsÂ·",
 "sals3CategoryCode":"CAT-GGL-212",
 "outcome":"not_in_snapshot",
 "detail":"no snapshot entry carries this L1 + name"}
```

That is **U+00C2 followed by U+00B7** — the signature left when UTF-8 bytes are
decoded as Latin-1. `matchSnapshotEntry` compares `categoryName` with `===`, so
the row matched nothing, every candidate under the leaf kept resolving to a
`CJ-<uuid>` mirror, and the money guard in `create-draft` skipped them.
**Correctly — but permanently, rather than being filed under CAT-GGL-212 as
reviewed.**

The true name has **no trailing character at all** — not a plain `·`. That was
read from CJ's own `GET /product/getCategory`, the call whose flattened result
*is* `discovery_cycles.category_snapshot`.

### The cross-check is the real evidence

577 leaves compared against the stored snapshot:

- **428 match exactly** — apostrophes in `Women's Clothing`, `&` with no spaces,
  and the stray space in the sibling `Couple&Parent -Child Jackets` all preserved.
- **1 does not**, and it is precisely the row production refused.

**428 exact agreements with zero drift is the evidence that the stored snapshot
and CJ's tree are the same data.** The mapping row is keyed by the matched
entry's `categoryId` rather than its name, so resolution downstream is unaffected
either way.

### A guard, because the failure mode is quiet

*A wrong name is not a loud error — it is one `not_in_snapshot` line inside a
429-line report.* The new test rejects U+00C2/U+00C3/U+00E2 followed by a byte in
U+0080–U+00BF in any `cjL1` or `cjName`: **the exact ordered pair
double-encoding produces, which does not occur in real text.** Deliberately not a
ban on non-ASCII — CJ stays free to name a leaf with a legitimate accent.

It is **mutation-tested**: reintroducing the original `Â·` turns exactly that
test red, naming the offending value, with the other 14 in the file still green.

A non-ASCII audit of the whole seed file was run and reported even though most of
it moves nothing: twelve lines carried a non-ASCII byte, eleven still do — all
U+2014 em dashes in doc-comment prose, correct and left alone. One was the defect.

## 2. A source file that `grep` classified as binary (#114)

`shareKey` in `leaf-census.ts` joins a Level 1 label and a leaf name with a
**NUL**. The NUL is the *right* delimiter — it cannot occur in a CJ category
name, so unlike the `|` used elsewhere it cannot collide with the values it
joins. It was just written as a **raw control byte in the source** instead of as
an escape.

```
$ grep -rn "shareKey" src/
Binary file src/modules/catalog/taxonomy/leaf-census.ts matches
```

No line, no number. **The function was unfindable by the ordinary way of finding
things** — and that is not hypothetical: while checking the blast radius of #111,
an importer scan returned this file as a binary match and it was nearly skipped.

Behaviour unchanged, asserted rather than assumed — the escape produces the
identical one-character string, and the twelve existing leaf-census tests pass
untouched.

## 3. Two undecided leaves, one the largest in the pile (#156)

A census of production's screened pile — **432,654 candidates across 435 supplier
leaves** — diffed against `seed-category-mappings.ts`: **56,667 candidates
(13.1%) sit behind a leaf that is not mapped**, and all but 7,354 of them are
behind a leaf the file has already decided. Two appeared undecided:

**`Men's Clothing || Blazers` — 6,591 candidates.** Twenty samples: six jackets
and coats (a cotton-padded coat, an oil-wax biker trench, a mountaineering
jacket), five sweaters and cardigans, five shirts, two tunic suits. All menswear
— *so this is a refusal, not an absurdity* — but no Google node covers tops,
outerwear and suits at once, and `Shirts & Tops` is wrong for the coats.

**`Home Improvement || Cycling Jerseys` — 722 candidates.** A walk-in
polycarbonate greenhouse, a hot-and-cold water faucet, an 800ml HVLP paint
sprayer, an automatic watering device, a chainsaw.

## 4. And both entries could never apply, because I wrote them (#157)

Two corrections to #156, **found by running the seeder against production and
reading what it answered** rather than trusting a reading of the census.

The seeder resolves a leaf by `(cjL1, cjName)` against
`discovery_cycles.category_snapshot`. **The census labels a leaf by the name its
candidate rows carry**, and for the same `provider_category_id` those differ —
`nameVariants` counts up to five names for one category.

| Added in #156 | Its real `snapshotName` | Already in this table as |
| --- | --- | --- |
| `Men's Clothing \|\| Blazers` (6,591) | `Suits & Blazer` | `Suits & Blazer` — **four lines above** where the new entry went |
| `Home Improvement \|\| Cycling Jerseys` (722) | `Garden Tools` | `Garden Tools`, whose recorded contents are the greenhouse, faucet, paint sprayer, waterer and chainsaw just "discovered" |

**So there were no undecided leaves.** There were two decided leaves wearing
another name, and the new entries answered `not_in_snapshot` — no-ops asserting
leaves that do not exist. Both removed; their candidates stay disabled by the
rows that already covered them.

This is the third time this vault records the same class of error:
[[sals3-session-2026-09-03-part126-a-cj-leafs-name-is-not-its-contents-twice|part 126]]
mapped a leaf by its name rather than its contents and put a mouthwash under
Storage & Organization, and [[sals3-session-2026-09-04-part129-coverage-jumps-from-19-to-69-percent-once-the-census-stopped-being-the-alphabet|part 129]]
fixed a census sampling bug that was hiding coverage. **A CJ leaf has no single
name. Identity is the snapshot entry, and every other spelling is a label.**

One middle dot was collateral in the same pass — a second name variant corrected
alongside the two removals.

## 5. None of this is live, and the reason is billing

**The seeder was not run for #111, and cannot be.** It needs `CRON_SECRET`, which
only the owner holds, and the workflow that would supply it cannot start while
Actions billing is blocked — the same wall recorded in
[[sals3-session-2026-09-07-part149-notify-every-market-storefront-and-two-jobs-onto-vercel-cron|part 149]].

What is owed: **one dispatch of `Taxonomy Seed Category Mappings (write)` with
`environment: production`.** The endpoint is idempotent — every already-correct
row reports `already_active` and writes nothing — so the expected shape is 428
`already_active`/`already_disabled` and **1 `seeded`**.

Worth knowing: **that workflow already fails the run when any row reports
`not_in_snapshot`**, so this defect has been turning the dispatch red rather than
passing quietly. After #111 it should go green.

> [!NOTE] If it still reports `not_in_snapshot`
> That means the stored snapshot predates a CJ rename rather than that the edit
> is wrong. The fix would then be **a fresh discovery cycle**, not another edit
> to the seed file.

#123 moved `seed-category-mappings` onto Vercel Cron hourly at :17, which is a
second route to the same run — but the outstanding **fourth-tier** seed recorded
in [[sals3-session-2026-09-04-part134-the-last-306-supplier-leaves-and-the-seed-that-has-not-run|part 134]]
is still one production dispatch behind, so the live coverage figure remains
below the reviewed 78.2%.

## Verification

`npm run verify` end to end on #111: lint (0 errors), format:check, typecheck,
build, **4,049 unit tests, 67 e2e**. #114 kept the twelve leaf-census tests
untouched and green. All local — Actions cannot start on this repository.

## Lessons

- **Mojibake is a `===` failure, not a display bug.** `Â·` in a keyed comparison
  is a row that silently matches nothing. Ban the *ordered byte pair*
  double-encoding produces, not non-ASCII.
- **A quiet failure inside a 429-line report needs a test, not attention.** The
  seed run was already reporting this. Nobody read line 300 of it.
- **A raw control byte makes a source file invisible to `grep`.** The delimiter
  was right; writing it as a literal was not. It nearly caused a file to be
  skipped during an unrelated audit.
- **A cross-check of 428 agreements is stronger evidence than an audit of the one
  disagreement.** It establishes that the two datasets are the same data, which
  is what licenses the single edit.
- **Trust the run, not the reading.** #156 was written from the census and was
  wrong; #157 was written from what production answered and was right. The census
  and the seeder key a leaf differently, and only one of them is identity.
- **The same mistake three times means the model is wrong, not the attempt.** A
  CJ leaf's name is a label; its snapshot entry is its identity.

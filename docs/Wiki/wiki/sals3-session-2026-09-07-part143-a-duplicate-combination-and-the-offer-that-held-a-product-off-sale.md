---
tags: [session-record, sals3, portal, option-mapping, offers, catalog]
aliases:
  [
    "Part 143",
    "A duplicate combination and the offer that held a product off sale",
    "retireVariantIds and hasSellableUnpricedOffer",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-07-part144-5666-market-offers-and-the-three-markets-withdrawn]]"
  - "[[sals3-session-2026-09-08-part142-the-list-reads-stored-answers]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
---

# Part 143 — A duplicate combination, and the offer that held a product off sale

> [!NOTE] Provenance
> Written after the fact from each PR's own record. All three PRs are
> `anythingsupplies/sals3-portal`, merged 2026-09-07 between 01:38 and 02:16.
> Promotion PRs (#71/#72, #74/#75, #78/#79) carried the same diffs through the
> ADR-019 gate and get no entry of their own — see
> [[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger|part 148]].

| PR | What it did |
| --- | --- |
| [#70](https://github.com/anythingsupplies/sals3-portal/pull/70) | `retireVariantIds` — a caller can set aside a supplier row that duplicates a combination |
| [#73](https://github.com/anythingsupplies/sals3-portal/pull/73) | Retiring a variant archives its offers, and the unpriced-offer check ignores `ARCHIVED` |
| [#77](https://github.com/anythingsupplies/sals3-portal/pull/77) | The rule is the **variant's** status, not the offer's — #73 was the wrong half |

## 1. The product that could not be mapped, and both refusals were right

A phone case in production: **17 variants, 16 real phone models.** CJ ships
`iPhone14` and `Iphone14` as separate SKUs — identical cost, no warehouse
recorded, differing only in stock (13,167 against 10,723). Both ways out of the
option mapper were closed, and closed correctly:

| Attempt | Refusal | Why it is right |
| --- | --- | --- |
| Both variants on one `Model` value | `COMBINATION_COLLISION` | A buyer's selection could be honoured by either row |
| 16 of 17 assigned, one omitted | `INCOMPLETE_ASSIGNMENT` | That is the partial-mapping check doing its job |

So the draft sat with every variant disabled, no priced offer, and the publish
gate refusing it. **Nothing in the 28 internal product routes could set a
variant aside.** The gap was not a wrong rule — it was a missing vocabulary.

## 2. Retirement is a named act, not a relaxed rule

`retireVariantIds` makes the caller **say** which rows it is setting aside.
Deliberately not a widening of the existing check:

- assignments **plus** retirements must still cover every variant the database
  says the product has, so absence remains `INCOMPLETE_ASSIGNMENT`;
- retiring all of them is `NOTHING_LEFT_TO_MAP`;
- a variant both assigned and retired is `RETIRED_ALSO_ASSIGNED`;
- a retirement naming a foreign variant is refused exactly as an assignment is.

A genuinely unmappable product refuses exactly as before. What changed is only
that a deliberate decision can be expressed.

### What retirement does, checked against the schema rather than assumed

`status = 'RETIRED'` and `option_combination_key = NULL`, written together.
Three things were verified before relying on them:

| Check | Finding |
| --- | --- |
| `publish.ts` and `pricing-guidance.ts` | each filter `status IN ('DRAFT','ACTIVE')` — a retired row drops out of offers and pricing guidance on its own |
| `product_variants_active_combination_key` | partial on `WHERE status = 'ACTIVE'`, so the retired row leaves the unique index |
| the table's CHECK | `status <> 'ACTIVE' OR option_combination_key IS NOT NULL` — a null key is legal only while the row is not ACTIVE |

`RETIRED` was declared in the enum and **used nowhere in the codebase** before
this. The audit records `retiredSupplierLabels` alongside the count, because a
count cannot answer *"was the correct duplicate retired?"* years later, and the
supplier label is precisely what disappears when CJ re-labels the product — the
same argument the existing `supplierLabels` field already makes.

## 3. Production answered within the hour, twice

The phone case mapped and published — **16 sellable offers, all priced, all
`PUBLISHED`** — and still read `LIVE_NEEDS_ATTENTION`:

```
attentionReasons: [{ reasonCode: 'PRICING_UNRESOLVED', severity: 'HIGH', checkoutAllowed: false }]
```

`create-draft.ts` writes **one offer per variant before any mapping exists**, so
the retired variant still had one. Publish only reprices the variants it can
sell, so that offer stayed `UNRESOLVED` — and the catalogue's unpriced-offer
check counted every offer regardless of state. **One row nobody could buy kept
the whole product off sale.**

#73 fixed it in two halves: retirement archives the variant's offers
(`publishState = 'ARCHIVED'`, another declared-and-unused state), and the
unpriced-offer check ignores `ARCHIVED`. The pause/resume queries filter
`publishState = 'PUBLISHED'`, so an archived offer will not be resumed either.

**And #73 was still the wrong half.** Filtering `ARCHIVED` made every *future*
retirement correct and did nothing for the phone case already retired before it
shipped — that offer was never archived, so it was still counted, and the
product still read `LIVE_NEEDS_ATTENTION`. #77 moved the decision to where the
fact lives: **sellability is a property of the variant, not of the offer's own
state.**

### The rule, extracted and pinned

The check had been inline in a ~300-line mapper with no way to reach it. It is
`hasSellableUnpricedOffer` now — exported and covered:

| Case | Expected |
| --- | --- |
| the production shape: 16 × (PUBLISHED, RESOLVED) + 1 × (ARCHIVED, UNRESOLVED) | `false` |
| an unpriced offer a buyer really can reach | `true` |
| `UNPUBLISHED` + UNRESOLVED | `true` — on its way to a listing |
| `PAUSED` + UNRESOLVED | `true` — coming back |
| no offers at all | `false` — an offer-less draft has its own gate |

The two states that are *not* "never for sale" are the ones worth pinning: it
would be easy to filter "not `PUBLISHED`" and hide a real problem.

## 4. Verification, and what it could not prove

GitHub Actions in `sals3-portal` has been dying in ~4s unstarted since
2026-09-04 on billing, so a red X there is not a code signal. Locally, on #70:

```
lint            ok (0 errors, 5 pre-existing no-console warnings in scripts/)
format:check    ok
typecheck       ok
catalog + internal API   141 files | 1534 passed | 2 skipped
option-mapping module    25 passed, 6 of them new
```

#73 ran 142 files / 1540 passed / 2 skipped, with 8 new cases across the two
touched modules.

**The functional subject lives in the production database**, and the automation
Chrome holds a session for production only — SIT has just a `_vercel_jwt`, no
Portal session. So on SIT and UAT the check was the deployment status plus the
unit suite; the end-to-end proof was the phone case reading plain `LIVE` on
production after each landed. The automation client gained the matching optional
argument (`sals3-portal-automation`, 274 tests).

## Lessons

- **A refusal that is correct can still be a gap.** Both `COMBINATION_COLLISION`
  and `INCOMPLETE_ASSIGNMENT` were right, and together they made a real product
  unpublishable. The fix was not to weaken either but to add a way to say the
  third thing.
- **A declared-and-unused enum value is a design already half made.** Both
  `RETIRED` and `ARCHIVED` existed in the schema before any code wrote them.
  Finding one is a hint that the intended path was mapped and never walked.
- **Two implementations of one rule is the defect.** #73 filtered offer state
  while the variant carried the truth; #77 removed the second copy. The same
  lesson [[sals3-session-2026-09-08-part142-the-list-reads-stored-answers|part 142]]
  drew from `product_list_facts`.
- **A fix that only works forwards is half a fix.** #73 was correct for every
  future retirement and did nothing for the row that prompted it. Ask which
  existing rows a change repairs, not only which new ones it prevents.
- **An audit that counts cannot be re-read.** `retiredSupplierLabels` records
  which row was set aside, because the supplier label is exactly what CJ can
  change out from under the record.

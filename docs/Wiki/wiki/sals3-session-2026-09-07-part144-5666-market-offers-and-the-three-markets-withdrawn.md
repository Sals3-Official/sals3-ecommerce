---
tags: [session-record, sals3, portal, pricing, offers, break-glass, market-rules]
aliases:
  [
    "Part 144",
    "5,666 market offers and the three markets withdrawn",
    "The market-offer backfill",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-07-part143-a-duplicate-combination-and-the-offer-that-held-a-product-off-sale]]"
  - "[[sals3-session-2026-09-07-part145-the-fiji-storefront-stops-showing-australias-price]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
---

# Part 144 — 5,666 market offers written, three timeouts, and the three markets withdrawn

> [!IMPORTANT] This is step 2 of ADR-003's Fiji amendment, and it ran
> [[hot]]'s Fiji entry recorded step 2 as owed and warned that *"step 2 must not
> merge before that backfill runs."* It did run — on SIT and then on production
> — and the storefront filter (step 3) landed after it. This note is the record
> of the run, including the three separate ways it failed to finish first.

> [!NOTE] Provenance
> Written after the fact from each PR's own record and the endpoint responses
> captured while running them. All PRs are `anythingsupplies/sals3-portal`,
> merged 2026-09-07 between 02:10 and 10:21. Promotion PRs not listed.

| PR | What it did |
| --- | --- |
| [#76](https://github.com/anythingsupplies/sals3-portal/pull/76) | The backfill itself — insert-only, paged, resumable, behind `CRON_SECRET` |
| [#86](https://github.com/anythingsupplies/sals3-portal/pull/86) | A signed-in seller can run it, because `CRON_SECRET` turned out to be unreachable |
| [#91](https://github.com/anythingsupplies/sals3-portal/pull/91) | Stop recounting the catalogue on every page — the recount was the cost |
| [#92](https://github.com/anythingsupplies/sals3-portal/pull/92) | Bound the page by **offers written**, not products scanned |
| [#94](https://github.com/anythingsupplies/sals3-portal/pull/94) | Do not sell into a market nobody has set up, and pause the ones that were |

## 1. What was broken, and for how long

Publication took **one** destination until #69. Because `market-rules/page.tsx`
removed the only way to create a `seller_market_profiles` row on 2026-08-20,
**no seller has one** — so that single destination was always the first on the
platform list, `AU`.

Every product published before that fix carries an `AU` offer and nothing else.
Fiji's operating expenses (50%) and its full column of category markups (200%)
**had priced nothing at all** since the market was opened.

#69 repaired new publications. #76 repaired the ones already live — and it is
the precondition for the filter: the moment a `market_code` filter exists, a
Fiji storefront asking for `FJ` offers that were never written sees an **empty
catalogue**.

## 2. Why not `reprice.ts`, which already loads every live offer

Repricing is the obvious neighbour: it already reads every live offer with the
supplier evidence needed to price it again, and the seller already has a
**Reprice live products** button — no `CRON_SECRET`, no workflow, no Actions
billing.

It does not fit. `RepriceLine` carries an `offerId` and an `offerVersion`, and
`writeReprice` compare-and-sets on that version. **An offer that does not exist
has neither.** Teaching a seller-facing preview/apply flow to also create rows
would change its line shape, its fingerprint, its audit and its counts — real
risk to a working feature, to save a one-off run. So the repair took the
break-glass shape every sibling in `api/internal/catalog/products/` already uses.

### The three properties that mattered

**Insert-only.** `onConflictDoNothing` on the same unique key publication uses.
A price a seller set is never touched; a second run finds nothing and reports `0`.

**Paged and resumable.** 200 products per run, ordered by product id, returning
`nextAfterProductId`. Not decoration: the scan selects products that are
*published*, not products still *missing a market*, so an unpaged repeat would
re-read the same first page forever and never reach row 201 — the exact failure
`reprice.ts` shipped once and documented in its own `afterSku` comment.

**Audited as one decision.** One audit event per market carrying the count, not
one per offer. Two thousand rows changed by one decision is one decision.

## 3. The trigger that could not be pulled (#86)

The `CRON_SECRET` path shipped in #76 turned out to be **unreachable**, for two
independent reasons:

- `CRON_SECRET` is a Vercel **Sensitive** environment variable — write-only by
  design, so nobody can read it back. Not the owner, not whoever set it. The
  dashboard offers no *Reveal Value*, only *Edit*.
- The workflow that holds it cannot run. A dispatch on 2026-09-07 confirmed it:
  `started 08:12:24 → updated 08:12:30` = **6 seconds**, job `backfill`:
  `failure — 0 steps`.

**A repair with no reachable trigger is not a repair.** Rotating a secret AJ
configured, to work around that, would be worse than opening the door the editor
API already opens for every other internal product route — so the route gained
`authorizeEditorApiRequest`: the same credential the browser editor's Server
Actions use, the same CSRF guards (a custom header a cross-site form cannot set,
plus `Sec-Fetch-Site`), and the same gates — verified email, enrolled 2FA,
`product:edit`, and ADR-006's `DROPSHIPPER` rule. No new trust boundary.

### Two callers, two scopes, and the difference is the point

| Caller | Scope |
| --- | --- |
| `CRON_SECRET` | whole catalogue |
| `PRODUCT_EDITOR_API_SECRET` | whole catalogue |
| a signed-in seller's session | **that seller's products only** |

The deployment-wide secrets carry no tenant. A session carries its own and is
held to it — otherwise the route becomes a way for any signed-in seller to write
offers into another tenant's catalogue by naming it. The remaining-count is
scoped with the run too, or a seller is shown a remainder counting gaps their run
could never close.

Two new cases assert the tenant predicate on **rendered SQL** — the fake's
`where` is rendered through `PgDialect` rather than stringified, because
`String(sqlObject)` is `"[object Object]"` and every `toContain` against it would
pass vacuously.

## 4. Three timeouts, and the unit of work was the mistake

| Attempt | Bound | Result on SIT |
| --- | --- | --- |
| #76 | 200 products/page | first page repaired **2,579 offers** in under a minute; the next timed out doing far less |
| #91 | 75 products/page, and no recount on POST | still `FUNCTION_INVOCATION_TIMEOUT` |
| #92 | **400 offers**, checked between products | ~26 offers/second, well inside the 60s limit |

**#91 — the recount was the cost, not the repair.** `countRemaining` scans every
live variant and every offer they carry, so it is O(catalogue) — and it *grows as
the backfill succeeds*. Running it at the end of each page is the worst shape a
limit can have: **it fits when you test it and stops fitting as it works.** A
POST no longer counts; it repairs and reports what it wrote, `remaining` is
`null`, and the GET is where state is read. Observed live: SIT went 8,795 → 6,216
missing pairs on the first page before the timeout, so the repair itself was
already proven.

**#92 — products are the wrong unit.** One page of 16 products wrote **1,066
offers**. An offer is a `(variant, market)` pair, so a product with twenty
variants across five priced markets is a hundred resolver calls on its own.
Bounding the *scan* cannot bound the *work* when work per row varies by two
orders of magnitude.

Two details in #92 worth keeping:

- **The cursor names the last product it finished**, not the page's final row.
  Handing back the final row would skip every product between the one it stopped
  on and the end of the page — permanently, because the next page starts after
  that id. Insert-only makes redoing a product free, so the cursor lags on
  purpose.
- **`truncated` is the page lookahead OR the offer budget.** The lookahead alone
  would report `false` on a page cut short by the budget, ending the caller loop
  with the catalogue half repaired and nothing saying so.

## 5. The backfill wrote three markets nobody had set up (#94)

The run wrote **5,666 offers across every *authorized* destination.** Three of
them — `NZ`, `US`, `CA` — were not set up: a full column of category markups at
**0%** and no operating expenses at all, which Market Rules renders as *"Not set
up yet"*. **The resolver priced them anyway, at zero margin.** And because the
shared storefront prices a card from the cheapest offer across markets:

| `sit.sals3.com` | |
| --- | --- |
| before | **US$3.36** — "Every option is this price" |
| after the backfill | **US$1.12** — "Three of the five options cost more" |

Near cost, advertised. **Owner decision: withdraw `NZ`, `US` and `CA` for now.**

### Why the existing skip missed it

It keyed on `PRICING_POLICY_REQUIRED`, which only fires when a market has
**neither** a store default **nor** a category policy. These three had the second
without the first, so they sailed through.

`filterToSetUpDestinations` tests what "Not set up yet" actually means — the
store default itself, read for the named destination with **no Global fallback**
(`scopeCondition`). *A category markup without operating expenses is not a
market; it is half a configuration, and half a configuration priced at zero.*
Both writers use it.

### The undo is a pause, not a delete

`publishedScope()` requires `PUBLISHED`, so a pause is invisible to buyers
immediately — the same mechanism a seller pausing a listing uses, and the one
`resumeProduct` reverses. Deleting would be the wrong trade twice: a row a buyer
could have seen is history rather than litter, and its `pricingDecision` records
exactly which rule priced it at cost; and an absent row is one the backfill would
write again the moment somebody sets that market up halfway.

**The owner's word was "muna"** — for now. A pause is what that means in the
schema.

The two repair routes now share `catalog-repair-auth.ts` rather than each
carrying its own copy of the authorization ladder.

## 6. Verification

CI billing-blocked throughout. Locally, cumulatively: `tsc --noEmit` clean,
`eslint` clean, `prettier --check` clean, and the full unit suite rising through
the series — **3997 → 4004 → 4005 passed**, 4 skipped. Live observations are
quoted above rather than inferred: the SIT missing-pair counts, the per-second
rate, and the `sit.sals3.com` price before and after.

## Lessons

- **A limit whose cost grows with its own success is the worst shape a limit can
  have.** It passes every test and fails in production once the work starts
  landing.
- **Bound the work, not the scan.** When cost per row varies by orders of
  magnitude, a row count is not a budget.
- **A write-only secret is a trigger nobody can pull.** Vercel Sensitive
  variables are unreadable by design; if the only caller that knows one cannot
  run, the capability is gone. Vercel Cron and a session credential are the two
  doors left — see [[sals3-session-2026-09-07-part149-notify-every-market-storefront-and-two-jobs-onto-vercel-cron|part 149]].
- **"Authorized" and "set up" are different facts.** The destination list said a
  market was permitted; only the store default said anyone had decided its
  prices. Pricing from the first is how three markets went live near cost.
- **A cursor should lag when redoing work is free.** Naming the last *finished*
  row costs one repeat and cannot skip; naming the last *read* row cannot repeat
  and can skip permanently.

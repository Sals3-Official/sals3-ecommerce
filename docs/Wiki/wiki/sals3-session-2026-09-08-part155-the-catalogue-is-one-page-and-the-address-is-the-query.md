---
tags: [session-record, sals3, portal, catalogue, performance, url-state, pagination]
aliases:
  [
    "Part 155",
    "The catalogue is one page, and the address is the query",
    "Server-side listings and live refresh",
  ]
created: 2026-09-09
updated: 2026-09-09
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-08-part142-the-list-reads-stored-answers]]"
  - "[[sals3-session-2026-09-07-part141-the-day-the-catalogue-stopped-being-expressible]]"
  - "[[nextjs-component-security-code-rules]]"
---

# Part 155 — The catalogue is one page, and the address is the query

> [!NOTE] Provenance
> Written after the fact from each PR's own record and the production timings
> quoted in them. All three PRs are `anythingsupplies/sals3-portal`, merged
> 2026-09-08. Promotion PRs not listed.

| PR | What it did |
| --- | --- |
| [#176](https://github.com/anythingsupplies/sals3-portal/pull/176) | `/listings` reads **one page** from the database; every control becomes a search parameter |
| [#177](https://github.com/anythingsupplies/sals3-portal/pull/177) | Paging a filtered sourcing list pages **that** list |
| [#194](https://github.com/anythingsupplies/sals3-portal/pull/194) | The list stays current while someone is watching it |

## 1. Stored answers made a row cheap; they did not fix the row count

[[sals3-session-2026-09-08-part142-the-list-reads-stored-answers|Part 142]] took
the `/listings` render from 1,846 MB to ~540 MB by storing the answers. **It did
not make the number of rows fixed.** The page still shipped every summary the
seller owned so the browser could count five tabs, fill two dropdowns, filter,
sort and page.

Measured on production:

| Catalogue | Render |
| --- | --- |
| 2,939 products | **1.5s** |
| 5,274 products, one day later | **3.1s (P75)** |

Still growing with the catalogue, only more slowly. At 15,000 it would have been
a multi-megabyte response to answer *"how many are Live"*.

### Five scoped queries, no DDL

Every one on the seller's indexed column:

- **the rows** — `WHERE <tab, filters, search> ORDER BY <sort> LIMIT :size OFFSET :offset`
- **the total** under the same WHERE, for the pager
- **the tab counts and both quick-filter counts in ONE aggregate** —
  `count(*) … GROUP BY listing_status` with two `FILTER` clauses, over
  `product_list_facts_seller_status_idx`, *the index the table was created with
  for exactly this read*
- **the category and supplier dropdowns** — `SELECT DISTINCT` over the facts

The page now reads at most `pageSize` summaries plus a handful of aggregates
**however many products the seller owns.** Every column the filters and search
need was already stored by the facts writer, including the newline-joined variant
SKUs and ids the search reads with `ILIKE` — so part 142's table paid for this
change in advance.

## 2. The address is the state

Tab, search field and term, every filter, sort, page and page size are search
parameters:

- **spelt as words** — `?sort=price-asc`, `?media=own-pictures`;
- **omitted at their defaults**, so the everyday link is still `/listings`;
- parsed with the rule `?status=` already had — **anything unrecognised is the
  default, never an empty table.**

A filter is now bookmarkable, shareable and survives a reload. That is the same
property the catalogue tabs gained earlier, extended to every control on the
screen.

## 3. A pager that drops its filters is paging a different list (#177)

Pick a CJ category on Product Sourcing, press **Next**, and page 2 arrives
**unfiltered** — a different set of candidates, with the control back at "All
categories". Reported by the owner 2026-09-09.

```ts
const tabParams = { tab, ...(search === '' ? {} : { q: search }) };
```

`tab` and `q`, nothing else — so `cat`, `stock`, `seen` and `added` were dropped
from every page link.

**The module already had the answer.** `pipeline-params.ts` carried
`pipelineCurrentParams()`, whose own comment reads *"the parameters every in-page
link must carry forward."* **The pager was the one link not using it.**

`pipelinePagerParams()` is now the whole URL state except `candidate` — the
drawer is the one key a page link must **not** carry, because paging moves to
rows its candidate is not among, and holding the panel open over them would
describe a candidate that is no longer listed.

### What deliberately did not change

**Switching tab still drops the filters** — and that is now *stated where it
happens* rather than left as an accident of a shared variable. A tab is a
different decision status carrying its own **unfiltered** count in the strip
above it, and the filter bar only renders on two of the six tabs, so arriving at
Blocked with a category filter applied would show a number that disagrees with
the tab it came from.

`tabParams` turned out to be dead once the pager stopped using it — the tab strip
had its own inline copy of the same expression.

## 4. A clock, and nothing else (#194)

#176 made the catalogue one server render, one query, done — so it **never
changed on its own.** A seller adding items in one tab, or an automation adding
them, had to reload the other tab to see the counts move.

> Owner, 2026-09-09: *"dapat realtime nakikita ito."*

`CatalogueLiveRefresh` calls `router.refresh()` every **15 s while the tab is
visible**, which re-runs the Server Components for the current URL and **keeps
client state**: the checkbox selection survives, an open row menu survives, and
the filters were already in the URL.

- **Stops when the tab is hidden.** A tab left open over a weekend would otherwise
  ask the database ~50,000 times for a screen nobody is watching.
- **Refreshes once on return**, then resumes — so the first thing the seller sees
  is current, not up to 15 s old.
- **A flicker between tabs is not two requests**: the catch-up only fires when the
  last refresh is at least an interval old.

**Why polling rather than a push channel:** *the question a person watching a
batch asks is periodic — "how many now?" — not event-shaped.* A push channel
would be new infrastructure for one number. Cost: one function invocation and
five indexed queries per tick, ~2,000/day for a tab open all day — a few percent
of the plan's included invocations, no new bill.

A small caption beside the tabs says the page is live and names the interval,
so the behaviour is disclosed rather than mysterious.

## 5. Verification

`npm run verify` PASS on each — lint 0 errors (5 pre-existing warnings in
`scripts/`), format:check, typecheck and build clean, full unit suite green. All
local; Actions unfunded since 2026-09-04.

## Lessons

- **Cheap rows and a bounded row count are two different problems.** Part 142
  solved the first; the response was still O(catalogue) until this.
- **Put the aggregate in one query with `FILTER` clauses.** Five tab counts and
  two quick-filter counts came from one `GROUP BY` over an index that already
  existed for it.
- **Unrecognised URL state must fall back to the default, never to empty.** A
  hand-edited or stale link should show the list, not an empty table.
- **Omit parameters at their defaults** so the plain URL stays plain and the
  interesting state is the only thing in the address bar.
- **A pager must carry every parameter that decides which rows are listed** — and
  must *not* carry the one that opens a detail panel.
- **When a module has a "carry these forward" helper, the bug is usually the one
  call site not using it.** Look for the exception before writing a new helper.
- **`router.refresh()` is the cheap live update in the App Router**: it re-runs
  Server Components for the current URL and preserves client state, so selections
  and open menus survive a tick.
- **Gate any polling on document visibility, and catch up once on return.**
  Otherwise an open tab bills for a screen nobody is watching.

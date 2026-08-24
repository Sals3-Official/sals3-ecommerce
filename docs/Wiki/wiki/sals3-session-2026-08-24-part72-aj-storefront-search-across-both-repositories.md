---
tags:
  [
    sals3,
    session-note,
    sals3-portal,
    sals3-ecommerce,
    storefront,
    search,
    seo,
    read-model,
    aj,
  ]
aliases:
  - Part 72
  - AJ Storefront Search
  - The Search Box That Never Searched
created: 2026-08-25
updated: 2026-08-25
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[storefront-product-contract-v2]]"
  - "[[sals3-session-2026-08-25-part73-image-specs-a-mirror-leak-and-a-test-that-assumed-its-upstream]]"
---

# Part 72 — AJ: the header search box that had never searched anything

Written from the merged pull requests rather than from the working session — AJ
built this, and this note exists so the vault carries it. Two repositories, two
merges, **no migration in either**.

- `sals3-portal` [#185](https://github.com/Sals3-Official/sals3-portal/pull/185) — `GET /api/storefront/search`, merged `3d237d5`
- `sals3-ecommerce` [#157](https://github.com/Sals3-Official/sals3-ecommerce/pull/157) — the box, `/search`, and the producer call, merged `d51e06c`

## What was actually there before

The header search box had **no form, no submit handler, and no results page to
land on**. It rendered, and that was all it did. Two things it displayed were
worse than inert:

- a placeholder advertising **"Search 1,500,000 products"** over a catalogue
  with a few dozen published rows;
- a **"Recent searches"** dropdown listing three hard-coded strings —
  `solar wall lamp`, `wireless earbuds`, `office chair` — presented as the
  visitor's own history, when Sals3 stores no search history at all.

Both were **deleted rather than reimplemented**. A real recent list needs
somewhere to store one and a real count needs counting. `page.test.tsx` had
asserted the old placeholder and now asserts the honest one, which is the part
worth keeping: the fabricated claim had a test holding it in place.

## The endpoint (#185)

```
GET /api/storefront/search?q=&category=&sort=&page=&limit=&minPriceMinor=&maxPriceMinor=
```

**Title only, substring only.** Not the category name — searching "electronics"
would then return the whole department rather than the products actually called
that, and a buyer cannot tell which of the two happened. Not the description
either: a word buried in supplier copy is not what someone searching a product
name means.

**The term is matched as characters, not as a pattern.** `%` and `_` are `LIKE`
wildcards, so a buyer typing either would silently widen their own search — `%`
alone matching the entire catalogue. `escapeLikePattern` handles it, pinned in
`read-model.search-scope.test.ts`:

```
term '50% off_now'  →  bound param '%50\% off\_now%'
```

The value was always parameterised, so **this is not an injection fix**. It is
the difference between searching for what someone typed and searching for
something they did not write. Worth keeping straight, because "escaping a LIKE
pattern" reads like a security fix and is not one.

### Two states that are deliberately not errors

- **A blank term is an empty result, not a `400`.** Clearing the box is an
  ordinary interaction, and it short-circuits without touching the database.
- **An unknown `category` narrows to nothing rather than being ignored**, using
  the same `departmentNameForSlug` allow-list the browse route uses. A filter
  the caller asked for and silently did not get is worse than one that matched
  nothing — only the second is visible in the answer.

### Sharing, not duplicating

Everything that decides what is *public* stays shared with the rest of the read
model — `publishedScope`, `listBase`, `toListRow`, `withRatings`. Only the
narrowing differs, **so search cannot drift from the catalogue it searches**,
and the count is taken over the same predicate and the same `HAVING` as the
page. Two private helpers lost their `department` prefix in passing; they were
never department-specific.

## The storefront half (#157)

Results wear the category listing's shell — same sidebar, toolbar, grid/list,
chips and pagination — so a search looks like the browse page a buyer already
knows.

**The one real difference is the Department section, and it is why
`SearchFilterPanel` is a separate component rather than a `mode` prop on the
browse panel.** On `/c/[slug]` a department is a *destination* and each row
navigates away; on `/search` it is a *filter*, so each row is a search link and
"All departments" clears it while the keyword stays. AJ's reasoning, recorded
because it generalises: one component with a flag deciding what a click means is
the kind of prop that reads fine and then takes the wrong branch.

**The keyword survives every control.** `searchHref` carries `q` through
department, price band, typed range, sort, view and page.

**The term is deliberately not a chip.** A chip is something you remove to widen
results, and removing the term does not widen a search — it ends one. Clearing
is worded "Keep the search, clear the filters".

### Four states, kept apart

| State | Says |
|---|---|
| No keyword yet | "Search the catalogue" — an invitation, not a report of nothing found |
| Nothing matched | "No products match X", and that search reads titles only |
| Nothing matched **with filters** | Names the filters, offers to clear them |
| Catalogue unreadable | Says so — never "no results", which a failed read cannot support |

Only the third offers to clear filters. Offering it with none set sends a buyer
to click a control that does nothing. The fourth is the one that matters most
here and it is the same distinction `category.spec.ts` already drew: **an
unreadable catalogue must never be reported as an empty one.**

## Two decisions worth keeping

**No `useRouter` in the box.** It is a real `<form method="get" action="/search">`
and the browser's own submit does the work, so it degrades with JavaScript off.
Soft navigation would have cost `useRouter` in a component the header renders on
*every* page — including statically rendered ones and every test mounting a page
without an app router. AJ records that the attempt **broke 20 existing tests
before it was dropped**. The current keyword reaches the box as a prop from
`/search` rather than through `useSearchParams`, which would force every page
carrying the header out of static rendering.

**`/search` is `noindex, follow`.** A results URL is generated by visitors, not
authored, so crawling it produces unbounded near-duplicate pages keyed on
whatever anyone typed — the thin-content pattern
[[sals3-geo-aeo-seo-strategy-proposal]] warns about. `/c/[slug]` remains the
indexable browse surface.

## Rate limiting considered and declined

Rule 29 was weighed and refused, on the reasoning already recorded for the
browse route: the only caller is the storefront's own server, so a per-caller
bucket throttles every buyer at once and stops nobody past the shared token.
Work per request is bounded — `q` at 80 characters, `limit` 30, `page` 10,000,
`category` from 21 values — and repeats are cached. The reasoning and its
reversal conditions live in the route itself.

## Deliberately deferred

`ILIKE` needs no schema change and suits the current published count. It is also
**the first thing here to replace**: no index, and no notion of a better match.
Before the catalogue grows it wants a `tsvector` column with a GIN index and
`websearch_to_tsquery` — deferred because that is a migration, and production
migrations here are applied by hand through the break-glass endpoint.

## Verification, and the one thing it could not see

`npm run verify` green on both: **2,586 unit / 79 e2e** in the portal (18 new —
8 route, 10 SQL-shape), **815 unit / 57 e2e** in the storefront (10 new in
`e2e/search.spec.ts`). Exercised against live data: `q=a` → 20 results;
`+ category=apparel-accessories + band=u15` → 10.

**That live exercise is exactly why one of those e2e tests then failed on
`develop`.** It was written where the portal was running, and the storefront's
Playwright `webServer` starts only the storefront — so in an ordinary run the
upstream is absent and the page renders its *unreadable* panel rather than its
*empty* one. The test asserted the empty-state copy unconditionally, which made
it an assertion that the portal happened to be up. Repaired in
[[sals3-session-2026-08-25-part73-image-specs-a-mirror-leak-and-a-test-that-assumed-its-upstream]]
by branching on the state the way `category.spec.ts` already did.

Nothing about the feature was wrong. The gap was between two environments, and
neither CI run could see it: the branch had the portal, `develop` did not.

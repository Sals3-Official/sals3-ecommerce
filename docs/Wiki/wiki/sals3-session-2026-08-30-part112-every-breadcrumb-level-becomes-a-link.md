---
tags:
  - sals3
  - sals3-ecommerce
  - sals3-portal
  - taxonomy
  - pdp
  - session-note
aliases:
  - Part 112
  - Every Breadcrumb Level Becomes A Link
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-22-part67-the-catalogue-column-that-was-doing-nothing]]"
---

# Part 112 — every breadcrumb level becomes addressable, and the contract fixture that had already drifted

2026-08-30, `sals3-ecommerce`
[#201](https://github.com/Sals3-Official/sals3-ecommerce/pull/201)/[#204](https://github.com/Sals3-Official/sals3-ecommerce/pull/204)
and `sals3-portal`
[#278](https://github.com/Sals3-Official/sals3-portal/pull/278)/[#280](https://github.com/Sals3-Official/sals3-portal/pull/280),
no DDL in any of them.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## The department link, and a doc comment with an expiry date (#201)

On the live jeans PDP the breadcrumb read `Home / Apparel & Accessories /
Clothing / Pants / Men's Rhinestone Star Jeans…`, and the three category
levels were dead `<span>`s while `/c/apparel-accessories` already answered
200 with 107 published products behind it. `product-breadcrumb.ts`'s own
doc comment said "`/c/[category]` and `/categories` do not exist as routes
… when `/c/[category]` ships, give the leaf entry an `href`" — true when
written, false by the time this shipped, because the department page had
gone live and the comment never moved. Two other files repeated the same
claim. **A doc comment asserting a fact about another module is a claim
with an expiry date.**

`departmentIdForName` maps a display name to its `/c/[slug]` segment from
the same 21-department list every other browse surface already uses — not
a slugifier, because `sals3-portal`'s `slugBaseFromTitle` is the forward
direction and its own doc says no expression inverts it; a second slug
implementation here would be a drift generator. Only the first category
segment is eligible, since that is the only position an L1 department can
occupy. `/c/clothing` and `/c/pants` were both verified to answer 404 —
only the 21 departments were routable at this point — so deeper segments
stay text rather than pointing at a guessed URL. `All categories` was added
between Home and the department to match `CategoryBreadcrumb`, which the
department page already rendered; two breadcrumbs disagreeing about one
hierarchy's shape reads as two different sites. `BreadcrumbSchema` needed no
change, since it already emits `item` for any entry carrying an `href`.
Measured on production rather than assumed: `/c/apparel-accessories` → 200 /
107 products, `/c/clothing` → 404, `/c/pants` → 404.

## Deeper levels get an address with no new migration (`sals3-portal` #278)

Owner decision the next day: **a breadcrumb that shows four levels and
links one is not a breadcrumb.** A bare slug cannot identify a deeper
level — `slugBaseFromTitle` lower-cases, collapses and truncates, and its
own doc says no expression inverts it. But every level already had a unique
key: its own `sals3_categories` row and its own `CAT-GGL-<Google numeric
id>` code — `Paper Products` is `CAT-GGL-956`, `Notebooks & Notepads` is
`CAT-GGL-961` — so a deeper level is addressed as `<slug>-<id>`. The owner
chose this over a nested path (`/c/office-supplies/paper-products`), which
is prettier but needs a new `slug` column and therefore a migration and a
break-glass DDL run before any reader could ship; **this needs no DDL at
all**. The id is authoritative and the slug decoration:
`taxonomyCodeFromSlug` reads only the trailing digits, so a renamed
category or a mangled link both still resolve, and an id the seeded extract
does not contain 404s **before any query** — the allow-list stays the
security boundary at the one place a buyer-controlled path segment becomes
a query value.

L1 keeps its bare slug (`/c/office-supplies`), linked from home tiles, the
footer and the browse sidebar with a curated name list on both sides of the
wire — changing those 21 URLs would break four surfaces for nothing. A
deeper node's scope is its subtree: `categoryScopeCondition` matches `path =
x OR path LIKE 'x > %'`, the separator appended so `Shoes` cannot also match
`Shoes & Boots` (the same trap `reprice.ts` already documents, now one
shared helper instead of a second copy). The wire gained `categoryTrail` —
one entry per level, each with its own `/c/[slug]` where addressable,
`categoryPath` kept beside it for any consumer with no interest in links. A
level with no address has no `slug` at all, so a CJ-mirrored product
(entire supplier path in one segment, never seeded) renders as text rather
than a guessed 404. Product cache key bumped `v6` → `v7`; the feed key
stayed `v3` since a card row has no breadcrumb. One judgement call surfaced
in the PR itself: `category-trail.ts` deliberately does **not** carry
`import 'server-only'`, because it is reached through `catalog-feed.ts`,
which six `/api/storefront/*` routes import — the risk is asserted instead,
by a test that walks the import graph from every `'use client'` module and
fails if any path reaches the trail.

## The storefront half, and the fallback that keeps neither side a hard gate (#204)

Pairs with `sals3-portal` #278, additive and merged first so this one falls
back to #201's department-only linking until the portal PR lands — **the
trail wins whole, or not at all**, never mixed: a page whose first crumb
came from one contract and whose second came from another would hide their
disagreement, so a test pins that a trail marking `Apparel & Accessories`
unaddressable beats the `categoryPath` fallback that would otherwise have
linked it. `/c/[slug]` no longer gates on `isDepartmentId`, because it
cannot — 21 known department names against 5,595 taxonomy rows means this
repository cannot tell a real `<slug>-<id>` from an invented one, so the
producer is the sole authority, and a producer 404 means two different
things depending on the slug: one of the 21 departments 404ing is
deployment skew (renders the outage page, unchanged), anything else 404ing
means no such category (`notFound()`) — rendering an empty category in the
second case would tell a buyer an address they invented exists and happens
to be empty. `CategoryBreadcrumb` gained `ancestors`, without which landing
on a deep category page would leave no way to climb back out. A known,
stated limitation: a level below a department is `noindex, follow`, since
titling it correctly would need a second producer round trip the page does
not yet make.

Something found and deliberately not folded in: the shared contract fixture
gained `categoryTrail` only, and while doing that, the fixture and the
portal's copy — **documented as committed identically** — were found not
to be: the storefront's carried the paragraph `runs` field the portal's
did not, and the two were formatted differently, invisible because each
repo's test only compares its own copy against its own serializer.

## The drift, found and fixed (`sals3-portal` #280)

Confirms the finding above: the two copies of
`test/fixtures/storefront-product-detail.json` had disagreed for **eight
days**, and the note claiming *"a contract change that lands on only one
side fails a test in whichever repository moved"* was false and had been
believed. Three fixes: `runs` made canonical in the row that was missing
it, with the serializer's output now matching the sibling's committed bytes
exactly (`sha256 e7600cac…` on both sides); a `FIXTURE_SHA256` literal
asserted identically in both repositories — genuinely weaker than the
original claim, and stated as such, since nothing here can read the sibling
and a fixture change is now a two-repository change with both hashes moving
in the same pair of commits, but each copy becomes tamper-evident and a
reviewer compares two strings instead of running a diff nobody runs; and
the doc note corrected rather than left standing. Proved by flipping one
word in the fixture and watching the hash assertion fail, then restoring
it.

The same PR corrects two things #278 itself got wrong: a leftover
`vi.mock('server-only')` and a stale comment in `category-trail.test.ts`,
since the guard had been deliberately dropped from that module in the same
change; and `category-trail.client-boundary.test.ts` re-reading every file
once per client entry (~50 nearly-overlapping entries), which passed alone
and timed out at 10s inside the full suite — fixed by memoising `importsOf`
across the run, dropping the test from 1.88s to 0.31s.

## Verification

#201: **1,075 unit tests pass**, **63 e2e pass / 2 skipped**, nine new and
updated tests each shown to fail against the old function before being
trusted. #204: **1,084 unit tests pass**, **63 e2e pass / 2 skipped**, nine
new tests; an e2e run without `.env.local` was found to silently drop most
specs (32, then 16, before `SALS3_STOREFRONT_API_TOKEN` was restored) —
the 63 quoted is with it present, matching `develop`. #278: **3,518 unit
tests pass**, **65 e2e / 10 skipped**; one guessed category id in a test
was wrong and the test caught it. #280: **3,528 unit tests pass**, **65
e2e / 10 skipped**; both fixtures verified byte-identical by `diff` and
`sha256sum`, not by inspection.

## Lessons

- **A doc comment that asserts a fact about another module has an expiry
  date** — the department route shipped, the comment describing it as
  unbuilt did not move, and the breadcrumb kept refusing a level that had
  become linkable.
- **An id is a more durable address than a slug.** `taxonomyCodeFromSlug`
  reading only the trailing digits means a renamed category or a mangled
  link both still resolve — the slug is decoration, the id is the
  contract.
- **A 404 can mean two different things depending on who is authoritative
  for the segment that 404s** — a known department 404ing is deployment
  skew; an unknown id 404ing is "no such category," and conflating them
  either hides an outage or invents a category that does not exist.
- **A trail must win whole or not at all.** Mixing one level's address
  from a newer contract with another's from an older fallback would hide
  the two contracts disagreeing rather than surface it.
- **"Committed identically" is a claim that needs an assertion, not a
  comment.** Two independently-tested fixture copies drifted for eight
  days because each repository's test only ever compared its own copy
  against its own schema — a shared hash literal is what makes the drift
  visible in both places at once.

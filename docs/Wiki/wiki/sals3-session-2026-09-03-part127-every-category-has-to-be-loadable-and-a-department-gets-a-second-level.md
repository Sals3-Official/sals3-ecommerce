---
tags:
  - sals3
  - sals3-portal
  - sals3-ecommerce
  - taxonomy
  - storefront
  - catalog
  - category-browsing
  - automation
  - session-note
aliases:
  - Part 127
  - Every Category Has To Be Loadable, Not Only Pants
  - The Department Page Gets A Second Level
created: 2026-09-03
updated: 2026-09-03
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[category-routing-and-breadcrumb]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
---

# Part 127 — every category has to be loadable, and a department gets a second level

2026-09-02/03, `sals3-portal`
[#9](https://github.com/anythingsupplies/sals3-portal/pull/9)/[#13](https://github.com/anythingsupplies/sals3-portal/pull/13)/[#15](https://github.com/anythingsupplies/sals3-portal/pull/15)/[#16](https://github.com/anythingsupplies/sals3-portal/pull/16)/[#32](https://github.com/anythingsupplies/sals3-portal/pull/32),
`sals3-ecommerce` [#10](https://github.com/anythingsupplies/sals3-ecommerce/pull/10).

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## The attribute-decision rules were pants-shaped (#9)

Owner instruction, from the first mixed-category automation run: every
category must be loadable, not only pants. That first run (treadmill, shin
guard, pants together) left the non-pants items with **6 pending attribute
fields each**, because the decide route's rule tables were written for
pants.

**A generic pass** now runs in `suggest-attributes-rules.ts` after the
pants-specific tables, for every still-blank field in *any* category: each
allowed value is split into word signals (`Soccer / Football` →
`soccer`, `football`), and a field is decided automatically only when
exactly one allowed value's signals match the product's own words — pulled
from the same sources every other rule already uses (title, supplier
property values, photo answers), so nothing is invented. Four guards, each
pinned by its own test: whole-word matching only (`Women's` contains
`men`, and a substring match would call a women's product men's); a
negation window (a supplier literally writing "this cover is **not**
waterproof" must not fire `IPX7 Waterproof`, while a vocabulary entry that
itself contains the phrase `Not Waterproof` should still fire when the
supplier says exactly that); ambiguity refuses rather than guesses ("Football
Basketball Volleyball Storage Bag" matches more than one sport and stays
pending); and short, numeric, or stopword fragments never signal on their
own.

The same PR adds `GET /api/internal/catalog/taxonomy/search?q=…`, returning
v1 taxonomy leaves whose path contains every word of the query, shortest
path first. Category selection for non-pants candidates had been done by
the automation client reading the 5,595-row taxonomy JSON directly — a
second, independent copy of `sals3_categories` free to drift from the
database. The new endpoint is served through the sanctioned read-only
`v1-reference.ts` surface (so the one-authorized-governance-caller boundary
test still holds — the first draft imported the write-side repository
directly from the route, and that test correctly refused it), and its v1
prefix filter means an auto-created CJ-mirror row can never answer a search
whose whole purpose is moving a candidate away from CJ's own category text.

## One shared attribute vocabulary was covering incompatible product families (#13)

Auditing the taxonomy extract found only **27 distinct attribute sets across
5,595 categories** — and of those, 25 carry an honest escape hatch
(`allowCustomValue`, or values like `Not Applicable`/`Multicolor`/`No
Warranty`) that lets a seller answer truthfully regardless of what the
product actually is. Two families could not be answered truthfully at all:

**Sporting Goods (800 leaves)** had one `Size / Capacity Rating` list mixing
ball sizes, tent capacities, backpack litres, rod lengths and dumbbell
weights — offered against a treadmill, none of the options is an honest
answer, so the field could only ever stay blank on every sporting product.
Split per Level-2 family instead: Athletics gets ball sizes plus
S–XL/One Size/Not Applicable, Exercise & Fitness gets weight ranges plus
Adjustable/Not Applicable, Outdoor Recreation gets persons/litres/Not
Applicable, Indoor Games gets Standard/Compact/Not Applicable — each paired
with its own `Sport / Gear Type` vocabulary (Strength/Cardio/Yoga/Boxing for
fitness; Camping/Fishing/Cycling/Water/Winter/Climbing/Hunting/Skating for
outdoor recreation; Billiards/Table Tennis/Darts/Foosball/Air Hockey/Bowling
for indoor games).

**Furniture (121 leaves)** had leaked Kitchen & Dining vocabulary onto every
piece of furniture: a whole `Cooktop Compatibility` attribute, asked of bed
frames, and `Furniture / Item Type` offering `Cookware Pan / Pot`,
`Dinnerware Set`, and `Table Lamp` as furniture types. Both removed.

The membership lists deciding which leaves get which vocabulary are
**derived from the taxonomy extract by L1/L2**, not hand-enumerated, so a
future re-extraction keeps them aligned by construction rather than by
someone remembering to update a parallel list. Narrowing an attribute's
allowed values strands nothing already stored — both fields carry
`allowCustomValue: true`, and removing a value orphans-but-keeps whatever a
seller already saved against it, per the module's own documented rule.
`correctAttributeControls` now chunks its statements 20 at a time: the
corrections grew from the earlier skirt-neckline fix's 8 rows to roughly
1,900, and a single `Promise.all` over that many statements would flood the
connection pool.

## Spreading automation runs across categories, and a filter that never reached SQL (#15/#16)

A 2026-09-03 automation batch drafted three pairs of pants in a row, because
the Ready pile is feed-ordered and feed order is not variety. #15 puts the
Sourcing page's own Level-1 category filter on the internal API:
`GET /api/internal/candidates/ready?cjCategoryL1=<label>` narrows to one CJ
Level 1 through the same category-snapshot index and `providerCategoryIds`
predicate the pipeline page already uses, including its match-nothing rule
— an unknown label answers an empty page, never the unfiltered pile under a
narrowed name. Every ready row now also carries its own `cjCategoryL1`
(null if CJ's tree has since moved on), and a new
`GET /api/internal/candidates/cj-categories` serves the exact sorted label
vocabulary a caller must choose from, rather than making it guess labels.
No CJ calls anywhere — the category snapshot was already paid for when the
discovery cycle started.

**#16 is the fix for a bug #15 shipped**, found by testing the deployed
filter against SIT rather than by any unit test: `providerCategoryIds` had
been passed one level too high in the query options object — outside the
nested `filters` object the status-scope logic actually reads — so a
narrowed read silently served the unfiltered pile instead of the intended
empty-or-narrow result. A conditional object spread bypasses TypeScript's
excess-property check, and the existing mocked unit test had asserted the
exact same wrong shape it was feeding in, so only a live read against real
data could catch it. The tests now pin the correct nested
`filters: { providerCategoryIds }` shape.

## The department page gets a second level (#32, consumed by ecommerce #10)

`/api/storefront/categories` could answer which of the 21 departments have
anything published in them, and nothing below that — so nothing on the
storefront could ever link to a Level-2 category. #32 adds
`?scope=stocked-tree`: every stocked department, its own published-product
count, and the Level-2 categories inside it that themselves have published
products, each with its own count.

Measured live on 2026-09-03, one category page at a time: **Apparel &
Accessories carries 144 products**, of which **127 (88%) sit in one single
child category, Clothing** — with Clothing Accessories (7), Shoes (4),
Jewelry (4), Handbags/Wallets/Cases (2) and three at zero making up the
rest, summing exactly to the department's 144. Separately, only 13 of the
21 departments are stocked at all; 8 have nothing published in them.

Three implementation details worth keeping: the count uses `countDistinct`,
not `count` — the published-offer join fans out (one product with eight
variants becomes eight rows), and the endpoint this replaced never noticed
because it only checked whether a row existed at all, while a plain
`count(*)` here would have reported several hundred instead of 144. The new
data is its **own** query scope rather than fields folded onto the existing
`stocked` response, because the home page reads `stocked` on every render
purely for ordering and discards everything else — folding children in
would add a payload nothing on that hot path reads. And a child category's
`<slug>-<google id>` address is resolved through `categoryTrailForPath` —
the same function the PDP breadcrumb already uses — rather than a second
SQL self-join, so the two surfaces cannot address the same category two
different ways.

Deliberate edges: the query only projects Level-2 names from
`SALS3_TAXONOMY_DEPARTMENTS`, never from an auto-mirrored CJ row (whose
`l2` is an arbitrary supplier string); and a child category the taxonomy
cannot address is dropped from the tree while its products still count
toward the department's own total — dropping both would understate the
department, and dropping neither would make the visible children fail to
sum to it.

`sals3-ecommerce` #10 is the storefront consumer: `/categories` stops
repeating the same flat 21-department list — already shown on the home
carousel, the footer of every page, and the browse sidebar — and instead
renders one section per stocked department, tiling its Level-2 categories.
The eight empty departments are named at the bottom rather than
photographed at the top, staying browsable without costing a buyer a click
on an empty shelf. `DepartmentList`, the old flat view, is kept
**deliberately** as the fallback whenever the portal cannot serve the tree
scope (unreachable, or not yet deployed there) — there is a test for that
path specifically. The page's container also grew from `max-w-3xl` to
`max-w-6xl` to match the home page and header, since the narrower width was
why the page had been rendering a 768px ribbon inside a 1440px window all
along.

## What was not done

**No image per category.** Category tiles on the new `/categories` page
carry the parent department's own photograph rather than a picture of the
category itself, even though the field to change that (`imageUrl`) is
already on the wire from an unrelated feature and the storefront already
allow-lists the hosts it would come from — recorded as a known follow-up,
not attempted here.

**No integration test against real rows for #32.** The local database has
zero products, so the new `countDistinct` and `inArray` filter logic is
exercised by unit tests only; SIT is the first environment where it runs
against real data.

## Lessons

- **`countDistinct` and `count` disagree the moment a join fans out.** A
  published-offer join multiplying rows per variant is invisible to a
  boolean "does a row exist" check and produces a wrong number the instant
  the same query is asked to count instead.
- **A conditional object spread can put a value one level away from where a
  reader expects it, and a mocked unit test that pins the same wrong shape
  it is fed will not catch it** — only a read against real, live data
  surfaced #16's bug.
- **Word-signal attribute matching needs whole-word matching, a negation
  window, and an explicit ambiguity refusal, or it will mislabel a product
  from its own words** — a substring match alone would have called a
  women's product men's from the word "Women's" itself.
- **A shared attribute vocabulary across a taxonomy family is only safe
  when every member of the family can answer it honestly.** The 25 sets
  that carried `allowCustomValue` or an explicit "Not Applicable" survived
  being reused across many leaves; the two that did not (Sporting Goods,
  Furniture) silently blocked every product in the family from completing a
  required field.

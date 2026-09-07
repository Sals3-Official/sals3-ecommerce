---
tags: [sals3, session, sals3-ecommerce, sals3-com-fj, browse, navigation, taxonomy, ux, accessibility]
aliases:
  - Part 137
  - The Browse Surfaces Learn One Vocabulary
  - Twenty-One Names Against Fifty Categories
created: 2026-09-04
updated: 2026-09-07
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[sals3-session-2026-09-03-part127-every-category-has-to-be-loadable-and-a-department-gets-a-second-level]]"
  - "[[sals3-session-2026-08-30-part112-every-breadcrumb-level-becomes-a-link]]"
  - "[[sals3-session-2026-09-04-part138-fiji-gets-more-than-a-welcome-band]]"
  - "[[sals3-ux-build-specification]]"
  - "[[hot]]"
---

# Part 137 — the browse surfaces learn one vocabulary, and the rail comes off its cards

> [!NOTE] Provenance
> Written 2026-09-07 after the fact from each pull request's own merged record in
> `anythingsupplies/sals3-ecommerce` and `anythingsupplies/sals3.com.fj`. The
> measured figures quoted (`gridMarginTop: 0px`, the live SIT checks in §5) are
> each PR's own observation at the time.

| Repo | PR | Title | Merged (UTC) |
|---|---|---|---|
| ecommerce | [#12](https://github.com/anythingsupplies/sals3-ecommerce/pull/12) | feat(catalog): reach a category from the department page | 2026-09-03 17:58 |
| fj | [#4](https://github.com/anythingsupplies/sals3.com.fj/pull/4) | feat(categories): stocked categories, real photos, and a chip row | 2026-09-03 20:13 |
| ecommerce | [#16](https://github.com/anythingsupplies/sals3-ecommerce/pull/16) | chore(categories): drop the "Not stocked yet" panel | 2026-09-03 20:44 |
| fj | [#5](https://github.com/anythingsupplies/sals3.com.fj/pull/5) | the same removal, mirrored | 2026-09-03 20:51 |
| ecommerce | [#19](https://github.com/anythingsupplies/sals3-ecommerce/pull/19) | feat(browse): filter the category grid, browse at one level, drop the engineering notes | 2026-09-04 16:16 |
| fj | [#14](https://github.com/anythingsupplies/sals3.com.fj/pull/14) | the same, hand-ported | 2026-09-04 16:27 |
| ecommerce | [#22](https://github.com/anythingsupplies/sals3-ecommerce/pull/22) | fix(browse): take the filters off their cards, so the rail can breathe | 2026-09-04 17:28 |
| fj | [#15](https://github.com/anythingsupplies/sals3.com.fj/pull/15) | the same, four hunks by hand | 2026-09-04 17:39 |
| ecommerce | [#24](https://github.com/anythingsupplies/sals3-ecommerce/pull/24) | fix(browse): give the rail room to start, and stop saying category twice | 2026-09-04 17:57 |
| fj | [#16](https://github.com/anythingsupplies/sals3.com.fj/pull/16) | the same | 2026-09-04 18:06 |

No DDL, no portal endpoint, no contract change anywhere in this set. Everything
here is served by `?scope=stocked-tree`, which
[[sals3-session-2026-09-03-part127-every-category-has-to-be-loadable-and-a-department-gets-a-second-level|part 127]]
already built.

## 1. The dead end, stated precisely

Two surfaces browsed the same catalogue in **two different vocabularies**:

- the sidebar on a category page listed the **twenty-one department names,
  hardcoded**, whether or not anything was published under them;
- `/categories` listed the **fifty categories that actually hold products**.

So a buyer who reached `Clothing` found a sidebar with **no `Clothing` in it** —
only `Apparel & Accessories` — and **no way across to the sibling category they
had just been looking at**. That is a navigation dead end, not an inconsistency.

The department page was worse before #12: `/c/apparel-accessories` served **144
products behind a price filter and nothing else**. 105 of them were `Clothing`
and 3 were `Shoes`, and `Shoes` had a real, reachable URL that nothing on the
page pointed at. A buyer looking for shoes scrolled past a hundred garments or
gave up.

## 2. One projection, read by both

`stockedCategories` is now the single projection both surfaces read, and the
argument for that is worth keeping verbatim: **two projections of one tree drift
the moment either is edited; one function cannot.**

What came with it:

- **Counts** — the thing that separates a two-product category from a
  three-hundred-product one before a click.
- **The category being read is always in the list**, even when the eight-row
  cut-off would have hidden it. With fifty categories that is most of the
  catalogue.
- When the portal cannot serve the tree, the sidebar falls back to the department
  names **without counts** — because a `0` there would be a number nobody
  measured.

### The chip row answers in two directions from one lookup

#12's chip row sits above the results, one chip per stocked category, each
carrying its count. The department is found whether the slug names it **or one of
its children**, so "a way in" (from the department) and "a way across" (from a
sibling category) are the same code rather than two features.

**No new portal endpoint.** `?scope=stocked-tree` already carries the categories
and their counts — one cached read of about twenty-two rows, already revalidated
by the same catalogue tag as everything else on the page. A per-department
endpoint would be a second query, a second cache key and a second thing to keep
in step, to save a payload measured in hundreds of bytes.

Three deliberate silences, each with a reason:

- **nothing when the department has one category or none** — a single chip
  repeating the heading above it is furniture, not navigation. On the catalogue
  as it stood, that meant the row appeared on **Apparel & Accessories and nowhere
  else**: twelve of the thirteen stocked departments held exactly one category.
  That is the shape of the stock, not a missing feature.
- **nothing when the tree cannot be read** — it is an addition to the page, not a
  precondition for it, so a portal that cannot answer must not take a browse
  surface down.
- **only stocked categories** — a chip leading to an empty category is worse than
  no chip.

The category currently being viewed is **printed rather than linked**, with
`aria-current`: a link to the page you are already on is a dead control.

## 3. Filtering a taxonomy, and the two refusals in it

Fifty tiles is a scroll, so `/categories` gained a filter. **Department is the
only facet a *category* has** — a price band cannot describe `Clothing`, and a
sort by newest cannot order a taxonomy.

- **Links, not a control**, so every narrowed view has a real, shareable,
  crawlable address.
- **The sidebar counts from the whole tree, never the filtered view**, or it
  would collapse to one row the moment anybody used it and leave no way back out.
  fj#14 verified exactly this on live SIT: `/categories?d=sporting-goods` showed
  3 tiles with **the sidebar still showing all 10 departments**.
- **An unknown `?d=` is ignored rather than refused** — a browse surface is
  reached by links a buyer may have kept, and the whole catalogue is a more
  useful answer than a 404.

## 4. Two removals: the panel and the notes

**The "Not stocked yet" panel** (#16 / fj#5, owner's call). The foot of
`/categories` named the departments with nothing published in them. Removing it
hides nothing: those departments stay browsable at their own `/c/[slug]`, which
answers honestly, and all 21 names are still carried by three other surfaces —
the home carousel, the footer of **every** page, and the browse sidebar. **One
page stopped repeating a fact the site states three other times.**

The test was **replaced, not deleted** — the page still reads the full department
list for its fallback, so nothing structural stops a name reappearing here by
accident, and the new case asserts the panel's absence. It is **scoped to
`main`** deliberately, and that detail cost a debugging round: a document-wide
query for a department name **finds it in the FOOTER**, which lists all 21 on
every page. The first version of the assertion failed for a reason that had
nothing to do with the page under test.

**The engineering notes** (#19 / fj#14). *"Not filterable yet"* and *"What this
page knows"* were written for whoever built the page, not for whoever shops it.
Removed, along with `BLOCKED_FACETS` and both components. **The search page
carried the same panel and lost it too** — leaving one surface explaining its own
internals would be the same note in a place nobody asked for it either, and the
PR flags that as a judgement call rather than doing it quietly.

One assertion was kept out of the E2E case that pinned that copy: **there must be
no star-rating filter**, because no product on the storefront carries a rating.
The panel was the note; that is the fact, and it is still true.

## 5. The rail: borders, not padding

Three bordered white cards in a 248px column, twelve pixels apart, under a fourth
card holding the sibling chips — four edges stacked down one narrow strip.
Adding air *inside* those cards only makes the page taller. Taking the borders
off buys the space back for nothing:

| | before | after |
|---|---|---|
| row height | 36px | **40px** |
| between sections | 12px | **28px** |
| browse grid gap | 24px | **32px** |
| borders in the rail | 3 | **0** |

**The column is no taller than it was.**

It also draws a distinction the page did not have: **a white card is content or
navigation; the open ground is a control.** That began mattering one commit
earlier, when the sidebar stopped listing 21 department names and started listing
real categories with counts — which put it directly under the sibling chips,
*also* names with counts, *also* in a card, meaning something different. **The
chips move you to another category; the rail narrows the one you are in.** The
chips keep their card for exactly that reason.

The chosen row gains **a white face with a hairline** rather than a tint: with no
panel behind it, `bg-brand-600/10` reads as a smudge on the page, where something
lifted off the ground reads as picked.

`FilterRail` holds the section shell and the row classes, and the category
sidebar, the mobile sheet, the price facet and the search sidebar all render
through it — **four hand-maintained copies of the same panel is how the row
height came to differ from the app's own 44px target in the first place.**

### The follow-up, measured on the deployed page

`gridMarginTop: 0px` — **measured, not guessed**. The sibling-chip card and the
filter grid were flush against each other. That was survivable while the rail's
first element was a bordered card, because the border drew the boundary; with no
border, a nine-pixel eyebrow began immediately under the card's edge and the
whole region read as one crowded block. **24px, 32px from `lg`.**

And two headings, ten pixels apart, both saying *category*: the chip card headed
**"Shop a category"**, the rail beneath it headed **"Category"**.

> [!IMPORTANT] Hidden, not deleted
> The rail's `Category` heading became `sr-only` rather than being removed. A
> sighted reader needs neither — the rows are plainly categories, the chips
> plainly a different list. **A screen-reader user has none of that context**: no
> card boundary, no proximity. So the heading stays as the section's accessible
> name rather than leaving the list unnamed in the accessibility tree to save
> nine pixels of ink. `Price` and `Department` keep their visible headings,
> because nothing above them repeats the word.

## 6. The Fiji ports were hand-ports, and said so

Every Fiji PR in this set was **verified on global SIT before porting**, and
fj#14 lists what it checked rather than asserting equivalence — the
`?d=sporting-goods` narrowing above, `/c/clothing-1604`'s sidebar reading
`Clothing 105`, `Clothing Accessories 5`, `Exercise & Fitness 4`, `Shoes 3` …
**"All 16 categories"**, and all three removed strings absent.

They could not be clean cherry-picks, and each PR names the divergence instead of
burying it:

- fj#4 — `categories/page.tsx` and its test were byte-identical to the
  storefront's pre-change versions, so those were straight replacements.
  **`c/[slug]/page.tsx` was not**: this fork carries a fourth loader,
  `loadIndicativeContext()`, that the storefront does not. The category tree went
  in as a **fifth entry beside it** rather than replacing it — *"the patch
  stopped on that mismatch instead of overwriting, which is the only reason it
  was noticed."*
- fj#14 — three hunks re-applied by hand: the panel's props, the page's fetch
  block, the search panel's imports.
- fj#15 — four more, named individually: `CategoryFilterPanel`,
  `PriceFacetFields`, `SearchFilterPanel`, and the category page's grid gap.

The cause is the same in all three: the fork threads **indicative pricing** and
the **free-shipping threshold** through surfaces the global storefront does not.

## 7. A test race, and a poisoned cache — kept apart

Two unrelated e2e problems appear in this set and are easy to confuse.

**A real race in `search.spec.ts`.** It branches on `catalogueIsUnavailable`,
which is a `count()`, **and `count()` does not retry**. It asks the question
before the page can answer: the *"Search can't run right now"* panel has not
rendered yet, the helper reports the catalogue as available, and the case then
waits five seconds for empty-state copy that was never going to appear. The
failing run's own snapshot shows that panel present on the page. Diagnosed
properly rather than blamed on the change in flight — **three runs with the
change failed 3/3, three runs without it failed 2/3** — and fixed by waiting for
one of three terminal states before asking which one it got. Nothing is weakened:
both original assertions still run, and the wait is itself a new assertion.
Landed first in fj#8, then in ecommerce #19.

**A stale `.next` dev cache**, twice in one day in the Fiji repo. An unrelated
spec failed **three times running** and passed on a clean `develop`, which reads
as a deterministic regression — and was bisected as one before `rm -rf .next`
made both trees pass identically. Running `verify` twice in a row in that repo
fails an unrelated search spec.

> [!TIP] Three runs against one poisoned cache is one observation, not three
> fj#4's own words. Repetition only buys independence if something between the
> runs is actually reset.

## What was not done

- **The chip row is invisible on twelve of thirteen stocked departments**, and
  will stay invisible until more is published. That is intended, but it means the
  feature is currently exercised by one page.
- **No star-rating filter was built** — the assertion that there must not be one
  is the deliverable, because no product carries a rating.
- **The `search.spec.ts` race was fixed in the two storefront repositories only.**
  Whether the same pattern exists elsewhere was not swept for.
- The removal of the honesty notes was flagged as **a one-line revert if the
  owner disagreed**; no confirmation is recorded either way.
- ecommerce #22 and #24 shipped with **`verify` and `Deployment Reached The
  Environment` unable to run at all** (org Actions billing). Local verify and a
  hand-read of the Vercel deployment status stood in.

## Lessons

- **Two surfaces browsing one tree must read one projection.** Twenty-one
  hardcoded department names against fifty measured categories was not an
  inconsistency to tidy — it was a buyer standing in `Clothing` with no route to
  `Shoes`.
- **Ask what a control means, not what it looks like.** The chips and the rail
  are both names-with-counts in a narrow column and do opposite things; the
  surface had to be made to tell them apart before the spacing mattered.
- **Borders, not padding.** Four card edges in a 248px column is a density
  problem that adding air inside the cards makes worse. The measured before/after
  is the argument.
- **`sr-only` is the right answer when redundancy is positional.** The second
  "Category" is redundant because of where it sits, and position is exactly what
  a screen-reader user does not have.
- **A patch that stops on a mismatch is doing its job.** The Fiji fork's fourth
  loader survived only because the port refused to overwrite what it did not
  recognise.
- **A repeated failure is one observation until something is reset between runs.**
  Both the `count()` race and the stale `.next` cache were nearly diagnosed as
  the opposite of what they were.

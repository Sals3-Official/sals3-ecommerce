---
tags:
  - sals3
  - sals3-ecommerce
  - pdp
  - reviews
  - advertising
  - compliance
  - backfill
  - session-note
aliases:
  - Part 79
  - Review Chips and an Advertisement That Says It Is None
  - Premium Select Finance Carousel
created: 2026-08-27
updated: 2026-08-27
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[sals3-session-2026-08-25-part75-aj-a-department-to-browse-and-a-review-from-the-order-list]]"
  - "[[sals3-session-2026-08-22-part69-buyer-reviews-shipped-and-the-read-that-would-have-taken-orders-down]]"
  - "[[sals3-session-2026-08-27-part78-the-floor-that-became-a-percentage]]"
---

# Part 79 — review chips, a README that caught up, and an advertisement that says it is none

**Backfill note, written 2026-08-27** from merged PR bodies, the code on
`origin/develop`, and the shipped creative files themselves. Three
`sals3-ecommerce` PRs, all merged 2026-08-25 UTC. **None of them requires a
matching `sals3-portal` change** — no schema, no migration, no wire contract, no
cache key.

- [#163](https://github.com/Sals3-Official/sals3-ecommerce/pull/163) 16:29Z —
  filter chips and a Shopee-shaped row for product reviews (merge `5c8bb02`)
- [#165](https://github.com/Sals3-Official/sals3-ecommerce/pull/165) 17:19Z —
  the README records the section (merge `e0e9e2c`)
- [#166](https://github.com/Sals3-Official/sals3-ecommerce/pull/166) 19:47Z —
  the Premium Select Finance carousel in both product feeds (merge `b502094`)

## 1. A chip is offered only when it narrows

The ratings-and-reviews section was rebuilt from a Shopee "Product Ratings"
pattern **the owner supplied**, splitting one monolithic `ProductReviews.tsx`
into `ProductReviewList` (client), `ProductReviewCard`, `ProductRatingBreakdown`
and a pure `src/lib/reviews/filters.ts`.

The whole design sits in one line of that file:

```ts
const narrows = (total: number) => total > 0 && total < reviews.length;
```

A chip appears when it matches **some but not all** of the list. The consequence
is the good part: a one-review product, or five reviews that are all five stars,
produces a single filter and `ProductReviewList` renders **no chip row at all**.

**And that rule deleted an empty state the branch had already built.** #163:
*"If every chip matches at least one review, 'no reviews match that filter' is
unreachable UI: built, never seen, never really tested."* A test presses every
rendered chip and asserts the list never empties. This is the same instinct as
part 72's deleted "Search 1,500,000 products" — remove the thing that cannot be
true rather than maintain it.

Chips are `all`, one per star band, and `commented` (`body !== null && body !==
''`), each with a count. Filtering is **client-side**, in the browser, with no
routing: the whole list is already on the page — capped at 50 by
`salvagedArray(ProductReviewSchema, 50)` — *"so a chip is a lens on data in
hand; routing it would re-render an entire product page… to hide list items that
never left."* It is nonetheless a client component that **still server-renders**,
registered in `CLIENT_ENTRY_POINTS` and deliberately not `ssr: false`, so review
prose stays in the initial HTML for crawlers.

One load-bearing guard: `selected` falls back to `'all'` when the active band
stops existing, because `reviews` changes on a variant navigation.

The row itself is Shopee-shaped — a 36px monogram from the already-masked
`displayName` (a `UserIcon` when `null`, reading *"A Sals3 customer"*), then
name → stars + date + variation → body → seller reply under a `SELLER` pill.
The variation string comes from the order-line frozen snapshot, per ADR-007.

**What was deliberately kept**, at the owner's explicit request: the summary
block is unchanged markup — the average, the stars, *"Out of 5, from N reviews
of this product."*, the five bars, and the provenance sentence that this vault
should keep quoting:

> Every review here was written by a customer after Sals3 delivered this item to
> them. We do not accept reviews from anyone else, and we do not carry ratings
> from our supplier.

The bars stay **alongside** the chips, which is the deliberate divergence from
Shopee (chips only). Four Shopee features were not built, each recorded with the
field or table that is missing rather than as a preference: a *With Media* chip
(no image field on the wire), avatars (same), helpful votes and a report menu
(no vote table, no buyer-facing report route), and per-attribute sub-scores (one
rating per line, not a rubric).

Two fixes found by rendering rather than reading: chips are `min-h-11 sm:min-h-9`
because 36px is below the touch floor on a phone, and the middot between date
and variation was removed because it dangled alone when the row wrapped at
375px. Also `if (!hasRating) return null;` — reviews present with no rating used
to render a heading above nothing.

**Deferred by design:** the filter is not deep-linkable. Doing it with
`history.replaceState` alone *"would write `?reviews=5` into a URL whose server
render says `All` — a copied link that lies."*

**A stale comment shipped.** `ProductReviews.tsx` still carries the
pre-deletion docstring saying a chosen filter returning nothing *"does get a
sentence; that one lives in `ProductReviewList`"*. No such sentence exists —
`ProductReviewList` documents the opposite. By this project's own rule, a
comment a change falsifies is now a defect.

## 2. #165 is a checklist catching up with #163

The task premise that this touched a PDP build spec is wrong: it changed exactly
one file, **`README.md`** (+48/−2). The section-order table gained *Ratings and
reviews* as row 5, the component table gained the four new components, and a new
subsection restated the one-chip rule, the no-empty-state consequence, the
bars-alongside-chips divergence, the four-not-built table, and the
not-deep-linkable gap.

What forced it is the **README Update Rule** in
[[nextjs-component-security-code-rules]] — update `README.md` in the same task
when runtime behaviour or an important limitation changes — and #163 shipped
without it. #165's body says so: *"PR #163 changed runtime behaviour on the
product page… and did not update the README, which the completion checklist
requires. It also turned out the README had **never** documented this section."*

**#165 shipped with the local pre-commit `verify` bypassed** — a wedged
`next-server` on port 3000 plus a Turbopack cache rebuild pushed Playwright's
`webServer` past its 120s start timeout, so ~30 specs timed out on `page.goto`.
The body names CI as the gate instead: *"Do not merge unless the CI check is
green — that is the gate for this one, not the local run."* Whether CI was green
at merge is not confirmed here.

## 3. The carousel, and what a buyer actually sees

This is the entry to read carefully, because the code is careful and the
shipped result still has a live gap.

`Premium Select Finance` is presented as a **real external Australian finance
advertiser**, replacing the deleted `Casa Home` placeholder. It runs in two
feeds: the home page *For you* grid (fixed slot after the third product, only
when more than three exist) and every `/c/[slug]` department listing, where
placement is a seeded LCG over the slug and query — two throwaway draws because
`?page=1` and `?page=2` are neighbouring seeds, a gap of 8–10, one slot per
page, clamped by `Math.min(gap, productCount)` so a short department can still
render one.

Content is three hard-coded constants over three static WebP files in
`public/ads/psf/`. No feed, no ad server, no API, and **no new dependency** —
`embla-carousel-react` predates this PR.

**The frame contains no Sals3-authored buyer-facing text at all.** The only
strings the component emits are `aria-label="Sponsored placement"` and
`Advertisement N of M`. There is no invented price, rating, delivery date or
fake history here — the class of defect this project has repeatedly deleted.
The brand palette is deliberately kept out of `globals.css`, and re-typesetting
the ads in HTML was rejected as *"editing someone else's ad"*.

**Every claim a buyer reads is baked into raster artwork the code cannot
inspect.** The two live creatives read *"Never take the dealership's first
finance offer."* / *"We beat dealer rates and get you pre-approved in 24
hours."* and *"Ready to stop paying your landlord's mortgage?"* / *"First home
buyer grants and low-deposit options made simple."*

### What was handled well

The third creative — refinancing — carries a live **`5.49%*`** beside a
comparison-rate warning containing an **unfilled template bracket**:
*"Comparison rate based on a [loan type and amount details, e.g., $150,000 car
loan] over 5 years."* That is an ASIC-mandated warning with a blank in it, next
to a rate.

**It was held back rather than filled in.** The code comment is the right call
stated plainly — *"a guessed comparison-rate basis is a fabricated financial
claim and this campaign must not carry one"* — and it is enforced mechanically,
not by memory: `sponsored-slides.test.ts` asserts the live set is exactly
`['psf-car-loans','psf-home-loans']` and that no live slide's alt text contains
`'[loan type and amount details'`. Owner decision, 2026-08-26: *"An incomplete
warning beside a live rate is a legal problem rather than a design one, so the
two creatives that carry no rate go live and this one waits."*

A useful correction falls out of it: #166's own body says *"the creatives claim
'Australian Credit Representative' with no ACL or ACR number."* **Only the
held-back creative carries that phrase**, so the outstanding exposure is smaller
than the PR says.

### What is still open, and is buyer-facing today

**There is no visible sponsorship disclosure.** The slot originally carried a
*Sponsored* label, the advertiser's name and site, the comparison-rate warning
as live text, and dots with a pause button. **The owner removed all of it
(2026-08-26.)** What a sighted buyer now sees is a navy card carrying finance
artwork interleaved into a product grid, with nothing marking it as an
advertisement. The PR records this against itself rather than hiding it:

> **Disclosure is now the artwork's job alone.** A machine can still classify
> this as a paid link; a sighted reader has only PSF's own branding to go on,
> and none of the creatives carries the word "Sponsored". Under ACCC guidance
> the duty sits with the platform as well as the advertiser.

The machine-readable half survives — `rel="sponsored noopener noreferrer"` and
the `aria-label="Sponsored placement"` region — so a screen-reader user and a
crawler are told what a sighted reader is not. Restoring the label is described
as a five-line change.

**WCAG 2.2.2 is not met**: the 6s autoplay has no pause control, hover and focus
being the only stop. `prefers-reduced-motion` does disable it outright.

**Two live advertiser claims are unverified.** *"We beat dealer rates"* is a
comparative superiority claim and *"pre-approved in 24 hours"* is a service
timing claim; nothing in either repository or the vault substantiates either.
They are the advertiser's words, not Sals3's — but a platform can carry
liability for a third-party claim it publishes, and no PR body raises them.

**That PSF is a genuine contracted advertiser could not be confirmed.**
`git grep -i "premium select"` across the whole vault returns zero hits: no
campaign note, no contract record, no owner-approval note. The claim rests on
the commit message and the PR body alone.

### Three traps for whoever reads this next

1. **The PR body describes a state that was not merged.** #166 holds two
   commits; the body describes only the first and still says "three creatives"
   and 905 unit tests. The merged tree is the two-creative state at 907.
   Anyone writing from the body alone will get this wrong.
2. **The component docstring is stale in the same way** — it still reads *"the
   slot is the advertiser's three creatives and nothing else"* and *"none of the
   three creatives carries the word 'Sponsored'"*. The README's *"Two of the
   three creatives are live"* is the correct sentence.
3. **The `/c/[slug]` half renders nothing in production today.** The portal
   serves 21 L1 department slugs while products carry Google *leaf* categories,
   so every department page is in its empty state and no slot appears. The new
   e2e case acknowledges it by short-circuiting to
   `expect(placement).toHaveCount(0)` when the state is not `products`. The
   PR's *"Confirmed in the DOM: 15 products, one sponsored region"* is therefore
   almost certainly the home page. **The campaign is live on the home page
   only**, and closing that gap is portal work that had not landed as of
   2026-08-24.

Three `TODO(owner)` items are carried in `sponsored-slides.ts`: the unfilled
comparison-rate basis, the unnumbered credit-representative claim, and the
missing per-slide landing URLs — every CTA currently lands on the site root.

The PR author's recommendation was *"merging to `develop` and reviewing on the
preview deployment, but not promoting to production until (1) is resolved."*
Whether the owner accepted that is not recorded anywhere, and note that (1) was
subsequently resolved by holding the creative back rather than by fixing the
artwork.

## 4. What is not proven

- Verify counts are PR-body claims: #163 893 unit / 57 e2e; #166's merged state
  907 / 58 (its body's 905 / 58 is stale). #165 inherits #163's numbers with the
  local hook bypassed.
- PSF's status as a contracted advertiser (§3).
- The creatives' claimed provenance — "finished 1528×2048 comps supplied by the
  advertiser", resized with `sharp` — is a PR-body claim; `sharp` is not a
  direct dependency entry.
- The `/c/[slug]` placement has never been observed rendering against live data
  (§3, trap 3).
- Whether CI was green when #165 merged.

## 5. What to carry forward

**Delete the state that cannot be reached.** The rule that a chip must narrow
made "no reviews match that filter" unreachable, and the empty state built for
it was removed rather than kept as insurance. Unreachable UI is untested UI that
looks tested.

**A boundary that keeps someone else's words intact still publishes them.** The
carousel is scrupulous about not re-typesetting or restyling the advertiser's
claims — and that same discipline means the storefront now carries two
unverified performance claims. Not re-authoring third-party copy is right;
it is not the same as having checked it.

**A test can hold a legal line that a memory cannot.** The one genuinely
fabricated element in the campaign — a rate beside a warning with a blank in it
— is kept off the site by an assertion naming the literal bracket text, not by
anyone remembering. That is the pattern to copy the next time a compliance rule
has to survive a future edit.

**When a PR ships in two commits, read the second one.** The body, the
docstring and the README disagreed about how many creatives were live, and only
the README was right.

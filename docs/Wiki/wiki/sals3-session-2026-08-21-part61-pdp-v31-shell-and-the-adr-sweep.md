---
tags:
  - sals3
  - sals3-portal
  - sals3-ecommerce
  - pdp
  - storefront
  - taxonomy
  - merchant-center
  - media
  - pricing
  - adr-maintenance
  - session
aliases:
  - PDP v3.1 Shell
  - The ADR Sweep
  - Part 61
created: 2026-08-21
updated: 2026-08-21
status: current-state
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[agent-operating-contract]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[sals3-session-2026-08-17-part50-aj-checkout-freight-quotes]]"
  - "[[sals3-session-2026-08-18-part54-description-blocks-images-and-variant-matrix-rename]]"
  - "[[sals3-session-2026-08-19-part59-description-editor-rebuild-and-the-publish-gates-the-panel-never-knew]]"
  - "[[storefront-product-contract-v2]]"
---

# Sals3 session 2026-08-21, part 61 — the PDP v3.1 shell, and the ADR sweep that followed it

One session, five merged PRs across both repositories. It started as "load this
design into the storefront" and ended up correcting a false money claim that had
been live in production for four days, plus four decision records their own code
had outrun.

| PR | Repo | What |
| --- | --- | --- |
| [#163](https://github.com/Sals3-Official/sals3-portal/pull/163) | portal | `specification[]` and `metaDescription` on the single-product payload |
| [#127](https://github.com/Sals3-Official/sals3-ecommerce/pull/127) | ecommerce | The approved PDP v3.1 shell |
| [#129](https://github.com/Sals3-Official/sals3-ecommerce/pull/129) | ecommerce | Delete the four components the v3 rebuild orphaned |
| [#130](https://github.com/Sals3-Official/sals3-ecommerce/pull/130) | ecommerce | `hot.md`: retail markup floor, PDP v3.1, one struck-through risk |
| [#131](https://github.com/Sals3-Official/sals3-ecommerce/pull/131) | ecommerce | Amend ADR-002, ADR-011, ADR-015, ADR-016 |

> [!IMPORTANT] The lesson this session actually taught
> **A design handoff is a claim about the product, not a source of truth about
> the code.** Two sentences in the approved v3.1 prototype were false against
> shipped behaviour, and one of them was false because the prototype had
> faithfully copied the storefront's _own_ stale copy back at it. Transcribing
> the mockup 1:1 — which is what was asked for — would have re-published a money
> claim the codebase had already invalidated. The instruction to build it exactly
> did not survive contact with what "exactly" contained.

---

## 1. Where the design lives, because nothing in this vault says

The approved prototypes are **not in any repository**. They sit in
`E:\Downloads\Project setup and blockers\`, each feature with its own
`<topic>_handoff\` folder holding the `.dc.html` and a `*_BUILD_SPEC.md`: PDP
v1/v2/v3/v3.1, Checkout Shell, Orders Workspace, Order Detail v2, Market Rules
Pricing, Portal Shell/Screens/Login, Component Spec. Some carry a Tagalog
rationale note (`BAKIT_GANITO_ANG_DISENYO.txt`).

Worth recording because a full-vault search for a design by title finds nothing,
and the natural conclusion — that the design does not exist — is wrong.

## 2. v3 had already shipped, so v3.1 was a delta

The first useful finding was that most of the work was done. `ProductRecordPanel`,
`ProductEvidenceLedger`, `ProductOptionList` with all four option tiers,
`ProductDescription` with its `image` block and adjacency pairing, and the
brand-blue tokens were all already on `develop`.

What v3.1 actually changed: section order, a 4:5 gallery with a five-column
thumbnail strip, a sticky record panel, the specifications table split in two,
and the token role split applied.

## 3. The real gap was data, not layout

v3.1's headline section — **Product specifications** — had no field on the wire.
`read-model.ts` sent only `specs`: supplier-reported weight, dimensions, GTIN,
MPN, condition. The seller's own answers existed in
`product_category_attribute_values` and had never left the portal.

So the shell could be built, but its white full-bleed band would render nothing.
That was the one decision the owner had to make rather than the agent, and the
answer was both repositories.

### `specification` is not `specs`, and they cannot share a table

This is the boundary that shaped the whole PR pair:

- **`specs`** is what the **supplier reported** and Sals3 repeats.
- **`specification`** is what the **seller declared** against their category's
  attribute set.

"Specifications are as reported by the supplier" becomes **false** the moment a
seller-entered attribute appears under it. The portal editor already kept these
apart as separate sections; the storefront's single flat table was contradicting
its own producer. Two sections, two provenance lines.

### Three filters, each load-bearing

In `sals3-portal/src/modules/catalog/storefront/specification.ts`:

1. **Recognised under the product's _current_ category** — the join is on
   `products.category_id`, not the `controls_version` the value was saved
   against. A stored value deliberately survives a category change, so a row can
   outlive the contract that asked for it, and must not then be published as a
   fact about a category that no longer defines it. No `category_id` matches
   nothing, which is the fail-closed direction.
2. **`seo_visibility = 'ATTRIBUTE_CONTEXT_ONLY'` never reaches a buyer** — the
   workbook classifies every attribute; that column decides, not this code.
3. **An empty value produces no row** — which is also what keeps a _defaulted_
   `Others` country of origin out of JSON-LD and any Merchant feed. The editor
   shows `Others` as a placeholder for an undecided field rather than storing it,
   so absence enforces the guard rather than a filter someone could forget.

`UNBRANDED` to `Generic` reuses the editor's existing
`categoryAttributeValueDisplayLabel`. No migration: every column and table read
here already existed. Product cache key `v3` to `v4`; the feed key stayed `v2`,
because a card row carries neither field.

## 4. Two sentences from the approved prototype, refused

### "Nothing is added to this price at checkout" — false, and already live

The prototype says it twice: on the enabled call to action, and in the evidence
ledger's Delivery row.

It became false on **2026-08-17**, when AJ shipped live CJ freight quotes (see
[[sals3-session-2026-08-17-part50-aj-checkout-freight-quotes]]).
`quoteCheckoutShippingAction` prices each package against the buyer's own
address, and `selectionTotal` adds the chosen amount to the Stripe session. A
delivery charge **is** added.

And the shipped `ProductEvidenceLedger` had been carrying that sentence in
production the whole time — on the one element of the page whose entire purpose
is to be the part a buyer can trust. So this was not a mockup line declined; it
was **a live false money claim corrected**.

The row now states the unknown it actually has — what delivery will cost _this_
buyer, which needs an address the PDP does not have — and where it resolves. The
mark stays hollow, because that is still genuinely unknown here.

### The price note naming the higher price

`From US$4.51` on a product whose other options are US$20 is honest and
incomplete. The prototype's note fixes that by naming the higher price — which
puts a **second currency-formatted string in the price block**, the exact
price-extractor exposure `ProductPriceDisplay` was written to avoid.

It ships as a count instead: _"Nine of the ten options cost more than this.
Choose to see the exact price."_ Same warning, one money token.
`variantsAboveFloor` returns counts only and structurally cannot produce money.

A third, smaller refusal: the prototype's "Description images never enter this
strip and are never cover-photo candidates" is an architecture note, not buyer
copy.

## 5. Driven in a browser, which found what the diff hid

The deployed portal does not serve the new fields yet, and the local portal DB is
empty, so the storefront fell back to placeholder products. A ~180-line throwaway
Node server in the scratchpad answering
`/api/storefront/products{,/<slug>,/categories}`, plus a temporary
`SALS3_PORTAL_API_URL` override, produced a real running page in minutes.
`NEXT_PUBLIC_R2_IMAGE_BASE_URL` had to be set too — unset means seller uploads
and description images **silently do not render**, no error and no log.

That pass found two defects `npm run verify` was green over:

- The selected option chip was still on the old `brand-600`, not the brand-blue
  pair the token table assigns to it.
- `font-bold` on the selected chip **lost silently to `font-medium`** on the
  shared chip class. Both landed in the same cascade layer, and Tailwind's own
  property ordering picked the winner. Fixed by putting one weight per state
  rather than a shared default plus an override.

Measured after the fix: selected chip border `#018cc9` / label `#002b53` /
weight 700; unselected `#e3e7ea` / `#14181c` / 500; an unavailable value renders
as a non-interactive `<span>` with no `href`, struck through and labelled
"Unavailable"; Buy Now `linear-gradient(150deg, #002b53, #018cc9)` with white at
14px/700; gallery `aspect-ratio: 4 / 5` with five equal thumbnail columns; the
ledger band `#f6f7f8`; the record column `sticky` at desktop and `static` at
375px; consecutive description images pairing at desktop and stacking on mobile;
**zero** text nodes computing to `rgb(138,145,150)`; no horizontal overflow at
either width.

### The trap that cost eight tool calls

A **backgrounded Browser-pane tab does not advance CSS transitions.** Every
`getComputedStyle` on an element with `transition-all` returned its
_pre-transition_ value indefinitely, so a correctly-styled enabled button read as
its disabled colours, and a correctly-styled selected chip read as unselected.
Eight calls went into hunting a cascade bug that did not exist — cloning the
element to `<body>` worked, a sibling probe worked, the same attributes worked,
which should have pointed at state rather than CSS sooner.

Diagnose with `el.getAnimations()` — the transitions sit in
`playState: 'running'` forever. Clear with
`document.querySelectorAll('*').forEach(el => el.getAnimations().forEach(a => a.finish()))`
before measuring. Separately, `computer{action:"screenshot"}` hard-fails while
the pane is not displayed, even after `tabs_select`, so no screenshot exists for
this work — every visual claim above is a measured computed style.

## 6. Merging into a `develop` that moved twice

**[#162](https://github.com/Sals3-Official/sals3-portal/pull/162) landed
mid-session** — the retail markup floor, open when this session started. The
portal branch went nine commits behind. GitHub reported "mergeable", but that
only means no text conflict, so `develop` was merged in and the full
`npm run verify` re-run on the combined base before pushing, so CI tested the
real combination rather than a nine-commit-old one. Only `README.md` was touched
by both, and both sections survived.

**[#164](https://github.com/Sals3-Official/sals3-portal/pull/164) opened
mid-session too**, from another agent, touching three of the same files:
`read-model.ts`, `catalog-feed.ts`, `catalog-cache.ts`. Checked before merging
rather than assumed:

- `git merge-tree --write-tree` on the two branches: **no conflict**.
- In `catalog-cache.ts` the changes sit at different lines — #164 adds a new
  `storefront-catalog-departments` key, #163 bumped `storefront-catalog-product`
  `v3` to `v4`. Neither reverts the other, but **two cache-key edits in one file
  is exactly what a careless conflict resolution silently undoes**, and a lost
  bump means up to 30 seconds of stale field-less rows after deploy.
- In `catalog-feed.ts` #164 adds three new exported functions and does not touch
  `toStorefrontProductDetail`.

The genuinely untested thing was that **the combined state had never been through
CI**, since #164's green run predated #163. That was left as a comment on #164
rather than resolved unilaterally.

### Two flakes that were not breaks

Neither was worked around with `--no-verify`:

- **Port 3101 "already used"** on pre-push. `netstat` showed only `TIME_WAIT`
  connections from this worktree's own e2e run seconds earlier and nothing
  `LISTENING`. Retry passed.
- **e2e "9 did not run"** on pre-push. The log showed `CjApiError: rate-limited`
  from the live-browse path — CJ's shared limiter reacting to four verify runs
  from one machine in quick succession. Standalone re-run: 78 passed. Retry
  passed.

## 7. The dead code the v3 rebuild left behind

`ProductPurchasePanel` and the three components only it imported —
`ProductVariantSelector`, `ProductVariantFallbackSelector`,
`ProductAvailabilityNotice` — had had no reachable importer since
`ProductRecordPanel` and `ProductOptionList` replaced them. 691 lines.

The reason it was worth a PR rather than leaving it: **two of them still used
`text-ink-faint` as a text colour**, at 3.20:1. #127 replaced every live
instance, so a future grep for that token would have kept returning hits in code
nobody ships — and the next person would either "fix" dead code or conclude the
contrast audit was incomplete.

`test/client-bundle-boundary.test.ts` had been walking two of the files, which is
the point of a hand-maintained list with no auto-discovery: a deleted entry fails
loudly rather than degrading quietly.

### A stale doc comment that had already cost something

`Button.tsx`'s header named four consumers. Three had drifted back to inline
class strings, leaving exactly one. **That stale list got quoted into #127's own
pull-request description as the blast radius of a colour change** — it would have
sent a reviewer to check three screens the component no longer reaches. The PR
body was corrected while the PR was open; the comment itself was corrected in
#129.

## 8. `hot.md` was contradicting itself

"Description images are authored in the Portal and silently dropped by the
storefront" sat in **Active risks** while the same file's **Implemented
foundations** R2 bullet already said the description `image` block renders. It was
fixed by ecommerce
[#125](https://github.com/Sals3-Official/sals3-ecommerce/pull/125) on 2026-08-20
and stayed listed as open for a day.

A cache that contradicts itself is worse than one that is merely behind, because
either half can be quoted as current. Struck through per the note's own protocol
rather than deleted, with the reason it went stale recorded. Part 56's lesson
holds in both directions: **striking a fixed risk matters as much as adding a new
one.**

## 9. Four ADRs their own code had outrun

Amended per the convention ADR-002 and ADR-015 already established — a
`[!DANGER]` pointer under the title, the amendment at the end, the original text
left unedited, nothing renamed.

### ADR-016: a stated blocker that no longer existed

Confirmed gap #1 read "**No Google Product Category crosswalk exists.**" True on
2026-08-11. **False since 2026-08-14**, when the owner replaced the taxonomy's
reference data with Google's own — so the ADR carried a dead blocker for a week.

Verified against `sals3-portal` `origin/develop`'s committed extract
(`sals3-taxonomy-v1.json`, which is what the app seeds — the `.xlsx` is never
read at runtime): 5,595 rows, 21 bare-L1 departments, **every** code matching
`CAT-GGL-<digits>`, and all 21 department codes carrying Google's real top-level
IDs — `1` Animals & Pet Supplies, `8` Arts & Entertainment, `111` Business &
Industrial, `141` Cameras & Optics, `166` Apparel & Accessories, `222`
Electronics, `412` Food/Beverages/Tobacco, `436` Furniture, `469` Health &
Beauty, `536` Home & Garden, `537` Baby & Toddler, `632` Hardware, `772` Mature,
`783` Media, `888` Vehicles & Parts, `922` Office Supplies, `988` Sporting Goods,
`1239` Toys & Games, `2092` Software, `5181` Luggage & Bags, `5605` Religious &
Ceremonial.

So **`googleProductCategory` is derivable today** by stripping the prefix. No
crosswalk table, no per-category mapping approval, no migration.

Not licensed by that: the extract is Google's `2021-09-21` revision and IDs get
retired between revisions, so a freshness check comes first; numeric-ID vs
full-path form is an unmade choice; and **only the category identity is
Google's** — the presets on those rows are still the Gemini-generated,
source-less data ADR-002 flags as its material risk. Gaps #2 and #3 stand.

### ADR-011: "no upload/storage backend exists" was false in both halves

R2 through `@aws-sdk/client-s3`, `sharp` re-encoding with magic-byte checks and
hard 5MB / 2000x2000 limits, `description-media/` kept structurally out of
`product_media_sources` so a size chart can never become a cover-photo candidate,
the shared `mediaVisibleToBuyers` predicate, and `mediaStatus` now reading each
row's `sourceType` instead of `media.length > 0`.

Still missing, listed rather than implied: `MediaAsset` proper, a reviewer for
`NEEDS_MEDIA_REVIEW`, the **Merchant-Center image-eligibility check ADR-016 asks
this pipeline to own** rather than bolt on later, and runtime end-to-end through a
real signed-in seller.

### ADR-015: the 2.5% retail markup floor

An owner decision of this same day, four merged portal PRs, recorded nowhere in
the ADR that governs commercial pricing.

It guards the one path that **skips the resolver entirely** — a seller typing a
price on a variant row, which reaches none of section 3's inheritance chain,
section 1's contribution floor, or the funding buffer. It does not contradict
section 1's argument against percentage floors: that argument is against a
percentage floor _as a substitute for the absolute one inside the resolver_, and
says nothing about manual entry, which had no floor at all. One instrument
prices; this one only refuses a price.

### ADR-002: less than `hot.md` claimed

`hot.md` said ADR-002 "still describes Sals3 Taxonomy v0 as the adopted, current
taxonomy" and that "nothing in this wiki documents v1's existence". **That entry
was wrong.** ADR-002's 2026-08-14 amendment documented the switch in full, behind
a `[!DANGER]` box routing a reader to it before any figure in the original
section.

What was genuinely stale is narrower: the note's **title and alias** read
`Sals3 Taxonomy v0` while the application constant is
`ACTIVE_TAXONOMY_VERSION = 'sals3-taxonomy-v1'`, so the string the code uses
appears nowhere in the ADR — which is how "v1 is undocumented" became a
believable conclusion. Not renamed: that breaks every `[[ADR-002-...]]` link in
the vault.

## 10. One reported problem that measured fine

The PDP now uses the brand-blue pair while checkout, orders, cart and the error
pages still use `brand-600`. That was flagged as an inconsistency to fix, then
measured before touching 20+ files:

| Token | On white |
| --- | ---: |
| `brand-blue-900` `#002b53` | **14.28:1** |
| `brand-600` `#0a5c8a` | **7.21:1** |
| `brand-blue-500` `#018cc9` | 3.75:1 |
| `ink-faint` `#8a9196` | 3.20:1 |

`brand-600` passes AA **and** AAA for normal text. v3.1 section 10 itself says "if
a mid-blue text colour is ever wanted, add it as a real token at 4.5:1 or better"
— `brand-600` already is that token. So this is an aesthetic decision for the
owner across the whole site, **not a defect**, and migrating it unasked would have
been scope the request never contained.

## 11. The database: nothing was migrated

No `db:migrate`, no `drizzle-kit generate`, no seed, no DDL. The PDP v3.1 work
**deliberately needed no migration** — `product_category_attribute_values`,
`category_attribute_controls` and `products.meta_description` all already
existed. The one attempt to reach a database was a read-only `SELECT count(*)`
through the postgres MCP, to check whether any published product carried a
seller-entered attribute value; it failed on missing credentials and never
connected.

Observed rather than done: **another agent generated
`drizzle/0026_daily_blockbuster.sql`**
(`ALTER TABLE sals3_order_lines ADD COLUMN listing_snapshot jsonb`) in the shared
`E:\sals3-portal` checkout during this session, untracked at the time, on branch
`feat/order-line-snapshot-column` — now
[#166](https://github.com/Sals3-Official/sals3-portal/pull/166). Left untouched.
The shared checkout also carried ~19 of that agent's modified files throughout;
every PR here was built in an isolated `git worktree` for exactly that reason.

## 12. Verification

| | Result |
| --- | --- |
| portal `npm run verify` | lint, format, typecheck, build, **2,219 unit** (4 skipped), **78 e2e** (6 skipped) |
| ecommerce `npm run verify` | lint, format, typecheck, build, **732 unit** then **695** after #129, **36 e2e** (1 skipped) |
| shared fixture | `test/fixtures/storefront-product-detail.json` byte-identical in both repos, `diff` run explicitly |
| CI | green on every PR head **and** on both `develop` branches after each merge |

## 13. Still open

- **`specification` is unproven against real data.** No published product carries
  a seller-entered attribute value that could be confirmed, so the new query is
  unit-tested and browser-verified against a stub, never against live rows. It
  closes the first time a seller answers the Specification section and their PDP
  is looked at.
- **The Merchant-Center image-eligibility check** ADR-016 asks ADR-011's pipeline
  to own does not exist in either place.
- **`MediaAsset` proper, and a reviewer for `NEEDS_MEDIA_REVIEW`.**
- **2.5% is provisional** — no payment rail and no commission is configured, and
  it is not reconciled with ADR-015 section 1's absolute contribution floor. A
  resolver-priced variant and a hand-priced one can still land on different sides
  of "thin", and nothing reports that.
- **The brand-blue role split stops at the PDP.** Owner's call whether it goes
  site-wide.
- **`googleProductCategory` is derivable but unpopulated**, pending the taxonomy
  freshness check.
- **ADR-002 is still named v0.** A rename is a vault-wide link edit.

## 14. Reusable lessons

1. **A design handoff is a claim about the product, not about the code.** Check
   every factual sentence in a mockup against shipped behaviour before
   transcribing it. Here the prototype had copied the storefront's own stale copy,
   so building it "exactly" would have re-published an invalidated money claim.
2. **A grep that finds nothing is evidence about the query, not the corpus.** A
   week-old "nothing documents v1" claim came from searching `Taxonomy v1` and
   `CAT-GGL` against an amendment that says "Google's official product taxonomy"
   and "`CAT-GGL-<Google numeric category ID>`".
3. **A spot-check against remembered values is not evidence.** Two sampled
   category IDs "disproved" the taxonomy extract; enumerating all 21 showed the
   extract was right and the memory was wrong.
4. **Measure before migrating a token.** `brand-600` at 7.21:1 was reported as an
   accessibility inconsistency and is neither.
5. **Two conflicting utilities in one cascade layer have no defined winner.**
   `font-medium` on a shared class and `font-bold` on a state resolved by
   Tailwind's property order, not by intent. One value per state.
6. **A backgrounded browser tab freezes CSS transitions**, so computed style
   reports pre-transition values forever. `getAnimations()` diagnoses it.
7. **"Mergeable" is not "tested together."** Merge the base in and re-run before
   merging, especially when two branches edit cache keys in one file.
8. **Strike a fixed risk as deliberately as you add a new one.** A cache that
   contradicts itself lets either half be quoted as current.

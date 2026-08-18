---
tags:
  - sals3
  - sals3-portal
  - product-editor
  - product-catalogue
  - taxonomy
  - variant-mapping
  - media
  - seo
  - security
  - session
aliases:
  - Variant Matrix Category Suggestions
  - Listing Quality Column
  - Catalogue Media Truth
  - Part 52
created: 2026-08-18
updated: 2026-08-18
status: shipped
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[universal-category-variation-taxonomy-reference]]"
  - "[[sals3-session-2026-08-18-part51-supplier-photo-toggle-and-the-missing-column-outage]]"
  - "[[sals3-session-2026-08-17-part49-portal-variant-matrix-r2-storage-meta-description-brand-origin-defaults]]"
  - "[[sals3-session-2026-08-15-part47-option-mapping-wiring-and-supplier-change-detection]]"
  - "[[sals3-skills]]"
---

# Sals3 session 2026-08-18, part 52 — the Variant Matrix learns the category, and the catalogue stops lying about photos

Three `sals3-portal` pull requests, all merged. The thread connecting them is the
same one: **a screen was reporting something it could not actually know, and
nobody could tell because it never failed.**

> [!IMPORTANT] The shape of every defect in this session
> None of the three threw an error. Each one rendered a confident, plausible,
> wrong answer — a blank field that looked like a missing feature, a "Not
> detected" that looked like a supplier limitation, and a green "Own pictures"
> badge on products holding no seller upload at all. A green `npm run verify` and
> green CI were true the whole time. Only a person looking at the live UAT screen
> found them.

| PR | Merged | Merge commit | What |
| --- | --- | --- | --- |
| [#120](https://github.com/Sals3-Official/sals3-portal/pull/120) | 05:09:57Z | `66197fc` | Variant Matrix option names suggested from the product category |
| [#121](https://github.com/Sals3-Official/sals3-portal/pull/121) | 06:27:07Z | `7fffb74` | Propose a Variant Matrix for single-axis products |
| [#122](https://github.com/Sals3-Official/sals3-portal/pull/122) | 07:11:24Z | `4317261` | Report the real photo source, add a Listing quality column |

Continues from
[[sals3-session-2026-08-18-part51-supplier-photo-toggle-and-the-missing-column-outage|part 51]]
(PRs #113–#119, the same morning).

---

## 1. The reported symptom: option names were always blank

Bogs opened the Product Editor on a real UAT product — a corduroy jacket, two
colours × five sizes — and the Variant Matrix showed `2 options detected`, the
ten variants correctly split, and **both `Option 1 name` / `Option 2 name`
fields empty** with the Save button greyed out. Changing the product's category
changed nothing.

The greyed Save was correct and by design: publication is gated on a named
matrix, so the button unlocks only once a person names each axis. The blank
fields were not.

### 1a. Why the suggestion was dead in every environment but a developer's

`suggestedOptionAxisNames` read `sals3_category_presets`. The **only writer of
that table is `npm run seed:taxonomy-presets`**, a local script requiring a
`DATABASE_URL`. Production had the categories seeded (via the one-time,
now-removed seed endpoint from
[[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux|part 48]])
but **never the presets**. So the lookup returned zero rows, the function
returned `[]`, both fields rendered blank, and nothing reported it.

This is the third appearance of the same family of failure — data or DDL applied
locally and never to the deployed database — after PR #102 (part 49's
predecessor) and PR #113 (part 51). It is quieter than both: those took
`/listings` **down**, so they were found in minutes. This one degraded silently
for as long as the feature had existed.

### 1b. The presets were the wrong material anyway

Even fully seeded, the fix would have been wrong. `sals3_category_presets`
carries the workbook's `Tier 1/2 Attribute` columns, which are **human guidance
prose**, not labels:

```text
Color / Finish / Material (Stainless/Ceramic/Cast Iron/Black)
Diameter / Capacity / Set Pieces (20cm/24cm/28cm, 1.5L/3L/6-Piece)
```

Pre-filling one of those into `Option 1 name` would put it on the storefront as
a buyer-facing option label. Bogs's own phrasing for this outcome was
`pangit` — ugly — and it is the reason the workbook was re-authored.

### 1c. What the re-authored workbook added, and what had never been extracted

`universal_category_variation_taxonomy_final_clean.xlsx` (owner-authored,
2026-08-17, sha256 `2db93826…`) added ten columns the earlier extract never
read, including **`Tier 1 Attribute Families`** and **`Tier 2 Attribute
Families`** — short controlled tokens rather than prose:

| column | distinct values |
| --- | --- |
| `Tier 1 Attribute Families` | 16 (`COLOR`, `COLOR; MATERIAL`, `FOOD_BEAUTY`, `MATERIAL`, `MODEL_SPEC; BUNDLE`, …) |
| `Tier 2 Attribute Families` | 17 (`SIZE`, `SIZE; CAPACITY`, `CAPACITY`, `FITMENT`, …) |
| atomic family tokens | **8** |

> [!NOTE] The old extract was not stale in its tier text
> Verified before touching anything: all 5,595 category codes and every
> `Tier 1/2 Attribute` string are **identical** between the new workbook and the
> committed `sals3-taxonomy-presets-v1.json`. Zero drift. The checksum differs
> only because of the added columns. So the existing preset rows were safe to
> build beside rather than replace.
>
> A trap worth recording: the column named **`Tier 2 Machine Value`** is *not*
> machine-readable — it still holds the verbose prose. `Tier 2 Display Note` is
> empty on 5,584 of 5,595 rows. The **families** columns are the usable ones.

### 1d. What shipped

A new offline extractor,
`scripts/extract-category-variation-families.mts` (`npm run
extract:variation-families`), producing
`src/lib/db/seed-data/sals3-category-variation-families-v1.json` — 5,595
category assignments, 86 patterns, checksum-stamped (payload `3f44a685…`).

It carries the same discipline as
`extract-category-attribute-controls.mts`: `--discover-families` prints the
distinct token set and exits as a manual gate, and an unrecognized token
**aborts the extraction** rather than reaching reference data. It cross-checks
every code against the committed `sals3-taxonomy-v1.json` rather than a
database, so it runs with no `DATABASE_URL` and cannot be skewed by whatever one
environment happens to hold.

`src/modules/catalog/taxonomy/variation-families.ts` maps a family token to a
buyer-facing name. **Owner-approved 2026-08-18:**

| token | name | note |
| --- | --- | --- |
| `COLOR` | Colour | AU English — the editor's placeholder already read "e.g. Colour" |
| `SIZE` | Size | |
| `MATERIAL` | Material | |
| `CAPACITY` | Capacity | |
| `MODEL_SPEC` | Model | over "Specification", which duplicates the editor's own section name |
| `BUNDLE` | Pack size | |
| `FOOD_BEAUTY` | Variant | spans flavour, roast, vintage *and* cosmetic shade — a neutral word is never wrong for either |
| `FITMENT` | Fitment | |

A multi-token cell takes the **first** token (the sheet orders by primacy); a
joined `Colour / Material` would recreate the verbose-label problem. An unknown
token yields **no suggestion**, never a guess.

Coverage: **5,563 of 5,595** categories carry a tier-1 family, **5,425** a
tier-2.

### 1e. The decision that matters most: offered, never pre-filled

> [!IMPORTANT] Owner decision 2026-08-18 — suggestion chip, not autofill
> The field stays **empty**, the `OPTIONS_UNMAPPED` publish blocker **stands**,
> and the category's suggestion sits beside it as a `Use "Colour"` button next to
> the actual supplier values.

Bogs stopped the implementation mid-flight to ask the right question — *"sure ba
na yung mga variant na yan ay mag fit sa default variant from CJ?"* — and the
answer splits in two:

**Fulfilment is safe, provably.** Checked in code, not inferred from comments:

- `save-option-mapping.ts:248,290` — `normalizedValue: normalizeOptionToken(value.raw)`. The stored option value is normalized from the **supplier token**, never the buyer label.
- `publish.ts:232` — `supplierVariantId: providerVariantReferences.externalVariantId`. CJ identity comes from its own column.

So renaming an axis cannot repoint a variant, change a price, or alter what CJ
matches on.

**Presentation is not automatically safe.** The workbook knows the *category*.
It cannot know which supplier token *position* holds which attribute.
`option-split.ts` says so itself: nothing in CJ's payload says position 0 is a
colour, and on a lamp the same slot could be plug type. A lamp labelled
`EU-Warm White` in a `COLOR; MODEL_SPEC` category would have pre-filled "Colour"
onto the plug-type position — fulfilment intact, storefront showing buyers
`Colour: EU`.

Pre-filling converts a category-level guess into something committable without
anyone looking, which is exactly what ADR-010's no-silent-decision rule and
`option-split.ts`'s own refusal-to-name both exist to prevent. Offering it costs
a glance instead.

### 1f. A stale-state bug found by reading, not by testing

`axes` was `useState(() => initialDrafts(proposal))` and the component was not
keyed. After a successful **Recover supplier labels** → `router.refresh()`, a
real proposal arrived where there had been none, the empty-proposal branch
stopped matching, and the form rendered **from an `axes` array still empty**:

- zero option cards on screen, and
- `[].every()` is vacuously `true`, so **Save was enabled** and submitted an
  empty array, which the action correctly refused as `invalid_input`.

The seller saw *"Those variant options could not be read"* immediately after a
recovery that had worked. Fixed by resyncing during render (React's
adjusting-state-on-prop-change pattern) keyed on the proposal's own identity.

This is the **same class** as the category-switch bug fixed the day before in
PR #105 (see
[[../../journal/sals3-session-2026-08-17-specification-dropdown-and-category-resync-fix]]):
`useState(props)` reading its argument only on mount. Second occurrence in two
days.

Per convention the regression test was **deliberately reverted first** to prove
it fails without the fix (`1 failed | 17 passed`), then restored.

### 1g. Presentation, and one deliberate risk

The supplier column was rendered as `<Input readOnly>` — five grey boxes that
can never be typed into, which invite the click anyway, double the row's visual
weight against the one editable column, and make a screen reader announce five
more textboxes leading nowhere. Now **text**, on a recessed surface, in mono,
**right-aligned against the gutter** so each supplier token and its buyer label
read as one pair in contact.

Right-aligning a text column is the unusual move, taken deliberately because the
pairing *is* the screen's job. Measured, not assumed: contrast **5.55:1 light /
7.09:1 dark** (AA at 12px), ledger and field both 36px so baselines stay level,
no sideways scroll at 375px, 16px between adjacent rows' reorder arrows so the
mis-tap guard the component already worried about survives.

> [!TIP] Measuring contrast against OKLCH tokens
> A first attempt computed 3.58:1 and was wrong. Portal tokens resolve to
> `oklch(...)`, so naive RGB parsing of `getComputedStyle` produces nonsense.
> Paint the colour into a `<canvas>` and read the pixel back for real sRGB —
> including one fill of the opaque backdrop first, to resolve a semi-transparent
> surface like `bg-muted/40`.

Also: no new palette, no motion. Inventing colours breaks the design system and
the raw-hex rule, and animation on a screen someone works through fifty rows at
a time is decoration. Bogs had said `okay na ito` about the layout, so card,
grid, and section placement were left alone.

---

## 2. PR #121 — a colour-only product could never be named at all

Bogs then opened a second real product: an **Outdoor Sports Cold-proof Face
Mask**, five variants — `Black`, `Blue`, `Green`, `Grey`, `Purple`. Variant
Matrix read **"Not detected"**, and changing the category did nothing, because a
suggestion only renders once a proposal exists and detection is upstream of it.

Cause, pre-existing and not from #120 — `option-split.ts`:

```ts
// One token carries no structure; a ragged set is not an encoding.
if (width < 2) return undefined;
```

Those labels carry no delimiter, so `width === 1` and derivation refused
outright. **Every colour-only product** — the commonest shape in the
catalogue — could never get a buyer-facing option name.

That rationale confused *cannot be split* with *has no structure*. Five distinct
single tokens across five variants is a complete, exact single-axis grid, and in
fact the case with **nothing to guess**, since the whole label is one axis value.

Every other guard is unchanged: fewer than two variants, any missing label,
ragged token counts, an inexact cross-product, and duplicate labels are all still
refused, so `Black`/`Black` still cannot mis-price a selection.

### 2a. The consequence that needed a decision

`optionMappingRequiredButMissing` raises `OPTIONS_UNMAPPED` for any product
`deriveOptionSplit` accepts. Allowing single-axis detection would therefore have
made **every colour-only product in the catalogue unpublishable** until a seller
named its axis.

> [!IMPORTANT] Owner decision 2026-08-18 — nameable, not gated
> `deriveOptionSplit` now reports `labelWidth`, and the publish gate fires only
> for a concatenated label (`labelWidth >= 2`). Single-axis products get a
> Variant Matrix and a suggestion, but publish exactly as before.

The reasoning: gating is a throughput decision, not a correctness one, and an
unmapped `Black` already reads fine to a buyer — unlike an unmapped
`Army Green-XL`, which is the opaque string the whole feature exists to prevent.

The section pill follows the server rather than asserting its own view:
`mappingBlocksPublish` comes from the read-model and mirrors
`optionMappingRequiredButMissing` exactly, so an unnamed single-axis product
shows `Warning`, never a `Blocker` the server would not raise.

### 2b. The inspection that mattered more than the fix

Allowing single-token derivation made `saveOptionMapping`'s **write path
reachable for a shape it had never been reachable for**, and the suite covered
only a full grid and a dropped constant position. Audited and then asserted: one
option row at position 0, five option values, five
`product_variant_option_values` links, and a combination key on **every**
variant — so none is left unmapped behind a mapping that reported success, which
is the exact failure the Khaki case produced once before.

It works because options and values are keyed on the supplier's own label
position (`split.positions[i].index`) and the link loop walks
`splitLabelTokens` positions, so a one-token label resolves at index 0. Nothing
needed special-casing.

---

## 3. PR #122 — the catalogue was lying about whose photos were live

Bogs highlighted two Product Catalogue columns as untrustworthy. Both were.

### 3a. Media said "Own pictures" for products with no seller upload

```ts
mediaStatus: media.length > 0 ? 'OWN_PICTURES' : 'NEEDS_MEDIA_REVIEW',
```

`media` is **every** `product_media_sources` row, and drafting projects the
supplier's own photo in as `SUPPLIER_ORIGINAL`. So any product carrying a
supplier photo reported the seller's own photography as live. All six production
drafts read that way.

A second consequence: only one status was ever reachable, so
`MediaStatusBadge`'s other tones — already written — **never rendered**, and the
column carried no colour signal at all. Bogs asked for a colour differentiator;
fixing the derivation delivered it with no new design.

Now derived from each row's `sourceType`:

| media rows | status | tone |
| --- | --- | --- |
| seller upload only | `OWN_PICTURES` | success |
| both sources | `MIXED_PICTURES` | info |
| supplier only | `SUPPLIER_FALLBACK` | warning |
| supplier only, `showSupplierPhoto` off | `NO_USABLE_PICTURES` | danger |
| none | `NEEDS_MEDIA_REVIEW` | warning |

`SUPPLIER_FALLBACK` rather than `SUPPLIER_PICTURES`, deliberately: the latter's
own tooltip claims *"the revision preference is supplier-only"*, and **no such
preference is stored on a revision today**. Fallback is what is actually
true — no eligible seller picture exists yet, so approved supplier pictures are
used automatically (ADR-011).

### 3b. Attention was not a quality signal

The column showed `Medium (1)` on every row. The one reason was
`PUBLICATION_NOT_BUILT` — "this is a draft" — which the Listing Status column
already says. A duplicate, not a signal.

> [!IMPORTANT] Owner decision 2026-08-18 — add Listing quality, keep Attention
> Attention is ADR-007's supplier-change concept (delist, zero stock, cost spike,
> freight loss, connection failure — the cases that auto-pause a live listing).
> That wiring does not exist yet, which is why the column reads as noise. It is
> kept so those cases have somewhere to land, and quality gets its own column.

New `Listing quality` column, Low / Medium / High, computed by
`src/lib/seller-center/product-catalogue/listing-quality.ts` from fields already
on `CatalogueProductFixture` — so it costs no query and cannot contradict the
columns beside it.

| signal | publish-critical |
| --- | --- |
| retail price set | yes |
| a publishable picture exists | yes |
| required specifications filled | yes |
| uses the seller's own pictures | no |
| product description written | no |
| meta description saved | no |
| Variant Matrix named where derivable | no |
| curated Sals3 category, not a `CJ-` mirror | no |

Missing any publish-critical signal is `LOW`; meeting them all is `MEDIUM`;
`HIGH` needs every signal.

> [!IMPORTANT] Owner decision 2026-08-18 — `HIGH` requires the seller's own photo
> Supplier media is what a finished listing is meant to move off, so a listing
> running on the supplier's pictures is not finished however complete its text
> is. Consequence accepted: most drafts sit at `MEDIUM` until someone uploads,
> which is the honest picture — and while [issue
> #111](https://github.com/Sals3-Official/sals3-portal/issues/111) (Cloudflare R2
> configuration in Vercel) is open, **no product can reach `HIGH` at all**.

A single-variant product is never held below `HIGH` for an unnamed Variant
Matrix, because it has no axis to name.

The badge lists every signal with met/unmet and marks the gaps that stop a sale,
because a bare "Medium" does not tell a seller what to do next.

> [!WARNING] This gates nothing, on purpose
> ADR-010 requires a versioned, shadow-measured, owner-approved score before any
> automated decision may depend on one, and `products.score` stays deliberately
> unwritten. This is a seller-facing checklist, never a verdict. No publish gate,
> no pause, no write.

---

## 4. The Meta Description finding — investigated, deliberately not "fixed"

Bogs asked whether the Meta Description suggestion works, on a product named
**PNT-0476 Human Visceral Healthy Lung Model**. It read:

```text
PNT-0476 Human Visceral Healthy Lung Model. Fedoras. Red
```

It works exactly as built. `suggestMetaDescription` composes
`lead. categoryLabel. highlights. summary`; brand was correctly excluded
(`Generic` is in `GENERIC_BRAND_LABELS`); the output reproduces character for
character at 56 chars.

The content is wrong because **the input is wrong**: CJ files that lung anatomy
model under `Men's Clothing > Hats & Caps > Fedoras`, and per the 2026-08-14
owner decision the CJ category *is* the Sals3 category, so the suggester
faithfully repeated a wrong supplier fact.

Nothing was saved — the *"Suggested from your product details"* label renders
only when the stored value is empty (`metaDescriptionIsSuggested =
fixture.metaDescriptionText === ''`), so `products.meta_description` is still
`NULL` and nothing reached the storefront.

> [!NOTE] A recommendation the owner correctly rejected
> The proposal was to drop the category segment when the mapping is only a CJ
> mirror. Bogs pushed back — *"yung own product category ng sals3? no way"* — and
> was right: that treats the symptom and throws away real SEO signal. The Sals3
> category belongs in the snippet; the defect is that **this product's category
> is wrong**. No code changed. Fixing the category is the fix, and it also fixes
> the snippet.

Still open and worth a decision later: the field is **pre-filled and one click
from `Save Meta Description`**, which is the same pattern deliberately rejected
for axis names in [§1e](#1e-the-decision-that-matters-most-offered-never-pre-filled).
The two surfaces currently disagree with each other. Also, the suggestion reaches
56 chars against its own stated target of 140–160.

---

## 5. Security: the Dependabot HIGH alert was genuinely stale

`nanoid` `GHSA-2v37-7h3g-55p8` / `CVE-2026-67213`, high severity, open since
2026-08-17.

Not applicable. The advisory has two ranges — `>= 4.0.0, < 5.1.6` and
`< 3.3.18`. The alert is the second; `package-lock.json` resolves **one**
`nanoid`, at **3.3.18**, which is the advisory's own
`first_patched_version`. No 4.x/5.x exists in the tree. Verified on
`origin/develop`, on the feature branch, and in `node_modules`;
`npm audit --audit-level=high` exits **0**.

The reason it never auto-closed — which a previous check had failed to work
out — is worth keeping:

> [!TIP] Why a patched Dependabot alert can stay open forever
> Dependabot closes an alert when a **manifest change** moves the dependency off
> a vulnerable version. Here the lockfile was *already* on `3.3.18` at commit
> `a6cdcc7` (07:33 +08:00), hours **before** the alert was raised (13:52 +08:00).
> There was never a change for it to close against, so it would have sat open
> indefinitely. Manual dismissal is the only resolution.

Dismissed as **`inaccurate`** with the evidence attached. Two process notes: the
first dismissal used `no_bandwidth`, which misstates a security record and had to
be corrected — and the API returns `409 already dismissed` rather than letting a
reason be edited, so correcting it requires reopening and re-dismissing.

Left alone deliberately: six **moderate** dev-chain findings (`esbuild` via
`drizzle-kit`, `uuid` via `exceljs`). Both "fixes" are `--force` downgrades —
`drizzle-kit@0.18.1` on a repo with 23 applied migrations, and
`exceljs@3.4.0`, which would likely break the taxonomy extractor. The gate
`npm run verify` enforces is `--audit-level=high`, which passes.

---

## 6. Verification

`npm run verify` green for every PR — lint, `format:check`, `typecheck:clean`,
build, unit, e2e — locally and in CI, plus the pre-commit and pre-push hooks
which run the whole chain again.

| | final |
| --- | --- |
| unit tests | **1,935** passed, 4 skipped (24 new) |
| e2e | **78** passed, 6 skipped |
| CI `verify` | success on every head commit, checked against the head SHA |
| open Dependabot alerts | 0 |

**No database change in any of the three PRs.** No migration, no SQL, no seed
writer, `drizzle/` untouched, journal still 23 entries. This was deliberate and
is the direct lesson of part 51: the suggestion data ships **inside the app
bundle** as a committed JSON keyed on the `sals3_categories.code` the editor
already resolves, so the feature works the moment it deploys and the
local-migration-only failure mode cannot apply. PR #120 actually *removed* a
database read — the dead `sals3_category_presets` query in `read-model.ts`, one
fewer query per `/listings` load. `taxonomy/repository.ts` and
`category-form.ts` still use that table for the Specification section.

Zero CJ calls throughout (ADR-017); every input was already in the database or
the repository.

Browser-verified against a real dev server, DOM-inspected because screenshots
were unavailable in this environment: suggestion buttons render, Save stays
disabled until named, accepting one suggestion clears its own chip, `1 option
detected` reads singular, `input[readonly]` count is 0, and the catalogue header
renders nine columns with the empty state spanning nine.

---

## 7. Open, and deliberately not closed

- **[Issue #111](https://github.com/Sals3-Official/sals3-portal/issues/111) — Cloudflare R2 configuration in Vercel.** Real outstanding work for AJ. Until seller uploads work, every product stays on supplier media and therefore **cannot reach `HIGH`** listing quality.
- **The lung model's category.** CJ has it under Fedoras. Needs a human in the category picker, or a fix to CJ mirroring. Fixes its meta description as a side effect.
- **A product on a `CJ-<id>` mirror category gets no suggestion.** `suggestedAxisNamesForCategory('CJ-1042')` returns `[]` by design. The 5,563/5,595 coverage figure is per *category*; per *product* it depends on a curated Sals3 category having been chosen. Not a regression — the field is simply blank as before.
- **`contentReadiness`** is description-only, so it can never read `TOP`, and is now largely redundant with the quality column. Flagged, not touched.
- **Meta Description is still pre-filled** rather than offered — inconsistent with the Variant Matrix decision. See [§4](#4-the-meta-description-finding--investigated-deliberately-not-fixed).
- **~95 stale remote branches** from merged PRs, several checked out in live worktrees. Untouched; an audit of which are fully merged into `develop` was offered.

---

## 8. Reusable lessons

1. **A feature whose data only a local script can write is broken in every environment but the author's.** Ask "what writes this table in production?" before believing a feature works. Three occurrences in three days; this one was the quiet variant, degrading silently instead of erroring.
2. **`useState(props)` reads its argument on mount only.** Any component that a `router.refresh()` can hand new props to, and that is not keyed, must resync during render. Second occurrence in two days, in the same editor.
3. **`[].every()` is `true`.** A "everything is filled in" guard over a collection that can be empty enables the very button it was meant to block.
4. **Verify a claim against `sourceType`, not row count.** `media.length > 0` conflated "has photos" with "has the seller's photos" — a whole class of provenance bug.
5. **A prose column named `Machine Value` may hold prose.** Read the distinct values of a workbook column before trusting its name.
6. **Compute contrast by painting into a canvas.** Modern token systems resolve to OKLCH; parsing `getComputedStyle` as RGB silently produces wrong ratios.
7. **A pre-filled suggestion is a saveable claim.** If the system cannot vouch for the value, offer it behind a press. The gate only means something if a person passes through it.
8. **A patched Dependabot alert can stay open forever** if the patch predates the alert. There is no manifest change left to close it against.
9. **A merge race can silently orphan a commit.** PR #120 merged at 05:09:57Z; a follow-up commit reached the branch a minute later, missed the merge, and GitHub then offered a PR for the orphan. Verify a follow-up's diff against what actually merged before deleting the branch — here the orphan was byte-identical to its cherry-pick, so nothing was lost.
10. **Never let a NUL byte into source.** A ` ` delimiter in a `.join()` made git treat a `.tsx` file as binary and its diff unreviewable. `JSON.stringify` is a collision-free identity with no control characters.

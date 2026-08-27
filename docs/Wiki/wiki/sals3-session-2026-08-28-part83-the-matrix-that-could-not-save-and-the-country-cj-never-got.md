---
tags:
  - sals3
  - sals3-portal
  - variant-matrix
  - orders
  - cj
  - backfill
  - session-note
aliases:
  - Part 83
  - The Matrix That Could Not Save
  - The Country CJ Never Got
created: 2026-08-28
updated: 2026-08-28
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[sals3-session-2026-08-15-part47-option-mapping-wiring-and-supplier-change-detection]]"
  - "[[sals3-session-2026-08-18-part52-variant-matrix-category-suggestions-and-catalogue-truth]]"
  - "[[sals3-session-2026-08-27-part80-a-global-scope-for-the-countries-with-no-column]]"
  - "[[sals3-session-2026-08-28-part82-a-shopfront-per-country-and-a-price-in-local-money]]"
---

# Part 83 — the matrix that could not save, and the country CJ never got

**Backfill note, written 2026-08-28** from merged PR bodies and the code on
`origin/develop`. Neither PR was written by the agent recording them; both are
`louieboi09`'s, committed as `Bogs`. Claims resting only on a PR body are
labelled, and there are several here that matter.

- `sals3-portal` [#204](https://github.com/Sals3-Official/sals3-portal/pull/204)
  — a single-variant product can save its Variant Matrix (merged `a433716`)
- `sals3-portal` [#205](https://github.com/Sals3-Official/sals3-portal/pull/205)
  — CJ gets a country name instead of the code twice (merged `abe96df`)

**No DDL, no migration, no new dependency, and zero CJ calls in either.**

## 1. A floor that outlived the rule it came from

Three products — `Bamboo Storage Box`, `Human Lung Anatomical Model`,
`Mohair Knit Beanie` — each rendered a Variant Matrix, accepted an axis name,
enabled **Save Variant Matrix**, and answered every press with:

> *"Those variant options could not be read. Give every option a name and at
> least two values."*

**A one-variant product cannot meet that demand.** There was no way for the
seller to comply, and nothing on the screen said so.

The cause is a single `.min(2)` on the per-axis `values` array in
`optionMappingInputSchema`. It was correct when written and became wrong on
**2026-08-19**, when the owner decided one variant is enough and
`deriveOptionSplit` dropped its own two-variant floor. That change was applied
to the splitter and to the publish gate — and **not** to the server-action
boundary schema, leaving the floor behind as an orphan of a retired rule.

**Why only single-variant products.** `deriveOptionSplit` drops a position whose
value is constant across every variant (`option-split.ts:194`), so for a
multi-variant product every surviving axis inherently has two or more values and
`.min(2)` never bit. A one-variant product short-circuits that filter — every
position survives holding exactly one value — so the schema rejected **100%** of
them.

Three controls could each have caught it and none did: `saveOptionMapping` has
no value-count check, `mappingBlocksPublish` requires `variants.length >= 2` so
publication was never gated on this, and the Save button gates on
`named` alone. The refusal string was the only thing standing between the seller
and a working save, and it was describing a rule that no longer existed anywhere
else.

**This completes part 47 and part 52's work rather than reversing it.** Both
vault claims are confirmed as still true in code: a single-variant product
deliberately gets a Variant Matrix (`option-split.ts:129`, `< 1` not `< 2`) and
is deliberately **not** publish-gated (`read-model.ts:1830-1831`). The shape
check in `save-option-mapping.ts` — re-deriving the split and comparing — is
what actually holds the line the schema floor was wrongly duplicating.

### The part worth flagging

**The three product names were diagnosed by shape, not against live rows.** The
PR says so plainly: the local database is empty and production was not
reachable. What is proven is the chain `variants.length === 1` → an axis holding
one value → `.min(2)` → `invalid_input`, which is exactly the sentence the
seller reported.

But those names are now baked into **three places on `develop`** — the schema's
doc comment, a test's fixture comment, and `README.md` — where they read as
verified fact to anyone who arrives later. They are a well-reasoned inference,
not an observation. This note is the record of that difference.

## 2. Every supplier order since 2026-08-18 told CJ the country twice

`createOrderBody()` assigned the same two-letter code to **both** fields:

```ts
shippingCountry: input.address.country,      // CJ wants "Philippines"
shippingCountryCode: input.address.country,  // CJ wants "PH"
```

CJ documents `shippingCountry` as the destination country (max 50) and
`shippingCountryCode` as the two-letter code (max 20). So every order reached
CJ reading `shippingCountry: "PH"`.

**It was live from the paid-order path's first day.** `createOrderBody` was
introduced by the 2026-08-18 commit that shipped that path, and `git log
--follow` shows only three later touches, none of them near the country fields.
Nine days.

**It is not an incident, and the PR is right to say so.** Per the body, the six
real orders of 2026-08-18 came back `code: 200, success: true` with a usable
`orderId` while sending the bare code — CJ does not validate this field. What
changed is what a CJ operator reads on the order, not whether the order exists.

Two caveats the note should carry rather than lose:

- **The six orders, the 200s and the order ids are PR-body claims.** Nothing in
  the repository evidences them — no fixture, no log, no test data.
- **Orders default to CJ *sandbox*.** `isSandboxOrderEnabled()` is
  `CJ_ORDER_SANDBOX !== '0'`, so they are only real when that variable is
  explicitly `'0'`. Whether those six went to CJ live or to sandbox depends on
  production environment nobody verified here. "Real orders" is the body's word.

### The fix, and what it deliberately does not do

A new hand-built map, `src/lib/cj/country-names.ts` — **249 entries**, counted
directly rather than taken from the body, carrying CJ's own spellings rather
than `Intl.DisplayNames` output: `Viet Nam`, `Czechia`,
`Taiwan (Province of China)`, `Korea (the Republic of)`.

**An unmapped code returns unchanged rather than throwing**, and the reasoning
is worth keeping:

> "an unmapped code would make the CJ step fail permanently — `supplier_order_steps`
> would retry the same address forever — and strand an order that CJ has already
> shown it will accept with a bare code. A wrong-looking country name is the
> cheaper failure."

`CD` is deliberately unmapped (CJ's own row is malformed) and `GB` ships as CJ's
50-character truncation, `United Kingdom of Great Britain and Northern Irela`.
Neither is an approved buyer destination, so both decisions are deferred rather
than made.

The tests do pin the **actual wire values** — they parse the outbound fetch body
and assert `shippingCountry: 'Philippines'` against `shippingCountryCode: 'PH'`,
and that a retry replays the name from `requestSnapshot`.

### Three things found by reading the code that the PR body does not say

**The two fields are now normalised differently.** `cjShippingCountryName`
trims and upper-cases its input; `shippingCountryCode` on the very next line
still sends `input.address.country` raw, and `addressSchema` declares it as a
bare `z.string()` with no transform. A snapshot holding `'ph'` now produces
`shippingCountry: 'Philippines'` with `shippingCountryCode: 'ph'`. Pre-existing
for the code field, so not a regression — but a new asymmetry, and the file's own
justification for case-insensitivity ("frozen JSON whose casing this module does
not control") applies just as well to the field that did not get it.

**The sweep test sweeps ten rows, not the map.** The body describes it as
asserting no name exceeds 50 characters or carries a stray `*` or non-breaking
space. The property does hold across all 249 — verified mechanically — but the
test checks ten hard-coded codes, so a regression on any other row would pass.

**`YK` is in the map; `XK` is not.** `YK` is not a valid ISO 3166-1 assignment —
the user-assigned code in common use for Kosovo is `XK`. This is presumably
faithful to CJ's table, which is the file's stated policy, but a buyer address
carrying `XK` falls through to the raw-code fallback. No live impact today.

Also: the generator that produced the map is **not in the repository** — only
its output is. The body offers "a one-line change to the generator rule" as the
reversal path for one judgement call (dropping `(the)` from names like
`Korea (the Republic of)`), and that line lives somewhere nobody else can reach.

## 3. Two numbers that do not reconcile

Both PRs report `npm run verify` exit 0. The counts do not line up, and neither
was re-run for this note:

- #204: **2,735 unit** (4 skipped), **79 e2e**, no skips stated.
- #205: **2,750 unit** (4 skipped), **70 e2e passed, 15 skipped**.

#205 was rebased directly onto #204's merge, so its baseline should be 2,735 —
but it adds 11 test cases by direct count, not 15. And 79-with-no-skips and
70-plus-15 cannot both describe the same suite one commit apart. Environment-gated
specs are the likely explanation and that is speculation, not a finding.

Recorded because [[hot]] carries these totals forward, and a number that cannot
be reproduced should not be quoted as though it can.

## 4. A stale checkout is a trap here

At the time of writing, the local `E:\sals3-portal` clone is **two commits
behind** `origin/develop`. Anyone opening `fulfillment-worker.ts` on disk sees
the **pre-fix** file, with the country code assigned twice, and would reasonably
conclude the bug is still live.

The standing rule already says to read `hot.md` through `git show
origin/develop:` rather than the working tree. This is the same hazard one level
down: on a machine several agents share, the file on disk is not the file that
shipped.

## 5. What to carry forward

**When a rule is relaxed, grep for its other copies.** The two-variant floor was
removed from the splitter and the publish gate on 2026-08-19 and left standing
in a boundary schema, where it silently rejected every product of one shape for
nine days. A validation rule duplicated at a boundary is a second opinion that
cannot see what the first one knows — here, the variant count that would have
made it right.

**A refusal message that names an impossible remedy is worse than an error.**
"Give every option a name and at least two values" told the seller to do
something a one-variant product cannot do. They had no way to know the sentence
was describing a rule that no longer existed.

**A defect can be real, nine days old, and still not an incident.** CJ accepted
every order with the wrong field because it does not validate it. Saying that
plainly — rather than either hiding it or escalating it — is what makes the
record usable later.

**Names in a code comment become facts.** Three products were named as examples
of a bug diagnosed from shape alone, and now appear in a schema comment, a test
fixture and the README. Nothing marks them as inferred. If an example was never
observed, the comment is the place to say so.

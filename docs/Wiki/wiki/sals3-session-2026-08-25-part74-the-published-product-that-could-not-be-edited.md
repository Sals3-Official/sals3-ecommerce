---
tags:
  [
    sals3,
    session-note,
    sals3-portal,
    sals3-ecommerce,
    product-editor,
    description-studio,
    revisions,
    freight,
    pdp,
  ]
aliases:
  - Part 74
  - The Published Product That Could Not Be Edited
  - Three Silent Drops
created: 2026-08-26
updated: 2026-08-26
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[sals3-session-2026-08-25-part73-image-specs-a-mirror-leak-and-a-test-that-assumed-its-upstream]]"
  - "[[sals3-session-2026-08-25-part75-aj-a-department-to-browse-and-a-review-from-the-order-list]]"
---

# Part 74 — The published product that could not be edited, and two things it published without

Three merges. Each one is the same shape of defect: a field authored in the
Portal that never reached the buyer, and **nothing anywhere reported it**.
**No schema change and no migration in any of them.**

- `sals3-portal` [#189](https://github.com/Sals3-Official/sals3-portal/pull/189) — fork a draft revision when editing a published product, merged `2ec6f05`
- `sals3-portal` [#191](https://github.com/Sals3-Official/sals3-portal/pull/191) — record the supplier's packed box on every variant, merged `d5416e1`
- `sals3-ecommerce` [#160](https://github.com/Sals3-Official/sals3-ecommerce/pull/160) — render the emphasis a seller wrote inside a paragraph, merged `cadebb0`

## 1. Once published, a product could never be edited again

All 21 products in `/listings` were `Live`, and **not one of them could take a
description**.

Publishing moves a revision `DRAFT → APPROVED` and freezes its content.
`saveDraftRevisionContent` writes only where `workflow_state = 'DRAFT'`. Nothing
ever created the next draft, so every revision-scoped save — the description,
and the product name that rides `Save Draft` — matched zero rows and came back
`version_conflict`, while the editor went on offering `Save New Draft` and
`Publish Update`. The screen promised an edit it could not perform.

The fork had been **designed and never wired**: `insertDraftRevision`'s own doc
comment already described it as the fork-on-edit path.

### The half that lived in the browser

`openDraftForEdit` on the server is only half a fix, and the half that looks
right. **Two editor surfaces held the revision *id* in a server-rendered prop
while only the *version* was state** — `ProductEditorWorkspace.tsx` and
`DescriptionStudioClient.tsx`. After a fork the id is stale, so the fork would
happen once and every save after it would name the settled revision again, with
no reload in between to correct it. The regression test is the exact sequence
that failed in the live Portal: `Save New Draft`, then `Save description`.

Worth keeping: the turnover that opened this session named the server defect
precisely and did not mention the client at all. **A correct diagnosis of one
end is not a diagnosis of the path.**

### Five refusals, none of them a loosening

The `workflow_state = 'DRAFT'` predicate is unchanged — a settled revision is
still never rewritten in place. What the fork adds is a **row**:

- **Already a `DRAFT`** → returned untouched with the caller's own version. A
  version mismatch must never become a reason to fork.
- **Not this product's revision** → `version_conflict`; the id is still `AND`ed
  against the product the caller proved stewardship of.
- **`IN_REVIEW` / `CHANGES_REQUESTED`** → refused outright with its own reason.
  Forking from the last `APPROVED` revision instead would be **worse than a
  refusal**: `publish.ts` selects only from `['DRAFT','APPROVED']`, so
  publishing that fork would step silently past the copy under review, and the
  database cannot stop it — the open-draft index covers `DRAFT` only, so a
  `DRAFT` and an `IN_REVIEW` revision coexist happily. Nothing writes either
  state today; the refusal is held by tests, not by traffic.
- **A settled revision the product has moved on from** → `version_conflict`.
  The version token alone does not catch this: a tab that loaded before someone
  else published still holds a matching version for a revision that has since
  been superseded, and forking from it would resurrect older copy over newer.
- **Another writer got there first** → `version_conflict`. The loser is
  refused, never redirected into the winner's draft.

### `ON CONFLICT DO NOTHING`, because a raised violation poisons the transaction

`product_revisions_open_draft_key` has to be the arbiter, but a unique
violation **aborts the whole surrounding transaction in Postgres** — the loser
could not even record why it lost, and the caller's clean refusal would never
run. `insertDraftRevision` returns `null` instead, which leaves the transaction
usable. `create-draft.ts` answers the same `null` the opposite way — it adopts
the winner's draft — and that is right *there* specifically, because it is the
import pipeline: it wants the product to *have* an open draft, not to own the
one it created.

### The seller is told, and only where it is true

A fork leaves `products.published_revision_id` alone, and that is the column the
storefront projection reads, so buyers keep seeing the published copy. The cost
of that correctness is a seller who edits, sees "saved", opens their live
listing and finds the old text — so the editor states the gap persistently
rather than in a toast.

**Only where the listing is genuinely live.** `unpublishProduct` moves a product
to `PAUSED` **without clearing `published_revision_id`**, so keying the notice on
that column alone would have promised a storefront that is serving nothing. This
was caught in review, not by a test.

Publishing now also retires what it replaces: the previous `APPROVED` revision
becomes `SUPERSEDED` in the same transaction. Not a correctness fix — the
selection was already deterministic — but `APPROVED` means "the copy this
product is published from", and two rows in that role is two sources of truth.
`SUPERSEDED` had been in the enum since day one and nothing had ever written it.

### Owner decisions

Four, all taken before any code: fork on first edit server-side; seed from
`content_snapshot`, never a silent `contentDocument` fallback; a new
`catalog_product_revision.forked` audit action rather than reusing
`revisionCreated` (which means "a product was imported" and would start counting
edits); and the previous `APPROVED` revision becomes `SUPERSEDED`. A fifth came
from the owner: `IN_REVIEW` / `CHANGES_REQUESTED` are **refused**, not forked
around.

## 2. Every variant had a weight and no box

The product page showed **`Weight 380 g` and no dimensions**, while the Portal
showed `35×40×5 cm` for the same product on the screen the seller published
from. Both were telling the truth about different things: the Portal's
`Package dimensions (supplier)` label is derived from the evidence snapshot **at
read time**, and the product page reads the `product_variants` columns — which
had been `null` on every variant this codebase had ever created.

Dropped twice on the way in. `insertDraftVariant` passed `weight_grams` through
and hard-coded the other three to `null`, and it could not have done otherwise:
`create-draft.ts`'s own subset schema never read `lengthMm`, `widthMm`, or
`heightMm` off the snapshot, and Zod drops unknown keys. **Fixing either half
alone changes nothing.**

**The display was the smaller half.** `freight-quotes.ts` computes a variant's
volume from the same three columns and returns `null` unless all three are
present, so **no volumetric weight had ever entered a freight quote**. That is
checkout, not a product page.

The numbers were already in the database — `supplier_snapshots.evidence` has
carried them per variant since evidence capture existed, and
`formatPackedDimensions` had been building the Portal's label out of them the
whole time. **No CJ call was added and none was needed** (ADR-017).

### The backfill, and what it proved

Fixing the write path fixes nothing already listed, so `backfillVariantDimensions`
ships with it, reachable only through the `Products Backfill Variant Dimensions`
workflow (`workflow_dispatch`, `CRON_SECRET`) — the deployed app's own
connection, never a production `DATABASE_URL` on a laptop.

It matches a variant to its evidence on CJ's own `vid` through
`provider_variant_references`, **never by array position**: pairing by index
would hand a variant *another variant's box* the first time CJ returned a
different order, and nothing downstream could tell. It touches a variant only
while all three columns are still null, and fills all three or none —
`freight-quotes.ts` needs the set, and a half-measured box reads as a fact while
being useless.

Run on production: **194 variants filled, 0 still missing**. A second run
reported `variantsFilled: 0` — **idempotency proven on real rows, not only in
tests**.

## 3. A seller's bold never reached the page

`sals3-ecommerce`'s paragraph schema named only `text`. Zod drops unknown keys,
so every `runs` array the portal sent — the inline emphasis a seller applies in
the designed layout — was **stripped at the boundary**, and the
`ProductDescriptionBlock` union had no `runs` member for anything downstream to
use.

Same shape as the `image` block before [#125](https://github.com/Sals3-Official/sals3-ecommerce/pull/125).
**Found the same way it should have been found then**: by lining up what the
Portal can author against what the storefront accepts, field by field.

| Block | Portal authors | Storefront accepted | |
|---|---|---|---|
| paragraph | `text`, **`runs`** | `text` | **gap** |
| heading | level 2\|3, ≤120 | level 2\|3, ≤160 | ok |
| bulletList | ≤40 items, ≤4000 each | ≤40, ≤4000 | ok |
| keyValueList | ≤40 entries, 120/4000 | ≤40, 120/4000 | ok |
| image | url, alt ≤160, caption | same | ok |
| document | `MAX_BLOCKS` 60 | `salvagedArray(…, 60)` | ok |

`runs` was the only one. Every cap already matched, which matters because
`truncatedText` **truncates rather than rejects** — a tighter cap on this side
would have silently shortened a seller's sentence.

`runs` are used only when they join back to **exactly** `text`. The portal
enforces that join on write, but this is a read path over payloads written by
older deployments, and a run list that disagreed with `text` would put different
words on the page than the ones stored. Losing the emphasis is the smaller
failure. `strong` and `em` render as elements, so a buyer using a screen reader
hears the emphasis rather than losing it a second time, more quietly.

**The committed contract fixture is the regression guard.**
`test/fixtures/storefront-product-detail.json` gained a marked-up paragraph and
an assertion that it survives the parse whole — the guard the image block
already carried, for the reason it needed one: a fixture holding a field the
schema strips reads as *shipped* while nothing reaches the page.

## Verified on production, and what that took

Every claim below was exercised against the live deployment, not inferred:

- **The fork.** A description saved on a Live product, survived a full reload,
  the "Saved, but not live yet" notice appeared **and was still there after the
  reload** — so the server, not leftover client state, is reporting it — and the
  storefront did not change.
- **Dimensions.** Two products after the backfill: `35 cm × 40 cm × 5 cm` and
  `30 cm × 20 cm × 3 cm`. Different values, so real per-product data.
- **Emphasis.** A paragraph written in the designed layout with `regular fit`
  bolded, saved, reloaded (the mark survived), published by the owner, and the
  live page returned **`<strong>regular fit</strong>`** — an element, not
  flattened text. The first paragraph became the page's lead line under the
  title via `answerSummary`, and the second landed in *About this product*:
  both mechanisms confirmed at once.

### Three things that cost time and are worth writing down

- **The storefront PDP fetch is `{ cache: 'no-store' }`, but the HTML is edge
  cached.** A stale page said the backfill had not worked. A cache-busting query
  parameter showed the dimensions immediately. Check any storefront change with
  one.
- **Vercel preview deployments sit behind Vercel SSO.** They cannot be driven
  without signing in, so production was the only testable surface — which is why
  the fork was verified after merge rather than before.
- **The Browser pane cannot drive a Radix trigger.** Plain buttons work; the
  `Publish Update` confirmation dialog never opened across four attempts (three
  clicks, hover-then-click, and Enter on the focused button) with no network
  request and no console error, because Radix listens for `pointerdown`. The
  publish was left for the owner rather than forcing it with synthetic pointer
  events — that dialog is the deliberate "before a buyer sees this" question.

### Guards checked by breaking them

Every new guard was mutation-tested — the source was edited to remove it, the
suite was run, and the file restored:

| Removed | Tests that failed |
|---|---|
| `runs` from the paragraph schema | 3, including the contract fixture |
| the runs-join guard | 1 |
| the null guard and the `vid` match in the backfill | 2 |
| the route's fail-closed check on an unset `CRON_SECRET` | 1 |
| `.onConflictDoNothing()` | 1 |
| the client's adoption of the returned `revisionId` | 2 |

## Still open

- **A forked draft cannot be discarded.** After any description or name save on
  a live product, `Publish Update` publishes those edits; before this change it
  republished the approved copy. There is no discard control — a gap this change
  makes reachable rather than one it introduces.
- **The CJ points leak** at `product-draft-actions.ts:179`/`:242`:
  `captureEvidenceBeforeDraft` runs before the idempotency check, so re-clicking
  *Customize & List* re-spends ~10 points. Named in the turnover, deliberately
  not folded in, and still unwritten.
- **The backfill statement was never executed locally.** The local database is
  empty and must not be migrated, so its properties are asserted against the
  rendered SQL. The production run is the evidence.

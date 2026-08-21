---
tags:
  - sals3
  - sals3-portal
  - sals3-ecommerce
  - orders
  - media
  - product-editor
  - migrations
  - drizzle
  - verification
  - session
aliases:
  - Order Listing Snapshot
  - Durable Supplier Media
  - The INSERT That Names Every Column
  - Part 63
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
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-21-part62-two-inert-pdp-fixes-and-the-fonts-that-were-never-loaded]]"
  - "[[sals3-session-2026-08-19-part58-aj-buyer-orders-api-status-sync-and-the-frozen-line-image]]"
  - "[[sals3-skills]]"
---

# Sals3 session 2026-08-21, part 63 — an order that remembers what it bought, durable supplier media, and the `INSERT` that names every column

Seven merged PRs across both repositories, **three production DDL runs, and a
production media backfill that mirrored 127 supplier photos into Sals3
storage**. Two owner rules were taken and implemented, one ADR was amended, and
one of my own PRs was caught being wrong *after* CI passed and *before* it was
merged — by a check nobody asked for.

| PR | Repo | What |
| --- | --- | --- |
| [#165](https://github.com/Sals3-Official/sals3-portal/pull/165) | portal | Five reported editor defects: matrix reorder, honest description refusal, spec flush on publish, variant photos, publish confirmation |
| [#166](https://github.com/Sals3-Official/sals3-portal/pull/166) | portal | `sals3_order_lines.listing_snapshot` DDL + break-glass route + workflow |
| [#167](https://github.com/Sals3-Official/sals3-portal/pull/167) | portal | Capture the whole listing onto the order line |
| [#168](https://github.com/Sals3-Official/sals3-portal/pull/168) | portal | `product_media_sources.stored_url` / `stored_at` DDL + break-glass route + workflow |
| [#169](https://github.com/Sals3-Official/sals3-portal/pull/169) | portal | Mirror every approved supplier photo into R2, plus the sweeper |
| [#133](https://github.com/Sals3-Official/sals3-ecommerce/pull/133) | ecommerce | Render "Details as ordered" on the buyer's order line |
| [#134](https://github.com/Sals3-Official/sals3-ecommerce/pull/134) | ecommerce | Amend ADR-007 for the seller as a mutating actor |

> [!IMPORTANT] The lesson this session actually taught
> **Drizzle names every column of the schema in an `INSERT`.** Omitted ones are
> filled with `default`. So adding a column to a Drizzle table is *by itself*
> enough to change the SQL every writer of that table emits — there is no
> "define it now, write it later". A migration column can only ship ahead of its
> reader if it is absent from the schema file too.
>
> This was found by running `toSQL()` on the real insert while checking whether
> [#166](https://github.com/Sals3-Official/sals3-portal/pull/166) was safe to
> merge. It was not: its own commit message claimed it "reads and writes
> nothing", CI was green, and it would have failed **every paid checkout** with
> `column "listing_snapshot" does not exist` until the migration ran. Pinned now
> by `order-line-columns.test.ts`.

---

## 1. Owner rule: an order freezes every listing detail, not just the name

> *"dapat naka freeze lahat ng details hindi lang names. pag may binago ang
> seller sa new orders ito mag eeffect. tapos dapat may snapshot ito para kahit
> mag bago ng details si seller ay kita padin ng customer ang details ng kanyang
> tunay na ini order. baka kasi biglang palitan ni customer 360 degrees ang
> pangalan pictyre etc."*

A seller may rewrite a live listing completely — and is entitled to. The change
must apply to **new orders only**.

### What was already frozen, and what was not

Verified against `sals3_order_lines` rather than assumed: `title`,
`variant_label`, `image_url`, `quantity`, `unit_amount_minor`, `currency`,
`sals3_sku`, `external_sku` were already per-line. **Not** frozen anywhere: the
option axes, every photo beyond the cover, the description document, the
specification answers, the Sals3 category, the brand.

So the ask was not "build a snapshot" — it was "widen the one that exists".

### Two defects surfaced on the way

- **`variant_label` was never the buyer's words.** It holds the *supplier's*
  concatenated token (`army green-L`) while the buyer chose `Colour: Army
  Green` / `Size: L` from the seller's mapped axes. The field meant to record
  what was bought recorded something the buyer never saw. The snapshot carries
  the buyer-facing pairs; the token stays for CJ fulfilment matching.
- **Both order-line readers used a bare `.select()`**, which Drizzle expands to
  every schema column. That is the SELECT half of the lesson above.

### Shape, and why bytes rather than a pointer

One nullable `jsonb` column, captured at **intent creation** — not at the
`Order commitment boundary` ADR-007 names. Acceptance runs *after* payment on a
Stripe webhook, so an edit landing during that round trip would have decided
what the order says was bought. `snapshot-at-intent.test.ts` pins that on source
text, because `createCheckoutIntent` has no behavioural test in the repository.

Sourced from `findPublishedProductBySlug` — the exact projection the storefront
served the buyer — so the copy cannot drift from the page it is a copy of.

A `product_revisions` pointer would have been cheaper and would have frozen the
description exactly, and was rejected: it makes a two-year-old order depend on a
revision row and an R2 object still existing, so a future cleanup would blank
the very history the column exists to protect.

### The buyer's side

`GET /api/storefront/orders` returns an optional `listing` per line, and the
storefront renders a closed `Details as ordered` disclosure. Native `<details>`:
no client JavaScript on a page that needs none. Copy is deliberately *"saved
when you placed this order"* and never *"current"* — the panel's whole value is
that it may now differ from the live product page.

`DescriptionBlockList` was extracted from `ProductDescription` so the frozen
description and the live one render through one allow-listed union and one
renderer. Two renderers would drift and the one that drifted would be the order
page's, because nobody looks at it until a buyer is already worried.

---

## 2. ADR-007 amended: the seller is the other mutating actor

ADR-007 is written around one actor — *"A supplier product is mutable after
Sals3 imports it."* The seller's listing is mutable too, by design. The
amendment ([#134](https://github.com/Sals3-Official/sals3-ecommerce/pull/134))
records:

- **Why the seller half needs no detection.** A supplier changes things behind
  Sals3, asynchronously, so the platform must notice. A seller edit happens
  inside Sals3, by an authenticated actor, at a known moment — nothing to
  detect, nothing to notify, only a write-time obligation to have taken the copy
  already. No queue, no poll, no notification channel.
- **A deliberate departure**: the freeze is at intent creation, not at the
  acceptance boundary the ADR's own text names.
- **Where the as-built shape is narrower**, separating choices from gaps: one
  `jsonb` column rather than an `OrderLineSnapshot` entity with two checksums;
  copied bytes rather than `mediaSnapshotIds`; no `OrderAmendment` at all.
  Discounts, tax and shipping allocation, `promisedDeliveryWindow`, warranty
  terms version and the offer/binding identity pair are listed as unbuilt rather
  than left to be inferred.

`implementation_status` moved from `not-started` to `partially-implemented`.

---

## 3. The gap the amendment named, then closed

Writing the amendment surfaced a real hole in ADR-007's `Media locking`:

> *"If a supplier later replaces or removes a file at the same URL, the order,
> receipt, return, dispute, and support surfaces continue showing the original
> accepted media."*

**False for a supplier original.** `source_url` is a CJ CDN address and the
snapshot freezes the *address*, not the bytes — so a file CJ swaps out changes
what a two-year-old order shows, silently, in the one case nobody looks at until
a dispute. The owner asked for it to be fixed in the same session.

### How the copy is taken

`mirror-supplier-media.ts` fetches each approved supplier photo once, re-encodes
it through **the same pipeline every seller upload passes**
(`prepareUploadedImage` — magic-byte check, 2000 px ceiling, WebP q82, which also
strips whatever metadata rode along), stores it at
`supplier-media/<productId>/<sha256>.webp`, and records `stored_url`,
`stored_at`, plus the checksum and dimensions `media-projection` deliberately
left null because no bytes had ever been read.

`source_url` is never written. It is provenance (ADR-011 §6) — "where did this
come from" is not "what can we still show".

Boundaries that matter:

- **It only fetches hosts `cjImageUrl` accepts.** A stored URL is still an
  address this server is about to open, and being in our own database is not a
  reason to skip the host check.
- **Reads CJ's CDN, never its API** — no points (ADR-017). Bounded at 12 images
  per product, 10 s timeout, sequential.
- **Duplicate bytes share one object**, which is also what stops the
  `(product_id, checksum)` unique index turning a repeated photo into a failure.

### When it runs, and the window left open on purpose

On publication via `after()`, so the seller's publish response never waits on a
dozen CDN reads — and **best-effort, not a publish gate**: a listing that is
otherwise ready must not become unpublishable because a CDN blinked. The
`Products Backfill Media Copies` workflow sweeps everything published earlier.

A product published and ordered in the seconds before its mirror finishes still
freezes a CJ address. Closing that would mean gating publication on a CDN fetch —
trading a rare stale photo for a common unpublishable listing. Kept, and
documented, rather than hidden.

### One correctness catch

The editor projection's image allow-list was keyed on `source_type` — and a
mirrored **supplier** photo lives in R2, so that check would have rejected
exactly the copy that exists to be durable. `displayableMediaUrl` now keys on
which *column* supplied the value.

---

## 4. Production operations performed

All three through `workflow_dispatch` + `CRON_SECRET` break-glass routes. No
laptop ever held a production `DATABASE_URL`.

| Run | Evidence |
| --- | --- |
| Migration `0026` (order line snapshot) | `columnExists:false` → `statementsRun:1` → `columnExistsAfter:true` |
| `0026` ledger, after #167 deployed | `migrationRecord.inserted:true`, `createdAt 1787309724616` |
| Migration `0027` (media stored copy) | `columnsExist:false` → `statementsRun:2` → `columnsExistAfter:true` |
| `0027` ledger, after #169 deployed | `migrationRecord.inserted:true`, `createdAt 1787314656435` |
| Backfill × 3 | **127 photos mirrored, 7 deduped, 23 products visited, `remaining: 1`** |

Before each POST, an unauthenticated `GET` was used to prove the route was
actually deployed — **401, not 404**. A green workflow is not evidence that a
deployment carrying the endpoint exists.

### Verified end to end

A mirrored object serves `200 image/webp`, and the live storefront home page went
from CJ-hosted images to **216 R2 references / 0 CJ references**.

### The one product that did not mirror

`8abea23b-2328-46cc-b596-6b750b248fec` — five photos, all `NOT_AN_IMAGE`. CJ is
serving something the magic-byte check rejects, or a 200 with an HTML body. Those
rows kept their CJ address and the fallback path, so nothing about that product
is worse than before.

**The accepted-format allow-list was deliberately not widened to make it pass.**
That check is on the security-sensitive path shared with every seller upload, and
loosening it to clear a symptom — before knowing what CJ actually returns — is how
you accept a file you did not mean to.

Re-running the backfill now **fails the workflow on purpose**
(`remaining > 0 && mirrored == 0`), so a stuck tail cannot read as success.

---

## 5. The five editor defects ([#165](https://github.com/Sals3-Official/sals3-portal/pull/165))

Reported from screenshots, at the start of the same session.

1. **The Variant Matrix can be reordered after it is saved.** `S, M, L, XL, XXL`
   is alphabetically `L, M, S, XL, XXL`, which is what buyers were shown: the
   first-time mapping form had up/down arrows and the later **Edit names** form
   had none. Both now render one `VariantMatrixValueRow` — the rename form's
   `1fr 1fr` grid was also why the supplier token floated alone in the left half.
   `renameOptionMapping` writes `position` in **two passes**, lifting every value
   above its own maximum first, because
   `product_option_values_option_position_key` is a non-deferrable unique index a
   straight swap collides on, and the `position >= 0` check rules out negative
   sentinels.
   **The storefront was sorting variants by `sals3_sku` — a hash** — so the
   portal-side order was cosmetic until `compareMatrixOrder` landed.
2. **A description save says what is actually wrong with it.** An uploaded photo
   with no alt text failed `descriptionDocumentSchema` and came back as *"Remove
   any pasted formatting"* — a cause the seller never had. `describeBlockProblem`
   already knew the real reason and was only ever rendered for whichever block
   happened to be selected; `firstBlockProblem` now runs it over everything about
   to be stored and selects the offending block. Upload limits are stated before
   the picker opens, from one constant test-pinned against the pipeline —
   replacing three hand-typed captions of which two had already drifted.
3. **Publish no longer discards unsaved specifications.** The Specification
   section owned the only write path for its fields, so pressing Publish
   published without freshly typed values. Publish and Save Draft now flush
   first, and publish compare-and-sets against the version *that flush returned* —
   otherwise the second write is refused for having done what it was asked.
4. **A variant can be given one of the product's stored photos.**
   `product_media_sources.variant_id` had existed since the table was created
   (ADR-013 §8) and the read model always reported `hasImage` from it, but
   **nothing ever wrote it** — so every variant showed "No variant image" on
   products whose photos were already uploaded, with the cell rendering the
   literal string `img` for rows that did have one.
5. **Publication confirms itself in a dialog** with the storefront path and a
   link back to the Product Catalogue, replacing a toast that dismissed while the
   seller was still reading it.

Caught in my own draft before it shipped: the first version of
`assignVariantMedia` read the previous holder from `UPDATE ... RETURNING`, which
in Postgres reports the row *after* the statement — the audit trail would have
recorded the destination twice while calling one of them the origin.

---

## 6. Backfilled: three merged PRs that had no vault entry

Found by auditing every merged PR number in both repositories against the vault,
the same method [[sals3-session-2026-08-19-part56-backfill-of-five-undocumented-portal-prs]]
used.

- **[#159](https://github.com/Sals3-Official/sals3-portal/pull/159) portal —
  equal-cost retail edits are rejected.** A manual row edit equal to the matching
  supplier cost is clamped to the next minor unit above cost, and the bulk retail
  dialog computes its minimum from the affected variants and disables Apply for
  equal-or-below values. The publish-side floor already refused these; the editor
  was letting a seller type one and only learn at publish.
- **[#128](https://github.com/Sals3-Official/sals3-ecommerce/pull/128) ecommerce
  — browse by main category.** A "Shop by category" grid under the banner (5
  columns at `md`, 3 below, filler cells finishing the last row), replacing the
  horizontal scroller above it, plus an all-departments page. One vocabulary: the
  taxonomy's 21 main departments, with `departmentsOrTaxonomy` rejecting a feed
  response unless every id is a known department — a stale feed falls back to the
  taxonomy rather than rendering an unknown tile.
- **[#135](https://github.com/Sals3-Official/sals3-ecommerce/pull/135) ecommerce
  — a photograph on each department tile.** Three tiers: photograph → line icon →
  code initials. 20 of 21 departments ship a photo; `toys-games` has none yet and
  falls back to its icon — a missing asset, not a decision, unlike `mature` and
  `religious-ceremonial` whose icons are deliberately absent. The plate behind
  the media turns white when there is a photo, because the images are shot on
  white and the sunken grey plate read as a border the photo does not have.

---

## 7. Still open after this session

- **`STRIPE_WEBHOOK_SECRET` is still unset in production**, so the order path has
  never run end to end and **no real order carries a snapshot yet**. Every
  existing order takes the documented fallback. Owner decision: leave it —
  *"yung 2 hayaan mo muna yan di pa pwede maging real yan"*.
- **The `NOT_AN_IMAGE` product** above needs someone to look at what CJ serves at
  those five addresses.
- **The publish → first-order window** where a line can still freeze a CJ
  address.
- **ADR-007's supplier half** — detection, attention queues, anomaly thresholds,
  notification channels, active-order exception tooling, `OrderAmendment` —
  remains unbuilt.
- **No browser pass on the two new buyer-facing surfaces.** The order page needs
  a session and a reachable portal, which the local environment does not have
  (`e2e/orders.spec.ts` says so in its own header), and the Variant Matrix rename
  form and publish dialog need a database-backed product, which no `?fixture=`
  scenario produces.

---

## 8. Reusable lessons

1. **Drizzle names every schema column in an `INSERT`.** See the callout at the
   top. A column can only ship ahead of its reader if it is absent from the
   schema file, which means the `drizzle/` migration file and its ledger row have
   to travel with the schema change, not with the DDL.
2. **`UPDATE ... RETURNING` in Postgres reports the row *after* the statement.**
   It cannot supply the previous value; read before writing if the audit trail
   needs the origin.
3. **Prove the endpoint is deployed before calling it.** An unauthenticated
   request returning 401 rather than 404 is the cheap check that the route
   exists; a green deploy status is not the same claim.
4. **Mergeability is not verifiability.** GitHub reporting a PR mergeable only
   means no text conflict. For anything on the money path, merge the base in
   locally, run the full suite on the actual merged tree, and let CI see that
   commit before merging.
5. **A guard that cannot fail is not a guard.** Every source-scanning and
   drift-pinning test added this session was deliberately broken once, watched to
   fail, and restored.
6. **When a fix would loosen a security check, stop.** The one unmirrored product
   could have been made to pass by widening the accepted-image formats. That is
   the shared upload path; the symptom is not worth the boundary.

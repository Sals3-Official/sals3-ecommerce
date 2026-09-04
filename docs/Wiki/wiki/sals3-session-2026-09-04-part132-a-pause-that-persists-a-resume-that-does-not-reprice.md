---
tags: [sals3, session, sals3-portal, product-catalogue, publication-state, storefront]
aliases:
  - Part 132
  - A Pause That Persists
  - The Button That Said Paused And Meant Nothing
created: 2026-09-04
updated: 2026-09-04
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-session-2026-09-04-part130-a-categorys-own-photo-and-a-browser-that-stopped-spending-points-to-run-a-test]]"
  - "[[hot]]"
---

# Part 132 — a pause that persists, a resume that does not reprice, and tabs with addresses

> [!NOTE] Provenance
> Written 2026-09-04 from `anythingsupplies/sals3-portal` PR #53's own merged
> record, plus the live SIT verification performed in the same session (the
> round trip in §5 was executed against `sals3-portal-sit.vercel.app` and
> `sit.sals3.com` and its results observed directly, not inferred).

| PR | Title | Merged |
|---|---|---|
| [#53](https://github.com/anythingsupplies/sals3-portal/pull/53) | fix(catalogue): a pause that persists, a resume that does not reprice, tabs with addresses | 2026-09-04T16:24:27Z |
| [#54](https://github.com/anythingsupplies/sals3-portal/pull/54) | fix(catalogue): a resume now shows you where the listing went | 2026-09-04 |

No DDL. No CJ call. No dependency change.

The owner opened the session with two complaints about `/listings`: a paused
item was still visible on the storefront, and the Paused tab offered `Publish`
where it should offer `Resume`. Reading the code answered a third question they
had not asked, and it turned out to be the one that mattered.

## 1. The bulk Pause button had never paused anything

`ProductCatalogueWorkspace`'s `handleBulkPause` moved the selected rows to
`AUTO_PAUSED` **in React state** and wrote nothing. Its toast said so —
*"Preview-only: nothing is persisted or synced"* — but the row menu's
`Pause listing`, three pixels of UI away, called `unpublishProductAction` and
genuinely took the listing off the storefront.

So one screen had two controls named Pause that did different things, and the
bigger, more obvious one was the one that lied. A seller who ticked rows and
pressed it believed they had pulled items from sale that were still orderable.
That is the whole reason the component was rewritten, and it is the answer to
the owner's first complaint: the item was not still visible *despite* being
paused, it was visible **because it had never been paused**.

> [!TIP] How to tell the two apart in a screenshot
> The in-memory pause wrote `Manually paused by seller` — a string that existed
> in exactly one client component and nowhere else in the repository. A
> genuinely paused row reads `Listing is paused.`, from
> `modules/catalog/products/read-model.ts`. Grepping the reason text is the
> fastest way to know whether a state someone is showing you was ever
> persisted.

Bulk pause now calls the same server action the row menu does, sequentially,
under one confirmation that names what leaves the storefront, with a per-row
results panel. Archive is still preview-only and still says so — an honest
unbuilt control is a different thing from one that pretends.

## 2. Resume is not "publish it again"

`publishProduct` has no `publication_state` predicate, so it runs happily on a
paused row and was, before this, the only way back — offered on a paused row as
`Publish to storefront`. But it re-runs `resolveProductPricing`. A listing
paused for a week came back at whatever the margin rules produce today, under a
button that said nothing about price. `Review & resume` in the row menu was a
toast stub that had never been built.

Owner decision, this session: a resume restores the paused price. New
`resumeProduct` in `modules/catalog/products/publish.ts` is the exact inverse of
`unpublishProduct` and nothing more — `PAUSED` → `PUBLISHED` on the product and
on precisely the offers the pause moved, with no pricing run, no revision, no
slug and no media projection. An offer that was already `UNPUBLISHED` before the
pause stays that way.

Publish remains available on a paused row, relabelled
`Publish again (re-prices)`, because it is the way out of all three refusals
below.

## 3. Every refusal lands before the first write

Not a style choice. A refusal after a partial write would need `tx.rollback()`,
which throws, and a caught Postgres error inside an open transaction poisons the
rest of the block with `25P02` — the trap that made an earlier slug retry loop
dead code in `publishProduct`'s own history. So all four checks read first and
the two updates run last.

| Refusal | What it means |
|---|---|
| `version_conflict` | the row moved, is not paused, or belongs to another tenant — one answer for three causes, so the reply never confirms another tenant's product id |
| `NO_PUBLISHED_REVISION` | the paused row lost the revision or slug that `products_published_requires_revision` / `_slug` demand of a `PUBLISHED` row |
| `NO_RESUMABLE_OFFER` | nothing priced left to sell, so the storefront's `publishedScope()` inner join would drop it anyway and the resume would report a success a buyer could not see |
| `SLUG_TAKEN` | another product took the web address while this one sat paused |

`SLUG_TAKEN` is not theoretical. `products_public_slug_key` is unique **only**
`where publication_state = 'PUBLISHED'`, and a pause deliberately keeps the slug
on the row without holding the index — so the address really is reservable by
anything published in the meantime. The unique violation is caught outside the
transaction, where a thrown constraint error is safe to inspect, and its
SQLSTATE is read off `error.cause` because Drizzle wraps the driver error and
leaves `error.code` undefined.

## 4. No tab had its own address

`activeTab` was `useState('LIVE')` and the page read no `searchParams`, so every
reload — and every Back — dropped the seller on Live. Someone working through
the paused listings lost their place on each refresh, and no tab could be linked
or bookmarked.

Tabs now read and write `?status=` in words (`all`, `draft`, `live`,
`needs-attention`, `paused`, `archived`), parsed by
`lib/seller-center/product-catalogue/tab-params.ts`, which falls back to Live for
anything unrecognised rather than rendering an empty table that reads as lost
data. `AUTO_PAUSED` stays the stored code and never appears in a URL.

Written with `window.history.pushState`, not `router.push`. This screen loads the
seller's whole catalogue once and filters it in the browser, so a tab is a slice
of an array already in memory; a navigation would re-run the catalogue query to
render rows the page already has. The tab lives in state **and** in the URL —
state answers the click, and a render-time compare adopts the address whenever it
changes, which is what makes Back step between tabs. Deriving it from
`useSearchParams` alone would have made the control's own feedback depend on the
router propagating a `pushState` back into the render.

A bare `/listings` still opens on Live, spelling no parameter for it — the
2026-08-22 owner decision, unchanged.

## 5. Verified against a real database, then against SIT

The unit tests use a fake `db`, which would accept malformed SQL. So the domain
function was additionally driven against a real local Postgres with a seeded
product, and then the whole thing was exercised on SIT through the browser.

Local Postgres, seeded product at 4999 minor units:

| Case | Result |
|---|---|
| pause → resume | `ok`, 1 offer; **price still 4999**, slug and revision untouched |
| resume an already-live row | `version_conflict` |
| another product holding the slug | `SLUG_TAKEN` — a real partial-index violation, not a 500; product left `PAUSED` at v2 with no partial write |
| paused row with no priced offer | `NO_RESUMABLE_OFFER`, product unchanged |
| another tenant's product id | `version_conflict` |

Audit trail: `catalog_product.unpublished` then `catalog_product.resumed`.

SIT, on the owner's own listing — *Vintage Jewelry Stainless Steel Animal Bat
Cast Ring*, the very row from their screenshot, which was sitting on **Live**,
confirming §1:

1. Bulk Pause → *"1 listing paused — Off the storefront"*, Live 135 → 134,
   Paused 1, reason line `Listing is paused.`
2. Resume → *"Back on the storefront, at the price it was paused at"*,
   Live 134 → 135
3. Selling price after the round trip: **$7.20**, unchanged. The listing was
   left exactly as it was found.

## 6. What this did not fix — and one thing it exposed

Storefront visibility on the Portal side needed no change and was confirmed:
`publishedScope()` in `modules/catalog/storefront/read-model.ts` requires
`publication_state = 'PUBLISHED'` **and** inner-joins a `PUBLISHED` offer, so a
paused product is absent from the feed, search, category listings and its own
slug, and `modules/checkout/freight-quotes.ts` re-checks both columns before
quoting freight.

> [!NOTE] Withdrawn: the SIT storefront does hide a paused product
> During this session's first verification pass, the ring appeared to stay buyable on
> `sit.sals3.com` for several minutes after being paused, and that was written up here as an
> open defect. **The owner's own testing showed the storefront does drop a paused listing**,
> and the entry is withdrawn.
>
> What was really being seen is a bounded propagation delay: the Portal's storefront read is
> `unstable_cache(..., revalidate: 30)`, the storefront's own product read is
> `next: { revalidate: 60 }` with **no cache tag**, and the Portal never calls the storefront
> back on a publication change. So a pause reaches a buyer in up to ~90 seconds, and nothing in
> either repository makes it instant — `services/storefront/client.ts` says as much in its own
> words: *a tag nothing ever invalidates is a promise the code does not keep*.
>
> The lesson that survives: a Portal state change is not a buyer-visible change, and the two
> surfaces are separate deployments with separate caches.

Also still preview-only on this screen: bulk Archive, the single-row Archive
dialog, and the per-variant pause toggle. Each says so in its own copy.

## 7. The follow-up: a resume left the seller with nothing to look at (#54)

Reported within the hour. Resuming from the Paused tab empties that tab — correct, the
listing is not paused any more — and in doing so removes the only thing on screen showing
what just happened. The owner was reloading the browser *"para makita itong naka live"*.

Not a refresh defect: all four paths (bulk pause, bulk resume, row-menu pause, row-menu
resume) were re-run on SIT and every one updated the table with no reload, against a
~400ms `/listings` render. **§4's own tab addresses made it worse** — a reload used to
land on Live, where the item would be visible, and now it faithfully keeps the seller on
the empty Paused tab, so the habit that used to work stopped working.

The results panel now carries the destination: a real `View live page` anchor per resumed
or published row, and a `Show on Live` / `Show on Paused` header button that moves the
table to wherever the run sent its rows. `resumeProduct` returns the slug to make this
possible — a paused row's `storefrontUrl` is `null` in the read model, so the resume is
the only thing that knows the address it restored. Tabs are deliberately **not** switched
automatically: resuming 3 of 20 paused listings should not throw away the seller's place
in the other 17.

## Lessons

- **A preview-only control beside a real one is more dangerous than an unbuilt
  one**, and the danger scales with prominence. The fake Pause was the large
  button; the real Pause was a menu item. Whenever a screen mixes simulated and
  persisted actions, the simulated one being easier to reach is the defect.
- **The reason string is the provenance.** `Manually paused by seller` versus
  `Listing is paused.` decided, from a screenshot alone, whether a state had ever
  reached the database. Copy that only one code path can produce is a debugging
  asset worth keeping distinct.
- **An inverse operation is not the forward operation run again.** Publish and
  resume reach the same end state and differ entirely in what they recompute.
  Reusing the forward path because it "works" silently imported a repricing
  nobody asked for.
- **A partial unique index makes a kept identifier reservable.** Pausing keeps
  the slug so the URL survives, but the index only binds `PUBLISHED` rows — so
  the thing being preserved can be taken by someone else while preserved.
- **A fake `db` in a unit test proves the branching, never the SQL.** Every
  refusal in `resumeProduct` passed against a mock; running it against real
  Postgres was what proved the query shapes, the CHECK constraints and the
  unique-violation mapping.
- **A Portal state change is not a buyer-visible change.** The buyer-facing surface is a
  separate deployment with its own untagged 60s cache, and nothing pushes an invalidation
  across. A pause is real immediately and visible to buyers up to ~90 seconds later; say
  the second part out loud rather than reporting the first as though it were both.
- **Report a suspected defect with the observation, not the conclusion.** The apparent
  "paused item still buyable" here was a propagation delay read as unbounded, and it was
  written into this vault as an open defect before the owner's own testing withdrew it.
  The measurements were sound; the inference past them was not.
- **Finishing a job can break the habit that used to compensate for it.** Giving the tabs
  addresses was right, and it removed the accidental "reload lands you on Live" that the
  seller had been relying on to see a resumed listing. A fix that changes where a reload
  puts someone owes them the thing they were reloading to find.

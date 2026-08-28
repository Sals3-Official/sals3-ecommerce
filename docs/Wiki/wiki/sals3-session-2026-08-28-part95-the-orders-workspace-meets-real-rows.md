---
tags:
  - sals3
  - sals3-portal
  - orders
  - fulfillment
  - authorization
  - testing
  - session-note
aliases:
  - Part 95
  - The Orders Workspace Meets Real Rows
  - Eleven PRs On One Screen
created: 2026-08-29
updated: 2026-08-29
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[sals3-session-2026-08-28-part89-the-order-cj-kept-and-the-order-that-lost-its-owner]]"
  - "[[sals3-session-2026-08-28-part91-a-third-market-its-towns-and-the-first-free-shipping-line]]"
---

# Part 95 — the Orders workspace meets real rows

2026-08-28. The `/orders` screen had been reading a **1,562-line fixture** while
the tables it was waiting for had already landed. Every paid checkout writes
`sals3_orders`, `sals3_order_lines`, `fulfillment_groups` and `checkout_intents`
through `POST /api/storefront/checkout/orders/accept` — the parcels a seller
needed were in the database, and the screen was the only thing not looking at
them. Eleven `sals3-portal` pull requests in one day swapped it over and then
repaired everything real data exposed.

| PR | |
|---|---|
| [#220](https://github.com/Sals3-Official/sals3-portal/pull/220) | serve the Orders workspace from real accepted orders |
| [#225](https://github.com/Sals3-Official/sals3-portal/pull/225) | the parcel detail counted another seller's lines |
| [#227](https://github.com/Sals3-Official/sals3-portal/pull/227) | show the item photo, and close the boundary at every door |
| [#228](https://github.com/Sals3-Official/sals3-portal/pull/228) | remove the controls that cannot work, and say what is capped |
| [#230](https://github.com/Sals3-Official/sals3-portal/pull/230) | a parcel older than the list ceiling answered 404 |
| [#231](https://github.com/Sals3-Official/sals3-portal/pull/231) | run the orders e2e against a real seeded parcel |
| [#234](https://github.com/Sals3-Official/sals3-portal/pull/234) | link an ordered item to its product page |
| [#236](https://github.com/Sals3-Official/sals3-portal/pull/236) | the storefront origin has a default, so the link just works |
| [#239](https://github.com/Sals3-Official/sals3-portal/pull/239) | link the item on the list too, not only on the detail |
| [#241](https://github.com/Sals3-Official/sals3-portal/pull/241) | itemise what the buyer paid, and write like a business |
| [#243](https://github.com/Sals3-Official/sals3-portal/pull/243) | one vocabulary for the buyer payment note |

> [!NOTE] Provenance
> Written after the fact from each pull request's own record. The reproduction
> tables (two sellers / one order; 201 seeded orders) are those records' own
> measurements against throwaway Postgres databases shaped by the real
> migrations.

## 1. The swap

It follows the shape `catalog/products/read-model.ts` already uses for Product
Catalogue: the module owns the SQL, and the page calls it inside
`readOrUnavailable` **with the permission check in the same wrapper** — because
resolving the seller account is itself a query, and authorizing outside it would
crash the page before reaching the part that was carefully protected.
`repository.ts` kept its whole surface, which is what its own doc comment
predicted: **the swap touched no call site.**

**The tenant boundary** is `supplier_connections.seller_account_id`, reached
through the group and — for a parcel the worker has not created yet — through the
line's own connection. Both are **join predicates, never a pass over rows the
caller should not have received**. A test asserts the seller id reaches all three
entry queries as a bound parameter, by walking the SQL object (Drizzle's chunks
are circular, so `JSON.stringify` throws on them).

**An order whose fulfilment group does not exist yet still renders.** That window
is exactly when a seller most wants to see a sale, and a paid order that is
invisible is worse than an untidy card.

**Money says only what is backed.** There is no commission ledger, so commission,
settlement and supplier spend read **"Not configured"** rather than a figure
derived from the buyer payment, and a test guards against a future edit quietly
deriving one. `proceedsMinor` is documented as **buyer payment, not seller
proceeds** — the two are not the same number — and the bulk bar no longer labels
it "est. proceeds" over a hardcoded `Example`. The reprint-history fixture is
gone: fabricated entries were tolerable beside rows labelled illustrative, and
are not beside real orders.

**A migration gap, made legible.** Reading real rows exposed what the fixture had
been hiding: the order tables arrive through a break-glass run, not a deploy, and
**this repository's local database has 58 tables and not one of the four order
tables** — so `/orders` threw. That is `readOrUnavailable` behaving correctly: it
rethrows `undefined_table` so genuine schema drift stays loud, and softening it
would hide drift portal-wide. `orderTablesExist` is modelled on
`readExistingReviewTables`, and **the copy matters more than the guard** — "not
migrated here" and "you have made no sales" render identically on a screen that
only knows emptiness, and only one should send someone hunting for lost orders.

**What it cost:** the orders e2e coverage was genuinely reduced. Every test in
that spec drove the deleted fixture by name, so lane, chip, blocked-action and
money-rail coverage went with it. Parcel-dependent tests **skip with a named
reason** rather than passing vacuously — the part-72 trap — and the file says so
in its own header. #231 closed it.

## 2. Two boundary defects the fixture could never have shown

**A post-fetch filter where the header promised a join predicate.**
`findOrderParcelDetailForSeller` re-queried `sals3_order_lines` by `order_id` with
**no seller predicate**, then narrowed with a JavaScript `.filter()` — the precise
thing that module's own header says it never does. For a **grouped** parcel the
filter matched on the group id and was accidentally safe. For an **`unassigned:`**
parcel it matched `fulfillment_group_id IS NULL`, which on a split order is
*every* seller's ungrouped line.

| Code | "Ordered lines" on seller A's unassigned parcel |
|---|---|
| merged (`develop` at the time) | **2** — counts seller B's line |
| after #225 | **1** |

Impact today was small and was stated plainly: one seller account exists in
production, the line *contents* never rendered (the card draws from
`parcel.lines`, already scoped), and what was wrong was a count and a query
reading rows it had no business reading. **The fix is deleting the query, not
adding a `WHERE`** — `parcel.lines` is already this parcel's lines, so the
boundary cannot be re-derived incorrectly because there is nothing left to
re-derive.

**A real parcel reported as not existing.** `findOrderParcelDetailForSeller`
reached its parcel by calling `listOrderParcelsForSeller` and searching the
result — and that list is capped at `MAX_ORDERS` (200). A parcel belonging to the
201st-most-recent order was not *slow* to open; it **404ed**.
`revealParcelContactForSeller` had the same shape and the same ceiling. Reported
as a performance question; measuring it found the correctness bug underneath.

| Code | 201 seeded orders, open the oldest parcel |
|---|---|
| `develop` at the time | `AssertionError: expected null not to be null` — the 404 |
| after #230 | opens, correct order reference and lines |

`assembleParcelsForOrders` is split out of the list and takes explicit order ids;
the seller predicate stays in every `WHERE` inside it, so a caller that chooses
ids another way cannot widen the boundary by accident. `resolveOwnedOrderId` is
one indexed lookup instead of a scan — a group id through
`fulfillment_groups → supplier_connections.seller_account_id`, an `unassigned:`
bundle through the seller holding an ungrouped line on that order. **Both answer
`null` for "no such parcel" and for "not yours", which stay indistinguishable,
because holding a parcel id is not authorisation.** Both check the uuid shape
before querying, since a synthetic `unassigned:<id>` is caller-supplied text
heading for a `uuid` column and a malformed one would raise `22P02` rather than
matching nothing.

The guard asserts `selectDistinct` — the capped scan — **never runs in the detail
path**, which pins the property directly; a statement count would pass again the
moment someone re-added the scan beside a cheaper query.

Also found in the same reads: `tone: group?.trackingNumber ? 'neutral' : 'neutral'`
— a branch whose arms were identical — and `MAX_PARCELS`, which limited the
distinct-**order** query and therefore never capped parcels at all. Renamed
`MAX_ORDERS`.

## 3. *"Bakit di lumalabas ang picture?"*

`sals3_order_lines.image_url` is frozen at acceptance, carried by the read model,
and present on `ParcelLine`. **Both order cards drew a grey `aria-hidden` square
and dropped it.** Nothing in the data was wrong — the field arrived and the
component never used it, and the fixture had no real photos either, so it looked
correct right up until the rows became real.

One `ParcelLineThumbnail` now serves both cards, because two copies of that
placeholder is exactly how this happened. A line with no photo says **"No photo"**
instead of a blank square: a seller packing an order needs to know which of the
two it is. The address stays the **frozen** one (ADR-007) — re-resolving from the
live listing would show a seller today's picture against an old order.

**An administrator could crash the Orders page.** `resolvePortalSession` gives a
signed-in user with no seller account the literal `sellerId: 'system'`, and it
only redirects to `/auth/pending` for `SELLER_ROLES` — which **does not include
`admin`**, while `admin` holds every permission including `order:read`. Because
`seller_account_id` is a `uuid` column, `'system'` does not return no rows:
Postgres raises `22P02 invalid_text_representation` and the page 500s. Guarded
before the query, in one place, **fail-closed** — an unrecognisable tenant gets
nothing, the only safe direction for a predicate whose job is separating one
seller's orders from another's.

The third finding answers *"ensure na walang data leak in case mag-open ng bagong
seller."*

| Entry point | Before | After |
|---|---|---|
| `listOrderParcelsForSeller` | scoped + tested | + fail-closed test |
| `findOrderParcelDetailForSeller` | scoped (had #225's defect) | + fail-closed test |
| `revealParcelContactForSeller` | scoped, **no test at all** | 4 tests |

The reveal is the highest-consequence read in the module — it returns a real
buyer's name, phone number and street address in plaintext — and it had no test
until now. **These become load-bearing the day a second seller account exists.
With one account, nothing here can be caught by looking at production**, which is
the reason to write them now rather than later. Every new guard was run against
the unfixed code first.

## 4. Five controls that could not work

The Detail view toggle came out as asked; auditing the rest of the screen against
real rows found four more in the same condition.

- **Search by Buyer could never match a name.** The list holds
  `M****a · Quezon City`, so the field searched the **mask**. The obvious repair —
  search the unmasked snapshot in SQL — is the wrong one: **`viewer` holds
  `order:read` but not `order:fulfill`**, so a name search becomes an oracle, and
  the mask that keeps buyer identity from that role is defeated without ever
  rendering a name. The field is removed, and a stale `?field=buyer` falls back to
  the order reference, asserted so the fallback is a decision rather than an
  accident.
- **Sort by "Ship-by, soonest" reordered nothing.** No dropship parcel carries a
  despatch promise — the supplier sets its own pace and Sals3 has made the buyer
  no cutoff commitment — so `shipBy` is null on every parcel and the comparator
  returned `0` for every pair. `sortParcels` still accepts the argument and still
  ignores it, because bookmarks exist.
- **Every row rendered a permanently dead checkbox.** Selection batches label
  printing, and a dropship parcel has no label for this seller to print. It is
  **absent rather than disabled** — an inert control still reads as *"this should
  work and does not"*. Its `aria-label` had also been announcing 36 characters of
  hexadecimal.
- **The sort control offered one option.** Removing `ship-by-asc` left a `<select>`
  with a single entry, which is not a choice. It **states** the ordering instead.

**And one silence:** the read is capped at **200 order references** and nothing
said so. A cap nobody is told about is a list that quietly stops being complete —
and search runs over what was loaded, so it would quietly stop being complete too.
Now disclosed when it is reached.

Checked and found sound: the Handoff panel, the adjustments empty state, the
tracking feed's empty state, the attention banner, lane membership and counts,
chip scoping, and the unit labels. **The 14-of-31 "Needs attention" count is real
data** — failed or unfunded supplier orders — not a mapping defect.

## 5. The e2e suite gets a real parcel, and a correction

#231 closed the gap #220 admitted. The spec needed no restructuring — it was
written to branch on which of four states the environment reaches, so handing it a
seeded parcel simply un-skipped the tests that were waiting for one.

| Environment | Result |
|---|---|
| `Orders E2E` (new, with database + seed) | **8 passed, 0 skipped** |
| `Verify` (unchanged, no database) | 4 passed, 4 skipped |

**A correction that matters more than the original reading.** The first
measurement said a database broke `catalog-shortlist`, `product-catalogue` and
`product-editor`. **That measurement was wrong.** The database under test was
empty, so no seller account existed, `resolveBypassSellerId` could not resolve
one, and every page fell back to the `'system'` sentinel. *The database was not
the problem — the missing account was.* With the seed in place the whole suite
passes with a database, twice, and **more** of it runs than without: 69 passed /
6 skipped, against 56 / 19.

Folding it into `verify` therefore looks feasible — and it was **still kept
separate, deliberately**. `verify` is shared by every feature in this repository,
and two clean runs on one machine is not the evidence needed to make every future
PR depend on a database service.

The seed is **idempotent** (`on conflict do nothing` throughout, verified by
running it twice) and **refuses any non-local `DATABASE_URL`**, verified against a
Neon-shaped URL — this script writes rows into an orders table, and pointing it at
production by a stray env var would put fabricated orders in front of a real
seller.

> [!WARNING] Not evidence about production's schema
> The migrations run against a container that lives for the length of the job.
> Production DDL still arrives only through the `CRON_SECRET` break-glass
> workflow, and a green run here says nothing about whether a column exists
> there — which is why `orderTablesExist` and `order-line-columns.test.ts` stay
> exactly as they are.

What real data immediately caught: `getByRole('link', { name: /^All/ })` also
matches the sidebar's **All Supplier Products**, which strict mode rejects. That
looseness survived only because the test had never run against a parcel.

## 6. The item became a link, in three steps

**#234** made a line in **Parcel contents** open `/p/<slug>` on the storefront in a
new tab with `rel="noopener"` — `target="_blank"` without it hands the opened page
a live `window.opener` handle back into an authenticated portal session. The slug
resolves through `listPublishedSlugsForProducts`, a new export on the module that
**owns** the publication gate: `publishedScope()` is six conditions across two
tables, and a second copy of it in the orders module is how a link ends up offered
for a product the storefront will 404. It resolves the **current** slug rather than
the one frozen on the order, and that is not a contradiction with ADR-007 — the
snapshot is the record of what the buyer bought, and this is a way to go and look
at the listing as it stands.

Two more things from the same screen: the page `<h1>` had been rendering
`parcel.id`, 36 characters of hexadecimal as the name of the page (it shows the
**order reference** now, the one identifier the seller and their buyer both
recognise), and *"What you can do next"* had been offering **Check details** — a
button to the page you were already reading — whose handler toasted
`"details" … is not wired to a backend yet`, untrue of the one action that *is*
wired.

**#236** gave `SALS3_STOREFRONT_BASE_URL` a default in `lib/storefront/origin.ts`.
The link had shipped needing a Vercel variable, and **the fallback for an absent
link is an absent link** — the worst shape a missing step can take, because
nothing announces that configuration is outstanding. The break-glass workflow was
considered and rejected: there is no key-value settings table in this schema
(checked — none of the 58 tables), so using it would have meant **new DDL against
production**, the deliberately expensive path the standing rule guards after the
2026-08-18 outage, to store one string that changes about as often as the
company's name. Owner decision after the trade was laid out.

The host was checked rather than assumed:

| | `sals3.com` | `sals3-ecommerce.vercel.app` |
|---|---|---|
| Serves | WordPress / WooCommerce | Next.js (`_next/static`) |
| `/cart` | 301 | 200 |
| `<title>` | SALS3 \| Affordable Lifestyle Shopping | Sals3 — Shop smarter, pay less. |

`sals3.com` is the site this project replaces. Pointing a seller's *"view the
listing"* link at the apex domain would have sent them to the old shop. **When the
storefront takes over `sals3.com`, the override is how it moves** — which is the
whole reason the environment variable survives.

**#239** is the author's own defect, and the stated reason for it was *wrong*
rather than merely debatable. #234 had justified detail-only placement with *"the
list card's whole row is already a link to the parcel"* — but `OrderParcelCard` is
an `<article>` whose only link is the order reference in the header. **There was
never a row-wide target to compete with**, so the list quietly kept plain text
while the detail linked. Nothing failed, because **no test asserted the list card
at all**. `ParcelLineTitle` now holds the rule for both surfaces, taking only the
typography that differs.

## 7. What the buyer paid, and how the screen says it

The buyer payment card carried a single line reading **"This parcel"** against the
*whole order's* total — a breakdown of nothing, beside a figure belonging to a
different unit. On a split order the two disagreed outright.

| | |
|---|---|
| Goods | the items on this parcel, at the price charged |
| Shipping | the delivery charge quoted to the buyer |
| Vouchers | None |

The headline is **this parcel's own total**, so the lines add up to the number
above them; a split order states the full order total in the footnote instead.
Shipping was already recorded per parcel and shown on the settlement card — it
simply never appeared where the buyer's payment is explained, and **zero is a real
answer there now that free-shipping thresholds exist** (part 91). **Vouchers reads
"None"** rather than a currency figure, kept visible on the owner's instruction so
the shape a seller reconciles against does not change the day vouchers arrive —
and flagged in code that it must stop being a constant when they do.

The item title was clickable and rendered as plain dark text. Colour also moved
out of the caller's class string: passing `text-ink` alongside `text-primary` puts
two `color` utilities of **equal specificity** on one element, and Tailwind
resolves that by stylesheet order rather than class order — so the link colour
would have applied or not depending on what Tailwind happened to emit last.

**The wording was engineering notes, not a seller's screen.** Removed from
seller-facing copy: *"the fulfilment worker retries automatically"*, *"the orders
backend, which is not built yet"*, *"a commission ledger and a payout run"*, *"as
charged by Stripe"*, and a paragraph explaining why counts are not scores. Every
seller-facing string now states what has happened and what, if anything, the
seller must do — **without naming internal machinery, the payment provider, or
this project's own build state.** The honesty is unchanged: "Not configured" still
means not configured.

#243 caught the one string the pass missed, on the exact card the owner circled:
every other money string had settled on **"payout"** while this one still read
*"It is not money paid to you"*. It also names which parcel the figure belongs to,
and on a split order names the parcel count rather than assuming two.

Two test assertions had been pinned to the old sentences and were retargeted at
the meaning rather than the wording. A third had to be made **more** specific —
*"not set up for this account"* is deliberately shared copy appearing three times
on the list, so strict mode rejected the loose locator. **Real data caught that,
not review.**

## Lessons

- **A fixture hides every defect that only real rows can express.** The photo that
  was never rendered, the count that crossed a tenant boundary, the parcel past the
  list ceiling, the loose e2e locator and the copy pinned to removed sentences were
  all invisible until the screen read the database.
- **A tenant boundary belongs in the `WHERE`, and the best fix is often deleting
  the second query.** A boundary a call site can forget is not a boundary — and
  one that cannot be re-derived cannot be re-derived wrongly.
- **A count that only one account can prove still has to be tested now.** With one
  seller in production, nothing in #225 or #227 could have been caught by looking
  at the live site.
- **"Not found" and "not yours" must stay indistinguishable**, and an
  unrecognisable tenant must get nothing rather than an error page.
- **The fallback for an absent link is an absent link.** A missing configuration
  that degrades to silence will not be noticed; give it a default and keep the
  override.

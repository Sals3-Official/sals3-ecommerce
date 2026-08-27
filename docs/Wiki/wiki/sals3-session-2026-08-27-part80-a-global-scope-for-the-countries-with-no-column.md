---
tags:
  - sals3
  - sals3-portal
  - pricing
  - market-rules
  - adr-015
  - adr-003
  - cross-border
  - session-note
aliases:
  - Part 80
  - A Global Scope
  - Global Pricing Scope
created: 2026-08-27
updated: 2026-08-27
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[cross-border-rest-of-world-selling-reference]]"
  - "[[sals3-session-2026-08-27-part77-a-margin-per-destination-and-two-hours-of-refused-saves]]"
  - "[[sals3-session-2026-08-27-part78-the-floor-that-became-a-percentage]]"
---

# Part 80 — a Global scope for the countries with no column

`sals3-portal` [#203](https://github.com/Sals3-Official/sals3-portal/pull/203),
merged `3a013cd`. **No DDL.** Market Rules gains a seventh scope, `Global`, as a
column on Category margins and a row on Store default pricing.

## 1. The decision, in two halves

Owner decision 2026-08-27:

1. **Global prices every country Sals3 has not named** — strictly the ones with
   no column of their own. A named destination never silently takes the
   everywhere-else rate.
2. **A buyer whose country *is* supported is routed to that country's own
   scope**, so a supported country can never land on Global by either route.

The owner's framing was a storefront one — *"ang global ang mag seserve na
website sa mga countries na hindi pa namin supported"* — and the second half was
given as the routing rule: *"pag sa global pumunta ang isang customer pero
supported ang country nya ay automatic itong mag reredirect sa dapat nya na
country."* The two halves are consistent, and together they are the resolution
rule this PR implements.

The alternative — Global as a fallback for **any** unset destination, including
a blank Australia column — was put to the owner and refused. It would let one
number price Australia again, which is the exact thing per-destination margins
exist to stop (part 77).

## 2. What Amazon actually does, because it is not what we built

The owner asked for a solid reference before the design. The full brief with
sources is [[cross-border-rest-of-world-selling-reference]]; three findings
changed the design and belong here.

**Amazon has no rest-of-world price rule at all.** Build International Listings
is one connection and one price rule per *named* target marketplace. A country
with no Amazon marketplace has no connection and therefore no rule — such a
buyer is served by AmazonGlobal export off the amazon.com listing, seeing the
source marketplace's price plus an export shipping rate plus an import-fee line.

**So the export margin lives in the duties line, not the item price.** Amazon
UK's "Import Charges" is *"a fixed amount… to cover all customs-related
processes and costs"*, and they keep the spread in both directions. eBay
line-items the same thing as *"charges relating to the management of variances
between the quoted import charges and actual costs"*.

**A single Global margin is therefore our simplification, not their pattern.**
That is a legitimate choice for one seller's own configuration screen, but it
means the number has to cover the worst plausible destination in the set rather
than the average — and Global is by construction the widest freight spread we
have.

Two facts make that pad bigger than it would have been a year ago, and both are
recent enough to be easy to miss: the **US $800 de minimis is suspended
indefinitely**, codified by CBP on 2026-06-24 and grounded in CBP's own
statutory discretion, so the February 2026 Supreme Court IEEPA ruling did *not*
restore it; and the **EU's €150 relief ended 2026-07-01**, replaced by a €3
per-item flat fee until 2028. For a catalogue whose supplier costs are a few
dollars, duty now applies from the first dollar in both.

## 3. Global needed no DDL, and that was the trap

`market_code IS NULL` already existed and already did most of this. The CHECK
admits null, the two partial unique indexes already keep one such row per scope,
both resolving reads already widened to it, and
`listCategoryMarginOverviewByMarket` already surfaced such rows under a key
rather than dropping them.

**What had to change is what null *means*.**

It meant *"all destinations, competing on depth"*. Under `outranks()` a deeper
unscoped rule beat a shallower scoped one — deliberately, and pinned by a test
— so a Global rule on `Apparel > Clothing > Shirts` would have won an
**Australian** order that had an Australian rule on `Apparel`. Silently, with
nothing on the screen showing it.

`scopeCondition()` now gives one destination exactly one scope's rows:

- a country with a column → only rows scoped to that country;
- every other country → only Global rows.

The two sets are disjoint, so `outranks()` drops the market tie-break it no
longer has anything to break, and depth is the only rule left. Part 77's
reasoning is unchanged and is why this did **not** become "market beats depth".

**Behaviour-preserving on the data that existed.** The 2026-08-25 fan-out left
zero unscoped rows, so the old widening had nothing to find — and §6 confirms
that against production rather than assuming it.

## 4. Two hazards that would have been silent

**`fanOutUnscopedMargins` is deleted** — module, route, workflow and tests. It
selects every ACTIVE row with a null scope, copies it into all six destinations
and retires the original as `SUPERSEDED`. From the moment Global exists, running
it would **shred every Global rule a seller had written, and report a clean
idempotent no-op while doing it**. It was a one-time migration, it ran, and its
result is recorded in part 77 §6 (213 rules → 1,278 copies, run
`32874897335`); leaving a live `CRON_SECRET` endpoint that destroys a live
feature was not defensible.

**The CSV import never asked the allow list.** `GB` passes `^[A-Z]{2}$` and the
database CHECK, so a hand-edited file could store an ACTIVE policy scoped to a
country with no column to show it and no buyer able to reach it — the exact
failure `isPricingScopeDestination` exists to prevent, on the one write path
that never called it. Now refused by line number. Pre-existing, found while
mapping Global's write paths.

## 5. The type change was the point

`PricingScopeDestination` became `PricingScope { key, label, marketCode,
isGlobal }` through the whole Market Rules UI: `scope.key` for identity and
lookup, `scope.marketCode` for reads and writes. For the six they are the same
string; for Global the key is `GLOBAL` and the market code is `null`.

That was deliberate rather than incidental. Part 77 §7 records what happens
otherwise: #190 added a required field to a shared schema, missed the dialog
that posts it, and left **every category-margin save in production returning
`invalid_input` for two hours**, because the action takes `input: unknown` and
the compiler had nothing to check. A type change is the guard that incident
showed was missing — it makes the compiler visit every call site.

Global is **not special-cased in the tree**. It arrives as another key, so the
Global column looks itself up exactly the way Australia does. `ROW_GRID` stopped
hard-coding `repeat(6,…)`; the track list is derived from the scope count now,
because a hard-coded count is a layout that collapses the first time the list
changes — which is precisely what it did.

One more thing was asserted rather than assumed: `marketCode: null` reaching the
save schema works because `.nullable()` short-circuits before
`.refine(isPricingScopeDestination)`. That is a fact about Zod's evaluation
order that the Global write path depends on, and reasoning of exactly that shape
is what produced the two hours of refused saves. It is now a named test.

## 6. Verified on production, after the merge

`npm run verify` exit 0 (captured as a real exit code, not read off a pipe):
2,731 unit (4 skipped), 70 e2e passed. Then the deployed page, read through the
DOM rather than a screenshot:

```
CATEGORY | AU | PH | NZ | US | CA | FJ | GLOBAL | HISTORY
grid-template-columns: minmax(9rem, 1fr) repeat(7, minmax(3.5rem, 4.5rem)) 2.75rem
```

and, for the first category row:

```
Animals & Pet Supplies — Australia: Set on this category. Edit.
Animals & Pet Supplies — Global:    Nothing yet. Edit.
```

**That pair is the whole decision, observable.** Every category carries 25% in
all six columns from the owner's bulk import and `—` in Global: the six are not
leaking into Global, and Global is not leaking into the six. It also settles
empirically what §3 could only assume — **no `NULL`-scoped row exists in
production**, so the semantic change repointed nothing that was live.

The Global editor opens correctly: *"Set store default — Global"*, *"Covers
every category with no margin of its own and no priced parent"*, with every
field scoped (`Base margin percent for Global`, `Reason for change to Global`)
and part 78's percentage/amount exclusivity intact.

**Nothing was written.** The editor was opened and cancelled, deliberately: #202
replaced `StoreDefaultCard` with a table and dropped its deactivate control, so
a store default created today has no UI to remove it (part 78 §7).

## 7. A pane limitation, told apart from a defect

The first click on Global's `Set` opened nothing — which matches part 74's
finding that the in-app Browser pane cannot drive these triggers. **That was not
assumed.** Clicking **Australia's** button, which this PR did not touch, failed
identically, which is what makes it the pane rather than the code; then
`btn.click()` in page context fired the React handler and the dialog opened
fully.

Worth carrying forward: two different `ref_N` clicks both reported the same
coordinate `(1511,500)`, so a ref-based click in that pane can silently land on
a different row's button. Check `getBoundingClientRect()` before trusting one.

## 8. What Global is not

**Global grants no availability.** Checkout is `z.enum(['AU','PH'])` in
`freight-quotes.ts:41` and `CHECKOUT_ALLOWED_COUNTRIES = ['AU','PH']` in the
storefront, so a buyer in a seventh country is refused long before a margin is
consulted.

**That is also true of NZ, US, CA and FJ**, opened on 2026-08-25 and never
wired to checkout. The policy and the pricing scope carry six; the checkout wire
carries two. The two repositories agree with each other, so nothing is broken —
it is an incomplete rollout, and it is now recorded in [[hot]] as a live
inconsistency rather than left to be rediscovered.

Consistent with ADR-003 §1, which requires copy to say *"ships to supported
countries"* rather than *"ships worldwide"* until each country is operationally
verified, and §2, that testing one representative country proves nothing about a
zone. Global is the widest possible zone, so both sentences apply to it more
than to anything else built so far.

**Still open, and neither is started:**

- **The routing half of the decision.** Supported country → its own context.
  ADR-003 §1 already settles the shape: *"Geo-IP is only a default suggestion.
  The user's selected shipping country is the browsing source of truth"* — so it
  must be an overridable suggestion, which is also what Amazon does, rather than
  a forced redirect.
- **The duty model**, which is what actually lets Global take an order. Three
  documented shapes to choose from, in
  [[cross-border-rest-of-world-selling-reference]]. Before that: a
  restricted-category deny-list (the binding constraint for a cheap dropship
  catalogue — eBay's published export exclusions are dominated by standalone
  lithium batteries, >100 Wh battery devices, aerosols, fragrances, drones and
  blades), a sanctions country deny-list, and terms naming the buyer as importer
  of record.

## 9. What to carry forward

**A nullable column's meaning is a decision, not a default.** Global needed no
migration because the column already allowed null — and that is exactly why it
was dangerous. The schema was unchanged while the *semantics* inverted, so no
migration, no review of a DDL diff, and no type error would have flagged it. The
only thing standing between "no DDL needed" and a Global rule quietly pricing
Australia was reading what the existing predicate actually meant.

**A one-time migration left running is a live hazard.** `fanOutUnscopedMargins`
was correct, ran once, and reported success. The moment null stopped meaning
"legacy", the same correct code became a data-shredder that would have looked
like a no-op. When a migration's premise expires, delete it — an endpoint does
not know its own assumptions have moved.

**Tell "the tool cannot click it" from "the code is broken" by clicking
something you did not change.** One failing click proves nothing. The control
that failed identically, and that this work never touched, is what turns a
suspicion into a finding.

---
tags:
  - sals3
  - sals3-portal
  - checkout
  - freight
  - catalog
  - pricing
  - regression
  - session-note
aliases:
  - Part 86
  - The Flag That Stopped Every Cart
created: 2026-08-28
updated: 2026-08-28
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-27-part77-a-margin-per-destination-and-two-hours-of-refused-saves]]"
---

# Part 86 — the flag that stopped every cart, and the price that saved a zero

Two `sals3-portal` fixes merged 2026-08-27, both about a stored value being
trusted after it stopped being true.

- [#206](https://github.com/Sals3-Official/sals3-portal/pull/206) —
  freight quotes read CJ's live stock instead of a frozen offer flag.
- [#207](https://github.com/Sals3-Official/sals3-portal/pull/207) —
  a draft save stops recording a zero-dollar price nobody typed.

> [!NOTE] Provenance of this note
> Written after the fact from each pull request's own record, with the load-bearing
> claims re-checked against merged code — `freight-quotes.ts:387` really does read
> `ne(availabilityState, 'UNAVAILABLE')`. The production evidence quoted below is
> the PR author's, captured at the time and not reproducible now.

## 1. No cart could be quoted, for any destination

The report was a Philippines cart answering *"A cart item is not available for
delivery to this address."* The address was never the reason: neither quote path
filters on `market_code`, and the same cart failed identically for Australia.

`loadQuoteLines` required `product_offers.availability_state = 'AVAILABLE'`. That
column is written **once**, at publish, from
`provider_variant_references.last_observed_inventory`, and only while that
observation is under 72 hours old (`publish.ts`'s `availabilityFromEvidence`).
Nothing refreshes the observation afterwards.

So the 2026-08-27 catalogue-wide republish for the per-destination margin work
(part 77) wrote `UNKNOWN` onto every published offer at once. The predicate then
matched no row anywhere.

**The storefront was publishing the outage in plain sight.** All 20 published
PDPs read *"Supplier stock: Not confirmed recently."* — `ProductEvidenceLedger`
renders that enum directly, so the public page was a readout of the exact
predicate that was refusing the cart. Every PDP also read *"Fixed when published,
27 August 2026"*: one mass republish. Meanwhile CJ held **214,362 units** of the
reported product.

### Why relaxing the gate was the honest direction

The predicate became `availability_state <> 'UNAVAILABLE'`.

Requiring the frozen claim gated nothing worth keeping. The same request
re-confirms stock against CJ's live inventory **before** any freight call, and
`chooseOrigin` refuses a line with no stocked warehouse — which is the check
[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]] §1 actually asks
for, and a stronger one than a flag that may be three days stale. A
supplier-confirmed `UNAVAILABLE` offer is still refused before any CJ call.

### Two consequences of opening that path

**Three buyer-facing refusals named the supplier** and had been unreachable while
the availability gate refused first — *"no current stocked CJ origin"*,
*"missing CJ logistics properties"*, *"CJ returned no delivery methods"*. They say
the same thing now without naming who Sals3 buys from. Server logs unchanged.

**Orders on the reported product ship from factory stock** (`cjInventory: 0`,
`factoryInventory: 46k`). ADR-013 permits it — factory-backed stock is not
automatically blocked — but it has never been reachable in production, so the
lead times are unobserved. Open.

### The test that should have existed

`freight-quotes.availability-scope.test.ts` renders the real `WHERE` clause. The
behavioural tests stub the executor and hand back rows, so **the predicate
deciding whether any row comes back was never exercised** — which is precisely
how a catalogue-wide outage shipped green. The guard fails against
`= 'AVAILABLE'` and passes against `<> 'UNAVAILABLE'`.

> [!IMPORTANT] The reusable lesson
> A test that stubs the executor tests the mapping, never the predicate. When the
> bug is in a `WHERE` clause, only a rendered-SQL assertion can see it — the same
> technique parts 71 and 87 both had to reach for.

## 2. A draft save was recording prices the seller never typed

Draft save sent every variant's retail price, including the empty ones, which
persisted as zero-dollar seller decisions. Three changes:

- only positive seller-entered prices are sent, leaving an unpriced variant
  **unresolved** rather than priced at nothing;
- persistence reports submitted variants that updated no offer row, instead of
  silently matching zero rows;
- a submitted positive price that cannot persist now refuses the whole save with
  `price_persistence_failed`, rather than returning `ok: true` over an empty
  write.

That last one is the shape this vault keeps meeting: a success return with no
write behind it. Part 87's silent partial upload and part 86 §1's green test over
an untested predicate are the same failure wearing different clothes.

The accepted trade-off — **a price cannot be cleared back to unset from the
draft editor** — is documented in the README rather than left for the next
person to discover.

## 3. What was verified, and what was not

`npm run verify` green on both branches before merge; 2,758 unit tests and 79 E2E
on #207.

Neither fix was proven against real data from the workspace. The local database
is empty by design, so #206's end-to-end proof is the live CJ inventory reading
plus the existing CN→PH quote test, and #207's turnover audit query returned no
row for the named revision because the configured database was `localhost:5432`.
Stated rather than glossed, per [[agent-operating-contract]] §1's no-false-certainty
rule.

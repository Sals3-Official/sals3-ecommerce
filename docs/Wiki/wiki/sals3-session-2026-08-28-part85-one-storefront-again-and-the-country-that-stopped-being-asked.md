---
tags:
  - sals3
  - sals3-ecommerce
  - routing
  - markets
  - destination
  - owner-decision
  - session-note
aliases:
  - Part 85
  - One Storefront Again
  - The Country That Stopped Being Asked
created: 2026-08-28
updated: 2026-08-28
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[sals3-session-2026-08-28-part82-a-shopfront-per-country-and-a-price-in-local-money]]"
  - "[[sals3-session-2026-08-27-part81-the-site-learns-where-it-is-shipping]]"
  - "[[sals3-session-2026-08-28-part84-the-redirect-that-claimed-the-picture-folder]]"
---

# Part 85 — one storefront again, and the country that stopped being asked

Two merged PRs, both live on production, **no DDL, no migration, no dependency
change, no CJ call**:

- [#177](https://github.com/Sals3-Official/sals3-ecommerce/pull/177) — the
  shopfront per country is removed (merged `53472a1`, 81 files, +1,016/−2,020)
- [#178](https://github.com/Sals3-Official/sals3-ecommerce/pull/178) — the
  `Ship to` picker is removed (merged `d19ec4e`, 14 files, +95/−680)

Together they revert [#170](https://github.com/Sals3-Official/sals3-ecommerce/pull/170),
[#172](https://github.com/Sals3-Official/sals3-ecommerce/pull/172) and part of
[#173](https://github.com/Sals3-Official/sals3-ecommerce/pull/173) — a day and
a half old — by owner decision. ADR-003 carries the amendment.

## 1. The report, and what it actually was

The owner, from `/checkout`, with a screenshot:

> *"pag naka PH tapos pinindot ang logo ay bumabalik sa AU"*

The header read `Ship to: Philippines`. Its own logo, two rows up, linked to
`/au`. One click moved a buyer out of their country's shopfront in the middle of
checkout.

**Nothing was wrong in isolation.** `/checkout` belongs to a person rather than
a country and deliberately carries no market segment, so `SiteHeader` fell back
to `DEFAULT_MARKET` — a fallback its own doc comment described as "a compromise
rather than a design", naming the fix and not taking it. Every component was
behaving as written.

The defect was structural: **one fact — the buyer's country — was stated in two
places that could disagree.** The URL said one thing, the cookie said another,
and every surface that had only one of them was going to pick a side.

A fix for that shape was built first: resolve the market from the cookie on the
account routes, keep the picker fed by the URL, and never let the link fallback
reach the picker. It typechecked, it had regression tests that failed against
the old code, and it was the wrong answer — because it kept both places and
taught them to agree, which lasts exactly until the next surface forgets. It was
thrown away on the owner's instruction, unmerged.

## 2. What the owner decided

> *"oo dapat kung ano ang current selected country ay kahit anong pindotin ay di
> mag spill over sa ibang country. okay? paki pulido"*

Then, offered the choice between patching the spill and removing the split:
**remove the split.** And, asked whether the `Ship to` picker should stay now
that it would be the only place a country was chosen: **remove it as well.**
Then, unprompted, to be sure it was understood:

> *"oo revert tlga sa original. aalisin ang split from AU/PH"*

Three statements, one decision. It was checked against the alternative twice
before being carried out, and the cost of it is written down in ADR-003's
2026-08-28 amendment rather than left to be rediscovered.

## 3. What went

**#177 — the markets.** Every route under `src/app/[market]/` moved back to the
root. Deleted: `markets.ts` (`MARKET_SEGMENTS`, `marketHref`, `isMarketSegment`,
`DEFAULT_MARKET` and the rest), `MarketLink`, `useMarket`, the `[market]` layout
with its reciprocal `hreflang` set and its 404 gate, and the `/` dispatcher — `/`
is the storefront again rather than a redirect. The `market` prop came out of 43
components. `resolveDestination` lost the `marketDestinationCode` parameter it
had carried for one day.

**#178 — the choice.** `DestinationPicker`, the `HeaderDestination` wrapper that
fed it, and `setDestinationAction` — the picker was the action's only caller, and
an orphaned server action is live surface nobody is looking at. `ResolvedDestination`
went with them: its `source` field (`chosen | suggested | default`) existed so no
interface could present a guess as a decision, and there is no longer an
interface that presents a destination at all.

**Kept, re-keyed rather than removed:** the approximate local price. It followed
the market in the URL, which showed AUD to a reader in Manila because `/au` said
so; it now follows the destination the buyer is shopping to, which is the only
honest answer to "local to whom" once no URL names a country. AUD, PHP and FJD
only — the three currencies `rates.ts` can source from a named central bank —
and **no figure at all** for New Zealand, the United States, Canada or Global,
rather than one converted through a rate nobody named.

## 4. The cost, which is real

**A buyer can no longer tell the site where they are shipping until the checkout
address form.** That is the exact silence part 81 and ADR-003's 2026-08-27
amendment were built to end, quoted in that amendment's own opening paragraph.

Nothing writes the destination cookie any more. The read is kept — the cookie is
in real browsers with a year to run, and a buyer who chose the Philippines
yesterday keeps it rather than silently losing it — but in practice **geo-IP is
the only live signal**, and `x-vercel-ip-country` is absent locally and on any
non-Vercel host. Every visitor without it is Global: the cart's cannot-ship
notice, and no approximate price.

The cheapest way back, if the owner wants one, is the **checkout address form
writing the cookie it already reads**. One call, no change to the read path.

## 5. Two things found by looking rather than by testing

**`/au` did not redirect, and only an e2e test knew.** The reverse redirects are
`source: '/au/:path([^/.]+)*'` → `destination: '/:path*'`, and `/au` *does* match
that with an empty `path` — at which point `/:path*` compiles to the **empty
string**, not to `/`. An empty `Location` is not a redirect, so `/au` answered
200 and stayed put. The unit test asserting the redirect table saw a match and a
destination and was satisfied; matching a pattern is not the same as producing a
URL. The bare segment now has its own entry, and both assertions are in the
suite.

**The cart said "a *the* United States delivery address".** `proseLabel` carries
its own article — "the United States", "the Philippines" — and the sentence put
`a` in front of it. Pre-existing, reachable before this work by choosing the
United States, and made more visible by the removal, because more buyers now
land on Global or a geo answer. Found in a browser while verifying something
else. The country follows "in" now, which reads correctly for `Fiji` and for
`the United States` both, and there is a regression test — no unit test had ever
read the sentence as a sentence.

## 6. Verification

- `npm run verify` exit 0 on both PRs — #177: **984 unit tests in 97 files**,
  **63 e2e**; #178: **973 in 96**, **63 e2e**. `npm audit --audit-level=high`
  exit 0 on both. CI green (3m52s, 3m34s).
- **Production, after each deploy**: `/au`, `/ph`, `/fj` → `307 /`;
  `/au/cart` → `/cart`; `/ph/categories` → `/categories`;
  `/fj/c/electronics` → `/c/electronics`; `/xx` still **404**; all **21**
  category photographs still **200** (part 84's fix intact).
- **Production home page**: no `Ship to` anywhere, and **no market-prefixed href
  at all** — the check that would fail if the split came back by half.
- **Dev server, before merge**: 0 of 93 links prefixed on `/`, and the same on
  `/categories`, `/c/electronics`, `/search`, `/cart`, `/checkout`. Choosing a
  country in the picker (while it still existed) changed the cookie and the label
  and **not the URL**. With an existing `PH` cookie the cart renders `US$1,998`
  beside `≈ ₱123,176.70`; with no cookie, the cannot-ship notice and no local
  figure.
- **Not verified end to end**: `/checkout` while signed in — the owner's exact
  screen. There is no reachable `sals3-portal` locally to mint a session, which
  `e2e/orders.spec.ts` already records as a limitation of this suite. That screen
  is covered by unit tests and by the no-prefix assertion on every reachable
  page.

## 7. What to carry forward

**Two places stating one fact is the defect, not either place.** `/checkout`'s
missing market and the header's Australian fallback were each defensible, and
documented, and the contradiction lived in the gap. The first fix taught them to
agree; the owner's fix deleted one of them. Prefer the second when the duplicate
is not load-bearing — a rule that can be satisfied by construction beats a rule
two components have to remember.

**A fallback is a claim the moment a person can see it.** `DEFAULT_MARKET` was
an internal default for a link target, and it reached the screen as a country the
buyer had not chosen. If a value can be rendered, the question is not "is it a
sensible default" but "is it true".

**Matching a redirect pattern is not producing a URL.** `/au` matched, produced
an empty destination, and answered 200. A test that asserts a `source` matched
and a `destination` exists proves neither hop. Where a redirect matters, assert
the landing.

**Removing a feature is not the same as reverting a commit.** #172 and #173 were
entangled — the local price was built on the market — so this was a hand-rolled
removal that *kept* the price and re-keyed it, not a `git revert`. The compiler
was the checklist: 64 errors after deleting the vocabulary, worked down to zero.

**When the owner reverses a decision, write down what it cost.** ADR-003 now
carries both the 2026-08-27 amendment and its 2026-08-28 withdrawal, with the
silence it reintroduces stated in full. The next person to read §1 and wonder why
the storefront never asks a buyer anything has the answer in the same file.

---
tags:
  - sals3
  - sals3-ecommerce
  - markets
  - routing
  - fx
  - currency
  - adr-003
  - session-note
aliases:
  - Part 82
  - Market Subdirectories
  - Approximate Local Price
created: 2026-08-28
updated: 2026-08-28
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[cross-border-rest-of-world-selling-reference]]"
  - "[[sals3-session-2026-08-27-part80-a-global-scope-for-the-countries-with-no-column]]"
  - "[[sals3-session-2026-08-27-part81-the-site-learns-where-it-is-shipping]]"
  - "[[sals3-session-2026-08-28-part83-the-matrix-that-could-not-save-and-the-country-cj-never-got]]"
---

# Part 82 — a shopfront per country, and a price in local money

Two merged `sals3-ecommerce` PRs. **No schema, no migration, no API contract
change in either.**

- [#172](https://github.com/Sals3-Official/sals3-ecommerce/pull/172) — markets at
  `/au`, `/ph`, `/fj` (merged `9258bfe`)
- [#173](https://github.com/Sals3-Official/sals3-ecommerce/pull/173) — an
  approximate local price beside the USD one (merged `f54c102`)

## 1. The owner turned Global down, and that was the right call

Part 80 built a Global pricing scope; part 81 built the storefront context for
it. Then the owner read what Global actually costs — an address form rebuild, a
duty model, a category deny-list, a sanctions list, importer-of-record terms —
and said **no**: *"hinde. wag tayo mag global."*

What replaced it is narrower and buildable: **one country per URL**, and the
`.com` as the hub. The plan started as a ccTLD each (`sals3.com.au`,
`sals3.ph`), and the research moved it to subdirectories. Three findings did it:

- **`.ca` cannot be bought.** CIRA has no foreign-presence category — Canadian
  incorporation or a CIPO trademark, nothing else — and its Registrant
  Agreement s.4.1(g) **forbids registering as agent for a third party**, so the
  trustee services sold for ~US$175/yr are a liability rather than a workaround.
  101domain sells them for ~60 ccTLDs and refuses for `.ca`.
- **`.com.fj` is US$235–390 and renews at US$656** — half to three-quarters of
  the entire six-market domain budget, for a market that cannot check out. Bare
  `.fj` does not exist; registration is third-level only, manual, 2–10 days, and
  the registry publishes no policy or pricing at all.
- **Six ccTLDs are six cookie jars.** Cookies are scoped per registrable
  domain, so a buyer signed in on `sals3.com.au` is **anonymous** on `sals3.ph`.
  Better Auth here has a single `BETTER_AUTH_URL` and no OAuth-style
  cross-domain flow. That was the largest hidden cost in the plan and nothing in
  the domain price list shows it.

Full brief in [[cross-border-rest-of-world-selling-reference]]. Shopee is the
closest live analogue and does exactly what was chosen for the `.com`:
`shopee.com` **302s to the local ccTLD** while `shopee.com/index.html` is a real
global hub carrying its own canonical and `hreflang="x-default"`. It does not
sell there.

## 2. Four routing decisions

**An unknown segment is a 404, not a redirect.** `[market]` matches any string,
so the layout is the gate. Redirecting `/xx/p/123` to Australia would make every
typo "work" and hand a crawler an unbounded set of URLs serving one page.

**Old links redirect temporarily, and that is load-bearing.** A 308 would assert
this content now lives at `/au` — but the same product also lives at `/ph`, and
which one a person belongs on depends on who is asking. A permanent redirect is
cached by every browser and proxy, so it would pin a market-less link to
Australia forever and take the choice away from the next visitor.

**`/` is a dispatcher on the buyer's stored choice, not on geo.** It reuses
`resolveDestination()` so ADR-003 §1's rule lives in one place. Confirmed on
production: the dispatcher sent a Philippine IP to `/ph`, not `/au`.

**`hreflang` and self-referential canonicals from day one.** `/au` and `/ph`
serve identical products at identical USD prices in identical English — exactly
the duplicate-content case. Without them Google picks one to index and nobody
chooses which. Both are omitted while `NEXT_PUBLIC_SITE_URL` is unset, rather
than guessing a domain.

**Account routes stay at the root.** `/login`, `/signup`, `/checkout/*`,
`/orders/*` belong to a person, not a country.

## 3. The defect that lived in the gap between two correct halves

A first-time visitor on `/au` read **"Ship to: Somewhere else"** — the URL
saying Australia and the header saying it was not, on one screen.

Neither half was wrong. `resolveDestination` had no idea a market existed;
`[market]` had no idea a destination existed. **Each was correct in isolation
and the contradiction lived between them**, which is the shape of defect a unit
test cannot see: there is no single unit to assert against.

Fixed by passing the market as a fallback — ranked *below* the buyer's own
choice, because **being in a market is not consent to ship there**. Geo is
deliberately not consulted once a market is in play: its job is choosing one at
`/`, and a second bite would let an IP override the segment in the address bar.

**And the first fix was incomplete.** The same contradiction reappeared on
`/ph/cart` in #173 — header saying Philippines, banner below saying orders
could not be placed — because the cart page's own `resolveDestination` had not
been given the market either. One call site further on, same bug.

## 4. The cost of the markets, measured rather than assumed

Reading `cookies()` in shared chrome converts every route rendering the header
from static to dynamic. Rather than assume that was fine, both commits were
built and their `next build` route tables diffed: **exactly two routes flipped,
`/cart` and `/categories`.** Everything else was already dynamic because
`StorefrontCachePolicy` is `no-store`.

Accepted, and recorded in `HeaderDestination.tsx`: a static page would serve one
visitor's header to everyone, so every buyer would read "Ship to: Somewhere
else" regardless of what they chose. **The thing to watch is that any new route
rendering `SiteHeader` is dynamic from birth.**

## 5. The local price, and the type that keeps it away from the till

ADR-003 §3 permits an approximate local display and forbids changing the charge
currency. USD remains what is charged, everywhere.

AUD, PHP and FJD, each pinned to **its own central bank** through Frankfurter v2
(MIT, no key, no card, no quota) — RBA, BSP, RBF. Frankfurter because it is the
only free source carrying **FJD**: the ECB reference set does not include it and
most free FX APIs are ECB-backed.

**The value is deliberately not a `Money`.** `Money` models an amount somebody
is charged and its currency is on the cross-repository wire; an approximate
figure that leaked into it could reach a Stripe session or an order line with
nothing downstream knowing it was a guess. The separation was verified rather
than asserted: `toIndicativePrice` is called from **one component**, and
`lib/fx` is imported by five display files and by **nothing** under `services/`,
`lib/checkout/`, `app/checkout/` or `app/api/`.

**Every failure renders nothing** — no dash, no zero, no "unavailable". The USD
price is complete alone. Not on product cards either: one conversion beside the
price actually being considered, because a grid of approximate prices multiplies
the chance of one being read as real.

## 6. My own tests confirmed my own misreading

The parser expected a `rates` **object**. `/v2/rate/{base}/{quote}` returns a
scalar `rate` with a `quote`.

**It would have returned `null` on every real call and the suite would have
stayed green** — because the fixtures were written from the same misreading of
the docs as the code. The mock tested the reading, not the integration.

Caught by calling the live API during a pre-merge check. `rates.contract.test.ts`
now calls the real endpoint so it cannot recur.

That probe also corrected the design's stated reason. `/v2/rate/…` fails
**loudly** — `422` for an unknown currency, `404` for a provider that does not
publish it, both verified live. The silent-200-with-a-missing-key trap belongs
to `/latest?symbols=`. The endpoint chosen was right; the reason written down
for it was wrong.

## 7. What an adversarial review found, all six of them mine

The owner asked for due diligence before merge. A review agent was pointed at
the diff and told to find defects rather than approve. **Six, three blocking.**

**The security guard was made forgeable, and reverting that was the fix.** When
the docblock's prose matched the client-bundle import scanner, the first
response was to teach the scanner to strip comments. That was wrong twice over:
a comment-stripping regex can be fooled by a string containing `/*` (which
swallows every import until the next `*/`) or by a `//` not preceded by a colon,
both demonstrated against the real regex. **The guard was never wrong; the prose
was.** It is reverted to full strictness and the comment now describes the
marker package instead of spelling it, with a note telling the next editor why.

**The contract test could never skip, only fail.** `fetchIndicativeRate`
collapses every failure to `null` by design and never rejects — so the `catch`
was dead code and the `skip()` unreachable. A runner with no egress would have
got `null` and **failed, blocking every commit in the repository for as long as
someone else's service was down.** That is precisely the "teaches the team to
ignore red" outcome the test's own docblock claimed to avoid. Reachability is
now probed with a bare `fetch` that is allowed to throw.

**Failures were not cached at all.** `next: { revalidate }` caches the response
and Next writes that cache **only for a 200**. During any outage every render
issued a live request and waited for it — on pages with no `loading.tsx`, which
makes it time-to-first-byte for every visitor. `unstable_cache` would cover it
but needs Next's incremental-cache context and throws outside it, making the
module untestable; tried and reverted. A five-minute in-process failure memo
instead — weaker (per instance, not shared) and honest, turning "a request per
render" into "a request per instance per five minutes".

**The approximate price dropped the "From" qualifier.** Where the USD price is a
range floor, the local line rendered a bare figure — so the *approximate* number
claimed more precision than the charged one it mirrors, the exact misreading the
display exists to prevent.

Plus two comments contradicting their code (the future-date tolerance is one
day, not zero; the caching docblock still described `unstable_cache` after it
was removed), a `=== null` guard at a boundary an `undefined` can cross, and
provider pinning asserted for one currency out of three.

**The memo has a cost that is paid rather than hidden**: it is module state, so a
404 in one test silenced every later test in the same file. The PDP tests reset
it, and the comment names the coupling.

## 8. Verified on production

`npm run verify` exit 0 at each step — final state **1,000 unit, 57 e2e**.

Then the deployed site, on real products rather than fixtures:

| | Rendered | Check |
|---|---|---|
| `/` from a PH address | → `/ph`, `Ship to: Philippines` | geo suggestion working |
| `/ph/p/…` | `US$3.30` → `From ≈ ₱203.45` | 3.30 × 61.65 (BSP) ✓ |
| `/au/p/…` | `Ship to: Australia`, `From ≈ A$4.59` | 3.30 × 1.3922 (RBA) ✓ |

The `From` is mirrored on both, so the review fix is live.

## 9. Still true, and still not built

- **Checkout accepts AU and PH only.** `/fj` is a real shopfront that says
  plainly it cannot take an order. Widening is two jobs, and the second is the
  larger: the address form is **dropdown-driven from closed region and city
  lists per country**, which does not generalise.
- **`NEXT_PUBLIC_SITE_URL` is unset**, so canonicals and the `hreflang` set are
  omitted and the Organization JSON-LD is nearly empty. This now matters more
  than it did: `/au` and `/ph` are identical until a currency differs, which is
  the duplicate-content case those tags exist for. Needs Vercel access.
- **`sals3.com` still serves SiteGround**, not this storefront — `SG-Captcha`,
  `X-Robots-Tag: noindex`. The domain is the owner's to point.
- The account routes render the header with `DEFAULT_MARKET` because two of them
  are synchronous and cannot resolve one. Behaviour is unchanged (they
  previously linked to a bare `/cart`, which redirects to `/au/cart`), but it is
  Australia decided for a buyer who may have chosen otherwise.
- Klaviyo payload URLs stay market-less and resolve through the redirects.

## 10. What to carry forward

**A mock written from your own reading of the docs tests your reading, not the
integration.** The FX parser and its fixtures were wrong in exactly the same
way, so they agreed with each other and neither agreed with the API. One live
call found in seconds what eleven green unit tests could not. Where a module's
whole job is to parse someone else's response, one test must touch the real
thing.

**A security check that ordinary code can fool is worse than an inconvenient
one.** The instinct when a guard fires on something innocent is to soften the
guard. Here that would have made a string containing `/*` enough to hide a
`server-only` import — from a test whose entire value is catching what is
otherwise silent. Change the thing that tripped it.

**Caching a success is not caching.** `next: { revalidate }` writes only on a
200, so a fetch-level cache is a cache of good days. The failure path is the one
that needs the cache most, because that is when every render pays.

**Two correct halves can contradict each other, and no unit test can see it.**
Twice in one session: the header and the resolver on `/au`, then the header and
the cart on `/ph`. Both were found by loading the page. When a fact is assembled
from two modules that do not import each other, the assembly is the thing to
look at.

---
tags:
  - sals3
  - sals3-ecommerce
  - destination
  - routing
  - adr-003
  - cross-border
  - session-note
aliases:
  - Part 81
  - Destination Routing
  - The Site Learns Where It Is Shipping
created: 2026-08-27
updated: 2026-08-27
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
---

# Part 81 — the site learns where it is shipping

`sals3-ecommerce` [#170](https://github.com/Sals3-Official/sals3-ecommerce/pull/170),
merged `3a8642f`. No schema, no migration, no API contract change.

Owner decision 2026-08-27, the routing half of part 80's decision: **the
storefront's shape is a global one**, so Global is the default destination and a
buyer whose country Sals3 has named is offered that country's context instead.

## 1. The finding that reframed the task

Before designing anything, the storefront was mapped. Two facts decided the
shape of the work.

**There was no notion of a destination country outside the checkout address
form. None.** No middleware, no geo-IP, no locale, no country selector, no
cookie. Every visitor on earth saw one identical site.

**And the price cannot depend on it.** `publishProduct` freezes the resolved
price onto `product_offers` at publish (`publish.ts:663`), and the storefront
read model has **no `market_code` filter** — its own header says so, and the
card price is a cross-market `min(price_amount_minor)`. A buyer in Fiji and a
buyer in Australia are served byte-identical prices.

So **routing changes no price today.** It changes what the site knows about the
buyer, what it tells them, and where checkout starts. Saying that plainly was
more useful than building something that implied otherwise.

## 2. The silence at the end of the funnel

This is what the feature actually exists to fix, and it is worth stating as a
sequence:

> browse → add to cart → **create an account** → *then* meet a two-option
> country dropdown that does not contain your country.

`CHECKOUT_ALLOWED_COUNTRIES` is `['AU','PH']`, consumed as both the `<select>`
options and the Zod enum, and the checkout flow sits behind an auth wall. There
was **no error to hit**, because the form makes the invalid state unreachable —
a buyer outside those two countries met an absence, after spending the most
expensive thing the funnel asks for.

Nothing in `src/` claimed a shipping geography either: `ships to`, `worldwide`,
`duties`, `customs` appear nowhere. So there was no false promise to retract —
and nothing telling the truth.

## 3. What was built

**`lib/destination/destinations.ts`** — the six measured countries plus Global,
mirroring `listPricingScopes()` in `sals3-portal` so the two systems say the
same thing. Two lists are kept deliberately apart and the module says why: where
an order may be **priced** (seven scopes) versus where it may be **placed** (two
countries). The gap between them is the thing being disclosed, not a bug to
paper over.

**Not ~190 countries.** Offering them would state that Sals3 ships to them.
Global is one option, "Somewhere else", exactly as on the pricing side.

**`lib/destination/resolve.ts`** — cookie → geo-IP → Global. ADR-003 §1 settles
the order and is quoted in the file: *"Geo-IP is only a default suggestion. The
user's selected shipping country is the browsing source of truth."*

Two consequences taken seriously rather than as wording:

- **Geo is never written to the cookie on the buyer's behalf**, so a stored
  value always means a person chose it. `ResolvedDestination.source` carries
  `chosen | suggested | default` precisely so the UI cannot present a guess as a
  decision.
- **There is no middleware**, for the same reason. Stamping a cookie on first
  request is the one thing that would make a guess indistinguishable from a
  choice.

**A header picker and a cart notice.** The notice names where orders *can* be
placed, built from `CHECKOUT_ALLOWED_COUNTRIES` rather than restated, so the
sentence cannot drift from the gate that enforces it. Its register follows
`OrdersHonestyNote`: no date, no "coming soon", nothing about cost or duty —
none of which this codebase knows.

**The checkout address form seeds from the destination** when it is one of the
two checkout-ready countries, narrowed by `isCheckoutCountry`, with `PH` still
the fallback. It never seeds a country the form would then refuse.

## 4. The cost, measured rather than assumed

Reading `cookies()` in shared chrome opts every route rendering `SiteHeader`
into dynamic rendering. Rather than assume that was fine, both commits were
built and their `next build` route tables diffed:

```
> ├ ƒ /cart          (was ○)
> ├ ƒ /categories    (was ○)
```

**Exactly two routes lost static generation, and nothing else changed.** Every
other route was already `ƒ`, because `StorefrontCachePolicy` is `no-store` and
any page that fetches the catalogue was dynamic already.

That is the correct trade, not a regression: a statically generated page serves
one visitor's header to everyone, so every buyer would read `Ship to: Somewhere
else` regardless of what they had chosen — worse than a wrong price, because
this is the control that exists to fix a wrong price. Rendering the picker
client-side would keep the two pages static at the cost of a flash of the wrong
destination on every load and a header that says nothing without JavaScript.

**Recorded in `HeaderDestination.tsx`**, with the thing to watch: any *new*
route rendering `SiteHeader` is dynamic from birth.

## 5. The hazard that was not triggered

The portal's `catalog-cache.ts` wraps the published catalogue in
`unstable_cache` keyed by `(section, page, limit)` — **no country** — and its
callback is contractually barred from reading `cookies()`. A country-dependent
price would be silently cross-served for 30 seconds to every nationality.

This change cannot cause that, **because the destination changes no price**
(§1). `resolve.ts` carries the warning in full for the day that stops being
true: the destination would have to be threaded into that cache's key as an
argument, through three layers, and it will not happen by itself.

## 6. Three decisions worth keeping

**The trigger is 24px, the options are 44px.** Every option in the open panel is
`min-h-11 sm:min-h-9` — that is where a mis-tap costs something, since hitting
the wrong row silently changes where a buyer believes their order is going. But
the utility strip is `min-h-6`, and a 44px control inside it grows the strip to
roughly 60px on a phone: a header redesign rather than a picker. It also sits
beside three links the owner deliberately levelled to one type style on
2026-08-20. It clears WCAG **2.5.8**'s 24px AA minimum, which is the criterion
that applies — 2.5.5's 44px is AAA.

**`HeaderDestination` is a separate leaf component.** `resolveDestination()`
reads `cookies()`, so its caller must be async, and React renders async
components only as RSC — making `GuestUtilityBar` or `SiteHeader` async blanked
the header in existing page tests, which assert on the search box and the
`Log In` / `Sign Up` links. Keeping the async boundary at a leaf costs one file
and keeps `SiteHeader`'s 15 callers and prop-free signature untouched.

**`revalidatePath('/', 'layout')`, not `router.refresh()` alone.** Refresh
re-renders only the route the buyer is on; the client router cache still holds
every other visited route with the old destination baked into its header.
Without it, choosing Australia on `/cart` and navigating back to a cached `/`
still reads `Ship to: Somewhere else`. Broad, and cheap to be broad — no page's
*content* depends on the destination.

## 7. Verified in a browser, and two mistakes caught in the process

`npm run verify` exit 0 (a real exit code, not read off a pipe): **923 unit, 57
e2e**. Then driven against a dev server:

- no cookie → `Ship to: Somewhere else`, trigger 24px, utility strip unchanged
  at 40px
- panel: AU and PH plain; NZ, US, CA, FJ and Somewhere-else each carrying a
  visible `Ordering not available yet` at 48px; `aria-current="true"` on the
  current one; the hint reading *"Not set yet. Pick where your order is going."*
- choosing Australia → cookie `sals3_destination=AU`, trigger re-rendered
- `/cart` at AU → no banner; at FJ → *"Checkout does not take a Fiji delivery
  address yet. Orders can be placed to Australia and the Philippines."*; at
  Global → *"Checkout takes a delivery address in Australia and the Philippines.
  No other destination can be entered yet."*

**Two false readings, both mine, both worth recording** because each would have
produced a wrong report:

1. **A "bug" that was a case-sensitive grep.** The cart notice appeared not to
   render for Fiji. The heading is CSS-uppercased, so `innerText` returns
   `WHERE ORDERS CAN BE PLACED` and a search for the sentence-case string missed
   it. The code was right; the check was wrong.
2. **An empty diff from two empty files.** Comparing the build route tables the
   first time produced no differences — because the `grep` pattern for the
   box-drawing characters matched nothing in *either* file. "No differences" and
   "no data" are the same output. The second attempt, with the pattern that
   demonstrably returned 27 lines, is what surfaced the two flipped routes in §4.

One real copy defect was found by looking: the notice read *"Australia and
Philippines"*. Fixed with an optional `proseLabel` on the destination rather
than a hard-coded string, so the picker still shows "Philippines" while prose
says "the Philippines".

## 8. `sals3.com` does not point at this storefront

Checked while scoping the work, because the owner's framing was that the domain
is the global one. It resolves to `35.213.223.56` and answers **HTTP 202** with
`Server: nginx`, `SG-Captcha: challenge`, `X-Robots-Tag: noindex` — SiteGround,
where the legacy WooCommerce side lives. The new storefront is on Vercel at
`sals3-ecommerce.vercel.app`.

`sals3.com` is also referenced **nowhere in either codebase**, and
`NEXT_PUBLIC_SITE_URL` is unset, so `getSiteUrl()` returns `undefined` today and
every canonical URL, the Organization JSON-LD `url`/`logo`, and the `Product`
offer URL are omitted rather than guessed. `robots.txt` advertises a
`/sitemap.xml` that does not exist, because there is no `sitemap.ts`.

The owner holds the domain work. Nothing here depends on it — the routing
belongs in the storefront whatever the domain — but "activate Global on
sals3.com" has a prerequisite that is not code, and a cut-over from the legacy
site is a separate decision.

## 9. Still true, and still not built

**Checkout accepts AU and PH only.** This PR does not widen it, and the notice
exists precisely because that gap is real.

Widening it is **two** pieces of work, not one, and the second is the larger:

- `freight-quotes.ts:41` is `z.enum(['AU','PH'])`, needing a CJ freight quote
  that can actually be answered per destination;
- the address form is **dropdown-driven from closed region and city lists per
  country** (`CHECKOUT_COUNTRY_DETAILS`), plus per-country phone-prefix
  validation. That shape does not generalise to Global at all — free-text region
  and city are a different form.

And before Global can take an order at all: a duty model, a restricted-category
deny-list, a sanctions country deny-list, and terms naming the buyer as importer
of record — all catalogued in
[[cross-border-rest-of-world-selling-reference]].

## 10. What to carry forward

**"No differences" and "no data" are the same output.** A diff of two empty
extractions reports success. Any comparison built on `grep`, `jq` or a parse
should assert that the inputs are non-empty before the comparison is trusted —
especially when the expected answer is "nothing changed", because that is the
answer a broken pipeline gives for free.

**When a check disagrees with the code, suspect the check.** The notice "not
rendering" was a case-sensitive search against CSS-uppercased text. Both false
readings this session came from the measuring instrument, not the thing
measured.

**Adding a request read to shared chrome is a caching decision.** One
`cookies()` call in the header converts every route that renders it from static
to dynamic. It was the right call here, but it is a decision that hides inside a
component nobody thinks of as routing infrastructure — so measure the route
table across the change rather than assuming, and write down what moved.

**A gap you cannot close, you can still stop hiding.** Checkout still takes two
countries. Nothing in this work changed that. What changed is that a buyer finds
out on the cart page instead of after creating an account — which cost one
server component and no backend at all.

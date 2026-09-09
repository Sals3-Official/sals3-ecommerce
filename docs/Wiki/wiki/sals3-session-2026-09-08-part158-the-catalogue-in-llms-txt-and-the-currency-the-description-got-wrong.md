---
tags: [session-record, sals3, ecommerce, fiji, australia, geo, aeo, seo, json-ld, llms-txt]
aliases:
  [
    "Part 158",
    "The catalogue in llms.txt",
    "The currency the description got wrong",
  ]
created: 2026-09-09
updated: 2026-09-09
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-08-part153-the-canonical-layer-switched-on-across-three-storefronts]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
---

# Part 158 — The catalogue in `llms.txt`, and the currency the description got wrong

> [!NOTE] Provenance
> Written after the fact from each PR's own record. Five PRs across the three
> storefronts, merged 2026-09-08. Follows
> [[sals3-session-2026-09-08-part153-the-canonical-layer-switched-on-across-three-storefronts|part 153]],
> which shipped the canonical layer the day before. Promotion PRs not listed.

| PR | Repo | What it did |
| --- | --- | --- |
| [#35](https://github.com/anythingsupplies/sals3-ecommerce/pull/35) | ecommerce | `/llms.txt` lists the catalogue; the JSON-LD graph is connected by `@id` |
| [#35](https://github.com/anythingsupplies/sals3.com.fj/pull/35) | fj | ported |
| [#12](https://github.com/anythingsupplies/sals3.com.au/pull/12) | au | ported |
| [#38](https://github.com/anythingsupplies/sals3.com.fj/pull/38) | fj | the site description stops claiming this storefront prices in USD |
| [#16](https://github.com/anythingsupplies/sals3.com.au/pull/16) | au | its twin |

## 1. Two items the GEO strategy note parked, unparked because the reason expired

`/llms.txt` shipped **identity-only**, and the reason was recorded at the time:
the data behind it was the **DummyJSON placeholder feed**, so listing it as
"Sals3's products" would have been exactly the fabricated machine-readable claim
that note's own revision pass warns against.

The catalogue is now **~2,900 real published products** from the Portal. *The
blocker is gone, so the parking expires* — which is the correct way to close a
parked item: not because someone got round to it, but because the condition that
parked it stopped being true.

### Rebuilt to the format, including the part that was off-spec

[llmstxt.org](https://llmstxt.org/): H1, blockquote summary, prose with **no
headings**, then H2 sections each holding a markdown link list. The previous
`## Mission` followed by a bare line was off-format on that last point — *a
heading section must carry a file list* — so the tagline moved into the prose.

### Curated links, not a data dump

The format's own reasoning is that the file must stay *"small enough to fit in
context. The detail lives behind the links, and is fetched only when needed."* So
it lists the **departments** and points at `sitemap.xml` for the full product set.

The strategy note's sketch of *"SKU, GTIN, price, stock, URL"* per product is
precisely what that sentence rules out — **and it would also mean asserting a
stock state the Portal reports as `UNKNOWN` for most of the catalogue.** Two
independent reasons, one of them a truthfulness reason.

The prose states outright that **no delivery estimate and no freight table
exist.** *This file is read by machines that will repeat it, and a shipping
promise invented on Sals3's behalf is worse than a gap* — the same standard part
151 applied to checkout refusals, applied here to a machine-readable surface.

## 2. The graph was a set of islands

The second half connects the JSON-LD by `@id`, so `Organization`, `WebSite` and
each `Product`/`Offer` reference one another as a single entity graph rather than
three unrelated blobs on the same page. `entity-ids.ts` is the one place those
identifiers are derived, so a rename cannot desynchronise half of them.

**This landed on `sals3-ecommerce` only at first** — the two market forks kept the
identity-only `llms.txt` and the unconnected graph until #35/#12 ported it hours
later. Worth noting as the ordinary rhythm of the three-fork arrangement rather
than as an oversight: the origin repository proves the change, the forks follow.

## 3. All three storefronts told search engines they price in USD

`SITE_DESCRIPTION` was **byte-identical in all three** and said prices were
*"in USD"*. On `sals3.com` that is true. On the two market storefronts it was
not — the owner's 2026-09-04 decision is that those deployments show Fijian and
Australian dollars.

That one string is:

- the `<meta name="description">` on **every page** of the site
- the home page's **OG and Twitter** description
- the **PWA manifest** description
- the **footer brand line**
- the **`llms.txt` blockquote**

So the claim was being made **to Google, to AI crawlers and to shoppers,
everywhere, about a currency the site does not display.** It had shipped to
production that morning, *which is what moved this from untidy to worth fixing
now.*

### Why the new sentence names the *charge* currency, not the displayed one

*"Prices are shown in Fijian dollars"* would be the more useful sentence and it is
**not safe to write.**

`displayPrice` falls back to `formatMoney(price)` — the US dollar figure —
whenever `toIndicativePrice` returns `null`, which happens when the FX rate or its
buffer cannot be read. **That fallback is deliberate and correct**
(`indicative-price.ts`: *absent beats low-by-an-unknown-amount*), but it means the
**displayed** currency is a *runtime outcome*, not a fact about the deployment.

The **charge** currency **is** a fact about the deployment: the buyer is charged
in USD in every state, per ADR-003 §3. So that is what the description says.

> This is the same open question part 153 raised from the other end — a `USD`
> `offers.priceCurrency` in JSON-LD on a ccTLD showing A$ and FJ$. **Part 153 left
> it as an owner decision; these two PRs answered the half that was a plain
> falsehood** and left the half that is a truthful mismatch standing. Both halves
> resolve when ADR-003's step 4 ships and a market genuinely settles in its own
> currency — see [[sals3-session-2026-09-07-part146-a-market-settles-in-its-own-currency-wired-and-left-off|part 146]].

## 4. Verification

`npm run verify` green on each — lint, format, typecheck, build, unit and E2E —
with `entity-ids.test.ts` and the `llms.txt` route tests new. All local; Actions
unfunded across the org since 2026-09-04.

## Lessons

- **A parked item is unparked by its condition expiring, not by remembering it.**
  `llms.txt` was identity-only because the catalogue was placeholder data; real
  products are what closed it.
- **A machine-readable file is repeated verbatim by things that cannot check
  it.** State the absence of a delivery estimate rather than letting a crawler
  infer one.
- **Curate `llms.txt`; do not dump the catalogue into it.** The format's whole
  premise is that it fits in a context window and the detail lives behind links.
- **One shared string can make one claim on five surfaces.** `SITE_DESCRIPTION`
  reached meta, OG, Twitter, the manifest, the footer and `llms.txt` — so a
  single wrong word was wrong everywhere at once.
- **Describe what is a fact about the deployment, not what is a runtime
  outcome.** The displayed currency can fall back; the charged currency cannot.
- **A correct fallback can still make a claim unwriteable.** The FX fallback is
  right, and it is exactly why "shown in Fijian dollars" could not be said.

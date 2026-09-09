---
tags: [session-record, sals3, ecommerce, fiji, australia, seo, sitemap, hreflang, caching]
aliases:
  [
    "Part 153",
    "The canonical layer switched on across three storefronts",
    "Sitemap, hreflang and the reciprocal set",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger]]"
  - "[[sals3-session-2026-09-07-part149-notify-every-market-storefront-and-two-jobs-onto-vercel-cron]]"
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
---

# Part 153 — The canonical layer switched on across three storefronts

> [!IMPORTANT] Three PRs that only work together
> A one-sided `hreflang` set is ignored by search engines, so
> `sals3-ecommerce` #33, `sals3.com.au` #10 and `sals3.com.fj` #33 **all have to
> merge and deploy before any of them counts.** All three merged within one
> minute of each other on 2026-09-08. `alternates.ts` and `storefronts.ts` are
> **byte-identical** across the three repositories, and *a later edit to either
> file in one repository breaks hreflang for every storefront, including the two
> nobody touched.*

> [!NOTE] Provenance
> Written after the fact from each PR's own record and the production probes
> quoted in them. Three repositories, merged 2026-09-08 at 06:09–06:10.
> Promotion PRs (`chore: promote the SEO foundations to pre-prod` in each) not
> listed.

| PR | Repo | Notes |
| --- | --- | --- |
| [#33](https://github.com/anythingsupplies/sals3-ecommerce/pull/33) | ecommerce | The origin of the change; `en` / `x-default` self-reference |
| [#10](https://github.com/anythingsupplies/sals3.com.au/pull/10) | au | Ported; `en-AU` self-reference, sitemap inherits `?market=AU` pricing |
| [#33](https://github.com/anythingsupplies/sals3.com.fj/pull/33) | fj | Ported; `en-FJ` self-reference, sitemap inherits `?market=FJ` pricing |

## 1. The layer was already written, and it was switched off

The SEO work existed and had been carefully reasoned — per-route
`generateMetadata`, `Product`/`Offer`/`BreadcrumbList` JSON-LD, a bot-friendly
`robots.ts`, `/llms.txt`. **Measured against production 2026-09-08, not
recalled:**

- **`sals3.com` emitted no `<link rel="canonical">` on any page.** Every absolute
  address is gated on `NEXT_PUBLIC_SITE_URL`, and that variable is **unset** on
  the apex deployment. `Organization.url`, `WebSite.url`, the `SearchAction`,
  `Offer.url` and the category `BreadcrumbList` were all absent for the same
  reason.
- **No `sitemap.xml` existed in any storefront**, while `robots.ts` advertises one
  whenever a site URL *is* set. So `sals3.com.au/sitemap.xml` and
  `sals3.com.fj/sitemap.xml` **advertised a URL that answered 404** — the two
  market storefronts exposed it precisely because they *have*
  `NEXT_PUBLIC_SITE_URL` while `sals3.com` does not.
- **Three storefronts served one identical catalogue on three domains with no
  `hreflang`**, so each was a duplicate of the other two.

One unset environment variable had been suppressing an entire surface, silently,
on the flagship domain.

## 2. What was built

**`sitemap.ts` + `sitemap-paths.ts`** — static routes, stocked departments and
every published product, enumerated **through each repository's own service
layer**, so each sitemap inherits the `?market=` pricing that site actually
shows. The Portal caps `limit` at 30 (`storefrontFeedQuerySchema`), so ~2,900
products is **~97 reads**, taken six at a time behind a day-long
`unstable_cache` that **refuses to store a degraded answer** rather than pinning
an outage for 24 hours.

**No `lastModified`.** The card feed carries no timestamp, and build time would
claim every product changed on every deploy — a false signal is worse than an
absent one.

**`alternates.ts` + `storefronts.ts`** — the reciprocal `en` / `en-AU` / `en-FJ`
/ `x-default` set, **production origins only**, so no stage advertises production
or is advertised by it.

**`aggregateRating` on `ProductSchema`** — real Sals3 buyer reviews, gated on
`rating.count >= 1`, rounded to the one decimal `ProductReviews` displays.
Google's review-snippet policy was **read against this implementation**: the
rating is visible on the page, `Product` is an eligible type, the self-serving
restriction covers `Organization`/`LocalBusiness`, and these are first-party
reviews. **CJ supplier-platform counts stay ineligible and unreachable from that
file** — the ADR-012 boundary held.

**`CategoryItemListSchema`** — `ItemList` on department listings, positions
continuing across pagination.

**Crawl budget** — `/c/[slug]` returns `noindex, follow` for a filtered or
paginated view, *safe precisely because every product on those pages is now in
the sitemap in its own right.*

Plus `metadataBase`, a default Open Graph image, `og:url` on the PDP, and
canonicals on `/categories` and both legal pages.

## 3. The cache gap this closed, and its link to part 149

**`productListCachePolicy()`** — a 60s Data Cache on the browse reads, tagged
`STOREFRONT_PRODUCT_TAG` so a publish expires the listings *and the sitemap*
through `POST /api/internal/revalidate` immediately.

> The product page was tagged when that endpoint shipped; **every listing linking
> to it was not.**

That is the same untagged-read family as the paused-listing window in
[[sals3-session-2026-09-07-part149-notify-every-market-storefront-and-two-jobs-onto-vercel-cron|part 149]]
— a Portal state change reaching one buyer-facing surface and not its neighbours.

`getSiteUrl()` normalises a blank or trailing-slash value, and **a production
build without the variable now warns instead of silently dropping the surface** —
the direct remedy for how this went unnoticed.

Checkout reads stay `no-store` and re-price every line, so **no cached answer can
price a sale.** `/search` stays `no-store` and `noindex`.

## 4. Still blocking, and not in any of the three PRs

> **`NEXT_PUBLIC_SITE_URL` must be set on the `sals3-ecommerce` Vercel
> Production scope**, typed **Config and never Secret** — *a Secret
> `NEXT_PUBLIC_*` never reaches the build and evaluates to empty* — then
> redeployed.

**Until then `sals3.com` still serves no canonical and no sitemap, and merging
changed nothing there.** The two market storefronts already have the variable, so
their halves are live.

## 5. An open question the owner has to answer

`offers.priceCurrency` is **`USD` on all three storefronts**, because that is the
charge currency — but the ccTLDs display A$ and FJ$. **An Australian seeing a
rich result gets a USD price.**

Asserting an AUD price Sals3 does not charge would be the fabrication this
repository forbids, so it was left as-is. **Worth a decision before chasing ccTLD
rankings** — and it is the same gap ADR-003's Fiji amendment closes from the
other end: once a market genuinely settles in its own currency
([[sals3-session-2026-09-07-part146-a-market-settles-in-its-own-currency-wired-and-left-off|part 146]]),
this question answers itself.

## 6. Verification

`npm run verify` green on #33 — lint, format, typecheck, build, **1,302 unit
tests, 80 e2e** — and `npm audit --audit-level=high` clean. `e2e/seo.spec.ts` is
new (170 lines) in each repository.

**The sitemap, hreflang, `ItemList` and `aggregateRating` were each checked
against a real catalogue on a running server**, not only in tests. A second
commit moved `search.spec.ts`'s upstream timeout onto the assertion that is
actually waiting — it had been on the half that was already true before the click.

## Lessons

- **One unset environment variable can suppress a whole surface with no error.**
  Every absolute URL, every JSON-LD `url`, the sitemap and the canonical were all
  gated on `NEXT_PUBLIC_SITE_URL`. A build-time warning is now the tripwire.
- **`NEXT_PUBLIC_*` typed as Secret evaluates to empty.** It never reaches the
  build. Worth knowing before debugging the code.
- **Advertising a URL that 404s is worse than advertising nothing.** `robots.ts`
  promised a sitemap for a year of deploys on the two domains that had a site URL.
- **A reciprocal declaration is not shippable one repository at a time.** Three
  byte-identical files across three repositories, and any future divergence
  breaks the set for storefronts nobody edited. That coupling belongs in the
  vault, because nothing in the code enforces it.
- **An absent `lastModified` beats a fabricated one.** Build time would have
  claimed the whole catalogue changed on every deploy.
- **Tag the listings, not just the item.** The same untagged-neighbour gap that
  kept a paused product buyable kept stale listings crawlable.
- **Read the policy against the implementation, not from memory.** The
  review-snippet eligibility check named the type, the visibility requirement and
  the self-serving restriction, and confirmed the supplier counts stay out of
  reach.
- **A truthful mismatch is still a mismatch worth escalating.** A USD
  `priceCurrency` on a ccTLD showing A$ is honest and probably costly. Naming it
  as an owner decision is the right move; leaving it unnamed would not be.

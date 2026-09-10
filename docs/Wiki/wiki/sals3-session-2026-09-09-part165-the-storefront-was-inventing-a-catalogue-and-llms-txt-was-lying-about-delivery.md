---
tags:
  [
    session-record,
    sals3,
    storefront,
    seo,
    aeo,
    geo,
    data-integrity,
    fixtures,
    schema-org,
    observability,
  ]
aliases:
  [
    "Part 165",
    "The storefront was inventing a catalogue",
    "llms.txt was lying about delivery",
    "A stale comment is not a source of fact",
  ]
created: 2026-09-10
updated: 2026-09-10
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[pending-register]]"
  - "[[sals3-skills]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-session-2026-09-08-part158-the-catalogue-in-llms-txt-and-the-currency-the-description-got-wrong|part 158]]"
  - "[[sals3-session-2026-09-10-part166-a-critical-rce-and-the-sitemap-that-failed-a-production-build|part 166]]"
---

# Part 165 — The storefront was inventing a catalogue, and `/llms.txt` was lying about delivery

> [!IMPORTANT] Two live falsehoods, found in one afternoon
> **SIT was serving a catalogue that does not exist** — invented product names
> at invented **US$** prices, on an **A$** storefront, rendered exactly like the
> real shop. And **`/llms.txt` told AI crawlers on all three production
> storefronts that Sals3 does not publish a delivery estimate**, which it has
> done since freight quoting shipped.
>
> Neither was a broken build. Both were **confident, plausible, wrong output** —
> the failure mode that no test catches because everything renders.

> [!NOTE] Provenance
> Reconstructed on **2026-09-10** from `sals3-ecommerce` **#40**, **#41**;
> `sals3.com.fj` **#45**, **#46**; `sals3.com.au` **#37**, **#38**, **#47**;
> promoted by ecommerce **#42/#43** and the market forks' equivalents. Seven
> merged pull requests on 2026-09-09 with no vault note.

## 1. The fabricated shop

`sit.sals3.com` and `sit.sals3.com.au` were serving gradient tiles with generic
names — *"Solar wall lamp, motion sensor"*, *"Stainless steel insulated
tumbler"* — at invented **US$** prices, on a storefront that prices in **A$**.

**Neither a shopper nor a crawler could tell the difference.** It had the real
grid, the real typography, the real interaction. Nothing said *placeholder*.

`sit.sals3.com.fj` was fine throughout, which is what made it look like a
configuration quirk on two boxes rather than a product defect in all three.

### It was a product defect

A **failed** portal read returned the `forYouProducts` and `deals` fixtures **as
though they were the shop**. The fallback had been written as a convenience for
local development and had quietly become a production behaviour.

[[nextjs-component-security-code-rules]] forbids exactly this, in two places:

> *"Do not present placeholder/external demo data as Sals3's own catalog"*
>
> *"Never fill a structured-data field (URL, logo, rating, **price**, catalog
> listing, etc.) with a guessed or placeholder value."*

The rule existed. The code predated the enforcement of it, and nothing scanned
for it.

### Two empty states, kept apart

The fix is not "render nothing". It is **two different honest sentences**,
because collapsing them would be a lie in one direction or the other:

| What happened | What the page says |
| --- | --- |
| Portal answered, **zero published products** | *"No products are listed yet. Check back soon."* |
| The read **failed** | *"We could not load products just now. Please try again shortly."* |

The first is a **fact about the catalogue**. The second is an **admission that we
do not know what is in it**. Saying "no products" during an outage tells a
shopper the shop is empty when it is full; saying "try again" when the shop is
genuinely empty sends them back for nothing.

The deals band renders **nothing** rather than invented deals. The fixtures stay
in the repository for tests and local development — they are simply **no longer
a runtime fallback**.

### The e2e spec took a branch it had never taken

`e2e/product.spec.ts` had an empty-catalogue branch that was **effectively dead
code**. No portal answers on `localhost:3001` during an e2e run, so the home page
always filled with placeholders and the test always took the click-a-product
path.

With placeholders gone it took the empty branch **for the first time** and
failed on copy.

> That failure is itself the evidence the change works. A test that starts
> exercising a branch it never reached is a stronger signal than a test that
> stays green.

### The upstream cause, which none of this fixes

Probed 2026-09-10:

| Portal host | Answer |
| --- | --- |
| `sals3-portal-prod.vercel.app` | **401 JSON** — alive, healthy, correctly refusing an unauthenticated read |
| `sals3-portal.vercel.app` | **402 `DEPLOYMENT_DISABLED`** — disabled for non-payment |
| `sals3-portal-sit` / `-uat` | **302** — Vercel Deployment Protection, answering *before* the portal's own code runs |

That 302 is the failure `services/storefront/client.ts` has documented since
2026-09-01: a server-to-server read carries no SSO cookie, so it gets a login
page where it expected JSON. The documented escape hatch is
`SALS3_PORTAL_PROTECTION_BYPASS`, which is a **Vercel dashboard action, not a
code change** — and therefore still owed.

**Until then SIT shows the honest unavailable state instead of a fake shop.**
That is the point of the change, not a substitute for the fix.

## 2. The diagnostic line that should have existed first (au #47)

`error.message` alone logged `Storefront products API request failed.` on both
broken storefronts. True, and useless — it cannot separate:

1. the portal answering **401**,
2. **Vercel Deployment Protection** answering before the portal runs, or
3. **no portal URL for this environment** — the read dials `localhost` and never
   leaves the machine.

It now logs the **HTTP status**, the **safe error body**, and the **portal
origin**. The status separates the first two; *no status at all* is the third;
the origin settles it on sight. Neither field carries a credential — the token is
a header, and `safeErrorMessageFrom` has already stripped the body.

> **Four wrong diagnoses that day were guesses made without this line.**
>
> One log line, no behaviour change, and it is the highest-value diff in this
> whole group. See skill 113.

## 3. `/llms.txt` was asserting something false, and a test was holding it there

From **2026-09-08 to 2026-09-10**, live on all three storefronts, `/llms.txt`
told AI crawlers:

> *"Sals3 does not publish a delivery estimate"*

It does, in two places that render to every buyer:

- `CheckoutShippingTierCard.tsx:86` → `` `Estimated ${formatArrivalWindow(option.arrivalTime)} days` ``
- `CheckoutReceiptDelivery.tsx:85` → `` `Arrives in ${shipment.arrivalTime} days` ``

### Where the false claim came from

`site.ts`'s **own comment**:

> *"no delivery estimate exists, because Sals3 has neither a rate table nor a
> carrier integration (ADR-003)"*

That was **true when written on 2026-08-13**. It stopped being true when freight
quoting shipped. The comment was never updated, and it was then **read as a
source of fact** when the llms.txt document was written.

> [!WARNING] A comment is not a source
> A code comment records what someone believed at a moment. The **rendering
> code** is the source of what the product says today. Deriving a public claim
> from a comment is deriving it from a snapshot of an old opinion. See skill 114.

### Worse: the test asserted the falsehood

```
toMatch(/does not publish a delivery estimate/i)
```

**That is why it survived review.** The suite did not fail to catch the bug — it
*defended* it. Anyone who fixed the sentence would have seen a red test and
assumed they were wrong.

The assertion is replaced with one pinning **what checkout actually shows**, plus
a **negative assertion** so the old sentence cannot return.

### The replacement sentence, every clause traceable to code

> *Delivery is quoted at checkout: each shipping tier shows its cost and an
> estimated transit window in days, and Standard delivery is free above a
> per-destination order value. Both figures come from the carrier through
> CJdropshipping rather than a Sals3 rate card, so they are a carrier quote for
> that basket and address, not a guarantee Sals3 underwrites.*

`site.ts`'s misleading parenthetical is **rewritten in place as a warning rather
than deleted**, so the next reader learns *why* it cannot be trusted. Deleting it
would have removed the evidence of how the mistake happened.

## 4. The AEO work: entity grounding

Answer-engine optimisation is **resolution, not ranking**. An AI Overview, a
voice assistant or a knowledge panel must resolve a business **to an entity**
before it can answer about it.

The `Organization` node carried `name`, `url`, `logo` — which gives a machine
nothing to resolve against. **Two shops called Sals3 would look identical.**

It now carries:

```json
"legalName": "ANYTHING SUPPLIES PTY LTD",
"alternateName": "SALS3.COM",
"identifier": [
  { "@type": "PropertyValue", "propertyID": "ABN", "value": "87 685 740 514" },
  { "@type": "PropertyValue", "propertyID": "ACN", "value": "685 740 514" }
],
"address": { "@type": "PostalAddress", "…": "Gregory Hills, NSW 2557, AU" },
"contactPoint": [ "customer support", "legal" ]
```

**A registered company number is the strongest signal available here, because it
is checkable outside this site.** The ABN resolves on the Australian Business
Register whether or not anyone believes the page.

`PropertyValue` rather than schema.org's `taxID`, which names neither scheme and
would leave a consumer guessing which registry the number belongs to.

### Why adding this is safe when inventing a catalogue is not

**Every value is already rendered in prose on `/legal/terms`**, under *"These
Terms are between you and ANYTHING SUPPLIES PTY LTD, an Australian private
company with the following details"*.

This **structures published facts. It asserts nothing new.** That is the same
distinction that keeps `aggregateRating` gated and `offers.seller` absent.

And it is *enforced*: `src/lib/seo/organization-entity.ts` records each value
**with its source**, and `OrganizationSchema.test.tsx` asserts the legal name,
ABN, ACN and locality **still appear in the terms**. If the terms change, the
schema **fails rather than drifting**.

> That is exactly the check the delivery claim did not have — and the two live in
> the same pull request, which is not a coincidence.

### What is deliberately absent, and why

- **`sameAs`** — the field an answer engine most wants, tying the entity to
  Wikidata, a Knowledge Graph id or social profiles. **Sals3 has none.** No
  social account is linked from the storefront and no Wikidata item exists.
  Inventing plausible handles is the fabrication this surface is governed
  against. **Largest remaining AEO gap, and it is business work, not code.**
- **`telephone`** — none published anywhere on the storefront.
- **`foundingDate`** — the ACN implies a registration date; the date is not
  published, and deriving one would be a guess.
- **`aggregateRating` on the Organization** — Google's review-snippet policy bars
  a business marking up reviews about itself under this type. Product ratings
  stay on `Product`, where they are permitted.
- **`FAQPage`** — still parked. No question-and-answer content exists to mark up,
  and Google restricted FAQ rich results to authoritative government and health
  sites in 2023, so the remaining value is to answer engines rather than the
  SERP. Writing the content is an owner decision.

## 5. Verification, and the advisory found while verifying

`npm run verify` green — lint, format, typecheck, build, **1,347 unit tests**,
**81 e2e** — through the pre-commit and pre-push hooks. The corrected document
and the entity node were each **read off a running server against a live
catalogue**, not asserted from a test alone.

The fabricated-catalogue guard was proved **by putting the fixtures back**: the
new page test fails with the placeholder catalogue on screen. A guard nobody has
watched fail is a guard nobody has tested.

Actions is dead on these repositories (billing, 2026-09-04), so per ADR-019's
2026-09-09 amendment this is a **named agent's local run**.

> [!WARNING] Found while verifying, and escalated above this work
> `npm audit --audit-level=high` began **failing** during this session.
> `next@16.3.0` sits inside a **critical** advisory range. That became
> [[sals3-session-2026-09-10-part166-a-critical-rce-and-the-sitemap-that-failed-a-production-build|part 166]],
> and it was prioritised **above** this pull request.

## Lessons

- **Fabricated data that renders correctly is the worst class of defect**, because
  every automated signal stays green and only a human who knows the catalogue can
  see it. A fixture must never be a runtime fallback.
- **"Empty" and "unavailable" are different sentences.** Collapsing them lies in
  one direction or the other, every time.
- **A comment is a record of a past belief, not a source of fact.** Public claims
  derive from rendering code.
- **A test that asserts a falsehood defends it.** When correcting a claim, look
  first for the test that pinned the old one, and add the negative assertion so
  it cannot come back.
- **Structure published facts; never publish structured guesses.** The rule that
  makes the ABN safe is the same rule that makes the invented catalogue
  forbidden.
- **When a diagnosis is guessed more than twice, the missing thing is a log
  line.** Status, body and origin — not `error.message`.
- **Prove a guard by making it fail.**

Registered as skills 113, 114 and 115 in [[sals3-skills]].

## Pending

- **`SALS3_PORTAL_PROTECTION_BYPASS` is still not set** on the SIT storefront
  projects — a Vercel dashboard action. Until then SIT shows the honest
  unavailable state. Registered in [[pending-register]].
- **`sals3-portal.vercel.app` answers 402 `DEPLOYMENT_DISABLED`.** A portal
  deployment is disabled for non-payment; a billing decision, not a defect.
- **`sameAs` is empty** and is the largest remaining AEO gap. Needs a social
  presence or a Wikidata item to exist first — business work.
- **`FAQPage` stays parked** until question-and-answer content exists.
- **No scan enforces the fixture rule.** Nothing prevents the next convenience
  fallback from becoming a production behaviour the same way.

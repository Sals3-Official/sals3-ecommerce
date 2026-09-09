---
tags: [session-record, sals3, ecommerce, fiji, australia, checkout, fx, storefront]
aliases:
  [
    "Part 147",
    "A market storefront offers its own country",
    "The related rail that mixed currencies",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger]]"
  - "[[sals3-session-2026-09-07-part146-a-market-settles-in-its-own-currency-wired-and-left-off]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
---

# Part 147 — A market storefront offers its own country, and the rail that mixed currencies

> [!NOTE] Provenance
> Written after the fact from each PR's own record and the live figures quoted
> in them. Six PRs across the two market storefronts — three in
> `anythingsupplies/sals3.com.fj` and their identical twins in
> `anythingsupplies/sals3.com.au`, which is the **same codebase deployed
> twice**. Merged 2026-09-07. Promotion PRs not listed.

| PR | Repo | What it did |
| --- | --- | --- |
| [#23](https://github.com/anythingsupplies/sals3.com.fj/pull/23) | fj | The related rail gets the FX context and stops printing US$ under FJ$ |
| [#6](https://github.com/anythingsupplies/sals3.com.au/pull/6) | au | The identical defect, in the store this repository is |
| [#29](https://github.com/anythingsupplies/sals3.com.fj/pull/29) | fj | A market storefront offers its own country and no other |
| [#4](https://github.com/anythingsupplies/sals3.com.au/pull/4) | au | Its twin |
| [#30](https://github.com/anythingsupplies/sals3.com.fj/pull/30) | fj | The fixed country field sits like every other field |
| [#5](https://github.com/anythingsupplies/sals3.com.au/pull/5) | au | Its twin |

## 1. One product page, two currencies

On `sals3.com.fj` a product page priced the product in **FJ$** and every card in
the **Related products** rail beneath it in **US$**. Reproduced on the live site,
the same six products, the same page:

| Product | Fiji home grid | Fiji related rail |
| --- | --- | --- |
| Hooded sports outdoor leisure suit | FJ$64.36 | US$28.53 |
| Slim fit hooded sportswear | FJ$105.38 | US$46.71 |
| Colorblock Casual Sports Cardigan Suit | FJ$58.54 | US$25.95 |
| Smoke digital print sweatshirt | FJ$48.39 | US$21.45 |
| HAWKINS Hoodie plus fleece coat | FJ$30.79 | US$13.65 |
| Fall new solid color loose hooded printed plus fleece sweater | FJ$177.12 | US$78.51 |

A constant **2.256×** between every pair — the published `2.2227` RBF rate plus
the 1.5% funding buffer. So this was the conversion being **skipped**, not a
second price: `2853 × 2.2227 × 1.015 = 6436` → `FJ$64.36`, to the cent.

The same six figures appeared on `sals3.com.au` under **A$** headings, because
the two deployments are one codebase.

### Why nothing caught it

`displayPrice` converts when handed an `IndicativeContext` and falls back to
`formatMoney` — **the charged currency** — when it is not. `RelatedProducts`
rendered `<ProductGrid>` **without the prop**, so the fallback ran.

It was the only one of **four** `ProductGrid` call sites missing it —
`CategoryProductResults`, `ForYouSection` and `SearchResults` all pass it — and
because the prop is optional on `ProductGrid` and `ProductCard`, **nothing
failed**: not typecheck, not 1,341 unit tests, not 63 E2E.

### The fix makes the omission impossible rather than fixing the instance

`indicative` is now **required** on `RelatedProducts`. A caller with no context
must pass `null` and say so. That is what stops it recurring — and it is why the
prop stays optional on the components underneath, which have call sites that
legitimately have none.

The context is loaded in `RelatedProductsSection`, **outside** the
`unstable_cache` and **in parallel** with the products: outside, because where
the currency falls through to the buyer's destination it reads `cookies()`, which
is not callable inside a cached function.

## 2. The Fijian store offered to ship to Australia

The country select on `sals3.com.fj` held **Australia, Philippines and Fiji.**

It is the Fijian store. The market decides the price, that price is already
Fijian, and **shipping the order to Australia would charge Fiji margin for an
Australian delivery.**

> Owner decision 2026-09-07 — *"pag Fiji ay Fiji customers lang"*.

`sals3.com.au` showed the same three. The AU twin (#4) records the reasoning that
made it a twin rather than a copy:

> Owner decision 2026-09-07 was worded about Fiji, and it is a rule about
> **market storefronts**, not about Fiji, so it lands here too.

### This does not contradict the "stays fully editable" rule

`useCheckoutAddress` protects a real decision: seeding the country from
**geo-IP** is a guess, and *a guess may propose a country but must never impose
one.*

**A market is not a guess.** It is configuration set once per deployment — the
same fact `lib/market.ts` refuses to infer from a request — so narrowing to it is
the store stating what it is, not the browser guessing where you are.

### Shape, and three cases

- **One country** → the field reads as **plain text**, not a select. *A select
  holding a single option is a control that looks like a decision and is not.*
- **The shared storefront** names no market and keeps every allowed country —
  that is what makes it the shared one.
- **An unrecognised market** falls back to all of them: a typo in a Vercel
  dashboard must not leave a storefront with no deliverable address at all.

## 3. The follow-up that was a layout bug, and the pattern already in the file

The locked field was visibly out of line — the country sat at the **top** of a
box **taller** than the phone field beside it.

Cause: it was rendered as a `<p>` carrying the input padding. **That is not the
same box.** An input centres its text vertically; a block element does not.

Fixed with a **read-only input** and `READ_ONLY_FIELD_CLASS` — the pattern this
form already had for the locked email directly above it, whose own comment says
the sunken background *"reads as settled rather than broken."* The hidden input
went with it: a named read-only input already carries the value.

**The pattern was one field away the whole time.** Two PRs were spent arriving at
a convention the same component already used.

## 4. Verification

Full `npm run verify` on the pre-commit hook for each — lint, format, typecheck,
build, unit and E2E. E2E stood at **63 passed / 2 skipped** across the country
work and **64 passed / 1 skipped** on the neighbouring docs commits. #29 and #4
added four new cases each, worded as the buyer sees them. GitHub Actions could
not start jobs on either repository (billing), so every figure here is local.

## Lessons

- **An optional prop is a defect that cannot fail a test.** Three of four call
  sites passed the FX context; the fourth compiled, rendered, and lied about
  money. Making it required on the wrapper — not on the leaf — is what closes it.
- **A constant ratio between two numbers on one page is a skipped conversion.**
  Same diagnostic as [[sals3-session-2026-09-07-part145-the-fiji-storefront-stops-showing-australias-price|part 145]],
  found twice in one day at two layers.
- **Configuration is not a guess, and the difference decides whether you may
  impose it.** Geo-IP proposes; a deployment's own market states.
- **A select with one option is not a choice.** Render the fact, keep the
  submitted shape identical, and use the read-only pattern the form already has.
- **One codebase deployed twice needs the fix twice, on purpose.** Every defect
  in this note existed identically in both market storefronts. Fixing one and
  assuming the other is how a market drifts.

---
tags:
  - sals3
  - sals3-ecommerce
  - sals3-portal
  - pdp
  - search
  - session-note
aliases:
  - Part 110
  - The Sals3 SKU Reaches The Buyer
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-30-part104-sourcing-pipeline-columns-filters-search-and-speed]]"
  - "[[sals3-session-2026-08-30-part102-three-flakes-two-thresholds-and-one-real-race]]"
---

# Part 110 — the code Sals3 mints reaches the buyer, disappears, then comes back

2026-08-30, `sals3-portal`
[#265](https://github.com/Sals3-Official/sals3-portal/pull/265) and
`sals3-ecommerce`
[#198](https://github.com/Sals3-Official/sals3-ecommerce/pull/198)/[#205](https://github.com/Sals3-Official/sals3-ecommerce/pull/205),
no DDL.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## Search learns the code first (`sals3-portal` #265)

Storefront search matched `products.title` and nothing else, so the one
identifier Sals3 actually mints — the code the Portal prints on a listing,
an order line, and a support thread — found nothing when pasted into the
search box. It is matched now, and matched **exactly**: a Sals3 SKU is
`S3V-` plus twelve hex characters derived from the provider's identifiers,
so a substring match would be a hash-prefix collision rather than intent
(`S3V-4` is not a search). A term counts as a SKU only when the whole of it
is one, prefix optional, case folded.

It is an `EXISTS` rather than a join predicate — narrowing `listBase`'s
existing variant join to the matched variant would have quietly changed the
card's own figures, since the `From` price would become that variant's
price instead of the product's floor. A buyer arriving by SKU sees the same
card as everyone else looking at the same product. Known gap, stated rather
than hidden: this finds the product, not the variant — a pasted SKU lands
on the product page with its default option selected, not the one the code
names.

## The page prints it, once a variant is chosen (`sals3-ecommerce` #198)

The code reached nobody outside the Portal. It is printed above the
specifications grid, not inside it — that grid's own footnote says the
seller entered these against their category's attribute set, and a Sals3
SKU is entered by nobody: it is derived and immutable after first
publication, so a row under that footnote would be the exact provenance
error the split between `ProductSpecifications` and `ProductSupplierDetails`
was made to prevent.

There is no product-level Sals3 SKU — every variant carries its own, twelve
for the jeans that prompted this — so the code follows the chosen option
rather than being a static string. The selection lives in
`ProductRecordPanel`'s `useState`, and the specifications grid is a server
component in a different branch of the page, wired through a small context
that the panel **publishes** rather than surrenders control to: defaults,
URL resolution, availability and the price the buttons act on are all
untouched, so a bug here can only make the printed code stale, never sell
the wrong variant. `page.test.tsx`'s old assertion — that the digest reached
no readable string anywhere — became a count instead: the code appears
exactly once, on the identity line, never as an option chip's name.

## The regression: gone from nearly every page it should be on (`sals3-ecommerce` #205)

[[sals3-session-2026-08-30-part109-checkout-stops-lying-about-the-price|Part
109's]] purchase-gate change made the code print only once a buyer had
chosen an option — reasoning that a twelve-variant product has twelve SKUs
and no single one speaks for it. **On live that removed the SKU from every
product page reached without a `?variant=` link — nearly all of them.**
Verified against production: `Sals3 SKU` appeared **0** times on a bare
PDP. The reasoning had skipped one fact: a product has a code of its own.
`specs.sku` is the **product's**, not a variant's, and the page was already
publishing it as `Product.sku` in JSON-LD while hiding it from the reader —
the worst of both. Fixed by preferring `specs.sku` over `variants[0]` when
nothing is chosen, and the chosen variant's the moment there is one.

The same PR carried two owner corrections: Supplier details, demoted to a
smaller rounded card on the grey ground directly under a full-bleed white
band, read — in the owner's words — *"sobrang awkward"*; it now shares the
Specifications grid's exact format (20px/600 heading, 3 columns, 138px
label column, 14px rows, 1px row rule, white background), measured
identical in the browser. And the seller's provenance sentence under
Supplier details was removed as asked, which made the supplier's own
sentence the **only** thing left distinguishing whose claim is whose — the
PR calls this out as load-bearing rather than cosmetic: the specifications
grid must never carry "as reported by the supplier", and both components
now assert the *absence* on the half that stayed silent.

## Verification

`sals3-portal` #265: tests render the SQL rather than trusting the call,
including one that strips the `EXISTS` body and asserts nothing narrowed
the outer query. `sals3-ecommerce` #198: end-to-end case renders the panel
and grid together, clicks Blue, asserts the printed code becomes Blue's.
#205: `npm run verify` clean, **1106 unit tests**, **63 e2e**; two
unrelated e2e specs (`search`, `orders`) failed once inside the pre-commit
hook against a cold `.next` and passed on every run since — the exact
condition [[sals3-session-2026-08-30-part102-three-flakes-two-thresholds-and-one-real-race|part
102]] documents, not a regression.

## Lessons

- **A reasoning step that is locally correct can still remove a fact for
  nearly every page that carries it**, when the "narrower" case (a chosen
  variant) is actually the rare one and the fallback (nothing chosen) is
  nearly all of production traffic. Verify against production, not against
  the one deep-linked case used while building.
- **A product-level fact and a variant-level fact can share one label** —
  `specs.sku` and the chosen variant's SKU are two different values for
  "Sals3 SKU", and the honest default with nothing chosen is the one
  belonging to the whole product.
- **Publishing state through a context rather than surrendering it** bounds
  the blast radius of a wiring bug to "the printed code is stale," never to
  "the wrong variant sells."
- **Removing one of two places stating a fact makes the remaining place
  load-bearing** — the supplier provenance sentence had to stay exactly
  where it was and the specifications grid had to stay silent, once the
  seller's own sentence was removed as the second place saying so.

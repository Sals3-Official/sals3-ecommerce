---
tags: [contract, cross-repository, storefront, catalog, sals3]
aliases: [Storefront Product Contract v2]
created: 2026-08-13
updated: 2026-08-13
status: current-state
authority: implementation-state
owner_approved: true
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[sals3-portal-code-review-2026-08-06]]"
---

# Storefront product contract v2

The one contract between `sals3-portal` (producer) and `sals3-ecommerce`
(consumer). Written down here because the shapes are **hand-duplicated across
two repositories** and there is no shared package — no private registry, and a
contract this size does not justify one.

## Where it lives

| Side | Module |
| --- | --- |
| Producer types + mappers | `sals3-portal/src/lib/storefront/catalog-feed.ts` |
| Producer read model | `sals3-portal/src/modules/catalog/storefront/read-model.ts` |
| Consumer Zod schemas | `sals3-ecommerce/src/services/storefront/schemas.ts` |
| Shared fixture | `test/fixtures/storefront-product-detail.json` in **both** repositories |

## Endpoints

```text
GET /api/storefront/products?section=for-you|deals&page=<n>&limit=<n>
GET /api/storefront/products/<slug>
GET /api/storefront/categories
Authorization: Bearer <SALS3_STOREFRONT_API_TOKEN>
```

## The three rules that keep it honest

1. **Additive-only.** The consumer's schema rejects the **entire page** if a
   legacy key is missing or empty, so removing a key breaks the live storefront
   harder than an outage does. Every legacy key stays; every new key is
   optional; the portal ships first.
2. **Per-row salvage.** A malformed variant, image, spec, or description block
   is dropped — it does not fail the product, and a product does not fail the
   page. This generalises the `truncatedText` lesson: one overlong real CJ title
   used to blank a whole 14-item page.
3. **Omit, never default.** An absent field means the fact does not exist. A
   defaulted one makes "nobody wrote a description" indistinguishable from
   "the description is empty", and the consumer cannot tell them apart once a
   value is present.

## Fields

### Required on every product

`id`, `slug`, `title`, `currency`, `priceMinor`, `category`, plus `imageUrl` and
`imageAlt` on the list feed.

`currency` is the **one required new field**. Every other addition degrades to
"section omitted"; a missing currency degrades to a number labelled with the
wrong symbol, which is the only failure mode here that misrepresents money. The
parse fails instead, and the consumer's PDP turns that into a real error page.

### Deprecated, still sent

`oldPriceMinor` (always equal to `priceMinor` — ADR-003 forbids a fabricated
was/now pair), `ratingLine` (`"No reviews yet"` — Sals3 has no buyer reviews,
and CJ's supplier-platform counts are not Sals3 ratings), `shipLine`
(`"Delivery quoted at checkout"` — freight is destination-specific). All three
exist only because the consumer's schema currently requires them; they are
optional consumer-side and leave the contract once nothing reads them.

### Optional, detail endpoint only

`publishedAt`, `categoryPath`, `categoryName`, `availability`
(`AVAILABLE|UNKNOWN|UNAVAILABLE`), `images[]`, `description.blocks[]`,
`variants[]`, `specs`.

`description.blocks` is an **allow-listed union** on both sides —
`paragraph`, `heading` (level 2|3), `bulletList`, `keyValueList`. There is no
`html` block and no raw-string passthrough anywhere, so a renderer has nothing
to interpret as markup even before escaping. CJ's own `description` **is**
unsanitised supplier HTML and never enters this document.

### Deliberately absent

`shipsFrom` — no product, variant, or offer column holds a stock-origin country,
and the only source is seller-scoped screening evidence a public query must not
join to. Adding it is a migration, not a join.

Any stock **quantity** — Sals3 observes a supplier's reported inventory; it does
not hold the stock. `availability` is an evidence statement with no number
behind it, and `UNKNOWN` is the honest common case.

## Drift protection

The shared fixture is one maximal payload. The consumer parses it in
`src/services/storefront/schemas.test.ts`; the producer asserts its serializer
produces it. A contract change that lands on only one side fails a test in
whichever repository moved.

Because everything new is optional, drift shows up as a **silently missing
section** rather than an error — which is quiet by design. The fixture is what
makes it loud.

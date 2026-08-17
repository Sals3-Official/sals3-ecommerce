---
tags: [deferred-work, pdp, structured-data, seo, aeo, geo]
aliases: [PDP Structured Product Data]
created: 2026-08-17
updated: 2026-08-17
status: proposed
authority: reference-note
owner_approved: false
related:
  - "[[00 - Start Here]]"
  - "[[../Wiki/wiki/sals3-geo-aeo-seo-strategy-proposal]]"
---

# PDP Structured Product Data

Status: deferred until PDP/storefront work.

Reminder trigger:
- Open this when working on PDP rendering, storefront product pages, metadata generation, or schema output.

Why this is deferred:
- Structured data should not be manually edited in Product Editing.
- It should be generated automatically from trusted product data.

Future goal:
- Add Product structured data on the PDP for SEO/AEO/GEO readiness.
- Generate from product name, category, brand declaration, description, meta description, images, price, availability, SKU, variants, and Specification attributes.

Guardrails:
- Do not let sellers manually edit schema fields.
- Do not derive fulfillment identity from buyer-facing labels.
- Keep CJ supplier IDs, provider references, offer supplier bindings, and order handoff data untouched.
- Use seller-facing Specification attributes as display/discovery context only.

Potential acceptance checks:
- PDP emits valid product metadata/schema.
- Product name, price, image, availability, brand, category, SKU, and variants are represented.
- Missing optional specs do not break the page.
- No private supplier/internal fields are exposed.

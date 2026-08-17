---
tags: [deferred-work, routing, slugs, redirects, seo]
aliases: [URL Handle And Redirect Plan]
created: 2026-08-17
updated: 2026-08-17
status: proposed
authority: reference-note
owner_approved: false
related:
  - "[[00 - Start Here]]"
---

# URL Handle And Redirect Plan

Status: deferred until storefront routing/linking work.

Reminder trigger:
- Open this before touching product slugs, PDP routes, product canonical URLs, redirects, or published product URL behavior.

Why this is deferred:
- Editable URLs can create broken links, duplicate URLs, and redirect problems.
- Product Editing should not get URL handle controls until routing and redirect behavior are ready.

Future goal:
- Auto-generate clean product handles from product name/category.
- Consider seller editing only before publish.
- If editing after publish is allowed, create redirect behavior from the old URL to the new URL.

Guardrails:
- Do not break existing published product links.
- Do not create two public URLs for the same canonical product.
- Keep URL handle separate from supplier SKU, CJ SKU, and provider IDs.

Potential acceptance checks:
- New product receives a stable generated handle.
- Published product has a canonical URL.
- Changing a published handle creates a redirect or is blocked with clear copy.
- PDP metadata uses canonical URL consistently.

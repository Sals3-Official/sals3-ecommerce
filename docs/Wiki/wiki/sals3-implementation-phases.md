---
tags: [sals3, roadmap, implementation-plan, task-tracker, canonical]
aliases: [Sals3 Implementation Phases, Sals3 Task Phases, Sals3 Build Register]
created: 2026-07-31
updated: 2026-08-06
status: canonical
authority: execution-plan
owner_approved: false
related:
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-management-bible]]"
  - "[[sals3-master-blueprint]]"
  - "[[sals3-feature-landscape-and-expansion-map]]"
---

# Sals3 Implementation Phases

> [!IMPORTANT] Canonical Sals3 task register
> This note is the complete source of truth for Sals3 build order, task status, dependencies, and acceptance gates. The stage structure below is [[sals3-ux-build-specification]]'s own **section 20 build order** (Final status, 1 August 2026) — not a paraphrase. [[sals3-management-bible]] defines the domain rules. Historical notes explain why a decision happened but do not override this register.

> [!WARNING] Team-size reality check
> Confirmed team is AJ + Bogs, 2 full-stack developers. Build spec section 21.2: **9 to 14 months to first launch, only with a reduced first release** (section 21.3's "smallest useful first release" table). Do not plan or promise a faster timeline without changing the team size first — this isn't pessimism, it's the spec's own stated condition for this team size.

## Status key

| Marker | Meaning |
|---|---|
| `[x]` | Implemented and verified by code/tests or recorded live evidence. |
| `[~]` | Partially implemented, or the current implementation is incomplete or placeholder behavior. |
| `[ ]` | Approved and open. |
| `[?]` | Requires an owner/leadership decision or real-data evidence. |
| `[P]` | Parked. Do not build without fresh owner approval. |
| `[C]` | Candidate. Useful idea, but not approved as an active build task. |

## Two parallel tracks

Per [[sals3-master-blueprint]]'s dual-track strategy, still valid — the build spec doesn't cover the interim cash-flow measure (it's out of the spec's stated scope, "does not cover the business plan"):

- **Track A — Shopify pop-up store:** interim cash flow while Track B is built. Not addressed by the build spec at all.
- **Track B — the actual new system:** everything below. This is what [[sals3-ux-build-specification]] section 20 governs.

## Constitutional rules for every phase

1. No sample commission rate or payment-partner integration becomes real code until Leadership confirms it (see [[sals3-management-bible#4. Non-negotiable boundaries]]).
2. An out-of-stock variation must never remain purchasable once the catalogue read path exists (build spec section 6.3).
3. The client never calculates a trusted total — only the server's versioned quote is trusted (build spec section 16.1, 16.4).
4. BIR/EOPT tax invoice logic and RA 11967 compliance must exist before real money moves (build spec sections 9, 14, 17.3, 22) — and a Philippine lawyer must review before launch.
5. Follow the build spec's own dependency table (section 20.2) — do not build a screen before tokens/components exist, the cart before pricing exists, the checkout before idempotency exists, etc.
6. Do not build a parked or candidate item from [[sals3-feature-landscape-and-expansion-map]] without explicit owner approval.

## Track A — Shopify pop-up store (interim, not started)

- [ ] Deploy Shopify theme (Dawn Theme per the blueprint) as the interim storefront.
- [ ] Apply a quality filter to the Shopify catalog.
- [ ] Integrate local payment gateways on Shopify (methods TBD — pending Leadership confirmation).
- [ ] Log all Shopify customer and order records for later migration into the new system.

## Track B — Foundation before Stage 1 (not started)

### Vault and planning

- [x] Second-brain vault created, mirroring the BOGS Dashboard vault structure and governance rules (this vault, 2026-07-31).
- [x] Existing v4.0 master blueprint, UI mockups, and presentation deck consolidated into this vault.
- [x] The build spec itself ingested and made canonical (2026-08-03). Team-profile, git sync, and turnover conventions established.
- [ ] Sals3 Leadership alignment session held; commission rates, payment-partner list, and category structure confirmed or revised.
- [?] Confirm whether `sals3.com` domain, hosting, and DNS access are already provisioned.

### The build spec's own "first 10 working days" (section 20.6) — do these before Stage 1

| Day | Action | Output |
|---|---|---|
| 1 | Get access to the old system, hosting, analytics, payment accounts. Name an owner for each. | `access-matrix.md` |
| 2 | Export the plugin list and custom code from WooCommerce (the old system). | `current-features.md` |
| 3 | Map the integrations: payment, courier, notification, analytics, accounting. | `integration-map.md` |
| 4 | Measure the data volumes. Take a sample of each entity. | `data-catalog.md` |
| 5 | Export the top web addresses, traffic, conversion rate, device mix. | `seo-baseline.csv` |
| 6 | Record the seller, support, and finance procedures with those teams. | `feature-list.csv` |
| 7 | Write the golden scenarios with exact expected totals (spec section 20.5). | `golden-scenarios.md` |
| 8 | Build the repository, the pipeline, and the health endpoint — this is Stage 1. | A deployed skeleton |
| 9 | Build the token layer and 3 base components. | A component page |
| 10 | Present the data model, the risks, and the estimate. | `ADR-001` and a backlog |

As of 2026-08-05, the repository and local verification pipeline exist, and a verified landing-page prototype exists. The old-system discovery work in days 1-7, deployed skeleton, health endpoint, data model, and ADR-001 are still not complete.

## Track B — The 8 stages (build spec section 20.3)

### Stage 1 — Foundation (in progress)

- [x] Create the repository. Add lint/type/test pipeline. (Next.js scaffold, ESLint/Airbnb, Prettier, Husky, Vitest, Playwright — verified with lint, format, typecheck, build, unit, E2E, and high-severity npm audit checks on 2026-08-05.)
- [ ] Add the deployment pipeline and a health endpoint.
- [~] Build design tokens: colour, text, space, radius, state. (Font + semantic colour tokens exist in `globals.css`'s `@theme` block as of 2026-08-05 — [[sals3-session-2026-08-05-part01-marketplace-landing-page]]. No space/radius/state token layer yet; still Tailwind defaults.)
- [ ] Build 10 base components: button, input, chip, card, sheet, dialog, tabs, badge, skeleton, toast. (The 2026-08-05 landing page used one-off components instead — flagged as a gap in [[sals3-session-2026-08-05-part01-marketplace-landing-page]], not a substitute for this item.)
- [ ] Add logging, metrics, error reports.

**Exit test:** a page with the base components deploys, and the pipeline blocks a bad change. **Not yet passed** — the pipeline blocks bad changes (verified), but no base component library exists for a page to be built from.

### Stage 2 — Data model and contracts (not started)

- [ ] Define entities: product, variant, seller, category, attribute, buyer, address.
- [ ] Define the `Money` and `PriceLine` types (build spec section 16.3).
- [ ] Write API schemas. Generate typed clients.
- [ ] Write the 5 golden scenarios (build spec section 20.5).
- [ ] Add `CategoryMappingRule`, `AttributeMappingRule`, `SupplierProductLink` to the entity list — see [[sals3-cj-dropshipping-integration-plan]].

**Exit test:** the team agrees on the entity names, and the schemas generate a client.

> [!WARNING] Do not go to Stage 3 with an unclear data model — a change at Stage 6 costs 10 times more than a change here.

### Stage 3 — Catalogue read path (partially started)

- [~] Build the catalogue service: product, variant, category, media. (`src/services/products.ts` — as of PR #22 (merged 2026-08-05) a Zod-validated wrapper around the real, protected `sals3-portal` storefront API, itself proxying CJdropshipping — a real supplier feed, still not Sals3's own product/variant/category/media model. Wired to the landing page's deals/"For you" grids and the product route below. Two real data-shape bugs found and fixed 2026-08-06: real CJ titles exceeding the schema's length cap failed an entire page's validation (PR #26), and `sals3-portal`'s `totalPages` didn't reflect real reachable depth (its own PR #3). See [[sals3-session-2026-08-06-part10-pr21-pr22-reconciliation-and-cj-bugfixes]].)
- [~] Build the list route and product route, server-rendered. (Product route done, PR #21 merged 2026-08-06: `/p/[id]` — server-rendered, `notFound()` on a missing/invalid id or lookup failure, `generateMetadata`, related products. No reviews/description/brand/warranty section — the real `sals3-portal` schema carries none of those fields, so none are shown (an honest cut, not an oversight — see the session note above). No variant selectors — the real backend carries no variant data, none was invented. **Known regression:** most real products currently 404 on their own detail page — the client-side by-slug lookup is capped at 2 pages/section to avoid hammering CJ's rate limit (PR #24), pending a real single-product endpoint on `sals3-portal` (its own PR #2, open). List route (`/c/[category]`) still doesn't exist.)
- [ ] Build filters with counts and the sort control.
- [ ] Build state preservation — test all 6 conditions (build spec section 6.4).
- [ ] Load a realistic quantity of test products, not 20.

**Exit test:** a buyer finds a product with a filter, opens it, and goes back to the same position.

### Stage 4 — Price and promotions (not started)

- [ ] Build the pricing service returning price lines and a total.
- [ ] Build the promotion model (build spec section 17.1).
- [ ] Build the rules engine and quote version.
- [ ] Build the shipping quote input for the delivery region.
- [ ] Run the golden carts — every total exact.

**Exit test:** every golden cart returns the exact expected total, deterministically.

### Stage 5 — Cart and checkout (partially started)

- [~] Build the cart service and fulfillment groups. (Cart done, PR #21 open 2026-08-05: client-only, `localStorage`-backed — `src/lib/cart.ts` plus `CartProvider`, `/cart` route, live Add to Cart/Buy Now on the PDP, an add-to-cart toast. No fulfillment groups — no seller/shipment-group data model exists yet, none was invented. Not a server cart: no account, no database, no price/promotion engine behind it — Stage 4 hasn't started, so cart line prices are just the catalogue price.)
- [ ] Build the checkout page with progressive disclosure. (`/checkout` deliberately not built — `Proceed to Checkout` on `/cart` renders disabled with a plain-English note.)
- [ ] Build the guest path.
- [ ] Add the idempotency key and quote version check.
- [ ] Connect one payment method. Add Cash on Delivery.
- [ ] Test a retry, a timeout, a duplicate submission.

**Exit test:** the team places a real paid test order; a network retry does not create a second order.

> [!IMPORTANT] Milestone — first vertical slice. The system can take money after this stage.

### Stage 6 — Orders and post-purchase (not started)

- [ ] Build the order record and status history.
- [ ] Connect the courier for tracking data.
- [ ] Build order list and order detail screens.
- [ ] Build self-service return request.
- [ ] Build refund path and notification messages.

**Exit test:** a test order moves from payment to delivery to a refund, visible at each step.

### Stage 7 — Seller and administration tools (not started)

- [ ] Build seller sign-up and verification.
- [ ] Build product upload and approval queue — including the CJ Dropshipping auto-import case, see [[sals3-cj-dropshipping-integration-plan]].
- [ ] Build seller order view and stock control.
- [ ] Build commission calculation and payout report — `[?]` blocked on confirmed commission/fee structure.
- [ ] Build dispute and return handling for the seller.
- [ ] Build support tools: order search, refund, note.

**Exit test:** a real seller completes sign-up, upload, sale, and payout without developer help.

> [!WARNING] Teams frequently forget this stage. A marketplace without seller tools cannot operate — give it a real estimate, not an afterthought.

### Stage 8 — Migration and launch (not started)

- [ ] Build the import tool (build spec section 18).
- [ ] Run the import on a test system; compare counts and sums.
- [ ] Build the redirect map. Crawl the test site.
- [ ] Rehearse the launch. Rehearse the rollback.
- [ ] Launch to a small percentage of traffic, then increase.

**Exit test:** all 6 launch gates (build spec section 19.3) pass.

## The smallest useful first release (build spec section 21.3)

Given the confirmed 2-developer team, the first release must be reduced. Keep these; remove the rest until later:

**Keep:** browse/search/filters/product page; cart, guest checkout, one online payment, Cash on Delivery; order tracking and return request; seller sign-up/product upload/order view/payout report; one correct price with a discount breakdown; support order search and refund.

**Remove for later:** vector search and recommendations; many payment methods; loyalty points and referral programs; advanced seller analytics; complex campaign types; a full support ticket system.

## Ongoing / not yet scheduled

- [ ] White-label branding protocol: shipping labels, invoices, tracking portal, centralized support desk.
- [ ] BIR/EOPT tax compliance automation, RA 11967 legal review before launch.
- [C] Learned/automated demand forecasting for supplier reorder — candidate, not approved. Build spec section 21.3 explicitly defers "vector search and recommendations."
- [C] Automated platform/stock detection for availability — candidate, not approved.

---
tags: [sals3, adr, seller-center, cj-dropshipping, catalog, architecture, seo, worldwide, taxonomy]
aliases: [ADR-001, CJ Sourcing to My Products, My Products Import Flow, Sold and Fulfilled by Sals3]
created: 2026-08-06
updated: 2026-08-06
status: approved
authority: adr
owner_approved: true
related:
  - "[[architecture-decision-template]]"
  - "[[sals3-cj-dropshipping-integration-plan]]"
  - "[[sals3-global-seller-center-ux-blueprint-proposal]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[universal-category-variation-taxonomy-reference]]"
  - "[[sals3-implementation-phases]]"
  - "[[sals3-management-bible]]"
  - "[[parked-ideas-backlog]]"
  - "[[index]]"
---

> [!IMPORTANT] Status: approved by Bogs, 2026-08-06. AJ has not reviewed it yet.
> Planned with Bogs across one session on 2026-08-06 and approved by Bogs the same day. The ask: let a Sals3 employee browse CJdropshipping's ~1.5M-listing catalogue (surfaced today by `sals3-portal`, read-only), source a listing into a Sals3-owned "My Products" catalogue, then customize it — photo, category, description, and the other normal product fields — the Shopee/Lazada/TikTok "import from supplier" pattern. Reconciles [[sals3-cj-dropshipping-integration-plan]] and [[sals3-global-seller-center-ux-blueprint-proposal]], which both flagged this overlap and never resolved it.
>
> **AJ has not reviewed this.** Bogs's approval is genuine owner authority per [[team-profile-and-collaboration-preferences]] (both AJ and Bogs are owners; neither is the sole owner), so this is a real approved decision — but D4 adopts a shared category taxonomy and D1/D9 change the `sals3-portal` ↔ `sals3-ecommerce` contract, both of which touch AJ's work directly. Brief AJ before the first code lands.
>
> **Approved decisions:** D1–D10 below. **Still a factual lookup, not a blocker:** CJ's daily points quota for Sals3's tier (D8 self-tunes without it). **Still owner-assigned:** who owns the approved-brand list (D3 Layer 2b).

# ADR-001 — Source CJ listings into a Sals3-owned "My Products" catalogue

## Status

`proposed`

## Problem

Turn CJdropshipping supplier listings into Sals3-owned, sellable products. A human must browse CJ, source a listing, and customize it before it publishes.

Questions answered here:

1. How do we filter ~1.5M listings and keep junk out?
2. How do we match Sals3's category against CJ's — and can it be automated?
3. How do we guarantee a published product adheres to [[sals3-geo-aeo-seo-strategy-proposal]]?
4. Where does the customized product live?
5. Worldwide: how do we stop an item appearing where it cannot ship?

## Evidence

### Verified in code, 2026-08-06

- **`sals3-portal` is deliberately read-only, no database.** PR #22 (2026-08-05) removed its entire prior writable catalogue — in-memory store, CRUD routes, add/edit/import/export UI, source switcher — on AJ's explicit choice of full deletion. README: *"There is no Sals3 product catalogue, no add/edit form, no import/export, and no database."*
- **Neither repo has a product entity, seller entity, or database.** Stage 2 is `not started`.
- **No authentication anywhere.** The portal's `src/lib/auth/session.ts` returns one hardcoded dev identity; its own comment says *"Do not treat this as authentication."*
- **The portal reads 15 CJ fields, one image, one flat `categoryName`, no variants.**
- **No description or brand in the storefront contract.** `ratingLine` is the hardcoded string `'Supplier item'`.
- **Real CJ titles exceed 120 chars** — PR #26 root-caused a production bug to exactly this.
- **The portal's rate-limit handling is all avoidance, no pacing:** token cached in a `globalThis` Symbol (1-hour margin, 12-hour fallback); `inFlight ??=` shares one request across concurrent callers in both `token.ts` and `cj-feed.ts`; Next.js `revalidate: 300`; a second in-memory `Map` at 5-minute TTL; 400 ms search debounce; prev/next-only pagination; HTTP 429 degrades to a sentence. **No throttle, token bucket, or queue.** Correct for a human clicking; insufficient for bulk.

### Verified against CJ's API documentation, 2026-08-06

**Three assumptions proved wrong before anything was built:**

| Assumption | Reality |
|---|---|
| Filter on "≥100 sold" | **No sold count, sales volume, or order count exists in any endpoint.** Unbuildable as stated. |
| Filter on "verified supplier" | **No verification or trust flag exists.** Only `supplierName`/`supplierId`, and the portal's own schema notes `supplierName` is frequently `null`. |
| `shippingCountryCodes` tells us where we can deliver | **It is warehouse origin, not destination.** CJ's documented `countryCode` semantics: *"Filter products with inventory in specified countries."* The portal already names it `shipsFrom` and renders "Ships from CN" — the correct reading. |

**Rating** is available only via `product/productComments`: per-comment `score` (1–5), `comment`, `commentDate`, `commentUrls`, `countryCode`, plus a `total` count — **and no average**, so Sals3 must compute it. Paginated, default 20/page.

**Endpoints confirmed to exist and their exact paths:**

| Endpoint | Purpose | Cost |
|---|---|---|
| `GET product/getCategory` | **Entire 3-level category tree, no parameters** | **1 call, ever** |
| `GET product/query` | Product detail — includes **`productImageSet`** (image array) | 1/product |
| `GET product/variant/query` | Variants by `pid` → `vid`, `variantNameEn`, `variantSku`, dimensions, weight, pricing | 1/product |
| `GET product/variant/queryByVid` | Single variant + inventory (`totalInventory`, `cjInventory`, `factoryInventory`) | 1/variant |
| `POST logistic/freightCalculate` | Deliverability: `startCountryCode`, `endCountryCode`, `products[{vid, quantity}]` → methods, `logisticPrice`, `logisticAging` | 1/variant/destination |
| `GET product/productComments` | Reviews: `score`, `total`; params `pid`, `score`, `pageNum`, `pageSize` | 1–2/product |

**Fields CJ exposes that the portal does not read:** `productImageSet`; `oneCategoryName`/`twoCategoryName`/`threeCategoryName` (3-level hierarchy); `totalVerifiedInventory`/`totalUnVerifiedInventory`/`warehouseInventoryNum`; `isVideo`/`videoList`; `nowPrice`.

**Rate limits (CJ's published limit page):** 1 req/s Free/Sales Level 0–1; 2/s Plus; 4/s Prime; 6/s Advanced Level 4–5. 10 req/s per IP; 3 users per IP. A points-based **daily quota** replaced the old flat 1000/day cap; **the allowance for Sals3's actual tier is unchecked** — owner unavailable 2026-08-06. D8 removes this from the critical path.

### Owner direction, confirmed 2026-08-06 (Bogs)

- **Single-seller first:** only Sals3 sells; employees do the sourcing and customizing. The **"Sold and Fulfilled by Sals3"** case — Bogs's analogy to Lazada's badge.
- **Multi-seller-ready schema from day 1.** Third-party retail sellers and dropshippers are near-future. How the transition happens is **explicitly undecided**; the schema must not need a rewrite.
- **Commission parked** — [[parked-ideas-backlog]], 2026-08-06.
- **Thousands of products in the first batch.**
- **CJ photos auto-populate**, human free to replace.
- **Worldwide, not PH-only.** An item that cannot ship to the viewer's country must not appear to them.
- **Full taxonomy adoption** — see D4. Bogs overrode a narrower recommendation from this ADR's earlier draft.

## Options considered

### Option A — Sals3-owned catalogue in `sals3-ecommerce`; `sals3-portal` stays a pure CJ-access layer

The portal gains no database, only *read* capability (detail, variants, freight, categories, comments) plus the D8 queue. The Sals3-owned product record lives in `sals3-ecommerce`.

**Benefits:** Matches the CJ plan's own assumption (`SupplierProductLink` as a Sals3-side entity, already on Stage 2's task list). Leaves PR #22 intact. One store of record. CJ credentials and rate-limit accounting stay in the one repo that already handles them correctly.

**Risks:** Requires Stage 2 to start.

### Option B — Give `sals3-portal` back a writable catalogue

**Benefits:** Reuses the portal's UI shell.

**Risks:** Reverses a deliberate, days-old owner decision with no reason to. Creates two competing stores of record. The portal's roles, README, and error model are built around reading CJ, not owning data.

### Option C — Defer all design to Stage 7

**Benefits:** No commitment against an unbuilt model.

**Risks:** The three wrong assumptions above would be discovered *after* someone built on them.

## Strongest objection

Option A does not shrink the Stage 2 dependency; it says where code should live. An owner could fairly conclude the next step is still "not yet." That reading is correct — D9 exists to make the prerequisite as small as it honestly can be, not to pretend it is absent.

Second: full taxonomy adoption (D4) is materially more up-front work than a lazy subset. Bogs chose it deliberately, and the variation-architecture payoff justifies it — but it is real work, not free.

Third: worldwide deliverability (D7) is the largest single piece here and has no cheap version. Size it separately.

## Decision

**Recommended, pending AJ/Bogs approval.** Option A, with the following.

### D1 — Where the product lives

`sals3-portal` stays read-only, no database. The Sals3-owned product is a Stage 2 entity in `sals3-ecommerce`. The portal grows read-only CJ access (categories, detail, variants, freight, comments) and the D8 queue.

### D2 — Multi-seller-ready from day 1, single-seller in behavior

A `Seller` entity and an owning-seller reference exist on every product from the first migration, while only one seller row (Sals3) exists. Sals3's own products carry the "Sold and Fulfilled by Sals3" marker. A `sellerType` discriminator (`SALS3_OWNED` / `RETAIL` / `DROPSHIPPER`) is reserved. Per the CJ plan §6, do not hardcode "every seller is a CJ dropshipper" anywhere. **This ADR does not decide third-party onboarding** — only that the schema will not block it.

### D3 — Junk guardrails as a cost-tiered funnel (question 1)

**"≥100 sold" and "verified supplier" do not exist in CJ's API. Do not design around them.**

Free filters kill most of 1.5M; paid enrichment runs only on survivors. This is what makes "thousands" feasible under an unknown quota.

**Layer 1 — free, already in the list response:**

| Guardrail | Why it signals junk |
|---|---|
| No `productNameEn` | Fallback is a JSON array of Chinese names — unsellable untranslated |
| No `productImage` | Confirmed `null` on real deep-page products |
| `totalVerifiedInventory` at or near 0 | Strongest "real product" signal CJ gives — physically confirmed stock, not just a listing |
| Absurd or missing `productWeight` | Breaks shipping quotes; heavy items kill dropshipping economics |
| `productType` not a retail type | Allow-list retail types only |
| Unparseable, zero, or absurd price | Data artifact, not a price |

**Layer 2 — free, computed locally from the title (zero API cost):**

- Keyword-stuffing: comma/slash keyword runs, repeated words, ALL-CAPS runs, multiple years ("2023 2024 New"), and `Dropshipping`/`Wholesale`/`Hot Sale`/`Free Shipping` inside the title
- Extreme length (250+ chars) — normal CJ titles already exceed 120 per PR #26
- Non-Latin characters in `productNameEn` — the "English" name is not English

**Layer 2b — counterfeit / IP hard block. Legal, not quality.**

Blocked and flagged, **never auto-published**. CJ carries counterfeits; selling them is IP-infringement exposure in the same RA 11967 territory the build spec already treats as mandatory.

**Primary mechanism — a heuristic, not a list:** flag any title containing a **capitalized multi-word proper noun absent from Sals3's own approved-brand list.** Counterfeits announce themselves by brand name, so this catches brands nobody thought to enumerate. A deny-list of the most-counterfeited brands is the backup layer, living in a reviewed config file with effective dates — the pattern the seller-center blueprint's Tier 1 already mandates for versioned rules. **This is never weighted against other signals; it is a block.**

**Layer 3 — paid, shortlist only. Ordered cheapest-first:**

1. `productComments?pid=X&pageSize=1` → **1 call returns `total`.** Review count is the honest proxy for "sold" — the only sales-adjacent signal CJ exposes. **Never re-label it as a sold count in code or UI.**
2. Only if `total` passes: `pageSize=20` → sample and average the score. One page is statistically sufficient for a gate; do not page through everything.
3. `product/query` → `productImageSet` count (one image = thin listing), `isVideo`/`videoList`
4. Watermark check — needs human eyes (the CJ plan §3 cites *"Images contain watermark covering the product"*); this is why D5's image review is mandatory

**Thresholds — starting values to tune against real data, not laws:**

| Gate | Value | Reasoning |
|---|---|---|
| Review count | **≥ 20** | CJ review volume is far lower than consumer marketplaces — only dropshippers' end-customers leave them. 100 would starve selection; 20 excludes dead listings. |
| Sampled score | **≥ 4.0**, not 4.5 | On a 20-review sample, 4.5 sits inside the noise band of 4.2. 4.0 is a floor that means something. |
| Zero reviews | **Separate "unproven" bucket** | Zero reviews + high `totalVerifiedInventory` + recent `createTime` = a new product CJ is actively stocking, which can be genuinely good. A human opts in; do not hard-reject. |

**Layer 4 — two guardrails that fall out of work already required:**

1. **Low mapping confidence is itself a junk signal** — a product D4's classifier cannot place is often internally incoherent (title contradicts CJ category). Free.
2. **Deduplicate within the shortlist** — many CJ listings are the same product from different suppliers. Importing five near-identical ones creates *self-inflicted* duplicate content and cannibalizes Sals3's own pages. Dedupe by title similarity before publish.

**Do not use `listedNum` as a quality filter.** High `listedNum` means many competing dropshippers already list that product with identical photos and titles — a **negative** signal for D5.

### D4 — Full taxonomy adoption; the taxonomy drives the Add Product form (question 2)

**Owner decision, 2026-08-06 (Bogs), overriding this ADR's earlier draft.** An earlier draft recommended starting with L1+L2 only (~52 categories) and growing depth lazily. Bogs overrode it: **full implementation, remove only the `Platform Category ID` column.**

**That override is well-founded, and the earlier recommendation was wrong.** The lazy-subset approach would have discarded exactly the columns that answer the Add Product form question. Recorded here so the reasoning is not lost:

**Adopt [[universal-category-variation-taxonomy-reference]] in full** — all 1,346 rows, L1 through L5, plus the 57-row `Attribute_Dictionary_&_Presets`. **Remove the `Platform Category ID` column** — that is the only genuinely Shopee-derived artifact and the only real licensing concern; what remains is a generic taxonomy. This resolves the `owner_approved: false` on that note.

**The taxonomy is the binding specification for the Add Product form.** These columns are not reference material — they are the form's behavior:

| Column | What it governs |
|---|---|
| `Variation Architecture` | e.g. "2-Tier (Color + Size)" — how many variation tiers the form shows |
| `Tier 1 Attribute (Primary)` | The primary variation axis for that category |
| `Tier 2 Attribute (Secondary)` | The secondary axis |
| `SKU Format Standard` | The SKU pattern generated for that category |
| `Required Item Attributes` | Fields required before publish, per category |
| `Attribute_Dictionary_&_Presets` | The allowed values (Color Code, Size Code, Digital Preset) |

**Consequence — the Add Product form is category-driven, not one-size.** Pick a category and its variation architecture, required attributes, and SKU format are determined. This directly satisfies the build spec's §6.3 rule that filter groups "come from the category" rather than a universal filter set, and it satisfies the seller-center blueprint's "essential fields first, conditional market requirements" listing bet without designing a second form.

**Consequence — CJ variant mapping now has a target.** `product/variant/query` returns `variantNameEn`/`variantSku` per `vid`. Those option labels map to the category's `Tier 1`/`Tier 2` attributes via the Attribute Dictionary — which is exactly the attribute mapping [[sals3-cj-dropshipping-integration-plan]] §2.2 specified and could not previously point at anything concrete.

**Category mapping is automatable, and cheaper than assumed:**

```
GET product/getCategory  →  1 call, ever  →  CJ's entire 3-level tree
       ↓  classify each CJ path once (a few hundred paths)
CJ category path  →  Sals3 L1–L5 code       (permanent mapping table)
       ↓
each product inherits its category's mapping    (free, zero API calls)
```

Do **not** classify 1.5M products — classify CJ's few-hundred category paths once, against 1,346 Sals3 targets, then every product inherits. Mechanism per the CJ plan §2.1, unchanged: automated by default, confidence-scored log, non-blocking review, no per-category human gate. The taxonomy's `Product Examples & Guidelines` column is the strongest classifier input available. **Per-product override must exist** — some CJ categories are too broad or plain wrong.

### D5 — SEO/GEO/AEO adherence (question 3)

**Raw CJ data cannot pass an SEO gate, and no validator can make it pass.** Titles are keyword-stuffed and over length (PR #26); there is no description or brand field; and — the largest risk, not previously flagged anywhere in this vault — **thousands of other dropshippers list the same product with the same supplier photo and near-identical title.** Structured data cannot fix duplicate content.

**So the gate is the required-field set in the My Products editor, not a validator.** Publish stays blocked until a human supplies:

| Required before publish | Why |
|---|---|
| Original title, ASD-STE100, within display length | Duplicate content, plus the "understandable by an elementary school student" rule Bogs called *pinakamahalaga* ([[sals3-management-bible#4. Non-negotiable boundaries]]) |
| Original description | No CJ source field exists; `Product` JSON-LD needs it |
| Sals3 category from the adopted tree | D4 |
| That category's `Required Item Attributes` | D4 — per-category, not a fixed list |
| Reviewed images | Watermark check (D3 Layer 3) |

**Never fabricate ratings.** Emitting `AggregateRating` JSON-LD with invented numbers would breach Google's structured-data policy (manual-action risk), this vault's honesty rules, and RA 11967. It stays impossible until real Sals3 reviews exist. **CJ's review text belongs to CJ's supplier, not to Sals3's product — do not republish it as Sals3 review data.**

Once these fields are populated the product is Sals3-owned original content, and the **parked PDP `Product`/`Offer` JSON-LD work unblocks** — [[parked-ideas-backlog]]'s stated condition was "a real, Sals3-owned product catalog," which this is (minus `AggregateRating`).

### D6 — Images

- Read `productImageSet` from `product/query` so a sourced product gets **all** CJ photos, not one. The single-image limitation is a portal gap, not a CJ one.
- **Copy images into Sals3-owned storage; do not hotlink CJ's CDN in production.** CJ can rotate or delete a URL and silently break a live product page. Sals3-hosted images also give Sals3 filenames and alt text, which D5 needs. The `imageUrl: null` cases already seen on deep pages preview this fragility.
- Auto-populate on source; human may replace or reorder — as Bogs specified.
- Keep `next.config.ts`'s host allow-list and the portal's schema-level host check in step, as its own comment requires, while any CJ host still renders directly.

### D7 — Worldwide deliverability: hidden from listings, reachable by URL (question 5)

Bogs's requirement: an item that cannot ship to the viewer's country must not appear to them.

**An earlier draft of this ADR substituted a different answer** (show everything, mark it unavailable) without flagging the substitution. Corrected here. The resolution below satisfies the requirement as stated **and** protects D5, without compromise on either:

| Surface | Behavior | Serves |
|---|---|---|
| Listings — home, category, search, related products | **Zone-filtered. The item does not appear.** | The requirement, as asked |
| PDP by direct URL | **Always 200** with an honest unavailable state and a "see similar" path | Never 404 a real product; a shared or indexed link keeps working |
| `sitemap.xml` | **Every published product, regardless of zone** | How Google discovers products no US-IP listing page links to |

**The sitemap is what resolves the SEO objection.** A product does not need to appear in listings to be indexed — the sitemap reaches it. **No Googlebot special-casing**, which is where cloaking risk lives; the zone filter is ordinary geo-personalization that Google understands and permits.

**Shipping zones are mandatory, not an optimization:**

```
5,000 products × ~10 zones     =    50,000 calls ≈ 14 hours at 1 req/s
5,000 products × 200 countries = 1,000,000 calls ≈ 11.5 days
```

**Design:** group destinations into ~10 zones (NA, LATAM, W. Europe, E. Europe, MENA, Sub-Saharan Africa, South Asia, SEA, East Asia, Oceania). Test one representative country per zone via `logistic/freightCalculate`. **Store the reachability-and-cost matrix on the Sals3 product record**, refreshed on a schedule. Display filtering is then a cheap database query with **no CJ call on any page view** — automated, as required.

**Caching:** key by **zone, not country** — ~10 variants, not 200. Zone is derived in middleware from geo-IP and held in a cookie, so Next.js caching still works.

**Pricing:** see D10. Currency handling is settled there; the zone matrix built here is what feeds D10's landed cost.

### D8 — Rate limiting: config-driven and self-tuning, so the unknown tier is not a blocker

The portal's five existing mechanisms are **avoidance** and stay correct for interactive browsing. Bulk enrichment needs a **new, separate component** — do not extend the cache layer, it is a different problem.

A paced queue with:

- `CJ_REQUESTS_PER_SECOND`, default **1** (the Free-tier floor — safe without knowing the tier)
- `CJ_DAILY_BUDGET`, conservative default, **persistent counter** that survives restarts
- **Self-tuning:** watch for HTTP 429 and body-level quota errors, back off, and record the observed ceiling. **The real limit is learned empirically rather than asked for.**
- A budget guard so a large batch cannot exhaust the daily allowance and break the interactive portal
- Retry with backoff, and resume after interruption

**Batch size becomes "whatever fits today," not a number that must be committed up front.** The owner's tier answer becomes an optimization, not a prerequisite.

### D9 — The prerequisite is smaller than "Stage 2 and auth don't exist" implies

Both prerequisites are real. Neither is as large as it sounds.

**Stage 2 — three tables, not the full entity set.** `Product` (D5's required fields + D4's category reference + D7's zone matrix), `Seller` (D2), `SupplierProductLink` (`sals3ProductId` ↔ CJ `pid`/`vid`, `lastSyncedAt`, `syncStatus`). The last three of Stage 2's task list already name the mapping/link entities. Buyer, address, and the rest of Stage 2 are not on this path.

**Auth — single-tenant admin auth, not a user system.** Two or three employees use this tool. It needs a server-side password or passkey in front of the admin routes, which is hours of work. **The full auth system (signup, sessions, roles, shopper accounts) stays a Stage 5/7 concern and is not a prerequisite here.** "No auth exists anywhere" is true, but what this tool needs is small.

**Architectural consequence worth stating plainly: the website stops reading CJ live.** Today every page view can reach CJ (cached 5 minutes). After this, the site reads Sals3's own database, and CJ is touched only by the sourcing tool and a background price/stock sync. **CJ's rate limit leaves the shopper's critical path entirely**, which is why the unchecked daily quota constrains onboarding throughput, not site availability. Side effect: `src/services/products.ts` becomes database reads, and the portal's "storefront API" becomes a *sourcing* API whose name is then misleading.

### D10 — Currency and margin model

Approved by Bogs, 2026-08-06, after working through the current code's arithmetic.

#### D10.1 — Two currencies in phase 1, not one and not many

"Multi-currency in or out" is the wrong question — it decomposes into seven separable pieces with very different costs:

| Piece | Phase 1 |
|---|---|
| Currency-explicit storage (`Money`: minor units + ISO 4217 code) | **In** — the build spec's §16.3 `Money` type already requires it |
| Display currencies | **In, exactly two** — see below |
| FX rate source, refresh, and audit trail | **In, exactly one rate** |
| Per-currency rounding to retail price points | **In** — cheap, and machine-looking prices cost conversions |
| Rate locking at checkout | **Out** — `/checkout` does not exist; Stage 5 concern |
| Landed cost per zone | **In** for shipping (D7 already computes it); duties/taxes **out** |
| Settlement currency | **Out** — blocked on the Leadership-pending payment partner |

**Phase 1 displays USD only. Revised 2026-08-06** — an earlier version of this decision proposed USD + PHP with the Bangko Sentral ng Pilipinas daily reference rate as the FX source. **Bogs corrected a wrong premise: Sals3 is an Australian-based company**, so BSP is not its authority and "PHP is the home market" — the reasoning that justified a second currency — does not hold. See the jurisdiction warning below, which is larger than this pricing decision.

| Currency | Role | Why it is honest |
|---|---|---|
| **USD** | Cost currency **and** the only phase-1 display currency | **CJ's actual price.** Nothing is converted, so nothing is fabricated and no FX provider is needed at all |

USD-only is now the strongest phase-1 option, not a compromise. It removes the FX dependency from phase 1 entirely and resolves a live contradiction in shipped code without needing a rate at all: `sals3-portal`'s `normalize.ts` refuses to convert supplier prices because *"no approved exchange-rate source exists yet, and a guessed rate on a price a buyer could act on would be a fabricated number"* — while `feed.ts` does exactly that for the shopper-facing price using a hardcoded `CJ_USD_TO_PHP_RATE=58`. The portal declines to convert for the employee and converts for the customer, which is backwards on risk. **Displaying USD removes the guess instead of replacing it with a better guess.**

**When a second display currency is added, it must not be tied to one central bank.** Sals3 sells worldwide from an Australian base, so the rate mechanism has to be jurisdiction-neutral: a **documented commercial rate provider**, with the **rate, its source, and its effective timestamp stored alongside every price**, so any displayed number is auditable in any market. A single-country central-bank feed cannot serve that. The 3–5% FX buffer and the hold-between-re-prices rule in D10.4 apply only once a converted currency exists — they are inert while phase 1 is USD-only.

**Which second currency comes first is a market question, not a technical one** — AUD (the company's own jurisdiction) or PHP (previously named Market #1 across this vault) — and it depends on resolving the jurisdiction question below. Because `Money` is currency-explicit from day 1, adding either later is a new row in a rate table, **not a migration hunting for what currency a bare integer meant.**

> [!WARNING] Unresolved: this vault assumes a Philippine company throughout, and that premise is now in doubt
> Bogs stated on 2026-08-06 that Sals3 is **Australian-based**. Much of this vault's compliance and market content assumes a Philippine company as its starting point — RA 11967 (Internet Transactions Act) treated as the governing e-commerce law, BIR/EOPT tax-invoice logic, *"a Philippine lawyer must review before launch"*, PHP as the home currency, GCash/Maya as the payment rails, and "Philippines as Market #1."
>
> **This is not a simple find-and-replace of "Philippines" with "Australia."** Selling *into* the Philippines still engages RA 11967; being *based in* Australia engages Australian Consumer Law and GST obligations — including Australia's GST rules for low-value imported goods sold to Australian consumers by overseas suppliers, which land directly on a dropshipping model. Worldwide sales engage more still. **This is exactly the "market configuration layer" that [[sals3-global-seller-center-ux-blueprint-proposal]] §6 and §8 specified as Tier 1** (versioned rules with effective dates, per market), rather than assumptions baked into the product core.
>
> **Two consequences that matter immediately:**
> 1. **The fabricated `oldPriceMinor` defect gets worse, not better.** Australian Consumer Law is strictly enforced on "was/now" pricing and the ACCC actively prosecutes it. Add that to the EU/UK exposure already recorded in D10.9.
> 2. **Any compliance work sequenced off "Philippine lawyer reviews before launch" needs its jurisdiction confirmed first**, or the wrong lawyer reviews the wrong law.
>
> **Parked by Bogs on 2026-08-06** — logged in [[parked-ideas-backlog]] with its unblock condition (before any tax, invoicing, payout, consumer-disclosure, or launch-gate work starts, or before the pre-launch legal review is booked). It does not block this ADR: phase 1 is USD-only with no FX provider, and this flow moves product data, not money. **The `oldPriceMinor` defect still must be fixed regardless of how jurisdiction resolves.** Above an agent's authority to decide; recorded here because it surfaced here.

#### D10.2 — Markup is not margin, and the current config confuses them

```
margin = markup ÷ (1 + markup)        30% markup → 23.1% margin
markup = margin ÷ (1 − margin)        30% margin → 42.9% markup
```

`CJ_PRICE_MARKUP_PERCENT=30` is a **markup**, so it yields a **23.1% margin**, not 30%. If the owner wants a 30% margin, the value must be **42.9%**. **Whichever is chosen, label it explicitly in config and UI** — this is the cheapest possible guard against a costly and extremely common error.

#### D10.3 — A flat percentage is mathematically wrong here, and the current rule can sell at a loss

`priceMinor()` computes from `sellPrice` alone. **CJ's shipping cost is not in the price anywhere.** Combined with a flat 30% markup:

| | Cheap item | Higher-ticket item |
|---|---|---|
| CJ price | $5.00 | $50.00 |
| CJ shipping (small parcel, worldwide) | ~$3.00 | ~$5.00 |
| **True landed cost** | **$8.00** | **$55.00** |
| Price at 30% markup on `sellPrice` | $6.50 | $65.00 |
| Payment fee (~2.9% + $0.30, estimate) | −$0.49 | −$2.19 |
| **Result** | **−$2.00 — a loss** | **+$7.81** |

Two causes: shipping is excluded, and a flat percentage cannot carry a **fixed** per-order cost at a low price. **The fixed cost per order does not scale with price — which is why no single percentage works.**

**The closest thing to a global rule is that markup scales inversely with cost:**

| Landed cost | Typical markup | Multiplier |
|---|---|---|
| < $10 | 150–250% | 2.5–3.5× |
| $10–30 | 80–150% | 1.8–2.5× |
| $30–75 | 50–80% | 1.5–1.8× |
| $75–150 | 35–50% | 1.35–1.5× |
| > $150 | 20–35% | 1.2–1.35× |

Cheap items need a high percentage to clear fixed costs at all, not out of greed.

#### D10.4 — The approved formula

```
landed_cost  = cj_price + cj_shipping_to_zone          ← from D7's zone matrix
target_price = landed_cost × (1 + category_markup)     ← from D10.5
floor_price  = landed_cost + min_absolute_margin + payment_fee_estimate
price        = max(target_price, floor_price)          ← this is what prevents the loss
                  ↓
              round to a price point                  ← phase 1 ends here (USD-only)
                  ↓
              × FX buffer (3–5%) → convert → round → hold    ← only once a second currency exists
```

**The `max()` is the point.** The percentage produces normal profit; the **absolute floor** prevents a loss on cheap items. Starting value for `min_absolute_margin`: **~$3**, covering the fixed payment fee, a dispute reserve, and handling with room left.

**Price stability rules:**
- **Margin is defined in USD**, the currency Sals3 actually pays CJ in — otherwise real margin drifts with every FX move. **This holds even in phase 1**, where USD is also the display currency.
- **Round to a retail price point.** $28.47 looks machine-generated; $28.99 does not. Conventions differ per currency. **Applies in phase 1.**
- The two rules below are **inert until a second display currency exists** (D10.1), and are recorded now so they are not rediscovered later:
  - **An FX buffer of 3–5%** absorbs movement between re-pricing runs.
  - **Do not re-price daily even if the rate source updates daily.** Hold the converted price until a scheduled re-price (weekly or monthly) — a price that changes every day reads as untrustworthy. **Store the rate, its source, and its effective date for each price** so any number can be traced back in any jurisdiction.

#### D10.5 — Margin by category, which is where D4's taxonomy pays off again

Because D4 adopts the full tree, **margin becomes a property of the category** — how real retailers do it, margin by department. Attached at L1, overridable at L2/L3.

| L1 Department | Starting markup | Reasoning |
|---|---|---|
| Digital Goods, Services & Subscriptions | 100–200% | No shipping, no COGS scaling |
| Beauty & Personal Care | 80–150% | High tolerance, small and light |
| Women's / Men's Apparel & Fashion | 80–120% | Hard to price-compare, variation-heavy |
| Bags & Purses / Tactical Backpacks | 80–100% | Same |
| Footwear (Men's / Women's) | 70–100% | Higher return rate needs the buffer |
| Sports, Fitness & Outdoor Gear | 60–90% | Moderate |
| Home, Furniture & Living | 50–80% | Bulky and heavy — shipping eats margin |
| Food, Beverage & Gourmet | 40–60% | Thin, plus expiry risk |
| Audio Equipment & Headphones | 30–50% | Shoppers comparison-shop |
| Mobile Devices & Gadgets | 25–40% | Checked against Amazon/Shopee; price is the battle |

**These are reasoned starting ranges to validate against real competitor prices and real fee schedules — not authoritative figures.**

#### D10.6 — The competitive ceiling, and the honest limit of automation

The binding constraint is not the target margin. **It is what the same item sells for elsewhere.** If CJ's cost is $5 and the identical item is ₱299 on Shopee PH, the price is capped near ₱299 regardless of target.

**This cannot be automated without competitor price data, which Sals3 does not have.**

- **Phase 1:** a manual spot-check during sourcing. The human is already in the loop for D5, so this is one added field — *competitor price checked* — not a new workflow.
- **Later:** competitor price monitoring, as its own project.

Do not pretend a formula covers this.

#### D10.7 — Shipping is baked into the price, per zone

`isFreeShipping` exists in CJ's data and **D7's zone matrix already computes shipping cost per zone**, so the input is free.

**Bake shipping into the displayed price, per zone.** "Free shipping" converts materially better, and a $5 item with $12 of shipping appearing at checkout reads as a bait-and-switch. The consequence is that **the same product carries different prices in different zones** — normal for cross-border retail, and D7 already holds the data.

#### D10.8 — Which inputs are blocked, and how to build anyway

| Input | Status |
|---|---|
| Payment processing rate | **Blocked** — payment partner is Leadership-pending |
| Commission | **Parked** — [[parked-ideas-backlog]] |
| CJ shipping cost per zone | Buildable — D7 |
| Category markup table | Approved — D10.5 |
| FX rate | Buildable — D10.1 |

Treat every fee input as **reviewed config with an effective date and a named owner**, the same pattern as D8. Build the model now, plug in confirmed numbers later. The pipeline runs on estimates, and **every estimate is labelled an estimate** — exactly what the seller-center blueprint's "financial truth" bet requires (estimated / pending / final, never false certainty).

#### D10.9 — Five changes this requires to shipped code

1. Replace `CJ_PRICE_MARKUP_PERCENT` with the per-category markup table keyed to L1
2. Add `min_absolute_margin` and the `max()` floor
3. **Include CJ shipping in landed cost** — absent today, and the direct cause of the loss in D10.3
4. Label markup-vs-margin explicitly in config and UI
5. Add the *competitor price checked* field to the sourcing flow

> [!WARNING] Separate defect, not part of this decision
> `feed.ts` sets `oldPriceMinor = price × 1.15` for the `deals` section (`DEAL_COMPARE_UPLIFT_PERCENT = 15`). **The struck-through "was" price was never a real price** — the site displays roughly a 13% discount from a number that never existed. That is deceptive pricing: unlawful in many jurisdictions, squarely in RA 11967 territory in PH, and **strictly policed in the EU and UK**, so going worldwide multiplies the exposure. This is shipped code and predates this ADR. It must be fixed independently of D10 — either show a genuine prior price with a real effective date, or show no comparison price at all. Tracked separately; see [[hot]].

## System impact

- **Data and schema:** `Seller` (with `sellerType`); `Product`/`Variant` with owning-seller reference, publish state, currency-explicit `Money`, and a shipping-zone reachability/cost matrix; `SupplierProductLink`; `CategoryMappingRule`; `AttributeMappingRule`; a media/asset record for copied images; and the adopted 1,346-row taxonomy with its variation/attribute/SKU columns as reference data.
- **Modules:** `sals3-portal` — additive read-only only: extend `cjProductSchema` with the 3-level category and inventory fields; add readers for `product/getCategory`, `product/query`, `product/variant/query`, `logistic/freightCalculate`, `product/productComments`; plus the D8 queue. No database, no write path, no reversal of PR #22. `sals3-ecommerce` — the three Stage 2 tables, single-tenant admin auth, an internal catalogue admin surface (browse-and-source, My Products list/editor with D5's gate and D4's category-driven form), the D4 classifier, an image-copy pipeline, the D7 zone matrix job, and zone-aware queries across **every** product surface.
- **User workflow:** Employee browses CJ → Layer 1/2 free filters → sources a listing → CJ photos, 3-level category, price, variants auto-populate → employee writes original title/description, picks Sals3 category (which determines the variation/attribute fields), reviews images → publish gate checks D5's required fields → live as "Sold and Fulfilled by Sals3" → shopper sees it in listings only if their zone is reachable, and by direct URL always (D7) → `SupplierProductLink` keeps price/stock in sync per the CJ plan §4.
- **Financial or compliance effect:** No money moves in this flow. Commission parked. Four compliance touchpoints: the counterfeit/IP block (D3 Layer 2b), no fabricated ratings or reviews (D5), the build spec's stock-guard rule once sync exists, and — new with worldwide — **per-market tax and consumer-law exposure that the PH-only assumption previously hid. Out of scope here; needs its own note.**
- **Migration and rollback:** Nothing shipped against this ADR; rollback is not building it. D2's schema and D7's `Money` decision exist specifically so the third-party-seller and multi-currency transitions are not themselves migrations.

## Required verification

- **Focused / cross-module tests, manual acceptance, data reconciliation:** N/A — no code exists yet.
- **Owner decisions — all resolved by Bogs, 2026-08-06:**
  1. ✅ **This ADR approved.**
  2. ✅ **D4 full taxonomy adoption confirmed** — `owner_approved` flipped on [[universal-category-variation-taxonomy-reference]] the same day.
  3. ✅ **D3 thresholds confirmed** (review count ≥ 20, sampled score ≥ 4.0, separate unproven bucket) as starting values to tune against real data.
  4. ✅ **D7 split confirmed** (hidden in listings, reachable at 200 by direct URL, every published product in the sitemap).
  5. ✅ **D10.1 currency scope confirmed, then revised the same day** — now **USD-only display in phase 1** (no FX provider needed at all), currency-explicit `Money` from day 1, the rest deferred. Revised after Bogs corrected the premise that Sals3 is Philippine-based; it is **Australian-based**, which removed the reasoning behind a PHP second currency and ruled out BSP as the rate authority.
  6. ✅ **D10 margin model confirmed** — per-category markup, absolute floor, shipping in landed cost, manual competitor check.
- **Still owner-assigned, not blocking design:**
  7. Who owns the approved-brand list and the counterfeit deny-list (D3 Layer 2b).
- **Factual lookups, not blockers:**
  8. CJ's points-based daily quota for Sals3's actual tier — needed to *tune* D8, not to build it.
  9. ~~Whether BSP publishes a machine-readable rate feed~~ — **no longer applicable.** Phase 1 is USD-only and needs no FX provider. When a second currency lands, pick a documented commercial provider (D10.1), not a single country's central bank.
- **Build prerequisites:**
  10. D9's three Stage 2 tables.
  11. D9's single-tenant admin auth.
- **Resolved 2026-08-06:** AJ briefing — Bogs confirmed this is handled.
- **Independent of this ADR, must be fixed:**
  12. The fabricated `oldPriceMinor` comparison price (D10.9's warning callout) — **exposure increased** by the Australian-jurisdiction correction, since Australian Consumer Law is strictly enforced on "was/now" pricing.
- **Parked by Bogs, 2026-08-06 — does not block this ADR:**
  13. **The vault's Philippine-company premise is in doubt** (D10.1's jurisdiction warning). Sals3 is Australian-based per Bogs, while RA 11967, BIR/EOPT logic, "Philippine lawyer reviews before launch", PHP, and GCash/Maya are threaded through this vault as governing assumptions. Logged in [[parked-ideas-backlog]] with its unblock condition. **Above an agent's authority to resolve.**

## Supersession

None. First ADR reconciling [[sals3-cj-dropshipping-integration-plan]] and [[sals3-global-seller-center-ux-blueprint-proposal]] on where the sourced-and-customized product lives; first note recording what CJ's API does and does not expose; and the note that adopts the category taxonomy as the Add Product form's specification (D4).

## Record of corrections made during this session

Kept because the reasoning matters more than the conclusions, per this vault's governance rules.

1. **"Filter on 4.5★ + 100 sold + verified supplier"** — two of three are impossible; CJ exposes no sales or trust data. Replaced with a review-count proxy (D3).
2. **"Filter out products that cannot ship to PH at import time"** — wrong on two counts: the target market is worldwide, and `shippingCountryCodes` is warehouse origin, not destination. Replaced with D7's zone matrix and display-time filtering.
3. **"Start with L1+L2 only, grow depth lazily"** — would have discarded the variation-architecture columns that specify the Add Product form. Overridden by Bogs; full adoption (D4).
4. **"Show geo-unavailable products marked as unavailable"** — this ADR substituted a recommendation for the owner's stated requirement without flagging it. Corrected to D7's split, which satisfies both.
5. **"At your scale you don't need an automated filter, humans curate 200–500"** — wrong once Bogs confirmed thousands in the first batch; automation is required (D3).
6. **"The daily quota is a blocker"** — wrong. D8's self-tuning queue and D9's "website stops reading CJ live" together reduce it to a throughput tuning parameter.
7. **"Multi-currency is in or out of phase 1"** — the wrong question. It decomposes into seven separable pieces with very different costs (D10.1); four are in, three are out.
8. **"A 30% markup gives a 30% margin"** — no. Markup and margin are different ratios; 30% markup is a 23.1% margin (D10.2). The shipped config says markup.
9. **"A flat markup percentage works"** — no. Fixed per-order costs do not scale with price, and `priceMinor()` omits CJ shipping entirely, so the current rule can sell a cheap item at a loss (D10.3). Fixed by an absolute-margin floor.
10. **"PHP is the home market, so use a BSP rate as the FX authority"** — wrong premise, corrected by Bogs: **Sals3 is Australian-based.** Both the second currency and its rate source fell with it. Phase 1 is now USD-only, which needs no FX provider at all. Surfaced the larger unresolved question in D10.1's jurisdiction warning — this vault threads a Philippine-company assumption through its entire compliance stance.

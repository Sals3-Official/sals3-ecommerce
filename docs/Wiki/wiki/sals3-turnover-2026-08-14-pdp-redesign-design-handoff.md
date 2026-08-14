---
tags: [sals3, turnover, handoff, pdp, storefront, design, aeo, seo]
aliases: [PDP Redesign Turnover, PDP Design Handoff 2026-08-14]
created: 2026-08-14
updated: 2026-08-14
status: current
authority: handoff
owner_approved: false
related:
  - "[[hot]]"
  - "[[sals3-turnover-prompt-template]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-geo-aeo-seo-strategy-proposal]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-016-google-merchant-center-product-feed-compliance]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
  - "[[parked-ideas-backlog]]"
---

# Turnover 2026-08-14 — PDP redesign, design handoff

> [!NOTE] What this note is
> The archived instance of the copy-paste turnover prompt for the buyer-facing product detail page
> redesign, handed to a design-focused agent session. Format per
> [[sals3-turnover-prompt-template]].
> The prompt body below was **corrected before handover** (see *Corrections applied before handover*)
> and is the version actually delivered. From this point it is a historical record — do not edit it
> to reflect later state. Add a clearly dated follow-up section instead.

> [!DANGER] SUPERSEDED IN PART — 2026-08-14, later the same day
> **The prompt's DEFECT section and its Tier 1 "disable both purchase buttons" instruction are now
> wrong. Do not follow them.** AJ shipped `84721dc` "feat(pdp): let an optionless product reach
> checkout" at 21:49 +0800, hours after this prompt was written (merged in PR #83; `origin/develop`
> is now `24426fa`). `hasChoices` became `hasVariants`, `ProductPurchasePanel` now mounts for any
> product with variants, `defaultVariantFor` pre-selects the variant whose price matches the
> displayed base price, and the cart line carries a real `variantId`. **Multi-variant products are
> buyable, and disabling the buttons would break a working purchase path.**
>
> What replaced the dead end, both verified live:
> 1. The new `ProductVariantFallbackSelector` labels variants `` `${sku} · ${price}` `` — ten radio
>    buttons reading `S3V-12D76F1B5376 · US$7.80`. Functional, but a buyer cannot choose between
>    hashes. `variants[].label` (Tier 2) is now the largest buyer-facing fix, not the price
>    qualifier.
> 2. An **ADR-016 §3 violation is shipped**: selecting a variant repainted the price from `US$4.51`
>    to `US$7.80` with no URL change. The prompt says a client-state selector would need an ADR-016
>    amendment — that selector is now in production. Making selection URL-addressable is remediation,
>    not a greenfield choice.
>
> Unchanged and still correct: the whole DESIGN DIRECTION section, the payload coverage table, the
> data-integrity prohibitions, the copy corrections, the breadcrumb blocker, the Tier 2 field and its
> two guards, and the AEO requirements. `sals3-portal` has not moved (`9186730`), still has zero
> writers for the option tables, and still does not put `sourceOptionLabel` on the feed — so Tier 2
> remains a portal change, not storefront-only. See [[hot]] for the full current state.

## Origin of this handoff

Bogs asked what a good storefront design would be, grounded in the real product-catalogue data and
in the project's own AEO/SEO study, then asked for a turnover prompt so a design-focused session
could execute it. Research established two things that reshaped the brief:

1. **A live defect on multi-variant products** — the portal never populates variant option labels, so
   the storefront's `hasChoices` gate is permanently false, the variant selector never mounts, and
   the PDP renders `min(offer price)` as *the* price. The cart line it produces carries no
   `variantId`, and checkout refuses it — so the product is **unbuyable**, not mispriced. See the
   DEFECT section in the prompt below, and [[hot]].
2. **Every conventional persuasion lever is prohibited** by ADR-013/003/012 and UX spec §14, and the
   real payload for a published product is thin — no reviews, no delivery dates, no stock counts,
   no brand, and for essentially every product no description at all.

Owner decisions taken during the session: PDP scope only; honest-only persuasion plus a roadmap of
what more data would unlock; the contradictory price-promise copy gets corrected to match reality;
both tiers of the variant fix are in scope; the page designs for missing descriptions and makes that
gap visible rather than papering over it.

> [!WARNING] Template correction applied here
> [[sals3-turnover-prompt-template]] is dated 2026-07-31 and names `E:\SALS3 2nd brain` as the vault
> root. That vault is the frozen mirror; the live vault is `E:\sals3-ecommerce\docs`. The prompt
> below uses the real paths. The template also lists canonical notes
> (`sals3-management-bible`, `sals3-implementation-phases`, `sals3-end-to-end-process-flow`,
> `sals3-feature-landscape-and-expansion-map`, `sals3-manual-testing-checklist`) that were not
> confirmed present in the live vault, so the prompt's read-order names only verified files.

## Corrections applied before handover

The first draft of this prompt contained four claims that a verification pass disproved. All four
were corrected in the body below before it was handed to anyone. Recorded here because the errors
are instructive, not to pad the note.

| First draft said | Verified truth |
| --- | --- |
| Add to Cart **transacts at the floor price** of the variant range. | It does not. `ProductPriceBox` passes no `variant`, so the line has no `variantId`, and `src/services/checkout/cart-validation.ts` throws `CheckoutValidationError` when `variantId` is absent and the product has more than one variant. Nothing is sold at the wrong price — the product **cannot be bought at all**, and the buyer discovers it only after entering email and a full address. There is a live checkout on `origin/develop` that the first pass had not read. |
| `FooterBrand`'s "the number you pay / no fees at the last step" is the **false** claim; `ProductShippingCard`'s "shipping is quoted at checkout" is the truth. | Inverted. `createStripeCheckoutSession` passes no `shipping_options` and no `automatic_tax`; `shippingFor()` only records the buyer's shipping **address**. So nothing is added at the last step, which makes FooterBrand's second sentence **true**. "Shipping is quoted at checkout" is the false one, in three places. Only "shipping and tax included" is unbacked. |
| Build a **real linked breadcrumb** from `categoryPath`. | Would have emitted `BreadcrumbList` items pointing at 404s — the fabricated-structured-data-field the code rules forbid. `/c/[category]` and `/categories` do not exist in `src/app` on `origin/develop`, and `categoryPath` is a display string with no slug for any ancestor. Only `Home` is linkable. |
| A list of tests that **will break**. | Most will not. No existing PDP fixture models *many variants, zero options* — every one is either zero variants or two variants **with** options. That gap is why the bug shipped, and it means Tier 1 should need zero weakened assertions. |

Also folded in from the same pass: the four env vars the code reads that `.env.example` omits, the
`catalog-cache.ts` `'v1'` bust handle Tier 2 must bump, the two label guards (uniqueness and
completeness), the ADR-016 consequence that makes the variant selector URL-addressable rather than
client-state, the hand-maintained `CLIENT_ENTRY_POINTS` array that a new client component would
otherwise slip past, and the missing `src/app/sitemap.ts` that `robots.ts` already advertises.

## The prompt as handed over

````text
You are taking over a scoped design-and-build task on the Sals3 project from a previous agent.
Your job is the buyer-facing product detail page (PDP) on the storefront. Read this whole prompt
before touching anything.

CURRENT DATE / CONTEXT
- Date: 2026-08-14
- Communicate naturally in Taglish unless technical precision is clearer in English.
- Do not behave like a yes-man. Challenge weak logic with evidence and explain tradeoffs.
- The team is AJ (Lead Architect/Programmer, full-stack), Bogs (Senior Developer, full-stack,
  best friends and co-developers), and Robin (Marketing Manager). None of them is "Sals3
  Leadership/Owner/Board" - they are staff; there is a separate boss/owner above them.
- AJ works remotely on a Mac (nickname: "Supot"); Bogs works on Windows. Async hours. Every time
  you detect the user is on Mac, say "Supot" in your opening statement.

PRIMARY WORKSPACES

Storefront (where this work lands):
E:\sals3-ecommerce   - remote origin = https://github.com/Sals3-Official/sals3-ecommerce.git

Portal / catalogue producer (Tier 2 touches this):
E:\sals3-portal      - remote origin = https://github.com/Sals3-Official/sals3-portal.git

Admin portal (NOT in scope, do not edit):
E:\sals3-admin-portal

WARNING ON THE STOREFRONT WORKING TREE
E:\sals3-ecommerce is currently checked out on branch `docs/admin-portal-part39` with 37 modified
files (all vault/docs). Its `src/` is ~48 files and ~3,600 lines BEHIND `origin/develop`. Do not
read or build from the working tree src - you will read stale code and reach wrong conclusions.
Either read via `git -C E:\sals3-ecommerce show origin/develop:<path>`, or create your work branch
off `origin/develop` first. DO NOT run `git stash` or `git checkout .` to get a clean base - those
uncommitted docs files are real work and are not backed up.

ENVIRONMENT YOU NEED BEFORE YOU CAN VERIFY ANYTHING
Copy .env.example to .env.local, but note it is INCOMPLETE - four vars the code reads are missing
from it. Ask Bogs for values.
- SALS3_PORTAL_API_URL=http://localhost:3001
- SALS3_STOREFRONT_API_TOKEN     (must match the portal's)
- NEXT_PUBLIC_SITE_URL           MISSING from .env.example. Blocks half the AEO work: getSiteUrl()
                                 gates canonical URLs, JSON-LD `url`, the robots.ts sitemap ref,
                                 and the new BreadcrumbList items. Unset, they all silently omit
                                 and you cannot verify any of them.
- STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PAYMENT_METHOD_CONFIGURATION_ID
                                 MISSING from .env.example. Needed to verify checkout, which is
                                 exactly where this defect surfaces.
The portal must be running on :3001 with its own DB configured, or the storefront has no catalogue
and e2e/product.spec.ts takes its documented 500 branch - which PASSES. Always state which happened.

OBSIDIAN VAULT
Vault root: E:\sals3-ecommerce\docs
Canonical notes: E:\sals3-ecommerce\docs\Wiki\wiki

Read these first, in this order (all confirmed present):
1. hot.md
2. agent-operating-contract.md
3. nextjs-component-security-code-rules.md   <- strict source of truth, and the SEO/GEO/AEO gate
4. sals3-ux-build-specification.md           <- section 7.2 PDP order, 5.2 price block, 9 trust,
                                                14 forbidden patterns
5. sals3-geo-aeo-seo-strategy-proposal.md    <- status: proposed, owner_approved: false
6. ADR-013-cj-product-evidence-truth-and-lean-catalog-controls.md
7. ADR-003-international-availability-shipping-and-pricing.md
8. ADR-016-google-merchant-center-product-feed-compliance.md
9. ADR-012-supplier-trend-signals-and-storefront-merchandising.md
10. parked-ideas-backlog.md
11. sals3-turnover-2026-08-14-pdp-redesign-design-handoff.md   <- this prompt, archived
Note: the UX build specification OUTRANKS the GEO/AEO proposal on any conflict, and the ADRs
outrank both.

CURRENT VERIFIED STATE (as of 2026-08-14)
- sals3-ecommerce origin/develop head: eae6b08 "Merge pull request #82 from
  Sals3-Official/chore/live-products"
- sals3-ecommerce local: on docs/admin-portal-part39, 37 modified files, all docs
- sals3-portal: on develop, clean, head 9186730 "Merge pull request #76 from
  Sals3-Official/chore/live-product"
- No redesign branch exists yet. No design work has been done. Nothing has been committed.
- `npm run verify` was NOT run in the handoff session - treat the suite as unverified on your
  branch and run it yourself before reporting anything complete.
- Live storefront is deployed at https://sals3-ecommerce.vercel.app and serves real published
  products from the portal.

THE DEFECT YOU ARE FIXING - verify this yourself before designing around it
The PDP renders the wrong price on any multi-variant product.
- src/app/p/[id]/page.tsx branches on `hasChoices = variants?.length > 1 && options?.length > 0`.
- The portal NEVER populates variant options: product_options, product_option_values, and
  product_variant_option_values have ZERO writers anywhere in sals3-portal.
- So hasChoices is always false, ProductPurchasePanel (which holds the variant selector) never
  mounts in production, and the page falls through to ProductPriceBox showing `detail.price`.
- `detail.price` comes from `priceMinor`, which the portal read model computes as
  `min(product_offers.price_amount_minor)` (sals3-portal/src/modules/catalog/storefront/
  read-model.ts:194-196).
- Live proof: https://sals3-ecommerce.vercel.app/p/men-s-casual-retro-corduroy-jacket-coat renders
  "US$4.51" with no selector, while its own JSON-LD on the same page emits AggregateOffer with
  lowPrice 4.51, highPrice 20.00, offerCount 10.
- ProductAddToCartButtons passes NO variant prop, so the cart line carries no variantId. The sale is
  NOT mispriced. It is worse in a different way: src/services/checkout/cart-validation.ts throws
  CheckoutValidationError when variantId is absent and the product has more than one variant. So
  every 10-variant product added to the cart HARD-FAILS at checkout - after the buyer has entered
  email and a full address - with a message naming an "option selection" that exists nowhere in the
  UI. The buyer's only escape is deleting the line. The funnel is a dead end, not a discount.
  cart-validation.test.ts has NO case for variantId-absent + multiple variants, which is the exact
  production path.
This is the same "from price" trap that sals3-portal/src/modules/catalog/products/publish.ts:151
explicitly guards the PUBLISH path against, reproduced in the DISPLAY path. It is also an ADR-016
violation: Google crawls the landing page HTML and diffs the rendered price against the feed price;
a mismatch yields a "Mismatched product price" disapproval, and the crawl does not run JavaScript,
so no client-side price correction can fix it.

WHAT THE PAYLOAD ACTUALLY CONTAINS - design only against this, never against the fixture
test/fixtures/storefront-product-detail.json exists byte-identical in BOTH repos and is the
MAXIMAL payload. It is aspirational, not representative. Do not design against it.

For a real CJ-imported published product today:
- title            always
- priceMinor       always, but = min(variant price). currency always (USD, ADR-003 phase 1)
- oldPriceMinor    always, but ALWAYS equal to priceMinor - never a real was-price
- images[]         always 1-12, alt is the product title (not real alt text)
- category         always, but the value is a CJ mirror code e.g. cj-1ae8d0c2-...
- categoryName     always in practice. categoryPath always, but ONE segment for CJ products
- availability     always, one of AVAILABLE / UNKNOWN / UNAVAILABLE - frequently UNKNOWN
- publishedAt      always, ISO string
- variants[]       always >=1, often 10. Each has id, sku, priceMinor, currency, availability
- variants[].options   NEVER - no writer exists
- specs.sku        always, but it is an S3V-<12 hex> SHA-256 hash, not a readable SKU
- specs.weightGrams    sometimes, when CJ reported one. Supplier-reported, must be labelled so
- specs dimensions / gtins / mpn / brand / condition   NEVER - hardcoded null, no writers.
  ADR-013 section 7 forbids inventing any of them
- description.blocks   effectively NEVER. The only producer in the portal is
  descriptionDocumentFromText in ProductEditorWorkspace.tsx:106, splitting a plain textarea on
  blank lines into `paragraph` blocks. Nothing anywhere emits heading, bulletList, or
  keyValueList. CJ's own description is deliberately never imported (unsanitised supplier HTML,
  no sanitiser exists)
- ratingLine       literal filler "No reviews yet", deprecated
- shipLine         literal filler "Delivery quoted at checkout", deprecated

CORE DATA-INTEGRITY RULES - these are hard prohibitions, not preferences
- Never fill a structured-data field (URL, logo, rating, price, availability, catalog listing)
  with a guessed or placeholder value. Gate it behind real data or an env var and OMIT it when
  unset. Google can issue a manual action and strip all rich results for the domain.
- No ratings or reviews. Sals3 has no buyer reviews. CJ supplier-platform review data may never
  be presented as a Sals3 rating (ADR-013 section 10).
- No stock quantities. No "only N left", no stock bar. The only signal is the 3-state enum, and
  there is deliberately no quantity field anywhere in the contract.
- No delivery estimates or arrival dates. Freight is a destination-specific quote, never a
  browse-time promise (ADR-003). Note the tension: UX spec 5.3 REQUIRES a real arrival date on
  the PDP - that requirement is currently unsatisfiable and stays unsatisfied, honestly.
- No was/now prices, no percent-off, no scarcity, no countdowns. A computed uplift over the
  current price is not a prior price (ADR-003 section 5). This was a real fixed defect; a test
  asserts the old behaviour stays dead.
- No invented brand, GTIN, MPN, condition. No invented seller or "verified" badge - there is no
  seller entity on the storefront.
- No raw supplier HTML rendered anywhere. No dangerouslySetInnerHTML except the existing JSON-LD
  emitters.
- Never parse CJ's variant label into option axes. "Black-1XL" stays verbatim; splitting it is a
  guess about which token is a colour, and a wrong guess becomes a customer-facing attribute.
- The rendered price must be byte-identical to the stored offer price, present in the initial
  server-rendered HTML, with no client-only price mutation after paint (ADR-016).
- UX spec section 14 forbidden patterns: restarting countdowns, false "only 1 left", uncloseable
  dialogs, shaming refusal copy, pre-selected extras, price increases at the last step,
  spin-to-win, forced account before purchase.

DESIGN DIRECTION - agreed with Bogs, build to this

THESIS. Sals3's data is thin and its rules forbid embellishment. Competitor PDPs are dense with
fabricated urgency; Sals3 structurally cannot lie. So the page should read as a RECORD of what is
known about an item and how it is known - closer to a dealer's provenance sheet than a shop
window. The persuasion is second-order: a shop that tells you plainly what it does not know earns
belief in what it does say. This also satisfies the GEO/AEO requirement for citation-first
content with verifiable specifics in semantic HTML, so one mechanism serves buyer trust and
answer-engine citability at once.

SIGNATURE ELEMENT - "What we know". A four-line provenance ledger in the buy rail, below the
actions. Filled teal marks are claims with evidence and a real date; hollow faint marks are
honest unknowns with the real reason:
    WHAT WE KNOW
    - Supplier stock    observed 6 August        (filled)
    - Price             fixed at publish, 12 August  (filled)
    - Delivery          quoted at checkout for your address  (hollow)
    - Buyer reviews     none yet                 (hollow)
Every value already exists in the payload (availability, publishedAt) or is a known constant
reason. Nothing is computed, estimated, or softened. Mark it up as a <dl> so it is machine-
readable. The default move in this slot is a row of unverifiable trust badges; listing your own
unknowns as first-class content is the opposite, and no competitor can copy it without admitting
their data is stale.
NOTE: the "Delivery" line's reason text must change - see COPY CORRECTIONS. Nothing is quoted at
checkout today. State what is actually true instead.

TYPE - promote what is already loaded. Plus Jakarta Sans (400/700) and Outfit (600) are already in
the bundle. Outfit is currently used for PRICES ONLY, which is why the price reads as a foreign
object and why the h1 is 20px while the price is 30px - the product title is weaker than the nav.
Promote Outfit to the full display role. No new font payload.
    Product title   Outfit 600, 28px desktop / 24px mobile, -0.02em
    Price           Outfit 600, 40px, -0.03em - stays the heaviest element (UX spec 5.2)
    Option count    Outfit 600, 18px, ink-muted (words, never a currency-formatted number)
    Section label   Plus Jakarta 700, 11px, uppercase, +0.08em, ink-subtle
    Body            Plus Jakarta 400, 14px, ink-muted, 1.6
    Data value      Plus Jakarta 400, 14px, ink, tabular-nums
Use tabular-nums on every numeric value - prices, weights, dates, dimensions.

COLOUR - re-role, do not reskin. The existing navy system in src/app/globals.css is fine. No new
hexes. What changes is which token means what:
    ink #14181c        the record's text
    brand-900 #0b2c4d  the single action colour, FLAT
    teal-500 #157f7f   verified/observed ONLY - the evidence marks. Never decorative
    ink-faint #8a9196  the "not known" state, given real visual treatment instead of being hidden
    border #e3e7ea     promoted from card edging to structural divider
    surface #f6f7f8 / white   page / record panel
THE ONE AESTHETIC RISK: retire .bg-brand-gradient from the PDP primary action in favour of flat
brand-900. It is the app's signature button, so this is a real bet. A gradient CTA reads as
promotional and undermines the "record, not a pitch" thesis more than anything else on the page.
Keep it scoped to the PDP so it is reversible and can be judged side by side. If Bogs dislikes it,
revert that one class - do not let it block the rest.
Deliberately avoided: warm-cream + serif + terracotta, and near-black + acid accent.

LAYOUT - one record, not four cards. Today the rail is four identical
`rounded-xl border border-border bg-white p-4` cards stacked with gap-4. Identical containers at
identical weight produce no hierarchy - the page reads as a pile of unrelated widgets. Replace
with ONE bounded panel divided by hairlines, so price, choice, action, and evidence read as one
document about one item.

  Home > Men's Jackets > Men's Casual Retro Corduroy Jacket Coat   (Home linked ONLY - see AEO 1)

  +---------------------+   Men's Casual Retro Corduroy
  |                     |   Jacket Coat                     <- Outfit 28
  |       photo         |
  |      (sticky)       |   From  US$4.51                    <- Outfit 40
  |                     |   10 supplier options             <- count in WORDS, no 2nd money token
  |                     |   -------------------------------
  +--+--+--+--+---------+   CHOOSE AN OPTION
  |  |  |  |  |         |   [ Black-1XL   US$4.51 ]          <- Tier 2
  +--+--+--+--+---------+   [ Black-2XL   US$6.20 ]  ...
                            -------------------------------
                            [  Add to Cart  ] [ Buy Now ]
                            -------------------------------
                            WHAT WE KNOW                     <- signature
                            (the four lines above)

Full width below, in this order (UX spec 7.2 - related products LAST, never between the product
facts): About this product (absent when no blocks) -> Specifications -> Related products.
Motion: ONE crossfade on gallery thumbnail -> main image. Nothing else. prefers-reduced-motion is
already clamped globally in globals.css.
Quality floor, unannounced: responsive to mobile, visible keyboard focus (globals.css already
gives a global :focus-visible ring), reduced motion respected, 44px minimum touch targets
(min-h-11 is the house convention).

DESIGN SYSTEM FACTS
- Tokens live ONLY in src/app/globals.css. Tailwind v4 with a CSS-first `@theme inline` block.
  There is NO tailwind.config file - do not create one.
- The ONLY shared UI primitive is src/components/ui/ProductImagePlaceholder.tsx. There is no
  Button and no Card primitive, and button class strings are copy-pasted in about five places.
  This redesign is the right moment to extract ui/Button and ui/Card - do it.
- House conventions to match: cards rounded-xl, buttons/inputs rounded-lg, container
  `mx-auto w-full max-w-6xl px-6`, touch targets min-h-11, motion
  `transition-all duration-200` with `active:scale-[0.98]`, body copy text-ink-muted with only
  headings and values in text-ink.
- Do NOT reuse the auth-* palette on the PDP; it is a deliberately separate login/signup system.

AEO / SEO REQUIREMENTS - these are a mandatory gate per nextjs-component-security-code-rules.md,
not a nice-to-have
1. BreadcrumbList JSON-LD plus a semantic breadcrumb. No BreadcrumbList exists anywhere in the repo
   and the PDP breadcrumb is an unlinked <p>, so this is the biggest structured-data gap.
   BLOCKER, read before you build it: only "Home" is linkable. /c/[category] and /categories DO NOT
   EXIST in src/app on origin/develop - verified, and hot.md says so. categoryPath is a DISPLAY
   STRING ("Apparel > Outerwear > Men's Jackets") carrying no slug for any ancestor; only the leaf
   has an id (detail.category). Emitting a ListItem.item pointing at a 404 or a guessed slug is
   exactly the fabricated-structured-data-field that nextjs-component-security-code-rules.md
   forbids. So: render <nav aria-label="Breadcrumb"><ol>, link Home to /, render ancestor segments
   as PLAIN TEXT, mark the product aria-current="page", and emit ListItems ONLY for entries that
   have a real URL. Note CategoryRowItem.tsx and FooterCategoryLinks.tsx already link to those dead
   URLs. Building /c/[category] is a worthwhile follow-up PR but is a new public route needing its
   own generateMetadata, robots/sitemap consideration, tests, and a parked-ideas-backlog update -
   not inside a PDP change.
2. Offer with price AND availability once Tier 2 gives an exact per-variant price. Today's
   AggregateOffer carries no availability at all - weak for rich results, insufficient for the
   Merchant API.
3. Citation-first answer summary - the ~60-word self-contained lead the strategy note requires.
   Put the STRUCTURE in directly after the h1, fed by the first description paragraph, rendering
   absent until copy exists. Do not fabricate a summary from the title.
4. Semantic HTML: breadcrumb becomes a <nav>, the evidence ledger a <dl>, specs stay a <dl>, clean
   h1 -> h2 hierarchy.
5. Existing emitters to respect, not duplicate: OrganizationSchema (global, in layout.tsx),
   WebSiteSchema, ProductSchema (src/components/schema/ProductSchema.tsx). ProductSchema
   deliberately NEVER emits aggregateRating, review, weight, shippingDetails,
   hasMerchantReturnPolicy, or priceValidUntil, and tests lock that. Do not add them.
6. Statistics hygiene: if you quote any figure from the GEO/AEO proposal, carry its qualifier. The
   Gartner "25% search decline" is a Feb 2024 PREDICTION, not measured. The "+40% citation rate"
   is from Aggarwal et al., KDD 2024, measured on the authors' own benchmark - experimental, not a
   guaranteed lift. llms.txt is a community proposal, not an honored standard, and no major AI
   vendor commits to reading it.

COPY CORRECTIONS IN SCOPE - note which claim is actually the false one
createStripeCheckoutSession passes NO shipping_options, NO shipping line item, and NO
automatic_tax. shippingFor() only records the buyer's shipping ADDRESS on payment_intent_data. So
line_items are item prices and nothing else, and nothing is added at the last step. That inverts
the obvious reading:
- "Shipping is quoted at checkout for your address." (ProductShippingCard) - FALSE. No quote
  happens and nothing is added. FIX THIS ONE.
- "Delivery quoted at checkout" (shipLine, rendered by ProductPriceBox/ProductPurchasePanel) -
  FALSE, same claim again. Stop rendering shipLine on the PDP; the view model already documents it
  as deprecated. No PDP test asserts it. ProductCard.test.tsx asserts it on the HOME card - leave
  that alone.
- "freight ... is quoted at checkout" (src/lib/site.ts doc comment) - FALSE, comment only, correct
  it.
- "The number on the product card is the number you pay. No fees appear at the last step."
  (FooterBrand) - actually TRUE of shipped behaviour. Keep it.
- "One price, shipping and tax included." (FooterBrand) - UNBACKED. No rate table and no carrier
  integration exist, so the resolver cannot have included real freight, and tax is not collected,
  which is not the same as included. Drop this sentence.
src/lib/site.ts already documents that "No surprises at checkout" was removed from
SITE_DESCRIPTION on 2026-08-13; the footer and the shipping card were both missed.
FLAG FOR THE OWNER, not a copy decision: AU and PH are the only CHECKOUT_ALLOWED_COUNTRIES and the
Stripe session sets no automatic_tax. That is a tax-compliance question. Do NOT paper over it with
copy advertising that no tax is added.
Do NOT touch src/components/auth/AuthHeroPanel.tsx, which carries a separate variant of that copy
pinned by src/app/login/page.test.tsx and signup/page.test.tsx. It makes the same false claim, but
it is out of scope here - flag it, do not fix it.

WHAT TO BUILD - two tiers

TIER 1 - storefront only, no contract change, ships alone.
- Correct the price presentation so a multi-variant product never shows a floor price as if it were
  the price. Use "From US$4.51" and state the option count IN WORDS. Do NOT render a visible range:
  a second, larger, currency-formatted token in the HTML is exactly what Google's price extractor
  may select, which reintroduces the ADR-016 mismatch you are fixing. The range stays machine-
  readable in the existing AggregateOffer, which is already correct - leave ProductSchema alone in
  Tier 1.
- Disable Add to Cart AND Buy Now on a multi-variant product, with a visible, announced reason.
  This is forced, not a matter of taste: the server already refuses the line (see the DEFECT
  section), so the only choice is whether the buyer learns before or after entering their address.
  Reuse the existing disabledReason prop on ProductAddToCartButtons - it already disables both
  buttons, sets aria-disabled, guards both handlers so no Klaviyo Buy Now event fires, and
  announces in a mounted aria-live region. No new client component, no bundle change. Copy must not
  say "out of stock" (false - availability is a separate real field) and must not say "choose an
  option" (there is nothing to choose). Single-variant and no-variant products stay ENABLED.
  Derive the predicate as `variants.length > 1 && (options?.length ?? 0) === 0` so Tier 2 clears it
  with zero edits.
- Semantic breadcrumb plus BreadcrumbList JSON-LD, within the linking blocker described under
  AEO/SEO item 1 - Home linked, ancestors as text, no fabricated URLs.
- Also add the missing cart-validation test: multi-variant product, variantId absent, expect the
  throw. It documents why the PDP disables purchase and stops a refactor reopening the dead end.
- Restructure the buy rail into the single hairline-divided record panel.
- Typography and colour re-roling per the direction above.
- Extract ui/Button and ui/Card.
- Fix the FooterBrand and ProductShippingCard copy.

TIER 2 - requires ONE additive contract field, touches both repos.
- Add `variants[].label` to the contract: the supplier-reported label, verbatim, sourced from
  provider_variant_references.source_option_label in the portal DB (e.g. "Black-1XL"). Never
  parsed into axes. Label it in the UI as supplier-reported.
- Producer change: sals3-portal/src/lib/storefront/catalog-feed.ts and the storefront read model.
  Bump the 'v1' cache key in sals3-portal/src/lib/storefront/catalog-cache.ts - it is a documented
  manual bust handle for row-shape changes, and without it you serve up to 30s of label-less rows.
- Consumer change: sals3-ecommerce/src/services/storefront/schemas.ts.
- Update test/fixtures/storefront-product-detail.json in BOTH repos IN THE SAME COMMIT PAIR - it is
  asserted byte-identical by sals3-portal/src/lib/storefront/contract-fixture.test.ts (toEqual) and
  sals3-ecommerce/src/services/storefront/schemas.test.ts, so drift fails a test in whichever repo
  moved. `diff` the two files as an explicit step; do not eyeball them.
- The contract is ADDITIVE-ONLY and tolerant by construction: the new field must be OPTIONAL,
  unknown keys are stripped, and `.strict()` must never be added. Drop no legacy key - ratingLine,
  shipLine, and oldPriceMinor stay on the wire even though the PDP stops rendering shipLine.
- Two guards, each a correctness bug if omitted. Synthesize a selectable option ONLY IF every label
  is unique AND every variant has a non-empty label. Duplicate labels mean the buyer picks one and
  silently gets another variant's price; a missing label would hide that variant entirely. If either
  guard fails, the product stays in Tier 1's honest disabled state.
- ADR-016 CONSEQUENCE, do not skip: a useState selector that repaints the price IS client-side
  price mutation after paint, which ADR-016 forbids, and it gives the single-Offer JSON-LD no
  server-side trigger. So selection must be URL-addressable - page.tsx reads searchParams.variant,
  resolves it against real variant ids, and server-renders that variant's exact price and
  availability; the selector navigates instead of holding price state. This is also what a future
  Merchant feed needs, since item_group_id grouping exports one offer per variant and each needs a
  link whose HTML shows its own price. Shipping a client-state selector instead requires an explicit
  ADR-016 amendment - raise it with Bogs, do not decide it silently in a PR.
- source_option_label is unreviewed supplier text going buyer-facing, with no analogue of ADR-011's
  media review gates. Expect "default", CJK characters, and junk. Flag for sign-off.

REUSE, DO NOT REBUILD
- src/lib/product-variants.ts already has resolveVariant, initialSelection, isValueSelectable,
  optionSummary, firstUnchosenAxis. Use them.
- src/components/product/ProductVariantSelector.tsx already exists with correct radiogroup
  semantics, arrow-key navigation, and unavailable-but-visible values. It has simply never
  mounted in production. Adapt it, do not rewrite it.
- src/lib/money.ts owns all formatting. formatMoney gives "US$850" with no decimals on whole
  amounts, and the symbol is "US$" not "$" because both PH and AU are approved destinations.
- src/components/icons/Icon.tsx has the icon set.

TESTS - most of these will NOT break, and the reason matters
NO existing PDP fixture models the production shape. Every one is either zero variants, or two
variants WITH options. Nothing models MANY VARIANTS, ZERO OPTIONS - which is 100% of real published
products. That gap is why this bug shipped, and it means Tier 1 should need ZERO weakened
assertions. Verify each of the following rather than assuming it breaks; if your new copy collides
with an existing negative assertion (/rating/i, /specifications/i, /about this product/i), change
YOUR COPY, not the assertion. The e2e spec asserts the Add to Cart button is VISIBLE, not enabled,
so a disabled button still passes - do not rename the button. login/page.test.tsx and its signup
twin cannot break, because neither page renders SiteFooter.
The test you must ADD is the missing fixture: many variants, zero options - asserting the exact
floor string renders, the high price does NOT appear as a formatted money token, both buttons are
disabled, and the reason is present.
Files to check, and never weaken an assertion that encodes a real prohibition:
- src/app/p/[id]/page.test.tsx - h1 text, exact 'US$1,999', absence of /about this product/i and
  /specifications/i, absence of /rating/i, '4,200 g', /in stock with the supplier/i, radiogroup
  /colour/i, /choose a colour/i
- src/components/product/ProductAvailabilityNotice.test.tsx - exact strings, and "container
  .textContent must contain no digit". That last one encodes the no-stock-count rule. Keep it, and
  do not relocate the price into that component.
- src/components/product/ProductSpecsTable.test.tsx, ProductVariantSelector.test.tsx
- src/components/schema/ProductSchema.test.tsx - full field set plus NEGATIVE assertions on
  aggregateRating, review, weight, shippingDetails, hasMerchantReturnPolicy, priceValidUntil.
  Those negatives are prohibitions. Keep every one.
- e2e/product.spec.ts - headings use a CURLY apostrophe. Match it exactly.
- test/client-bundle-boundary.test.ts - it walks a HAND-MAINTAINED CLIENT_ENTRY_POINTS array and
  does not auto-discover 'use client' files, so a new client component escapes the guard entirely
  unless you append it manually. Client PDP components must import types only from
  @/lib/product-detail.
No tests currently exist for ProductGallery, ProductPriceBox, ProductPriceDisplay,
ProductPurchasePanel, ProductAddToCartButtons, ProductDescription, ProductShippingCard,
RelatedProducts, SiteHeader, SiteFooter, or FooterBrand. Add coverage for what you change.

WHAT IS NOT IMPLEMENTED YET - do not imply otherwise in UI or copy
- No buyer reviews, no ratings, no review histogram.
- No delivery dates or shipping estimates anywhere.
- No live stock counts.
- No seller entity on the storefront, so no seller card and no verified badge.
- No brand, GTIN, MPN, condition, or dimensions on any product.
- No product descriptions on essentially any product.
- No /c/[category] route exists, which is what keeps FAQPage and category-hub AEO work blocked.
- No /search route exists, although WebSiteSchema already points a SearchAction at it (documented
  as a placeholder in a code comment).
- No src/app/sitemap.ts exists, although robots.ts advertises ${siteUrl}/sitemap.xml.
- llms.txt is identity-only with no catalogue listing.

NEXT RECOMMENDED DIRECTION AFTER THIS
- Seller-written structured descriptions are the single biggest AEO unlock. The three richer block
  types (heading, bulletList, keyValueList) exist in the schema and in the storefront renderer and
  have NEVER been produced by anything. That is portal editor work.
- Build /c/[category]. fetchProductsByCategory and ProductGrid already exist; it would fix the dead
  links in CategoryRowItem and FooterCategoryLinks and unblock documented parked items. Even then,
  mid-path ancestors stay unlinkable until ancestor slugs reach the contract.
- llms.txt catalogue listing: the parked entry's named unblock condition was "a real Sals3-owned
  catalog", which now exists. Per the process rule in nextjs-component-security-code-rules.md,
  check parked-ideas-backlog.md and either implement it or record why it stays deferred.
- Two shipped inaccuracies found during research, worth separate fixes: portal
  DescriptionSection.tsx:53 tells sellers supplier descriptions "are sanitised before they are
  stored or rendered", which describes work that does not exist; and
  product-draft-actions.ts:39 still claims the actions have "no UI wiring yet" although
  ProductEditor.tsx:88 wires them whenever the database is configured.
- Smaller follow-ups, out of scope here: the HOME ProductCard still renders the false shipLine after
  the PDP stops. A cart line added before this fix, or added from a home card which does not gate,
  still dead-ends at checkout - the PDP gate does not defend an existing cart. AuthHeroPanel.tsx
  keeps the unbacked "shipping and tax included" claim on /login and /signup.
- Separately open, NOT part of this task: sals3-portal publish.ts lets a seller-entered retail
  price bypass the pricing resolver entirely with only a `> 0` check and no floor against
  supplier cost, stamped pricingState RESOLVED. publish.ts:50 and publish-actions.ts:22 both
  document the opposite of what the code now does.

GIT AND FILE-SAFETY RULES
- NEVER auto-commit, push, deploy, or publish. Every commit needs Bogs's explicit go-ahead, every
  single time - no standing blanket approval carries forward.
- Branch off origin/develop in sals3-ecommerce. Do not commit on docs/admin-portal-part39, and do
  not disturb its 37 uncommitted docs files.
- Package manager is npm with package-lock.json.
- Run `npm run verify` before reporting any code work complete (it chains lint, format:check,
  typecheck:clean, build, test:run, test:e2e). Do not mark work complete when required lint, format,
  typecheck, build, test, e2e, or high-severity audit checks fail - report the failure as a blocker
  instead.
- The block in AGENTS.md about "This is NOT the Next.js you know" is written by `next dev`. Read
  node_modules/next/dist/docs/ before writing framework code. Committing that block with your work
  keeps the tree clean; removing it just recreates the diff.
- Ask whether to write or update a turnover prompt right after any commit, using
  sals3-turnover-prompt-template.md.

OBSIDIAN MAINTENANCE RULE
After any material decision or implementation, update the vault: hot.md with verified current
state only, the relevant ADR if a contract changed, and a session note
(sals3-session-YYYY-MM-DD-partNN-*.md). Add a sals3-skills.md lesson only if a reusable general
engineering principle was learned. Do not rewrite historical session notes to pretend old facts
were never true - add a clearly dated follow-up instead. The vault now lives inside the storefront
repo, so a vault commit and a code commit can touch the same working tree - never sweep code
changes into a vault commit, or the reverse.

IMMEDIATE TAKEOVER CHECKLIST
Before changing anything:
1. Read hot.md, agent-operating-contract.md, and nextjs-component-security-code-rules.md.
2. In E:\sals3-ecommerce run: git branch --show-current, git status --short,
   git log -1 --oneline --decorate origin/develop. Confirm it matches the state above.
3. Do the same in E:\sals3-portal.
4. Open https://sals3-ecommerce.vercel.app/p/men-s-casual-retro-corduroy-jacket-coat and confirm
   the defect yourself: one price, no variant selector, and JSON-LD with offerCount 10 and a
   4.51-to-20.00 range. If the page no longer behaves that way, STOP and re-verify before
   designing - someone fixed it.
5. Read the actual payload before designing. Do not design against
   test/fixtures/storefront-product-detail.json; it is the maximal aspirational shape, and most of
   its fields are unreachable by any current code path.
6. Confirm which env vars you actually have. If NEXT_PUBLIC_SITE_URL is unset, say so up front -
   you cannot verify canonical URLs, JSON-LD url fields, or BreadcrumbList items without it.
7. If you find a conflict between what you observe and what this prompt says, investigate and
   correct the canonical note with verified evidence. Do not guess, and do not silently trust this
   prompt over what you actually observe.

HANDOFF SUMMARY
The storefront PDP is live, server-rendered, and structurally disciplined - the contract is
tolerant and additive-only, the schema emitters refuse to fabricate, and the money module is
carefully documented. But the page has one serious live defect: because the portal never writes
variant option labels, the variant selector never mounts, the page shows the cheapest of N variant
prices as the product's price, and the resulting cart line has no variantId - so checkout refuses it
after the buyer has entered email and a full address, naming an option selection the UI never
offered. Multi-variant products are an unbuyable dead end, not a mispriced sale. Making that honest
is Tier 1; making the page actually buyable needs one additive contract field, which is Tier 2.
The design brief is unusual because the rules forbid every normal persuasion lever, and the real
data is thin - no reviews, no delivery dates, no stock counts, no brand, and almost never a
description. The agreed direction turns that into the point: present the page as a record of what
is known and how it is known, with a "What we know" provenance ledger as the signature element
that names its own unknowns. That same structure is what makes the page citable by answer engines,
so trust and AEO are served by one mechanism.
Nothing has been built. No branch exists. Start by verifying the defect, then Tier 1.
````

## How the claims in this prompt were verified

- **Git state** — the three commit SHAs and branch states were read directly from each repo and can
  be re-checked with `git log -1 --oneline --decorate origin/develop`.
- **The defect** — reproduced live on the deployed storefront: rendered price, absent selector, and
  the page's own JSON-LD showing `offerCount 10` over a 4.51–20.00 range.
- **The checkout dead end** — `src/services/checkout/cart-validation.ts` on `origin/develop` was read
  directly; the `variantId === undefined` branch throws whenever more than one variant exists.
- **No shipping or tax at checkout** — `src/services/stripe/checkout.ts` was read directly: no
  `shipping_options`, no `automatic_tax`, and `shippingFor()` sets only a shipping address.
- **The breadcrumb blocker** — `git ls-tree -r --name-only origin/develop -- src/app` returns no
  `app/c/` and no `sitemap.ts`.
- **Env vars** — enumerated by scanning every `process.env.*` reference in `origin/develop`'s `src`
  and diffing against `.env.example`.
- **The payload coverage table** — every "NEVER" traces to a specific hardcoded `null` or to a table
  with zero writers anywhere in `sals3-portal`.
- **Not verified** — `npm run verify` was not run; the prompt says so rather than claiming a clean
  suite. Whether the live `US$4.51` sits below this product's supplier cost was not determined (the
  postgres connection had no password configured). No storefront `src` file was modified at any
  point during the handoff session.

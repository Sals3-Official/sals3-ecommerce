---
tags: [project/sals3, canonical, domain-spec]
aliases: [Sals3 Management Bible, Sals3 Master Plan, Sals3 Product Bible]
created: 2026-07-31
updated: 2026-07-31
status: canonical
authority: domain-spec
owner_approved: false
related:
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-implementation-phases]]"
  - "[[sals3-end-to-end-process-flow]]"
  - "[[sals3-feature-landscape-and-expansion-map]]"
  - "[[sals3-master-blueprint]]"
  - "[[hot]]"
---

# Sals3 Management Bible

> [!IMPORTANT] Domain authority
> This note is a navigational distillation, not the primary source. For technical rules, always defer to [[sals3-ux-build-specification]] (Final status, 1 August 2026) — it is the authoritative build spec, and this note must not contradict it. Use [[sals3-implementation-phases]] for the complete task list and build status. Use [[sals3-end-to-end-process-flow]] for the canonical flowchart. [[sals3-master-blueprint]] remains the source for business-strategy narrative (the 3-pillar/dual-track concept) that the build spec's own stated scope excludes ("does not cover the business plan"). Historical session notes do not override these notes.

> [!WARNING] Still draft at the distillation level
> `owner_approved: false` here reflects that this *summary* note hasn't been line-reviewed, not that its content is sample. As of 2026-08-03, section 4 below reflects real, Final-status rules from [[sals3-ux-build-specification]], not illustrative blueprint numbers — only the *quality-gate/payment-partner specifics inherited from the blueprint* remain genuinely pending Leadership confirmation.

> [!IMPORTANT] Living design
> Follow this specification strictly during implementation once approved. A better owner idea is allowed. Review its impact, update this specification or an architecture decision, then implement it. Do not preserve a weaker design only because it was written first.

## 1. Product purpose

Sals3 answers:

- what a buyer can browse, order, and pay for (Pillar 2 — Customer Shopping Website);
- what a seller/supplier can list, fulfill, and get paid for (Pillar 3 — Enterprise Seller Center);
- how the business keeps selling and generating cash flow while the custom platform is built (Pillar 1 — temporary Shopify pop-up store).

## 2. The 3 core pillars

1. **Pillar 1 — Shopify pop-up store (Month 1):** interim cash-flow engine. Not the long-term platform.
2. **Pillar 2 — Custom B2C customer website (`sals3.com`, Months 1-4):** where buyers shop.
3. **Pillar 3 — Custom Sals3 Enterprise Seller Center (Months 1-4):** where sellers/suppliers work.

See [[sals3-master-blueprint#2. The 3 Core Pillars of Sals3 Architecture]] for full detail.

## 3. Canonical item lifecycle

The 10-step lifecycle (supplier ingestion → quality gate → pricing → order → stock check → PO dispatch → white-label packaging → tracking → delivery/review → financial settlement) is canonical. See [[sals3-end-to-end-process-flow]] for the maintained flowchart copy.

## 4. Non-negotiable boundaries

### Confirmed, Final status (from [[sals3-ux-build-specification]] — real rules, not samples)

- **Platform decision:** a new system, not WooCommerce. WooCommerce is the source of the old data only, imported once (build spec section 18).
- **One final price, everywhere:** the product card, product page, and cart show the same server-calculated total; the price must never increase at checkout (section 5.1). The client never calculates a trusted total — the server issues a versioned quote (section 16.1, 16.4).
- **Real-time stock guard:** an out-of-stock variation must not remain purchasable (section 6.3, consistent with the earlier blueprint framing).
- **White-label integrity:** carried forward from [[sals3-master-blueprint]]; the build spec's trust rules (section 9 — seller verification, return policy, merchant identity per RA 11967) reinforce it without contradicting it.
- **Forbidden patterns:** no false urgency/scarcity, no dark patterns, no forced account before purchase, no pre-selected extra products, no price increase at the last step (section 14) — legally grounded in Philippine RA 11967, not just a UX preference.
- **Idempotency and money safety:** checkout and refund require an idempotency key; money is stored as an integer in minor units, never a decimal (section 16.3, 16.4).
- **Team-size reality:** confirmed team is AJ + Bogs (2 full-stack developers) — build spec section 21.2 puts this at **9 to 14 months to first launch, only with a reduced first release** (section 21.3). Do not plan against a faster timeline without changing the team size first.
- **Language rule for every user-facing statement in the actual code (confirmed 2026-08-03, "pinakamahalaga" — Bogs's words):** all UI text, button labels, error messages, and instructions must follow **ASD-STE100 Simplified Technical English** (the build spec already mandates this for documents, section 1.4 — this extends it explicitly and permanently to code output) **and must be understandable by an elementary school student.** Treat "would a grade-schooler understand this sentence" as a real, checkable bar for every string that ships, not just a style preference — short sentences, one instruction per sentence, plain active-voice words, no jargon left unexplained.
- **AI-written code must be built and delivered component-by-component (confirmed 2026-08-03):** never write a whole page, feature, or service in one monolithic pass. Build the smallest complete, independently reviewable component first, verify it actually works, then compose the next one on top of it — matching the build spec's own Stage 1 component list (button, input, chip, card, sheet, dialog, tabs, badge, skeleton, toast) and service boundaries (BFF, Catalog, Pricing, Cart, Order, Seller — section 16.1). This is the same "smallest coherent move" discipline as [[autonomous-loop-sop]], applied specifically to how an AI agent should write Sals3 code — and it is a direct structural defense against the invisible-progress failure that killed the prior WooCommerce build (see [[hot]]'s project history). A code change with no isolated, checkable component boundary is a sign the step is too big.

  > [!NOTE] Clarification (2026-08-03) — this is not "keep every file short"
  > "Component-by-component" is about **one clear responsibility per piece** and **build-then-verify-then-continue**, not a line-count rule. A genuinely complex piece (e.g. the checkout page — progressive disclosure, price-version checking, idempotency key, section 8) can legitimately be a large file, and that's fine, as long as it still does one clear job and was verified on its own before being composed with other pieces.
  >
  > What's actually forbidden is **mixing unrelated jobs into one piece** — e.g. one file that builds the Add Product form UI, calls the CJ API, runs category matching, *and* writes to the database, all tangled together. That's the real failure mode: not "too many lines," but "too many unrelated responsibilities in one place," which is exactly what makes a bug hard to find and a change risky.
  >
  > - ❌ Monolithic: one file/component doing form UI + CJ connector + category matcher + database save, all mixed.
  > - ✅ Component-by-component: separate pieces for the form UI, the CJ connector, the category matcher ([[sals3-cj-dropshipping-integration-plan]]), and the save step — each verified alone, then composed.

### Still pending Leadership/business confirmation (from [[sals3-master-blueprint]], not covered by the build spec's stated scope)

- **Quality gate:** the rating/sales threshold for curating supplier catalog items (blueprint section 4) — the build spec doesn't address supplier curation at all, only the marketplace's own UI/architecture.
- **Exact commission rate and confirmed payment partners:** the build spec's promotion/pricing engine (section 17) is a real, buildable mechanism, but the *values* that flow through it (fees, rates, which payment methods) are still business decisions Leadership must confirm.
- **Tax compliance specifics:** BIR/EOPT invoice and withholding logic must exist before real money moves — the build spec names Philippine RA 11967 compliance as mandatory (sections 9, 14, 17.3, 22) but a Philippine lawyer must still review before launch (build spec's own legal note, section 22).

## 5. What exists now vs. what's still open

As of 2026-08-03, [[sals3-ux-build-specification]] provides a real data model (Money, PriceLine), real API contracts (products list, checkout, error codes), a real component/token system, and a real 8-stage build order — this is no longer undesigned. What remains open:

- No codebase exists yet; nothing in the spec has been implemented or verified against running code.
- The specific catalog/category taxonomy the Catalog service will use is only a candidate ([[universal-category-variation-taxonomy-reference]]), not adopted.
- Payment gateway, courier, and hosting/CI providers are unconfirmed (per [[team-profile-and-collaboration-preferences]]).
- The business/marketing plan (pricing strategy, launch marketing) is explicitly out of this bible's and the build spec's scope — that's [[sals3-master-blueprint]] territory, and even there marked sample.

Update [[hot]] with real state as work happens; do not let this bible imply more implementation progress than exists.

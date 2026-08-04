---
tags: [moc, hot-cache, current-state, sals3]
aliases: [Hot Cache, Recent Context Cache]
created: 2026-07-31
updated: 2026-07-31
status: current-state
authority: implementation-state
owner_approved: true
related:
  - "[[agent-operating-contract]]"
  - "[[team-profile-and-collaboration-preferences]]"
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-management-bible]]"
  - "[[sals3-implementation-phases]]"
  - "[[sals3-master-blueprint]]"
  - "[[index]]"
---

# Sals3 — Current State Cache

> [!IMPORTANT] Mandatory reading gate
> Read this note first. For material work, read [[agent-operating-contract]] and [[sals3-ux-build-specification]] (the current technical authority — Final status), then [[sals3-management-bible]] for the distilled boundaries, then use [[index]] to open the relevant domain note. Historical session notes do not override current decisions.

## Current repository state

- No Sals3 codebase exists yet. This vault holds planning and specification material only — no code has been written or verified.
- **Confirmed 2026-08-01, Final status (not a sample):** [[sals3-ux-build-specification]] — a real, rigorous UI/UX and build specification. Platform decision: **new system, not WooCommerce** (WooCommerce is the old system, its data migrated once and then retired). This is now the canonical technical authority; [[sals3-master-blueprint]] remains valid for business-strategy narrative only.
- **Confirmed 2026-08-03:** a candidate catalog/category taxonomy dataset was ingested — [[universal-category-variation-taxonomy-reference]] (1,346-row universal category tree, generic, Shopee-ID-derived). Not yet adopted as Sals3's actual category tree.
- **Confirmed 2026-07-31 (not a sample):** the future Sals3 codebase will be built in **Next.js + TypeScript**. See [[team-profile-and-collaboration-preferences#Confirmed technical/workflow setup (2026-07-31)|confirmed technical/workflow setup]].
- **Confirmed 2026-07-31:** the vault syncs through the **Obsidian Git** plugin (v2.38.6), committed into the repo itself with its settings — auto-pull on open, and auto-commit/push/pull every 10 minutes. A new machine inherits those settings from the clone; nobody types git commands. Setup steps, sync mechanics, and honest limitations (up to ~30 min lag, Obsidian must be open, same-file conflicts) are in [[vault-sync-setup-guide]]. **Still open:** AJ has not been added as a repo collaborator yet, so his Mac cannot clone or push until Bogs invites him.
- **Confirmed 2026-07-31:** this vault is a private GitHub repo at `github.com/louieboi09/sals3-2nd-brain`, branch `main`. Vault backup is auto during setup/scaffolding, and switches to user-paced once the real project is underway (re-confirm the transition when it happens) — see [[team-profile-and-collaboration-preferences#Cross-machine git backup discipline — vault only, user-paced]]. Code is never auto-committed, in any phase.
- `Raw/` holds: UI mockup images and the presentation deck (blueprint-era), the build spec source PDF (`sals3_ux_build_specification_2026-08-01.pdf`), and the category taxonomy workbook (`universal_category_variation_taxonomy.xlsx`, deliberately stripped of a BOGS-Dashboard-specific sheet before ingestion).
- No test suite, no repository, no verified row counts, or runtime state exist yet — this section will start being populated with real facts once implementation begins.

## Project history — why this rebuild exists

- Sals3's previous system was WooCommerce/WordPress, built by a prior developer who scraped/pulled items from CJ Dropshipping into it — so CJ product extraction is proven achievable in this project's context, at least at a basic level. That build was **abandoned after ~9 months with nothing shippable produced**; the owner's assessment (Bogs's words, 2026-08-03) was that the developer was incompetent. AJ and Bogs joined specifically to rebuild after that failure.
- **Lesson this vault must actively guard against:** a long, invisible build with no shipped output is exactly the failure mode that ended the WooCommerce attempt. [[sals3-ux-build-specification]]'s stage structure (section 20.3) already defends against this structurally — every stage has a concrete, checkable exit test, not an open-ended "keep building." Do not let Sals3's rebuild drift into the same 9-months-nothing-to-show pattern; if a stage has no passing exit test, say so plainly rather than reporting vague progress.

## Active product focus

Not yet started (no code exists). Per [[sals3-implementation-phases]], the confirmed plan is:

1. **Track A — Shopify pop-up store:** interim cash flow. Blueprint-only, not covered by the build spec.
2. **Track B — the new system:** [[sals3-ux-build-specification]]'s 8-stage build order (Foundation → Data model → Catalogue read path → Price/promotions → Cart/checkout → Orders/post-purchase → Seller tools → Migration/launch). Not started — no repository exists, none of the "first 10 working days" (build spec section 20.6) have happened yet.

**Realistic timeline, per the build spec itself:** confirmed team is AJ + Bogs (2 full-stack developers) → **9 to 14 months to first launch, only with a reduced first release** (build spec section 21.2, 21.3). Treat this as the honest baseline, not pessimism.

Use [[sals3-implementation-phases]] for the full stage-by-stage task register, [[sals3-end-to-end-process-flow]] for the canonical flowchart, and [[sals3-feature-landscape-and-expansion-map]] for the capability map.

## Non-negotiable operating rules

### Agent behavior

- Do not act as a yesman.
- Give evidence, the strongest material objection, system impact, recommendation, uncertainty, and verification.
- Do not claim zero possible errors or describe untested behavior as verified.

### Financial integrity

- No payment, payout, or commission logic is implemented yet. The build spec's Money/PriceLine model, quote-versioning, and idempotency-key mechanisms are real and specified — but the *values* flowing through them (commission rate, confirmed payment partners) remain pending Leadership confirmation. See [[sals3-management-bible#4. Non-negotiable boundaries]].
- RA 11967 (Internet Transactions Act) compliance is mandatory per the build spec (sections 9, 14, 17.3, 22) — the spec itself states a Philippine lawyer must still review before launch.

### Design and language

- The design token system, base components, and screen layouts are now specified (build spec sections 11, 15) — not locked-in *code* yet, since no repository exists.
- **Confirmed 2026-08-03 ("pinakamahalaga" — Bogs's words):** every user-facing statement that ships in code — UI text, button labels, error messages, instructions — must follow ASD-STE100 Simplified Technical English **and** be understandable by an elementary school student. See [[sals3-management-bible#4. Non-negotiable boundaries]] for the full rule.

### Coding practice

- **Confirmed 2026-08-03:** AI-written code must be built and delivered **component-by-component**, never as one monolithic pass — smallest complete, independently reviewable/testable unit first, verified, then composed further. See [[sals3-management-bible#4. Non-negotiable boundaries]] for the full rule and its link to the project-history lesson above.

## Implemented versus incomplete

### Implemented foundations

- None in code. In documentation: a complete, Final-status UI/UX and build specification, a distilled management bible, an 8-stage implementation register, and a capability map with a real decision record — all exist and are internally consistent as of 2026-08-03.

### Incomplete or placeholder behavior

- No Sals3 code repository exists. No design tokens, components, data model, API, or tests have been built. The "first 10 working days" (build spec section 20.6) have not started. Populate this section as real decisions and code land — do not let documentation completeness read as implementation progress.

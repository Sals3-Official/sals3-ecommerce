---
tags: [moc, hot-cache, current-state, sals3]
aliases: [Hot Cache, Recent Context Cache]
created: 2026-07-31
updated: 2026-08-05
status: current-state
authority: implementation-state
owner_approved: true
related:
  - '[[agent-operating-contract]]'
  - '[[nextjs-component-security-code-rules]]'
  - '[[project-structure-installation-and-runbook]]'
  - '[[team-profile-and-collaboration-preferences]]'
  - '[[sals3-ux-build-specification]]'
  - '[[sals3-management-bible]]'
  - '[[sals3-implementation-phases]]'
  - '[[sals3-master-blueprint]]'
  - '[[index]]'
---

# Sals3 — Current State Cache

> [!IMPORTANT] Mandatory reading gate
> Read this note first. For any codebase edit or package/config/test change, read [[nextjs-component-security-code-rules]] before editing. For project structure, package installation, or local run instructions, read [[project-structure-installation-and-runbook]]. For material work, read [[agent-operating-contract]] and [[sals3-ux-build-specification]] (the current technical authority — Final status), then [[sals3-management-bible]] for the distilled boundaries, then use [[index]] to open the relevant domain note. Historical session notes do not override current decisions.

## Current repository state

- **Confirmed 2026-08-04 — MERGED REPO, new location:** AJ merged the code repository and this Obsidian vault into one repo: **`github.com/Sals3-Official/sals3-ecommerce`** (org-owned, not a personal account — resolves the earlier "different account" question), branch `develop`. Local path `E:\sals3-ecommerce`. The vault lives at `docs/Wiki/` and `docs/Raw/` inside that repo. The old standalone vault (`github.com/louieboi09/sals3-2nd-brain`) is **deprecated/frozen** — do not edit it further.
- **Confirmed 2026-08-04:** the Obsidian vault root is **`docs/`**, not the repo root — opening the repo root as a vault would index source code as notes, which is wrong. The Git plugin's `basePath` setting is set to `"docs"` so it correctly finds the parent repo one level up.
- **Confirmed 2026-08-04 — real Next.js scaffold already exists:** `package.json`, `next.config.ts`, `tsconfig.json`, `src/`, `public/`, plus eslint/prettier/husky (lint + pre-commit tooling) — this is real Stage 1 foundation work (build spec section 20.3), already committed by AJ.
- **Confirmed 2026-08-05 — uncommitted landing-page implementation exists locally:** current workspace has a verified Next.js home page with DummyJSON product/category services, random deals, paginated "For you" products, and an Embla promo carousel. This work is **not committed or pushed**. See [[../../journal/sals3-session-2026-08-05-part01-landing-page-api-carousel]].
- **Confirmed 2026-08-05 — package added locally:** `embla-carousel-react@8.6.0` (MIT) is installed for the home promo carousel. `npm audit --audit-level=high` reports 0 vulnerabilities.
- **Confirmed 2026-08-05 — homepage verification passed:** `npm run lint`, `npm run format:check`, `npm run typecheck:clean`, `npm run build`, `npm run test:run` (15 tests), `npm run test:e2e` (desktop and mobile), and `npm audit --audit-level=high` all passed after the carousel change.
- **Confirmed 2026-08-04 — AJ and Robin already have repo access:** collaborators are `aj-garrigues`, `robindlcrz`, `louieboi09` — the earlier "AJ isn't invited yet" blocker no longer applies here.
- **CRITICAL SAFETY FINDING, confirmed 2026-08-04 by a live test:** auto-commit is **disabled** in this repo's vault (`autoSaveInterval` / `autoPushInterval` set to `0`). A real test proved the Obsidian Git plugin's "Commit-and-sync" swept up a change in `src/` (outside `docs/`) despite `basePath` being set — it does not reliably scope to the vault-only folder for this shared-repo setup. **Do not re-enable the auto-save/auto-push interval without a stronger scoping mechanism proven safe first.** Vault backups here are manual-only: trigger "Git: Commit-and-sync" deliberately, and run `git status` to confirm only `docs/` paths are staged before trusting it. Auto-pull stays on (safe — pulling doesn't commit or touch local code).
- **Confirmed 2026-08-01, Final status (not a sample):** [[sals3-ux-build-specification]] — a real, rigorous UI/UX and build specification. Platform decision: **new system, not WooCommerce** (WooCommerce is the old system, its data migrated once and then retired). This is now the canonical technical authority; [[sals3-master-blueprint]] remains valid for business-strategy narrative only.
- **Confirmed 2026-08-03:** a candidate catalog/category taxonomy dataset was ingested — [[universal-category-variation-taxonomy-reference]] (1,346-row universal category tree, generic, Shopee-ID-derived). Not yet adopted as Sals3's actual category tree.
- **Confirmed 2026-07-31 (not a sample):** the Sals3 codebase is built in **Next.js + TypeScript** — now real, not just a decision (see the scaffold above).
- `Raw/` holds: UI mockup images and the presentation deck (blueprint-era), the build spec source PDF (`sals3_ux_build_specification_2026-08-01.pdf`), and the category taxonomy workbook (`universal_category_variation_taxonomy.xlsx`, deliberately stripped of a BOGS-Dashboard-specific sheet before ingestion).
- Test coverage now exists for product-service parsing/pagination and home-page rendering, including carousel replacement, product pagination, live categories, and desktop/mobile E2E checks. No production database, real supplier import, checkout, payment, payout, tax, seller tooling, or launch workflow exists yet.

## Project history — why this rebuild exists

- Sals3's previous system was WooCommerce/WordPress, built by a prior developer who scraped/pulled items from CJ Dropshipping into it — so CJ product extraction is proven achievable in this project's context, at least at a basic level. That build was **abandoned after ~9 months with nothing shippable produced**; the owner's assessment (Bogs's words, 2026-08-03) was that the developer was incompetent. AJ and Bogs joined specifically to rebuild after that failure.
- **Lesson this vault must actively guard against:** a long, invisible build with no shipped output is exactly the failure mode that ended the WooCommerce attempt. [[sals3-ux-build-specification]]'s stage structure (section 20.3) already defends against this structurally — every stage has a concrete, checkable exit test, not an open-ended "keep building." Do not let Sals3's rebuild drift into the same 9-months-nothing-to-show pattern; if a stage has no passing exit test, say so plainly rather than reporting vague progress.

## Active product focus

Foundation/prototype work has started in code, but the full marketplace build is still early and unlaunched. Per [[sals3-implementation-phases]], the confirmed plan remains:

1. **Track A — Shopify pop-up store:** interim cash flow. Blueprint-only, not covered by the build spec.
2. **Track B — the new system:** [[sals3-ux-build-specification]]'s 8-stage build order (Foundation → Data model → Catalogue read path → Price/promotions → Cart/checkout → Orders/post-purchase → Seller tools → Migration/launch). The repository, lint/type/test/build tooling, and a verified landing-page prototype now exist. The full data model, catalogue service, pricing, checkout, orders, seller tools, migration, legal review, and launch gates are still open.

**Realistic timeline, per the build spec itself:** confirmed team is AJ + Bogs (2 full-stack developers) → **9 to 14 months to first launch, only with a reduced first release** (build spec section 21.2, 21.3). Treat this as the honest baseline, not pessimism.

Use [[sals3-implementation-phases]] for the full stage-by-stage task register, [[sals3-end-to-end-process-flow]] for the canonical flowchart, and [[sals3-feature-landscape-and-expansion-map]] for the capability map.

## Non-negotiable operating rules

### Agent behavior

- Do not act as a yesman.
- Give evidence, the strongest material objection, system impact, recommendation, uncertainty, and verification.
- Do not claim zero possible errors or describe untested behavior as verified.

### Financial integrity

- No payment, payout, or commission logic is implemented yet. The build spec's Money/PriceLine model, quote-versioning, and idempotency-key mechanisms are real and specified — but the _values_ flowing through them (commission rate, confirmed payment partners) remain pending Leadership confirmation. See [[sals3-management-bible#4. Non-negotiable boundaries]].
- RA 11967 (Internet Transactions Act) compliance is mandatory per the build spec (sections 9, 14, 17.3, 22) — the spec itself states a Philippine lawyer must still review before launch.

### Design and language

- The design token system, base components, and screen layouts are specified in the build spec (sections 11, 15), but the current codebase has not yet implemented the full token layer or 10 required base components.
- **Confirmed 2026-08-03 ("pinakamahalaga" — Bogs's words):** every user-facing statement that ships in code — UI text, button labels, error messages, instructions — must follow ASD-STE100 Simplified Technical English **and** be understandable by an elementary school student. See [[sals3-management-bible#4. Non-negotiable boundaries]] for the full rule.

### Coding practice

- **Confirmed 2026-08-03:** AI-written code must be built and delivered **component-by-component**, never as one monolithic pass — smallest complete, independently reviewable/testable unit first, verified, then composed further. See [[sals3-management-bible#4. Non-negotiable boundaries]] for the full rule and its link to the project-history lesson above.
- **Confirmed 2026-08-05:** every codebase edit, new feature, refactor, test change, configuration change, and package change must follow [[nextjs-component-security-code-rules]]. Completion requires architecture review, server-side security review where relevant, repository validation commands, and explicit reporting of any failed or skipped check.
- **Confirmed 2026-08-05:** project structure, package installation, and local run instructions are canonical in [[project-structure-installation-and-runbook]]. Update `README.md` in the same task when a feature, command, setup step, runtime behavior, package workflow, or important limitation changes.

### Git workflow

- **Confirmed 2026-08-04 (AJ's rule):** never push or commit directly to `main` or `develop` — every change, including vault-only edits, goes on its own branch first: `feat/<feature-name>`, `chore/<small-change>`, or `bug/<fixed-issue>`. Push the branch and open a PR rather than merging into `develop` directly. See [[team-profile-and-collaboration-preferences#Cross-machine git backup discipline]] for the full rule.

## Implemented versus incomplete

### Implemented foundations

- In code: Next.js + TypeScript scaffold, lint/format/type/build/unit/E2E/audit verification, local public assets, product API service wrappers, live landing-page data wiring, pagination, and a manual Embla carousel prototype are present locally. In documentation: a complete, Final-status UI/UX and build specification, a distilled management bible, an 8-stage implementation register, capability map, current runbook, and consolidated lessons exist.

### Incomplete or placeholder behavior

- Landing-page product data currently uses DummyJSON, not real Sals3 catalog data. The carousel uses local static promo images. No production database, seller ownership model, real product/variant/category contract, cart, checkout, payment, payout, tax, courier, support workflow, or launch process exists yet. The code work is uncommitted.

## Recent session notes

- [[../../journal/sals3-session-2026-08-05-part01-landing-page-api-carousel]] — DummyJSON landing-page services, random deals, live categories, paginated "For you" grid, Embla carousel, verification, and lessons learned.

## Latest reusable lessons

See [[sals3-skills]] for the full notes.

- Next.js 16 `next/image` quality values are allow-listed.
- `.next-typecheck-tmp-*` generated folders can poison ESLint after interrupted `typecheck:clean`.
- Prompt-attached images must become verified local assets before site integration.
- Ecommerce promo carousels need manual, testable controls by default.

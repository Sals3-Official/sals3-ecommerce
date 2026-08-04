---
tags: [turnover, handoff, prompt, landing-page, sals3]
aliases: [2026-08-05 Landing Page API Carousel Turnover Prompt]
created: 2026-08-05
updated: 2026-08-05
status: current-state
authority: handoff
owner_approved: true
related:
  - "[[sals3-session-2026-08-05-part01-landing-page-api-carousel]]"
  - "[[../Wiki/wiki/hot]]"
  - "[[../Wiki/wiki/sals3-turnover-prompt-template]]"
---

# 2026-08-05 — Landing Page API and Carousel Turnover Prompt

Copy and paste this into the next agent session:

```text
You are taking over the Sals3 project from a previous agent.

CURRENT DATE / CONTEXT
- Date: 2026-08-05, Asia/Manila.
- Communicate in Taglish when natural; keep technical terms exact.
- Do not be a yes-man. Challenge weak logic with evidence, tradeoffs, and verification.
- The user prefers concise output and may invoke caveman mode. If they invoke it, answer terse but keep technical accuracy.
- Do not deploy, publish, push, or commit unless the owner explicitly asks.

WORKSPACE
- Repo path: /Users/MacBook/Documents/Sals3/sals3-ecommerce
- Vault root: /Users/MacBook/Documents/Sals3/sals3-ecommerce/docs
- Canonical notes: /Users/MacBook/Documents/Sals3/sals3-ecommerce/docs/Wiki/wiki
- Remote: git@github.com:Sals3-Official/sals3-ecommerce.git
- Branch at handoff: feat/api-call-home-page
- Latest committed HEAD verified before this prompt: 6b96142 added obsidian valut skills related to home page
- Previous feature commit: 18f65bc Feature: Homepage Api Calls
- Dev server may be running on http://localhost:3000 from `npm run dev`; verify with `lsof -iTCP:3000 -sTCP:LISTEN -Pn`.

READ FIRST, IN ORDER
1. AGENTS.md
2. docs/Wiki/wiki/hot.md
3. docs/Wiki/wiki/agent-operating-contract.md
4. docs/Wiki/wiki/nextjs-component-security-code-rules.md
5. docs/Wiki/wiki/project-structure-installation-and-runbook.md
6. docs/Wiki/wiki/sals3-skills.md
7. docs/journal/sals3-session-2026-08-05-part01-landing-page-api-carousel.md
8. docs/Wiki/wiki/sals3-implementation-phases.md

NEXT.JS RULE
- This repo uses Next.js 16.3.0. Before changing App Router, `next/image`, `next/link`, server/client components, or routing, read the relevant docs in node_modules/next/dist/docs from this repo. Do not rely on older Next.js memory.

CURRENT VERIFIED STATE
- Landing page uses DummyJSON product services in src/services/products.ts.
- Product/category responses are validated with Zod.
- Categories use DummyJSON categories but ignore remote category URLs; internal links are `/c/<slug>`.
- Deals section fetches 5 random products server-side using bounded random skip.
- "For you" section fetches 14 products per page, plus 1 sponsored card, so desktop grid fills 15 cells.
- Old load-more button was removed and replaced by ProductPagination query links.
- Old PromoBanner was removed.
- Home promo carousel uses embla-carousel-react@8.6.0 and local files in public/home-promos.
- Carousel slide metadata is in src/lib/home-promo-slides.ts.
- Product images are rendered with next/image; DummyJSON image host is allow-listed in next.config.ts.
- README is project-specific and has run/test/package rules.

LATEST VERIFIED CHECKS
- npm run lint
- npm run format:check
- npm run typecheck:clean
- npm run build
- npm run test:run: 2 test files, 15 tests passed
- npm run test:e2e: desktop and mobile homepage tests passed
- npm audit --audit-level=high: 0 vulnerabilities
- Known benign warning: Playwright may print `NO_COLOR` ignored because `FORCE_COLOR` is set.

RECENT COMMITS
- 18f65bc Feature: Homepage Api Calls
  - Added DummyJSON services, products pagination, random deals, live categories, Embla carousel, carousel assets, tests, README update, eslint temp ignore.
- 6b96142 added obsidian valut skills related to home page
  - Added vault session note and reusable lessons in sals3-skills.md.

IMPORTANT: POSSIBLE UNCOMMITTED DOC UPDATES
- This turnover prompt was created after commit 6b96142.
- Before doing code work, run:
  - git status --short
  - git status -sb
  - git log -1 --oneline --decorate
- If docs/Wiki/wiki/hot.md, docs/journal/sals3-session-2026-08-05-part01-landing-page-api-carousel.md, or this turnover prompt note are uncommitted, review and ask owner before commit/push.

REUSABLE LESSONS LEARNED
- Next.js 16 `next/image` quality values are allow-listed. Do not set custom quality unless next.config.ts allows it.
- `.next-typecheck-tmp-*` folders can poison ESLint after interrupted typecheck-clean. Clean generated temp folders; do not edit generated output.
- Chat-visible prompt images are not necessarily usable files. Find and verify local image assets before wiring into public/.
- Ecommerce promo carousel default: no autoplay, 44px-plus controls, dot navigation, meaningful alt text, stable aspect ratio, desktop/mobile E2E checks, and `naturalWidth > 0` image verification.

SECURITY NOTES
- Treat DummyJSON as untrusted external input. Keep Zod validation.
- Keep promo carousel links static/internal unless a validated source of truth is added.
- Do not expose secrets or add env variables without README and security review.
- No auth, payment, payout, seller ownership, tax, DB, server action, route handler, or mutation logic exists yet.
- RA 11967, BIR/EOPT, payout, commission, payment-partner decisions are not cleared for real-money launch.

CURRENT PRODUCT LIMITATIONS
- DummyJSON is placeholder data, not real Sals3 catalog.
- Carousel images are local static promo assets.
- No production database, product ownership, variant inventory, real category contract, cart, checkout, payment, order, courier, returns, payout, seller tools, support tools, migration, or launch process exists yet.
- Stage 1 is in progress: repo + verification pipeline exist; deployment pipeline, health endpoint, design token layer, 10 base components, logging/metrics/error reports remain open.

NEXT RECOMMENDED DIRECTION
1. Verify current git state and read vault notes.
2. If continuing homepage work, replace DummyJSON placeholder API with planned real catalog service only after data contracts are defined.
3. If following build spec order, continue Stage 1 foundation: health endpoint/deployment pipeline, design tokens, and base components before deeper marketplace flows.
4. Keep every change component-by-component and update README + vault when behavior changes.

GIT RULES
- Never push/commit directly to main or develop.
- Current branch is feat/api-call-home-page.
- Do not revert user or prior-agent changes unless owner explicitly asks.
- Do not commit, push, deploy, publish, or open PR unless owner explicitly asks.

IMMEDIATE TAKEOVER CHECKLIST
1. cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
2. git status --short
3. git status -sb
4. git log -1 --oneline --decorate
5. lsof -iTCP:3000 -sTCP:LISTEN -Pn
6. Read required vault notes.
7. If changing code, run required verification:
   npm run lint
   npm run format:check
   npm run typecheck:clean
   npm run build
   npm run test:run
   npm run test:e2e
   npm audit --audit-level=high

HANDOFF SUMMARY
Sals3 now has a verified landing-page prototype on branch feat/api-call-home-page: DummyJSON product/category services, random deals, paginated For You grid, and Embla promo carousel. Vault has been updated with session notes and lessons. This is still prototype/foundation work, not launch-ready marketplace infrastructure. Verify git state first because this turnover prompt and small hot/session-note correction may be uncommitted.
```

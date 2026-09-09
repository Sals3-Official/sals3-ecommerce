---
tags: [project/sals3, canonical, domain-spec]
aliases: [Sals3 Management Bible, Sals3 Master Plan, Sals3 Product Bible]
created: 2026-07-31
updated: 2026-09-10
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
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-012-supplier-trend-signals-and-storefront-merchandising]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-10-part21-aj-product-filtering-automation-and-stock-sync]]"
---

# Sals3 Management Bible

> [!IMPORTANT] Domain authority
> This note is a navigational distillation, not the primary source. For technical rules, always defer to [[sals3-ux-build-specification]] (Final status, 1 August 2026) — it is the authoritative build spec, and this note must not contradict it. Use [[sals3-implementation-phases]] for the complete task list and build status. Use [[sals3-end-to-end-process-flow]] for the canonical flowchart. [[sals3-master-blueprint]] preserves the earlier 3-pillar/Shopify strategy as historical sample material; Shopify is no longer an active Sals3 track. Historical session notes do not override current approved decisions.

> [!WARNING] Still draft at the distillation level
> `owner_approved: false` here reflects that this summary note has not been line-reviewed as a whole. The build specification and approved ADRs remain the governing sources. Supplier curation is now governed by ADR-001; payment-provider commercial values and market-specific legal/accounting treatment remain open.

> [!IMPORTANT] Living design
> Follow this specification strictly during implementation once approved. A better owner idea is allowed. Review its impact, update this specification or an architecture decision, then implement it. Do not preserve a weaker design only because it was written first.

## 1. Product purpose

Sals3 answers:

- what a buyer can browse, order, and pay for (Pillar 2 — Customer Shopping Website);
- what a seller/supplier can list, fulfill, and get paid for (Pillar 3 — Enterprise Seller Center).

## 2. The active platform surfaces

1. **Custom B2C customer website (`sals3.com`):** where buyers shop.
2. **Custom Sals3 Enterprise Seller Center:** where sellers/suppliers work.

The earlier Shopify pop-up surface is retired. See [[sals3-master-blueprint#2. The 3 Core Pillars of Sals3 Architecture]] only for historical context.

## 3. Canonical item lifecycle

The current lifecycle (supplier discovery → automated evidence-based screening → taxonomy mapping → controlled content/media validation → destination pricing → green auto-publication or yellow attention/red exception → verified payment → direct fulfillment → tracking/reconciliation → delivery/refund/settlement) is canonical. See [[sals3-end-to-end-process-flow]] for the maintained flowchart.

## 4. Non-negotiable boundaries

### Confirmed, Final status (from [[sals3-ux-build-specification]] — real rules, not samples)

- **Platform decision:** a new system, not WooCommerce. WooCommerce is the source of the old data only, imported once (build spec section 18).
- **Truthful estimates and one confirmed total:** browse estimates are labelled. After destination selection and quote confirmation, every surface uses the same versioned server quote; a change requires explicit reconfirmation before payment. The client never calculates a trusted total (ADR-003; build spec sections 16.1 and 16.4).
- **Real-time stock guard:** an out-of-stock variation must not remain purchasable (section 6.3, consistent with the earlier blueprint framing).
- **Truthful identity and fulfillment:** show the real merchant, fulfillment source, delivery promise, and return terms. Claim branded/white-label fulfillment only when the actual supplier path supports it.
- **Separate seller business models:** Retailer and Dropshipper use separate registrations, accounts, and logins. One account has one immutable business model. Dropshippers source only through healthy approved supplier connections they own; Retailers do not receive supplier-sourcing capabilities by default. See ADR-006.
- **Immutable accepted orders:** supplier or seller changes may protect/pause future sales but never rewrite an accepted order. Preserve the exact purchased revision, variant, price, terms, controlled media, and supplier binding; route anomalies through actionable in-app/push/email attention and explicit fulfillment exceptions. See ADR-007.
- **Separate supplier and marketplace money:** each Dropshipper owns and funds its installed supplier accounts. CJ/AliExpress charge the seller for fulfillment; they do not pay Sals3 seller proceeds. Sals3 commission and seller payout come from the customer-sale payment/ledger rail. Zero supplier funding blocks automatic new fulfillment without blocking catalog access. See ADR-008.
- **Evidence before automated catalog action:** every publish, block, pause, merge-affecting decision, or other catalog side effect must be reproducible from preserved evidence, a policy/algorithm version, stable reason codes, and audit. Non-blocking quality/operational warnings may publish with attention; unresolved legal, IP, safety, permit, mapping, media-rights, evidence, or near-duplicate uncertainty requires pre-publication review. New enforcement rules pass golden-set, shadow, measured promotion, and bounded-canary gates under ADR-010.
- **Complete and explainable supplier discovery:** `All Supplier Products` is a raw provider browser, not proof of evaluation. Automatic ingestion must make bounded but eventual progress through every healthy seller-owned connection using persistent hot/backfill checkpoints; queue admission records whether the product is new, materially changed, stale, policy-affected, or retry-due. For CJ, checkpoint by category/listing time and split only when an observed partition reaches the 6,000-record ceiling. Positive pilot scope precedes expensive evidence calls. Policy changes and evidence expiry trigger re-evaluation, connection failures remain isolated, and no product is treated as delisted from a partial or failed scan. An intentional **Supplier Apps -> Disconnect** is an event-driven pause, not `EVALUATION_FAILED`: affected work is temporarily unavailable without supplier polling, and **Reconnect and resume evaluation** verifies credentials and performs a bounded audited requeue. See ADR-010 section 12 and ADR-013.
- **Seller-first media with supplier-original evidence:** preserve supplier originals in the Product Editor regardless of the chosen storefront set. A seller may use own pictures first or supplier pictures; no eligible own picture resolves to approved supplier fallback. Only controlled, rights-known revision assets publish, and Product Catalogue exposes a separate media-source/review status. See ADR-011.
- **Qualification before popularity:** CJ trending/listing counts and future Sals3 engagement/order outcomes affect merchandising only after publication eligibility. Portal owns source snapshots, versioned ranking, and protected published output; ecommerce renders `Trending now` and never calls CJ directly. Listing count is not sales, and cannot justify `Best seller` or `Deals`. See ADR-012.
- **Evidence fidelity without speculative complexity:** preserve CJ's total, CJ-warehouse, factory, and verified-warehouse inventory fields separately. Stock origin does not prove a destination freight route; publication and checkout validate freight independently. Factory-backed inventory is handled by versioned policy, not rejected by default. Phase 1 uses explicit live-product webhook subscriptions with reconciliation, visible points/inactivity recovery, an allowlist of supported product modes, and the simple daily trend V0. GTIN/channel feeds, automated physical-sample software, external-search repair, advanced trend models, per-product return rules, and recall automation remain parked until a real trigger exists. Google references are optional channel-compatibility evidence, never Sals3 core authority. See ADR-013 and [[parked-ideas-backlog]].
- **Core automation and stock truth stay inside Sals3:** the pilot uses the protected scheduler plus PostgreSQL leases, retries, evidence, decisions, audit, and Exception Queue. Vercel Pro Cron/Queues is a conditional future delivery layer after beta/cost/reliability review; n8n is peripheral only and never owns qualification, tenant authorization, inventory/publication eligibility, or audit truth. Verified/deduplicated CJ stock callbacks re-evaluate the exact variant and update future availability, with scheduled reconciliation and checkout validation as backstops. Zero stock never deletes a Product or silently rewrites an accepted order. See [[sals3-session-2026-08-10-part21-aj-product-filtering-automation-and-stock-sync]].
- **Forbidden patterns:** no false urgency/scarcity, fabricated comparisons, dark patterns, forced account before purchase, pre-selected extras, or silent increase after a confirmed quote. Apply the consumer law for Sals3 and each enabled market; RA 11967 is one market-specific example.
- **Idempotency and money safety:** checkout and refund require an idempotency key; money is stored as an integer in minor units, never a decimal (section 16.3, 16.4).
- **Team-size reality:** confirmed team is AJ + Bogs (2 full-stack developers) — build spec section 21.2 puts this at **9 to 14 months to first launch, only with a reduced first release** (section 21.3). Do not plan against a faster timeline without changing the team size first.
- **Language rule for every user-facing statement in the actual code (confirmed 2026-08-03, "pinakamahalaga" — Bogs's words):** all UI text, button labels, error messages, and instructions must follow **ASD-STE100 Simplified Technical English** (the build spec already mandates this for documents, section 1.4 — this extends it explicitly and permanently to code output) **and must be understandable by an elementary school student.** Treat "would a grade-schooler understand this sentence" as a real, checkable bar for every string that ships, not just a style preference — short sentences, one instruction per sentence, plain active-voice words, no jargon left unexplained.
- **Notes merge to `Sals3-Official`, code merges to `anythingsupplies`, and every release walks SIT → UAT → Main with the same test at each stage (owner rule 2026-09-10):** all three websites — Global, FJ and AU — move together, no stage is skipped, and an untested stage is a failed stage. Either the team or the AI may run the test, and whoever does says what they observed. Full rule in section 7 below.
- **Every commit and pull request declares what it left undone (owner rule 2026-09-09):** a `Pending` block naming each unfinished item and its urgency (P0-P3), mirrored into [[pending-register]] in the same task. `Pending: none` when there is genuinely nothing, so an omission cannot be mistaken for a clean change. Full rule in section 6 below.
- **AI-written code must be built and delivered component-by-component (confirmed 2026-08-03):** never write a whole page, feature, or service in one monolithic pass. Build the smallest complete, independently reviewable component first, verify it actually works, then compose the next one on top of it — matching the build spec's own Stage 1 component list (button, input, chip, card, sheet, dialog, tabs, badge, skeleton, toast) and service boundaries (BFF, Catalog, Pricing, Cart, Order, Seller — section 16.1). This is the same "smallest coherent move" discipline as [[autonomous-loop-sop]], applied specifically to how an AI agent should write Sals3 code — and it is a direct structural defense against the invisible-progress failure that killed the prior WooCommerce build (see [[hot]]'s project history). A code change with no isolated, checkable component boundary is a sign the step is too big.

  > [!NOTE] Clarification (2026-08-03) — this is not "keep every file short"
  > "Component-by-component" is about **one clear responsibility per piece** and **build-then-verify-then-continue**, not a line-count rule. A genuinely complex piece (e.g. the checkout page — progressive disclosure, price-version checking, idempotency key, section 8) can legitimately be a large file, and that's fine, as long as it still does one clear job and was verified on its own before being composed with other pieces.
  >
  > What's actually forbidden is **mixing unrelated jobs into one piece** — e.g. one file that builds the Add Product form UI, calls the CJ API, runs category matching, *and* writes to the database, all tangled together. That's the real failure mode: not "too many lines," but "too many unrelated responsibilities in one place," which is exactly what makes a bug hard to find and a change risky.
  >
  > - ❌ Monolithic: one file/component doing form UI + CJ connector + category matcher + database save, all mixed.
  > - ✅ Component-by-component: separate pieces for the form UI, the CJ connector, the category matcher ([[sals3-cj-dropshipping-integration-plan]]), and the save step — each verified alone, then composed.

### Still pending Leadership/business confirmation (from [[sals3-master-blueprint]], not covered by the build spec's stated scope)

- **Exact commission rate and confirmed payment partners:** the build spec's promotion/pricing engine (section 17) is a real, buildable mechanism, but the *values* that flow through it (fees, rates, which payment methods) are still business decisions Leadership must confirm.
- **Market-specific legal/accounting treatment:** confirm incorporation, enabled markets, tax/invoice rules, consumer disclosures, and the qualified advisers for each launch market before real money moves. Older Philippine-specific rules cannot be assumed to cover an Australian-based business or every destination market.

## 5. What exists now vs. what's still open

As of 2026-08-06, [[sals3-ux-build-specification]] provides the target model, API contracts, component/token system, and 8-stage build order. Approved ADR-001 through ADR-005 refine catalog, taxonomy, pricing/shipping, fulfillment, and payment/COD. What remains open:

- A real codebase and partial storefront exist, but no production Sals3 catalog, secure admin, checkout, payment, fulfillment, return, or Seller Center workflow is implemented; see [[hot]].
- [[universal-category-variation-taxonomy-reference]] is adopted as Taxonomy v0 for pilot use, but real-product mapping, form rules, and provenance/license review are not production-validated.
- Payment gateway, courier, and hosting/CI providers are unconfirmed (per [[team-profile-and-collaboration-preferences]]).
- The business/marketing plan (pricing strategy, launch marketing) is explicitly out of this bible's and the build spec's scope — that's [[sals3-master-blueprint]] territory, and even there marked sample.

Update [[hot]] with real state as work happens; do not let this bible imply more implementation progress than exists.

## 6. Every commit and pull request declares what it left undone

**Owner rule 2026-09-09 (Bogs). Binding on every agent, every time.**

Every commit message and every pull request body must carry a **Pending** block
naming what is still not done and how urgent each item is — and the same items
must be added to [[pending-register]] **in the same task**.

### Why both places

Declaring a pending item only in the commit or the PR makes it traceable but not
findable: nobody re-reads three hundred pull requests to reconstruct a backlog.
Declaring it only in the register loses the link to the work that raised it. So
the commit or PR is where the claim is made at the moment it is true, and the
register is where it can be read as a list and worked down.

This exists because a session that produces a lot of documentation also produces
a lot of *"and this is still owed"* — and those sentences used to live in chat
scrollback and disappear.

### The block

```markdown
## Pending
- **[P1]** <what is not done> — <why it matters>
- **[P3]** <what is not done> — <why it matters>
```

**When nothing is pending, write `Pending: none`.** An explicit *none* costs one
line and separates "there was nothing" from "somebody forgot", which is the whole
difference between a register you can trust and one you cannot.

### Urgency levels, judged by consequence

| | Meaning | Timing |
|---|---|---|
| **P0** | Money or data is wrong **right now** — a buyer charged incorrectly, an order lost, a record being corrupted | Before the next merge |
| **P1** | A decision is blocked, or a live surface tells someone something untrue | This week |
| **P2** | A known gap with a workaround that keeps costing time | Scheduled |
| **P3** | Hygiene and debt; nobody is harmed | When next touching that area |

Where two levels seem to fit, take the higher one and say why. A level argued
down without evidence is how a P0 becomes a P3.

### What counts as pending

Anything the change deliberately did not finish, and anything found in passing
and not fixed. Three things that are **not** pending items, because each has its
own home and duplicating them creates a second source of truth:

- an idea the owner told you to **park** → [[parked-ideas-backlog]];
- something wrong in **production right now** → [[hot]]'s *Active risks and
  blockers* carries the evidence, and the register carries a one-line pointer to
  it rather than a copy;
- a **decision** that changed → an ADR amendment.

### Enforced, not merely expected

`.husky/commit-msg` runs `scripts/check-pending.mjs`, which refuses a commit
message carrying neither an explicit `Pending: none` nor at least one item tagged
`[P0]`–`[P3]`. Git's own generated messages — merges, reverts, `fixup!`,
`squash!` — are skipped, because rejecting those would block ordinary history
operations over a rule about authored work.

The check is loose about layout and strict about the one thing that matters: a
**level**. An untagged *"still to do: X"* does not pass, because a level is what
makes the register sortable and what stops a P0 being worked last.

A commented-out declaration does not count either — `# Pending: none` is a git
comment and never reaches the message.

The same script validates a PR body before you open it:

```bash
node scripts/check-pending.mjs --stdin < pr-body.md
```

This exists because the rule was written on 2026-09-09 with nothing enforcing it,
and its own register entry said so: *rules that depend on memory decay* — which is
exactly what happened to [[sals3-skills]], four weeks stale before anyone noticed.

### Closing

An entry closes when its stated condition is observably met — not when someone
believes it is handled. Strike it through in the register with the date and the
closing PR, and leave it for a month before deleting.

> [!NOTE] This rule is about honesty, not paperwork
> The point is that unfinished work stays visible and keeps its urgency after the
> conversation that produced it has ended. An agent that writes `Pending: none`
> on a change that plainly left something owed has done something worse than
> skipping the block, because the register then reads as complete when it is not.

## 7. Where things merge, and the three stages every release walks

**Owner rule 2026-09-10 (Bogs). Strict adherence. Binding on every agent and
every teammate, every time.**

### 7.1 Two repositories, two purposes

| What | Where it merges |
| --- | --- |
| **Notes and vault** | the old git — **`Sals3-Official`** |
| **Code** | **`anythingsupplies`** |

Nothing else. A vault file must never reach the code org, and code must never
land in the vault repository. This is the boundary
[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]] carries
in full; it is repeated here because the bible is read before any ADR is.

### 7.2 Every release walks three stages, in order, and is tested at each

```
SIT  →  test  →  UAT  →  the same test  →  Main  →  test again
```

**All three websites go through it together** — Global, FJ and AU:

| Site | Repository | SIT | UAT | Main |
| --- | --- | --- | --- | --- |
| **Global** | `sals3-ecommerce` | `sit.sals3.com` | `uat.sals3.com` | `sals3.com` |
| **FJ** | `sals3.com.fj` | `sit.sals3.com.fj` | `uat.sals3.com.fj` | `sals3.com.fj` |
| **AU** | `sals3.com.au` | `sit.sals3.com.au` | `uat.sals3.com.au` | `sals3.com.au` |

**No stage is skipped, and no stage is entered before the one below it has been
tested and passed.** A stage that has not been tested has not been passed — an
absent result is a fail, not a neutral.

**The same test runs at every stage.** UAT does not get a lighter check than SIT
because SIT was green, and Main does not get a lighter check than UAT. That is
the point of running it three times: each stage is a different deployment with
its own configuration, and a pass at one proves nothing about the next.

**Either the team or the AI may run the test.** Whoever runs it says so, and
records what they actually observed — not "tested", but which site, which stage,
and what was seen. An untraceable pass is the same as no pass.

> [!NOTE] These are the same three stages ADR-019 names by branch
> `SIT` is `develop`, `UAT` is `pre-prod`, `Main` is `main`. The environment
> names are what the team says; the branch names are what git sees. They are one
> gate, not two — and ADR-019 also carries the mechanics: a promotion merges
> **with a merge commit, never a squash**, and the pre-flight is
> `git merge-base --is-ancestor origin/develop origin/pre-prod`.

### 7.3 Why this is written here and not only in the ADR

Before 2026-09-10 the gate lived only in ADR-019, which `AGENTS.md` did not
require anyone to read. Reaching the rule meant noticing one line in `hot.md`,
following a wikilink, and finding the right amendment — three optional steps. In
that gap every promotion was squash-merged for weeks, leaving `pre-prod` and
`main` with 54 and 55 commits no other branch had, until a one-line fix could not
be promoted at all.

A rule that has to be discovered is a rule that will be missed.

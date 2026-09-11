---
tags: [sals3, adr, admin-portal, governance, platform-controls, audit]
aliases: [Sals3 Admin Portal, Platform Control Plane, Global Platform Governance]
created: 2026-08-10
updated: 2026-09-11
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: not-started
related:
  - "[[hot]]"
  - "[[sals3-ux-build-specification]]"
  - "[[agent-operating-contract]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[sals3-repository-register]]"
  - "[[pending-register]]"
  - "[[sals3-session-2026-09-11-part169-the-eleven-repositories-and-the-admin-portal-nobody-audited]]"
---

# ADR-014 — Admin Portal platform governance and global controls

## Status

`approved`

> [!IMPORTANT] Approved direction; not implemented
> Bogs approved the future product boundary and the name **Admin Portal** on 2026-08-10. This ADR does not authorize implementation now. **Read the 2026-09-11 amendment at the foot of this note before using the capability-domain list**: a seventh domain (catalogue category governance) was built, withdrawn, and redistributed on 2026-08-15, and its platform-wide half is live in `sals3-portal` under a string-constant actor. Current work remains focused on correcting `sals3-portal`; the Admin Portal starts only through a separately approved implementation slice.

## Problem

Sals3 needs one trusted internal surface to govern platform-wide decisions that must apply consistently across the Seller Portal and customer website. These decisions cannot live as scattered frontend constants, seller-editable fields, or client-side switches.

Examples include deciding which countries may host authorized sellers, which countries may receive buyer purchases/deliveries, suspending a seller account, disabling a supplier/provider during an incident, and publishing platform-wide marketing. Seller operating-country eligibility and buyer destination-country eligibility are different policy dimensions: enabling one must never imply the other. Without a separate authority, Portal and website behavior can drift, high-impact actions can bypass review, and historical decisions become difficult to explain or audit.

The Seller Portal is tenant-facing. A seller must never gain the authority to change global market policy, platform campaigns, another seller's status, or platform-wide provider availability.

## Evidence

- Current `sals3-portal` candidate ingestion and evaluation replaced labelled Philippine market placeholders with separate policy resolvers. The owner identified Australia as Sals3's business/seller operating country, explicitly clarified that countries allowed to sell and countries allowed to buy/receive delivery must be governed separately, and independently approved `AU` as the initial buyer destination on 2026-08-11. The buyer approval is not inferred from registration; it is its own versioned owner decision.
- `sals3-portal` has seller authentication and tenant-owned Supplier Connections, but no secure employee administration system.
- `hot.md` already lists secure employee administration as unimplemented.
- ADR-003 requires explicitly enabled markets rather than an unverified worldwide claim.
- ADR-007 and ADR-010 require audited, explainable system actions and preservation of history.
- Product Catalogue, finance, orders, payouts, and global marketing backends are not yet complete; the Admin Portal must not claim control over features that do not exist.

## Options considered

### Option A — Put global controls in the Seller Portal

This reuses an existing app, but it blurs employee/platform authority with tenant authority. It increases broken-authorization risk and makes it easier for a seller-facing route or role to acquire global privileges accidentally.

### Option B — Hard-code platform settings in Portal and website deployments

This is initially fast, but changes require code deployment, values can drift between repositories, and there is no reliable actor, reason, schedule, approval, or rollback history.

### Option C — Separate Admin Portal with a published control-plane boundary

This adds a future internal surface and security boundary, but provides one platform authority that Portal and website can consume through versioned, audited published state. This is the approved direction.

## Strongest objection

A separate Admin Portal can become premature enterprise infrastructure while the canonical Product/Variant/Offer model, publication, checkout, orders, and fulfillment are still unfinished. Building a broad internal console now would consume time without real downstream systems to govern.

The objection is valid. The Admin Portal is therefore **approved but deferred**. Current Portal work may introduce narrow server-side resolver/provider boundaries so future published Admin Portal policy can replace temporary configuration without a rewrite, but must not build fake admin screens or global mutations now.

## Decision

Sals3 will call the future internal platform-governance product **Admin Portal**.

It will be separate from seller accounts and the Seller Portal. It will become the authoritative control plane for approved platform-wide capabilities, while operational domain services remain responsible for enforcing published decisions server-side.

### Initial capability domains

1. **Market governance**
   - independently enable, disable, schedule, and version **seller operating-country eligibility**: where a seller/business may be registered, verified, and authorized to operate on Sals3;
   - independently enable, disable, schedule, and version **buyer destination-country eligibility**: where customers may purchase and receive delivery;
   - publish both through separate typed policies/allowlists with separate versions, effective periods, reasons, and audit trails; never collapse them into one ambiguous `marketCode` or infer one list from the other;
   - preserve the distinction between a platform-level country permission and future seller-specific access, product/offer eligibility, and destination-specific evidence;
   - Australia (`AU`) is the owner-stated current business/seller operating country. That fact did not automatically enable a buyer destination; Bogs separately approved `AU` as the initial buyer destination on 2026-08-11;
   - globally enabling a buyer destination only permits evaluation for that country. A product/offer still requires destination-specific freight, restrictions, compliance, and other required evidence before becoming Ready or sellable;
   - supplier stock-origin countries such as `CN` or `US` remain evidence only and never grant seller or buyer-country eligibility;
   - currency, locale, and timezone are explicit configuration dimensions and must not be used as proxies for either country policy.

2. **Seller-account governance**
   - review, suspend, disable, and restore a seller account through explicit lifecycle states;
   - require a reason, affected scope, actor, time, and recovery path;
   - block future protected activity consistently without deleting products, evidence, audit history, or accepted orders;
   - never use a client-hidden button as enforcement.

3. **Global marketing and communications**
   - create versioned, scheduled platform campaigns, banners, announcements, and seller messages;
   - separate editorial content from targeting, eligibility, placement, schedule, and approval;
   - prevent unpublished, expired, unapproved, or market-inapplicable content from appearing;
   - never fabricate prices, discounts, scarcity, sales, reviews, or qualification claims.

4. **Supplier/provider governance**
   - enable or disable an approved provider integration globally;
   - provide an audited incident kill switch that protects future supplier calls/sales at the smallest affected scope;
   - preserve seller-owned Supplier Connections and historical evidence rather than deleting them;
   - never expose supplier credentials to Admin Portal clients.

5. **Policy publication and operational oversight**
   - publish versioned policy records rather than silently changing code constants;
   - expose decision/audit/exception visibility appropriate to employee roles;
   - support rollback to the last valid published version without rewriting historical decisions.

6. **Commercial pricing governance**
   - publish only platform-owned reference-FX configuration, Sals3 commissions/fees and real platform-borne conversion/payment costs, enabled capabilities, and safety/legal guardrails under [[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments|ADR-015]];
   - never set ordinary merchant margins, merchant product prices, merchant category PIC assignments, or merchant FX adjustments; those are tenant-owned Seller Portal concerns;
   - keep reference FX, platform costs, merchant FX adjustments, merchant margins, and landed-cost inputs distinct and auditable.

### Authority and enforcement boundary

```text
Admin Portal employee action
  -> authenticated and authorized server command
  -> validation + reason + step-up/approval where required
  -> versioned decision and immutable audit event
  -> published control-plane state/event
  -> Seller Portal and website domain services enforce server-side
```

The Admin Portal does not directly trust or mutate browser state in the Seller Portal or website. Each consuming domain validates the current published policy and enforces it on its own protected server path.

### Required security posture

- real employee identity, separate from seller identity;
- least-privilege roles and explicit permissions by capability and scope;
- deny-by-default server-side authorization on every read and mutation;
- step-up authentication and confirmation for high-impact actions;
- two-person approval where risk, law, finance, or blast radius justifies it;
- immutable audit containing actor, reason, before/after state, scope, correlation ID, and time;
- optimistic concurrency/idempotency for commands and publication;
- no provider secrets, access tokens, database credentials, or unnecessary seller personal data in client payloads or logs;
- safe session revocation and immediate enforcement for suspended/disabled accounts;
- rate limiting, CSRF protection, generic production errors, and no public caching for sensitive surfaces.

### Explicitly deferred

- Admin Portal UI, routes, repository, deployment, or employee-auth implementation;
- platform commercial-guardrail UI, Seller Portal pricing UI, seller category PIC assignments, production margin values, and merchant FX-adjustment implementation;
- final role matrix and approval thresholds;
- seller suspension legal/appeal policy;
- global marketing attribution/experimentation backend;
- AU tax, payment, pricing, freight, returns, and regulatory rules;
- cross-repository event transport choice;
- any claim that Portal or website already consume Admin Portal state.

## System impact

- Data and schema: future employee identities/roles, global policy versions, seller-governance decisions, campaign publications, provider controls, audit/outbox events, and consumer checkpoints. No schema is authorized by this ADR alone.
- Modules: future Admin Portal plus narrow published-policy consumers in `sals3-portal` and `sals3-ecommerce`.
- User workflow: sellers continue to use Seller Portal; authorized Sals3 employees use Admin Portal. Seller-visible consequences must explain the status and recovery path without exposing sensitive internal details.
- Financial or compliance effect: global actions can affect many sellers/customers, so approval, audit, rollback, and smallest-scope enforcement are launch gates.
- Migration and rollback: replace temporary Portal constants through provider/resolver boundaries one domain at a time. Rollback republishes a prior valid policy; it never rewrites audit, candidate, listing, or accepted-order history.

## Required verification

- Focused tests:
  - every command denies missing/wrong employee permissions;
  - seller identities cannot access Admin Portal capabilities;
  - seller suspension/restore is idempotent and enforced server-side;
  - market/provider/campaign publication respects version, effective time, concurrency, and rollback;
  - client requests cannot choose actor, tenant, policy version, or protected scope without server validation.
- Full or cross-module tests:
  - Portal and website agree on one published version;
  - seller operating-country and buyer destination-country publications remain independently versioned and neither can populate or enable the other;
  - seller registration, supplier stock origin, currency, locale, or timezone cannot make a product destination-ready;
  - disabling a seller/provider blocks future protected actions at the required scope while history remains readable;
  - stale consumers fail safe and reconcile without duplicated actions;
  - audit/action counts reconcile and no global side effect lacks an authoritative decision.
- Manual acceptance:
  - employee roles see only authorized controls;
  - high-impact actions show scope, consequence, reason, approval, and recovery before confirmation;
  - seller-facing states are clear on desktop/mobile without exposing internal security data.
- Security review:
  - broken authentication/authorization, IDOR, CSRF, injection, open redirects, session revocation, sensitive-data exposure, audit tampering, and privilege escalation.

## Supersession

None. This ADR names and bounds the future Admin Portal. It does not supersede ADR-003, ADR-006, ADR-007, or ADR-010; their market, tenancy, immutable-history, and decision-governance rules remain controlling.


## Amendment — 2026-09-11: category governance left this ADR on 2026-08-15, and the platform-wide half came back somewhere else

> [!IMPORTANT] This ADR has read as fully current since 2026-08-11
> `status: approved`, `implementation_status: not-started`. Both are still
> broadly right — five of the six capability domains remain unbuilt. But a
> **seventh** domain was built, closed, and redistributed in a single day four
> weeks ago, and this note has said nothing about it. Raised by
> [[sals3-session-2026-09-11-part169-the-eleven-repositories-and-the-admin-portal-nobody-audited|part 169]]
> §3.3; the decision itself was recorded only in a closed pull request's comment
> thread.

> [!NOTE] Provenance
> Written 2026-09-11 from `Sals3-Official/sals3-admin-portal`
> [#4](https://github.com/Sals3-Official/sals3-admin-portal/pull/4)'s own body,
> commit and closing comment; from `git show` against branch
> `feat/category-governance-schema` at `f700c57`; and — for what shipped instead
> — from `anythingsupplies/sals3-portal` at `origin/develop`, read directly:
> `src/modules/catalog/taxonomy/authorization.ts`,
> `src/lib/auth/permissions.ts`,
> `src/modules/catalog/taxonomy/seed-category-mappings.ts`, and
> `src/app/api/internal/catalog/taxonomy/seed-category-mappings/route.ts`.
> The figures in §3 are the seeder file's own measured census, not estimates.

### 1. Category mapping was never one of this ADR's six domains — it was proposed as a seventh, and built

This ADR's *Initial capability domains* lists six: market governance,
seller-account governance, global marketing, supplier/provider governance,
policy publication, and commercial pricing. **Catalogue category governance is
not among them.** It arrived by inheritance instead:
[[ADR-002-sals3-taxonomy-and-cj-category-mapping|ADR-002]] repeatedly defers the
authority here — *"No authorization boundary for category governance exists.
ADR-014 places platform-wide category governance in the Admin Portal"* — and
`sals3-portal`'s own gate denied **every** role, `admin` included, from
2026-08-14 on exactly that basis.

`sals3-admin-portal` [#4](https://github.com/Sals3-Official/sals3-admin-portal/pull/4),
titled *"ADR-014 Stage 1"*, built it as the **seventh** nav group — its own test
changed the assertion from *exactly six ADR-014 domains* to seven. What the
branch carries, read from `f700c57`:

- `category_mapping_decisions` — `provider`, `external_category_id`,
  `observed_category_name`, `sals3_category_code`, `sals3_category_path`,
  `status`, `supersedes_id`, `decided_by_employee_id`, `reason`, `decided_at`;
- **versioned by supersession** — a revision inserts a new row and marks the old
  one `SUPERSEDED`, never overwritten — with a **partial unique index**
  enforcing at most one `ACTIVE` row per `(provider, external_category_id)`;
- `decided_by_employee_id` `ON DELETE RESTRICT`, matching the audit trail's rule;
- two audited actions, `CATEGORY_MAPPING_DECIDED` and
  `CATEGORY_MAPPING_SUPERSEDED`;
- a frozen 5,595-row copy of Taxonomy v1, duplicated rather than read across
  because Gate 0 forbids this application from touching `sals3-portal`'s
  database;
- server-side re-derivation of the category path from the submitted code, so a
  client-supplied path is never trusted.

That is this ADR's *Authority and enforcement boundary* diagram implemented
literally. It was opened 2026-08-15T13:10Z and **closed unmerged nine minutes
later**.

### 2. The owner reversed the assignment twice in one day, and the second reversal is the one that matters

The closing comment records only the first reversal:

> Closing — the owner decided the category-mapping picker should live directly
> in `sals3-portal`'s product editor instead (where products are actually
> added/modified), not as a separate admin-portal screen. Not merging this.

The second is recorded nowhere in this vault, and only in a code comment —
`sals3-portal`'s `src/modules/catalog/taxonomy/authorization.ts`, quoted in full
because it is the most precise account of the decision that exists:

> The owner reversed that assignment on 2026-08-15, **twice over**: first to
> move the decision into this application's product editor **while keeping the
> platform-wide, CJ-category-keyed effect**; then, **the same day, to drop the
> platform-wide effect entirely.** Tagging a product's Sals3 category is each
> seller's own business call about their own catalogue, on their own risk — a
> mistagged product simply sells worse under the wrong category.

The distinction between those two reversals is the whole decision. Moving a
screen is a placement change; dropping the platform-wide effect is a change of
**what kind of thing a category decision is** — from a platform classification
governed centrally, to a seller's own commercial judgement about their own
listing.

**The reasoning is sound and this amendment does not dispute it.** A wrong
category costs the seller who chose it, in their own sales, and nobody else.
That is a materially different risk profile from the one this ADR's *Strongest
objection* section was written against, and it is exactly the test that section
asks for: is there a real downstream system that needs governing, or is this
premature enterprise infrastructure?

**What follows from it, and is now true in production:**
`catalog.category_mapping.manage` exists in `sals3-portal`'s
`PORTAL_PERMISSIONS` and is granted to `admin`, `seller_manager` **and**
`seller_staff` — every role already holding `product:edit`.
`decideProductSals3Category` changes only the one product the seller had open.
`catalogue_reviewer` and `viewer` are denied, for the stated reason that
**their sessions are not scoped to one seller's own product**, which is the
tenant-scoping argument, not a platform-authority one.

### 3. The platform-wide half came back three weeks later, in the tenant application, authorised by a shared secret

This is the part no note has stated, and it is why the amendment is worth
writing rather than a one-line status change.

From 2026-09-02 the platform-wide CJ-leaf → Sals3-category mapping was rebuilt
in `sals3-portal` — not as a screen, as **reviewed decisions written in
TypeScript**. `src/modules/catalog/taxonomy/seed-category-mappings.ts` is 3,540
lines carrying **379 mappings and 50 deliberately disabled mixed buckets**,
each with its reason beside it, decided across four tiers against a measured
census of **432,654 screened candidates over 473 supplier leaves** (parts 126,
129, 134).

It is genuinely governed. The seeder calls `proposeCategoryMapping` and
`reviewCategoryMappingDecision` — *"walks the real governance flow end to end
(propose → approve-and-activate), so versioning, supersede handling,
remap-review summaries and audit events all fire the same as a human-driven
mapping decision would."* Idempotent, matched against the discovery cycle's own
category snapshot, refused outright when a category id is absent or ambiguous.

Two properties of it belong in this ADR, because they are precisely what the
*Authority and enforcement boundary* was drawn to prevent:

1. **The actor is a string constant.** `const SEED_ACTOR =
   'taxonomy-mapping-seed'`, used as **both** `actorId` on the proposal **and**
   `reviewedBy` on the approval. Proposer and approver are the same value, and
   neither is a person. Every one of the 379 platform-wide decisions carries it
   in its audit row.
2. **The authorisation is `CRON_SECRET`.** The endpoint's own comment says why,
   and says it honestly: *"this writes governance rows, not tenant data, so the
   editor session auth is the wrong shape for it."* Correct — and the shape it
   actually needs is the employee identity this ADR specifies, which does not
   exist outside `sals3-admin-portal`.

So the platform-wide capability was not abandoned. It was **routed around**:
real decisions, real supersession, real audit rows, reached through a bearer
token and a code review rather than through an authenticated employee with a
permission. The decisions are good; the boundary is the thing that is missing.

### 4. What this amendment changes

| | Before | After this amendment |
| --- | --- | --- |
| Capability domains | six, catalogue governance unnamed | six, plus a **seventh that was built and withdrawn** — recorded here, not re-opened |
| Per-product category | implied to belong to the control plane via ADR-002 | **tenant-owned, by owner decision 2026-08-15.** Out of this ADR's scope. A seller's own risk |
| Platform-wide CJ-leaf mapping | control-plane authority, unbuilt | **built and live in `sals3-portal`**, governed by propose → approve with supersession and audit, **actor `taxonomy-mapping-seed`, authorised by `CRON_SECRET`** |
| This ADR's `implementation_status` | `not-started` | **unchanged, and now narrower**: none of the six named domains has an implementation. The seventh's history is recorded, not claimed |

`status` stays `approved`. `owner_approved` stays `true` — the 2026-08-15
decision is the owner's own, twice stated, and this amendment records it rather
than revising it.

### 5. What this amendment deliberately does not do

- **It does not re-open the decision.** Per-product category tagging is the
  seller's call; that is settled and the reasoning holds.
- **It does not reinstate the closed branch.**
  `feat/category-governance-schema` at `f700c57` survives on the remote and in
  `E:\sals3-admin-portal`. It is a reference for whatever eventually carries an
  employee-identity mapping decision, not work to resume.
- **It does not decide whether `SEED_ACTOR` is acceptable.** Writing 379
  platform-wide decisions under a string constant, through a shared secret, was
  the only path available with no Admin Portal deployment and no employee
  identity in `sals3-portal` — and the decisions themselves are reviewed and
  reasoned. Whether that stays the mechanism is an owner call, raised in
  [[pending-register]].
- **It does not correct [[ADR-002-sals3-taxonomy-and-cj-category-mapping|ADR-002]].**
  ADR-002's 2026-08-21 amendment still states that *"no portal role — `admin`
  included — carries the authority to approve a mapping, because ADR-014 puts
  category governance in the Admin Portal."* Measured 2026-09-11, that is
  **false**: `catalog.category_mapping.manage` exists and three roles hold it.
  ADR-002 is its own decision record and gets its own dated amendment; the
  staleness is raised in [[pending-register]] rather than fixed from here.

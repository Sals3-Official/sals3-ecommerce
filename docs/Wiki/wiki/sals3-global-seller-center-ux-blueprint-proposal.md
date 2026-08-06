---
tags: [sals3, proposal, seller-center, ux, architecture, research-plan, pillar-3]
aliases: [Global Seller Center UX Blueprint, Seller Center UX Blueprint v2, Seller Center Bets and Cuts]
created: 2026-08-06
updated: 2026-08-06
status: proposed
authority: proposal
owner_approved: false
related:
  - "[[sals3-master-blueprint]]"
  - "[[sals3-feature-landscape-and-expansion-map]]"
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-cj-dropshipping-integration-plan]]"
  - "[[sals3-implementation-phases]]"
  - "[[parked-ideas-backlog]]"
  - "[[index]]"
---

> [!WARNING] Status: proposed, not approved, not reviewed by AJ or Bogs
> This is a product-strategy and UX-architecture pitch for Sals3's **Pillar 3 — Enterprise Seller Center** (see [[sals3-master-blueprint]], [[sals3-feature-landscape-and-expansion-map]]), not a build spec change. Per [[vault-governance-and-note-lifecycle]]'s authority order, [[sals3-ux-build-specification]] outranks this note wherever they'd conflict. Nothing here should be built without an explicit owner decision, and Seller Center work has not started in code at all — see [[sals3-implementation-phases]].

> [!NOTE] Provenance
> Source: `C:\Users\Bogs\Documents\Codex\2026-08-06\ag\outputs\global-seller-center-ux-blueprint-v2.pdf` (18 pages, ~315 KB), a Codex-generated output dated 2026-08-06. Copied into `Raw/sals3_global_seller_center_ux_blueprint_v2_2026-08-06.pdf`; original left untouched at the Codex outputs path. This is explicitly a **revision 2** ("Revised per internal review") of an earlier draft — the same outputs folder also contains `global-seller-center-ux-blueprint.pdf` (16 pages, v1), which this document supersedes on every point it covers. The v1 file was **not** separately ingested; only v2 is summarized below. The document is self-described as desk research (no interviews, no usability testing) and repeatedly flags this — see §3 below.

# Sals3 — Global Seller Center UX Blueprint (v2) — Proposal

## What changed in this revision (v2 vs. v1)

The document's own revision note lists six changes: (a) a new "v1 bets and cuts" section that funds three capabilities and explicitly cuts the rest; (b) the architecture split into a Tier 1 minimum-viable core versus a Tier 2 deferred-with-documented-debt set; (c) contribution-margin (P&L) view pushed to a Phase 4 optimization stage, gated on sellers actually entering cost data; (d) Stage 1 field research converted from a formality into a formal go/no-go gate that can kill features already on the bet list; (e) Phase 1's timeline widened from an original 8–12 weeks to 10–14 weeks against the narrower scope; (f) a new debt-register release gate and a "scope is a promise" delivery principle (additions require equal-size removals).

## 1. Executive decision

Proceed with the seller-center concept as a **product hypothesis, not validated research**. Keep the strongest operational ideas (progressive listing, print-first fulfillment, explicit financial breakdowns, contextual messaging, inline inventory editing, configurable payouts); correct the framing that borrowed behavioral-science labels as proof (drop "guaranteed net cash," drop citing the Peak-End Rule to justify payout automation); add a market-configuration layer, accessibility, low-bandwidth recovery, permissions, versioned fee rules, and a real validation program; cut everything not needed to run the first launch market honestly.

North-star: **low-training, not zero-training.** A seller should complete routine work without formal instruction, recover safely from mistakes, understand available money and why, and get contextual help when a task gets complex. Global by default (shared workflows/data contracts), local by configuration (language, currency, tax, fee, identity, logistics, payout behavior versioned per market), evidence-aware (behavioral principles are hypotheses; observed seller performance decides what ships), safe automation (financial/identity/irreversible actions stay reviewable and recoverable).

## 2. V1 bets and explicit cuts (the binding part of this proposal)

Rule stated in the doc: *"A blueprint that keeps everything prioritizes nothing... Anything not on the bet list or the cut list is by default not in v1. Additions require removing something of equal size."*

### The three funded v1 bets

| # | Bet | Why this one | v1 success signal |
|---|---|---|---|
| 1 | **Financial truth** — itemized ledger, estimated seller proceeds with rule version, estimated/pending/final state model | Opaque money is the highest-trust failure and hardest to retrofit | Sellers correctly explain their payout and its uncertainty; estimate-to-final variance tracked with reason codes |
| 2 | **Batch fulfillment with safe recovery** — multi-select, print-first labels, explicit sync states, reprint history | Highest-frequency task, largest measurable time savings, failures (duplicate shipments) are costly and visible | Orders processed per active minute improves with no increase in duplicate shipments or missed cutoffs |
| 3 | **Rapid listing with progressive disclosure** — essential fields first, conditional market requirements, save-as-draft, honest completeness state | First-session make-or-break; feeds everything downstream | Valid publish rate and time-to-first-publish improve; no hidden-requirement surprise at submission |

### Explicit v1 cuts (each has a stated revisit condition — cutting is sequencing, not rejecting)

| Cut | Reason | Revisit when |
|---|---|---|
| Contribution margin (P&L) view | Depends on seller-maintained COGS data most solo sellers won't enter; risks being empty or misleading | ≥30% of active sellers voluntarily enter cost data, or the growing-merchant segment demands it |
| Predictive prioritization / AI-assisted workflows | Optimization on top of a core that doesn't exist yet | Phase 4, after core metrics are stable |
| Multi-market configuration console (self-serve UI) | Market #1 needs versioned rules, not a rule-authoring product; config can live in reviewed files with effective dates | Second market onboarding begins |
| Full adapter marketplace / pluggable everything | One carrier, one payout-rail set, one identity provider is enough for Market #1 | Second/third market scale |
| Advanced analytics dashboards | Operational counts and exceptions suffice for v1 | Growing-merchant/high-volume segments in Phase 3+ |

## 3. Scope, evidence, and known limitations

Self-declared research status: this is a **prioritized design-and-validation backlog**, not evidence-backed decisions — those come only after the Stage 1 field research below runs. The document names its own gaps: no transparent interview sample, usability-test protocol, market breakdown, or reproducible click-count study behind the original draft; public help pages describe policy, not verified seller comprehension; named psychological effects (Hick-Hyman, Fitts, loss aversion, peak-end) have boundary conditions and still need task testing; fee/regulatory content changes, so every market rule shown in-product needs an effective date, owner, source, and rollback path.

Evidence hierarchy it uses, strongest to weakest: official standards/regulators → official platform documentation (fee/payout/currency examples, explicitly "current examples, not universal rules") → foundational behavioral studies (narrow mechanisms, not automatic proof of a UX feature) → the original draft and public seller commentary (hypotheses requiring market-specific validation).

## 4. What the original draft got corrected on

| Original framing | Revised framing | Why |
|---|---|---|
| "Zero-training Seller Center" | Low-training, self-explanatory, recoverable | No complex operational product is training-free everywhere |
| Philippine MSMEs as the design boundary | Global segments; Philippines as one reference market | Core tasks travel; market rules don't |
| "Real-time net profit" | Estimated seller proceeds (margin view deferred) | Payout isn't profit; seller costs need separate, opt-in handling |
| "Guaranteed net cash" | Estimated / pending / final settlement states | Refunds, reserves, taxes, promotions, FX, and adjustments can change the result |
| Automatic daily e-wallet payout | Opt-in schedule and eligible destinations by market | Availability, timing, thresholds, holidays, risk, and regulation vary |
| Peak-End Rule justifies payout automation | Liquidity, predictability, control, reduced manual work | Peak-end research concerns remembered experience, not payout scheduling |
| Task cards leverage Zeigarnik + endowed progress | Externalized task state, priority, risk, honest progress | Earned progress isn't endowed progress |
| Fitts's Law = automation | Fitts applies to target acquisition only | Large, well-spaced actions are defensible; automatic logistics needs separate safety evidence |
| Flat 3% + 2% fee example | Versioned itemized fee rules with confidence state | Official documentation shows multiple fee types and regional differences |
| Everything ships in the blueprint (implicit) | Three named bets, a binding cut list, a debt register | A plan that funds everything equally funds nothing adequately |

## 5. Global seller workflow model

Five recurring seller jobs, each with a friction hypothesis and target experience: **create and publish** (long forms → essential-fields-first, conditional requirements, save-draft, bulk); **fulfill orders** (status hunting → batch queue, print-first, clear cutoffs/exceptions); **manage inventory** (deep navigation, accidental edits → inline editing, undo, audit trail, low-stock thresholds); **serve buyers/resolve issues** (messages detached from orders → order-linked conversation with structured actions); **understand and receive funds** (opaque deductions → itemized ledger, status model, rule dates, configurable schedule).

Four seller segments the doc designs for, with the explicit warning "do not equate 'small seller' with 'simple business'" since a seller can move between segments by season/category/device/staffing: **solo/microseller** (mobile-first, low volume — fast defaults, plain language), **growing merchant** (moderate volume, small team — batch actions, roles, exports), **high-volume operator** (dedicated staff, scanners/printers — keyboard/scanner speed, bulk tools, integrations), **assisted seller** (agent/service-center/shared device — delegated permissions, privacy, session controls, proof of action). V1 targets only the first two segments in the first launch market.

## 6. Product architecture — minimum viable core, deferred by design

Layer stack: **Seller Experience** (Mobile/Web/Assisted) → **Global Core** (Task model, Listing, Orders, Inventory, Messaging, Ledger, Permissions, Audit) → **Market Configuration** (Language, Currency, Fees, Tax, Identity, Payout rules, Service levels — versioned rules with effective dates) → **Local Adapters** (Carriers, Banks/wallets, Tax invoices, ID/KYC, Notifications, Support).

**Tier 1 — required before Market #1, non-negotiable:** versioned fee/tax/policy rules (may live in reviewed config files, no rule-authoring UI required); explainable calculation output (every displayed amount maps to line items and a formula version); event/audit model (who changed stock, payout settings, fulfillment status, financial inputs — human-readable history); idempotent actions and sync states (prevent duplicate submissions; pending/synced/failed shown explicitly; full offline conflict resolution may simplify to "block and explain" in v1); baseline permissions (owner vs. staff separation protecting payouts/refunds/exports/account changes; fine-grained role builder deferred).

**Tier 2 — deferred with a documented-debt register** (each entry needs an owner, a written assumption, and an extraction trigger):

| Deferred capability | Acceptable v1 shortcut | Extraction trigger |
|---|---|---|
| Generic adapter contracts (carrier, identity, payout, invoice) | Direct integration with one provider per category, behind an internal interface | Second-market kickoff |
| Multi-market configuration console | Reviewed config files with schema validation | Second-market kickoff |
| Full offline queue with conflict merge | Read-only offline + queued safe actions + explicit block on conflicts | Field evidence of connectivity-driven task failure |
| Progressive fine-grained permissions | Two roles (owner, staff) with sensitive-action gating | Growing-merchant/high-volume onboarding |

Debt rule stated verbatim: *"Undocumented hard-coding is a defect. Documented, owned, dated hard-coding is a legitimate sequencing decision."*

## 7. Recommendation sets (UX detail behind the three bets)

- **A — Action and listing:** action-first overview (smallest set of tasks needing attention now, factual progress not manipulative urgency, separate required/risk/optional work, allow dismissing non-critical recommendations); rapid listing with progressive disclosure (photo/name/price/quantity first → market-specific requirements revealed as relevant → variants/bundles schema-ready but UI cut from v1 → completeness/errors/payout estimate before publish). Explicitly cites Hick-Hyman as supporting simplifying meaningful choices, not blindly hiding fields.
- **B — Fulfillment and inventory:** batch fulfillment (multi-select by status/carrier/cutoff/location/SKU, one primary print action with reprint history, auto-suggest pickup only where market policy permits, event-driven sync — never imply success before carrier confirmation); inline inventory controls (direct entry for large changes, steppers for small, immediate undo, audit trail, review gate for unusually large/destructive/cross-location changes, explicit block-and-explain on concurrent edits rather than silent last-write-wins).
- **C — Financial transparency:** retires "gross price minus fees = guaranteed net cash" as inaccurate copy. V1 funded formula — **estimated seller proceeds** = item revenue + collected shipping + platform subsidy − platform fees − seller-funded discounts − tax/withholding − known adjustments, labeled estimated with a rule version; **final settlement** = posted credits − posted deductions for the period, tied to a reconciled ledger. Contribution margin (proceeds − COGS − packaging − advertising − fulfillment) stays deferred to Phase 4 and must never infer missing seller-entered costs as zero. Three required financial states: estimated / pending / final, each with a specific UI obligation (assumptions and uncertainty notice; holds/reserves/refund windows; traceable settlement ID and downloadable records).
- **D — Context and payouts:** order-linked conversational hub (unify buyer messages, order events, support cases, dispute alerts around the order, not one undifferentiated stream; structured actions for invoice/refund/discount/address/proof/tracking); configurable payout experience with an explicit do/do-not table — show eligible destinations/currency/timing/thresholds/fees by market, allow opt-in schedules where permitted, require strong re-authentication and a cooling-off mechanism for destination changes, show every settlement state (scheduled/processing/sent/deposited/failed/held/reversed) — versus never promising instant/daily payout where settlement doesn't support it, never assuming e-wallets are universal, never removing identity checks to reduce friction, never using one success state that implies funds are already visible.

## 8. Global readiness requirements

A table of 8 dimensions (language/direction, currency/numbers, time/service levels, fees/tax/invoices, identity/permissions, payouts, logistics, connectivity, accessibility) each with a global-core requirement and market-configuration examples — e.g. decimal-safe money model with explicit currency codes globally, symbol placement/grouping/FX disclosure per market; WCAG 2.2 AA as the global accessibility target. The Philippines is explicitly treated as **one launch-market configuration** (language, tax/withholding, GCash/Maya eligibility, local banks, courier rules, COD, address conventions, connectivity), not assumptions baked into the shared product core — directly consistent with this vault's existing "new system, global core, Philippines is Market #1" framing. Per Tier 2 above, generic adapter contracts and the configuration console itself are deferred — Market #1 can use direct, documented integrations.

## 9. Behavioral design — keep, reframe, or retire

A verdict per named effect: **keep** progressive disclosure (stage complexity, preserve visibility of mandatory requirements) and Fitts's Law (target size/spacing/distance, never to justify automation) and "mental context without theater" (link messages/order state/deadlines/actions); **narrow** Hick-Hyman (structuring meaningful alternatives, not equating every long form with the law); **reframe** loss aversion (a caution about unexpected deductions, validate comprehension directly) and the Zeigarnik Effect (honest task visibility, not reliance on unfinished-task tension); **retire for payouts** the Peak-End Rule (doesn't establish daily automated payout is the right schedule); **remove the label** from "endowed progress" (a truthful "3 of 5 packed" is earned, not endowed) and "System 1 automation" (describe reduced choices/defaults/error recovery instead of a broad dual-process claim). States a 5-step evidence gate for every behavioral claim: state the mechanism precisely → define a comparison → measure task outcome/errors/comprehension/downstream impact → check for harm (pressure, accidental action, hidden requirements, exclusion, false certainty) → keep only if observed outcomes justify it.

## 10. Research and validation plan

- **Stage 1 — Discovery and workflow evidence, now a formal GO/NO-GO GATE** (new in v2): 4–6 priority markets differing in language/payment rails/logistics maturity/regulatory context/connectivity; recruit solo, growing-team, and high-volume/assisted sellers; contextual interviews, screen walkthroughs, artifact review, task diaries; map actual exceptions (failed pickup, refund, partial fulfillment, inventory conflict, identity review, payout hold, account change). **Gate output:** each friction hypothesis is marked confirmed/revised/killed with evidence — a killed hypothesis removes its feature from the bet list and the cut list is re-balanced.
- **Stage 2 — iterative prototype testing** across 6 tasks (publish a product, print/hand off a batch, correct inventory, explain expected payout, change payout destination, recover from offline failure), each with a named critical observation and pass signal.
- **Stage 3 — market pilot**, instrumented, spanning at least one payout cycle and common refund/return windows, reviewed by market/segment/device/language/accessibility/volume so a local failure can't hide inside a global average; a research repository tracks evidence/decision/owner/confidence/date and re-tests when policy or integrations change materially.

## 11. Measurement framework and release gates

Seven outcome areas (listing quality, fulfillment speed, inventory accuracy, financial clarity, payout reliability, accessibility, global quality) each paired with primary measures and a guardrail metric (e.g. financial clarity's guardrail is "misleading certainty, unexplained adjustment, dispute volume"). Six release gates: core usability, financial truth (every displayed amount maps to a ledger line item and a versioned rule), market readiness (market-owner review of localized rules/copy/currency/time/identity/logistics/payout), security and permissions (appropriate authentication/notification/audit/least-privilege for sensitive changes), accessibility (WCAG 2.2 AA + assistive-tech testing on core flows), operational recovery (explicit seller-facing states and support paths for failed sync/carrier errors/payout failures/outages), and a **new debt-register gate**: every Tier 2 shortcut documented with owner, assumption, and extraction trigger — no undocumented hard-coding in shipped code.

## 12. Implementation roadmap (re-scoped in v2)

| Phase | Focus | Deliverables | Exit condition |
|---|---|---|---|
| 0 — Evidence and policy foundation, 4–6 wks | Stage 1 discovery (go/no-go), event model, fee/policy schema, security/accessibility requirements | Confirmed/revised/killed hypothesis register; market rules documented with owners and confidence | Stage 1 gate passed; bet list re-confirmed |
| 1 — Trustworthy operating core, 10–14 wks | The three bets only, plus Tier 1 architecture | Core tasks pass usability, financial-truth, accessibility, and recovery gates | Bets meet their Section 02 success signals in prototype testing |
| 2 — First market launch, 6–10 wks | One carrier, one payout-rail set, one identity provider, tax/invoice, language, support — direct integrations with debt-register entries | End-to-end pilot covering settlement, returns, failures, support operations | Pilot spans ≥1 payout cycle and refund window; debt register complete |
| 3 — Second/third market scale, per market | Extract Tier 2: adapter contracts, config console, localization QA, fine-grained permissions | Reusable adapter toolkit; market dashboards | New market ships without forking the global core |
| 4 — Optimization, ongoing | Contribution margin (if cost-data condition met), predictive prioritization, bulk tools, assisted workflows, carefully evaluated AI support | Measured improvements | No increase in error, pressure, exclusion, or estimate variance |

Note the revised Phase 1 window (10–14 weeks) is explicitly described as "honest rather than optimistic" now that Tier 2 scope has been removed from it — the original draft's 8–12-week Phase 1 assumed Tier 2 capabilities.

Six delivery principles closing the doc: truth before delight; fast routine, visible exception; local rules, coherent product (configure differences, don't fork country products unless law/operations require it); recovery is part of usability; evidence over theory theater; and the new **"scope is a promise"** principle — bet list and cut list maintained together, additions require equal-size removals, shortcuts live in the debt register or not at all.

## 13. References

16 sources cited (accessed 6 August 2026): World Bank Global Findex 2025; Shopify Payments payout-timing and multi-currency-payout help pages; TikTok Shop Seller Center PH fee page; Etsy and Amazon seller-payment help pages; Philippine BIR Revenue Regulations 16-2023; W3C WCAG 2.2; NIST SP 800-63B-4 (digital identity/authentication); FATF digital-identity guidance; Unicode CLDR number/currency patterns; Hick (1952), Fitts (1954), Tversky & Kahneman (1991, loss aversion), Kahneman/Fredrickson/Schreiber/Redelmeier (1993, peak-end). The doc's own source note: platform help pages are cited as current examples of regional/policy variability, not endorsements or universal benchmarks — regulatory and platform rules must be re-verified before each market launch.

## Gaps and considerations before acting

1. **No Seller Center code exists yet.** Per [[sals3-implementation-phases]] and [[sals3-feature-landscape-and-expansion-map]] (Pillar 3), Sals3's Seller Center is Stage 7 of the 8-stage build order — nothing in this proposal can start before Stages 1–6 (foundation, data model, catalogue, pricing, cart/checkout, orders) land. This is architecture/UX direction to fold into Stage 7 planning, not an immediately actionable task.
2. **Commission rate and confirmed payment partners remain Leadership-pending** (see [[sals3-management-bible#4. Non-negotiable boundaries]] and the "Module 4, values pending" line in [[sals3-feature-landscape-and-expansion-map]]) — this proposal's financial-truth bet (estimated proceeds, versioned fee rules) is the right *mechanism* but cannot get real values until that Leadership decision lands.
3. **Overlaps with [[sals3-cj-dropshipping-integration-plan]]** on the "rapid listing" bet: that plan's automated CJ category/attribute mapping is a specific instance of this document's "essential fields first, conditional market requirements" listing flow. When Seller Center build work starts, reconcile the two rather than designing the Add Product form twice.
4. **RA 11967 (Internet Transactions Act) applies here too** — this proposal's payout-transparency and anti-false-certainty rules (no "guaranteed net cash," no fabricated urgency) align with the build spec's existing forbidden-pattern list (section 14) and should be reviewed together with it before a Philippine lawyer's pre-launch legal review.
5. **The Stage 1 field-research gate is real scope, not paperwork** — the document is explicit that a killed hypothesis removes a feature from the bet list. Do not schedule Phase 1 build work as if the three bets are already validated; they are named hypotheses pending the go/no-go gate.

## Recommendation

Treat as a reference architecture and prioritization discipline for Pillar 3, not a decision. The three-bet/binding-cut-list structure and the Tier 1/Tier 2 architecture split are exactly the kind of scope discipline this vault's own [[hot]] note warns is necessary (see "Lesson this vault must actively guard against" — the WooCommerce rebuild failed from an open-ended, ungated build). Fold this into [[sals3-implementation-phases]]'s Stage 7 register when Seller Center work is actually scheduled, rather than tracking it as a separate initiative. Nothing here should be built ahead of Stages 1–6, and the financial-truth bet specifically should not be estimated with real numbers until commission rate and payment partners are Leadership-confirmed.

## Addendum, 2026-08-06 — first Seller Center code, status unchanged below

Bogs imported a Claude Design mockup ("Seller Center.dc.html") covering 7 screens (Overview, Orders, Listings, Inventory, Finances, Payouts, Market rules) and directed building it into `sals3-portal`, renaming that app's identity from "Sals3 Portal" to "Seller Center." This is the first Seller Center code in either repository — a real, direct instruction from the owner, not something this vault self-authorized ahead of Stages 1–6. What it is and is not, precisely:

- **Not a validation of this proposal's hypotheses.** Gap #5 above (the Stage 1 field-research gate) is still not satisfied — no field research happened, no seller performance was observed. This build is a UI/interaction prototype against real design-system tokens, not evidence the three bets work.
- **Consistent with the binding cut list.** The build uses a static, code-reviewed market-config module (`sals3-portal/src/lib/seller-center/market-config.ts`, 3 illustrative sample markets) rather than a self-serve configuration console — matching this proposal's explicit v1 cut ("Multi-market configuration console (self-serve UI)... config can live in reviewed files with effective dates").
- **Real permission enforcement, illustrative data.** Every screen is gated by a real, server-enforced permission (`sals3-portal/src/lib/auth/permissions.ts`), mapped onto this document's Owner/Staff role split (`seller_manager`/`seller_staff`). Every order, ledger line, inventory count, and payout shown is static placeholder data — no order, inventory, finance, or payout backend exists.
- **Gap #2 (commission rate/payment partners pending Leadership) still applies.** The Finances screen's commission percentage and fee amounts are illustrative examples carried over from the mockup, not Leadership-confirmed figures.
- **Gap #3 (overlap with [[sals3-cj-dropshipping-integration-plan]] / [[ADR-001-seller-center-cj-sourcing-to-my-products]])** is resolved at specification level by [[cj-candidate-to-sals3-product-draft-implementation-spec]]. The new-listing wizard remains a read-only preview, not the real CJ-sourcing-to-My-Products flow. No database, import, editor persistence, review, publish, or sync implementation is claimed.

Frontmatter `status`/`owner_approved` deliberately left as `proposed`/`false` — this addendum records a concrete, owner-directed UI build against the proposal's structure, not Leadership approval of the underlying Pillar 3 product strategy (cost model, field research, launch-market decision), which remains genuinely pending.

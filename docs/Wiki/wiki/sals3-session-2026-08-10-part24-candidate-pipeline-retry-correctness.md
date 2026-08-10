---
tags: [sals3, session, sals3-portal, candidate-pipeline, retry, adr-007, adr-010, adr-013]
aliases: [Candidate Pipeline Retry Correctness]
created: 2026-08-10
updated: 2026-08-10
status: session-note
authority: session-record
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-10-part23-catalogue-dropshipping-alignment]]"
---

# Sals3 session 2026-08-10, part 24 — Candidate pipeline queue/retry/reconnect correctness

`sals3-portal` branch `fix/candidate-pipeline-retry-correctness`, off `develop` at `c5f6790`. Not yet committed/pushed at the time this note was written - see [[hot]] for current PR state.

## 1. Problem

This is backend decision-engine correctness work on the real database-backed pipeline (`All Supplier Products -> Evaluating -> Ready/Needs Attention/Blocked/Exception Queue`), not Product Catalogue UI and not a fixture-to-real conversion. [[hot]] already named two specific defects as publication blockers, and this session fixed both plus a third one found while verifying them:

1. A `TEMPORARILY_INELIGIBLE` decision (`NO_STOCK`/`NO_SHIPPING_ROUTE`) never got a `nextRetryAt`, so it could never be picked up by the time-based requeue despite `decide.ts`'s own doc comments already claiming it was "auto-retried."
2. A candidate whose connection became disconnected/revoked was saved `EVALUATION_FAILED` with `nextRetryAt: null` **and an incremented `attemptCount`** - it could never recover automatically, even after the seller reconnected, and burned a real technical attempt for something that was not a technical failure at all.
3. **Newly found while fixing (1)/(2):** every pipeline tab query independently hand-rolled its own status filter, and none of them included a mid-retry `EVALUATION_FAILED` row - it matched zero tabs (not Evaluating, not Blocked/Rejected, not Exception Queue, which additionally filtered `attemptCount` in JS *after* fetching only `EVALUATION_FAILED` rows). A candidate could be actively retrying and invisible to the seller at the same time.

## 2. Mid-task discoveries that changed the plan

- Portal PR #21 had already merged before this session started; a prior session's uncommitted `SupplierConnectionHealth` fix was orphaned by that merge and had to be split into its own branch/PR ([sals3-portal #22](https://github.com/Sals3-Official/sals3-portal/pull/22)) before this slice could start cleanly.
- Local `develop` was 11 commits behind `origin/develop` (a separate, unrelated evaluate-tick timeout fix had already landed) - re-verified every touched file against the real current `HEAD` before designing anything, since the earlier research pass had been done against a stale checkout.
- Per the owner's explicit branch-scope check: this slice was built on its own branch rather than piled onto the already-large (79-file) portal-shell-redesign PR, since a DB migration and worker/security-sensitive server-action changes need a different review lens than UI work.

## 3. What was fixed

**Retry correctness** (`repository.ts#recordEvaluationDecision`) - now schedules a real exponential-backoff `nextRetryAt` for `TEMPORARILY_INELIGIBLE`, sharing the same `attemptCount`/`MAX_EVALUATION_ATTEMPTS`/`nextRetryDelayMs` machinery `EVALUATION_FAILED` already used, matching what the existing doc comments already (incorrectly, until now) claimed was happening.

**Connection-pause correctness** (`evaluate.ts`) - replaced the ad-hoc `status === 'REVOKED' || status === 'DISCONNECTED'` check (which let a `REAUTH_REQUIRED`/`PENDING` connection's candidates still attempt a live CJ call, unlike ingestion which already excluded them) with the canonical `isWorkableConnectionStatus` (made a proper TypeScript type guard). Each non-workable status gets its own stable `lastErrorCode` (`SUPPLIER_CONNECTION_DISCONNECTED`/`_REVOKED`/`_REAUTH_REQUIRED`/`_PENDING`, new `connection-pause.ts`) and **never increments `attemptCount`** - the candidate did nothing wrong, so this is not counted as a technical failure. Added the audit event this path was missing entirely before.

**Reconnect-triggered recovery** (new `requeueConnectionPausedEvaluations`, wired into `connectCjSupplier`'s reconnect branch) - bounded (50/call), idempotent (matches only rows still `EVALUATION_FAILED` with one of the connection-pause codes), always returns to `QUEUED` for a full re-evaluation, never straight to `PASS` - satisfies ADR-007's "performs a bounded requeue through Evaluating before any row can return to Ready" for the queue-mechanics layer.

**Exactly-one pipeline projection** - new pure `classifyPipelineBucket` (fully unit-tested, exhaustive over every status x attempt-count boundary) backs two shared SQL predicates (`isPreExhaustionFailure`/`isExhaustedFailure`) now used by every tab query and the count summary identically, so a mid-retry failure surfaces in Evaluating and an exhausted one in Exception Queue - never both, never neither. Verified against the real dev database's already-populated 100 rows: 7 Ready + 1 Needs Attention + 92 Evaluating + 0 Blocked + 0 Exception Queue = 100.

**`admissionReason`** - new nullable enum column on `candidate_evaluations` (`NEW_PRODUCT`/`MATERIAL_SOURCE_CHANGE`/`EVIDENCE_EXPIRED`/`POLICY_VERSION_CHANGED`/`RETRY_DUE`/`CONNECTION_RESTORED`), stamped at every (re)queue site. `EVIDENCE_EXPIRED`/`POLICY_VERSION_CHANGED` are reserved, forward-declared but not yet produced by any code path - same posture as `shortlistStateEnum`'s existing `PREFLIGHT_PENDING`.

**Honest portal UI** - a raw `lastErrorCode` now explains itself in plain language (new `last-error-code.ts`, matching `REASON_CODE_EXPLANATIONS`'s existing pattern); the Evaluating tab shows a genuine "Retrying" row with its real reason and `nextRetryAt`, never conflated with Exception Queue; the "All" overview tab and the single-candidate drawer/badge split "still retrying" from "needs a person" by `attemptCount` rather than one blanket label for every `EVALUATION_FAILED` row regardless of how close it is to exhaustion.

Also fixed the same drifted "is this connection workable" check in the real `/products` browser (`CjCatalogueView.tsx`) - one of four independently hand-rolled copies found; the design-preview-only `catalog-presentation.ts#isUsableAsFilter` (a separate fixture type, not wired to real data) was left alone since it isn't part of the real production path.

## 4. What was deliberately not done

- **CJ points-exhaustion/inactivity-suspension classification** - already modeled as `DEGRADED` by the existing `cj-adapter.ts`, and `DEGRADED` already stays workable by pre-existing design (this session added a test confirming that). No new classification was needed; only the four genuinely non-workable statuses needed the fix.
- **A literal "Blocked/Rejected -> Temporarily unavailable" bucket.** [[hot]]'s existing "Disconnect/reconnect fallback" bullet describes moving connection-paused work into Blocked/Rejected with that specific sub-label. This session kept it as `EVALUATION_FAILED` with a distinct reason code instead (routing to Evaluating or Exception Queue depending on `attemptCount`, per the same shared classifier every other row uses) - a smaller, more consistent diff that satisfies the underlying invariants (no burned attempt, stable reason, event-driven recovery, bounded idempotent through-Evaluating requeue) without adding a sixth status value. **This is a real deviation from the ADR-007 bullet's literal wording, not a documentation typo** - flagging for Codex/Bogs to decide whether a distinct "Temporarily unavailable" sub-label is still wanted on top of this, or whether the existing `EVALUATION_FAILED` + `lastErrorCode` + tab-bucket design already satisfies the intent.
- No policy/evidence filtering slice (market/category allowlists, variant mapping, media/rights, duplicate clusters) - explicitly out of scope for this foundation-only slice.
- No live CJ discovery/evaluation tick was run to demonstrate the fix; verification used the real dev database's already-populated rows from an earlier tick plus a full unit/e2e pass.

## 5. Verification

- `npm run verify` (lint, format, `typecheck:clean`, build, 355 unit tests / 4 skipped, 51 e2e / 1 skipped) - clean.
- `npm audit --audit-level=high` - clean (same pre-existing moderate `esbuild`-via-`drizzle-kit` advisory as [[sals3-session-2026-08-10-part23-catalogue-dropshipping-alignment]], unrelated).
- New unit tests prove: exhaustive bucket partition with no gap/overlap; the two SQL predicates render genuinely different, parameterized WHERE text via `PgDialect.sqlToQuery` (Drizzle's `SQL` class has no meaningful `toString()` - see [[sals3-skills]] entry 71); retry backoff scheduling and its cutoff; all four non-workable connection statuses pausing without a burned attempt or a CJ call, plus the previously-missing audit event; `DEGRADED` staying workable; the reconnect action's bounded/idempotent requeue wiring including the zero-new-connection and zero-paused-rows cases.
- Applied the generated migration (`0007_amusing_power_man.sql`, additive-only: one new enum, one nullable column) to the local dev Postgres with explicit owner approval, since two e2e tests needed the real column to exist - see [[sals3-skills]] entry 53, reconfirmed.
- Manually inspected `/products/pipeline` (all tabs) and `/supplier-apps` at desktop and mobile (375px) against the real dev database - zero console errors beyond expected dev-server HMR noise, no page-level horizontal scroll.
- **Stated limitation:** could not integration-test the SQL predicates against a live query planner beyond `PgDialect`'s pure text rendering plus the one real e2e read confirmed by eye (100 = 7+1+92+0+0). Recommend watching a real tick accumulate an `EVALUATION_FAILED` row and confirming by eye that it appears in Evaluating (not both, not neither) before treating this as fully proven against live data.
- Also found and fixed, on the same branch, a pre-existing vacuous test assertion in `repository.tenant-scope.test.ts` unrelated to this slice's own logic - see [[sals3-skills]] entry 71.

## 6. Next smallest slice

Per the owner's standing instruction not to start the next slice unless asked: the queue/retry/reconnect foundation is now correct. The next approved layer per ADR-010 section 12 is discovery-coverage hardening (persistent scan checkpoints, tenant-fair priority aging, completed-scan delisting reconciliation) - or, staying in this exact area, wiring the CJ webhook/points-exhaustion signal into a real `DEGRADED` -> recovery audit trail rather than leaving it purely adapter-side.

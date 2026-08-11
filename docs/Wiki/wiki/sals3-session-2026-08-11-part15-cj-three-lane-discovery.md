---
tags: [session, cj, catalogue, discovery, webhook, points, sals3-portal]
aliases: [CJ Three-Lane Discovery Session]
created: 2026-08-11
updated: 2026-08-11
status: implemented
authority: implementation-evidence
owner_approved: false
related:
  - "[[hot]]"
  - "[[cj-candidate-to-sals3-product-draft-implementation-spec]]"
  - "[[ADR-001-seller-center-cj-sourcing-to-my-products]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
---

# Sals3 Session - 2026-08-11 Part 15 - CJ Three-Lane Discovery

## Problem fixed

The previous `sals3-portal` discovery chain could complete a historical cycle, then enqueue another cycle that reseeded open-start and epoch-to-current roots for every leaf category. Candidate upserts prevented duplicate rows, but CJ `/product/list` calls and points spend could repeat across the same historical catalogue.

## Implemented architecture

- Replaced repeat historical-cycle semantics with explicit lane state: `BOOTSTRAP`, `INCREMENTAL`, and `AUDIT`.
- `BOOTSTRAP` remains one-time historical coverage up to an immutable cutoff. It seeds the open-start sentinel plus epoch-to-bootstrap-cutoff roots.
- `INCREMENTAL` starts after completed bootstrap. It uses `windowFrom = cursor - safety overlap` through a new cutoff, and seeds only window roots.
- Unresolved incremental windows create durable range obligations while later windows can continue from the scan cursor. The proven watermark advances only on complete coverage.
- Persisted partition proofs, checksums, audit due times, audit units, and candidate provider freshness/removal timestamps so audit can be bounded to known partitions instead of reconstructing a full scan.
- Kept legacy `GET /api2.0/v1/product/list`; no `product/listV2` or 6,000-cap assumption was added.

## Webhook and subscription freshness

- Product subscriptions now carry priority class: order-linked, live, selected/importing, Ready, or none.
- Subscription reconciliation keeps the documented 100-product request limit and does not use `subscribeAll`.
- Ready subscriptions respect an operational buffer and capacity visibility; protected higher-priority products are not evicted merely to fit ordinary Ready candidates.
- The existing webhook inbox still verifies raw-body HMAC, deduplicates by `messageId`, and queues authoritative reconciliation rather than blindly editing storefront state.

## Points and order safety

- The points governor no longer parks background work until UTC midnight just because current `remaining` is low.
- Retry timing now uses provider `pointsInfo`, endpoint cost, `total / 1440` minute refill, and a safety margin.
- Shared DB request gating remains the connection-wide arbiter; high-priority future checkout/order work can preempt background work but must still obey the supplier request ceiling.

## Automatic start and recovery

- CJ connect/reconnect writes a durable discovery-chain outbox intent after the connection becomes workable, then dispatches the outbox without scanning inside the callback.
- Existing workable official connections get one idempotent heal from the first authorized All Supplier Products server load.
- Manual Start/Resume/Retry remains recovery-only and chooses incremental when bootstrap already completed, not another historical cycle.

## Files changed

Application changes are in `sals3-portal`, mainly:

- Discovery schema/migration: `src/lib/db/schema/discovery.ts`, `src/lib/db/schema/catalog.ts`, `drizzle/0010_wise_typhoid_mary.sql`.
- Lane engine: `handle-cycle-start.ts`, `handle-partition.ts`, `cycle-repository.ts`, new `lane-repository.ts`, new `handle-audit-unit.ts`, `messages.ts`, `dispatcher.ts`, `status.ts`.
- Governance: `budget-repository.ts`, `subscription-repository.ts`, `subscription-reconcile.ts`, `control.ts`.
- Entry points: `supplier-apps/actions.ts`, `CjCatalogueView.tsx`.
- Regression tests in discovery, supplier-app actions, candidate ingest/evaluation, and Cj catalogue view tests.
- README updated for lane behavior, migration `0010`, automatic start, webhook capacity, and minute-refill points behavior.

## Validation evidence

- `npm run lint` passed.
- `npm run format:check` passed.
- `npm run typecheck:clean -- --pretty false` passed.
- `npm run build` passed.
- `npm run test:run` passed: 92 files passed, 4 skipped; 677 tests passed, 4 skipped.
- `npm run test:e2e` passed: 51 passed, 2 skipped.
- `npm audit --audit-level=high` exited 0. It still reports existing moderate `esbuild` advisories via `drizzle-kit`; high-severity gate passed.

## Migration and rollout state

- Migration `0010_wise_typhoid_mary.sql` was generated but not applied.
- No local owner DB, preview DB, staging DB, production DB, CJ account, Neon, Vercel, GitHub, deployment, push, commit, or PR mutation was performed.
- Live catalogue completeness is not claimed. It still requires owner-authorized provider contract probes, owner-run migration/configuration, deployed durable queue execution, and zero unresolved required coverage obligations.

## Known limitations

- Audit persistence and bounded queue continuation are present, but the first implementation reuses stored partition work rather than a full dedicated added/missing-PID diff UI.
- Webhook subscription priority/capacity state is persisted and reconciled in bounded batches, but real order-linked/live/selected product source tables are still future work.
- Checkout/order admission uses the shared governor contract; real order placement remains unimplemented.

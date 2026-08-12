---
tags: [sals3, sals3-portal, session-note, supplier-connections, production-incident, security]
aliases:
  - Supplier Account Binding
  - Connection Transaction Bug
created: 2026-08-10
updated: 2026-08-13
status: implemented
authority: implementation-state
owner_approved: true
related:
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[hot]]"
---

# One seller, one supplier account, actually enforced — `sals3-portal` PRs #25, #26

Two `sals3-portal` PRs, both `aj-garrigues` (AJ), merged 2026-08-10. Neither
had a prior vault entry. Two rules that had to hold and be provable — neither
did before this.

## PR #25 — the transaction bug, and the binding that wasn't permanent

**First-time connect was broken.** `connectCjSupplier` opened
`getDb().transaction(...)`, but `PostgresSupplierSecretStore.write` issued
its `INSERT` on a *separate* pooled `postgres.js` connection rather than
inside that transaction. On a first-time connect the parent
`supplier_connections` row was still uncommitted and invisible to that other
connection — the foreign key raised `23503`, a generic catch swallowed it,
and the seller saw only "The connection could not be saved." Reconnect
"worked" only because its parent row was already committed, and it wrote the
secret outside the transaction too — a later failure there left a committed
secret against a rolled-back row. Fixed by making
`SupplierSecretStore.write/read/delete` take a **required, executor-first**
argument — required, not defaulted to `getDb()`, since a default compiles
everywhere and would silently reintroduce the identical bug the next time
someone calls it inside a transaction.

**The CJ-account binding was not actually permanent.** The existing unique
index only constrains rows that exist *right now*, and reconnect rewrites the
lookup hash it's keyed on — so Seller A could reconnect with a different key
and free their old CJ account for Seller B to claim. New append-only
**`supplier_account_bindings`** ledger: `(provider_id, sha256(providerCode:openId))
→ seller_account_id`, never updated, never deleted. The claim happens as the
first statement inside the transaction, so two concurrent connects of the
same CJ account cannot both win. A seller can still move to a different CJ
account of their own (a new row, not a replacement) and later reconnect a
previous one, since the ledger still says it's theirs.

**Constraint violations were failing open.** Every "is this taken?" read
before a write is inherently a race; the unique index is what actually holds
under concurrency. New `uniqueViolationConstraint` maps a `23505` back to the
right reason **by walking `error.cause`**, since Drizzle wraps every driver
error and a naive `error.code === '23505'` check never fires. Splits one
ambiguous message into two real ones: `already_connected` (a CJ account is
already linked to this seller) versus `cj_account_taken` (that CJ account is
already linked to a *different* seller). A refused bind appends a
`supplier_connection.bind_rejected` audit event carrying no `openId` and no
API key.

**Consequence accepted, by design:** releasing a binding needs a manual
database change. There is no UI for it — recovering a wrongly-connected CJ
account is DB surgery, on purpose.

Migration `0008_material_tyger_tiger.sql` creates the ledger and backfills
every existing connection — including `DISCONNECTED` ones — into a permanent
binding, verified locally to reproduce byte-identical rows including
`first_bound_at`. **407 unit tests pass**, including 18 new cases on
`connectCjSupplier` with no prior coverage at all, one of which provably
fails when the secret write is allowed to escape the transaction (verified by
temporarily reverting the fix).

## PR #26 — the migration gap turned this into a production white screen

**Production, 2026-08-10.** A seller pasting a CJ API key at `/supplier-apps`
got a generic Next error page —
`relation "supplier_account_bindings" does not exist`, `code: 42P01`.
Migration `0008` (from #25) had been merged but never applied to production;
`npm run build` is plain `next build` and nothing in `.github/` runs
`db:migrate` on deploy, so the new code shipped without its table. **That
operational gap was fixed separately by running the migration** — this PR
fixes the reason it presented as a full white screen instead of a message.

The root code defect: `connectCjSupplier` returns a discriminated union that
`ConnectCjForm` maps to a sentence per `reason`, but the reads feeding those
returns sat *outside* any error handler — a missing relation, a dropped
connection, or a statement timeout escaped the Server Action outright and hit
Next's global error page. A contract that promises "always a reason" cannot
have unguarded calls inside it. Fixed by widening the handler each of the
three affected actions (`connectCjSupplier`, `requestCjDisconnectVerification`,
`disconnectCjSupplier`) already had, so an unexpected failure now leaves as
`failed` — "The connection could not be saved. Try again in a moment." — like
every other outcome. Three new tests pin the provider/connection/binding
reads and all three fail against the pre-fix code. **410 unit tests pass.**

**Explicitly not covered by this PR:** a deploy that ships schema-dependent
code ahead of its own migration will still misbehave — it will just
misbehave legibly now instead of white-screening. Making `db:migrate` part of
the deploy itself, or gating on schema version, is called out as a separate,
still-open decision.

## Cross-reference

This same "migration merged but never applied to production" failure mode
recurred at least once more — see
[[sals3-session-2026-08-12-part36-rolling-pid-waves-and-discovery-deadlocks]]'s
own account of the pattern (a later, `43` PR-numbered incident references
this exact one as its "second occurrence").

`sals3-portal` [PR #25](https://github.com/Sals3-Official/sals3-portal/pull/25),
[PR #26](https://github.com/Sals3-Official/sals3-portal/pull/26), both merged.

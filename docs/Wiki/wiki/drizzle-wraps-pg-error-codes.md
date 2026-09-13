---
tags:
  - lessons-learned
  - postgres
  - drizzle
  - error-handling
  - sals3
aliases:
  - Drizzle wraps pg error codes
  - "`error.code` is always undefined under Drizzle"
created: 2026-09-14
updated: 2026-09-14
status: current-state
authority: consolidated-lessons
owner_approved: false
related:
  - "[[sals3-skills]]"
  - "[[hot]]"
  - "[[pending-register]]"
  - "[[sals3-session-2026-08-10-part41-supplier-connection-transaction-and-binding-integrity]]"
  - "[[sals3-session-2026-08-31-part114-a-delivery-score-photos-a-report-button-and-the-idempotency-bug-they-found]]"
---

# Drizzle wraps Postgres error codes

> [!WARNING] Draft — written to close a dangling reference, not yet reviewed
> [[pending-register]] has carried *"ten lesson notes are referenced and were
> never written"* since 2026-09-09 and this was one of them. Assembled from
> [[sals3-session-2026-08-10-part41-supplier-connection-transaction-and-binding-integrity|part 41]],
> [[sals3-session-2026-08-31-part114-a-delivery-score-photos-a-report-button-and-the-idempotency-bug-they-found|part 114]]
> and [[hot]]'s own lesson line, all of which describe the same defect.
> `owner_approved: false`.

## The defect

**Drizzle wraps every driver error.** The object your `catch` receives is
Drizzle's, not `postgres`'s, so:

```
error.code  →  undefined        // always, for every Postgres error
```

The real SQLSTATE is on the **original**, reachable through `error.cause`.

This makes `if (error.code === '23505')` **dead code**. Not flaky, not
occasionally wrong — it never fires, for any error, ever. And because the branch
it guards is the *unusual* path, nothing in normal operation reveals that it is
gone.

## Why it keeps costing more than it looks

A unique-violation check is almost always the last line of a race. Every
*"is this taken?"* read before a write is inherently racy; the unique index is
the thing that actually holds under concurrency. So a dead `23505` check means
**the guarantee you thought was enforced is the one silently failing open.**

[[sals3-session-2026-08-10-part41-supplier-connection-transaction-and-binding-integrity|Part 41]],
2026-08-10 — supplier connection binding. `uniqueViolationConstraint` was
written to map a `23505` back to the constraint that raised it **by walking
`error.cause`**, precisely because the naive check never fired. Doing so split
one ambiguous failure into two true ones:

| Constraint | Real meaning |
| --- | --- |
| `already_connected` | this CJ account is already linked to **this** seller |
| `cj_account_taken` | this CJ account is already linked to a **different** seller |

Two different answers a support agent needs to tell two different people apart.
Before the walk, both arrived as the same message.

## It was found three times

[[hot]] records it as *"learned 2026-08-31, twice more, after first being found
in part 55"*. The same defect, rediscovered — which is the argument for this
note existing at all.

[[sals3-session-2026-08-31-part114-a-delivery-score-photos-a-report-button-and-the-idempotency-bug-they-found|Part 114]],
2026-08-31, generalised the fix: `postgresErrorCode` and `isUniqueViolation` now
live beside `uniqueViolationConstraint` and share its **bounded, cycle-safe
walk** of the `cause` chain, with four call sites converted.

**Bounded and cycle-safe are not decoration.** A `cause` chain can loop, and an
unbounded walk in an error path turns a handled failure into a hang.

## Still outstanding

Part 114 §236 names it: **migration scripts and any other caller still reading
`error.code` directly are unfixed.** They were outside that session's scope and
nothing has swept them since. A migration script that silently never catches its
unique violation fails in the one place that is hardest to observe.

## The lesson

**An ORM's error is not the driver's error, and the code you are checking may
not be on the object you are holding.**

1. **Grep for `error.code` after adopting any query wrapper.** Every existing
   check became dead the day the wrapper arrived, and none of them started
   failing loudly.
2. **Read a SQLSTATE through a helper, never inline.** One bounded, cycle-safe
   walk, one call site shape — so the next wrapper upgrade has exactly one place
   to change.
3. **Test the unusual branch against the real database.** A unique violation is
   trivial to provoke — insert the row twice — and nothing else proves the
   branch is reachable.
4. **A defect found three times is a missing note, not bad luck.** Parts 55, 41
   and 114 each rediscovered this independently.

**Where applied:** `uniqueViolationConstraint`, `postgresErrorCode` and
`isUniqueViolation` in `sals3-portal`.

---
tags: [sals3, sals3-admin-portal, audit, governance, database-backed, session, accessibility]
aliases:
  - Admin Portal Append-Only Audit Trail
  - Admin Portal Audit Events
  - Part 40
created: 2026-08-14
updated: 2026-08-15
status: implemented-merged-locally-verified
authority: session-record
owner_approved: true
related:
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[ADR-010-catalog-decision-governance-and-shadow-enforcement]]"
  - "[[sals3-session-2026-08-14-part39-admin-portal-employee-auth-and-shell-fork]]"
  - "[[sals3-session-2026-08-14-part42-admin-portal-audit-trail-pr-status-correction]]"
  - "[[sals3-session-2026-08-15-part43-admin-portal-audit-trail-merged-and-synced-locally]]"
  - "[[hot]]"
---

# 2026-08-14 - part 40 - Admin Portal gets an append-only audit trail

> [!WARNING] Correction — 2026-08-14, found while absorbing current git state
> This note originally cited the wrong branch/PR and implied the work was already merged. Corrected: `sals3-admin-portal` branch **`feat/admin-portal-audit-trail`**, commit `75eefb2`, was open as PR [#3](https://github.com/Sals3-Official/sals3-admin-portal/pull/3) — **not merged** as of this correction. `chore/admin-portal-bootstrap`/PR #2 is the separate, already-merged auth/shell-fork work covered in [[sals3-session-2026-08-14-part39-admin-portal-employee-auth-and-shell-fork]] — this note's original text conflated the two.

> [!NOTE] Update — 2026-08-15: PR #3 is now merged
> Merged into `develop` as commit `a9383ae`, and the local `sals3-admin-portal` checkout on this machine has been fast-forwarded to match, migrations applied against local Postgres, and the full local `npm run verify` chain (lint, typecheck, build, 74 unit, 12 e2e) re-run and green. See [[sals3-session-2026-08-15-part43-admin-portal-audit-trail-merged-and-synced-locally]] for the full record. The "still OPEN" language below the original correction box is now historical — read it as "true as of 2026-08-14," not current.

`sals3-admin-portal` branch `feat/admin-portal-audit-trail`, commit `75eefb2`,
merged into `develop` via PR [#3](https://github.com/Sals3-Official/sals3-admin-portal/pull/3)
(merge commit `a9383ae`, 2026-08-15). Locally verified via the full `npm run
verify` chain against real local Postgres; still no deployment target, and
this repo has no CI.

## The exchange that changed the plan

Part 39 closed with a recommendation: build the **employee permission model**
next, because "there is no point building market governance before something
can authorize who may change it."

Bogs pushed back, correctly: *"paanong authorize? ede yung user."* There is one
employee. A role table for one person authorizes nothing - the deny-by-default
session gate already **is** the authorization.

The recommendation was wrong, and the correction is worth recording because it
separates two questions that are easy to collapse:

| | Question | Needed when |
|---|---|---|
| Permission | **Who** may do this? | A second class of person exists with different authority |
| Audit | **What** happened, by whom, why? | The moment any action is consequential |

AGENTS.md rule 6 says nothing about how many people exist. Publishing a
buyer-destination policy hits every seller; two weeks later the question is not
"who approved it" - there is only one candidate - but *what was published, when,
at which version, and what the previous value was so it can be rolled back*.

Being the only operator is an argument **for** the trail, not against it: nobody
else is cross-checking.

So: audit first. Permission when a real trigger arrives - a second class of
person, an approval requiring a second pair of eyes, or step-up on a genuinely
dangerous action like a provider kill switch.

## What was built

### The table, not the convention

`audit_events` records **actor, action, scope, reason, before/after,
correlation ID, and time as first-class columns**.

That is a deliberate departure from `sals3-portal`, whose own `audit_events` is
`actorId / action / entityType / entityId / payload jsonb / createdAt`. Reason,
correlation, and before/after live inside that untyped `payload` there, which
means nothing stops a caller omitting the reason - it is a convention, enforced
by whoever reviews the pull request. A `NOT NULL` column is the constraint
itself.

`beforeState` / `afterState` stay `jsonb` because their shape genuinely varies
by action, but they are **separate columns**, so "what changed" is never a
matter of guessing which key a past caller chose.

### Append-only is a database trigger, not a code rule

```sql
CREATE TRIGGER audit_events_no_update  BEFORE UPDATE   ...
CREATE TRIGGER audit_events_no_delete  BEFORE DELETE   ...
CREATE TRIGGER audit_events_no_truncate BEFORE TRUNCATE ...
```

All three raise. For **every** caller, including the application's own role.

A rule living only in application code is one future route, one migration
script, or one hand-run `psql` session away from being ignored - and that is
precisely the damage an audit trail exists to make impossible. Correcting a
wrong entry means appending a correcting event.

`TRUNCATE` needs its own statement-level trigger: it is neither an `UPDATE` nor
a `DELETE` and would otherwise walk straight past row-level triggers.

Verified by hand against the live database before the code was written around
it, and then asserted in the e2e suite against the real database rather than a
mock - the guarantee lives in Postgres, so a mock would only prove the test
author's assumption.

### Three actor types, because three different things happen

`EMPLOYEE`, `ANONYMOUS`, `CLI`.

A **failed sign-in is `ANONYMOUS`** with the attempted address, never linked to
an employee row: the request proved no identity, and naming one would assert
something that did not happen. Its `reason` deliberately does **not** say
whether the address exists - the trail is readable by anyone who can sign in,
and it must not become the account-enumeration oracle the generic `401` refuses
to be.

`CLI` covers `create-employee`: a local operator ran it, and no session
established who. Attributing the new account as its own creator would read as
self-provisioning.

### The recorder shares the caller's transaction

`recordAuditEvent(executor, input)` takes a `DbExecutor` rather than reaching
for `getDb()`. `create-employee` now writes the employee row and its audit event
in one transaction.

The reason is not tidiness: an audit record that commits when the change it
describes was rolled back is **worse** than no record, because it is a confident
lie.

### Wired to every consequential action that exists today

Sign-in, failed sign-in, sign-out, employee provisioning. A table with no writer
would have left `/policy/audit` rendering an empty list - which that page's own
previous `UnavailableNotice` correctly argued would imply a working recorder.

## One consequence worth naming

**An employee who has acted can no longer be deleted.**

`actor_employee_id` is `ON DELETE RESTRICT` (unlike `employee_sessions`'
cascade), and the obvious escape - nulling the link first - is an `UPDATE` the
append-only trigger also refuses.

That is the design working: a trail you can detach from the person who acted is
a trail you can launder. But it is a real operational constraint, and it
surfaced immediately - the e2e specs can no longer tear down their seeded
employees, and now say so in a comment rather than silently failing later.

The correct mechanism is **deactivation, not deletion**, and it does not exist
yet.

## The audit page

`/policy/audit` reads real events - the first Admin Portal route with a
genuine backing service.

- Dense table, newest first, capped at 100 with an explicit "older entries exist
  and are not shown" line rather than a bare next-page button that would imply
  completeness the page cannot offer. Filtering by actor, action, scope, and time
  range is not built.
- **UTC timestamps computed from UTC accessors**, not `toLocaleString`. Two
  reasons, both real: a server-rendered local time and a client-rehydrated one
  can disagree, which React reports as a hydration mismatch; and an audit trail
  read by people in different places must not show each of them a different
  wall-clock string for the same event.
- Before/after behind a native `<details>` - keyboard-operable, exposed to
  assistive technology, and findable by the browser's own find-in-page without
  JavaScript, which matters for a page whose entire job is letting someone find
  something later.
- Events that changed no state render `—` rather than an empty disclosure that
  would imply data went missing.
- A missing database keeps its own `NOT_CONNECTED` notice. "Unreadable" and
  "empty" are different facts, and rendering both as zero rows tells the reader
  the second when the truth is the first.
- Notable actions carry a written label plus weight; colour is never the only
  cue, which matters more than usual now that the brand itself is red.

## Verification

`npm run verify` passes: lint, format, typecheck, build, **74 unit tests**,
**12 e2e**. Pre-commit and pre-push hooks both passed. This repository has
**no CI**, so PR #3 itself reported zero automated checks at review time —
only these local hooks and this note's own later independent re-run (see the
2026-08-15 update box above) enforced anything.

The e2e suite proves the guarantee rather than describing it: it inserts a probe
row, then attempts `UPDATE`, `DELETE`, and `TRUNCATE` against the real database
and asserts each is refused, then re-reads the row to confirm it is unaltered.
The assertion walks the error's `cause` chain, because Drizzle wraps some driver
errors in its own `Failed query: ...` and passes others through - matching only
the top-level message would report on Drizzle's error handling instead of on the
database.

## Still open

1. **No permission model** - and by the reasoning above, that is now correct
   rather than a gap. It becomes real at a named trigger, not on a schedule.
2. **No deactivation for employees**, which the `ON DELETE RESTRICT` boundary
   makes necessary rather than optional.
3. **No filtering or retention policy** on the trail. It grows without bound and
   cannot be pruned - by design, but the storage question is real and unanswered.
4. **Nothing else is consequential yet.** The trail currently records
   authentication and provisioning because those are the only real actions this
   application has. The six governance domains remain notices.
5. **No deployment target**; migrations have run against local Postgres only
   (confirmed again 2026-08-15 on this machine specifically - see
   [[sals3-session-2026-08-15-part43-admin-portal-audit-trail-merged-and-synced-locally]]).
6. ~~The PR itself is still open, unmerged, unreviewed by anyone other than
   local hooks.~~ **Merged 2026-08-15** with Bogs's explicit go-ahead - see the
   update box above.

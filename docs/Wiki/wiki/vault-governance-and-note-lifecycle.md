---
tags:
  - governance
  - second-brain
  - knowledge-management
  - moc
aliases:
  - Vault Governance
  - Note Lifecycle
created: 2026-07-31
updated: 2026-07-31
status: canonical
authority: constitutional
owner_approved: true
related:
  - "[[index]]"
  - "[[vault-catalog]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-master-blueprint]]"
---

# Vault Governance and Note Lifecycle

> [!IMPORTANT] Purpose
> This vault is a working second brain. It must preserve history without letting old history override current decisions.

## 1. Authority order

When notes conflict, use this order:

1. Safety, law, and platform restrictions.
2. The owner's latest explicit decision.
3. [[agent-operating-contract]] and constitutional invariants in [[sals3-master-blueprint]] (once promoted from sample to approved).
4. An approved Architecture Decision Record (ADR).
5. A current canonical domain specification.
6. `hot.md` for verified implementation and workspace state.
7. Current reference notes and verified business facts.
8. Historical session notes.
9. Experiments and proposals.
10. Parked, rejected, or superseded ideas.

## 2. Status vocabulary

Every substantive note declares a `status` in its frontmatter:

- `canonical` — currently governing; keep in sync with reality.
- `current-state` — `hot.md` only; reflects verified state as of `updated`.
- `proposed` — under discussion, not approved.
- `approved` — owner-approved direction, not yet verified as implemented.
- `implemented` — approved and verified against real code/data.
- `superseded` — replaced; keep for history, link the replacement.
- `rejected` — considered and declined; keep for history.
- `sample` / `demonstration` — illustrative only, explicitly not a build contract (e.g. [[sals3-master-blueprint]]'s UI mockups and commission math until Sals3 Leadership confirms them).

## 2a. Governing rules are amendable, never unilaterally

Constitutional and canonical notes (this note, [[agent-operating-contract]], [[autonomous-loop-sop]], [[team-profile-and-collaboration-preferences]]) can be changed at any time by AJ or Bogs. An agent must not edit, reinterpret, or quietly drop a rule in one of these notes on its own judgment, even if it believes the change is an improvement. Propose the change, get explicit confirmation from whichever of AJ/Bogs is present, then edit the note in the same task.

## 3. Change protocol

1. Material product or architecture change → write or update an ADR ([[architecture-decision-template]]).
2. Verified implementation change → update `hot.md` and the relevant canonical spec in the same task.
3. Idea the owner wants parked/shelved/deferred → log it immediately in `parked-ideas-backlog.md`, in the same turn it is parked.
4. New domain note → link it from `index.md` and `vault-catalog.md` in the same task that creates it.
5. Never rewrite a historical session note's narrative to match a later decision. Add a new note or an ADR instead, and link back.

## 4. Session notes

When real build sessions begin, name them `sals3-session-YYYY-MM-DD-partNN-short-slug.md`, one file per work session or part, linked from `hot.md` and `index.md`. Historical session notes are evidence of what happened; they do not override current canonical notes.

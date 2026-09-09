---
tags: [governance, vault-maintenance, session-record, conventions]
aliases:
  [
    "Vault Session Note Conventions",
    "How to write a session note",
    "Session Note Conventions",
  ]
created: 2026-09-09
updated: 2026-09-09
status: draft
authority: process-convention
owner_approved: false
related:
  - "[[vault-governance-and-note-lifecycle]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[agent-operating-contract]]"
  - "[[hot]]"
  - "[[sals3-skills]]"
  - "[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger]]"
  - "[[sals3-session-2026-09-08-part157-promote-with-a-merge-commit-never-a-squash]]"
---

# Vault Session Note Conventions

> [!WARNING] Draft — written to close a dangling reference, not yet reviewed
> [[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]
> section 4 has cited `[[vault-session-note-conventions]]` since 2026-09-04 and
> the note did not exist. This is that note, **assembled from what parts 1–159
> actually do** rather than invented — but nobody has reviewed it. Correct
> anything wrong, then set `owner_approved: true`.

> [!IMPORTANT] This is a format convention, not an authority
> [[vault-governance-and-note-lifecycle]] decides what outranks what. A session
> note is `authority: session-record` and **never** overrides a blueprint, an
> approved ADR, or a canonical specification. This note only says how one is
> shaped.

## 1. When a session note is owed

ADR-019 section 4: **a vault entry is part of "done", not a follow-up.** In
practice a note is owed for any merged change that a future reader would need in
order to understand why the code is the way it is — which is most `feat` and
`fix` work, and any `docs` change that records an environment fact or corrects a
diagnosis.

A note is **not** owed for a promotion pull request. See §4.

## 2. One note per theme, not per pull request

Parts 133–159 group by what happened, not by how it was merged. A theme is a
coherent piece of work a reader can act on: *the market-offer backfill*, *the
Australian storefront's identity*, *four taxonomy seed corrections*. Three PRs
that are one fix arriving in three passes belong in one note; twenty PRs that are
seven unrelated fixes belong in several.

Numbering is a single sequence (`partNNN`) across every repository, because the
work crosses repositories and the reader's question is *when*, not *where*.

**Filename:** `sals3-session-YYYY-MM-DD-partNNN-<kebab-slug>.md`, dated by when
the work merged, not when the note was written.

## 3. The shape

Every note from part 133 onward carries, in order:

1. **Frontmatter** — `tags`, `aliases` (including `"Part NNN"`), `created`,
   `updated`, `status: implemented`, `authority: session-record`,
   `implementation_status: merged`, and a `related` list that always includes
   `[[hot]]`.
2. **A `> [!NOTE] Provenance` callout** — where the note came from. Written after
   the fact from PR records? From endpoint responses captured while running them?
   From live measurements? **Say which**, and say which promotion PRs are
   deliberately not listed. This is the [[agent-operating-contract]]'s evidence
   rule applied to the vault itself.
3. **A PR table** — number, repository where it is not obvious, and one line on
   what each did.
4. **Numbered sections** telling what was wrong, what changed, and *why the
   change is right* — with the evidence inline: the measured figures, the SQL
   predicate, the before/after prices, the test names.
5. **A `## Lessons` section.** Not optional. If a note has no transferable
   lesson, the work probably belonged in another note.

Quote the PR's own words where they are better than a paraphrase. Preserve the
owner's words verbatim, in the language they used — *"muna"*, *"pag Fiji ay Fiji
customers lang"* — because the nuance is the decision.

## 4. Promotion pull requests get no entry — this is the standing rule

Established by
[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger|part 148]]
after an enumeration found **146 uncited promotion PRs** against 67 substantive
ones.

**A promotion PR is not work.** It is the ADR-019 gate carrying an
already-reviewed diff from one branch to the next, almost always in identical
pairs. Giving each its own note would multiply the session record while adding
nothing a reader could act on, and would violate the vault's rule that a decision
gets **one home**.

Cite the **substantive** PR. Name a promotion half only when it:

- **bundles a change of its own** (`sals3-portal` #100/#101, *"specs answer, and
  #94 rides along"*);
- **carries nothing** — a `+0/-0` redeploy to pick up an environment variable
  (`sals3-ecommerce` #30/#31);
- **fails** (`sals3-portal` #184/#187, both closed `DIRTY`);
- **exists only for the history**, with no diff at all (`sals3-portal` #189/#190,
  the merge-commit reunification — see
  [[sals3-session-2026-09-08-part157-promote-with-a-merge-commit-never-a-squash|part 157]]).

A promotion pair is **assumed** to exist for every merged change. Where one does
**not**, that absence is the finding worth writing down.

## 5. What the note must update alongside itself

Per [[../CLAUDE|the agent entry point]] section 8:

- **[[hot]]** — add the note to `related`, add a one-line summary under *Recent
  session notes*, extend the frontmatter `updated:` narrative, and **supersede
  any active-risk entry the work closes** with a dated callout rather than
  deleting the history.
- **[[index]] or [[vault-catalog]]** — link governance-significant notes
  directly; a series may be linked as a series pointing at `hot`'s list.
- **The canonical document the work touched** — an ADR amendment where a decision
  moved, a rollout-status table where an ordered plan advanced.
- **[[sals3-skills]]** — any transferable engineering lesson, in the same task.
  A note's `## Lessons` section is the draft; a skill is the version written for
  someone who was not there.

## 6. Corrections

**Never rewrite a historical session narrative to match a later decision.** Mark
the superseded part, keep the reasoning, and write the correction as a dated
callout or a new note. Parts 143–159 contain several notes whose subject is an
earlier note's error — that is the system working, not a defect in it.

A wrong claim in a note is corrected the way a wrong comment in code is: the
correction is its own act, and it says what was believed and why it was wrong.

## Open questions for review

- Should the `partNNN` sequence stay global, or restart per repository now that
  six exist? Global is currently right because the work crosses repositories, but
  it means a portal-only reader carries storefront numbering.
- Is a `## Lessons` section genuinely mandatory, or should a purely factual
  environment record (part 148's README commits) be allowed to omit it?
- Where does a note about work in `sals3-portal-automation` go, given that
  repository takes direct commits and has no PR to cite?

---
tags: [sals3, adr, github, deployment, ci-cd, environments, vercel, multi-repo, compliance]
aliases:
  - ADR-019
  - GitHub Org Boundary
  - SIT Pre-prod Main Promotion Gate
  - Country Repo Fork Rule
created: 2026-09-04
updated: 2026-09-04
status: approved
authority: architecture-decision
owner_approved: true
implementation_status: partially-enforced-see-evidence-table
related:
  - "[[agent-operating-contract]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[project-structure-installation-and-runbook]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[vault-session-note-conventions]]"
  - "[[hot]]"
  - "[[index]]"
  - "[[sals3-session-2026-09-04-part129-coverage-jumps-from-19-to-69-percent-once-the-census-stopped-being-the-alphabet]]"
  - "[[sals3-session-2026-09-04-part130-a-categorys-own-photo-and-a-browser-that-stopped-spending-points-to-run-a-test]]"
  - "[[sals3-session-2026-09-04-part131-a-byte-identical-copy-learns-to-say-bula-fiji]]"
---

# ADR-019 — GitHub org boundary, and the SIT → pre-prod → main promotion gate

## Status

`approved`

> [!DANGER] Hard compliance rule, not a preference
> Owner decision, 2026-09-04 (Bogs), dictated directly in a `sals3-portal`
> session, in Taglish, reproduced here in full because the exact wording is
> the specification: **`github.com/anythingsupplies` is where code and
> changes are worked and merged, under the `anythingsupplies` account.
> `github.com/Sals3-Official` is where vault entries are dumped, aside from
> local, under the `louieboi09` account. Every `anythingsupplies` app repo
> follows SIT → Pre-prod → Main; production is never jumped to directly, and
> every stage is solid-tested before the next one is opened. Every country
> domain gets its own repo under `anythingsupplies`, and each one must be
> just as seamless as the others.`**
>
> Two pieces of this were already true in one repository's README and one
> repository's workflow file. Nothing here was invented; this ADR is what
> happens when that convention is written down once, made to apply to every
> repository including the ones that do not have it yet, and audited against
> what is actually deployed rather than what a README says.

## Problem

By 2026-09-04 there are four repositories under `anythingsupplies`
(`sals3-portal`, `sals3-ecommerce`, `sals3.com.fj`, `sals3-admin-portal`) and
a fifth, frozen set under `Sals3-Official` that the vault still lives in. Two
failure modes had already happened once each before this ADR, and a third was
found live during the audit below:

1. **A commit authored under the wrong identity is silently undeployable.**
   Vercel only builds a commit whose author it can verify against the SALS3
   Team's two members; an unverifiable author fails with `Deployment was
   blocked`, reported only as a commit status on an already-merged PR, while
   `Verify` stays green throughout. This has already cost real time twice —
   once from a machine-default `git config user.email`, once from `gh auth`
   defaulting to `louieboi09` and authoring a squash-merge commit as
   `louienellgonzales@gmail.com`. See *A merge is not a deployment* in this
   repository's `AGENTS.md`/`README.md`.
2. **A README's promised environment flow and the repository's actual
   settings can disagree, silently.** `sals3.com.fj`'s README was copied from
   `sals3-ecommerce` and states the same `develop → pre-prod → main` table —
   but the repository itself, checked directly against the GitHub API on
   2026-09-04, has no `pre-prod` branch and no environment-gate workflow. A
   document that describes intent without the settings being checked drifts
   exactly where it is most dangerous: on a repository nobody has broken yet.
3. **The vault falls behind whenever work spreads across more repositories
   than it did the last time someone checked.** The 2026-08-31 org migration
   (portal and ecommerce moving to `anythingsupplies`, each repo's PR
   numbering restarting at #1) was never itself written up as a vault
   session note, and — found in this same audit — six merged
   `anythingsupplies/sals3-portal` PRs and one merged `anythingsupplies/
   sals3.com.fj` PR (the entire Fiji storefront) had no vault entry at all.
   Nothing enforces that a new repository gets folded into the vault's
   catch-up cadence the same way the first two did.

## Decision

### 1. Two orgs, two purposes, two accounts — never mixed

- **`github.com/anythingsupplies`** is the only org where application code
  is written, reviewed, opened as a PR, and merged — for every Sals3
  property without exception: `sals3-portal`, `sals3-ecommerce`, every
  per-country storefront repository (`sals3.com.fj` today, more to come),
  and `sals3-admin-portal`. A feature PR here targets `develop`, never
  `main` directly. Before merging anything here, both of these must resolve
  to an identity Vercel's SALS3 Team recognizes (`anythingsupplies`
  <adminwebsite@anythingsupplies.com> today, or `liamgym02@gmail.com`):
  - `gh auth status` — the **active** account, not merely a logged-in one,
    is what authors a squash-merge commit.
  - `git config user.email` **and** `git config --local user.email` — a
    clone can carry a local override that shadows the global identity
    silently; this has already happened once in this exact repository's
    sibling clone.
- **`github.com/Sals3-Official`** is retained for exactly one purpose from
  this date forward: hosting this vault (`docs/` inside its
  `sals3-ecommerce`), committed under the `louieboi09` account. It is not a
  deployment target — nothing reads it in production, SIT, or UAT — and it
  is not where a feature PR or a promotion happens. Its application-code
  history predates the 2026-08-31/09-02 migration and is retained for
  reference only.
- A vault-only change never touches `anythingsupplies` — the migration
  deliberately excluded `docs/` from the new repositories, so there is
  nothing there for a vault change to touch. A code change never touches
  `Sals3-Official`. A change that seems to need both is two PRs in two
  repositories under two identities, never one PR asked to serve both.

### 2. Every app repository runs the same three-stage promotion, no exceptions

- Branches: `develop` → Preview (SIT), `pre-prod` → Preview (UAT), `main` →
  Production. One direction only. One pull request per step. `pre-prod` and
  `main` never move except through a promotion PR — never a direct push,
  never a merge from anywhere else.
- A repository does not ship a first production promotion without all three
  branches **and** an environment-reached gate (`sals3-portal`'s
  `deployment-reached-the-environment.yml`, or an equivalent) already wired.
  If a repository is missing either, that is the next unit of work in it,
  before any feature promotion — not a documentation gap to note and defer.
- **The stage below must be solid-tested by a person, not merely green CI,
  before the next promotion PR is opened.** Owner precedent, 2026-09-03,
  verbatim: *"wag gago tetest muna tayo sa sit"* — a `develop`-had-recent-
  pushes banner on the Pulls page is not, by itself, authorization to
  promote. `npm run verify` green and e2e green (or its live-CJ specs
  deliberately and narrowly suppressed per [[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]],
  never silently) are the floor, not the whole test; a human looks at the
  actual SIT or UAT deployment before the next promotion PR is opened.
- **Never report a change as live anywhere because it merged and CI is
  green.** Read the deployment status of the commit the branch now points
  at — `gh api repos/anythingsupplies/<repo>/commits/<sha>/status` — and
  treat `failure`, `error`, **and an absent status** as not deployed. This
  was already `sals3-portal`'s own rule; this ADR makes it every
  repository's rule.

### 3. A new per-country repository is a fork, not a fresh start

- The confirmed pattern (`sals3.com.fj`, 2026-09-03): a country storefront
  begins as a byte-identical copy of `sals3-ecommerce`, market-differentiated
  behind one build-time flag (`NEXT_PUBLIC_SALS3_MARKET`), on its own domain
  and its own Vercel project. See
  [[sals3-session-2026-09-04-part131-a-byte-identical-copy-learns-to-say-bula-fiji|part 131]].
- It is created **with** `develop`/`pre-prod`/`main` and the environment-gate
  workflow already wired — copying the README's promise is not the same
  action as creating the branches and the workflow file, and §2's audit
  below shows the difference is not hypothetical.
- Its own README already states the rule that generalizes: a fix touching
  shared storefront behaviour lands in `sals3-ecommerce` **and** in every
  country fork, each as its own PR. This ADR extends that from "true for
  FJ" to "true for every future country repository," and adds a reporting
  duty matching [[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]'s
  own pattern: a country-repo PR body must say explicitly whether the twin
  PR in `sals3-ecommerce` was opened. `sals3.com.fj` PR #1 already does this
  correctly — it names the still-open twin PR as unfinished work rather than
  going quiet about it.

### 4. A vault entry is part of "done," not a follow-up

- Every merged PR in every `anythingsupplies` repository gets a vault
  session note, grouped by theme, per [[vault-session-note-conventions]].
  A promotion-only PR (`Promote develop -> pre-prod`, etc.) does not need
  its own note; the feature PR it carries does.
- A session note for post-migration work cites `anythingsupplies` PR
  numbers and links, never the retired `Sals3-Official` numbering — the two
  are different repositories with independent PR sequences that both
  restarted at #1, and citing the wrong one silently misattributes shipped
  work to a repository that no longer receives it. Parts 125–128 already
  made this switch correctly; this ADR is what makes it a rule rather than
  an observed habit.
- When a new repository is added under `anythingsupplies` (a new country
  fork, or any future service), it enters the same vault catch-up cadence
  from its first merged PR — not from whenever someone next happens to
  notice it has PRs.

## Evidence — audited 2026-09-04

Checked directly against the GitHub API (`gh api repos/anythingsupplies/<repo>`,
`.../branches`, `.../contents/.github/workflows`), not against README claims:

| Repository | `develop`/`pre-prod`/`main` | Environment-gate workflow | Vault caught up through |
|---|---|---|---|
| `sals3-portal` | ✅ all three | ✅ `deployment-reached-the-environment.yml` | ✅ PR #44 (closed by this ADR's own companion session notes, parts 129/130) |
| `sals3-ecommerce` | ✅ all three | ❌ **missing** | ✅ PR #12; #13/#14 are promotion-only |
| `sals3.com.fj` | ⚠️ `develop`/`main` only — **no `pre-prod` branch** | ❌ **missing** | ✅ PR #1 (closed by part 131, written alongside this ADR) |
| `sals3-admin-portal` | — repository is empty on `anythingsupplies`: zero commits, zero branches | — | Not assessed here — prior "Admin Portal Gate 0" work referenced in project context predates the 2026-08-31 migration; whether it exists on `Sals3-Official`'s copy of this repo and simply has not been migrated, or was never pushed anywhere, was **not verified** in this pass and must not be assumed either way. |

This table is a snapshot, not a standing guarantee — re-check before relying
on any row, the same discipline [[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]
asks for its own points table.

## Strict compliance checklist

Before opening or merging any PR under this ADR's scope:

1. Which org does this change belong to? Application code → `anythingsupplies`.
   Vault content → `Sals3-Official`. Never both in one PR.
2. `gh auth status` — which account is **active**? `git config user.email`
   and `git config --local user.email` — do they agree, and do they resolve
   to an authorized Vercel identity, for `anythingsupplies` work?
3. Feature PR base branch is `develop`. Never `main`.
4. Does this repository have all three branches and the environment-reached
   gate? If not, say so in the PR/report rather than shipping a feature
   through a repository that cannot yet prove what it deployed.
5. Was the stage below this promotion actually looked at by a person, not
   only passed by CI, before this promotion PR was opened?
6. Does every PR merged since the last vault note have a vault entry? If
   not, that is unfinished work, not a later task.
7. New country (or other) repository: are `develop`/`pre-prod`/`main` and
   the gate workflow present before its first feature PR, not after?

A completion report for work touching this surface states, explicitly,
which org the change landed in and which identity merged it. Silence is not
an acceptable answer, the same standard [[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]
already set for CJ calls.

## Strongest objection

*Is a vault ADR really needed when `sals3-portal`'s own README already
documents the three-stage flow, and `sals3.com.fj`'s README already copied
it?* The FJ repository is the objection's own counter-example: its README
states the identical `develop → pre-prod → main` table `sals3-ecommerce`'s
does, word for word, and the repository itself has no `pre-prod` branch and
no gate workflow. A README states an intention; nobody had checked whether
the intention was actually built until this audit. A vault ADR is the one
place this project already treats as binding before any code work — read
before it, per `hot.md`'s own mandatory gate — regardless of which
repository's README says what. That is the gap a per-repo README cannot
close on its own, because a new repository's README is copied before its
settings are.

A second objection: is the account-boundary rule (§1) overreach, given
`Sals3-Official` has no deployment stakes at all? No — the account boundary
for *`anythingsupplies`* work is not optional (§1's Vercel-verification
requirement is load-bearing, proven twice already), and stating the
`Sals3-Official`/`louieboi09` half alongside it is what keeps a developer
from reaching for whichever account is already active out of habit and
authoring vault history under the identity that is supposed to be reserved
for deployable code.

## System impact

- **Cost:** none directly. Prevents undeployable merges and org/account
  confusion already paid for at least twice, and closes a documentation gap
  found live during the audit that produced this ADR.
- **Security:** unaffected.
- **Data:** none.
- **Modules:** `sals3-ecommerce`'s `.github/workflows/` (needs the
  environment-gate workflow `sals3-portal` already has);
  `sals3.com.fj`'s branch protection (needs a `pre-prod` branch and the same
  gate workflow before its first production promotion).
- **Workflow:** makes explicit, as vault law, what one repository's README
  and one repository's workflow file already did by convention, and extends
  both to every current and future `anythingsupplies` repository.
- **Rollback:** none needed — this ADR removes ambiguity rather than adding
  behaviour.

## Required verification

- [ ] `sals3-ecommerce` gets an environment-reached gate workflow equivalent
      to `sals3-portal`'s `deployment-reached-the-environment.yml`.
- [ ] `sals3.com.fj` gets a `pre-prod` branch and the same gate workflow
      before its first production promotion.
- [ ] The `sals3-ecommerce` twin PR that `sals3.com.fj` PR #1's own body
      names as still-open is opened.
- [ ] `sals3-admin-portal`'s status on `anythingsupplies` is resolved —
      either populated from wherever its prior work actually lives, or
      explicitly deferred with a reason recorded here or in its own note.
- [ ] A local test/build run against `Sals3-Official` never originates an
      `anythingsupplies` deploy, and vice versa — no tooling in either
      repository should be able to cross the boundary this ADR draws.

## Supersession

None. This generalizes `sals3-portal`'s own README *Environments* section
and its `deployment-reached-the-environment.yml` workflow — until now fully
wired in only one of four `anythingsupplies` repositories — into a
vault-level, cross-repository rule that does not depend on any one
repository's README staying accurate. It generalizes
[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]'s
environment-boundary reasoning (which governs CJ calls specifically) to the
GitHub org boundary itself, and it does not change that ADR's CJ-specific
rules, ADR-013's evidence rules, or any pricing/catalog/publication
governance ADR.

## Source anchors

Audited directly on 2026-09-04 against:

- `gh api repos/anythingsupplies/{sals3-portal,sals3-ecommerce,sals3.com.fj,sals3-admin-portal}`
  and their `/branches` and `/contents/.github/workflows` endpoints.
- `sals3-portal`'s own `README.md` *Environments* section and *A merge is
  not a deployment* section (`.github/workflows/deployment-reached-the-environment.yml`).
- `sals3-ecommerce`'s and `sals3.com.fj`'s `README.md` *Environments*
  sections (identical text, only one repository's settings match it).
- `anythingsupplies/sals3.com.fj` PR #1 and `anythingsupplies/sals3-portal`
  PR #36/#37/#38/#39/#42/#44, the merged-but-undocumented work this ADR's
  companion session notes (parts 129–131) close out.

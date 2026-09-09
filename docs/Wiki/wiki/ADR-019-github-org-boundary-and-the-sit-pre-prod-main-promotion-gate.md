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

## Amendment — 2026-09-08: there are six repositories, not four

The *Problem* and *Evidence* sections above name **four** `anythingsupplies`
repositories, audited 2026-09-04. That count was already stale when written and
is now wrong by two. A full org enumeration on 2026-09-08 found **six**.

This amendment changes no rule. It corrects the scope the rules apply to, which
is the part of an audit that decays fastest.

### The two this ADR never named

- **`sals3-portal-automation`** — recorded in [[hot]] and
  [[sals3-session-2026-09-04-part140-the-automation-repository|part 140]] as
  "the fifth repository", written the same day as this ADR and never folded back
  into it. **It is exempt from section 2 by design**: its branches deploy
  nothing, there is no Vercel project behind them, and an absent deployment
  status there means nothing at all. Auditing it against the gate produces a
  false finding.
- **`sals3.com.au`** — a live production storefront serving **A$ prices**, forked
  from `sals3-ecommerce` the same way `sals3.com.fj` was, under section 3 of this
  ADR. Before [[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger|part 148]]
  **this vault had never described it.** A vault-wide search returned two
  incidental hits, both in
  [[sals3-session-2026-08-28-part82-a-shopfront-per-country-and-a-price-in-local-money|part 82]],
  where the string appears as a *rejected domain proposal*.

That second one is a section 4 failure — *"a vault entry is part of done"* — at
the granularity of a whole repository rather than a pull request.

### Evidence — re-audited 2026-09-08

Checked directly against the GitHub API (`gh repo list anythingsupplies`, then
`.../branches` and `.../contents/.github/workflows` per repository), not against
README claims:

| Repository | `develop`/`pre-prod`/`main` | Environment-gate workflow | Merged PRs |
|---|---|---|---|
| `sals3-portal` | ✅ all three | ✅ `deployment-reached-the-environment.yml` | 165 |
| `sals3-ecommerce` | ✅ all three | ✅ **now present** — ported by [#15](https://github.com/anythingsupplies/sals3-ecommerce/pull/15) | 32 |
| `sals3.com.fj` | ✅ **all three** — `pre-prod` created 2026-09-07 for the UAT stage ([#19](https://github.com/anythingsupplies/sals3.com.fj/pull/19)) | ❌ **missing**, despite its README stating the three-stage table verbatim | 34 |
| `sals3.com.au` | ✅ all three | ❌ **missing** — inherited the gap when it was forked | 10 |
| `sals3-portal-automation` | ✅ all three | **n/a — exempt by design**, see above | 2 |
| `sals3-admin-portal` | — **empty**: zero commits, zero branches | — | 0 |

**Two rows moved since 2026-09-04**, both in the right direction:
`sals3-ecommerce` gained the workflow, and `sals3.com.fj` gained `pre-prod`.
**What is still owed is one file, twice**:
`deployment-reached-the-environment.yml` on both market storefronts.

`sals3-admin-portal` is unchanged and still not assessed: whether its work exists
on `Sals3-Official`'s copy and has simply not been migrated, or was never pushed
anywhere, was **not verified** in this pass either and must not be assumed.

> [!DANGER] On `sals3-portal` this gate cannot report at all
> Every workflow in `anythingsupplies/sals3-portal` has been failing in ~4s
> unstarted since 2026-09-04 on Actions billing, and the owner has decided those
> bills will not be paid. A ✅ in the table above is **the presence of the file,
> not evidence it has ever run.** Compliance on that repository is currently
> established by a hand-read of the Vercel deployment status plus a local
> `npm run verify` — which is what parts 143–152 each record doing.
>
> **Corrected 2026-09-09: the Vercel half of that sentence was already false
> when it was written.** See the *2026-09-09* amendment below — Vercel's status
> on this vault repository has read `Account is blocked.` since 2026-09-07, and
> the per-repository regime that replaces it is in that amendment's section 3.

### Standing rule added by this amendment

**Re-derive the repository list; do not recall it.** Both the fifth and the sixth
repository were found by enumerating the org, and the sixth was found while
auditing the fifth's own ADR. Before relying on any row of the table above, run
the enumeration again — the same discipline this ADR already asks for its
branch and workflow claims, applied one level up to the set of repositories
itself.

Corollary from section 3: **a fork inherits every open defect and adds a place
the vault has to know about.** Three storefront deployments now exist from one
codebase, so a storefront defect exists in three places until fixed in three —
demonstrated by the six pull requests in
[[sals3-session-2026-09-07-part147-a-market-storefront-offers-its-own-country|part 147]],
which are three fixes applied twice.

## Amendment — 2026-09-09: promotions merge, they never squash

The *Decision* section above mandates the three stages and says nothing about
**how** each promotion is merged. Squash was used throughout, and it silently
destroyed the ancestry the next promotion needed.

By 2026-09-08 `pre-prod` carried **54 commits** and `main` **55** that no other
branch shared, while `git diff origin/develop origin/pre-prod` was **empty** —
identical trees, unrelated histories. Git merges on history, so the first
promotion touching a file changed on both sides had two lineages for it and
conflicted. Two promotions of a one-line comment fix landed `DIRTY` and were
closed unmerged (`sals3-portal` [#184](https://github.com/anythingsupplies/sals3-portal/pull/184),
[#187](https://github.com/anythingsupplies/sals3-portal/pull/187)).

### The rule

> **A promotion merges with a merge commit (`--merge`). Never `--squash`.
> Feature branches into `develop` may still squash.**

The distinction is about what the branch is for, not about tidiness:

- **A feature branch is disposable.** Squashing it into `develop` summarises work
  nothing will ever merge from again.
- **A promotion branch is permanent and merged from repeatedly.** `pre-prod` and
  `main` are merged into for the life of the project, so each needs a true
  ancestry link to the branch below it. Squashing there throws away the only
  thing the next merge needs.

Pre-flight check, one command, exit-code answer:

```bash
git merge-base --is-ancestor origin/develop origin/pre-prod
```

Repair, where the drift already exists: merge bottom-up with merge commits
(`develop` → `pre-prod`, then `pre-prod` → `main`). No content change is
involved — the trees are already identical — and the point is only to make each
branch a genuine ancestor of the next (`sals3-portal` #189/#190).

### Audited 2026-09-09 — only one repository had the drift

Checked with `gh api repos/anythingsupplies/<repo>/compare/<base>...<head>`,
where a status of `ahead` means the base **is** an ancestor of the head:

| Repository | `develop`→`pre-prod` | `pre-prod`→`main` | Tree difference |
|---|---|---|---|
| `sals3-portal` | `diverged` (ahead 58, behind 1) | `ahead` 59 | none |
| `sals3-ecommerce` | **`ahead`** 11 | **`ahead`** 12 | none |
| `sals3.com.fj` | **`ahead`** 9 | **`ahead`** 6 | **`README.md`, +61/-11** |
| `sals3.com.au` | **`ahead`** 9 | **`ahead`** 8 | none |
| `sals3-portal-automation` | `diverged` (ahead 1, behind 8) | `ahead` 1 | none |

**The three storefronts have healthy ancestry on both pairs**, which is the
opposite of what the obvious inference predicted — consistent with `sals3-portal`
having by far the most promotions (196 merged PRs against 31–40). The remaining
`behind` counts on `sals3-portal` and the automation repository are ordinary
unpromoted `develop` work, not drift.

**One item owed:** `sals3.com.fj`'s `pre-prod` carries a `README.md` its
`develop` does not — the only tree difference anywhere in the org. A
documentation change landed on the promotion branch and was never brought back
down, so the branch that stages releases describes the deployment differently
from the branch every feature starts from. Back-merge it to `develop` rather than
letting the next promotion overwrite it.

This amendment supersedes nothing in the *Decision* section; it adds the merge
mechanics that section assumed. See
[[sals3-session-2026-09-08-part157-promote-with-a-merge-commit-never-a-squash|part 157]].

## Amendment — 2026-09-09: the bills will not be paid, so an agent is the CI

> [!DANGER] Supersedes the Vercel sentence in the 2026-09-08 amendment
> That amendment's DANGER callout said compliance on `sals3-portal` is
> *"established by a hand-read of the Vercel deployment status plus a local
> `npm run verify`"*. **The Vercel half of that was already false when it was
> written.** See §2 — and the corrected regime in §3.

**Owner decision 2026-09-09 (Bogs): the GitHub Actions and Vercel bills will not
be paid.** Verification stops being something a platform does and becomes
something **an agent does and records by hand.** This amendment writes down what
each repository can and cannot still prove about itself, and what a merge
therefore requires.

### 1. Measured 2026-09-09, not recalled

Each repository's most recent Actions run timed `run_started_at → updated_at`,
and the Vercel commit status read from the default branch:

| Repository | GitHub Actions | Vercel |
|---|---|---|
| `Sals3-Official/sals3-ecommerce` **(vault)** | **success, 223 s — a real run** | **`Account is blocked.`** |
| `Sals3-Official/sals3-portal` | failure, **9 s** — stall | success (last 2026-09-02) |
| `anythingsupplies/sals3-portal` | failure, **3 s** | **success, 2026-09-09** |
| `anythingsupplies/sals3-ecommerce` | failure, **4 s** | success, 2026-09-08 |
| `anythingsupplies/sals3.com.fj` | failure, **4 s** | success, 2026-09-08 |
| `anythingsupplies/sals3.com.au` | failure, **3 s** | success, 2026-09-08 |
| `anythingsupplies/sals3-portal-automation` | no runs | n/a — deploys nothing |

**The two orgs fail in opposite directions.** The vault repository has working CI
and blocked deployments; every application repository has dead CI and working
deployments. A run finishing in 3–9 seconds executed **zero steps** — that is the
billing stall, and duration is the only thing separating it from a real failure.

**The live product is unaffected**: `sals3.com`, `sals3.com.au`, `sals3.com.fj`
and `sals3-portal-prod.vercel.app` all answered **HTTP 200** on 2026-09-09.

### 2. The blocked Vercel project is the legacy one, and it is only the vault's

The block is scoped to the Vercel project still attached to
`Sals3-Official/sals3-ecommerce` — the repository that stopped being the code
home at the 2026-09-03 migration and now hosts this vault. Its boundary is
exact: `fc8da70` (2026-09-07) is the last success; `0efa075` (2026-09-08) is the
first `Account is blocked.` **Nine commits** carry a blocked or absent status,
all vault-only content.

**Commit authorship is not a factor here**, and the table proves it: both
`louieboi09` and `anythingsupplies` commits succeed before the boundary and fail
after it. Do not diagnose this as ADR-019's *"commit authored under the wrong
identity"* fault — that one reports `Deployment was blocked`, a different
sentence with a different cause.

The practical cost is not a lost deployment. It is that **every vault pull
request now carries a permanent red check**, which is the condition under which
reviewers stop reading checks at all.

### 3. What a merge requires, per repository

| Repository | Required before merge |
|---|---|
| `Sals3-Official/sals3-ecommerce` | the Actions `verify` run **is** trustworthy — read it. **Ignore the Vercel check**: it is the legacy project and cannot go green |
| every `anythingsupplies` application repository | a named agent's local `npm run verify`, **quoted in the PR body**, plus a read of the Vercel commit status, which does still work there |
| `sals3-portal-automation` | local test run only; it deploys nothing |

**A red check is no longer evidence of a problem, and a green check is no longer
evidence of safety.** Both need a per-repository reading, which is why this table
is here rather than in anyone's memory.

### 4. The two standing obligations this puts on the agent

1. **Run `npm run verify` locally and quote its real output** — the actual
   counts, never "it passed". Parts 143–159 already do this; it is now required
   rather than conventional. Where a check could not be run, say so as a blocker,
   per `AGENTS.md`.
2. **Re-derive the table in §1 before relying on it.** It is a snapshot of a
   billing state that changes the day someone pays, and it has already inverted
   once. Same discipline this ADR already asks for its branch and workflow
   claims, and for the repository list itself.

### 5. Owed

**Detach or delete the Vercel project on `Sals3-Official/sals3-ecommerce`.** It
deploys a repository that no longer holds the application, and removing it ends
the permanent red check on every vault PR — worth more than the signal it
produces. Owner action; not done under this amendment.

See [[sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci|part 160]]
for the audit this amendment rests on, including three wrong generalisations
made from partial evidence in the course of finding it.

## Amendment — 2026-09-10: the gate is tested at every stage, and the three sites move together

**Owner rule 2026-09-10 (Bogs), strict adherence.** This ADR established *that*
the three stages exist. It said nothing about **testing** at each one, and
nothing about the three storefronts moving as a set. Both are now required.

### The flow, in the owner's own framing

```
SIT  →  test  →  UAT  →  the same test  →  Main  →  test again
```

**All three websites walk it together** — Global, FJ and AU:

| Site | Repository | SIT | UAT | Main |
|---|---|---|---|---|
| **Global** | `sals3-ecommerce` | `sit.sals3.com` | `uat.sals3.com` | `sals3.com` |
| **FJ** | `sals3.com.fj` | `sit.sals3.com.fj` | `uat.sals3.com.fj` | `sals3.com.fj` |
| **AU** | `sals3.com.au` | `sit.sals3.com.au` | `uat.sals3.com.au` | `sals3.com.au` |

### These are the stages this ADR already names, under their environment names

`SIT` is `develop`, `UAT` is `pre-prod`, `Main` is `main`. **One gate, not two.**
The environment names are what the team says out loud; the branch names are what
git sees. Everything this ADR already requires of the branch flow — including the
2026-09-09 rule that a promotion merges **with a merge commit, never a squash** —
applies unchanged.

### What is new

1. **A stage that has not been tested has not been passed.** An absent result is
   a fail, not a neutral. This closes the case where a promotion was merged
   because nothing had gone visibly wrong.
2. **The same test runs at every stage.** UAT does not get a lighter check
   because SIT was green, and Main does not get a lighter check because UAT was.
   Each stage is a different deployment with its own configuration and its own
   environment variables — the 2026-09-09 audit found the two orgs failing in
   *opposite* directions, and a stage's own history in this repository is full of
   defects that existed at one stage and not another.
3. **Either the team or the AI may run the test**, and whoever runs it **says
   what they observed** — which site, which stage, what was seen. Not "tested".
   An untraceable pass is the same as no pass, and this ADR's own evidence tables
   are the standard.

### The rule is now in the bible, and the bible is now required reading

Before today this gate lived only here, and `AGENTS.md` did not require anyone to
read this ADR. Reaching the rule meant noticing one line in [[hot]], following a
wikilink, and finding the right amendment — three optional steps. **In that gap
every promotion was squash-merged for weeks**, leaving `pre-prod` and `main` with
54 and 55 commits no other branch had, until a one-line fix could not be promoted
at all (see
[[sals3-session-2026-09-08-part157-promote-with-a-merge-commit-never-a-squash|part 157]]).

`sals3-management-bible.md` section 7 now carries the rule, and `AGENTS.md`
requires both the bible and this ADR. A rule that has to be discovered is a rule
that will be missed.

### Not settled by this amendment

**Which test.** The owner's instruction says *"test"* and *"the same test"* without
naming a procedure. `npm run verify` covers the code before it deploys; it does
not exercise a **deployed** SIT, UAT or Main host, and the three storefronts have
no shared post-deploy checklist. Until one exists, "tested" means whatever the
person or agent running it decided — which is exactly the ambiguity point 3 above
tries to contain by demanding they say what they observed. Recorded in
[[pending-register]] rather than invented here.

### Who runs it — added by the same owner rule

**Whoever opens a pull request and merges it must have run the verification
themselves.** Not inherited from an earlier run, not assumed from a green tick,
not left to whoever reviews it later. **If you did not run it, you may not merge
it.**

This ADR's 2026-09-09 amendment said *"a named agent's local `npm run verify`,
quoted in the PR body"*, which implies the author runs it and says nothing about
the person merging. That gap is how "the agent is the CI" decays into nobody
being the CI: the author assumes the merger will check, the merger assumes the
author did, and the change lands unverified with both believing it was covered.
Now stated in [[sals3-management-bible]] section 8.

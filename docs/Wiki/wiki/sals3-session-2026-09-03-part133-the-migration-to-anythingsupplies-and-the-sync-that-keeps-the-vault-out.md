---
tags: [sals3, session, infrastructure, github, ci, promotion-gate, vault-hygiene]
aliases:
  - Part 133
  - The Migration To anythingsupplies
  - The Sync That Keeps The Vault Out
created: 2026-09-03
updated: 2026-09-07
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-session-2026-09-02-part125-two-ways-buyer-login-was-dead-and-a-release-that-had-to-land-in-order]]"
  - "[[agent-operating-contract]]"
  - "[[project-structure-installation-and-runbook]]"
  - "[[hot]]"
---

# Part 133 — the migration to `anythingsupplies`, and the sync that keeps the vault out

> [!NOTE] Provenance
> Written 2026-09-07 after the fact, from each pull request's own merged record
> in `anythingsupplies/sals3-portal` and `anythingsupplies/sals3-ecommerce`.
> The repository inventory, the branch-tip comparisons and the local-clone
> remotes in §7 were read directly from the GitHub API and from the clones on
> this machine on 2026-09-07; everything else is the PRs' own account of itself.

| Repo | PR | Title | Merged |
|---|---|---|---|
| portal | [#1](https://github.com/anythingsupplies/sals3-portal/pull/1) | release: bring main up to develop (through upstream PR #286) | 2026-08-31 |
| portal | [#2](https://github.com/anythingsupplies/sals3-portal/pull/2) | release: repair the collapsed vault note in AGENTS.md | 2026-09-01 |
| portal | [#3](https://github.com/anythingsupplies/sals3-portal/pull/3) | release: bring main up to pre-prod | 2026-09-01 |
| portal | [#5](https://github.com/anythingsupplies/sals3-portal/pull/5) | chore: sync develop from Sals3-Official through PR #304 (vault excluded) | 2026-09-01 |
| portal | [#6](https://github.com/anythingsupplies/sals3-portal/pull/6) | chore: sync develop from Sals3-Official through PR #309 (vault excluded) | 2026-09-02 |
| ecommerce | [#1](https://github.com/anythingsupplies/sals3-ecommerce/pull/1) | release: bring main up to develop (through upstream PR #214) | 2026-08-31 |
| ecommerce | [#4](https://github.com/anythingsupplies/sals3-ecommerce/pull/4) | chore: sync develop from Sals3-Official through PR #228 (vault excluded) | 2026-09-01 |
| ecommerce | [#5](https://github.com/anythingsupplies/sals3-ecommerce/pull/5) | chore: sync develop from Sals3-Official through PR #230 (vault excluded) | 2026-09-02 |
| ecommerce | [#15](https://github.com/anythingsupplies/sals3-ecommerce/pull/15) | chore(ci): fail when a merge does not reach its environment | 2026-09-03 |

No DDL. No CJ call. No dependency change in any of them.

[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate|ADR-019]]
records the *decision* — `anythingsupplies` for code, `Sals3-Official` for this
vault. This note records the *mechanics*, because the mechanics are what a
future reader will trip over: PR numbers that restart at 1, a `develop` that is
not a fast-forward of anything, and a sync script that is the only reason the
two histories stayed in step for the three days it took to finish moving.

## 1. Why the PR numbers restart, and why a bare number is now ambiguous

Both application repositories were re-created under `anythingsupplies` from an
initial import rather than transferred, so their pull-request numbering starts
again at `#1`. As of this note `anythingsupplies/sals3-portal` is at `#68` while
`Sals3-Official/sals3-portal` reached `#309`.

**Every number below 310 therefore names two different pull requests.** A note
that says "portal #53" is unreadable without an org. From part 125 onward this
vault writes them as full URLs for exactly this reason, and the audit that
produced parts 133–140 had to be scoped by org to mean anything — a bare
`sals3-portal/pull/[0-9]+` grep counts the wrong repository's history as
documented.

> [!WARNING] Reading a PR reference in this vault
> Anything written before 2026-09-02 that names a portal or ecommerce PR by
> number alone means **`Sals3-Official`**. Anything after means
> **`anythingsupplies`** unless the URL says otherwise. There is no way to tell
> from the number itself.

## 2. `apply-company-account-changes.sh`, and the three differences it re-applies

The new repositories are not forks and do not pull. Each sync is a **file-level
snapshot** of `Sals3-Official`'s `develop` at a named upstream PR, applied as a
three-way patch so the company account's own commits survive untouched.

Three differences are re-applied on every snapshot, because a straight copy
would overwrite them:

1. **husky gates `main` only** — direct commits and pushes to `main` are
   refused; `develop` is open. This is why every `main` move is a release PR and
   never a push.
2. **`docs/` is gitignored** — the vault must not exist in these repositories.
3. **vault paths read `<sals3-brain-vault>/Wiki/wiki/...`** — `AGENTS.md` can no
   longer point at a sibling `docs/` folder that is not there.

Each sync PR names its upstream range and what it deliberately left behind:
portal #5 stops at upstream #304 and **excludes upstream #305** (internal API
read routes, still being worked on); ecommerce #4 stops at #228 and **excludes
#229 as vault-only**.

The three-way application is also what caught a real conflict rather than
silently resolving one. ecommerce #4 records that the Vercel protection bypass
and the new free-shipping client both wanted `src/services/storefront/client.ts`,
and they were merged rather than overwritten.

## 3. The vault's absence is audited, not assumed

Both first releases carry the same four-way audit of the same claim, and it is
worth copying:

- no `docs/`/`obsidian`/`Wiki`/`vault` path in any commit of any ref;
- none in any reachable git object;
- none in the working tree;
- **the recursive tree GitHub actually stores** for `develop` — 1,268 blobs on
  the portal, 513 on the storefront — carries zero vault paths.

The fourth is the one that matters. The first three are statements about a local
clone; only the last is a statement about what the remote is holding. And the
sync script **fails hard** rather than let a vault file through, so the property
is maintained by construction rather than by the next person remembering.

## 4. The husky guard was checking the wrong ref

portal #3 carries a one-line fix worth more than its diff: the pre-push hook
guarded **the checked-out branch** rather than **the ref being pushed to**.

`git push origin HEAD:main` from a feature branch passed the gate. The hook now
reads the destination ref, which is the only thing the gate is actually about.
The same PR adds `pre-prod` to the branch model and to both workflows, so the
three-stage promotion ADR-019 later made law was wired before it was written
down.

## 5. A `\n` that was correct by hand and broke on its first re-run

portal #2 exists because the vault note in `AGENTS.md` rendered as one long line
with a stray blockquote marker on the sentence after it.

The cause is precise and generalises: `apply-company-account-changes.sh` built
the note as a **single-quoted shell string containing `\n` escapes** and handed
it to perl through `%ENV`, where perl does not interpret them. It was correct
when a person applied it by hand, and broke **the first time the script
re-applied it after an upstream sync** — so the defect was introduced by the
automation of a step that had always worked.

The repair builds the note with `printf`, so the value holds real newlines, and
adds an assertion that refuses to finish if the note's own line ever carries a
literal `\n` again. That assertion is **scoped to the note line on purpose**: a
broader first version flagged a `FIREBASE_PRIVATE_KEY` example in the ecommerce
README that legitimately contains `\n` escapes.

> [!TIP] The same family as the scripted `String.replace`
> Part 90's repair endpoint ran the wrong migration because a scripted
> `String.replace` matched nothing and said nothing. Here a scripted string
> substitution produced the wrong *bytes* and said nothing. Both are the same
> rule: **a scripted edit needs an assertion about its own result**, because the
> edit's success and the edit's correctness are different facts.

## 6. What the first production release was actually for

portal #3 reads as housekeeping — four commits, five files, no application
logic. Its own summary says what it was really doing:

> The storefront's empty product rails on `sals3.com` were caused by
> `SALS3_STOREFRONT_API_TOKEN` not matching between this project and
> `sals3-ecommerce`.

That variable is **a single Vercel record covering Production and Preview**, so
Production carried the same mismatch that had already broken `uat` and `sit`
(part 125). Both values were set to one shared token — and merging this PR is
what picks it up, because **the Developer role cannot create a Production
deployment directly (403)**. A no-op release existed solely to produce a fresh
build.

Recorded as still owed by the PR itself: **rotate that shared token**, since it
was pasted into a working transcript. Any value works as long as it is identical
on both projects. This vault has no evidence the rotation happened.

## 7. What did not come across, and what is still behind

Named by the PRs, and each is a live constraint rather than a footnote:

- **Migration `0035_icy_risque` is not applied to production by merging.** Vercel
  never runs `db:migrate` here; DDL arrives only through the `CRON_SECRET`
  break-glass workflow — for this one, `reviews-migrate-review-extras`. That
  workflow is `workflow_dispatch`-only and, at the time of portal #1, the new
  repository had **neither `CRON_SECRET` nor `PORTAL_BASE_URL` set**, so it could
  not be dispatched from there at all.
- **`orders-status-sync` is disabled** in the new portal repository — the file is
  byte-identical to upstream, but its `CRON_SECRET` could not be recovered from
  Vercel. The old repository keeps running the sync.
- **`checkout-diagnose-freight-quote.yml`** arrived with portal #5 and needs the
  same two settings before it can be dispatched there.

Read on this machine on 2026-09-07, the local clones are all *behind* and none is
ahead — no local-only work is at risk anywhere:

| Clone | Remote(s) | State |
|---|---|---|
| `E:\sals3-portal` | `origin` = anythingsupplies, `sals3-official` = old | `main` 66 behind; `develop` still tracks **the old org**, `develop-local` tracks the new one and is 32 behind |
| `E:\sals3-ecommerce` | `newco` = anythingsupplies, `origin` = **Sals3-Official** | this is the **vault** clone; its `develop` follows Sals3-Official and is 10 behind |
| `E:\sals3-com-fj` | `origin` = anythingsupplies | `develop` 4 behind, `main` level, **no `pre-prod` branch exists at all** |
| `E:\sals3-admin-portal` | `origin` = **Sals3-Official** | `develop` level; the `anythingsupplies` twin is still empty |

> [!WARNING] `develop` means two different things in the portal clone
> In `E:\sals3-portal`, the branch named `develop` tracks
> `sals3-official/develop` and the branch named `develop-local` tracks
> `origin/develop` on `anythingsupplies`. A `git checkout develop` there puts you
> on the **retired** line. This is a local naming accident, not a repository
> fact, but it will mislead exactly once.

## 8. The gate ADR-019 found missing on the storefront now exists

ecommerce #15 ports `deployment-reached-the-environment.yml` from the portal
(`anythingsupplies/sals3-portal#8`) **unchanged**. Nothing in it is
portal-specific — it reads only `github.com/<owner>/<repo>` and the commit's own
`Vercel` deployment-status context — and the PR confirmed via
`gh api repos/anythingsupplies/sals3-ecommerce/commits/<sha>/status` that this
repository's commits carry that exact context before adding it.

Before this, `sals3-ecommerce` had **no gate at all**: a commit Vercel refused to
build for an unverifiable author would merge with `Verify` green and report
nothing anywhere a person looks. That is the precise gap ADR-019's audit named.
The matching *A merge is not a deployment* section was added to the README in the
same PR, so the document and the workflow cannot disagree.

**`sals3.com.fj` still has neither the gate nor a `pre-prod` branch**, and
`sals3-admin-portal` is still empty on `anythingsupplies`. Two of ADR-019's four
audit rows are closed; two are open.

## What was not done

- The shared `SALS3_STOREFRONT_API_TOKEN` was **not rotated**, or at least no
  record of a rotation exists.
- `CRON_SECRET` and `PORTAL_BASE_URL` were **not** set on
  `anythingsupplies/sals3-portal` in this work, so three break-glass workflows
  arrived inert there.
- `sals3-admin-portal` was not migrated. Its only clone still points at
  `Sals3-Official`, and its local `feat/category-governance-schema` branch
  carries a commit (`f700c57`, ADR-014 Stage 1 category-governance decisions)
  that has never been part of any pull request in either org.
- Nothing was done about the two `develop` branches in one clone meaning two
  different lines.

## Lessons

- **A repository re-created rather than transferred restarts its numbering, and
  every historical reference silently becomes ambiguous.** The cost is not the
  migration; it is every note, comment and commit message written before it.
  Write the org into the reference from the first day, not the day it starts
  hurting.
- **The only audit of "the vault is not in this repository" that means anything
  is the tree the remote actually stores.** A clean working tree, a clean log and
  a clean object walk are all statements about a local clone.
- **A step that was always done by hand can be broken by automating it.** The
  `AGENTS.md` note was correct until the script re-applied it, and correct
  again once the script asserted its own output.
- **A guard has to name the thing it is guarding.** A pre-push hook that reads
  the checked-out branch is not guarding a branch, it is guarding a habit.
- **A release PR with no code in it can still be the load-bearing change.** The
  production build was the deliverable; the diff was the receipt.

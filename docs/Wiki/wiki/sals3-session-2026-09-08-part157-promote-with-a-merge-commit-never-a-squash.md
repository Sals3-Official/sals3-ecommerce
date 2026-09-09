---
tags: [session-record, sals3, governance, adr-019, git, promotion-gate]
aliases:
  [
    "Part 157",
    "Promote with a merge commit, never a squash",
    "The 54 commits pre-prod had and develop never did",
  ]
created: 2026-09-09
updated: 2026-09-09
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger]]"
  - "[[sals3-session-2026-09-08-part154-the-apex-prices-from-its-own-global-offer]]"
---

# Part 157 — Promote with a merge commit, never a squash

> [!IMPORTANT] This is a mechanics correction to ADR-019's promotion gate
> ADR-019 mandates `develop` → `pre-prod` → `main` and says nothing about **how**
> each promotion is merged. Squash was used throughout, and it silently
> accumulated divergence until a promotion could not land at all. The rule now
> lives in `sals3-portal`'s README and is recorded here as vault law.

> [!NOTE] Provenance
> Written after the fact from the four PRs' own records and their GitHub state,
> read 2026-09-09. All are `anythingsupplies/sals3-portal`.

| PR | State | What it was |
| --- | --- | --- |
| [#184](https://github.com/anythingsupplies/sals3-portal/pull/184) | **CLOSED, never merged** | a promotion that landed `DIRTY` |
| [#187](https://github.com/anythingsupplies/sals3-portal/pull/187) | **CLOSED, never merged** | the retry, also `DIRTY` |
| [#189](https://github.com/anythingsupplies/sals3-portal/pull/189) | merged 20:41 | reunify `pre-prod` with `develop` — merge commit, identical trees |
| [#190](https://github.com/anythingsupplies/sals3-portal/pull/190) | merged 20:42 | reunify `main` with `pre-prod` — same, one step up |
| [#191](https://github.com/anythingsupplies/sals3-portal/pull/191) | merged 20:58 | the README rule, so it does not recur |

## 1. Identical trees, incompatible histories

Every promotion had been **squash-merged.** A squash writes a *new* commit
carrying the diff, so `pre-prod` and `main` accumulated commits `develop` never
had — while their **trees stayed byte-identical**:

```
git diff origin/develop origin/pre-prod   →  empty
```

By 2026-09-09 that was **54 commits on `pre-prod`** and **55 on `main`** that no
other branch shared.

**Nothing was wrong with the content.** The divergence was pure history. And
history is what a merge uses to find a common ancestor — so the moment a
promotion touched a file that had been changed on both sides, git had two
unrelated lineages for it and produced a conflict.

That is what happened to the scan-comment correction from
[[sals3-session-2026-09-08-part154-the-apex-prices-from-its-own-global-offer|part 154]]
§4: **#184 landed `DIRTY`, #187 retried and landed `DIRTY` too.** Both were
closed. A one-line comment fix could not be promoted.

> The failure mode is the worst shape a git problem can have: **it accumulates
> invisibly while every check passes**, and the first symptom is a promotion that
> cannot merge — not the promotion that caused it.

## 2. The repair, and why it is two PRs

#189 merged `develop` into `pre-prod` **with a merge commit**, and #190 merged
`pre-prod` into `main` the same way. **No content change in either** — the trees
were already identical. What the merge commits do is record the other branch's
history, so `develop` and `pre-prod` become genuine **ancestors** of `main` and
future promotions have a common base to merge from.

One minute apart, bottom-up, because the ancestry has to be established in the
direction the promotions flow.

## 3. The rule

> **Promotions merge with a merge commit (`--merge`), never `--squash`.
> Feature branches into `develop` may still squash.**

The distinction is exactly right and worth stating as reasoning rather than
convention:

- **A feature branch is disposable.** Squashing it into `develop` is a
  *summarisation* of work that will never be merged from again. Nothing later
  needs its internal history.
- **A promotion branch is permanent and merged from repeatedly.** `pre-prod` and
  `main` are merged into for the life of the project, so each one needs a true
  ancestry link to the branch below it. Squashing there throws away the only
  thing the next merge needs.

The one-line check to run before promoting when in doubt:

```bash
git merge-base --is-ancestor origin/develop origin/pre-prod
```

Exit `0` means `pre-prod` genuinely descends from `develop` and the next
promotion is clean. A non-zero exit is the divergence above, before it costs a PR.

## 4. What this means for the promotion ledger

[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger|Part 148]]
established that promotion PRs get no session entry of their own, naming three
exceptions — one that bundles a change, one that carries nothing, and **one that
fails.** #184 and #187 are the first recorded instance of the third, and #189/#190
are a fourth kind worth adding: **a promotion whose entire purpose is the
history, with no diff at all.**

## 5. The other three repositories are clean — checked, not assumed

The obvious inference is that the same drift sits in every repository running the
same gate. **It does not, and the check was one command per repository.** Audited
2026-09-09 via `gh api repos/anythingsupplies/<repo>/compare/<base>...<head>`,
where a status of `ahead` means the base **is** an ancestor of the head:

| Repository | `develop`→`pre-prod` | `pre-prod`→`main` | Tree difference |
| --- | --- | --- | --- |
| `sals3-portal` | `diverged` (ahead 58, behind 1) | `ahead` 59 | none |
| `sals3-ecommerce` | **`ahead`** 11 | **`ahead`** 12 | none |
| `sals3.com.fj` | **`ahead`** 9 | **`ahead`** 6 | **1 file** — see below |
| `sals3.com.au` | **`ahead`** 9 | **`ahead`** 8 | none |
| `sals3-portal-automation` | `diverged` (ahead 1, behind 8) | `ahead` 1 | none |

**The three storefronts have healthy ancestry on both pairs.** Only
`sals3-portal` carried the squash divergence, which is consistent with it having
by far the most promotions — 196 merged PRs against 31–40. `sals3-portal`'s
remaining `behind 1` and the automation repository's `behind 8` are ordinary
unpromoted work on `develop`, not drift.

### One real finding the check did turn up

`sals3.com.fj`'s `pre-prod` carries a **`README.md` that `develop` does not** —
`+61/-11`, the only tree difference anywhere in the org. A documentation change
landed on the promotion branch and was never brought back down, so the branch
that stages releases describes the deployment differently from the branch every
feature starts from. It is not a code risk; it is the exact shape of staleness
ADR-019 exists to prevent, and it should be back-merged to `develop` rather than
overwritten by the next promotion.

## Lessons

- **Squash-merging a long-lived branch destroys the ancestry the next merge
  needs.** Identical trees are not identical histories, and git merges on
  history.
- **The damage accumulates silently and surfaces on an unrelated PR.** 54 commits
  of drift cost a one-line comment fix two closed pull requests.
- **Squash where the branch is disposable; merge where it is merged from again.**
  Feature → `develop` may squash. `develop` → `pre-prod` → `main` may not.
- **`git merge-base --is-ancestor` is the cheap pre-flight.** One command,
  exit-code answer, run before promoting when in doubt.
- **A process rule discovered by an outage belongs in the README *and* the
  vault.** The README stops the next commit; the vault stops the next repository.
- **Run the cheap check before generalising the finding.** The natural inference
  — "every repository on this gate has this drift" — was **wrong**: only
  `sals3-portal` had it, and one command per repository proved it. The audit also
  found something the inference never would have: a README that exists on
  `sals3.com.fj`'s `pre-prod` and not on its `develop`.

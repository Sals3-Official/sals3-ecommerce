---
tags:
  - moc
  - governance
  - repositories
  - inventory
  - sals3
  - adr-019
aliases:
  - Repository Register
  - The Eleven Repositories
  - Sals3 Repository Inventory
created: 2026-09-11
updated: 2026-09-11
status: current-state
authority: implementation-state
owner_approved: false
related:
  - "[[hot]]"
  - "[[index]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[pending-register]]"
  - "[[vault-governance-and-note-lifecycle]]"
  - "[[vault-session-note-conventions]]"
  - "[[sals3-session-2026-09-03-part133-the-migration-to-anythingsupplies-and-the-sync-that-keeps-the-vault-out]]"
  - "[[sals3-session-2026-09-04-part140-the-automation-repository]]"
  - "[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger]]"
  - "[[sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci]]"
  - "[[sals3-session-2026-09-11-part169-the-eleven-repositories-and-the-admin-portal-nobody-audited]]"
---

# Sals3 Repository Register

> [!IMPORTANT] This note is the answer to "how many repositories are there"
> Stop re-deriving it in prose inside session notes. Four audits have produced
> four different counts, each one correct about the set it looked at and wrong
> about the set that exists. This note holds the whole set, says what each
> repository is **for**, and — the part every previous count missed — says
> **how much of it this vault has ever described**.

> [!NOTE] Provenance
> Measured 2026-09-11 through the GitHub API under **both** accounts
> (`anythingsupplies` and `louieboi09` — neither one can see every repository,
> which is why every earlier single-account audit undercounted), plus a
> filesystem walk of every `.git` on `E:\`. Vault coverage is a literal
> `grep -ril` of each `owner/name` string across `docs/Wiki/`. Nothing here is
> recalled; re-derive it rather than trusting this table after a fork.

> [!WARNING] Derived, not reviewed
> `owner_approved: false`. This is a measurement and an inventory, in the class
> of [[hot]] — not a decision. Where it disagrees with
> [[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate|ADR-019]],
> **ADR-019 is the authority on what should be true** and this note is the
> evidence of what is.

## 1. Why the count kept changing

| Audit | Date | Said | Looked at |
| --- | --- | --- | --- |
| [[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate\|ADR-019]] | 2026-09-04 | "four repositories" | the `anythingsupplies` repos it knew by name |
| [[sals3-session-2026-09-04-part140-the-automation-repository\|part 140]] | 2026-09-07 | "the fifth" | + `sals3-portal-automation` |
| [[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger\|part 148]] | 2026-09-08 | "there are **six**" | a full enumeration of `anythingsupplies` |
| [[sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci\|part 160]] | 2026-09-09 | "all seven repositories" | 5 `anythingsupplies` + 2 `Sals3-Official` |
| **this register** | **2026-09-11** | **eleven** | **both accounts, both orgs, and the personal namespace** |

Each count is honest about its own scope. The failure is structural and worth
naming once: **every audit enumerated one org under one account.** Part 148
enumerated `anythingsupplies` and got six. Part 160 enumerated what it could see
and got seven — and dropped `sals3-admin-portal` from **both** orgs while doing
it, including the one that holds a real application. `louieboi09` cannot see
three `anythingsupplies` repositories at all ([[pending-register]], P3), and
`anythingsupplies` cannot see the personal namespace at all. **One account is
never a complete view of this project.**

## 2. The eleven repositories

Branch, PR and gate figures measured 2026-09-11. *Vault files* is the number of
Markdown notes under `docs/Wiki/` that name the repository as `owner/name`.

### Application code — `github.com/anythingsupplies` (six, all private)

| Repository | Created | Last push | Default | Branches | Merged PRs | Gate workflow | Vault files |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `sals3-portal` | 2026-08-31 | 2026-09-10 | `main` | 54 | 224 | **yes** | 32 |
| `sals3-ecommerce` | 2026-08-31 | 2026-09-11 | `main` | 20 | 56 | **yes** | 17 |
| `sals3.com.fj` | 2026-09-03 | 2026-09-10 | `main` | 17 | 61 | **no** | 18 |
| `sals3.com.au` | 2026-09-07 | 2026-09-10 | **`develop`** | 25 | 53 | **no** | 12 |
| `sals3-portal-automation` | 2026-09-04 | 2026-09-08 | `main` | 3 | 2 | n/a by design | 5 |
| `sals3-admin-portal` | 2026-09-01 | 2026-09-01 | `main` | **0** | 0 | n/a — **empty** | **0** |

Two rows carry new findings rather than restatements:

- **`sals3.com.au` defaults to `develop`; the other five default to `main`.**
  Harmless until someone opens a pull request with the default base and lands
  SIT work straight onto a production branch in one of the others, or the
  reverse. The three-stage model is identical in all six; the **default** is not.
- **`anythingsupplies/sals3-admin-portal` is genuinely empty** — the commits
  endpoint answers `409 Git Repository is empty.`, `size: 0`, zero branches,
  zero commits since it was created on 2026-09-01. It is a reserved name, not a
  repository. See §4.

### Vault and frozen history — `github.com/Sals3-Official` (three, all **public**)

| Repository | Created | Last push | Default | Branches | Merged PRs | Holds | Vault files |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `sals3-ecommerce` | 2026-08-04 | 2026-09-10 | `develop` | 100+ | 253 | **this vault**, at `docs/` | 59 |
| `sals3-portal` | 2026-08-04 | 2026-09-02 | `develop` | 100+ | 306 | frozen pre-migration history | 93 |
| `sals3-admin-portal` | 2026-08-11 | 2026-08-15 | `develop` | 4 | 3 | **the live Admin Portal application** | 6 |

ADR-019 §1 says `Sals3-Official` is retained "for exactly one purpose from this
date forward: hosting this vault". Two of these three repositories are not that.
`sals3-portal`'s application history is deliberately frozen and the ADR says so.
`sals3-admin-portal`'s is **not frozen, not migrated, and not mentioned** — §4.

### Personal namespace — `github.com/louieboi09` (two, both private)

| Repository | Created | Last push | Holds | Vault files |
| --- | --- | --- | --- | --- |
| `sals3-2nd-brain` | 2026-07-31 | 2026-08-04 | the **frozen predecessor** of this vault | 3 |
| `bogs-dashboard` | 2026-07-09 | 2026-08-01 | a **different project** — BOGS Dashboard | **0** |

- **`sals3-2nd-brain`** is the standalone Obsidian vault this one replaced. Its
  last two commits are *"Mark this standalone vault as superseded"* and
  *"Disable auto-sync on this deprecated vault"*, both 2026-08-04, and its own
  `CLAUDE.md` and `hot.md` carry the pointer here. Its 24 notes are the direct
  ancestors of the ones in this folder. **Read-only, for provenance.** The local
  clone is `E:\SALS3 2nd brain`; Obsidian Git auto-sync was turned off there by
  commit, which is the only reason it has not drifted since.
- **`bogs-dashboard`** is not a Sals3 repository, and its absence from this
  vault's content is correct, not a gap. It is listed here so the next
  enumeration does not rediscover it and wonder. It has its **own** second brain
  at `E:\Bogs 2nd brain\Wiki`, which is **not a git repository at all** — no
  remote, no history, no backup. That risk belongs to that project; it is
  recorded in [[pending-register]] so that it is at least written down somewhere
  that is backed up.

## 3. Gate compliance, re-measured 2026-09-11

`deployment-reached-the-environment.yml` present, by direct content read:

| Repository | `develop` | `pre-prod` | `main` | Workflow |
| --- | --- | --- | --- | --- |
| `anythingsupplies/sals3-portal` | yes | yes | yes | **present** |
| `anythingsupplies/sals3-ecommerce` | yes | yes | yes | **present** |
| `anythingsupplies/sals3.com.fj` | yes | yes | yes | **missing** |
| `anythingsupplies/sals3.com.au` | yes | yes | yes | **missing** |
| `anythingsupplies/sals3-portal-automation` | yes | yes | yes | exempt — deploys nothing |
| `anythingsupplies/sals3-admin-portal` | — | — | — | empty repository |
| `Sals3-Official/sals3-admin-portal` | yes | **no** | **no** | **no `.github/workflows` at all** |

Part 148's *"two of six are missing the workflow"* is still true of
`anythingsupplies`, and it **understates the whole**: the Admin Portal has no
gate, no `pre-prod`, no `main`, and no CI directory — its `actions/runs` returns
an empty list, so nothing has ever run on it.

> [!CAUTION] Presence is not execution
> Every `anythingsupplies` Actions run has failed in 3–9 seconds on billing
> since 2026-09-04, and the owner has decided those bills will not be paid
> ([[sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci|part 160]]).
> A **present** workflow above means the file exists, not that the gate has ever
> enforced anything. The verification that actually happens is a named agent's
> local `npm run verify`, quoted in the pull request.

## 4. The Admin Portal is a real application, in the wrong org, and nobody audits it

This is the register's headline finding and the reason it exists.

**What is in `Sals3-Official/sals3-admin-portal` today** — `develop` at
`a9383ae`, 2026-08-14, three merged pull requests of genuine product:

| PR | What it built | Merged |
| --- | --- | --- |
| [#1](https://github.com/Sals3-Official/sals3-admin-portal/pull/1) | Next.js 16.3 / React 19.2 / Tailwind v4 scaffold matching the portal's stack and quality gates, dev port 3002 | 2026-08-11 |
| [#2](https://github.com/Sals3-Official/sals3-admin-portal/pull/2) | employee email/password sign-in over its **own** `sals3_admin` PostgreSQL database, `scrypt` hashing, opaque database-backed sessions, one indistinguishable `401` for every credential failure, no signup route; a proper fork of the portal shell in a burgundy OKLCH palette, 46/46 contrast pairs AA | 2026-08-13 |
| [#3](https://github.com/Sals3-Official/sals3-admin-portal/pull/3) | append-only `audit_events` with actor/action/scope/reason/before/after/correlation as first-class `NOT NULL` columns, append-only enforced by **Postgres triggers** that raise on `UPDATE`/`DELETE`/`TRUNCATE` for every caller including the application's own role | 2026-08-14 |

That is authentication code and an audit trail, and **it lives in a public
repository in the org ADR-019 designates vault-only.** Three consequences, none
of them written down anywhere else:

1. **ADR-019 names `sals3-admin-portal` as an `anythingsupplies` repository**
   that must follow `develop → pre-prod → main`. The `anythingsupplies` name was
   created on 2026-09-01 and **never received a commit**. The migration that
   moved the portal and the storefront on 2026-08-31
   ([[sals3-session-2026-09-03-part133-the-migration-to-anythingsupplies-and-the-sync-that-keeps-the-vault-out|part 133]])
   did not move this one. The ADR describes an arrangement that does not exist.
2. **It is the only application repository with no CI, no gate, no `pre-prod`,
   no `main`, and no deployment target** — so the promotion discipline every
   other repository is held to has never applied to the one repository holding
   the platform-wide control plane.
3. **It is public.** So is this vault. See §5.

**And there is a fourth pull request the vault has never mentioned.**
[#4](https://github.com/Sals3-Official/sals3-admin-portal/pull/4),
`feat(catalog): add category-governance decisions (ADR-014 Stage 1)`, branch
`feat/category-governance-schema` at `f700c57` — **+52,135 / −25 across 24
files** — opened 2026-08-15T13:10Z and **closed nine minutes later, unmerged**,
with this comment and nothing else:

> Closing — the owner decided the category-mapping picker should live directly
> in `sals3-portal`'s product editor instead (where products are actually
> added/modified), not as a separate admin-portal screen. Not merging this.

That is an **owner decision about where platform governance lives**, and its
only record was a closed pull request's comment thread in a repository no audit
reads. What the branch contains and what the decision costs is written up in
[[sals3-session-2026-09-11-part169-the-eleven-repositories-and-the-admin-portal-nobody-audited|part 169]] §3.
The branch still exists on the remote and in `E:\sals3-admin-portal`; nothing
about it is lost, only undescribed.

## 5. Three public repositories, one of them this vault

| Repository | Visibility | What a stranger can read |
| --- | --- | --- |
| `Sals3-Official/sals3-ecommerce` | **public** | **this entire vault** — every ADR, the margin and FX policy, supplier cost reasoning, CJ account behaviour, the environment topology, and owner decisions in the owner's own words |
| `Sals3-Official/sals3-portal` | **public** | the Seller Center application as of 2026-09-02 |
| `Sals3-Official/sals3-admin-portal` | **public** | the Admin Portal application, including its auth and audit implementation |
| all six `anythingsupplies` repositories | private | — |

**A pattern scan for live credentials across `docs/Wiki/` returns nothing** — no
`sk_live_`, `whsec_`, `AIza`, `gh[po]_`, `postgres://` or JWT. What is exposed
is not secrets; it is **commercial and operational intelligence**: margin
structure, FX buffer policy, supplier cost bands, which environments exist and
how they are protected, and the Stripe webhook and Firebase project identifiers
quoted in
[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger|part 148]] §3.
Identifiers, not keys — but they name the systems.

[[sals3-session-2026-08-11-part32-admin-portal-control-tower-direction|Part 32]]
is the only note that has ever recorded a repository's visibility, and it did so
on 2026-08-11, when `sals3-admin-portal` held a 22-byte README. The application
arrived two days later. Nobody re-read the setting.

> [!IMPORTANT] This is an owner decision, not an agent's
> Changing a repository's visibility is outward-facing and not reversible in
> effect — anything already cloned or indexed stays cloned and indexed. It is
> raised in [[pending-register]] as **[P1]** with the evidence above, and left
> for Bogs and AJ to decide. **No agent should flip it.**

## 6. Local clones and worktrees on this machine

Measured 2026-09-11 by walking every `.git` on `E:\`. The convention becomes
visible once it is listed: **one clone per repository, and a worktree per
concurrent piece of work**, named for the work rather than for the branch.

| Repository | Primary clone | Worktrees |
| --- | --- | --- |
| `anythingsupplies/sals3-portal` | `E:\sals3-portal` | `sals3-portal-census`, `sals3-portal-reviews`, `sals3-portal-wt-freeship-progress`, `wt-portal-sync`, plus four under `.claude\worktrees\` |
| `anythingsupplies/sals3-ecommerce` | `E:\sals3-ecom-shared` | — |
| `anythingsupplies/sals3.com.fj` | `E:\sals3-com-fj`, and a **second clone** at `E:\sals3-fj` | `sals3-com-fj-cancel` |
| `anythingsupplies/sals3.com.au` | `E:\sals3-com-au` | `sals3-com-au-cancel` |
| `anythingsupplies/sals3-portal-automation` | `E:\Bogs 2nd brain\sals3-portal-automation` | — |
| `Sals3-Official/sals3-ecommerce` **(this vault)** | `E:\sals3-ecommerce` | `sals3-vault`, `sals3-vault-cancel`, `wt-vault-133`, `wt-vault-169`, `wt-ecom-sync`, `wt-ecom-drop`, `sals3-ecommerce-cancel`, `sals3-ecommerce-rules`, `sals3-ecommerce-wt-freeship-progress`, plus one under `.claude\worktrees\` |
| `Sals3-Official/sals3-admin-portal` | `E:\sals3-admin-portal` | `wt-admin-old` |
| `louieboi09/sals3-2nd-brain` | `E:\SALS3 2nd brain` | — |
| `louieboi09/bogs-dashboard` | `E:\Documents\BOGS_Dashboard - Antigravity` | — |

Three things a reader should not have to rediscover the hard way:

- **`E:\sals3-ecommerce` is the vault clone, not the storefront clone.** Its
  `origin` is `Sals3-Official`; the storefront that actually deploys is
  `E:\sals3-ecom-shared` on `anythingsupplies`. The names invite exactly the
  wrong assumption, and a push from the wrong one is an ADR-019 breach in a
  single command.
- **`E:\sals3-fj` and `E:\sals3-com-fj` are two independent clones of the same
  repository**, sitting on different branches. Two clones cannot see each
  other's worktrees, so `git worktree list` in one is not the full picture of
  what is checked out.
- **`E:\wt-admin-seed` is a git repository with no `origin`.** Whatever is in it
  is backed by no remote.

## 7. The rule this register exists to enforce

ADR-019 §4 makes a vault entry part of "done". This register adds the step that
was missing when three repositories reached production undescribed:

1. **A new repository is registered here in the same task it is created** —
   owner, purpose, default branch, gate state, visibility, and whether it
   deploys.
2. **Enumerate under every account.** A single `gh repo list` is a view, not an
   inventory. Run it as `anythingsupplies` **and** as `louieboi09`, and include
   the personal namespace.
3. **Re-derive, never recall.** A count in a note is true on the day it was
   written. Re-measure before relying on it — this register included.
4. **A repository that holds an application belongs in `anythingsupplies`.**
   Where it does not, that is a finding, not a footnote.

---
tags:
  - session-record
  - sals3
  - governance
  - repositories
  - adr-019
  - adr-014
  - vault-maintenance
  - security
aliases:
  - Part 169
  - The Eleven Repositories
  - The Admin Portal Nobody Audited
created: 2026-09-11
updated: 2026-09-11
status: implemented
authority: session-record
owner_approved: false
implementation_status: vault-only
related:
  - "[[hot]]"
  - "[[sals3-repository-register]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[pending-register]]"
  - "[[sals3-skills]]"
  - "[[vault-session-note-conventions]]"
  - "[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger]]"
  - "[[sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci]]"
  - "[[sals3-session-2026-08-14-part39-admin-portal-employee-auth-and-shell-fork]]"
  - "[[sals3-session-2026-08-14-part40-admin-portal-append-only-audit-trail]]"
  - "[[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux]]"
---

# Part 169 — eleven repositories, and the Admin Portal nobody audited

> [!IMPORTANT] The Admin Portal has been missing from every repository audit
> [[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger|Part 148]]
> enumerated `anythingsupplies` and found six. **It listed
> `sals3-admin-portal` as "empty — zero commits" and stopped there**, without
> asking where the Admin Portal actually is.
> [[sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci|Part 160]]
> audited "all seven repositories" and **dropped `sals3-admin-portal` from both
> orgs entirely**. It is not empty. It is a Next.js application with employee
> authentication, its own PostgreSQL database, and a trigger-enforced
> append-only audit trail, sitting in a **public** repository in the org
> ADR-019 designates vault-only.

> [!NOTE] Provenance
> **There are no pull requests to cite for the audit itself** — this is a
> measurement session, and the only merge it produces is this vault entry. Every
> figure below was read on 2026-09-11 from the GitHub API under **both**
> accounts (`anythingsupplies` and `louieboi09`, because neither can see the
> whole set), from a filesystem walk of every `.git` on `E:\`, from
> `git show` against the branches named, and from a literal `grep -ril` of each
> `owner/name` string across `docs/Wiki/`. The pull requests quoted in §3 are
> quoted from their own merged or closed records, not paraphrased. Nothing here
> is recalled from an earlier note; where an earlier note is cited it is cited
> as the thing being corrected.

## 1. What the audit was asked to find, and the shape of the answer

The question was simple: **which repositories have no vault entry?** Answering it
required enumerating the repositories, which turned out to be the hard part.

| Audit | Date | Count | Missed |
| --- | --- | --- | --- |
| [[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate\|ADR-019]] | 2026-09-04 | four | the automation repo, `sals3.com.au`, both orgs' admin portals |
| [[sals3-session-2026-09-04-part140-the-automation-repository\|part 140]] | 2026-09-07 | five | `sals3.com.au`, both admin portals |
| [[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger\|part 148]] | 2026-09-08 | six | `Sals3-Official`'s three, including the live Admin Portal |
| [[sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci\|part 160]] | 2026-09-09 | seven | **both** admin portals, both `louieboi09` repositories |
| this audit | 2026-09-11 | **eleven** | — |

The full inventory now lives in [[sals3-repository-register]], which is the
note to read and to keep current. This note records **how the gap happened and
what was in it.**

**The structural cause, stated once:** every previous audit enumerated **one org
under one account**. Neither account can see the whole project —
`louieboi09` gets `404` on three `anythingsupplies` repositories (already
recorded in [[pending-register]] as P3), and `anythingsupplies` belongs to no
org and cannot see the personal namespace at all. A `gh repo list` is a **view**.
Nobody had ever taken the union.

## 2. The repositories with no vault entry

Measured as: how many notes under `docs/Wiki/` name the repository as
`owner/name`.

| Repository | Notes citing it | Verdict |
| --- | --- | --- |
| `Sals3-Official/sals3-portal` | 93 | thoroughly described |
| `Sals3-Official/sals3-ecommerce` | 59 | thoroughly described |
| `anythingsupplies/sals3-portal` | 32 | described |
| `anythingsupplies/sals3.com.fj` | 18 | described |
| `anythingsupplies/sals3-ecommerce` | 17 | described |
| `anythingsupplies/sals3.com.au` | 12 | described since part 148 |
| `Sals3-Official/sals3-admin-portal` | **6** | **six mentions, all from 2026-08-11/15, none since** |
| `anythingsupplies/sals3-portal-automation` | 5 | one dedicated note, part 140 |
| `louieboi09/sals3-2nd-brain` | 3 | frozen predecessor; adequate |
| **`anythingsupplies/sals3-admin-portal`** | **0** | **never named** |
| **`louieboi09/bogs-dashboard`** | **0** | **correctly absent — a different project** |

Two of the three zero/near-zero rows are real gaps; the third is not:

- **`anythingsupplies/sals3-admin-portal` — zero.** Created 2026-09-01,
  `size: 0`, zero branches, and the commits endpoint answers
  `409 Git Repository is empty.` It is a **reserved name**. ADR-019 lists it as
  one of the four repositories where application code is worked and merged, and
  nothing has ever been worked or merged there.
- **`Sals3-Official/sals3-admin-portal` — six mentions, none after 2026-08-15.**
  That is not a repository with thin coverage; it is a repository whose
  **existence as a separate application** has fallen out of the vault's model of
  the project. §3.
- **`louieboi09/bogs-dashboard` — zero, and that is correct.** It is the BOGS
  Dashboard project, which has its own second brain. It is named in
  [[sals3-repository-register]] only so the next enumeration does not rediscover
  it and wonder whether something was lost. One thing about it **is** worth
  carrying here: its second brain, `E:\Bogs 2nd brain\Wiki`, is **not a git
  repository** — no remote, no history, no backup — which is the failure mode
  this vault escaped in August by moving into `Sals3-Official/sals3-ecommerce`.

## 3. What is actually in the Admin Portal, and the pull request that was closed

### 3.1 Three merged pull requests of real product

`Sals3-Official/sals3-admin-portal`, `develop` at `a9383ae` (2026-08-14):

| PR | Merged | What it built |
| --- | --- | --- |
| [#1](https://github.com/Sals3-Official/sals3-admin-portal/pull/1) | 2026-08-11 | Next.js 16.3 / React 19.2 / Tailwind v4 scaffold on the portal's stack and quality gates, dev port 3002 |
| [#2](https://github.com/Sals3-Official/sals3-admin-portal/pull/2) | 2026-08-13 | employee email/password sign-in over its own `sals3_admin` database, `scrypt`, opaque database-backed sessions, one indistinguishable `401`, no signup route; the portal shell forked properly in a burgundy OKLCH palette, 46/46 contrast pairs AA |
| [#3](https://github.com/Sals3-Official/sals3-admin-portal/pull/3) | 2026-08-14 | append-only `audit_events`, enforced by Postgres triggers that raise on `UPDATE`/`DELETE`/`TRUNCATE` for **every** caller including the application's own role |

All three are already described in
[[sals3-session-2026-08-14-part39-admin-portal-employee-auth-and-shell-fork|part 39]],
[[sals3-session-2026-08-14-part40-admin-portal-append-only-audit-trail|part 40]]
and
[[sals3-session-2026-08-15-part43-admin-portal-audit-trail-merged-and-synced-locally|part 43]].
**The work was documented. The repository was not** — no later audit re-read it,
and ADR-019 was written three weeks afterwards as though it did not exist.

### 3.2 PR #4 — 52,135 lines, opened and closed in nine minutes

[#4](https://github.com/Sals3-Official/sals3-admin-portal/pull/4),
`feat(catalog): add category-governance decisions (ADR-014 Stage 1)`, branch
`feat/category-governance-schema` at `f700c57`, **+52,135 / −25 across 24
files**. Opened 2026-08-15T13:10:08Z. Closed 2026-08-15T13:19:02Z, **unmerged**,
with one comment:

> Closing — the owner decided the category-mapping picker should live directly
> in `sals3-portal`'s product editor instead (where products are actually
> added/modified), not as a separate admin-portal screen. Not merging this.

**What the branch contains**, read with `git show` rather than from the PR body:

- `category_mapping_decisions` — `provider` / `external_category_id` /
  `observed_category_name` / `sals3_category_code` / `sals3_category_path` /
  `status` / `supersedes_id` / `decided_by_employee_id` / `reason` /
  `decided_at`. Versioned **by supersession**: a revised decision inserts a new
  row and marks the old one `SUPERSEDED`, never overwritten — with a **partial
  unique index** enforcing at most one `ACTIVE` row per
  `(provider, external_category_id)`. `decided_by_employee_id` is
  `ON DELETE RESTRICT`, matching the audit trail's own rule.
- Two audited actions, `CATEGORY_MAPPING_DECIDED` and
  `CATEGORY_MAPPING_SUPERSEDED`, following the existing append-only trail
  exactly.
- A frozen copy of the portal's Taxonomy v1 JSON — **5,595 rows**, verified by
  counting `"code"` keys in the file — backing a search-first picker.
  Duplicated rather than read across, because Gate 0 forbids this application
  from touching `sals3-portal`'s database.
- Server-side re-derivation of the category path from the submitted code, so a
  client-supplied path is never trusted — the same rule the portal applies to
  its option mappings.
- Two gaps **stated on the page itself** rather than hidden: no live queue of
  CJ categories awaiting review (`NOT_CONNECTED`), and a recorded decision does
  not reach `sals3-portal` at all (`NOT_IMPLEMENTED`), because the publish
  pipe between the two databases does not exist.

### 3.3 What the closure actually decided, and why it is not just a discarded branch

The outcome is documented; the **reversal** is not.
[[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux|Part 48]]
records `sals3-portal` PR #91, *"Let sellers pick a real Sals3 category directly
in the editor"*, shipped the same day. Read on its own, part 48 is the story of
a feature landing. It is also, unrecorded, the story of a **governance model
being replaced**:

| | The closed branch | What shipped |
| --- | --- | --- |
| Who decides a category | an **employee**, once, in the control plane | **each seller**, per product, in the editor |
| Scope of one decision | **every** product any seller sources under that CJ category | one product |
| Record | a versioned, audited, supersedable row | the product's own field |
| Reversible platform-wide | yes, by superseding the decision | no — each product is edited again |

That is the substance of ADR-014's *"platform authority belongs in the control
plane, not inside the tenant app"* being traded for the thing that could ship
that afternoon. It may well be the right trade — sellers pick where products are
actually added, which is the owner's stated reason, and no publish pipe existed
to carry a curated decision anyway. **But it was a decision, and its only record
was a closed pull request's comment thread in a repository no audit reads.**

ADR-014 is still `approved` and still describes curated platform governance.
Nothing in the vault says a part of it was traded away on 2026-08-15.

## 4. Three public repositories, and one of them is this vault

Measured 2026-09-11:

- `Sals3-Official/sals3-ecommerce` — **public**, and it holds this vault.
- `Sals3-Official/sals3-portal` — **public**.
- `Sals3-Official/sals3-admin-portal` — **public**, and it holds the Admin
  Portal's authentication and audit implementation.
- All six `anythingsupplies` repositories — private.

A credential-pattern scan across `docs/Wiki/` returns **nothing**: no
`sk_live_`, `whsec_`, `AIza`, `gh[po]_`, `postgres://`, no JWT. **This is not a
leaked-secret finding**, and it should not be escalated as one. What is
world-readable is commercial and operational intelligence — the margin and FX
policy, supplier cost reasoning, the CJ account's real behaviour, which
environments exist and how they are protected, and the Stripe webhook and
Firebase project identifiers quoted in part 148 §3. Identifiers, not keys, but
they name the systems.

[[sals3-session-2026-08-11-part32-admin-portal-control-tower-direction|Part 32]]
recorded `sals3-admin-portal` as public on 2026-08-11, when it held a 22-byte
README. That was an accurate and unremarkable fact at the time. The application
landed two days later and **nobody re-read the setting** — the same shape as the
README-that-states-a-rule-it-does-not-enforce problem part 148 found, applied to
a repository setting instead of a workflow file.

Raised as **[P1]** in [[pending-register]]. **Not acted on**: repository
visibility is outward-facing and irreversible in effect — anything already
cloned or indexed stays cloned and indexed — so it is Bogs's and AJ's call, with
the evidence laid out, not an agent's.

## 5. What this changes in the vault

- **[[sals3-repository-register]] is new** and is now the single home for the
  repository inventory. Session notes should cite it rather than re-deriving a
  count in prose, which is how four different counts happened.
- **[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]
  gains an amendment**: its "four repositories" is eleven; `sals3-admin-portal`
  is named as an `anythingsupplies` repository and the `anythingsupplies` copy
  is empty, so the ADR describes an arrangement that does not exist.
- **[[hot]]**'s *Repository and vault* section now points at the register
  instead of listing two repositories, and this note joins *Recent session
  notes*.
- **[[pending-register]]** gains five entries: the visibility decision, the
  Admin Portal's org and gate gap, the undocumented ADR-014 trade, the
  unversioned BOGS second brain, and the Husky hooks that do not run in a
  worktree (§6).
- **[[sals3-skills]]** gains lessons 123–128, and one pre-existing broken wikilink in it is repaired.

**Pending:** five entries in [[pending-register]], listed above. Nothing in code
changed in this session; the Admin Portal was **not** moved, no repository
visibility was changed, and `feat/category-governance-schema` was **not**
reopened or deleted.

## 6. Found while committing this note: the hooks were not running

`core.hooksPath` is `.husky/_`, set in the **shared** repository config, so every
worktree inherits the pointer. `.husky/_` is **generated by husky on
`npm install` and is not tracked** — `git ls-files .husky` returns only
`commit-msg`, `pre-commit` and `pre-push`. In a worktree created minutes
earlier the directory does not exist, and **git runs no hooks at all, with no
warning and exit 0.**

So this note's own commit passed the `commit-msg` gate PR #248 added to enforce
the bible's pending rule **because the gate never executed** — as did the
`pre-commit`/`pre-push` guards that refuse a direct commit to `develop` or
`main`. Measured: `.husky/_` present in `E:\sals3-ecommerce` and
`E:\wt-vault-133`, both of which have `node_modules`; absent in the new
worktree. The tell was the commit returning instantly when `pre-commit` runs a
full `npm run verify`.

The check was then run by hand — `node scripts/check-pending.mjs <msgfile>`,
**exit 0** — so the message is compliant on its merits. What was missing is the
enforcement, not the compliance. Raised as [P2] in [[pending-register]]; skill 128.

This project uses worktrees constantly — [[sals3-repository-register]] §6 lists
sixteen — so **the uninstalled worktree is the common case**, and every hook in
this repository protects the one clone somebody happened to install in.

## Lessons

- **An enumeration is only as wide as the credential that ran it.** Four audits
  ran `gh repo list` and four got different answers, each correct for the
  account it used. Take the union across every account, and include the personal
  namespace — see skill 123.
- **"Empty" is an answer about a name, not about a thing.** Part 148 read
  `anythingsupplies/sals3-admin-portal` as empty and moved on. The right next
  question was *then where is the Admin Portal?* — see skill 124.
- **A decision that reverses an approved ADR needs a home even when the work is
  thrown away.** The branch was correctly discarded; the reasoning was not
  captured, so ADR-014 has read as fully current for four weeks — see skill 126.
- **A repository setting is a fact with a shelf life.** Public was harmless for a
  22-byte README and is not harmless for an auth implementation; nothing re-reads
  a setting when the contents change — see skill 127.
- **A count in a note is true on its date and nowhere else.** Part 148 already
  wrote *"the count of repositories is a fact worth re-deriving rather than
  remembering"* — and was then remembered rather than re-derived, twice. A rule
  stated in a session note does not enforce itself; it needs a register with a
  measurement date on it.
- **A gate that is not running looks exactly like a gate that passed.** The
  commit-msg hook, the branch guards and `npm run verify` were all silently
  absent in a fresh worktree because `core.hooksPath` points at an untracked,
  `npm install`-generated directory — the same shape as part 148's README
  stating a rule its repository does not enforce, and part 160's Actions runs
  finishing in 3–9 seconds without executing a step — see skill 128.

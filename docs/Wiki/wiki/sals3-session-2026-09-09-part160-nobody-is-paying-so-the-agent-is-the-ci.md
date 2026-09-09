---
tags: [session-record, sals3, governance, ci, vercel, github-actions, adr-019, verification]
aliases:
  [
    "Part 160",
    "Nobody is paying, so the agent is the CI",
    "The 2026-09-09 CI and deployment audit",
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
  - "[[sals3-session-2026-09-08-part157-promote-with-a-merge-commit-never-a-squash]]"
  - "[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger]]"
  - "[[sals3-skills]]"
  - "[[agent-operating-contract]]"
---

# Part 160 — Nobody is paying, so the agent is the CI

> [!IMPORTANT] Owner decision 2026-09-09 (Bogs)
> **The GitHub Actions and Vercel bills will not be paid.** Verification is
> therefore **an agent's job, performed and recorded by hand**, not a check a
> platform runs. Every merge from here is accompanied by a named agent's local
> `npm run verify` result and, where deployment matters, a read of the live
> host — not by a green tick.

> [!NOTE] Provenance
> Written 2026-09-09 from a direct audit of all seven repositories through the
> GitHub API: each default branch's recent commits and their Vercel commit
> status, each repository's most recent Actions run measured
> `run_started_at → updated_at`, and live `HTTP` probes of the four production
> hosts. No PR accompanies the audit itself; the corrections it produced are
> in this note's own branch.

## 1. What was actually true, measured

| Repository | GitHub Actions | Vercel |
| --- | --- | --- |
| `Sals3-Official/sals3-ecommerce` **(the vault)** | **success, 223 s — a real run** | **`Account is blocked.`** |
| `Sals3-Official/sals3-portal` | failure, **9 s** — billing stall | success (last 2026-09-02) |
| `anythingsupplies/sals3-portal` | failure, **3 s** | **success, 2026-09-09** |
| `anythingsupplies/sals3-ecommerce` | failure, **4 s** | success, 2026-09-08 |
| `anythingsupplies/sals3.com.fj` | failure, **4 s** | success, 2026-09-08 |
| `anythingsupplies/sals3.com.au` | failure, **3 s** | success, 2026-09-08 |
| `anythingsupplies/sals3-portal-automation` | no runs | n/a — deploys nothing |

**The two orgs fail in opposite directions**, and neither is what the vault
recorded:

- the **vault** repository has **working CI and blocked deployments**;
- every **application** repository has **dead CI and working deployments**.

A run that finishes in 3–9 seconds has executed **zero steps** — that is the
billing stall, and it is distinguishable from a real failure only by its
duration. The vault repository's 223-second run is the `verify` that went green
on PRs #239–#241.

### The live product is up

Probed 2026-09-09: `sals3.com`, `sals3.com.au`, `sals3.com.fj` and
`sals3-portal-prod.vercel.app` all answer **HTTP 200** from Vercel. **Nothing
customer-facing is affected by any of this.**

## 2. The blocked Vercel project is the legacy one

The block is scoped to the Vercel project attached to
`Sals3-Official/sals3-ecommerce` — the repository that stopped being the code
home at the 2026-09-03 migration
([[sals3-session-2026-09-03-part133-the-migration-to-anythingsupplies-and-the-sync-that-keeps-the-vault-out|part 133]])
and is now **the vault's home**. Its boundary is exact:

| Commit | Date | Author | Vercel |
| --- | --- | --- | --- |
| `0dae295` | 2026-09-07 | louieboi09 | success |
| `0dcc929` | 2026-09-07 | anythingsupplies | success |
| `fc8da70` | 2026-09-07 | louieboi09 | **success — last one** |
| `0efa075` | 2026-09-08 | louieboi09 | `Account is blocked.` |
| `9c4a5c6` | 2026-09-08 | louieboi09 | `Account is blocked.` |
| `76b245b` … `1e9c2e0` | 2026-09-09 | anythingsupplies / louieboi09 | `Account is blocked.` |

**Nine commits carry a blocked or absent Vercel status.** All of them are
vault-only content. The consequence is not a lost deployment — it is that
**every vault pull request now carries a permanent red check**, which is the
condition under which people stop reading checks at all.

## 3. Three wrong generalisations, in one session, from partial evidence

Recorded because the pattern matters more than any one of them.

**First: the red check was blamed on commit authorship.** The reasoning was
`0efa075` (louieboi09) failed, `61310dd` and `0dcc929` (anythingsupplies)
succeeded — therefore the author. Those commits also differ **by date**, on
either side of a block that had nothing to do with either. The table in §2 kills
it outright: *both* authors succeed before 2026-09-07 and *both* fail after.
Cost: six commits re-authored, one force-push, roughly forty minutes.

The message itself said so. ADR-019's documented failure is
`Deployment was blocked` for an unverifiable author; this said **`Account is
blocked.`** Two different sentences, and only one of them was read.

**Second: "the whole platform cannot deploy."** Said out loud on the strength of
one repository's status. Six of seven deploy fine, and all four production hosts
answer 200.

**Third, and it is the same error the day before:**
[[sals3-session-2026-09-08-part157-promote-with-a-merge-commit-never-a-squash|part 157]]
originally claimed all three storefronts carried the same branch divergence.
Running the check proved only `sals3-portal` did. That correction is *in the
note*, and its own lesson — *run the cheap check before generalising* — was not
applied twice more the same day.

**The sharpest part:** skill 102 had been written hours earlier, and its subject
is *compare the date before believing a status*. It was authored, committed, and
then not applied to the very next status this session looked at. **Writing a
lesson down is not the same as holding it.**

## 4. What replaces the platform's verification

Since neither bill will be paid, the checks stop being infrastructure and become
procedure. What each repository now needs before a merge:

| Repository | What a merge requires |
| --- | --- |
| `Sals3-Official/sals3-ecommerce` | the Actions `verify` run **is** trustworthy — read it. **Ignore the Vercel check**; it is the legacy project and cannot go green |
| every `anythingsupplies` application repository | a named agent's local `npm run verify`, quoted in the PR, **plus** a read of the Vercel commit status, which does still work there |
| `sals3-portal-automation` | local test run only; it deploys nothing |

**A red check is no longer evidence of a problem, and a green one is no longer
evidence of safety.** Both have to be interpreted per repository, which is why
the table above belongs in ADR-019 rather than in anyone's memory.

The two obligations that fall on the agent, restated as rules:

1. **Run `npm run verify` locally and quote its real output** — the counts, not
   "it passed". Parts 143–159 already do this; it is now required rather than
   conventional.
2. **Re-derive this table before relying on it.** It is a snapshot of a
   billing state that can change the day someone pays, and it has already
   inverted once.

## 5. What is owed

- **Detach or delete the Vercel project on `Sals3-Official/sals3-ecommerce`.**
  It deploys a repository that no longer holds the application. Removing it ends
  the permanent red check on every vault PR, which is worth more than the alert
  it produces. Owner action; not done here.
- **The `nanoid` Dependabot alert** on the same repository is still open and
  still stale — see skill 102.
- **`anythingsupplies/sals3-ecommerce` has Dependabot alerts disabled entirely**,
  so the vault repository is scanned and the production code repository is not.

## Lessons

- **Read the failure message, not the failure colour.** `Account is blocked` and
  `Deployment was blocked` are different faults with different owners.
- **A correlation across two variables is not a cause.** Author and date both
  differed; only one mattered, and the dates were in the output already pulled.
- **Check every member before describing a set.** One repository's status
  became "the platform" twice in one day.
- **Distinguish a stall from a failure by duration.** 3–9 seconds is zero steps
  executed; 223 seconds is a real run. Same red X.
- **A green check and a red check both need a per-repository reading now.**
  Neither is self-explanatory once billing is partial.
- **Writing a lesson down does not install it.** Skill 102 was authored hours
  before the mistake it describes was made again.

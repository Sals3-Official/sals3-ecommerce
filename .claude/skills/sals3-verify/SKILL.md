---
name: sals3-verify
description: Verify a Sals3 change the way ADR-019 now requires, and produce the evidence block that goes in the PR body. Since 2026-09-09 neither the GitHub Actions nor the Vercel bill is paid, so CI is dead on the application repositories and an agent has to run and record verification by hand - a green tick means nothing and a red X usually means billing. Use this whenever you are about to commit, push, open a PR, merge, or claim work is done in any Sals3 repository (sals3-portal, sals3-ecommerce, sals3.com.fj, sals3.com.au, sals3-portal-automation, in either the anythingsupplies or Sals3-Official org), and whenever someone asks whether CI passed, whether something deployed, why a check is red, or whether a branch is safe to merge. Also use it before trusting any GitHub Actions or Vercel status in these repos, because both signals now mean different things in different repositories.
---

# Sals3 verification, run by an agent

## Why this exists

**Owner decision 2026-09-09 (Bogs): the GitHub Actions and Vercel bills will not
be paid.** Verification stopped being something a platform does and became
something an agent does and records by hand.

That makes the usual instinct actively wrong here. A red X on a Sals3 PR is
*usually* a billing stall or a blocked legacy project, not a defect — and a green
tick may only mean a workflow that never ran. Reporting either at face value is
how a broken change gets merged, or a fine one gets held for hours. Both have
already happened.

The rules live in
`docs/Wiki/wiki/ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate.md`
(the *2026-09-09* amendment) and the audit behind them in
`docs/Wiki/wiki/sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci.md`.
This skill is how to carry them out.

## Step 1 — Know which repository you are in

The requirements differ per repository, so nothing else is decidable until this
is settled:

```bash
git remote -v
git rev-parse --abbrev-ref HEAD
```

A clone may carry **two** remotes. `origin` and `newco` point at different orgs
in the same working tree, and pushing vault content to the code org is
explicitly forbidden — check which one you mean before pushing anything.

## Step 2 — Run what that repository can actually prove

| Repository | What a merge requires |
| --- | --- |
| `Sals3-Official/sals3-ecommerce` **(the vault)** | Actions `verify` **does** run here and is trustworthy — read it. **Ignore the Vercel check**: it is the legacy project left behind by the 2026-09-03 migration and cannot go green |
| `anythingsupplies/sals3-portal` | local `npm run verify`, output quoted, **plus** the Vercel commit status, which still works |
| `anythingsupplies/sals3-ecommerce` | same |
| `anythingsupplies/sals3.com.fj` | same |
| `anythingsupplies/sals3.com.au` | same |
| `Sals3-Official/sals3-portal` | local `npm run verify`; Actions is stalled here |
| `anythingsupplies/sals3-portal-automation` | local test run only — it deploys nothing, so an absent deployment status means nothing at all |

`npm run verify` is `lint && format:check && typecheck:clean && build && test:run
&& test:e2e`. The Husky pre-commit and pre-push hooks run the same thing, so a
commit that succeeded has already passed it — say so rather than running it a
third time.

**Never pass `--no-verify`.** The hooks are the only automated gate left in the
application repositories. If a hook fails, that is the finding; report it as a
blocker rather than working around it.

## Step 3 — Read the signals correctly

Three ways these signals lie, each of which has already cost real time:

**A stall is not a failure — time it.** A run whose
`run_started_at → updated_at` is **3–9 seconds** executed **zero steps**: that is
the billing stall. A real run takes minutes. The X looks identical.

```bash
gh api repos/<owner>/<repo>/actions/runs?per_page=1 \
  --jq '.workflow_runs[0] | "\(.conclusion) \(.run_started_at) -> \(.updated_at)"'
```

**Read the status description, not the state.** Two different faults wear the
same red, and they have different owners:

| Description | Means |
| --- | --- |
| `Account is blocked.` | Vercel account-level block — affects every commit on that project, nothing to do with the code |
| `Deployment was blocked` | ADR-019's unverifiable commit author — a real, fixable identity problem |

```bash
gh api repos/<owner>/<repo>/commits/<sha>/status \
  --jq '.statuses[] | "\(.context) \(.state) \(.description)"'
```

**One repository is not the platform.** Before saying anything about "the
platform", check every repository. The two orgs currently fail in *opposite*
directions, so an inference from one is likely to be backwards.

When something looks broken, also separate the variables before blaming one. The
commits that failed and the ones that succeeded differed by author **and** by
date; only the date mattered, and diagnosing the author cost six needlessly
re-authored commits.

## Step 4 — Re-derive the table before relying on it

Section 2's table is a snapshot of a billing state. It has already inverted once
and will change the day someone pays. When the answer matters — a merge decision,
a claim about what is deployed, anything going into the vault — regenerate it:

```bash
python .claude/skills/sals3-verify/scripts/ci_state.py
```

It reports, per repository, the Actions run duration (with stall/real-run
verdict), the Vercel status and description, and the live HTTP status of the four
production hosts.

> **No single account currently sees all seven repositories.** `louieboi09` can
> read `Sals3-Official` but not `sals3.com.au` or `sals3-portal-automation`;
> `anythingsupplies` is the reverse. The script prints `NO ACCESS` for the rows it
> cannot see and names them, rather than quietly returning a partial table as if
> it were complete — a half table read as a whole one is how "the platform is
> down" got said about one repository. Run it under both accounts when the full
> picture matters:
>
> ```bash
> gh auth switch --user anythingsupplies   # then rerun, then switch back
> ```
>
> Note also that `gh`'s active account has been observed reverting on its own
> mid-session, which surfaces as a `403` on push. If a push is denied, check
> `gh api user --jq .login` before assuming anything about permissions.

**A run that has not finished cannot be judged.** A job still going has
`conclusion: null` and only a few seconds elapsed so far, which looks exactly like
a stall. The script says `not finished, do not judge yet`; wait and rerun rather
than reading it as a failure.

## Step 5 — Write the evidence block

The point of all this is a claim the next person can check. Quote **real
numbers**, never "it passed" — a bare assertion is exactly what nobody can audit
later, and the counts are what reveal a suite that silently stopped running half
its tests.

Use this shape in the PR body and in any completion report:

```markdown
## Verification

`npm run verify` — lint, format:check, typecheck, build clean;
**4,159 unit tests passed / 4 skipped (373 files)**, **63 e2e passed / 2 skipped**.
Run locally on <sha>; GitHub Actions on this repository is billing-stalled
(latest run: failure in 3s, zero steps).

Vercel on this commit: `success — Deployment has completed`.
```

Adjust honestly to what actually happened. Three things worth stating plainly
when they are true, because each one has misled someone already:

- a check was **not** run, and why — that is a blocker, not an omission;
- a red check is the **billing stall or the legacy project**, naming which;
- a test **failed and passed on retry** — say so and name it. Live-catalogue e2e
  flakes are known here, but a "flake" that reproduces is a finding.

## Step 6 — Declare what you left undone

The bible's section 6 (owner rule 2026-09-09) requires every commit **and** every
PR to carry a `Pending` block, and the same items to be added to
`docs/Wiki/wiki/pending-register.md` **in the same task**. Verification and
pending live together because they answer the two halves of the same question:
*what did you prove, and what is still owed?*

```markdown
## Pending
- **[P1]** <what is not done> — <why it matters>
- **[P3]** <what is not done> — <why it matters>
```

| | Meaning | Timing |
| --- | --- | --- |
| **P0** | Money or data is wrong **right now** | Before the next merge |
| **P1** | A decision is blocked, or a live surface says something untrue | This week |
| **P2** | A known gap with a workaround that keeps costing time | Scheduled |
| **P3** | Hygiene and debt; nobody is harmed | When next touching that area |

**Write `Pending: none` when there genuinely is nothing.** One line, and it
separates "there was nothing" from "somebody forgot" — which is the only thing
that makes the register trustworthy as a list.

Three things are **not** pending items, because each already has a home and
copying them creates a second source of truth: an idea the owner **parked**
(`parked-ideas-backlog.md`), something wrong in **production now** (`hot.md`'s
active risks — reference it from the register, do not copy it), and a **decision**
that changed (an ADR amendment).

A blocked check from Step 2 is almost always also a pending item. If `verify`
could not be run, that is both the verification result **and** a P0 or P1 entry.

## When the check itself is the question

Someone asking *"why is this red?"* or *"did it deploy?"* wants the diagnosis,
not a rerun. Go straight to Step 3, name which of the three failure shapes it is,
and say what it means for merging. Usually the answer is that the red is
structural and the change is fine — but only after looking.

## Related

- `docs/Wiki/wiki/ADR-019-...md` — the *2026-09-09* amendment is the authority
- `docs/Wiki/wiki/sals3-session-2026-09-09-part160-...md` — the audit and the three wrong generalisations that produced these rules
- `docs/Wiki/wiki/sals3-skills.md` — skill 102 (date an alert against the fix) and skill 103 (reading checks under partial billing)
- `AGENTS.md` — do not mark work complete when a required check fails unless it is reported as a blocker

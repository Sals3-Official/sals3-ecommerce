---
tags: [sals3, session, sals3-portal-automation, automation, ai-agents, cj-points, taxonomy, security]
aliases:
  - Part 140
  - The Automation Repository
  - The Toolkit That Had No Remote
created: 2026-09-04
updated: 2026-09-07
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[sals3-session-2026-09-01-part124-an-api-so-the-agent-stops-driving-a-browser]]"
  - "[[sals3-session-2026-09-04-part135-a-retry-that-could-never-retry-and-the-points-it-cost]]"
  - "[[sals3-session-2026-09-04-part134-the-last-306-supplier-leaves-and-the-seed-that-has-not-run]]"
  - "[[sals3-skills]]"
  - "[[hot]]"
---

# Part 140 — the automation repository, and the toolkit that had no remote

> [!NOTE] Provenance
> Written 2026-09-07 after the fact. Unlike every other session note in this
> vault, this one has almost no pull requests to read: the repository's 72
> commits were made **directly on branches**, and only two PRs exist. The
> account below is drawn from the repository's own `AGENTS.md`, `README.md` and
> `skills/README.md` at `main`, from its commit subjects, and from the two PR
> bodies — all read from the GitHub API on 2026-09-07. Run figures are the
> commit messages' own claims and have not been re-verified.

| PR | Title | Merged |
|---|---|---|
| [#1](https://github.com/anythingsupplies/sals3-portal-automation/pull/1) | promote: develop -> pre-prod (the repo now has a remote, and what its branches are not) | 2026-09-04 |
| [#2](https://github.com/anythingsupplies/sals3-portal-automation/pull/2) | promote: pre-prod -> main (the same) | 2026-09-04 |

**This is the fourth application repository and the fifth in the
`anythingsupplies` org, and this vault has never described it.** A full-vault
grep for `sals3-portal-automation` returns exactly one hit, in an
`agent-turnovers/` file, and nothing in `Wiki/`. It is also the caller behind
[[sals3-session-2026-09-04-part135-a-retry-that-could-never-retry-and-the-points-it-cost|part 135]]
and the tooling behind
[[sals3-session-2026-09-04-part134-the-last-306-supplier-leaves-and-the-seed-that-has-not-run|part 134]] —
so several recent notes describe its effects without naming it.

## 1. What it is

`anythingsupplies/sals3-portal-automation`, created **2026-09-04T21:07Z**,
**private**, default branch `main`, 72 commits dating back to 2026-09-02. Its own
description:

> Listing automation for the Sals3 Portal: quick-publish, enrichment,
> leaf-mapping review. Private — operational internals.

A Python toolkit, not a deployed application. The engine is
`sals3_enrich_publish_v2.py`; `run_pipeline.py` and `quick_publish.py` are the
orchestrators; `test_enrich_publish.py` is the offline suite (**271 tests**).
Around them sit roughly thirty single-purpose companions — `census_leaves.py`,
`review_leaf_census.py`, `variant_photos.py`, `description_studio.py`,
`taxonomy_lookup.py`, `rescue_drafts.py`, `audit_storefront_reach.py`,
`catalogue_ledger.py` — plus `legacy/` and `scratch/`.

Its `AGENTS.md` opens with the sentence that defines the whole design:

> **You are the intelligence in this loop**, whichever model you are — Claude,
> Codex, Gemini, anything that can read a JSON file and run a command. The script
> is the hands; you decide what gets written. There is no API key and no per-call
> charge anywhere in this system.

## 2. Until 2026-09-04, none of it existed anywhere but one disk

PR #1's opening is the reason this note leads with it:

> Until [2026-09-05, Australian time] this toolkit was a git repo with **no
> remote at all**. Every commit lived only on one disk, and today's work alone —
> the reviewed leaf table, the drafting money guard, the read retry, the page
> budget and both skill playbooks — was one disk failure from gone.

The reviewed leaf table alone is
[[sals3-session-2026-09-04-part134-the-last-306-supplier-leaves-and-the-seed-that-has-not-run|part 134]]'s
four tiers of evidence: **306 leaves reviewed against twenty sampled product
names each**. That is not reproducible work. It is a judgement pass that would
have had to be redone from scratch.

## 3. Its branches look like the others and are not

The two PRs exist almost entirely to write down the thing branch parity invites
somebody to get wrong:

> **These branches deploy nothing.** No Vercel project, no workflow, no SIT and
> no UAT. A push to `main` here is not a release, nothing in this repo is ever
> "live", and there is no deployment status to go and confirm.
>
> A run always executes from the **local working tree** whatever branch is
> checked out; `--origin` decides which environment it touches, **never** the
> branch.

> [!WARNING] Do not apply *A merge is not a deployment* here
> [[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate|ADR-019]]
> makes `develop → pre-prod → main` mandatory for every `anythingsupplies`
> **application** repository, and the rule that a merge is not a deployment
> exists because a Vercel status can be absent. **In this repository there is no
> deployment status at all, and its absence means nothing.** The checks that do
> exist are `python -u test_enrich_publish.py` and reading the run report. A
> future audit that flags this repo for a missing environment gate is measuring
> the wrong thing.

The reverse trap is real too: because `--origin` and not the branch decides the
target, **a production run can be launched from a feature branch**, and nothing
in git records which environment a run touched.

### Privacy is a load-bearing property

The repository is private **and must stay that way** — the tracked files carry
operating detail, run reports and product data. Audited before the first push:
the only credential-shaped strings are cookie *names*
(`_vercel_jwt`, `__Secure-better-auth.session_token`) and a placeholder
`AIzaSyYourSecretAPIKey` in a doc. The Portal session comes from the automation
Chrome profile at run time, and **`CRON_SECRET` is not written down there and
must not be**.

## 4. The architecture rule, and the three-way split it produces

The owner's rule, quoted in `AGENTS.md`: **local scripts may exist, the codes and
functions belong in the API.** As of portal PR #9 the split is explicit, and the
third category is the interesting one:

- **In the API** — every decision and every refusal: attribute rules (the pants
  tables plus the generic every-category pass), axis derivation and naming, copy
  rules, chart-append rules, photo assignment, publish gates, taxonomy search.
  `taxonomy_search` replaced reading the seed JSON locally.
- **Local, because a server cannot do it** — CJ page reads (owner decision:
  browser), eye work (photo identity, size-chart transcription, `Pants Type`),
  and description copy.
- **Local, because it *should* be independent** — the verify stage's
  `values_agree` comparison, because **a checker served by the same system it
  checks would agree with that system's own bugs**; and the orchestrators
  themselves, which sequence the API calls and hold the two typed confirmations.

> If a new rule is being written into a local file and it is not one of those
> three kinds, it is in the wrong place.

This is the consumer side of
[[sals3-session-2026-09-01-part124-an-api-so-the-agent-stops-driving-a-browser|part 124]].
The internal `/api/internal/**` routes exist because this toolkit kept breaking
on rendered pages — three separate scraping failures (pagination, an id absent
from the markup, a photo picker splitting by axis). Every Portal read and write
is now an HTTP call; **the only browser work left is looking at CJ.**

## 5. Two lanes, and where the playbooks actually live

| Playbook | What it does | Speed |
|---|---|---|
| `skills/sals3-automate.md` | the complete listing — attributes, photos by eye, description, meta, size chart, publish | ~2.5 min/item |
| `skills/sals3-quick-publish.md` | volume lane — category + rules-decided attributes + auto mapping + publish; no description, photos or chart | ~9 s/item |

By owner instruction (2026-09-02) the `skills/` folder holds the **canonical,
agent-agnostic** copies, so any model that can read the folder can run either
lane. Claude's `~/.claude/skills` `SKILL.md` files are **mirrors**, and *"when
the two drift, THIS folder wins, and whoever edits one updates both."*

Both defer to `AGENTS.md` for the Rules and Traps, and both spend real money, so
each batch requires a **typed confirmation** — `POINTS` for the quick lane, and
`PUBLISH` before anything goes live.

### `--spread`, and the client guess that had no business existing

Owner, 2026-09-03, after a feed-ordered batch drafted three pairs of pants in a
row — *"kuha ka ng iba-iba"*. The finding underneath it is worth keeping: **the
ready pile is feed-ordered, and feed order is not variety.**

`--spread N` walks the server's own CJ Level 1 label list
(`/api/internal/candidates/cj-categories`, the exact vocabulary the Sourcing
dropdown renders) in random order and takes at most one draftable candidate per
label.

The Sals3 category is **not guessed client-side**. `create-draft` already
resolves the CJ provider category through the ADR-014 mapping rules, and the
category stage reads that resolution back. A first cut word-searched the taxonomy
locally instead and **proposed Bathroom Vanities for a toothpaste** — *"a client
guess has no place where a server resolver already exists."* Same principle as
part 135 §3's refusal to keep a local copy of `MIXED_BUCKET_LEAVES`.

One trap inside that trust, and it bit the whole first spread batch: **the
resolver can land on a CJ-mirror leaf with zero attribute controls**, so
specifications have nothing to write into and "0 decided" reads as a rules
failure rather than an empty vocabulary. The stage now says so by name, and the
fix is an eye-picked v1 `CAT-GGL` leaf via `taxonomy_search` + `set_category`.

## 6. Three traps that will cost time again

From the attribute-controls correction run against SIT on 2026-09-03 (**121
control rows removed, 1,493 allow-lists rewritten**; a second run reports
`controlsRemoved: 0` and rewrites the same 1,493 — idempotent):

1. **A Vercel environment variable of type `Secret` is write-only.** Its own
   dialog says *"You can't reveal this value after saving."* So a secret cannot
   be **copied** to a new repository — it can only be **rotated**. Rotating
   `CRON_SECRET` was safe there only because nothing in the new repo used it yet.
   Check `git grep CRON_SECRET .github/` before ever rotating again, and remember
   **the Vercel runtime only sees a new value after a redeploy.**
2. **`$value | gh secret set` in PowerShell corrupts the secret.** The pipe
   mangled a 46-character value into 45, and every workflow run answered `401`
   while the same value worked from a file. Set secrets from Git Bash with
   `printf '%s' "$(cat file)" | gh secret set …` — no trailing newline, no CRLF,
   no truncation.
3. **Deployment Protection sits in front of the app**, so a correct `CRON_SECRET`
   never reaches a protected preview: the first dispatch died on a `302` to
   `vercel.com/sso-api`. The workflow now sends `x-vercel-protection-bypass`.

> [!IMPORTANT] Trap 3 was found here first, and cost the Portal three hours anyway
> [[sals3-session-2026-09-04-part136-closing-the-window-a-paused-listing-stayed-buyable-in|Part 136]]
> spent an afternoon diagnosing a storefront revalidation 401 as a secret
> mismatch before proving it was the identical Vercel wall — **already written
> down in this repository's `AGENTS.md`, in a repository nothing in the vault
> pointed at.** An operating contract nobody can find is not an operating
> contract. That is the strongest argument for this note existing.

## 7. What it has actually done, by its own run log

The commit history doubles as a run ledger. In order:

| Commit subject | |
|---|---|
| `run: first clean quick-publish batch — 3/3 live in 27.6s` | 2026-09-02 |
| `run: first timed COMPLETE batch — 3/3 live, fully enriched, 7m34s total` | 2026-09-02 |
| `run: first production quick-publish through the new portal — 3/3 live on sals3.com` | 2026-09-02 |
| `run: 5/5 auto-published on production in 57s, no category picked by hand` | 2026-09-03 |
| `run: 20 production items live; ALREADY_MAPPED is success, not a refusal` | 2026-09-03 |
| `chore: record the 700-item run report, and stop tracking console logs` | 2026-09-04 |

Alongside them, fixes that read as a catalogue of what volume exposes:

- `fix(quick-publish): wait out the real create_draft rate limit instead of dying`
- `fix(quick-publish): recover the three failure classes the 200-item run exposed`
- `fix(pipeline): scale the candidate scan with the size of the ask`
- **`fix(api): retry a read that dies on the network, never a write`** — the right
  shape of that rule, and the opposite of the mistake part 89's CJ order made.
- **`feat(status): read a run's progress from the catalogue, because the log can
  be blind`** — progress measured from the system of record rather than from the
  runner's own output.
- `fix(live): re-categorise the fourteen products my Storage mapping mislabelled`
  — the by-hand cleanup behind
  [[sals3-session-2026-09-03-part126-a-cj-leafs-name-is-not-its-contents-twice|part 126]]'s
  mouthwash-under-Storage incident.
- `feat(pipeline): apply the reviewed leaf table itself, so the seeder is not a
  blocker` — which is why part 134's coverage moved on days the Portal workflow
  could not be dispatched.

And one deliberate tombstone: **`recover_lost_photos.py` is DISABLED — `--fix`
refuses to run.** Its docstring and `AGENTS.md` both say not to re-enable it.

## What was not done

- **Nothing here has ever been described in this vault before now**, including
  the two skills, the money guard, the census tooling and the run history.
- **72 commits, 2 pull requests.** Almost none of this work was reviewed by
  anyone, and there is no CI: the only automated check is a local
  `python -u test_enrich_publish.py`.
- **No environment is recorded per run.** `--origin` decides the target and git
  records nothing about it, so "which environment did the 700-item run touch" is
  not answerable from the repository.
- **`docs/sals3_gemini_integration_manual.html` is stale by its own admission** —
  a separate Gemini-based approach from 2026-08-21 that predates this engine and
  *"names none of its programs — do not follow it as current."* It is still
  tracked.
- The repository holds **product data and run reports in git** (the `plan/`
  folder alone carries several multi-hundred-kilobyte request files). No
  retention or scrubbing policy exists.

## Lessons

- **A repository with no remote is not a repository, it is a directory.** Three
  hundred and six reviewed leaves, two playbooks and a money guard sat on one
  disk for two days. The fix cost one push.
- **Branch parity is not environment parity, and the absence of a deployment
  status only means something where a deployment exists.** Write down what a
  repository's branches are *not*, or the org-wide rule will be misapplied to it
  in both directions.
- **A checker served by the system it checks will agree with that system's
  bugs.** `values_agree` is deliberately local for that reason — the one piece of
  logic the API rule does not claim.
- **An operating contract nobody can find is not an operating contract.** The
  Vercel-wall trap was documented here days before it cost the Portal an
  afternoon, in a repository the vault did not name.
- **Never let a client re-derive what a server resolver already decides.** A
  local taxonomy word-search filed a toothpaste under Bathroom Vanities; reading
  the server's own resolution back is both correct and cheaper.
- **Feed order is not variety.** A pile that looks unsorted is sorted by
  something, and taking the first N of it will produce three pairs of pants.

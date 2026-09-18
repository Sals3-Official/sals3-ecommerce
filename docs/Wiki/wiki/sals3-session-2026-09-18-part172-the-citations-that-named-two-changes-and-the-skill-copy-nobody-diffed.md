---
tags:
  - session-record
  - vault-maintenance
  - documentation
  - governance
  - automation
  - sals3-portal-automation
  - sals3
aliases:
  - "Part 172"
  - "The citations that named two changes"
  - "The skill copy nobody diffed"
created: 2026-09-18
updated: 2026-09-18
status: implemented
authority: session-record
implementation_status: merged
related:
  - "[[hot]]"
  - "[[index]]"
  - "[[sals3-skills]]"
  - "[[pending-register]]"
  - "[[sals3-repository-register]]"
  - "[[vault-session-note-conventions]]"
  - "[[vault-governance-and-note-lifecycle]]"
  - "[[sals3-session-2026-09-04-part140-the-automation-repository]]"
  - "[[sals3-session-2026-09-14-part171-the-vault-a-branch-switch-deleted-and-the-root-that-opened-without-its-plugins]]"
---

# Part 172 — The citations that named two different changes, and the skill copy nobody diffed

> [!NOTE] Provenance
> Measured on 2026-09-18, not recalled. Repository and pull-request counts come
> from the GitHub API across both organisations; every disputed citation was
> resolved against **both** repositories before it was labelled; the skill
> copies were compared byte for byte; the offline suite was run before and
> after. Output is quoted where it decided something.
>
> The work is documentation only. **No script, route or rule changed.**

## Pull requests

| PR | What it carried |
| --- | --- |
| [anythingsupplies/sals3-portal-automation#8](https://github.com/anythingsupplies/sals3-portal-automation/pull/8) | the 27 qualified citations, the three reconciled skill copies, the corrected `Known state`, and the pending work that had been sitting uncommitted |

That repository's branches deploy nothing, so a merge there is a merge and not a
release. It was merged as `db88f6f`.

## 1. A bare PR number stopped being an address

`AGENTS.md` in the automation repository cites pull requests by bare number. The
Portal migrated from `Sals3-Official` to `anythingsupplies` on 2026-09-02, the
new repository started again at `#1`, and by 2026-09-18 it had **470 merged
pull requests** — past the old repository's entire range.

So a bare number now resolves in both. Four were checked, and every one of them
means the retired repository while naming something real and plausible in the
current one:

| Cited | In `anythingsupplies` today | In the retired `Sals3-Official` | Meant |
| --- | --- | --- | --- |
| `#204` | protect a route in the proxy | a single-variant product can save its variant matrix | **retired** |
| `#290` | revert an item-loading detail | pagination and real storefront links | **retired** |
| `#308` | a promotion to UAT | move the automation's decision functions server-side | **retired** |
| `#309` | a promotion to production | a chart missing a sold size warns instead of refusing | **retired** |

`#308` is cited seven times, more than any other number.

**Nothing errors.** A reader chasing the reference opens a merged pull request,
reads a coherent change, and is simply in the wrong place — the same shape as
the census that returned the alphabet and the wall that parsed as an empty
result.

Fixed by qualifying all 27 citations and defining the convention in the section
that already explains the migration:

- `portal#N` — `anythingsupplies/sals3-portal`, current.
- `legacy-portal#N` — `Sals3-Official/sals3-portal`, retired. Same for
  `legacy-ecommerce#N`.

Current for `#9`, `#13`, `#23`, `#26`, `#29`, `#33`, `#38`, `#44`, `#48`, `#49`
and `#63`; retired for `#204`, `#290`, `#297`, `#308`, `#309` and
`legacy-ecommerce#219`.

## 2. Each playbook had three copies, and the third was the one that ships

The two playbooks were known to exist twice: a copy in the repository declared
canonical, and a Claude-side `SKILL.md` mirror. `skills/README.md` said the
canonical folder wins on a drift.

They had drifted. **The mirror was the newer copy in both pairs**, carrying the
2026-09-05 category position — every leaf the census found decided, 379 mappings
and 50 mixed buckets — plus two warnings the canonical copy lacked: that a merge
does not apply the mapping table, and that the disabled buckets must not be
driven to zero.

Applying the stated rule would have **restored a superseded coverage figure and
deleted two warnings.**

> [!WARNING] Then a third copy turned up, and it was the one that mattered
> `~/.claude/skills/<name>/SKILL.md` is the copy Claude actually loads at run
> time. It had been missed entirely, and still carried the bare citations and a
> notice asserting the superseded rule.
>
> A stale copy there ships into a live run, which makes it worse than a stale
> copy in either repository location.

All three are now byte-identical. The merge was not a blind copy in either
direction: the canonical quick-publish copy held one line that was **better**
than the mirror's, recording bulk drafting in chunks of five, one rate-limit
token per request rather than per draft, and a measured eleven seconds an item
against the mirror's bare draft call and ten. That line was folded in first.

The precedence rule was replaced, because it was the defect. The copies must now
stay byte-identical, a `diff` check covering all three paths runs before
committing, and if they are ever found apart the demonstrably newer copy wins.

## 3. `Known state` contradicted the rest of its own file

Two entries under the heading a reader trusts most.

The first said a full internal API existed and **"nothing here calls it yet"**,
and named building that caller as the next real speed-up for the project. That
caller shipped the same week and is the loop documented at the top of the same
file.

The second quoted **"All 33 products in the catalogue are done and Live"**, from
2026-08-27, as the catalogue's size. The bulk phases have since drafted against
an owner ask raised from 2,000 to 2,500, and the 500-item run alone ended at 982
live and 7 drafts.

Both corrected. The section now opens with a standing instruction: where an
entry states a **count**, treat it as historical and read the live number
instead; where it states a **rule** or a defect, it stands until something says
otherwise.

The file's own Traps section already makes this argument about the preview
environment — *a contract that contradicts itself is worse than one merely
behind, because either half can be quoted as current* — and the contradiction
was sitting two screens below it.

## 4. What this session got wrong, recorded because it cost the most

**Eleven notes were written into the wrong vault.**

`E:\Bogs 2nd brain` contains a `Wiki/wiki` folder, an `index.md`, a
`vault-catalog.md`, a `hot.md` and a `CLAUDE.md` — every structural signal of
this vault — and it contained the automation repository being worked on. It is
the **BOGS Dashboard** vault, a different business, and its own git history
marked it superseded on 2026-08-04.

The vault of record is `E:\sals3-vault\docs`, Obsidian vault id
`136d4d3e49a5a535`, which the owner supplied when the mistake surfaced.

Two consequences beyond the wasted writing:

- **An audit run against the wrong vault produced a confident wrong finding.**
  It reported that this programme had two decision records against 494 merged
  pull requests. The vault of record holds **255 notes**, with the slug retry,
  the mouthwash incident, the leaf census and the coverage tiers each already
  documented at length.
- **One note contradicted [[hot]].** It stated that a separate dispatch
  activates the mapping table, taken from `AGENTS.md`. `hot` records that
  seeding has been a **Vercel Cron job hourly at :17 on `main` since
  2026-09-07**, so no dispatch is owed. `AGENTS.md` is stale on that point too,
  and the correction is raised rather than made here.

Nothing in the vault of record was written to during the mistake. It was read
only.

## Lessons

**A reference is an address, and an address can stop resolving without
breaking.** When a repository migrates and numbering restarts, every bare number
in every document silently acquires a second meaning. The failure is not a
missing page; it is a coherent wrong page.

**A file is not current because it is called canonical.** The precedence rule
that names a winner by position will, the first time it matters, select the
stale copy. Precedence belongs on evidence — which one is demonstrably newer —
not on a label.

**Count the copies before reconciling any of them.** Two were known and three
existed, and the unknown third was the one loaded at run time.

**Structure is not identity.** A folder carrying every convention of this vault
was not this vault. The vault id, the git remote and the note count each
answered in one command, and none of them was consulted before the writing
started.

Written up as skills 140 to 143 in [[sals3-skills]].

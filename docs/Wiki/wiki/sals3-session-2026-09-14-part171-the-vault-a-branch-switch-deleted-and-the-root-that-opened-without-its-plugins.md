---
tags:
  - session-record
  - vault-maintenance
  - governance
  - git
  - obsidian
  - tooling
  - sals3
aliases:
  - "Part 171"
  - "The vault a branch switch deleted"
  - "The root that opened without its plugins"
created: 2026-09-14
updated: 2026-09-14
status: implemented
authority: session-record
implementation_status: local-only
related:
  - "[[hot]]"
  - "[[index]]"
  - "[[pending-register]]"
  - "[[sals3-skills]]"
  - "[[sals3-repository-register]]"
  - "[[vault-session-note-conventions]]"
  - "[[vault-governance-and-note-lifecycle]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-session-2026-09-11-part169-the-eleven-repositories-and-the-admin-portal-nobody-audited]]"
---

# Part 171 — The vault a branch switch deleted, and the root that opened without its plugins

> [!NOTE] Provenance
> Measured live on 2026-09-14 on the owner's machine, not recalled: `git reflog`
> with `--date=iso`, `git ls-tree` counts per branch, `git check-ignore -v`,
> `netstat -ano` for the listening ports, a filesystem walk of every candidate
> vault, and `curl` against the running Local REST API with the key read from
> the plugin's own `data.json`. Output is quoted where it decided something.
>
> **There is no PR table, because there are no pull requests.** Every change
> here is local: a fast-forward of a local-only branch, a plugin installed into
> a working tree, and two files edited outside any repository. This is the case
> [[vault-session-note-conventions]] leaves open at the end — *where does a note
> about work with no PR to cite go* — and it goes here, with the commit range
> and the file paths standing in for PR numbers.

> [!IMPORTANT] Why this is part 171 and not part 170
> The branch `docs/part170-promotion-and-r2` exists, is merged, and produced
> **no session note** — its commit `814c246` wrote four lessons straight into
> [[hot]], [[pending-register]] and [[sals3-skills]]. The number is spoken for
> by a branch but unclaimed by a note. Per §4's rule that a missing note is
> itself the finding, that absence is recorded here rather than papered over by
> reusing the number. **170 is a deliberate gap.**

## 1. What the owner saw

Obsidian opened on a vault named `docs` with one folder in the file explorer,
`Raw`, and an empty graph. The question was *"bakit nawala ang laman?"* — why
did the contents disappear.

They had not disappeared from anywhere the owner could see, which is the whole
difficulty: the vault the owner was looking at, `E:\sals3-ecommerce\docs`,
genuinely held **one file**.

```
docs/Raw/sals3_cancellation_sop_2026-09-03_v3.pptx.inspect.ndjson
```

Zero markdown. Nothing in `.trash`. Nothing in the folder's git history, because
the folder has no git history — `git log -- docs/` on that checkout is empty.

**The first real evidence that anything had ever been there came from the vault's
own UI state.** `docs/.obsidian/workspace.json` carries `lastOpenFiles`, and it
was full:

```
Wiki/wiki/vault-catalog.md
Wiki/wiki/vault-session-note-conventions.md
Wiki/wiki/sals3-session-2026-09-10-part167-sop-v42-and-the-morning-cj-quoted-nothing.md
...18 entries, the newest naming a part-167 note
```

A file Obsidian writes for its own convenience turned out to be the only
surviving record that 297 notes had been in that folder. It is gitignored — line
47 of the vault repository's `.gitignore`, *"per-person UI state"* — which is
correct as policy and is also why it survived the thing that removed everything
else.

## 2. The mechanism — one clone, two repositories, and a checkout between them

`E:\sals3-ecommerce` is not a clone of one repository. It has **two remotes
pointing at two different GitHub organisations**, holding two unrelated
histories:

```
origin  https://github.com/Sals3-Official/sals3-ecommerce.git   (the vault)
newco   https://github.com/anythingsupplies/sals3-ecommerce.git (the storefront)
```

The vault lives on `origin`'s `docs/*` branches, at `docs/`. The storefront was
created from it on 2026-08-31 by `aa9c9e0`, AJ Nocolai Garrigues,
*"chore: initial import from Sals3-Official (**vault excluded**)"* — and that
same commit added the line that keeps it excluded:

```
$ git check-ignore -v docs/
.gitignore:51:docs/     docs/
```

So the exclusion is **deliberate and correct**: the storefront repository is not
supposed to carry the vault. What nobody accounted for is that both histories
are reachable from one working directory, and branches from each sit side by
side in `git branch`.

Ignoring a path does not untrack what is already tracked, so on the vault-side
branches the 297 notes stayed. The deletion happened at a **checkout that
crossed between the two lineages**. The reflog dates it exactly:

```
2026-09-10 09:43:48  chore/ignore-agent-scratch-directories(docs=297) -> develop(docs=0)
```

`chore/ignore-agent-scratch-directories` tracks `origin` and carries all 297
notes. Local `develop` descends from `aa9c9e0` — it is the **storefront's**
develop — and tracks nothing of `docs/`. Git removed 297 files because the
destination branch, in the other repository's history, does not have them. The
checkout has been on storefront branches ever since
(`feat/one-free-delivery-element`, tracking `newco`, at the time of writing).

**This is not a vault problem. It is two repositories sharing a working
directory**, and the vault is merely the part that is visible when it goes
missing. §5 is what else that arrangement has already done.

**The single surviving file is the diagnostic.** `Raw/*.ndjson` was never tracked
and is ignored, so no checkout has any opinion about it. A folder left holding
exactly its untracked-and-ignored files, and nothing else, is the signature of a
branch switch — not of a deletion, a sync failure, or a crash.

Three things a reader should not have to re-derive:

- **Nothing was lost at any point.** All 297 were committed on the `docs/*`
  branches and pushed to `origin`. The working tree was the only copy affected.
- **`git log -- docs/` proving empty is not evidence of absence.** It is evidence
  that the *current branch* never tracked the path.
- **`.gitignore` had already written the rule down.** Lines 61–63 of the vault
  repository say the repository root *"must not be opened as an Obsidian vault —
  the vault root is `docs/`"*. The guidance existed; nothing enforced it.

## 3. A wrong diagnosis, corrected within the hour

Before the reflog was read, this agent told the owner the notes existed only
inside a `.claude\worktrees\` directory, were **not** protected by git, and could
be permanently lost if that worktree were pruned. Two of those three claims were
false.

The notes were tracked, committed, and pushed on four branches. The correct
statement is the opposite of the one given: the copy in the worktree was the
*least* interesting one.

The error came from reasoning about `docs/` from the **current branch's** view of
it — ignored, untracked, no history — and generalising that to the repository.
One `git ls-tree -r --name-only <branch> -- docs/` against any `docs/*` branch
would have contradicted it immediately, and was not run until later.

It is recorded here rather than quietly fixed because it changed the advice
materially: it pointed at *copy these files somewhere safe now*, when the real
answer was *fast-forward a branch*. Per §6, the correction is its own act.

## 4. The recovery — a fast-forward, not a copy

`E:\sals3-vault` is a worktree of this repository on the local-only branch
`vault`. Its relationship to the newest documentation branch decided the method:

```
commits in docs/part170b-derived-ids not in vault:  54
commits in vault not in docs/part170b-derived-ids:   0
```

Strictly behind, nothing ahead — so a fast-forward, with no merge commit, no
conflict, and no new history:

```
Updating 0dae295..bc25bac
Fast-forward
 59 files changed, 11452 insertions(+), 26 deletions(-)
```

**268 markdown notes**, working tree clean. `Wiki/`, `journal/`,
`agent-turnovers/`, `Raw/`, `sals3-deferred-product-discovery/`.

The alternative — copying files into `E:\sals3-ecommerce\docs` — was rejected
because it restores the symptom's home rather than leaving it: that folder is
emptied again by the next branch switch, which is what produced this note.

`vault` has no `origin/vault`, so nothing about the fast-forward touched a shared
branch or required a push.

## 5. The same clone has an upstream pointed at the wrong organisation

The two-remote arrangement has already produced a second defect, found while
confirming the first, and it is worse than an empty folder.

**Local `develop` is the storefront's develop. Its configured upstream is the
vault repository.**

```
$ git rev-parse --abbrev-ref develop@{upstream}
origin/develop                       # = Sals3-Official/sals3-ecommerce

$ git merge-base --is-ancestor aa9c9e0 develop         # storefront import
  yes                                # local develop is storefront lineage
$ git merge-base --is-ancestor aa9c9e0 origin/develop
  no                                 # the vault repository has none of it
```

The divergence that follows is not a drift; the two branches are simply
different projects:

| | commits the other side lacks |
| --- | --- |
| `develop` → `newco/develop` (storefront) | **0 behind, 54 ahead of local** — same project, merely stale |
| `develop` → `origin/develop` (vault) | **93 local commits absent upstream, 584 upstream commits absent locally** |

So on that branch:

- **`git push` offers 93 storefront commits to `Sals3-Official/sals3-ecommerce`** —
  a **public** repository that ADR-019 §1 reserves for the vault. One command,
  no flags, no warning, and the org boundary is gone.
- **`git pull` merges 584 vault commits into a storefront branch.**

[[sals3-repository-register]] §6 already warns that *"a push from the wrong one
is an ADR-019 breach in a single command"*, reasoning about two **separate**
clones that are easy to confuse. The real arrangement is worse than the one it
warns about: it is **one** clone where the wrong remote is already the
configured default, so the mistake needs no confusion to happen — only a
`git push` on the branch the checkout is most likely to be sitting on.

Nothing has been pushed. `git log origin/develop` carries no storefront commit,
and `aa9c9e0` is absent from the vault repository, so the boundary is intact
today. **This was not changed in this session** — re-pointing an upstream or
removing a remote alters where a colleague's next push lands, and that is the
owner's call. It is raised in [[pending-register]] as **[P1]** with the figures
above.

## 6. The second fault — a vault that opened, and loaded none of its plugins

Told to open `E:\sals3-vault\docs`, the owner opened `E:\sals3-vault` — the
repository root, one level up. The notes appeared, under a `docs/` subfolder, and
the vault looked correct.

It was not. **The plugins live in `docs/.obsidian`, not in the root.** Opening
the root created a fresh `.obsidian` with no plugins at all, which meant:

- **`obsidian-git` was not running**, so nothing the owner wrote would have been
  committed — the failure mode is silence, and it is the one that loses work.
- **the Local REST API was not running**, so the MCP server had no server to
  reach.

The root `.obsidian/` is itself gitignored (line 63), so nothing about the wrong
root would have been visible in `git status` either. A vault that opens and shows
the right notes is not evidence that it opened at the right root.

## 7. Two stale keys, and a server that was not listening

The Obsidian MCP server had been failing all session. There were **two
independent faults**, and fixing either alone would have left the same error.

**The server was not listening.** `netstat` showed nothing on 27123 or 27124. The
only vault with the REST API plugin installed was `E:\Bogs 2nd brain`, and it was
closed.

**The configured key was stale.** Two config files, two different transports,
both carrying a key the plugin does not accept:

| Config | Transport | Key |
| --- | --- | --- |
| `~/.claude.json` → `mcp-obsidian` | `https://127.0.0.1:27124` | `703db7dd…fc75f4` |
| `claude_desktop_config.json` → `@swarogan/obsidian-mcp-rest` | `http://127.0.0.1:27123` | `703db7dd…fc75f4` |
| the plugin's own `data.json` | — | **`c7c9b7a7…4838fbf4`** |

Both were pointed at the live key, the plugin was installed into
`docs/.obsidian/plugins/` from the local copy in `E:\Bogs 2nd brain` — no
download — and enabled. After the owner reopened at the correct root:

```
$ curl -s  -H "Authorization: Bearer <key>" http://127.0.0.1:27123/
{"status": "OK", "manifest": {"version": "4.1.7", ...}}

$ curl -sk -H "Authorization: Bearer <key>" https://127.0.0.1:27124/vault/
{"files": ["Raw/","Wiki/","agent-turnovers/","journal/",
           "sals3-deferred-product-discovery/"]}
```

**The plugin's `data.json` holds the plaintext API key and the server's RSA
private key**, and `.gitignore` line 59 was already excluding that one file —
written by whoever last thought about this, and correct. It was widened to the
whole plugin directory: `main.js` is a 3.9 MB bundle, and tracking a manifest
without its code only errors on a fresh clone. `obsidian-git`'s own vendored copy
is untouched and still tracked.

## 8. Repository coverage, re-derived 2026-09-14

The owner also asked which repositories still have no vault entry. Re-derived
rather than read off [[sals3-repository-register]], per that note's own §7 rule
3, and enumerated under **both** accounts per rule 2.

**The set is unchanged: eleven repositories, no new ones since 2026-09-11.**
`louieboi09` still cannot see three `anythingsupplies` repositories, so the
register's P3 stands.

Vault files naming each repository as `owner/name`, counted across `docs/Wiki/`:

| Repository | 2026-09-11 | **2026-09-14** |
| --- | --- | --- |
| `anythingsupplies/sals3-portal` | 32 | 37 |
| `anythingsupplies/sals3-ecommerce` | 17 | 19 |
| `anythingsupplies/sals3.com.fj` | 18 | 21 |
| `anythingsupplies/sals3.com.au` | 12 | 15 |
| `anythingsupplies/sals3-portal-automation` | 5 | 8 |
| `anythingsupplies/sals3-admin-portal` | **0** | **6** |
| `Sals3-Official/sals3-ecommerce` | 59 | 61 |
| `Sals3-Official/sals3-portal` | 93 | 97 |
| `Sals3-Official/sals3-admin-portal` | 6 | 12 |
| `louieboi09/sals3-2nd-brain` | 3 | 4 |
| `louieboi09/bogs-dashboard` | **0** | **3** |

**No repository is undescribed.** Both zeroes were closed by part 169 and the
register itself, and the coverage is real rather than incidental — the two
formerly-zero repositories are named in [[sals3-repository-register]],
[[pending-register]] and part 169, which describe what they are, what is wrong
with them, and who decides.

That is coverage of *existence*, not of *work*.
`anythingsupplies/sals3-admin-portal` is still an empty reserved name, and the
application still sits in the public `Sals3-Official` org with no gate — both
open in [[pending-register]], both owner decisions, unchanged by this session.

## Lessons

1. **A folder holding exactly its untracked-and-ignored files, and nothing else,
   was emptied by a checkout.** The survivors identify the cause: anything git
   tracks on some branch is removed when you move to a branch that does not track
   it, and anything git was told to ignore is left alone.
2. **`git log -- <path>` returning nothing means the current branch never tracked
   that path.** It is not evidence the path was never tracked anywhere. Ask
   `git ls-tree` of the other branches before concluding anything is lost.
3. **A tool's own state files are evidence.** `workspace.json` proved the notes
   had existed when git, the trash and the filesystem all had nothing to say.
4. **An ignore pattern written to exclude scratch will also exclude everything
   else under that path.** `docs/` was meant to drop 346 MB of agent output; it
   dropped the vault.
5. **A vault that opens is not a vault that works.** Plugins are per-vault-root.
   Opening one directory too high silently disables auto-commit, which fails by
   writing nothing rather than by erroring.
6. **Two faults in one path produce one error message.** The server was down *and*
   the key was stale; either fix alone leaves the identical symptom, and whichever
   is fixed first looks like it did not work.
7. **Correct a wrong diagnosis in the same conversation it was given.** This one
   would have sent the owner to copy files out of a worktree when a fast-forward
   was the answer.

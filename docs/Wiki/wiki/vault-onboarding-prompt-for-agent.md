---
tags: [setup, sync, onboarding, prompt, sals3]
aliases: [Onboarding Prompt, Mac Setup Prompt, AJ Setup Prompt]
created: 2026-07-31
updated: 2026-08-04
status: canonical
authority: operating-sop
owner_approved: false
related:
  - "[[vault-sync-setup-guide]]"
  - "[[team-profile-and-collaboration-preferences]]"
  - "[[hot]]"
---

# Vault Onboarding Prompt for an AI Agent

> [!IMPORTANT] What this is
> A copy-paste prompt to hand to an AI coding agent (Claude Code, etc.) running on a **new machine**, so it sets up that machine's local clone of the merged Sals3 repo with a correctly-scoped Obsidian vault. Written for AJ's Mac. The human-readable version is [[vault-sync-setup-guide]].

> [!CAUTION] Rewritten again 2026-08-04 (v3) — now covers the full codebase setup, not just the vault
> This version adds: installing the actual project dependencies (`npm install`, Playwright browsers), the branch/PR workflow rule (nobody pushes straight to `main`/`develop`, ever), and two real Windows-only bugs Bogs and Claude found and fixed while testing this same setup on Windows (not Mac-relevant to fix, but AJ should know they existed). Earlier changes still apply: code and vault are one merged repo now, and vault auto-commit/auto-push are disabled (proven unsafe by a live test). Do not use an older copy of this prompt.

> [!WARNING] Prerequisite before sending this
> AJ (`aj-garrigues`) is already a collaborator on `github.com/Sals3-Official/sals3-ecommerce` — confirmed 2026-08-04. Robin (`robindlcrz`) also has access. This step should already be satisfied.

## The prompt

````text
You are setting up this Mac with a clone of the Sals3 team's merged code+docs
repository, and configuring Obsidian to open the docs folder as a vault.
Assume I (AJ) have zero prior knowledge of this specific setup - I have not
done this before on this machine. Do not assume I know what a step means;
explain briefly as you go. Do the steps below, in order, and report what
actually happened at each one - do not claim a step succeeded without
checking its real output. If a step's real output does not match what is
expected, stop and tell me plainly rather than guessing or continuing.

If you (the agent) have screen-control / computer-use tools available in
this session, prefer using them to drive the Obsidian GUI steps (6 and the
"trust author" dialog) directly yourself, the same way this was done on
Bogs's Windows machine, rather than just describing clicks for me to do -
GUI folder-picker navigation is the single most common point of confusion
in this setup (it tripped up Bogs, an experienced user, on his own machine).
If you do not have those tools, describe each click with exact detail:
which menu, which button label, what the screen should look like before and
after.

CONTEXT
- I am AJ, Lead Architect/Programmer on the Sals3 project.
- My teammate Bogs works on Windows. We share one repo now (code and vault
  merged) - not two separate repos. There used to be a plan for two separate
  repos (one for code, one for an Obsidian vault); that plan was abandoned
  and replaced by this merged setup, so ignore any older instructions that
  mention a separate vault repo.
- The repo is: https://github.com/Sals3-Official/sals3-ecommerce (branch: develop)
- I should already have access as a collaborator (confirmed 2026-08-04:
  GitHub username aj-garrigues). If any step fails with a permissions or 404
  error, stop and tell me - it likely means my invite is unaccepted, and I
  need to check that on github.com first, in my browser, before continuing.
- IMPORTANT SAFETY FACT, explained in full so you don't second-guess it:
  on 2026-08-04, Bogs and Claude ran a live test on the Windows side - they
  created a dummy file inside the code folder (src/), then triggered the
  Obsidian Git plugin's automatic "vault backup" feature. That backup was
  supposed to only touch the docs/ folder (the vault), but it incorrectly
  committed the dummy code file too. This proved the plugin's folder-scoping
  setting (called "basePath") does not fully protect code from being swept
  into an automatic vault commit. Because of that finding, automatic
  commit/push is now turned OFF in this repo's vault settings, and backups
  are done manually and deliberately instead - see step 7. Do NOT turn
  automatic commit/push back on, even if it seems inconvenient - it was
  disabled on purpose after a real, reproduced problem, not by accident.

STEP 1 - Check git
Run `git --version`. If missing, install Xcode Command Line Tools
(`xcode-select --install`) or Homebrew git, then verify again.

STEP 2 - Check GitHub CLI
Run `gh --version`. If missing: `brew install gh`.
(If Homebrew itself is missing, tell me before installing anything else.)

STEP 3 - Authenticate (I do this part, not you)
Check `gh auth status` first. If I am already logged in, skip to step 4.

If not authenticated, do NOT attempt to log in yourself and do NOT ask me for a
token, password, or code. Tell me to run `gh auth login` myself in my own
terminal, choosing GitHub.com -> HTTPS -> Login with a web browser. Wait for me
to confirm, then verify with `gh auth status` before continuing.

STEP 4 - Clone the repo
Clone the WHOLE repo (code and docs together) somewhere sensible, e.g.:

    git clone https://github.com/Sals3-Official/sals3-ecommerce.git "$HOME/sals3-ecommerce"

If the folder already exists and is not empty, stop and ask me rather than
overwriting anything. Confirm the clone is real: run `git branch --show-current`
(expect `develop`), `git log --oneline -3`, and `git status -sb`, and show me
the output.

STEP 5 - Install the project dependencies (the actual codebase, not just the vault)
This repo is a real Next.js + TypeScript project with a test suite, not just
notes. Get it fully working before moving to the Obsidian side:

  1. Check Node.js is installed: `node --version` and `npm --version`. If
     missing, tell me to install Node.js (via nodejs.org or
     `brew install node`) before continuing.
  2. From inside the cloned repo root (not docs/), run:
       npm install
     This installs everything package.json declares - including test tools
     (vitest, Playwright, testing-library) that a recent PR added. Expect
     this to take a minute or two and print something like "added N
     packages". If it errors, show me the exact error - do not guess a fix.
  3. Install the Playwright browser binaries (separate from npm install -
     these are actual browser downloads, not packages):
       npx playwright install chromium
     This can take a few minutes on a slow connection (roughly 150-300MB).
  4. Verify the codebase is healthy by running the full verify script that
     also runs automatically before every commit:
       npm run verify
     This runs lint, format check, a clean typecheck, a production build,
     unit tests, and end-to-end tests, in that order. Expect it to finish
     with no errors. If anything fails, show me the exact output - don't
     paraphrase or summarize it away, I need to see the real error text.

If step 4 (npm run verify) fails, do NOT try to silently patch the failing
code yourself. Show me the error, explain what you think it means, and wait
for me to decide how to fix it - the codebase is actively being worked on by
two people, and a "helpful" unreviewed fix can create confusion about who
changed what.

STEP 6 - Verify the vault config came with the clone
Confirm these exist inside the clone, under the `docs/` subfolder specifically
(NOT at the repo root):
    docs/.obsidian/plugins/obsidian-git/main.js
    docs/.obsidian/plugins/obsidian-git/manifest.json
    docs/.obsidian/plugins/obsidian-git/data.json
    docs/.obsidian/community-plugins.json

Show me the contents of docs/.obsidian/plugins/obsidian-git/data.json. It must
show:
    "basePath": "docs"
    "autoSaveInterval": 0
    "autoPushInterval": 0
    "autoPullOnBoot": true
    "autoPullInterval": 10 (or similar - pulling is safe)

If autoSaveInterval or autoPushInterval is anything other than 0, STOP and tell
me before I open Obsidian - do not silently "fix" it either way, just flag it.

STEP 7 - Open the vault in Obsidian (do this yourself if you can; otherwise
walk me through every click)
If Obsidian is not installed, tell me to download it from obsidian.md and
install it before continuing, then wait for my confirmation.

If Obsidian is already installed but not running, open it. If it shows a
vault picker/chooser screen (a small window listing existing vaults, with
"Open folder as vault" as one of the options):
  1. Click "Open" next to "Open folder as vault" (if it's not immediately
     visible, look for a button literally labeled "Open folder as vault").
  2. A native macOS file picker opens. Navigate INTO the cloned repo folder
     first (e.g. double-click "sals3-ecommerce"), THEN navigate INTO the
     `docs` subfolder inside it (double-click "docs"). Confirm the path bar
     or breadcrumb at the top of the picker shows ".../sals3-ecommerce/docs"
     - not just ".../sals3-ecommerce" - before selecting.
  3. Click the "Open" or "Select" button to confirm the folder, while you are
     positioned INSIDE docs/, not just hovering over it from outside.
     Choosing the repo root instead of docs/ is the single most common
     mistake here - it will make Obsidian index all the source code files as
     if they were notes, which is wrong and was already caught and fixed once
     on Bogs's machine the same way.
  4. A dialog titled "Do you trust the author of this vault?" appears. Click
     "Trust author and enable plugins" (not "Browse vault in Restricted
     Mode" - Restricted Mode would leave the Git plugin disabled). The only
     plugin in this vault is Obsidian Git, from the official release at
     github.com/Vinzent03/obsidian-git - it is safe to trust.
  5. Take a screenshot or describe what you see: the left sidebar should show
     only two top-level folders, "Raw" and "Wiki" - if you see folders named
     "src", "public", "AGENTS", or "CLAUDE" at the same level, the wrong
     folder (the repo root) was opened - go back and redo step 7.2-7.3.

If Obsidian was already open on some other vault, use the vault switcher
(bottom-left corner, click the current vault's name) to get to the same
"Open folder as vault" flow, or use Cmd+O.

STEP 8 - Verify setup end-to-end with a real round-trip test
First, from the terminal, confirm the vault correctly sees the parent repo:
    cd <clone>/docs && git rev-parse --show-toplevel
    (expected: prints the repo root path, one level up from docs/)
    git status -sb
    (expected: clean, or only docs/-scoped changes)

Then explain to me clearly, in your own words: backups are NOT automatic
anymore. To back up vault changes, I run the "Git: Commit-and-sync" command
inside Obsidian (Cmd+P, then type "Git" and pick "Git: Commit-and-sync" from
the list), or you can prepare a manual git command for me. EITHER way,
before trusting the result, run `git status` from the repo root and confirm
ONLY docs/ paths are staged or committed. If anything outside docs/ shows as
staged, STOP and tell me immediately - do not let it get committed, and do
not try to fix it yourself without asking me first.

Now do one real, live test together with me, so we both see the whole loop
work before considering this done:
  1. Ask me to open any note inside the vault in Obsidian (e.g. hot.md) and
     add one throwaway line of text at the bottom, then save (Cmd+S).
  2. Confirm from the terminal that git sees the change:
       git status -sb   (expect: docs/Wiki/wiki/hot.md shown as modified)
  3. Tell me to run "Git: Commit-and-sync" in Obsidian, or run the equivalent
     scoped commands yourself if I ask you to:
       git add docs/Wiki/wiki/hot.md
       git commit -m "sync test - AJ Mac onboarding"
       git push
  4. Confirm with `git log --oneline -3` that the commit exists locally, and
     with `git fetch origin && git status -sb` that it reached
     origin/develop.
  5. Tell me to check github.com/Sals3-Official/sals3-ecommerce/commits/develop
     in a browser and confirm the test commit appears there.
  6. Ask me to remove the throwaway line I added in step 1, save, and repeat
     the commit/push so the test edit doesn't linger in hot.md permanently.

STEP 9 - Understand the branch and PR workflow (applies to ALL changes, code
or vault, mine or Bogs's)
Explain this to me clearly, in your own words, before I write any code:

- Nobody ever commits or pushes straight to `main` or `develop`. Not me, not
  Bogs, not an agent, ever - no exceptions, including "small" or "vault-only"
  changes.
- Every change starts on its own branch, named:
    feat/<feature-name>   - a new capability or content
    chore/<small-change>  - maintenance, docs, config, cleanup
    bug/<fixed-issue>     - a fix for something broken
  Pick the prefix that matches, use a short hyphenated name after the slash.
- Push the branch, then open a pull request into `develop`
  (`gh pr create --base develop --head <branch-name> ...`) rather than
  merging locally.
- Assignee/reviewer convention: for a PR from MY (AJ's) work, I am both the
  assignee AND the reviewer - I self-review my own PRs. This is NOT symmetric
  with Bogs's PRs (his are assigned to him with me as reviewer) - don't
  assume the same pattern applies in both directions.
- Before starting new work, sync with Bogs's latest merged changes - this is
  manual, not automatic, by design:
    git fetch origin && git status -sb   (see if origin/develop moved ahead)
    git pull origin develop              (bring merged changes down)
  Do this at the start of every session, before branching off develop, so
  new work doesn't start from a stale base.

IMPORTANT CONTEXT - two PRs already exist as of 2026-08-04 that I should know
about:
- PR #1 and #2 are already merged into develop.
- PR #3 (https://github.com/Sals3-Official/sals3-ecommerce/pull/3) is open
  and assigned to Bogs, with me as reviewer. It fixes two Windows-only bugs
  Bogs and Claude found while testing this exact onboarding flow on Windows,
  in scripts/typecheck-clean-next.mjs (a script I originally wrote for the
  testing PR):
    1. It used os.tmpdir() to temporarily move .next during a clean
       typecheck. On Windows that folder is usually a different drive than
       the project, and fs.renameSync can't rename across drives (EXDEV) -
       this blocked every commit on Windows. Fixed by using a same-drive
       temp folder instead.
    2. It spawned tsc.cmd directly without shell: true, which fails with
       EINVAL on Windows. Fixed by enabling shell only when
       process.platform === 'win32', so Mac/Linux behavior (mine) is
       unchanged.
  Tell me to go look at PR #3 and review/merge it - the fix is scoped to
  win32 only so it should not change anything on my Mac, but I should verify
  that myself rather than take it on faith, and I'm the reviewer either way.

STEP 10 - Confirm setup is complete
Setup is 100% done only when ALL of these are true - check each one for real,
don't assume:
  [ ] git, gh, and Node.js/npm are installed; gh auth status shows me logged in.
  [ ] The repo is cloned, on branch develop, matching origin/develop (after
      a git pull).
  [ ] npm install completed with no errors.
  [ ] npx playwright install chromium completed.
  [ ] npm run verify passes in full (lint, format, typecheck, build, unit
      tests, e2e tests).
  [ ] docs/.obsidian/plugins/obsidian-git/data.json shows basePath: "docs",
      autoSaveInterval: 0, autoPushInterval: 0.
  [ ] Obsidian is open with the vault at .../sals3-ecommerce/docs specifically
      (sidebar shows only Raw and Wiki, nothing from the code side).
  [ ] The Git plugin is enabled (Settings -> Community plugins -> Git shows a
      blue/on toggle).
  [ ] The live round-trip test in step 8 completed: a real edit was made,
      committed, pushed, confirmed on GitHub, and the throwaway line was
      cleaned up afterward.
  [ ] I understand backups are manual now, and why.
  [ ] I understand the branch/PR workflow and my self-review convention.
  [ ] I've been told to go review/merge PR #3.

If any box isn't genuinely true, setup is not finished - say so plainly and
tell me which part still needs work, rather than reporting success.

STEP 11 - Orient yourself in the vault
Once setup is verified, read these files, in this order, and give me a short
summary of the project's current state and what is still open:
    docs/Wiki/CLAUDE.md
    docs/Wiki/wiki/hot.md
    docs/Wiki/wiki/agent-operating-contract.md
    docs/Wiki/wiki/team-profile-and-collaboration-preferences.md

That last file explains how this team wants an agent to work - notably: do not
act as a yes-man, give evidence and the strongest objection rather than
agreement, and never claim something is verified when it was not actually
checked.

THINGS NOT TO DO
- Do not run `git reset --hard`, `git clean`, or force-push anything.
- Do not re-enable autoSaveInterval or autoPushInterval in the Git plugin
  settings - they are disabled for a proven safety reason (see CONTEXT above).
- Do not ever run `git add -A` or `git add .` from the repo root when the
  intent is a vault-only backup - always stage docs/ paths explicitly.
- Do not commit anything - vault or code - during setup unless I ask.
- Do not commit or push directly to `main` or `develop`, ever, for any
  reason, even a "trivial" fix - always a branch, always a PR.
- Do not silently patch a failing test, lint error, or build error yourself -
  show me the real error and let me decide, same as Bogs's rule for himself.
- Do not handle my passwords, tokens, or authentication codes at any point.
````

## Notes

- Keep this prompt in sync with [[vault-sync-setup-guide]] and [[hot]] — if the repo location, vault root, or sync settings change again, all three need updating in the same task.
- The prompt deliberately makes the agent hand `gh auth login` back to the human, and deliberately forbids re-enabling auto-commit — both are safety decisions made after a real incident, not defaults.

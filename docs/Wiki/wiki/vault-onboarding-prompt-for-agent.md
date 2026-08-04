---
tags: [setup, sync, onboarding, prompt, sals3]
aliases: [Onboarding Prompt, Mac Setup Prompt, AJ Setup Prompt]
created: 2026-07-31
updated: 2026-07-31
status: canonical
authority: operating-sop
owner_approved: false
related:
  - "[[vault-sync-setup-guide]]"
  - "[[team-profile-and-collaboration-preferences]]"
---

# Vault Onboarding Prompt for an AI Agent

> [!IMPORTANT] What this is
> A copy-paste prompt to hand to an AI coding agent (Claude Code, etc.) running on a **new machine**, so it sets up that machine's local clone of this vault with working auto-sync. Written first for AJ's Mac; reusable for any later machine. The human-readable version of the same steps is [[vault-sync-setup-guide]] — this note is the agent-facing version.

> [!WARNING] Prerequisite before sending this
> The new person must already be a **collaborator** on `github.com/louieboi09/sals3-2nd-brain` (private repo) and must have accepted the invite. Without it, step 4 fails with a permissions error, not a clear "not invited" message.

## The prompt

````text
You are setting up an Obsidian vault on this Mac so it stays automatically in sync
with my teammate's machine through a private GitHub repo. Do the steps below, in
order, and report what actually happened at each one - do not claim a step
succeeded without checking its real output.

CONTEXT
- I am AJ, Lead Architect/Programmer on the Sals3 project.
- My teammate Bogs works on Windows and already has this vault set up there.
- The vault is a private GitHub repo: https://github.com/louieboi09/sals3-2nd-brain
- I should already have been added as a collaborator on that repo. If any step
  fails with a permissions or 404 error, stop and tell me - it most likely means
  the invite is missing or unaccepted, and I need to sort that with Bogs first.
- The vault syncs through the Obsidian Git plugin. Its settings are already
  committed inside the repo, so a clone inherits them. Do NOT re-enter or change
  the sync settings.

STEP 1 - Check git
Run `git --version`. If git is missing, install the Xcode Command Line Tools
(`xcode-select --install`) or Homebrew git, then verify again.

STEP 2 - Check GitHub CLI
Run `gh --version`. If missing, install it: `brew install gh`
(If Homebrew itself is missing, tell me before installing anything else.)

STEP 3 - Authenticate (I do this part, not you)
Check `gh auth status` first. If I am already logged in, skip to step 4.

If not authenticated, do NOT attempt to log in yourself and do NOT ask me for a
token, password, or code. Instead, tell me to run `gh auth login` myself in my own
terminal window, choosing: GitHub.com -> HTTPS -> Login with a web browser, and to
accept when it offers to configure git credentials. Wait for me to confirm it is
done, then verify with `gh auth status` before continuing.

STEP 4 - Clone the vault
Clone it somewhere sensible in my home directory, for example:

    git clone https://github.com/louieboi09/sals3-2nd-brain.git "$HOME/SALS3 2nd brain"

The path does not need to match Bogs's Windows path. If the folder already exists
and is not empty, stop and ask me rather than overwriting anything.

Then confirm the clone is real: run `git log --oneline -3` and
`git status -sb` inside it, and show me the output.

STEP 5 - Verify the plugin came with the clone
Confirm these exist in the clone:
    .obsidian/plugins/obsidian-git/main.js
    .obsidian/plugins/obsidian-git/manifest.json
    .obsidian/plugins/obsidian-git/data.json
    .obsidian/community-plugins.json

Show me the contents of data.json. It should contain autoPullOnBoot true and
autoSaveInterval, autoPushInterval, autoPullInterval all set to 10. If any of
that is missing or different, tell me - do not "fix" it by writing your own
values.

STEP 6 - Tell me how to open it
Do not try to drive the Obsidian GUI. Instead, tell me to:
  1. Open Obsidian -> "Open folder as vault" -> select the cloned folder.
  2. When it asks "Do you trust the author of this vault?", choose
     "Trust author and enable plugins". (The only plugin is Obsidian Git, from
     the official release at github.com/Vinzent03/obsidian-git.)

STEP 7 - Verify sync actually works
After I confirm the vault is open in Obsidian, verify from the terminal that the
repo is healthy and connected:
    git remote -v
    git fetch origin && git status -sb
Report whether local and origin/main agree.

Then explain to me how to confirm it end-to-end myself: make a small edit in any
note, wait about 10 minutes, and check that a new "vault backup: <timestamp>"
commit appears on GitHub.

STEP 8 - Orient yourself in the vault
Once setup is verified, read these files in the clone, in this order, and give me
a short summary of the project's current state and what is still open:
    Wiki/CLAUDE.md
    Wiki/wiki/hot.md
    Wiki/wiki/agent-operating-contract.md
    Wiki/wiki/team-profile-and-collaboration-preferences.md

That last file explains how this team wants an agent to work - notably: do not act
as a yes-man, give evidence and the strongest objection rather than agreement, and
never claim something is verified when it was not actually checked.

THINGS NOT TO DO
- Do not run `git reset --hard`, `git clean`, or force-push anything.
- Do not modify the Obsidian Git settings - they are shared through the repo, so
  changing them here changes them for Bogs too.
- Do not commit anything to this vault during setup unless I ask.
- Do not handle my passwords, tokens, or authentication codes at any point.
````

## Notes

- Keep this prompt in sync with [[vault-sync-setup-guide]] — if the sync settings or repo URL change, both notes need updating in the same task.
- The prompt deliberately makes the agent hand `gh auth login` back to the human. An agent should never be handling someone's credentials, and the browser device-flow cannot be completed from a non-interactive session anyway.

---
tags: [sals3, turnover, handoff, template, canonical]
aliases: [Sals3 Turnover Prompt, Turnover Prompt Template, Agent Handoff Template]
created: 2026-07-31
updated: 2026-07-31
status: canonical
authority: handoff-format
owner_approved: false
related:
  - "[[hot]]"
  - "[[team-profile-and-collaboration-preferences]]"
  - "[[sals3-management-bible]]"
  - "[[sals3-implementation-phases]]"
---

# Sals3 Turnover Prompt — Format and Template

> [!IMPORTANT] What this note is for
> This is the **exact format** for the copy-paste turnover prompt handed to the next AI agent session on Sals3 — mirroring the format Bogs already uses on BOGS Dashboard (a monolithic, ALL-CAPS-sectioned context dump written in "you are taking over" voice, meant to be pasted whole into a fresh agent with zero prior context). Do not invent a different structure. When asked to write a turnover prompt, fill in the template below with real, current, verified facts — never fabricate a section just to keep the shape complete. A section with nothing real to report should say so plainly (e.g. "No Sals3 codebase exists yet") rather than be padded out.

## Quick trigger — copy-paste this when queuing out

Paste this to the agent whenever AJ or Bogs is wrapping up and handing off:

````text
We're queuing out for now. Run the full turnover-prompt procedure from
sals3-turnover-prompt-template.md: verify the real current state, update the
canonical vault notes (management bible, implementation phases, end-to-end
process flow, feature landscape, manual testing checklist) to match it, then
write a fresh turnover prompt from those notes using the template format,
commit and push the vault, present the finished prompt here, and confirm with
us before treating the handoff as done.
````

This works whether or not anyone manually committed anything themselves first — the agent verifies real state either way, it doesn't matter who made the last commit.

## Procedure — what to do when the team says "create a turnover prompt"

This is the trigger for the team queuing out and handing the project to another dev/agent. When it fires, do these in order — don't skip straight to writing the prompt text:

1. **Verify real current state first.** `git log`, `git status`, test results, whatever is actually true right now — never carry forward a stale claim from the last turnover or from memory.
2. **Update the vault's canonical notes to match that verified state** — the same "fully updated and consolidated" pass Bogs already does on BOGS Dashboard before a handoff:
   - [[sals3-management-bible]] — if any behavior/contract changed.
   - [[sals3-implementation-phases]] — flip status markers (`[x]`/`[~]`/`[ ]`/`[?]`/`[P]`/`[C]`) to match reality.
   - [[sals3-end-to-end-process-flow]] — if the workflow itself changed.
   - [[sals3-feature-landscape-and-expansion-map]] — update each item's status.
   - [[sals3-manual-testing-checklist]] — add/update pending items.
   - [[hot]] — verified current state only, this is the last thing to update since everything else feeds into it.
3. **Write the turnover prompt** using the template below, filled from the now-current notes — not written independently of them. If a note update and the prompt disagree, the note is wrong or the prompt is wrong; fix it before sending either out.
4. **Commit and push** the vault updates (current phase rule applies — see [[team-profile-and-collaboration-preferences#Cross-machine git backup discipline — vault only, user-paced]]).
5. **Present the finished prompt as a copy-paste block** in chat, and offer to also save it as its own dated note in the vault for the historical record — don't silently only do one or the other.
6. **Ask for confirmation** before treating the handoff as done — the team should see and approve the prompt before it goes to the next dev/agent.

> [!WARNING] When to write one
> See [[team-profile-and-collaboration-preferences#Turnover prompt — ask after every commit]] for the trigger rule: ask the user whether to write/update a turnover prompt right after committing to their git, every time.

## Template (copy this shape; replace every bracketed part with real, verified content)

````text
You are taking over the Sals3 project from a previous agent.

CURRENT DATE / CONTEXT
- Date: [real date]
- Communicate naturally in Taglish unless technical precision is clearer in English.
- Do not behave like a yes-man. Challenge weak logic with evidence and explain tradeoffs.
- The team is AJ (Lead Architect/Programmer, full-stack), Bogs (Senior Developer, full-stack,
  best friends and co-developers), and Robin (Marketing Manager). None of them is "Sals3
  Leadership/Owner/Board" - they are staff; there is a separate boss/owner above them. Do not
  assume otherwise. See team-profile-and-collaboration-preferences.md.
- AJ works remotely on a Mac; Bogs works on Windows; working hours are async, sometimes
  overlapping, sometimes not.

PRIMARY WORKSPACES

Obsidian vault (second brain):
E:\SALS3 2nd brain

Vault remote:
origin = https://github.com/louieboi09/sals3-2nd-brain.git

Vault branch:
main

Current vault commit:
[git log -1 --oneline output]

Sals3 codebase (once one exists):
[path] - NOT YET CREATED as of 2026-07-31. Confirmed stack: Next.js + TypeScript.
Confirmed pairing convention once created: root CLAUDE.md + .agents/skills/obsidian-vault/SKILL.md
pointing back to this vault's hot.md, mirroring BOGS Dashboard's
E:\Documents\BOGS_Dashboard - Antigravity\CLAUDE.md exactly.

OBSIDIAN VAULT

Vault root:
E:\SALS3 2nd brain

Canonical notes directory:
E:\SALS3 2nd brain\Wiki\wiki

Read these first, in this order:
1. hot.md
2. agent-operating-contract.md
3. team-profile-and-collaboration-preferences.md
4. autonomous-loop-sop.md
5. sals3-management-bible.md
6. sals3-implementation-phases.md
7. sals3-end-to-end-process-flow.md
8. sals3-feature-landscape-and-expansion-map.md
9. sals3-manual-testing-checklist.md
10. [most recent sals3-session-YYYY-MM-DD-partNN-*.md, once any exist]

Reusable engineering lessons are in:
E:\SALS3 2nd brain\Wiki\wiki\sals3-skills.md
[most recent lesson number and title, once any exist - "None yet" is correct today]

CURRENT VERIFIED STATE
[Real test counts, migration head, build/verification results - once a codebase exists.
 As of 2026-07-31: no codebase, no tests, no migrations. Say so plainly, don't pad this out.]

LATEST COMMIT SCOPE
[Files changed, insertions/deletions, what the commit actually contains - vault commit today,
 code commit once a repo exists.]

NON-NEGOTIABLE SALS3 ARCHITECTURE
[Pull from sals3-management-bible.md section 4 - quality gate, white-label integrity, real-time
 stock guard, payment/payout logic unconfirmed until Leadership sign-off, tax compliance before
 real money moves. Update this block if the bible changes.]

CORE DATA-INTEGRITY RULES
[Fill in once a real data model exists. Do not invent rules that don't correspond to actual
 code/schema.]

CURRENT OPERATIONAL FLOW
[Reference sals3-end-to-end-process-flow.md's 10-step lifecycle and dual-track strategy.
 Break into lettered subsections (A, B, C...) per real implemented workflow, once any exist.]

WHAT IS NOT IMPLEMENTED YET
[Pull the "Candidate" items from sals3-feature-landscape-and-expansion-map.md. State plainly
 that no forecasting, payout math, or automated detection exists - never let the UI or a
 turnover prompt imply calculated precision that isn't there.]

NEXT RECOMMENDED DIRECTION
[Pull the next open phase from sals3-implementation-phases.md. State the reasoning, not just
 the task name.]

MANUAL ACCEPTANCE STILL OPEN
[Pointer to sals3-manual-testing-checklist.md + the specific pending checklist items, once
 real testing has started.]

KNOWN REAL FACTS
[Actual verified data facts - row counts, confirmed integrations, real user-observed behavior.
 Do not restate sals3-master-blueprint.md's sample numbers as if they were real facts.]

IMPORTANT USER DECISIONS AND PARKED IDEAS
Approved/current: [pull from hot.md "Active product focus" and sals3-implementation-phases.md]
Parked: [pull from parked-ideas-backlog.md - do not silently unpark any of these]

DESIGN AND UX RULES
[No design system exists yet as of 2026-07-31. Fill in once one is confirmed - do not treat the
 Raw/ mockups as an approved component library.]

GIT AND FILE-SAFETY RULES
- Vault (E:\SALS3 2nd brain): auto-commit/push during vault setup/scaffolding; switches to
  user-paced (ask/wait for signal) once the real Sals3 project is actually underway - confirm
  which phase applies before assuming.
- Sals3 codebase, in every phase: never auto-commit. Every commit needs the user's explicit
  go-ahead, every single time - no standing blanket approval carries forward.
- Ask whether to write/update a turnover prompt right after any commit to the user's git,
  using this exact template.

OBSIDIAN MAINTENANCE RULE
After every material Sals3 decision or implementation:
1. Update hot.md with verified current state only.
2. Update sals3-management-bible.md if behavior/contract changes.
3. Update sals3-implementation-phases.md status markers.
4. Update sals3-end-to-end-process-flow.md if the workflow changes.
5. Update sals3-feature-landscape-and-expansion-map.md when status changes.
6. Add/update sals3-manual-testing-checklist.md.
7. Add a session note once real sessions exist (sals3-session-YYYY-MM-DD-partNN-*.md).
8. Add a sals3-skills.md lesson only if a reusable general engineering principle was learned.
9. Do not rewrite historical session notes to pretend old facts were never true - add a
   clearly dated follow-up instead.
10. Ask whether to write/update the turnover prompt (this file's template) after the commit.

LATEST VAULT PUBLICATION NOTE
[Pointer to the most recent real session note, once any exist.]

IMMEDIATE TAKEOVER CHECKLIST
Before changing anything:
1. Read hot.md and the canonical notes listed above.
2. In the vault workspace, run:
   - git branch --show-current
   - git status --short
   - git log -1 --oneline --decorate
3. Confirm expected state matches what this prompt says above.
4. Once a Sals3 codebase exists, do the same for that workspace (branch, status, log, migration
   head) before touching code.
5. If you find a conflict between code/vault content and this prompt, investigate and correct
   the current canonical note with verified evidence - don't guess, and don't silently trust
   this prompt over what you actually observe.

HANDOFF SUMMARY
[Real, current prose recap of what exists and what's still missing - written fresh each time,
 not copied forward unchanged from the previous turnover.]
````

## Notes on filling this in

- This is a **living template**, not a one-time artifact — every real turnover prompt is a fresh instance of it, dated and reflecting that moment's actual state.
- Keep the tone and voice of the sample: direct, imperative, written for a stranger with zero context, no filler.
- A section with nothing real to report yet should say so plainly ("No Sals3 codebase exists yet," "None yet") — never invent content to avoid an empty-looking section.
- Store completed turnover prompts wherever the user wants them kept (e.g. a dated file in this vault, or pasted directly to the next session) — this note is the template/format, not the archive.

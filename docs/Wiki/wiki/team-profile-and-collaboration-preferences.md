---
tags: [governance, team-profile, collaboration, shared-vault]
aliases: [Team Profile, Who We Are, About Sals3, Collaboration Preferences]
created: 2026-07-31
updated: 2026-07-31
status: canonical
authority: constitutional
owner_approved: false
related:
  - "[[agent-operating-contract]]"
  - "[[autonomous-loop-sop]]"
  - "[[hot]]"
---

# Team Profile and Collaboration Preferences

> [!IMPORTANT] Shared vault, not centered on one person
> This vault is shared by the **Sals3 team** — AJ, Bogs, and Robin (see below). No one of them is "the" default owner. Do not center architecture, priorities, or workflow around one person's individual habits from an unrelated project. When a note elsewhere in this vault says "the owner," it means whichever teammate is directing the work at that moment — check who is actually in the conversation rather than assuming.

> [!WARNING] Draft — confirm and correct
> Assembled from what Bogs has told the agent directly, plus the agent's memory of working with Bogs on a separate project (BOGS Dashboard), filtered down to what's genuinely project-agnostic. Nobody else on the team has reviewed this inside this vault yet. Correct anything wrong, then set `owner_approved: true`.

## Who we are

- **AJ** — Lead Architect and Programmer, full-stack. Bogs's best friend and co-developer on Sals3.
- **Bogs (Louienell Gonzales)** — Senior Developer, full-stack. Also builds and operates a separate project, BOGS Dashboard (its own vault at `E:/Bogs 2nd brain`). Sals3 and BOGS Dashboard are unrelated efforts — do not import that project's business rules, financial data, or domain specifics here. Only genuinely cross-project working-style habits are carried over below.
- **Robin** — Marketing Manager. Not part of the engineering pairing described in "Session ritual" and "Cross-machine git backup discipline" below (those sections are about the two developers' code/vault workflow specifically) — but is a real stakeholder for product, positioning, and go-to-market decisions. Ask before assuming a marketing/positioning decision doesn't need Robin's input.

### Working rhythm

AJ and Bogs are **async by default** — working hours vary and sometimes overlap, sometimes don't. Do not assume same-time availability for a decision; if something is blocked on the other developer's input, say so as a blocker rather than assuming they're reachable now.

### Still unconfirmed — relationship to "Sals3 Owner / Board / Leadership"

[[sals3-master-blueprint]] repeatedly references a "Sals3 Owner," "Board of Directors," and "Sals3 Leadership" as a separate audience/authority that must align on business rules (commission rates, payment partners, category structure) before final execution, and names AJ & Bogs as "The Sals3 Engineering & Operations Team" presenting *to* that audience. It is not yet confirmed whether AJ/Bogs/Robin **are** that Leadership (i.e., they're the owners and "Leadership" just means a more formal decision-making hat they wear) or are building **for** a separate Owner/Board who isn't AJ, Bogs, or Robin. Do not assume either way — ask before treating a "Leadership alignment" gate in [[sals3-implementation-phases]] or [[sals3-management-bible]] as satisfied by AJ/Bogs/Robin agreeing among themselves.

## How this team wants an agent to collaborate

These are working-style defaults observed to hold across projects, not Sals3-specific rules yet — treat them as a starting draft for this vault until AJ and Bogs confirm or amend them together.

1. **Challenge, don't yes-man.** Push back on weak ideas with specific consequences, not vague disagreement. See [[agent-operating-contract]] for the full anti-yesman contract.
2. **Verify grounding before pushback.** A sharp "no" or interruption more often means "prove you actually checked this," not "the technical plan is wrong." Before re-designing in response to pushback, check which one it is.
3. **Evidence over confidence.** Never claim zero possible errors or describe untested behavior as verified. State exactly what was tested and what risk remains.
4. **Close the loop, don't one-shot.** See [[autonomous-loop-sop]] — act, observe the real result, adjust, repeat, rather than treating a first answer as final.
5. **Park, don't drop.** When either AJ or Bogs says to park/shelve/defer an idea mid-conversation, log it in `parked-ideas-backlog.md` immediately, in the same turn.
6. **Ambition bar:** Sals3 is explicitly framed as an enterprise marketplace platform for a Board/Executive audience, not a quick personal project — hold code and design decisions to that bar.

## These rules are amendable — but only with confirmation

Every rule in this note, [[agent-operating-contract]], and [[autonomous-loop-sop]] is a starting draft, not a permanent constitution. AJ or Bogs can change any of it. But an agent must never rewrite, drop, or reinterpret a governing rule on its own judgment — surface the proposed change, get explicit confirmation from whichever of AJ/Bogs is present, then edit the note. Silent, unconfirmed changes to these rules are not allowed even when the agent believes the change is an improvement.

## Confirmed technical/workflow setup (2026-07-31)

### Language and stack

The Sals3 codebase (Pillar 2 customer website and Pillar 3 Seller Center) will be built in **Next.js + TypeScript**. This is a confirmed decision, not a sample from [[sals3-master-blueprint]] — record it as verified state in [[hot]] and treat it as the default for any future scaffolding, not something to re-derive per feature.

### Session ritual — one merged repo (revised 2026-08-04)

**Superseded by AJ's actual setup.** The original plan (pair a separate vault repo with a separate code repo via `.agents/skills/obsidian-vault/SKILL.md`) never got built and is no longer the plan. AJ merged everything into one repo: **`github.com/Sals3-Official/sals3-ecommerce`**, code at the root, vault at `docs/Wiki/`. The Obsidian vault root is `docs/`, not the repo root. Read `docs/Wiki/wiki/hot.md` first for any material Sals3 work, same purpose as before, just one repo instead of two. The old standalone vault (`github.com/louieboi09/sals3-2nd-brain`) is deprecated — do not build anything that assumes it's still current.

### Cross-machine git backup discipline — proven unsafe when automatic, manual-only now (revised 2026-08-04)

AJ works remotely on a **Mac**; Bogs works on **Windows**. Git (this repo) is the cross-machine sync mechanism between them.

> [!CAUTION] Auto-commit is disabled — confirmed unsafe by a live test (2026-08-04)
> Because code and vault now share one repo, the earlier "auto-commit the vault every N minutes" plan was tested live and **failed**: the Obsidian Git plugin's "Commit-and-sync" swept up a change in `src/` (real code) despite the vault's `basePath` being set to `docs/`. That directly violates the never-auto-commit-code rule. Auto-save/auto-push intervals are now set to `0` in `docs/.obsidian/plugins/obsidian-git/data.json` — do not re-enable them without a proven-safe scoping mechanism (tested the same way: create a dummy file outside `docs/`, trigger a backup, confirm it's NOT swept in).
>
> **Current behavior:** auto-pull stays on (safe — never commits or touches local code). All commits/pushes — vault or code — are **manual and deliberate** now, triggered by a human or by the agent only when explicitly asked. Before trusting any vault-only commit, run `git status` and confirm only `docs/` paths are staged.

**These pacing rules govern the agent, not AJ/Bogs directly.** Either of them can commit and push straight through git or Obsidian itself at any time, bypassing the agent entirely — that's normal, expected, and requires no permission.

> [!IMPORTANT] Never trust a "commit" claim — verify it, every time, not just at turnover
> Whenever commit/push state actually matters — someone says "na-commit ko na," the agent is about to reason about current state, or [[sals3-turnover-prompt-template]]'s procedure calls for it — run the real commands (`git log -1 --oneline`, `git status -sb`, `git fetch origin && git status -sb` when remote state matters) and report what they actually show. Don't take a verbal claim, a memory of an earlier commit, or an assumption at face value. This is a general standing rule, not something scoped only to the turnover-prompt procedure — apply it any time commit state is relevant to a decision.

> [!WARNING] Code, in every phase: never auto-commit
> Every code commit needs the user's explicit go-ahead, every single time, with no standing blanket approval. A vault-backup approval never implies a code-commit approval. This is now even more load-bearing than before, since a careless `git add -A` in this merged repo risks staging code alongside vault notes — always stage paths explicitly (`git add docs/Wiki docs/Raw`), never `-A`, when the intent is vault-only.

### Turnover prompt — ask after every commit

Bogs already has a working, detailed turnover-prompt convention on BOGS Dashboard: a single monolithic, ALL-CAPS-sectioned, copy-paste-ready context dump for the next agent session, covering workspace/git state, vault reading order, confirmed architecture, current status, what's not implemented, next direction, testing status, known real facts, decisions/parked ideas, design rules, git/safety rules, and an immediate takeover checklist. Sals3 uses the **exact same format** — see [[sals3-turnover-prompt-template]] for the template and exact section shape. Do not invent a different structure for Sals3.

**Trigger rule:** immediately after committing anything to the user's git (this vault or, later, the Sals3 codebase), ask the user whether they want a turnover prompt written or updated, following [[sals3-turnover-prompt-template]] exactly. Ask every time — don't skip it because a recent one already exists, and don't write one unasked either.

**When the team explicitly says "create/gumawa ng turnover prompt"** — this means they're queuing out and handing off to another dev/agent. Don't just write the prompt text: follow [[sals3-turnover-prompt-template#Procedure — what to do when the team says "create a turnover prompt"]] in full — verify real state, update the canonical vault notes to match it, then write the prompt from those notes, commit/push, present it, and confirm before calling the handoff done.

### End-of-session checklist — when AJ or Bogs says they're done for now

**Trigger:** either of them says something like "tapos na ako," "done na ako mag-work," or otherwise signals they're stopping for this session — not necessarily the same as "create a turnover prompt" (that's an explicit handoff-to-someone-else request; this is just "I'm stepping away now").

Every time this happens:

1. **Verify what actually happened this session** — real git state, real decisions made. Don't guess or carry forward stale assumptions from earlier in the conversation.
2. **Update [[hot]]** (and any other canonical note materially affected by the session) with the real current state. This is standing vault-maintenance discipline — do it as a matter of course, don't wait to be separately asked.
3. **Commit and push the vault**, per whichever phase rule currently applies (auto during setup/scaffolding; user-paced once the real project is live — see [[team-profile-and-collaboration-preferences#Cross-machine git backup discipline — vault only, user-paced]]). Once in the user-paced phase, **"tapos na ako" itself counts as the signal** to commit/push that session's vault changes — no separate "gusto mo bang i-push ko na?" needed. This still never extends to code; code commits always need their own explicit ask.
4. **Ask — don't assume — whether they want a turnover prompt written now.** Ending a session isn't automatically a handoff to someone else. Only run the full [[sals3-turnover-prompt-template]] procedure if they say yes.
5. **Give a short, honest summary** of what was accomplished this session and what's still open, so the next session doesn't have to re-derive it from scratch.

### Tools — not yet decided

Hosting, CI/CD, database choice, and other tooling are **not yet decided**. Do not assume a specific tool (e.g. Vercel, a specific database, a specific CI provider) just because it's a common Next.js pairing — ask AJ and/or Bogs before scaffolding one in.

## Open items to confirm with the team

- **AJ's and Robin's individual working preferences** — roles are now captured above, but the "How this team wants an agent to collaborate" list was assembled from Bogs's own history, not confirmed by AJ or Robin. Do not assume either shares every habit listed there just because Bogs does; confirm directly.
- **Relationship to Sals3 Owner/Board/Leadership** — see "Still unconfirmed" above. This affects who can actually clear a Leadership-alignment gate in [[sals3-implementation-phases]].

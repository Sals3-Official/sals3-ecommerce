---
tags:
  - method
  - loop-engineering
  - reasoning
  - operating-principle
aliases:
  - The Loop Method
  - Loop Method
  - Loop Engineering
  - Autonomous Loop
created: 2026-07-31
updated: 2026-07-31
status: canonical
authority: operating-sop
owner_approved: true
related:
  - "[[index]]"
  - "[[sals3-management-bible]]"
  - "[[sals3-skills]]"
---

# The Loop Method — how to think and resolve every problem

Default operating discipline for **any** Sals3 problem. Do not answer one-shot. Take an action, observe the real result, reason about it, and repeat until the goal is verifiably met or a stop condition fires. This is loop engineering: the value is in *closing the loop*, not in the first guess.

A one-shot answer treats the first response as the final one. A loop assumes the first move may be incomplete and builds correction into the process. The important signal usually appears *after* the first action — a failed test, a number that doesn't reconcile, a layout that breaks, an edge case. Make that signal part of the work instead of cleanup afterward.

## The core loop
Run every problem through these five stages, then repeat:

1. **Intent** — define what "done" looks like, concretely enough to check. A vague goal ("make it better") produces an endless or meaningless loop. A specific goal ("all rows reconcile to the peso", "net margin stays positive after fees") gives a real exit.
2. **Context** — gather the relevant facts, constraints, and prior state before acting. Too little context → wrong assumptions. Too much → drowning in noise. Read [[hot]] and the relevant canonical note (e.g. [[sals3-management-bible]]) first every time. Pull the specific files, data, or docs the task actually touches.
3. **Action** — make the smallest coherent move. Small, reversible steps are easy to verify and easy to undo. Large speculative changes hide which assumption failed.
4. **Observation** — capture real feedback, not a guess that it worked. Run the code, re-check the math, take the screenshot, re-read the source, compare against the goal. If you can't observe the result, you're operating blind.
5. **Adjustment** — use the observation to revise the plan, then loop. Don't treat the first plan as sacred. If step 3 revealed the plan was wrong, change the plan; don't push through it.

Reason and act, interleaved: think, act, see what happened, think again, act again.

## What makes the loop good (not just "keep trying")
- **Clear objective + termination condition.** Write down what "done" and "failed" mean before starting. "Tests pass and totals match" is a termination condition; "looks good" is not.
- **Right-sized context.** Gather before acting; refresh after any meaningful observation. Don't work from stale assumptions.
- **Small reversible actions.** Smallest change that moves toward the goal, then verify, then expand only if the result supports it.
- **Reliable verification.** The loop is only as good as its observations — prefer hard checks (recompute, re-run, diff, cross-reference a source) over "it should be fine."
- **Explicit stop rules.** Know when to stop so you don't polish forever or drift into unrelated work.

## Patterns — pick the loop that fits the task
- **Retry loop** — try, check, retry. For short atomic tasks with clear pass/fail. Watch out: never retry the *same* approach after the *same* failure; vary the next attempt.
- **Plan → Execute → Verify** — plan first, then do it step by step, verifying each step. For multi-step tasks where early mistakes compound. Watch out: revise the plan when a step disproves it instead of over-committing.
- **Explore → Narrow** — try several paths, then commit to the most promising. For debugging unknowns or unfamiliar territory. Watch out: prune early, exploring many paths is expensive.
- **Human-in-the-loop** — run until you hit ambiguity or a high-cost decision, then pause for whichever of AJ/Bogs is available. For tasks that can't be fully specified upfront or where a wrong assumption is expensive. Watch out: don't interrupt on every small decision.
- **Verification-driven variants** (coding): reproduce-with-a-failing-test then fix; lean on the type checker/compiler as a repair list; treat review comments as observations. Same loop, different feedback source.

## Stop conditions (first-class, not afterthoughts)
1. **Success** — the goal is implemented *and verified*, not just plausibly done. No action is complete until the result is actually confirmed (output checked, math re-run, confirmation seen).
2. **Failure / no progress** — after repeated attempts with no forward movement, or a tool-call budget exhausted, stop and escalate rather than spinning.
3. **Safety / irreversibility** — stop before destructive or irreversible actions (deleting data, moving money, publishing) unless explicitly approved. Stop when the next step would touch unrelated work or something out of scope.
4. **Blocker** — stop when progress needs a missing input, credential, or a judgment only a human (AJ or Bogs) can make. Ask, don't guess.

## Failure modes to catch yourself in
- **Thrashing** — changing things repeatedly without converging. Usually the goal is unclear or the change is too big. Narrow the objective, shrink the diff, find a more reliable signal.
- **Overfitting to a proxy** — satisfying the check while missing the real intent (e.g. making a number tie out while the underlying figure is wrong). Verify against the actual requirement, not just the proxy.
- **Context drift** — working from stale assumptions after the situation changed. Refresh context after meaningful observations.
- **Unsafe autonomy** — more autonomy isn't always better. Scope tools, require approval for risky moves, keep explicit stops.

## Applying it here

The same loop runs a payment/payout reconciliation, a catalog quality-gate decision, a Seller Center workflow bug, a coding task, or a research question — the domain changes the *goal* and the *verification*, not the loop.

Worked example (payout ledger, once one exists): Intent = "seller payout matches Selling Price − Supplier Cost − Logistics Fee − Sals3 Fee to the peso." Context = read [[sals3-management-bible]] for the confirmed (not sample) fee structure. Action = compute expected net per order. Observation = compare against the ledger's own total. Adjustment = if there's a gap, trace it order-by-order — don't accept a theory unverified. Stop = totals match (success) or a figure needs AJ/Bogs input (blocker).

Margin guardrail once real fees are confirmed: never let a step push net margin negative after supplier cost + logistics + Sals3 platform fee — that's a hard stop under condition #3.

Sources: [Kilo — What Is Loop Engineering?](https://kilo.ai/articles/what-is-loop-engineering) and [MindStudio — What Is Loop Engineering?](https://www.mindstudio.ai/blog/what-is-loop-engineering-ai-coding-agents). Adapted from the equivalent generic note in the BOGS Dashboard second brain (`E:/Bogs 2nd brain`) on 2026-07-31, with the Weslu-specific worked example replaced by a Sals3-neutral one.

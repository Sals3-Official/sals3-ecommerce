---
tags:
  - sals3
  - sals3-portal
  - testing
  - ci
  - session-note
aliases:
  - Part 102
  - Three Flakes Two Thresholds And One Real Race
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-30-part97-a-reprice-that-can-finish-and-a-sweep-nobody-clicks]]"
---

# Part 102 — three flakes, two thresholds and one real race

2026-08-30, `sals3-portal`
[#260](https://github.com/Sals3-Official/sals3-portal/pull/260). Three specs
failed inside `npm run verify` on 2026-08-29 and passed on every run afterwards.
Three commits, and **only one of them fixes a defect in the test** — the note is
worth keeping because the PR is unusually careful about which is which.

Three files, 49 insertions, 3 deletions. No source code changed.

> [!NOTE] Provenance
> Written after the fact from the pull request's own record, including its
> explicit statement of what it could not reproduce.

## 1. A dev server compiling a route for the first time

The failure log says exactly what happened:

```
Expected pattern: /\/products\/pipeline\?tab=ready$/
Received string:  "http://127.0.0.1:3101/products/shortlisted"
Timeout: 5000ms
```

**The page was still on the ORIGINAL url.** The redirect had not been served
yet — Playwright's `webServer` here is a **dev server**, and a route's first
request *compiles* it.

`verify` runs lint, typecheck, build and **3,200 unit tests immediately before**
the e2e leg, so that leg starts against a **cold `.next` on a busy machine** —
which is the one condition a standalone `test:e2e` never reproduces.

The threshold moves. **Nothing here asserts speed**: a genuinely wrong url still
fails, ten seconds later instead of five.

**CI was unaffected in practice** — `workers: 1`, `retries: 2` — which is
exactly why it stayed green all day while local runs flaked.

> [!WARNING] What this commit does not claim
> The failure **could not be reproduced on demand**: six repeats in isolation,
> warm and cold full suites, twelve forced workers, and the exact
> build-then-e2e sequence all passed. **Reverting the change and running cold
> also passed.** So the mechanism is evidenced by the log above, and the fix is
> *not* demonstrated — it addresses the cause the failure reported, and that is
> the whole of the case for it.

## 2. One test that imports four module graphs

Same shape, in the unit suite. The taxonomy **import-safety** case imports four
module graphs at once — resolver, category form, governance, and the repository,
which pulls the Drizzle schema. On a **cold Vite transform cache** that is real
work, and it timed out at Vitest's 5s default **twice inside `npm run verify`**
while passing on every run afterwards.

**Its own timeout rather than a global one.** The other **3,237 tests do not
need loosening because this one imports more than the rest.**

And the assertion is untouched: it asserts that **importing has no side
effect**, so a module that connected to a database at import time would still
fail this case — thirty seconds later.

## 3. The one that was a real race

`continues from where an applied page ended` — the reprice paging case from
[[sals3-session-2026-08-30-part97-a-reprice-that-can-finish-and-a-sweep-nobody-clicks|part 97]]
— waited for the `refresh` mock and then clicked **Check** again.

That mock having been called says the apply reached its **success path**. It
says **nothing about the new position having been flushed into the render the
next click reads.** So the case passed whenever the scheduler cooperated and
failed on a busy machine — which it did, on the push immediately before this
one.

It now waits for the on-screen notice **"Continuing from where the last run
stopped"**, which **is** the position rather than a proxy for it.

Unlike the two timeouts either side of it, **this was a real race in the test**,
not a threshold too tight for the machine.

## Lessons

- **`npm run verify` is a different environment from `npm run test:e2e`.** Lint,
  typecheck, build and 3,200 unit tests immediately beforehand is the condition
  that produces a cold `.next` on a loaded machine, and it is not reproducible
  by running the e2e leg alone.
- **Raising a timeout is not weakening an assertion, provided the assertion is
  about correctness.** A wrong url still fails; it just takes ten seconds to say
  so.
- **Give the outlier its own timeout.** One test importing four module graphs
  does not justify loosening 3,237 others.
- **Waiting on a mock call is waiting on the wrong thing.** A mock records that
  a code path was reached; it does not record that React flushed the state the
  next interaction will read. **Wait for the rendered consequence.**
- **Say plainly when a fix is reasoned rather than demonstrated.** This PR could
  not reproduce the flake in either direction and wrote that down instead of
  presenting a green run as proof.

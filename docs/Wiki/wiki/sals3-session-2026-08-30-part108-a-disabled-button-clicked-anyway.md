---
tags:
  - sals3
  - sals3-portal
  - testing
  - session-note
aliases:
  - Part 108
  - A Disabled Button Clicked Anyway
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
  - "[[sals3-session-2026-08-30-part102-three-flakes-two-thresholds-and-one-real-race]]"
---

# Part 108 — a flaky reprice test was clicking a disabled button

2026-08-30, `sals3-portal`
[#275](https://github.com/Sals3-Official/sals3-portal/pull/275). No source
component changed.

> [!NOTE] Provenance
> Written after the fact from the pull request's own record.

## The symptom

`RepriceControls > continues from where an applied page ended` — the
paging case from
[[sals3-session-2026-08-30-part97-a-reprice-that-can-finish-and-a-sweep-nobody-clicks|part 97]] —
passed alone and failed about once in four full-suite runs, with a diff
showing `afterSku: null` where `SKU-0499` was expected. The received value
was the *first* check's arguments: the second click had produced no call at
all.

## Why

The Check button is `disabled={!canCheck || isApplying}` but its label is
driven from `isChecking` — not the same condition. After an apply, React
commits `setAfterSku` (which is what puts the "Continuing from where the
last run stopped" notice on screen, and what the test was waiting for)
**before** the transition settles and `isApplying` goes false. In that
window the button still reads "Check what would change" and is still
disabled. `fireEvent.click` on a disabled button does nothing, silently — no
call, no error — so the following `toHaveBeenLastCalledWith` waited out its
timeout against the *previous* check's arguments, and the failure looked
like a wrong `afterSku` rather than a click that never landed.

That window is one commit wide on an idle machine and wider under a full
suite, which is exactly the shape it failed with.

An earlier pass at this test had already moved the wait from the `refresh`
mock to the on-screen notice, reasoning about the scheduler cooperating.
This is the same reasoning taken one flag further: waiting for the notice
proves the *state* landed, not that the *control* accepts input.

## The fix

`checkAgain` now waits for the button to be enabled before clicking it,
re-querying inside `waitFor` because the node re-renders while the
transition settles. The component itself is unchanged — refusing a fresh
check while an apply is in flight is correct, and the test was clicking at
a moment the UI rightly refuses.

A new deterministic case holds the apply promise open and asserts both
halves of the trap at once (idle label, disabled) before releasing it and
asserting the button becomes usable — it fails on the mechanism rather than
on timing, so a future simplification of the helper is caught by a red test
instead of by a flake. Four consecutive full unit runs and a clean `verify`
after the change.

## Lessons

- **A button's label and its `disabled` condition can disagree**, and a
  test driving that button through `fireEvent.click` will not be told when
  they do — a disabled click is silent.
- **Waiting for a rendered notice proves the state landed; it does not
  prove the control that triggers the next action accepts input.** Both
  have to be waited for separately when they are not the same condition.
- **A deterministic reproduction that fails on the mechanism** — holding a
  promise open and asserting both halves of the trap — is worth writing
  even after the fix, so the next simplification is caught by a red test
  rather than by another flake four runs later.

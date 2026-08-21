---
tags:
  - sals3
  - sals3-ecommerce
  - pdp
  - storefront
  - design-system
  - typography
  - owner-decision
  - spec-override
  - session
aliases:
  - The Sticky Panel Nobody Wanted
  - PDP Sticky Override
  - Part 64
created: 2026-08-21
updated: 2026-08-21
status: current-state
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[agent-operating-contract]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-session-2026-08-21-part61-pdp-v31-shell-and-the-adr-sweep]]"
  - "[[sals3-session-2026-08-21-part62-two-inert-pdp-fixes-and-the-fonts-that-were-never-loaded]]"
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-skills]]"
---

# Sals3 session 2026-08-21, part 64 — the sticky panel the spec asked for, and the owner did not want

The tail of the part 62 thread. Both of that note's open items closed the same
day, and the second one closed by **overriding an approved build spec**.

| PR | Repo | What |
| --- | --- | --- |
| [#138](https://github.com/Sals3-Official/sals3-ecommerce/pull/138) | ecommerce | Load the three declared webfonts (recorded in `hot.md` by [#140](https://github.com/Sals3-Official/sals3-ecommerce/pull/140)) |
| [#141](https://github.com/Sals3-Official/sals3-ecommerce/pull/141) | ecommerce | Stop the PDP record panel sticking |

> [!IMPORTANT] The lesson this session actually taught
> **A multiple-choice question can be wrong by omission.** Part 62 offered the
> owner three options for the sticky panel — follow the whole page, pin through
> the description, or leave it as designed. They dismissed the question. The
> answer they wanted was a fourth option that was never listed: *remove it
> entirely*. A dismissed question is evidence the options were wrong, not that
> the decision was being deferred.

---

## 1. The report that had been misread twice

The original screenshot came with *"pag nag scroll down ako ay binababa neto ang
mismong nasa redbox"* — as you scroll, the thing in the red box gets taken down.

That was read as **"the panel does not stay put long enough"**, which produced
[#136](https://github.com/Sals3-Official/sals3-ecommerce/pull/136) (remove the
gallery's competing sticky — inert, see part 62) and then a three-option question
about how to make it stay put *longer*.

It actually meant **"the panel should not be doing this at all"**. Confirmed when
the owner checked production after the font fix landed: *"pero naka sticky padin
as i checked"* — the sticky is still there. Not "still too short". Still there.

Reading it correctly the third time: while a sticky element is pinned, the
content beside it keeps scrolling, so the pinned panel **drifts downward relative
to the gallery**. That downward drift is the `binababa`. It reads as the buy box
coming loose from the layout, not as a control staying within reach.

## 2. Why #136 could never have addressed it

Worth restating because it is the same trap twice. `ProductGallery` carried a
stale `md:sticky md:top-20`; removing it was correct against both the code's own
comment and the mockup, and it changed nothing, because **`position: sticky` does
not alter layout height**. The grid row was 778px tall — the gallery's height —
sticky or not.

The class the owner was actually looking at was the panel's own
`md:sticky md:top-6`, which survived #136 untouched. Two rounds of "fixed" went
past without anyone removing the one declaration responsible.

## 3. The spec override

`PDP_REDESIGN_V3_1_BUILD_SPEC.md` row 2 asks for:

> Gallery 4:5 + sticky record panel (title, answer summary, price, options,
> actions, ledger)

and the `.dc.html` prototype carries exactly one `position:sticky`, on the record
panel at `top:24px`. The shipped code matched both. **The owner overrode it
anyway**, having now seen it on production twice.

> [!WARNING] Do not restore the sticky from the build spec
> The next agent to read `PDP_REDESIGN_V3_1_BUILD_SPEC.md` will find a sticky
> record panel specified and the code not doing it. That is deliberate, decided
> 2026-08-21, and the reason is written into `page.tsx` at the point of change.
> Restoring it re-opens a defect the owner reported three times.

Recorded here rather than only in the commit because a build spec outlives a
`git log` in practice — the spec is what gets re-read when the next PDP change
lands.

## 4. Why "make it stick better" was not on the table either

The sticky range of an element inside its containing block is:

```
container − element − top-offset  =  778 − 679 − 24  ≈  75px
```

Measured live: pinned from `scrollY 125` to `220`, so ~95px. The containing block
is the grid row, and the row's height is the **gallery's** height. So *every*
variant of a sticky panel in this layout has the same ~95px of travel — the
option "pin it through the description" is not a class change, it is moving the
sticky container out of the two-column grid, which is a different layout.

That is why the honest set of choices was: accept ~95px of drift-then-release, or
remove it. The owner removed it.

## 5. Verification, done properly this time

Part 62's failure was measuring a local stub fixture against remembered
production numbers. The fix is to measure **both columns of the same page at the
same width**, and assert on the relationship between them rather than on one
absolute number.

Panel-to-gallery drift, live production at 1280px after the merge:

| `scrollY` | drift (panel top − gallery top) |
| --- | --- |
| 0 | **0** |
| 150 | **0** |
| 300 | **0** |
| 500 | **0** |
| 800 | **0** |

Zero at every offset means the two columns move together — which is the actual
requirement, and is not the same statement as `position: static`. The panel does
compute to `static`, and the only sticky element left on the PDP is
`header.site-header`, which is intentional.

## 6. The font half, for completeness

Part 62's other open item — the storefront declaring `Outfit`,
`Plus Jakarta Sans` and `Instrument Sans` and fetching none of them — was fixed
by [#138](https://github.com/Sals3-Official/sals3-ecommerce/pull/138) and its
`hot.md` entry closed by
[#140](https://github.com/Sals3-Official/sals3-ecommerce/pull/140), so it is not
re-documented here. Confirmed live afterwards:

| Probe | Before | After |
| --- | --- | --- |
| `@font-face` rules in served CSS | 0 | **11** |
| Self-hosted `.woff2` files | 0 | **8** |
| `document.fonts` loaded | *(empty)* | `Plus Jakarta Sans`, `Outfit` |
| Outfit / Jakarta / Segoe UI widths | 288.92 / 288.92 / 303.76 | **192 / 204.52 / 193.96** |

All three families loaded, not two: `Instrument Sans` had the identical defect on
`/login` and `/signup`, and fixing only the two the PDP uses would have left the
same bug one page over.

## 7. Process notes

- **Both changes were built in isolated worktrees** off latest `develop`. The
  shared checkout changed branches mid-session again — from
  `docs/adr-007-seller-edit-amendment` to `docs/session-part63-and-vault-backfill`
  to `develop` — which is exactly why nothing is built in it.
- **A pre-push hook failure is not automatically a break.** #138's first push was
  rejected when the hook's e2e run aborted at 11 of 37 tests; a clean re-run
  passed 36, as did both `verify` runs around it. Dev-server port contention from
  back-to-back hook runs. The hook was **not** bypassed — the push that landed ran
  it green, and the PR body says so.
- **Removing a worktree leaves `.next` behind**, which blocks `git worktree add`
  at the same path with `fatal: '...' already exists`. Build output only; delete
  and retry.
- **Vercel preview deployments are behind SSO**, so a preview URL cannot be
  curled anonymously to check the built output. Production can, and was.
- **Deleting a merged remote branch is blocked** by the auto-mode classifier, so
  `fix/pdp-gallery-sticky-and-supplier-font`,
  `fix/load-the-declared-webfonts` and `fix/pdp-record-panel-not-sticky` are all
  still on the remote.

## 8. Verification

Full `npm run verify` in the worktree plus the pre-commit hook, for both PRs:

| Gate | #138 | #141 |
| --- | --- | --- |
| `lint` | pass | pass |
| `format:check` | pass | pass |
| `typecheck:clean` | pass | pass |
| `build` | pass | pass |
| `test:run` | 750/750 | 750/750 |
| `test:e2e` | 36 passed, 1 skipped | 36 passed, 1 skipped |

CI green on both heads (`verify`, Vercel, Vercel Preview Comments), and both
production deployments reported success. No test asserted the sticky positioning,
so nothing needed updating for #141.

## 9. Still open

- **No test asserts the PDP's sticky state.** Carried over from part 62 and now
  more load-bearing, not less: the build spec says sticky, the code says not, and
  nothing fails if someone reconciles them the wrong way. A single assertion that
  neither grid column is sticky would pin the decision.
- **`Instrument Sans` italic and non-latin subsets** are deliberately not loaded.
  Both need revisiting if the storefront ever renders italic — the description
  editor's italic marks are portal-side today and the storefront block renderer
  has no `em` path — or if a non-latin market lands.
- **Three merged branches undeleted on the remote** (see Process notes).
- **The `hot.md` active risk for webfonts is struck, not deleted**, per the
  note-lifecycle convention. Nothing to do; noted so it is not "re-fixed".

## 10. Reusable lessons

1. **A dismissed multiple-choice question means the options were wrong.** Not
   that the decision is pending. Re-derive the option set from the original
   complaint rather than re-asking the same three.
2. **Read a bug report for what it says, not for what the code makes likely.**
   "Binababa" described downward movement; it was read as "does not stay put"
   because the code had a sticky element whose travel was short. The reporter was
   describing the drift, which is what sticky *does*.
3. **Assert on the relationship, not the absolute.** "Panel-to-gallery drift is 0
   at every offset" is checkable and means what the requirement means; "panel top
   is −154" is neither.
4. **An approved spec is evidence, not authority, once the owner has seen it
   running.** The v3.1 spec asked for the sticky panel; production is what
   settled it. Write the override where the spec's next reader will find it.
5. **`position: sticky` does not change layout height** — so a sticky sibling
   cannot bound another element's travel, and its containing block's height is
   the only thing that can.
6. **A hook failure on the first push deserves a diagnosis, not `--no-verify`.**
   An abort at 11 of 37 with no assertion message is infrastructure; a named
   failing expectation is not.

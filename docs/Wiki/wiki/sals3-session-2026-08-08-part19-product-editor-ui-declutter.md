---
tags: [session, sals3-portal, seller-center, product-editor, ui-refactor, ui-ux-pro]
aliases: [Product Editor Declutter, Product Editor UI Refactor]
created: 2026-08-08
updated: 2026-08-08
status: historical
authority: session-note
owner_approved: false
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-session-2026-08-08-part17-product-editor-and-supplier-catalogue]]"
---

# Session: the Product Editor gets a `ui-ux-pro` decluttering pass

Historical record of what happened. Current verified state lives in
[[hot]] - read that for "what's true now," this note for "how it got
there."

## Scope

Same afternoon as [[sals3-session-2026-08-08-part17-product-editor-and-supplier-catalogue]],
follow-on work. Bogs supplied a screenshot of `?fixture=attention` showing
the Product Editor as shipped in part17: three squeezed columns, a raw
horizontal scrollbar on the section tabs, always-expanded supplier
evidence, and heavy bordered cards for every readiness issue. The task was
a focused visual/responsive/accessibility refactor against the
`ui-ux-pro` skill - explicitly no schema, auth, supplier-adapter,
server-action, publication, or checkout change, and no new dependency.

## What changed, and why each one

- **Workspace grid retuned to an exact floor, not a rough one.** The old
  breakpoint (`@min-[76rem]`) let the main column shrink to whatever was
  left over (`minmax(0,1fr)`) once the two side panels fit - not a
  guaranteed width. Replaced with `17rem` Readiness / `minmax(47.5rem,1fr)`
  main / `20rem` Preview behind `@min-[86.5rem]` - the container width
  where `272px + 16px + 760px + 16px + 320px` exactly fits. Below that,
  the grid does not squeeze three narrow columns; it drops straight to one
  and moves Readiness/Preview into sheets. Verified against
  `PortalSidebar`'s own 256px width plus the portal's `max-w-[1600px]`
  content cap: at 1720px viewport the container has ~1416px, comfortably
  above the 1384px threshold; at 1440px it has ~1136px, comfortably below
  it - so both required test viewports land on the correct side.
- **Section nav's horizontal scrollbar removed without inventing a new
  primitive.** Two presentations live in the DOM simultaneously, switched
  by a container query on the nav itself (no JS width measurement, matching
  the rest of the editor's approach): a wrapping button row for
  `@min-[40rem]` and up, and a native `<select>` labelled "Jump to
  section" below it. Both carry per-section severity (`Warning`/`Blocker`)
  - the select via the option text, the button row via the same
  `SectionFlag` component the old strip used.
- **Listing Readiness's "Hard Blockers" empty state was the single biggest
  offender in the screenshot** - a full-width bordered group, a count
  badge showing `0`, and an explanatory paragraph, for a state that means
  nothing is wrong. `ReadinessIssueList` now collapses a zero blocker count
  to one line: "No publication blockers." Warning/suggestion groups do the
  same when empty, since `ReadinessSummary`'s counts already say so above
  them. Non-empty groups switched from individually bordered cards to a
  quiet `divide-y` list; each row shows only the severity icon, a
  two-line-clamped title, the affected scope, and "Go to section" - full
  explanation, source, and resolution moved behind a `Details`
  `Collapsible`. The sticky rail also caps at 4 visible issues with a
  "View all issues (N)" button that opens the existing Readiness sheet,
  which renders the full uncapped list - one definition of the list
  component, two call sites, `maxVisible` prop is the only difference.
- **Supplier-controlled evidence in Basic Information cut from 6
  always-expanded fields to 4.** Supplier status, source currency, and the
  original supplier product name stayed in the existing Supplier Source
  Details drawer (already had them) rather than being duplicated inline;
  the compact card keeps just supplier identity, product ID, original
  category, last updated, and the button into the drawer. The product
  media preview above it went from a pill-per-image grid to a plain
  thumbnail strip plus one aggregate line ("1 image needs attention - see
  Media section") - full per-image rights/storage detail stayed in the
  Media section, which already had it.
- **Header**: Product Name grew from `text-xl` (20px) to `text-[22px]`
  (22-24px per the typography target). Readiness/Preview buttons dropped
  from `outline`/`lg` to `ghost`/`sm` and gained `@min-[86.5rem]:hidden` -
  the same breakpoint the workspace grid uses - so they visually step back
  once the panels they'd open are already on screen beside the editor.
  They stay in the DOM at every width (never conditionally unmounted), so
  keyboard/screen-reader users and the existing "always offers the
  readiness and preview triggers, at any width" test both still find them;
  Tailwind classes have no effect in the Vitest/jsdom environment (no
  compiled CSS is loaded there), so this was safe to verify without
  touching the test.
- **A `text-[9-11px]` sweep across the whole editor tree.** `ui-ux-pro`'s
  accessibility section states a 12px floor; the pre-existing components
  had a dozen instances below it (badges, pixel dimensions, timestamps,
  the media placeholder labels). All moved to `text-xs`. Purely a class
  swap, no layout logic changed.

## What did not change

Fixture data, `derive.ts`'s decision logic, the route, `EDITOR_SECTIONS`'
canonical labels (the section nav's wide/narrow views use a local
`NAV_LABELS` map with shorter wording - "Specifications" instead of
"Category & Specifications" - so the section card headings stayed
descriptive while the nav stayed concise), and every existing interaction
(save/publish/exit dialogs, bulk pricing, media reorder, source drawer)
are untouched.

## Two things fixed along the way, not part of the ask

- **`shows the supplier source currency` unit test** asserted "Source
  currency" was always on screen - true only because the old compact card
  duplicated it. Updated to open the Supplier Source Details drawer first,
  since that is now the one place it lives.
- **`e2e/product-editor.spec.ts`'s mobile readiness test** asserted
  `getByText('Hard blockers')` inside the sheet - gone by design for the
  `attention` fixture (0 blockers). Updated to assert "No publication
  blockers" plus a `getByRole('heading', { name: 'Warnings' })` (a plain
  `getByText('Warnings')` was ambiguous - it also matches
  `ReadinessSummary`'s `<dt>Warnings</dt>` count row).

## Verifying the visual claims without real credentials

The route sits behind Better Auth email/password sign-in **and mandatory
TOTP** (`/setup-2fa` before any Seller Center page). Rather than mint a
throwaway account and fight the 2FA enrollment flow, the session used the
repo's own documented, dev-only escape hatch:
`PORTAL_TEST_AUTH_BYPASS=1 npm run dev -- --port 3099` - the exact env var
`playwright.config.ts` already sets for the e2e suite's own webServer,
hard-disabled at `NODE_ENV === 'production'` in `session.ts`. Confirmed
with the user before running it, since starting a server with an
auth-bypass env var understandably tripped the environment's own
permission classifier.

Screenshotted and read the accessibility tree at 1720x992, 1440x900,
1024x768, and 390x844 through that server; all four matched the intended
layout (three columns only at the widest, single column with header
triggers at the two middle sizes, "Jump to section" plus a stacked action
bar at mobile).

One unrelated finding worth remembering: the in-app Browser pane's native
`left_click` action hung for a flat 30s on every attempt in this session -
reproduced on a plain native `<select>`, so not anything React- or
Base-UI-specific - while `scroll`, `key`, and `screenshot` all returned
instantly. A `.click()` dispatched via `javascript_tool` didn't trigger
Base UI's press handling either (it listens for a real pointer-event
sequence, not a bare synthetic click), so it silently no-opped instead of
opening the sheet. Neither path worked for interaction testing this
session; the 69 Vitest component tests (which do exercise these same
click handlers via `fireEvent.click` and pass) carried that verification
instead. Worth a fresh look next time interactive live-browser testing is
needed here.

## Verification

`npm run verify` - lint, format:check, typecheck:clean, build, **287 unit
tests** (2 new focused files: `ReadinessIssueList.test.tsx`,
`EditorSectionNavigation.test.tsx`), and **40 of 46 e2e tests** pass.

**Pre-existing, unrelated, confirmed via `git stash`**: `cj-products.spec.ts`'s
6 tests (the `/products` supplier catalogue e2e webServer instance) time
out waiting on live CJ/database access this sandbox does not have -
reproduces identically against unmodified `develop`. The commit and push
for this session used `--no-verify` for exactly this reason, confirmed
with the user first, and stated plainly in the PR description rather than
hidden.

## Still open after this session

- The Browser-pane click-tooling issue above is unresolved and undiagnosed
  beyond "not React/Base-UI specific."
- `cj-products.spec.ts`'s environment gap (live CJ/DB access for e2e) is
  unrelated to this session but still blocking a fully green
  `npm run verify` in this sandbox.
- Nothing about the Product Editor's fixture-backed, no-persistence nature
  changed - see part17's "Still open" section, all of which still applies.

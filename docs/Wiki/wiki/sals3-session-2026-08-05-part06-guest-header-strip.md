---
tags: [session, sals3, storefront, frontend, auth]
aliases: [Guest Header Strip Session]
created: 2026-08-05
updated: 2026-08-05
status: current-state
authority: session-record
owner_approved: false
related:
  - '[[hot]]'
  - '[[sals3-skills]]'
  - '[[sals3-session-2026-08-05-part05-product-detail-page]]'
  - '[[agent-operating-contract]]'
---

# Session 2026-08-05 Part 06 — Guest Header Strip and Auth Placeholders

> [!NOTE] Branch status
> Code exists locally, verified, **not committed or pushed**.

## What happened

Second item in the build-order Bogs picked in
[[sals3-session-2026-08-05-part05-product-detail-page]]: the signed-out
header strip from the attached Lazada reference screenshot (the red-boxed
row: Feedback / Save More on App / Sell on Lazada / Customer Care / Track My
Order / Login / Signup).

Adapted rather than copied: "Save More on App" was dropped — no Sals3 mobile
app exists, and the footer session already established the rule against
fabricated app-store claims. Link targets reuse existing stub routes from
`src/lib/footer-data.ts` (`/sell`, `/contact`) instead of inventing new ones,
and a new `/help` was added for "Customer Care". Since no auth/session system
exists at all, the strip always renders the signed-out state — there is
nothing to gate it on yet.

Mid-review, Bogs caught that "Track My Order" duplicated the main header's
existing `Orders` link (screenshot with both circled) and asked for it to be
removed. Fixed in the same session before verification finished.

`Log In` / `Sign Up` route to real `/login` and `/signup` pages rather than
dead links, but those pages show a plain-English "not ready yet" placeholder
(`AuthComingSoon`) instead of a login form — a form with no backend to submit
to would be actively misleading, not just incomplete. Both are `noindex`.

## Verification

`npm run lint`, `format:check`, `tsc --noEmit`, `build` (`/login` and
`/signup` both static), `test:run` (42 tests), `test:e2e` (4 passed,
including a new assertion that `Log In` is visible on the home page), `npm
audit --audit-level=high` (0 vulnerabilities). Checked live in the browser:
header renders Feedback/Sell on Sals3/Customer Care/Log In/Sign Up with no
`Track My Order` duplicate, `/login` renders the placeholder message.

## Files changed

`src/lib/guest-utility-links.ts` (new), `src/components/layout/GuestUtilityBar.tsx`
(new), `src/components/layout/SiteHeader.tsx`, `src/components/auth/AuthComingSoon.tsx`
(new), `src/app/login/page.tsx` (new), `src/app/signup/page.tsx` (new),
`src/app/login/page.test.tsx` (new), `src/app/signup/page.test.tsx` (new),
`src/app/page.test.tsx`, `e2e/home.spec.ts`, `README.md`.

## Still not built

Cart and Orders (Stages 5/6) and the My Account page remain — next in the
build order Bogs set.

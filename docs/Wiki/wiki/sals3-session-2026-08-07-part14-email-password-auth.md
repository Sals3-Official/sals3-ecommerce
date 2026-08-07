---
tags: [sals3, session, auth, firebase, security]
aliases: [Email Password Auth Session]
created: 2026-08-07
updated: 2026-08-07
status: current-state
authority: implementation-state
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-009-server-verified-email-password-authentication]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-ux-build-specification]]"
---

# Session — Email/password sign-in and signup (2026-08-07)

## What happened

`/login` had a complete, approved sign-in UI whose email/password path was a
dead end: `LoginForm` validated the fields, cleared the password, and showed a
notice saying accounts were not switched on. `/signup` was an
`AuthComingSoon` placeholder. Only Google sign-in worked end to end.

Both are now real. The work landed as eleven independently reviewable units,
each leaving `npm run verify` green.

## Decisions confirmed by Bogs before building

Four questions were put to the owner before any code was written, and all four
recommendations were accepted:

1. **The password is verified server-side**, by a new route handler calling the
   Firebase Identity Toolkit REST API — not by the browser's Firebase client
   SDK. This is what `hot.md` already required: server re-validation with
   `login-schema.ts`, password-specific throttling, and CSRF. It also lets the
   server collapse every credential failure into one response.
2. **Scope is login plus signup.** Login alone would have been unusable: with
   no registration form, only accounts created by hand in the Firebase Console
   could sign in.
3. **Throttling is in-memory and per-process.** No new dependency, no paid
   service. The honest description is best-effort throttling, not a rate-limit
   control.
4. **Unverified addresses are blocked** from signing in, with a resend path.

**Reversed later the same day.** Bogs asked for address verification to be
dropped entirely and for signup to redirect to the home page. The verification
gate, the resend endpoint, the unverified panel, its cooldown hook, and the
check-your-email screen were all deleted. Signup now signs the new account
straight in.

Two consequences were stated before making the change and accepted:

- Anyone can register under an address they do not own.
- Signup can no longer absorb an already-registered address. Success means
  "you are signed in", which cannot be faked for someone else's account, so
  registration returns `409 email_unavailable` and says so. That discloses
  membership on the signup form; sign-in stays indistinguishable, and the
  signup throttle caps the harvest rate.

Three follow-on calls were made while reconciling the design work:

- **A confirm-password field is included**, against the usual advice. The
  standard argument for omitting it is that the Show/Hide reveal plus a
  password-reset route already cover typo risk — but `/login/reset` does not
  exist. Until it does, a one-character typo at signup creates a permanently
  unusable account. Dropping verification makes this worse, not better: there
  is now no email round trip in the flow at all, so the typo is never
  surfaced. Revisit when reset ships.
- **The password is kept, not cleared, after a failed sign-in.** A typo should
  not force a full retype, and clearing only the password would hint that the
  password was the wrong half — which the deliberately generic server message
  exists to avoid. Cleared on success and on the Google path.

## What is real versus illustrative

Real, verified by test and by running the app:

- `POST /api/auth/login` and `POST /api/auth/signup`.
- The full `/login` and `/signup` screens. Registration signs in and redirects.
- Per-IP and per-account throttling with TTL eviction.

Not real: nothing is gated behind being signed in. There is still no buyer
account area, server cart, checkout, or authorization workflow.

## Real bugs caught and fixed

Three, all found by tests rather than by reading:

1. **A Node-only module reached the browser bundle.** `LoginForm` imported
   `login-status.ts`, which reached `auth-error-codes.ts`, which imported
   `session-cookies.ts` and therefore `node:crypto`. Typecheck passed, every
   unit test passed, the build passed — and the login page silently stopped
   hydrating, leaving every control inert. Only the Playwright run caught it.
   Fixed by splitting the pure error codes from the server response helper
   (`auth-error-response.ts`), and guarded against regression by
   `test/client-bundle-boundary.test.ts`, which walks the import graph from
   each client entry point.
2. **The real `disabled` attribute was applied to a pending button.** Setting
   it on a button that currently holds focus makes the browser blur it, so a
   keyboard visitor who pressed Enter is dropped to the document body
   mid-request and never learns where the error appeared. Every auth control
   now uses `aria-disabled` plus a handler guard for its own pending state, and
   reserves the real attribute for pre-hydration and for the other method.
3. **A `finally` block wiped the error it had just recorded.** The Google
   button cleared its pending state in a `finally`, which runs after `catch`,
   resetting the status that had captured the failure. Pending is now cleared
   explicitly before the outcome is reported.

Two pre-existing defects were fixed in passing: the throttling Map never
evicted (the key is attacker-controlled via `x-forwarded-for`, so it grew
without bound), and the Show/Hide toggle was 42px against a 44px touch minimum.

## Governance note

`hot.md` lines describing email/password as a placeholder have been rewritten,
and the throttling entry deliberately says "per-process best effort" rather
than "rate limited". [[ADR-009-server-verified-email-password-authentication]]
records the verification reversal in its Decision section rather than being
rewritten to pretend the first shape never existed.

Dead code was deleted rather than parked: `AuthComingSoon.tsx` once `/signup`
became real, then `UnverifiedEmailPanel.tsx`, `use-resend-cooldown.ts`,
`SignupSuccess.tsx`, `resend-verification.ts`, the resend route, and
`AuthNotice.tsx` (orphaned when the message architecture moved to `FormAlert`)
once verification was dropped. `sendOobCode` was kept, unused, with a comment
saying why: `/login/reset` is the next unit and needs exactly it.

## Verification

`npm run verify` (lint, format:check, typecheck:clean, build, test:run,
test:e2e) and `npm audit --audit-level=high`.

The two security-critical checks in the login route were mutation-tested:
removing the unverified-email block failed 2 tests, removing the per-account
throttle failed 2 more. The suite bites.

Manual: both screens checked at desktop and 375x812. A live submit against the
real Firebase project returned the generic outage notice and logged
`[auth] identity toolkit unavailable { code: 'PASSWORD_LOGIN_DISABLED' }` —
the whole chain works, and the Email/Password provider still needs enabling in
the Firebase Console. No address and no password appeared in the log line.

The verification removal was re-verified end to end afterwards: 341 unit tests
and 24 Playwright tests, with the client-bundle boundary guard catching the
stale entry-point list left by the deleted modules.

## Known gaps carried forward

- **No address verification at all.** An address can be registered by someone
  who does not own it, and nothing in the product proves a buyer can receive
  mail at the address on their account. This will matter for order
  confirmations and for password reset.
- **Signup discloses whether an address is registered.** Forced by auto-sign-in.
- `/login/reset` still does not exist, and now matters more: with no email in
  the signup flow, a mistyped address is never caught. Recommended as the
  immediate next unit.
- Throttling is per-process and resets on cold start.
- Playwright stubs our own auth routes, so it covers the client half only. The
  server guards are covered by the route unit tests, not end to end.

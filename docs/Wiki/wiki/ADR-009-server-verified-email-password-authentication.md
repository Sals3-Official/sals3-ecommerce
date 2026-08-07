---
tags:
  - sals3
  - adr
  - architecture
  - auth
  - security
aliases:
  - ADR-009 Email Password Auth
created: 2026-08-07
updated: 2026-08-07
status: implemented
authority: approved-decision
owner_approved: true
related:
  - "[[hot]]"
  - "[[sals3-session-2026-08-07-part14-email-password-auth]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-ux-build-specification]]"
---

# ADR-009 — Server-verified email/password authentication

## Status

`implemented`

## Problem

Buyers could only sign in with Google. The email/password fields on `/login`
validated input and then did nothing, and `/signup` was a placeholder. A
storefront that offers a password field which cannot create or accept a
password is worse than one that offers neither.

The open question was not whether to build it, but where the password is
checked: in the browser through the Firebase client SDK, or on our own server.

## Evidence

- `docs/Wiki/wiki/hot.md` already carried the requirement: email/password "must
  re-validate with `src/lib/auth/login-schema.ts` on the server and add
  password-specific rate limiting and CSRF protection."
- `src/lib/auth/login-schema.ts` was written framework-agnostic for exactly
  this reuse; its own header comment says so.
- `POST /api/auth/session` was already provider-agnostic: it takes an ID token,
  verifies it, and mints a cookie. Any flow producing a Firebase ID token can
  reuse the session machinery unchanged.
- Verified against `node_modules`: `SignInWithPasswordResponse` carries no
  `emailVerified` field, so the flag must come from the ID token's
  `email_verified` claim; `createSessionCookie` forwards any Firebase ID token
  and does not care which SDK produced it; `sendEmailVerification` in the
  client SDK is a thin wrapper over `POST /v1/accounts:sendOobCode`.
- The pre-existing throttle in `session-cookies.ts` keyed only on
  `x-forwarded-for` and never evicted, so the Map grew without bound on an
  attacker-controlled key.
- `sals3-ux-build-specification.md` forbids a forced account before purchase
  and lists it as a rejected dark pattern, so nothing here may become a gate in
  front of checkout.

## Options considered

### Option A — Client SDK verifies the password

The browser calls `signInWithEmailAndPassword` and posts the resulting ID token
to the existing session route.

Benefits: least code, no new endpoint, and the password never transits the
Sals3 origin.

Risks: the server never sees the credential, so it cannot re-validate it with
`loginSchema`, cannot throttle per account, and cannot normalise the failure
message. Firebase's client SDK distinguishes `EMAIL_NOT_FOUND` from
`INVALID_PASSWORD` unless enumeration protection is enabled in the Console,
which puts an enumeration oracle outside our control. This option does not
satisfy the requirement already recorded in `hot.md`.

### Option B — A server route verifies the password

`POST /api/auth/login` re-validates with `loginSchema`, calls the Identity
Toolkit REST endpoint, and mints the session cookie.

Benefits: satisfies the recorded requirement exactly. The server controls the
failure response, so every credential rejection is byte-identical regardless of
the Console setting. Per-account throttling becomes possible, which is the only
dimension that caps credential stuffing from a rotating address pool.

Risks: the password transits the Sals3 origin, so logging discipline matters
more. One extra server hop per sign-in.

## Strongest objection

Option B routes a plaintext credential through infrastructure that previously
never handled one. Any future `console.log` of a request body, any error
reporter that captures request payloads, any middleware that echoes input, now
leaks passwords — and the failure would be silent.

This is a real and permanent increase in blast radius, and it is not fully
answered by care. It is answered by making the leak testable: a distinctive
sentinel password is asserted absent from the response body, every response
header, the request URL, web storage, and all five `console` levels, across
every failure path, at both the wrapper and the route layer. The wrapper also
never re-throws a rejected `fetch`, because a rejected fetch can carry the
request body.

The residual risk is a future contributor adding logging without running those
tests. That is mitigated, not eliminated.

## Decision

Approved by Bogs on 2026-08-07, in response to four explicit questions asked
before any code was written.

Password verification happens server-side (Option B). Scope covers sign-in and
registration. Throttling is in-memory and per-process.

**Revised the same day, at the owner's direction: email address verification is
out of scope.** No verification mail is sent, sign-in does not inspect the
`email_verified` claim, and registration signs the new account straight in and
redirects to the home page. The resend-verification endpoint and the unverified
panel that the first revision shipped were deleted.

Three consequential details:

- Every sign-in credential failure — unknown address, wrong password, disabled
  account — returns one byte-identical `401 {"error":"invalid_credentials"}`.
  `USER_DISABLED` is folded in deliberately; the cost is that a disabled
  account sees a wrong-password message.
- **Signup discloses a taken address**, returning `409 email_unavailable`. This
  is forced by auto-sign-in rather than chosen: success now means "you are
  signed in", which cannot be faked for an account somebody else owns, so the
  neutral response the first revision used became untenable. Sign-in stays
  indistinguishable, and the signup throttle caps the harvest rate.
- **Anyone can register under an address they do not own.** That is the price
  of dropping verification, and it is accepted knowingly.

## System impact

- **Data and schema:** none. No Sals3 datastore is involved; Firebase Auth
  holds the accounts. `displayName` is now set for password accounts so the
  header greets them the same as Google accounts.
- **Modules:** two new route handlers under `src/app/api/auth/`; new modules
  under `src/lib/auth/` and `src/components/auth/`. `session-cookies.ts` delegates its throttle to the
  new limiter with unchanged signatures. `AuthComingSoon.tsx` deleted.
  `next.config.ts` extends `no-store` to `/signup`.
- **User workflow:** a buyer registers and is signed in and returned to the
  home page in one step. Nothing is gated behind being signed in, so guest
  checkout is unaffected and the rejected forced-account pattern is not
  introduced.
- **Financial or compliance effect:** no new billable service. Identity Toolkit
  sign-in and signup are on Firebase Auth's no-cost
  tier. One extra server hop per sign-in. The client bundle shrinks slightly,
  since password sign-in imports nothing from `firebase/auth`. Passwords are
  now processed by Sals3 infrastructure, which is a privacy-relevant change in
  data flow even though nothing is stored.
- **Migration and rollback:** none needed. Existing Google sessions are
  untouched; the cookie, its attributes, and its lifetime are unchanged.
  Rollback is reverting the routes and restoring the placeholder form —
  accounts created in the meantime remain valid Firebase accounts.

## Required verification

- **Focused tests:** `rate-limit.test.ts`, `identity-toolkit.test.ts`,
  `signup-schema.test.ts`, `auth-csrf-client.test.ts`, the three route test
  files, `LoginForm.test.tsx`, `SignupForm.test.tsx`, `PasswordField.test.tsx`,
  `client-bundle-boundary.test.ts`.
- **Full or cross-module tests:** `npm run verify` and
  `npm audit --audit-level=high`. `e2e/login.spec.ts` and `e2e/signup.spec.ts`
  cover the client half; Playwright stubs our own auth routes, so the server
  guards are proved by the route unit tests rather than end to end.
- **Manual acceptance:** both screens at desktop and 375x812. Register and
  land signed in on the home page, Back behaviour, sign out, sign back in, a
  second registration on the same address, and identical copy for a wrong
  password and an unregistered address. Requires the Console prerequisite
  below.
- **Data reconciliation:** not applicable.

Console prerequisite, which is configuration and not code: enable
Authentication > Sign-in method > Email/Password (verified still off on
2026-08-07). Confirm the browser API key is not referrer-restricted, or set
`FIREBASE_WEB_API_KEY` to a key restricted by API instead.

## Supersession

None. This is the first decision on Sals3 credential authentication. It extends
the Google sign-in flow recorded in
[[sals3-session-2026-08-06-part13-seller-center-first-build]]'s predecessor
sessions rather than replacing it; both providers share one session cookie.

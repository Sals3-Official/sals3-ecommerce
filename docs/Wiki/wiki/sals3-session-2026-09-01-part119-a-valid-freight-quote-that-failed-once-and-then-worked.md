---
tags:
  - sals3
  - sals3-portal
  - checkout
  - freight
  - cj-integration
  - session-note
aliases:
  - Part 119
  - A Valid Freight Quote That Failed Once And Then Worked
created: 2026-09-01
updated: 2026-09-01
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
  - "[[sals3-session-2026-08-31-part116-the-pay-button-double-quote-its-diagnostic-and-the-fiji-cap]]"
---

# Part 119 — a valid freight quote that failed once, then worked

2026-09-01, `sals3-portal`
[#299](https://github.com/Sals3-Official/sals3-portal/pull/299), no DDL.

> [!NOTE] Provenance
> Written after the fact from the pull request's own record.

## The reproduction

Direct reproduction against CJ showed the same valid freight request fail
once and then succeed immediately afterward, with no change to the payload
between the two calls. This is a different failure from the class part 116's
diagnostic was built to see — that work exposed a genuine, honest CJ failure
(no route, out of stock) behind the generic 503 the checkout path shows a
buyer. This one is CJ answering an ordinary HTTP 200 with a body the client
cannot use, on a request that was correct.

## The fix

`freight-quotes.ts` retries **once per package** when CJ returns an
HTTP-200 response that is invalid or otherwise unsuccessful — reusing the
identical request and the identical connection fetcher already in use, no new
CJ call shape. The retry is narrow on purpose:

- A healthy quote makes no additional CJ request at all.
- An affected package makes at most one additional request — bounded, not a
  loop.
- Two invalid HTTP-200 bodies in a row still fail closed as an
  unexpected-response error; the retry is a single recovery attempt, not a
  second chance at masking a real problem.
- Genuine no-route, out-of-stock, rate-limit, network, and non-2xx failures
  are untouched and remain honest failures — the retry only catches the one
  specific shape (a 200 with an unusable body).

This fixes the shared checkout freight path for **any** affected product,
rather than special-casing the one item the reproduction used.

## Verification

`npm run verify` on latest `develop`: lint 0 errors, format passed, clean
typecheck, production build passed. Unit: 335 files / 3,675 tests passed, 4
skipped. E2E: 56 passed, 19 skipped. Focused freight suite: 26 passed.
`npm audit --audit-level=high`: no high or critical findings (6 moderate
remain in existing dependency chains, unrelated to this change).

## What was not done

The PR does not claim to know *why* CJ occasionally answers a valid request
with an unusable 200 body — only that it reproduces, that a single retry
recovers it, and that the retry is bounded so it cannot mask a genuinely
broken request behind an infinite recovery loop.

## Lessons

- **Not every CJ failure worth handling is a non-2xx response.** Part 116's
  diagnostic work was built around CJ answering with a real error the code
  could classify; this defect is CJ answering 200 with a body that fails
  parsing — a different shape needing a different guard, caught only by
  reproducing the exact request twice and comparing the two responses.
- **A retry's safety is in what it does *not* retry.** The fix is as much
  about the four failure classes explicitly left alone (rate limits, network
  errors, non-2xx, and a second consecutive invalid 200) as it is about the
  one class it recovers — a retry that caught everything would hide a real
  problem behind a slower failure.

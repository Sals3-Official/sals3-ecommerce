---
tags:
  - sals3
  - sals3-portal
  - internal-api
  - product-editor
  - automation
  - auth
  - session-note
aliases:
  - Part 124
  - An API So The Agent Stops Driving A Browser
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
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
---

# Part 124 — an internal API, so the agent stops driving a browser

2026-09-01, `sals3-portal`
[#302](https://github.com/Sals3-Official/sals3-portal/pull/302)/[#304](https://github.com/Sals3-Official/sals3-portal/pull/304),
no DDL in either.

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## Why this exists: three specific ways scraping a rendered page broke

Every prior round of AI-agent product automation worked by opening a browser
and reading the rendered Product Editor page — because the write side of an
internal API already existed, but nothing exposed the *read* side an
automated write needs first: an attribute write needs the category's own
`allowedValues`, a variant-photo write needs a `mediaId` and a `variantId`,
an option mapping needs the supplier's own labels, and none of it was
reachable except by rendering the page and parsing it. Three concrete
breakages are named as the reason this stopped being tolerable:

- `/listings` began paginating at 25 rows (portal #290, part 117), so a
  scraper comparing the header's "122 products" against the rendered rows
  could never agree again — the sourcing money-guard built on that
  comparison refused every run.
- The Ready tab's candidate id is not in the row markup at all; the only
  UUID visible there is CJ's own thumbnail filename, which looks identical
  to a real candidate id. A scraper reading three confident ids got
  `not_found` on all three.
- Once a Variant Matrix is mapped, the photo picker splits into one strip
  per axis — a reader collecting every "photo for X" button on a 5-colour
  product got 12 "first-axis values" back.

None of those three were bugs in the portal. They were a client inferring
structure from a page that had every right to change shape. The fix is not a
sturdier scraper — it is routes that hand over the same values the editor
itself renders from, so there is nothing left to infer.

## The read half, and every write action mirrored over HTTP (#302)

A secret-authenticated internal API under `/api/internal/products/**` now
mirrors every Server Action the browser-based Product Editor already uses:
category/specs, description, meta-description, description-image, publish,
all seven option-mapping actions, media upload/reorder/delete,
variant-media, show-supplier-photo, and the full draft lifecycle — 22 routes
in total. Every route statically imports and calls the **exact same** domain
function the Server Action calls; nothing is reimplemented.

Identity is resolved from the resource itself —
`products.stewardSellerAccountId`, or `supplier_connections.seller_account_id`
via the candidate for the two draft-creation routes — never from a
caller-supplied id, so a request cannot simply assert whose product it is
touching.

Two Server-Action-only helper blocks were extracted into shared modules
(`publish-side-effects.ts`, `create-draft-evidence.ts`) specifically so the
new routes and the existing Server Actions cannot drift into two separate
notions of "published" or "captured evidence" — the same class of hazard
`internal-routes-call-their-own-module.test.ts` (built in part 90, after the
backfill endpoint that ran the wrong migration) already guards against by
naming.

**Every route was verified against a real local Postgres fixture** — write
through the route, then an independent database read confirming
persistence — except the two draft-creation routes' CJ evidence-capture
step, deliberately not exercised live to avoid spending real CJ points; only
their auth, schema, and not-found paths were verified for those two.

`npm run typecheck` clean; full `npm run verify` (lint, format, typecheck,
build, unit, e2e) passed via the pre-push hook, 65 e2e passed, 10 skipped, 0
failed.

### Shipped, and dead on arrival

`PRODUCT_EDITOR_API_SECRET` is not set in Vercel, and there is no Vercel
access to set it. The PR's own test plan states this plainly as an unchecked
item: the API is inert — every call answers `401` — in production until the
secret exists somewhere it can be read from.

## The fix for that: authenticate by the session the portal already has (#304)

Confirmed live: a valid session cookie gets `200` from `/listings` while the
same request against the internal API returns `401` — the secret path from
#302 had no way to work on the one deployment that matters, since nothing
could set the secret there.

`authorizeEditorApiRequest` now tries the secret first, then the seller's own
session cookie — the identical credential `market-rules/market-profile-actions.ts`
already authenticates with. No environment variable is required this way, so
the API works on any deployment where a seller can already sign in.

The cookie path enforces the same gates every editorial Server Action
enforces, in the same order and nothing looser: verified email and 2FA
enrolled (the two conditions `getSession` itself redirects on), `product:edit`
for the session's `PortalRole`, and ADR-006's `DROPSHIPPER` rule.

**CSRF**, the one thing a cookie-authenticated Route Handler does not get for
free — Next verifies origin for Server Actions, not for route handlers — is
covered by a required `x-sals3-editor-api` header (a cross-site form cannot
set a custom header, and a cross-origin `fetch` that tries to triggers a CORS
preflight this app never answers permissively) plus a `Sec-Fetch-Site` check
refusing both `cross-site` and `same-site`.

**Identity is per-credential, decided in exactly one place.** A secret
caller carries no tenant of its own, so identity still comes from the
resource, as in #302. A session caller carries its own tenant identity and is
written as *itself* — resolving the resource's steward for a session caller
instead would let any signed-in seller write into another tenant's catalogue
simply by naming its product id, which is the one escalation the underlying
domain functions cannot catch on their own (they only verify that the
`sellerAccountId` they were handed matches the product, not who is allowed to
hand it one). `resolveApiActor` and `resolveApiCandidateActor` are the one
place that decision is made, so no individual route can get it wrong.

### Why this is #304 and not #303

#303 conflicted with `develop` for a reason that had nothing to do with its
own content: #302 was squash-merged, which rewrote every route file's git
history, so the diff flagged all 22 files as conflicting despite the actual
content agreeing. #304 is the same change, cut fresh from the updated
`develop` — `git diff origin/develop HEAD` on #304 is exactly this change and
nothing else.

## Verification

23 new tests in `editor-api-auth.test.ts` covering both credentials, every
gate, every CSRF case, and the cross-tenant escalation specifically. Full
suite green; `tsc --noEmit` clean against updated `develop`. Full
`npm run verify` via the pre-push hook — 65 e2e passed. Against a real local
server: the secret path still works unchanged (no regression), no credential
returns 401, and a custom header sent without a cookie also returns 401.

## What was not done

The cookie path's live end-to-end proof needs a real Better Auth session,
which the local database has none of (`auth_users` is empty) — verified by
unit test only in this PR, with the PR stating the live check would follow
immediately after merge rather than claiming it had already happened.

## Lessons

- **A scraper reading a rendered page is inferring structure the page never
  promised to keep.** Three unrelated portal changes — pagination, an id not
  present in the markup, a picker that splits by axis — each broke an
  automation that had no contract with the page at all, because there never
  was one.
- **Extracting shared logic into its own module is what keeps two callers of
  "the same operation" from silently becoming two different operations.**
  `publish-side-effects.ts` and `create-draft-evidence.ts` exist so the
  Server Action and the new internal route cannot drift into disagreeing
  about what "published" or "evidence captured" means, the same failure mode
  named explicitly in part 90's `internal-routes-call-their-own-module` test.
- **An environment variable that cannot be set on the one deployment that
  matters is the same as a feature that does not exist there.** #302 shipped
  complete, tested, and merged, and was still fully inert in production for
  the single reason that nobody could reach Vercel to add a secret — solved
  not by finding a way to set the secret, but by authenticating with a
  credential the portal already had everywhere.
- **A caller with no tenant of its own and a caller with a real one need
  identity resolved by two different rules, decided in one shared place.**
  Letting each route choose how to resolve identity per credential type is
  exactly how a cross-tenant write slips through — `resolveApiActor` exists
  so that decision is made once.

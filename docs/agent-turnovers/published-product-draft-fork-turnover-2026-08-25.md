# Turnover — a published product cannot be edited: no draft revision is ever forked

**Date:** 2026-08-25
**Repo:** `sals3-portal`
**Found by:** browser automation run against `https://sals3-portal.vercel.app` on 5 Live listings
**Status:** diagnosed from source + reproduced in the live Portal; **not fixed**

---

## The task

Once a product is published, every **revision-scoped** save in the listing editor
is refused with a version conflict. The editor still offers `Save New Draft` and
`Publish Update`, so the screen promises an edit it cannot perform. Make editing
a published product work.

This blocks all further content work on the catalogue: 21 of 21 products in
`/listings` are `Live`, and none of them can take a description.

---

## What is verified

Each of these was read in the source, not inferred.

**1. Revision-scoped writes require an open DRAFT revision.**

`saveDraftRevisionContent` updates only where `workflow_state = 'DRAFT'` **and**
the version matches:

- `src/modules/catalog/products/repository.ts:389-392`

Both of these go through it:

- `src/modules/catalog/products/save-description-document.ts:73` (the
  `Save description` button)
- `src/modules/catalog/products/save-draft.ts` (the `Save Draft` /
  `Save New Draft` button — its own doc comment says "Saves editorial content
  onto an **open draft** revision")

On failure they return `version_conflict`, surfaced as *"This description
changed in another tab or session. Reload the editor and try again."*
(`src/app/(portal)/listings/description-actions.ts:58`).

**2. Publishing moves the revision out of DRAFT.**

`src/modules/catalog/products/publish.ts:764-768` — a `DRAFT` revision becomes
`APPROVED` on publish.

**3. Nothing forks a new draft afterwards.**

`insertDraftRevision` is the only code that creates a `DRAFT` revision
(`src/modules/catalog/products/repository.ts:300`). Its **only** production
caller is `src/modules/catalog/products/create-draft.ts:509` — the
"Customize & List" pipeline action, which runs once per candidate.

So after the first publish there is no `DRAFT` revision for that product and
nothing that will ever make one.

Note the doc comment directly above `insertDraftRevision`
(`repository.ts:295`): *"rewrites the public revision (spec §6.2), it creates
the next draft here."* The fork appears to have been intended and never wired.

**4. Product-scoped writes are unaffected.**

Anything keyed on `expectedProductVersion` rather than a revision saves fine on
a published product. Confirmed working live on 5 published products:

| Write | Scope | Result on a Live product |
|---|---|---|
| Sals3 category (`category-mapping-actions.ts`) | product | ✅ saved |
| Meta description (`meta-description-actions.ts`) | product | ✅ saved |
| Option mapping (`option-mapping-actions.ts:58`) | product | not exercised, but product-scoped |
| Description (`description-actions.ts`) | **revision** | ❌ `version_conflict` |
| Product name (rides `Save Draft`) | **revision** | ❌ silently reverted |

---

## Reproduction

Any product whose listing status is `Live`. In the browser:

1. Open `/listings/new?productId=<id>` for a Live product.
2. Type anything into the Description box (Simple text mode).
3. Press `Save description`.

Result: *"This description changed in another tab or session. Reload the editor
and try again."* A fresh reload does not help; neither does pressing
`Save New Draft` first. Both were tried.

Product used during diagnosis: `d0480ba8-ce9a-4b2e-a368-0f5ec3b5a8b9`
("Twisted knitted top coat").

---

## Constraints you must respect

Read these before touching anything — they are the repo's own rules, not
suggestions:

- `AGENTS.md` in the repo root, and the wiki files it points at:
  `../sals3-ecommerce/docs/Wiki/wiki/hot.md`,
  `agent-operating-contract.md`,
  `nextjs-component-security-code-rules.md`,
  `project-structure-installation-and-runbook.md`.
  Read `hot.md` as `git show origin/develop:docs/Wiki/wiki/hot.md` after
  `git fetch origin develop` — the local clone lags, and the file is ~182 KB
  across ~628 lines, so read it in 12–18 line slices.
- **Do not work in the shared checkout.** At handoff, `E:\sals3-portal` was on
  branch `feat/per-market-pricing-resolver` with another agent's uncommitted
  changes. Build this in an isolated `git worktree` off latest
  `origin/develop`.
- `npm run verify` must pass before the work is reported complete. The
  pre-commit and pre-push hooks run the full suite — allow ~600 s.
- **Never migrate the local database.** Local migration hides the production
  DDL gap. If this needs schema work, that ordering matters — see the standing
  rule in the wiki.
- Do not deploy, publish, push, or commit unless the owner explicitly asks.

---

## Design constraints the fix has to satisfy

- **One open draft per product, enforced in the database.**
  `product_revisions_open_draft_key` is a partial unique index on `product_id`
  where `workflow_state = 'DRAFT'` (`drizzle/0013_cold_timeslip.sql:273`,
  `src/lib/db/schema/product-catalog.ts:434`). A second concurrent fork must
  collide rather than produce two rival drafts — the index already does this;
  the fix must handle the collision rather than crash on it.
- **A settled revision is immutable.** `save-draft.ts`'s own comment: "a
  submitted or approved revision cannot be rewritten in place… Editing a
  settled revision is a fork into a [new revision]". The fork is the intended
  shape; do not loosen the `workflow_state = 'DRAFT'` predicate to make the
  write succeed in place.
- **An APPROVED revision carries a frozen snapshot**, a DRAFT does not — check
  constraint at `src/lib/db/schema/product-catalog.ts:449`. A forked draft
  needs `contentSnapshot: null` and `frozenAt: null`, as `insertDraftRevision`
  already sets.
- The published listing must keep serving the old content until the new draft
  is published. Forking must not change what buyers see.

---

## Open questions for the owner — ask, do not assume

1. **Where does the fork happen?** Three candidates, and they behave
   differently:
   - lazily, when the editor loads a published product with no open draft;
   - on first edit, when a revision-scoped save finds no draft;
   - explicitly, behind a button the seller presses.
   The third is the most honest about what is happening but adds a step. The
   first is invisible and creates a draft row for anyone who merely opens the
   page.
2. **What does the forked draft start from** — the approved revision's
   `contentDocument`, or its frozen `contentSnapshot`?
3. **Does forking need its own audit action**, alongside
   `PRODUCT_AUDIT_ACTIONS.revisionSaved` / `revisionSaveRejected`?
4. **What should `Publish Update` do** with an approved revision that is being
   superseded — `SUPERSEDED` is already in the enum.

---

## Out of scope

- The browser automation that found this. It lives outside the repo at
  `E:\Bogs 2nd brain\sals3-portal-automation\` and needs no change; it reported
  the failure correctly once its own "assume the click worked" bug was removed.
- Re-writing the 21 products' content. That is blocked on this fix and is a
  separate piece of work.
- The unrelated CJ points gap (`captureEvidenceBeforeDraft` runs before the
  idempotency check, so re-clicking "Customize & List" re-spends ~10 points —
  `src/app/(portal)/listings/product-draft-actions.ts:179` and `:242`). Worth
  its own turnover; do not fold it into this one.

---

## How to know it is fixed

1. `npm run verify` passes.
2. On a Live product: open the editor, type a description, press
   `Save description` — it saves, and survives a reload.
3. The product name can be changed and persists through `Save New Draft`.
4. The storefront still shows the **old** content until `Publish Update` is
   pressed.
5. Two browser tabs editing the same published product do not produce two open
   drafts; the second gets a clear refusal.
6. A product that has never been published still behaves exactly as before —
   one draft from `create-draft.ts`, no second one.

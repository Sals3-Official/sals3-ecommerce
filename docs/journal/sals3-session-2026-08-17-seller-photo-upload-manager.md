---
tags: [session-note, implementation, sals3-portal, product-editor, media-upload, vercel-blob, sharp, supplier-details]
aliases: [2026-08-17 Portal Seller Photo Upload Manager Session, Product Media Vercel Blob Migration]
created: 2026-08-17
updated: 2026-08-17
status: merged
authority: historical-session
owner_approved: true
related:
  - "[[../Wiki/wiki/hot]]"
  - "[[../Wiki/wiki/agent-operating-contract]]"
  - "[[../Wiki/wiki/nextjs-component-security-code-rules]]"
  - "[[../Wiki/wiki/project-structure-installation-and-runbook]]"
  - "[[sals3-session-2026-08-17-portal-editor-supplier-details-refinements]]"
  - "[[sals3-session-2026-08-16-portal-option-mapping-editor]]"
---

# 2026-08-17 — Portal: Seller Photo Upload Manager (Vercel Blob + sharp) and Supplier Details Relocation

## Scope

Later the same day as [[sals3-session-2026-08-17-portal-editor-supplier-details-refinements]] (PR #98/#99), Bogs continued the `sals3-portal` Product Editor work with a new batch of screenshot-driven requests: surface the supplier's original product name/photos as read-only evidence, restyle the variant listing toggles as Sals3-branded switches, and — after approving Vercel Blob as the storage backend mid-session ("we will use vercel") — build real seller-owned photo uploads end to end. Two pull requests shipped: [PR #100](https://github.com/Sals3-Official/sals3-portal/pull/100) (the initial evidence-gallery/toggle/upload-pipeline build) and [PR #101](https://github.com/Sals3-Official/sals3-portal/pull/101) (a follow-up redesign of the upload UI itself, a compression/dimension-limit tightening pass driven by several rounds of Taglish clarifying questions, and relocating Supplier Details to a collapsible section just above Review & Publish).

Both PRs were requested with an explicit, repeated instruction — *"please check and run test in everything before i merge. ensure that nothing will break"* — said twice across the session, which drove a deeper verification discipline than a single `npm run verify` pass: branch reconciliation against a `develop` that had moved since the work started, CI log inspection (not just green checkmarks), and a final fresh re-run of the full suite after CI passed but before either merge.

## PR #100 — Supplier evidence gallery, branded toggles, first Vercel Blob upload pipeline

**Branch:** `feat/seller-photo-management` → **[PR #100](https://github.com/Sals3-Official/sals3-portal/pull/100)** ("Seller product photo uploads, supplier/seller media split, and supplier name evidence") — merged into `develop` at commit `efa4b2cb154f8d918ad178a6a78cb11752dd5824` on 2026-08-17.

### What was requested

From screenshots: add a read-only "Original product name" field and a small "Original photos" gallery to Supplier Details (the supplier's own evidence, distinct from the seller-editable Product Name), and replace the variant listing checkboxes with Sals3-branded toggle switches (`#018CC9` / `#002B53`) defaulting to **on** for eligible in-stock variants. Mid-thread, Bogs approved Vercel Blob as the object-storage backend for a seller's own photo uploads ("we will use vercel"), which expanded the PR into a full upload feature.

### What was implemented

- **`SpecificationsSection.tsx`** — added the supplier's original product name and a small read-only photo gallery (`SupplierMediaGallery.tsx`), never reorderable, never a cover pick, never replaced.
- **Media pool split** — every editor read site now distinguishes **`SUPPLIER_ORIGINAL`** (read-only evidence) from **`SELLER_UPLOAD`** (seller-editable), per ADR-011. Fixed three call sites (header thumbnail, Draft Storefront Preview, Review & Publish media count) that would have silently rendered blank once seller uploads existed but none had been added yet.
- **Variant toggles** — restyled from checkboxes to real switches in Sals3 brand colors; defaulted to **on** for eligible in-stock variants regardless of publish state (previously required the product to already be `LIVE`, so a brand-new draft always started at "0 of N will list").
- **`upload-seller-media.ts`** (new module) — the first version of the seller-upload pipeline: ownership-checked (`findProductForSteward`), magic-byte-validated (JPEG/PNG/WebP, never trusting client-supplied `File.type` or filename), rate-limited (20/min) Server Action; writes an ADR-011 `SELLER_UPLOAD` `product_media_sources` row via `put()` to Vercel Blob (deliberately not `putImage()`/Vercel's metered Image Optimization, which this codebase had already been burned by once); 8 MB/photo and 12-photos/product caps at this point; SHA-256 checksum dedup.
- Evaluated the `image-size` npm package for real photo dimensions, installed it, then **uninstalled it** after `npm audit --audit-level=high` surfaced an unpatched high-severity DoS advisory (ICNS/JXL/HEIF infinite loop) with no available fix. Seller-upload dimensions were left at `0` ("not measured") at this point — the same convention supplier-evidence rows already used for unmeasured fields.

### Reconciliation

The branch this work started on had drifted 5 commits behind `develop` by the time it was ready — PR #98/#99 (same day, see the linked session note) had restructured `BasicInformationSection.tsx` and deleted `SupplierEvidenceBlock.tsx` in favor of `ReadOnlyField.tsx` in the meantime. Resolved by committing the work as a checkpoint, branching fresh off current `develop`, and cherry-picking the checkpoint (two real conflicts, rest auto-merged) — the "Original product name"/"Original photos" additions ended up living in `SpecificationsSection.tsx` to match the new post-#98/#99 structure rather than the old `BasicInformationSection.tsx` location they were first written against.

### Verification (PR #100)

- `npm run lint` / `format:check` / `typecheck:clean` / `build` — clean.
- `npm run test:run` — 1675 passed, 4 skipped (pre-existing skips).
- `npm run test:e2e` — 78 passed, 6 skipped (pre-existing skips).
- `npm audit --audit-level=high` — clean (only a pre-existing, unrelated moderate `drizzle-kit`/`esbuild` dev-tool advisory).
- Manual browser verification on `/listings/new?fixture=pass` and `?fixture=attention` via the Claude Browser tool: Supplier Details showed the original name and read-only gallery (no reorder/cover/replace controls even on a rejected/watermarked-image fixture), the Media section's empty state and disabled-Upload-with-reason rendered correctly, Basic Information's "Upload your own photos" jumped to the Media section, and Review & Publish's media count correctly reflected the supplier fallback. No console errors, no failed network requests.
- CI (`gh pr checks` + `gh run view --log`, not just the checkmark) confirmed green before the owner merged.
- Deferred at this point, on the owner's own call: client-side/server-side photo compression before upload. `BLOB_READ_WRITE_TOKEN` was flagged as an environment prerequisite Vercel auto-injects once a Blob store is connected — Upload stays visibly disabled with an honest reason until then.

## PR #101 — Real photo manager UI, compression pipeline, hard size/dimension limits, collapsible Supplier Details

**Branch:** `feat/product-photo-manager` → **[PR #101](https://github.com/Sals3-Official/sals3-portal/pull/101)** ("Real seller photo upload manager, collapsible Supplier Details") — merged into `develop` at commit `79e28b7e3c20024894e48b175e50f7b14c8f8450` on 2026-08-17, roughly 90 minutes after PR #100.

### What was requested

From a fresh set of screenshots, in one combined ask: (1) shrink the Supplier Details "Original photos" thumbnails to match the small size already used above them in Product Media; (2) remove the passive Product Media thumbnail-strip-plus-jump-button entirely and replace it with a real, customized upload UI (main tile + grid + upload tile, styled after a reference competitor screen); (3) pick a sensible max resolution/file size and use `sharp` server-side, with an explicit constraint — *"bsta ensure na high quality padin despite na may size reduction"* (keep it high quality despite the size reduction). A mid-turn addendum, from another screenshot, asked to move Supplier Details to just above Review & Publish, make it collapsible, and delete the standalone Media section outright (its upload functionality absorbed into Basic Information).

Several follow-up Taglish questions shaped the final numbers over the course of the thread: confirming the compression pipeline actually shrinks a large input to a small stored file (not just re-labels it), asking where a seller's own upload is saved, then two explicit instructions — lower the accepted upload size from the initial 10 MB down to **5 MB**, and, in this session's final instruction, hard-reject any upload whose actual pixel dimensions exceed **2000×2000** rather than silently downscaling it.

### What was implemented

- **`ProductPhotoManager.tsx`** (new) — real upload/delete/set-cover photo manager: a larger cover tile, smaller tiles for the rest, and a dashed upload tile; hover reveals Star (set cover) / Trash (delete) icon buttons via an extracted `PhotoTile` component (extracted from an inline render-function definition to satisfy `react/no-unstable-nested-components`/`react-hooks/static-components`).
- **`upload-seller-media.ts`** — the compression/validation pipeline tightened in three passes over the session:
  1. `sharp` wired in for real: `.rotate()` (EXIF auto-orient), re-encode as WebP at quality 82, dimensions read from `info.width`/`info.height` — replacing the abandoned `image-size` package and the `0`/"not measured" placeholder from PR #100.
  2. Upload ceiling lowered from 10 MB to **5 MB** (`MAX_UPLOAD_BYTES`), with the reasoning recorded in the module's own doc comment: every real phone photo has comfortably enough resolution under 5 MB, and `sharp` holds the *decoded* bitmap in memory during processing — routinely 10–20× the compressed file size — so a lower accept ceiling only ever bought a larger in-memory decode and more upload bandwidth, never better output quality (the resize/re-encode step is what actually controls that).
  3. **This session's final change**: a hard dimension gate. A new `readImageDimensions()` helper does a header-only `sharp(bytes).rotate().metadata()` read — no full pixel decode — before the expensive resize/re-encode step runs, and refuses anything wider or taller than `MAX_DIMENSION_PX` (2000) outright with a new `DIMENSIONS_TOO_LARGE` result reason, rather than the previous behavior of silently downscaling via `resize({fit: 'inside', withoutEnlargement: true})`. The resize call in `processImage()` stays in place as defense-in-depth (a no-op by the time it runs, since the gate already guarantees compliant input) rather than the primary size control.
- **`delete-seller-media.ts`** (new) — `deleteSellerProductMedia`, scoping every delete to `sourceType = 'SELLER_UPLOAD'` in the same `WHERE` clause as the ownership check, so a supplier's own photo is structurally impossible to delete through this path (IDOR protection, same pattern already used elsewhere in this codebase).
- **`media-actions.ts`** — added `deleteSellerMediaAction` alongside the existing upload action, with its own rate-limit bucket (`media-delete`, separate budget from `media-upload`); `REFUSAL_MESSAGES` updated for the 5 MB ceiling and the new `DIMENSIONS_TOO_LARGE` reason ("Resize it to at most 2000 × 2000 px and try again.").
- **`MediaSection.tsx`** — deleted outright; its upload/delete/cover functionality fully absorbed into `ProductPhotoManager` inside Basic Information. `EditorSectionId` lost the `'media'` value; the real production blocker generator in `read-model.ts` ("No publishable media is recorded") was repointed from `section: 'media'` to `section: 'basic'`.
- **`EditorSectionCard.tsx`** — gained `collapsible`/`defaultOpen`/`open`/`onOpenChange` props using base-ui's `Collapsible` primitive. Structural fix along the way: a `<button>` cannot legally contain an `<h2>`, so the `CollapsibleTrigger` wraps only the title text inside the `<h2>`, not the whole header row — meta/badge stay outside as always-visible siblings. Also discovered (and corrected a wrong assumption about) `keepMounted`: it does **not** make collapsed content queryable via `getByRole` in tests — it still carries a `hidden` attribute when closed, only preventing a full DOM unmount.
- **`ProductEditorWorkspace.tsx`** — Supplier Details (`section: 'specs'`) moved from right after Basic Information to right after the Markets section, immediately before Review & Publish; collapsed by default via new `specsOpen` state. `goToSection('specs')` now force-expands it before scrolling, so a blocker living inside a collapsed section is never hidden from "Go to section."
- **`SupplierMediaGallery.tsx`** — redesigned to small 44px thumbnails matching the Product Media summary size, with a tiny corner status icon instead of a large pill label (full detail preserved via `title` tooltip and an `sr-only` span) — the first item on Bogs's screenshot list this round.
- `next.config.ts`'s `serverActions.bodySizeLimit` tightened from `11mb` to `6mb` to match the new 5 MB ceiling plus request-envelope headroom.

### Verification (PR #101)

- Full local `npm run verify` (lint → format → typecheck → build → 1693 unit tests, 4 skipped → 78 e2e tests, 6 skipped) passed clean via both the pre-commit and pre-push husky hooks — the pre-commit run additionally had to route two stray untracked scratch folders (`tmp/`, `outputs/`, leftover from an unrelated earlier taxonomy task, not part of this session's work) out of the working tree first, since the hook's whole-repo lint step was picking them up and failing on pre-existing issues in files this PR never touched. Moved rather than deleted, into the session's own scratch directory.
- After the owner asked a second time, in the same phrasing, to check and test everything before merging: re-ran the entire verification chain fresh, watched the actual GitHub Actions `verify` run to completion via `gh run watch` rather than only polling the checkmark, confirmed all three PR checks (`verify`, Vercel deployment, Vercel Preview Comments) passed, and then ran `npm run verify` one more time locally, after CI was already green, as the owner's explicit final gate before merging.
- No live database-backed browser click-through of the new photo manager against a real seeded product this round either — local Postgres remained unseeded; relied on the (further expanded) automated suite, including new dimension-gate test cases (`ProductPhotoManager.test.tsx`, `upload-seller-media.test.ts`'s over-both-axes/over-one-axis/exactly-at-the-limit cases).

## Security and architecture notes

- Every upload is validated in a fixed order before anything reaches storage: ownership → empty-file → byte-size ceiling → magic-byte sniff → dimension gate (header-only read) → full decode/re-encode → per-product upload-count cap → checksum dedup. Each earlier, cheaper check exists specifically to avoid paying for a later, more expensive one on a request that was always going to be refused.
- `sourceType = 'SELLER_UPLOAD'` is enforced inside the same `WHERE` clause as the ownership check on both the delete path (this session) and the original upload path, not as a separate authorization layer — a supplier's evidence row is structurally unreachable from either seller-facing mutation, not just conventionally protected.
- No `.withMetadata()` call on the `sharp` pipeline means EXIF (including GPS, if present) is dropped from the stored copy by default; `.rotate()` still bakes the orientation in as pixels first, so the photo does not flip on delivery.
- Object storage (Vercel Blob) holds only the compressed bytes; the database stores a verified public URL (`vercelBlobImageUrl.parse()`, refusing to write a row if `put()` ever returned a non-Blob host) plus small metadata (checksum, dimensions, byte size) — never the raw upload itself.
- No CJ API call, deploy, or production data mutation was made in either PR; both were built and merged strictly within `sals3-portal`'s own `develop`-based PR flow.

## Open follow-ups (not done this session)

- **`hot.md` still not updated** to reflect PR #97, #98, #99, #100, or #101 — this remains a standing gap across three consecutive sessions now (also flagged in the linked 2026-08-17 morning session note).
- **No live database-mode QA pass** on the new photo manager (upload, delete, set-cover, the 2000×2000/5 MB refusal messages) against a real seeded product in an actual browser — both PRs shipped on unit/component/e2e-fixture coverage plus green CI, not a manual click-through with real data, same standing limitation as the morning session.
- **PDP product-level SKU-hash-as-visible-text** item (from the 2026-08-15 pricing-resolver/PDP audit) remains open, untouched again this session.
- Two stray untracked scratch folders (`tmp/`, `outputs/`) were relocated out of the `sals3-portal` working tree during this session (not deleted) so the pre-commit hook's whole-repo lint could pass — they were leftover from an unrelated earlier taxonomy task and were never part of any `sals3-portal` git history. Worth a deliberate one-time cleanup pass rather than leaving them adrift in a scratch directory indefinitely.

## Git state

| PR | Branch | Merge commit | Status |
|---|---|---|---|
| [#100](https://github.com/Sals3-Official/sals3-portal/pull/100) | `feat/seller-photo-management` | `efa4b2cb154f8d918ad178a6a78cb11752dd5824` | Merged 2026-08-17 |
| [#101](https://github.com/Sals3-Official/sals3-portal/pull/101) | `feat/product-photo-manager` | `79e28b7e3c20024894e48b175e50f7b14c8f8450` | Merged 2026-08-17 |

Both PRs were merged by the owner directly (Bogs), after this session's own local verification and, for PR #101, an additional independent CI-log check and a final post-CI local re-run explicitly requested before merge.

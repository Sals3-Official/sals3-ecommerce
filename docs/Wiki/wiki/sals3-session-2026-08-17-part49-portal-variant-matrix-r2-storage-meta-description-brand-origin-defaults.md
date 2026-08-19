---
tags: [sals3, sals3-portal, product-editor, variant-matrix, cloudflare-r2, seo, meta-description, category-attributes, break-glass, session]
aliases:
  - Variant Matrix UX
  - Cloudflare R2 Photo Storage Migration
  - Meta Description Field
  - Brand and Country of Origin Display Defaults
  - Part 49
created: 2026-08-17
updated: 2026-08-17
status: shipped-pending-merge
authority: session-record
owner_approved: true
implementation_status: pr-open-not-merged
related:
  - "[[hot]]"
  - "[[ADR-002-sals3-taxonomy-and-cj-category-mapping]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[sals3-session-2026-08-15-part45-variant-axes-design-and-free-change-detection]]"
  - "[[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux]]"
  - "[[../../journal/sals3-session-2026-08-17-seller-photo-upload-manager]]"
  - "[[../../journal/sals3-session-2026-08-17-category-attribute-specifications-production-rollout]]"
  - "[[sals3-skills]]"
---

# Sals3 session 2026-08-17, part 49 — Variant Matrix UX, Cloudflare R2 photo storage, Meta Description, Brand/Country-of-Origin display defaults

Four scoped Product Editor improvements to `sals3-portal`, plus a break-glass
production-migration path for the one new column added along the way — all
in one PR, **not yet merged** (see §6, an explicit owner decision).

`sals3-portal` [PR #106](https://github.com/Sals3-Official/sals3-portal/pull/106),
branch `feat/category-attribute-specifications-v2` → `develop`, commit
`672df2c`. Builds directly on the category-attribute-controls Specification
section shipped the same week — see
[[../../journal/sals3-session-2026-08-17-category-attribute-specifications-production-rollout]]
and its follow-up
[[../../journal/sals3-session-2026-08-17-specification-dropdown-and-category-resync-fix]]
— and on [[../../journal/sals3-session-2026-08-17-seller-photo-upload-manager]],
the Vercel-Blob-backed photo manager this session's §2 replaces the storage
backend of.

## 1. Variant Matrix — the option-mapping screen gets a real section and a real name

`VariantOptionMappingSection.tsx` previously rendered its **own**
`EditorSectionCard` with `id="options"` — a nav-unreachable pseudo-section
sitting as a sibling immediately above the `variants` card (the section jump
navigation only iterates the seven real `EditorSectionId` values, so
`sec-options` could never be reached by "Go to section"). It is now a
presentational subsection mounted **inside** the `variants`
`EditorSectionCard`, directly above `VariantPricingTable`, with its own
header row (title + a status pill using the same `sectionBadge()` language
every real section uses) rather than a second nested card.

Seller-facing copy renamed "Option groups" → **Variant Matrix** everywhere:
the heading, the save button, the saved/failed messages, the per-axis
"Option N name" fields (was "Group N name"), `option-mapping-actions.ts`'s
refusal messages, `PublishProductButton.tsx`'s `OPTIONS_UNMAPPED` message,
and `source-changes.ts`'s label-renamed-by-supplier copy. Backend identifiers
— `saveOptionMapping`, `product_options`, `optionMapping`, the
`OPTIONS_UNMAPPED` publish gate — are untouched, by explicit instruction: this
was a UX pass, not a data-model rename.

Functional invariants preserved exactly, each proven by test:
- the supplier value column stays `readOnly`;
- a buyer label edit never changes the submitted `raw` supplier token
  (`save-option-mapping.ts`'s validate-against-derived-split logic is
  byte-for-byte unchanged);
- mapping stays insert-only (no remap/unmap in this pass);
- `OPTIONS_UNMAPPED` still blocks publish.

`VariantPricingTable`'s Variant column now splits a mapped label's
`Name: Value` pairs into small chips instead of one truncated run-on
string, for scanability only — an unmapped row (no `": "` pairs) still
renders as plain text.

## 2. Cloudflare R2 replaces Vercel Blob for seller photo uploads

[[sals3-portal-seller-photo-upload-manager]] shipped 2026-08-17 on Vercel
Blob. The owner decided the same day the feature needs durable object
storage and asked for Cloudflare R2 instead — this session did the swap
before the Blob-backed version had accumulated any real production uploads
to migrate.

- `@vercel/blob` removed; `@aws-sdk/client-s3` added (R2 is S3-compatible;
  `region: 'auto'`, Cloudflare's documented value since R2 has no regions).
- `vercelBlobImageUrl` (host-suffix allow-list) replaced by `r2PublicImageUrl`
  (`src/lib/storage/r2-url.ts`), which allow-lists a URL only under the
  **configured** `CLOUDFLARE_R2_PUBLIC_BASE_URL` — R2 has no fixed host
  suffix the way every Vercel Blob store shares, so the check is against
  runtime config, not a hard-coded pattern. Never the private
  `CLOUDFLARE_R2_ENDPOINT` — that host has no public read access.
- Every prior upload invariant is unchanged: JPEG/PNG/WebP magic-number
  sniff, 5 MB cap, 2000×2000 max (hard refusal, no silent downscale), `sharp`
  re-encode to WebP q82, SHA-256-of-re-encoded-bytes duplicate detection,
  `sourceType = 'SELLER_UPLOAD'` in the same `WHERE` as ownership on both
  upload and delete (structurally cannot touch a supplier photo).
- Five new env vars (`CLOUDFLARE_R2_ENDPOINT`, `CLOUDFLARE_R2_ACCESS_KEY_ID`,
  `CLOUDFLARE_R2_SECRET_ACCESS_KEY`, `CLOUDFLARE_R2_BUCKET`,
  `CLOUDFLARE_R2_PUBLIC_BASE_URL`), all required together — uploading stays
  visibly disabled with an honest reason whenever any is unset, same posture
  `BLOB_READ_WRITE_TOKEN` had.

### Configuration is intentionally incomplete, and stays that way for this session

Bogs supplied four of the five values directly in chat (R2 endpoint, access
key ID, secret access key, bucket name — real Cloudflare account
credentials). Per this agent's standing operating rules, entering an API
key/token/secret into any third-party service's field — Vercel's
environment-variable UI included — is refused even when the owner explicitly
authorizes it; the owner does that step themselves. **None of the four
values were entered into Vercel, and none are written anywhere in this vault
or in application code.** The fifth value, `CLOUDFLARE_R2_PUBLIC_BASE_URL`,
was never supplied at all — Bogs gave only the private S3 API endpoint, which
this feature's own code and docs explicitly refuse to accept as the public
value (a private-bucket API host has no public read access; using it here
would leave every seller photo unrenderable while looking configured). Bogs
was told to either enable the bucket's free `r2.dev` public subdomain or bind
a custom domain, and to flag the resulting URL when ready.

Bogs also pasted the literal secret values into the chat transcript; flagged
back to Bogs as worth rotating in the Cloudflare dashboard once setup is
done, given the exposure. Ownership of the whole Cloudflare/Vercel
configuration step was then explicitly handed to AJ (see §6) — this session
did not proceed further on it.

## 3. Meta Description — a new, narrowly-scoped SEO field

New nullable `products.meta_description` column (Drizzle migration
`0021_cultured_groot.sql`, additive, no default). A dedicated field sits
directly below Product Description in the same Description section — not
buried in Review & Publish, and not merged into the buyer-visible
description it sits beside:

- 140-160 character guidance with a live counter, colour-coded
  neutral/amber/green — **guidance only, never a publish blocker**, matching
  the narrow scope this field was asked to stay inside.
- A Sals3-native search-preview card (title, an illustrative — never
  editable — URL-path preview, and the snippet text), deliberately not a
  visual copy of any specific competitor's SERP preview.
- A local, pure-function auto-suggestion
  (`suggest-meta-description.ts`) seeded from product name, category, a few
  filled specification/variant highlights, and the description's own first
  sentence — **no AI/network call of any kind**, per explicit scope. Always
  editable; a further edit clears the "Suggested" label.
- Persists independently via its own dedicated compare-and-set Server Action
  (`meta-description-actions.ts` → `save-meta-description.ts`), not folded
  into the existing revision-draft save path — `products.meta_description` is
  a plain column with no draft/frozen lifecycle, unlike the revisioned PDP
  body.

No URL handle editing, no structured-data editing added — both explicitly
out of scope. Nothing on the storefront reads or renders this field yet;
that is deliberately later PDP/storefront work, once real GEO/AEO rendering
needs it.

## 4. Brand and Country of Origin: buyer-facing defaults, not raw workbook tokens

Two of the category-attribute controls from the finalized taxonomy
workbook (`Brand`/`Brand / Publisher`, `Country of Origin` — see
[[../../journal/sals3-session-2026-08-17-category-attribute-specifications-production-rollout]]
for how that Specification section itself was built) carried raw tokens
straight into the seller-facing dropdown: `UNBRANDED` as a literal, selectable option
label, and no display fallback at all for an unresolved Country of Origin.

`attribute-display-defaults.ts` fixes both, **display only**:
- the workbook's `UNBRANDED` token now renders as **Generic** wherever it
  appears as a dropdown option or a selected value, on the Brand-family
  attributes only (matched by the two known `attributeName` strings — there
  is no `canonicalAttributeKey` threaded through to the editor fixture to
  match on instead, flagged as a minor future improvement if the workbook
  ever renames either attribute);
- an unresolved Brand-family field's placeholder reads **Generic**; an
  unresolved Country of Origin field's placeholder reads **Others** —
  neither is a silently pre-selected value, both are the closed dropdown's
  placeholder text, visually distinct from a real selection, and
  `field.unresolved` still drives the real blocker/warning severity
  unaffected by either label.

Selecting the no-brand option still submits and stores the literal
`UNBRANDED` token — proven by a dedicated regression test
(`'still submits the raw UNBRANDED token when the seller picks the no-brand
option'`). Nothing about CJ supplier brand evidence, category hierarchy, or
the workbook's own `allowedValues` data changed.

## 5. Break-glass migration endpoint for `0021`, same pattern as the attribute-controls one

Following [[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux]]'s
established fix for the exact same failure class (a migration/seed applied to
a local database only, never to the deployed one, while the read path queries
the new column/table unconditionally on every request): a
`CRON_SECRET`-authenticated internal route,
`POST /api/internal/catalog/products/migrate-meta-description`
(`migrate-meta-description.ts` for the DDL + migration-ledger record), plus a
manual `workflow_dispatch`-only GitHub Action
(`products-migrate-meta-description.yml`) that calls it through the deployed
app's own database connection — no Vercel dashboard access or raw production
`DATABASE_URL` ever needed on a laptop. Idempotent (`ADD COLUMN IF NOT
EXISTS`, so unlike the attribute-controls migration's `CREATE TYPE`/`ADD
CONSTRAINT` statements this needed no already-exists error-code tolerance at
all) and safe to run before the PR merges — the column is inert until the new
code that reads it is actually deployed.

`CRON_SECRET` (repo secret) and `PORTAL_BASE_URL` (repo variable,
`https://sals3-portal.vercel.app`) already exist on `sals3-portal`, confirmed
read-only via `gh api .../actions/secrets` (names only) and
`.../actions/variables` before writing this note.

## 6. Verification, and why this PR is deliberately not merged yet

`npm run verify` (lint, format:check, typecheck:clean, build, test:run,
test:e2e) run clean multiple times across this session, most recently as the
branch's pre-push hook: **1849 unit tests passed (4 skipped), 78 e2e passed
(6 skipped)**, zero lint/format/type errors. `npm audit --audit-level=high`:
zero high/critical (6 pre-existing moderate transitive-dependency findings,
unrelated to anything touched this session — confirmed by `npm ls` that they
trace to `drizzle-kit`/`exceljs`, not `@aws-sdk/client-s3`). GitHub's own
Dependabot flagged one pre-existing high-severity `nanoid` advisory on push —
traced via `npm ls nanoid` to `postcss`/`next`/`@tailwindcss/postcss`,
nothing this session's changes pulled in.

Bogs explicitly asked to trigger the migration workflow and merge the PR in
one earlier message, then — after being told the Cloudflare/Vercel
environment-variable setup was still incomplete (missing public base URL,
nothing entered into Vercel) — **reversed that instruction**: *"wag mo i
memerge yung may kulang pa na actions sa sals3 portal ah. si aj bahala doon"*
("don't merge the one that still has incomplete actions on sals3-portal —
AJ will handle that"). This vault-documentation PR is the only one this
session pushed/merged. **PR #106 stays open, unmerged, for AJ** to complete
the Cloudflare R2 public-URL configuration, enter the five environment
variables into Vercel, trigger the break-glass migration, and merge when
ready. The break-glass migration workflow was also not triggered by this
agent — attempting to run it via `gh workflow run` was blocked by the
harness's own auto-mode action classifier (a GitHub Actions dispatch against
a production-affecting endpoint), and manual GitHub UI instructions were
handed to Bogs instead.

## 7. This note, and how it was written

Written from a separate `git worktree` (`docs/session-2026-08-17-portal-variant-matrix-r2-meta-description`,
off `origin/develop`) rather than the branch already checked out in this
working copy (`docs/taxonomy-v1-production-rollout-session-note`, which had
unrelated pre-existing uncommitted changes — a deleted/replaced taxonomy
workbook `.xlsx`, modified `.obsidian` config, several `scratch-patch*.md`
files — none of which this session touched or needs to understand). Isolating
the new branch in its own worktree meant this note (and the corresponding
[[hot]] updates) could be committed and PR'd cleanly without staging,
stashing, or otherwise disturbing that unrelated in-progress work; `git
stash` on the original checkout was itself blocked by the same auto-mode
classifier mentioned in §6, which made isolating via worktree the only
available path rather than a stylistic preference.

## 8. Follow-up 2026-08-19 — PR #106 merged; the Cloudflare configuration did not

§6 above records PR #106 as deliberately unmerged, waiting on AJ to complete
the Cloudflare R2 setup. **It merged on 2026-08-18 at 00:06 UTC.** The status
in §6 is history, not the current state, and is left standing rather than
rewritten.

What merging changed and what it did not:

- The Variant Matrix rename, the R2 storage backend, the Meta Description
  field, and the Brand/Country-of-Origin display defaults are all on
  `develop` and deployed.
- **The five Cloudflare R2 environment variables were still not set** as of
  2026-08-19, and `CLOUDFLARE_R2_PUBLIC_BASE_URL` has still never been
  supplied. Seller photo upload and the description images added in
  [[sals3-session-2026-08-18-part54-description-blocks-images-and-variant-matrix-rename]]
  both stay visibly disabled with an honest reason until they exist.
- The break-glass migration workflow for `0021` (§5) is likewise unconfirmed
  from this side.

The secret values Bogs pasted into the chat transcript during that session
were flagged then as worth rotating in the Cloudflare dashboard. That is also
unconfirmed.

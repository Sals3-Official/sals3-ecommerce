---
tags: [session, sals3-portal, suppliers, security, ui-ux]
aliases: [Multi-Tenant Supplier Connections and UI Overhaul Session]
created: 2026-08-07
updated: 2026-08-07
status: historical
authority: session-note
owner_approved: false
related:
  - "[[hot]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[sals3-skills]]"
  - "[[sals3-session-2026-08-07-part14-automated-candidate-evaluation-pipeline]]"
---

# Session: multi-tenant supplier connections and UI overhaul

Historical record of what happened. Current verified state lives in
[[hot]] - read that for "what's true now," this note for "how it got
there."

## Scope: implementing ADR-006/ADR-008 for real

[[sals3-session-2026-08-07-part14-automated-candidate-evaluation-pipeline]]
had just deferred "the Shopify-style CJ connection" to a separate task minutes
before it ended. This session's "NON-NEGOTIABLE DATABASE RULE" turnover
prompt reopened it: implement ADR-006 (separate Retailer/Dropshipper
registration, one immutable business model) and ADR-008 (curated Supplier
Apps, seller-owned provider credentials) against `sals3-portal#8` - the same
open, unmerged, unreviewed PR [[sals3-session-2026-08-07-part14-automated-candidate-evaluation-pipeline]]
had just created, continued as normal PR iteration (a genuinely different
situation from lesson 57's already-merged-branch mistake). Unlike that
session's preflight-engine reopening, this needed no new business/legal
number invented - ADR-006/ADR-008 were already-approved direction, so this
was implementation, not policy.

## What got built

Four new tables (`seller_accounts`, `supplier_providers`,
`supplier_connections`, `supplier_connection_secrets`), AES-256-GCM
credential encryption (AAD-bound to connection id + provider code + key
version), a `CjSupplierAdapter` behind a `SupplierProviderAdapter` interface
with its own per-connection token cache, a two-phase migration (nullable FK
-> one-time bootstrap backfill -> `NOT NULL`), and the automated
ingestion/evaluation pipeline and every seller-facing screen rewired to
source through the seller's own connection instead of the global
`CJ_API_KEY`. Full file list and reasoning: PR #8's description (updated
this session) and the commit history on
`feat/automated-candidate-evaluation-pipeline`.

## The three follow-up rounds after "done"

Bogs tested the first delivery live and came back with real product/UX
feedback across several rounds, each landed as its own commit:

1. **"What actually happens on disconnect - does it wipe products?"** No -
   disconnect is soft (row + secret stay, only `status` flips), and every
   Product Sourcing screen queries by `sellerAccountId` through
   `supplier_connections`, never by live connection status - only new
   sourcing and the raw live-browse view stop. Bogs still wanted a
   destructive-adjacent action gated, so disconnect now requires a one-time
   verification code first. Real, honest scope limit acknowledged rather
   than faked: no email/SMS provider is approved and there is still no real
   seller contact info (one `dev-user` placeholder) to send a code to, so
   outside production the code surfaces directly in the UI, clearly
   labelled - the gate itself is real and server-enforced regardless of
   delivery channel.
2. **Supplier Apps redesign.** First pass put a bare API-key input inline
   whenever no connection existed. Bogs: a new seller has never done this
   before and the CJ logo looked clickable when it did nothing. Rebuilt as
   an installable-app-style card with a guided connect dialog (numbered
   steps, a link to create a CJ account) and made the logo purely
   decorative branding.
3. **Sidebar cleanup across four more rounds** (font-size hierarchy, a
   click-to-toggle logo Bogs found undiscoverable versus the rail's own
   existing topbar button, collapsible nav groups, and a genuine
   stuck-flyout race condition during the rail's collapse animation) - see
   [[sals3-skills]] lessons 59 and 61 for the two real bugs found chasing
   the last one.

## Notable incidents this session

- **A `vercel.json` cron entry silently failed deployment for hours** after
  the actual fix (delete it, use a GitHub Actions schedule instead - Vercel
  Hobby rejects any cron more frequent than once/day) had already been made
  in the working tree by a concurrent editor, because the commit was never
  pushed. Found via `gh pr checks 8`, not assumed. [[sals3-skills]] lesson 58.
- **`getComputedStyle` and `elementFromPoint` both returned provably wrong
  values** while verifying the sidebar flyout, in this session's Browser
  pane specifically (a tab not actively displayed/composited - the same
  underlying condition that had already broken a screenshot call earlier
  this session). Caught by forcing an inline `!important` style override
  and finding it still ignored - impossible under real CSS, which is what
  gave away that the *tool* was lying, not the code. [[sals3-skills]] lesson 59.
- **The bootstrap script's idempotent re-run never restored `status` to
  `CONNECTED`** after a disconnect, only refreshing the encrypted secret -
  discovered live while restoring the real bootstrapped connection after
  testing disconnect, fixed by having it call the same `reconnectConnection`
  function the UI's own reconnect action uses. [[sals3-skills]] lesson 60.
- **Orphaned `next dev`/Turbopack processes from earlier in the session**
  repeatedly re-locked `.next` mid-commit even after being killed once,
  requiring `Get-CimInstance Win32_Process` (command-line matching, not just
  PID) to find and kill the *right* stray node processes without touching
  unrelated MCP server processes also named `node.exe`. Same root condition
  as the vault's own already-documented skill 22, reached via yet another
  path.
- A CJ logo asset requested by filename (`E:\sals3-ecommerce\Untitled-1.png`)
  was read, confirmed to be the real Sals3 mark, and copied into
  `sals3-portal/public/brand/` - copying a user-provided local image file
  between two of the user's own repos on explicit instruction, not a
  download from an unverified source.

## Delivery discipline

Five commits, each independently passing the full `npm run verify` gate
(husky's pre-commit/pre-push hooks re-ran it every time) before being pushed
- multi-tenant schema/pipeline, Supplier Apps UI/security, sidebar redesign,
the Vercel Cron retirement (fixing PR #8's failing deployment check), and a
README correction pass. Nothing was committed or pushed until Bogs
explicitly asked for a PR, per his own standing instruction earlier in the
turnover.

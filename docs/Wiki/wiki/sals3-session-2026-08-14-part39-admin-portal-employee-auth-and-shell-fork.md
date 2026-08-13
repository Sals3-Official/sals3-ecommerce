---
tags: [sals3, sals3-admin-portal, authentication, design-system, accessibility, session, database-backed]
aliases:
  - Admin Portal Employee Auth and Shell Fork
  - Admin Portal Sign-in
  - Part 39
created: 2026-08-14
updated: 2026-08-14
status: implemented
authority: session-record
owner_approved: true
related:
  - "[[ADR-014-admin-portal-platform-governance-and-global-controls]]"
  - "[[ADR-015-commercial-pricing-governance-category-product-and-fx-adjustments]]"
  - "[[sals3-session-2026-08-11-part32-admin-portal-control-tower-direction]]"
  - "[[sals3-session-2026-08-09-part20-portal-shell-redesign]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[hot]]"
---

# 2026-08-14 - part 39 - Admin Portal gets real employee sign-in and a forked Portal shell

`sals3-admin-portal` branch `chore/admin-portal-bootstrap`. Everything below is
local and verified; nothing is deployed, and this application has no hosting
target yet.

## Why this session happened

The bootstrap build (`f069716`) shipped a landing page that was three
`UnavailableNotice` cards on a blank page. The owner's reaction was the useful
finding: it did not look like a fork of `sals3-portal` at all.

That was accurate, and the earlier report had been misleading by omission. The
bootstrap commit forked Portal's **theme** - radius, spacing, type, focus and
reduced-motion rules - and said so. It did not fork Portal's **shell**, and did
not say so. Portal's signed-in surface is a 1,054-line shell (nav rail, topbar,
flyout, footer) over ~25 UI primitives; Admin Portal had three primitives and no
shell.

This session closed that gap and, on the way, replaced the colour theme.

## What was built

### 1. Employee identity - real, not a placeholder

Admin Portal now has its own PostgreSQL database, `sals3_admin`, owned by a
dedicated least-privilege role `sals3_admin_app`, on the same local Postgres 17
server `sals3-portal` already uses. A separate database, not a schema inside
Portal's - AGENTS.md rule 4.

Two tables (`drizzle/0000_strong_forgotten_one.sql`, applied):

- `employees` - id, email (unique), password hash, created_at
- `employee_sessions` - opaque id, employee_id, created_at, expires_at

**Better Auth was evaluated and rejected for this slice** by owner decision. It
brings 2FA, email verification, and a rate-limit store this application has no
use for yet, and its adapter would have been configured against features nothing
enforces. The replacement is deliberately small:

- `src/lib/auth/password.ts` - Node `scrypt`, random per-password salt, and
  `timingSafeEqual` comparison.
- `src/lib/auth/session.ts` - server-side session rows behind an httpOnly
  cookie. Opaque and database-backed rather than a self-verifying signed token,
  so sign-out **revokes** the session instead of only asking the browser to
  forget a cookie that would otherwise stay valid until expiry.
- `POST /api/auth/sign-in` - re-validates with Zod, then returns one
  byte-identical `401 {"error":"invalid_credentials"}` for every failure. An
  unknown address is still hashed against a dummy hash so a missing account and
  a wrong password cost the same work; response timing cannot disclose which
  addresses are registered. Same posture as
  [[ADR-009-server-verified-email-password-authentication]].

**There is no signup route, and there must not be one.** Employee rows are
created only by `npm run create-employee -- <email> <password>`, behind the
same `scripts/guard-remote-db.mts` refusal Portal uses: a non-local
`DATABASE_URL` stops the command before it writes, and the refusal prints the
host and database but never the connection string.

### 2. The Portal shell, actually forked

Copied from `sals3-portal` and adapted: `ui/sidebar.tsx` (723 lines), `sheet`,
`tooltip`, `separator`, `skeleton`, plus the Base UI `button`/`input`/`label`
that replaced the hand-written ones, and the `use-mobile` /
`use-tablet-or-below` hooks. `@base-ui/react` was added as a dependency.

The shell keeps Portal's real behaviour, not a lookalike: collapsible rail
(268px ↔ 60px), two-level nav tree, the portalled hover-intent flyout including
both bugs Portal's own design calls out (`getBoundingClientRect` positioning to
escape `SidebarContent`'s `overflow-hidden`, and a shared close timer so
crossing the icon-to-panel gap does not dismiss it), sticky topbar, and
auto-collapse below ~1024px that does not overwrite the user's preference.

Three deliberate divergences from Portal, each because copying would have been
a claim this repository cannot back:

- **No permission filtering on the rail.** Portal filters nav by
  `can(session.role, item.permission)`. No employee permission model exists
  here, so a filtered rail would be theatre.
- **No badges or counts anywhere.** Portal badges only what a real query backs
  and omits the rest, because a missing figure is never a zero. Nothing here has
  an authoritative counting service, so no row carries a number. A test asserts
  no nav label contains a digit.
- **No role line in the topbar.** Portal prints the signed-in role; printing
  "Administrator" here would claim an authority level nothing grants.

### 3. Navigation from ADR-014, and honest destinations

`src/lib/admin/navigation.ts` encodes the six capability domains ADR-014 names,
plus an Overview - not an invented menu. Seller operating countries and buyer
destination countries are **two separate destinations**, with a test asserting
it, because collapsing them into one entry is the first step toward the single
ambiguous `marketCode` the ADR forbids.

Each of the nine routes renders an `UnavailableNotice` naming what is missing
and who owns it. Navigating to a page that states plainly what is not built is
not a fabricated console; rendering a plausible total there would be.

`/seller-accounts` and `/providers` are `NOT_CONNECTED` rather than
`NOT_IMPLEMENTED` - their data lives in Portal's database, which this
application must never read directly. The distinction is the point: one is
engineering work, the other needs a published control-plane boundary.

### 4. Colour: burgundy, at Portal's own lightness

The owner asked for red at the same shade/darkness as Portal's blue. That was
implemented literally rather than by eye: each Portal blue was converted to
OKLCH, its **lightness** held, and the colour re-rendered at a red hue.

| Portal | Admin | Lightness |
|---|---|---|
| rail `#0b2c4d` | `#481921` | 0.2889 → 0.2883 |
| rail hover `#123a61` | `#5b242d` | 0.3424 → 0.3421 |
| rail edge `#1d4670` | `#6a2f38` | 0.3871 → 0.3876 |
| accent `#e7eef3` | `#f3eaeb` | 0.9453 → 0.9449 |
| background `#f6f7f8` | `#f8f6f7` | 0.9757 → 0.9753 |

**`--primary` is one deliberate exception, and it is the interesting part.** A
same-lightness conversion of Portal's `#0a5c8a` lands on `#863b40`, which sits
**1.18:1** from `--destructive` - two reds of near-identical lightness,
indistinguishable to most eyes and completely so with a red-green deficiency. A
"save" button and a "delete" button would have read the same in a control plane
whose destructive actions are global.

Portal can afford that collision because its own primary and danger differ by
*hue* while measuring only **1.10:1** apart in lightness. A red-on-red theme has
no such luxury. So `--primary` was pulled to L 0.40 at a burgundy hue (h 8)
while `--destructive` keeps Portal's scarlet (h 29.5), separating brand from
danger on **both** axes: 0.100 lightness and 21 degrees of hue.

All **46 foreground/background pairs pass WCAG 2.1 AA** across light and dark,
validated by parsing the shipped `globals.css` rather than by trusting the
working notes. Three pairs measure below 3:1 - `--input` on card/background and
`--sidebar-border` on `--sidebar`. Those are inherited from Portal at parity
(Portal's own measure 1.47/1.37/1.46; these measure 1.51/1.40/1.45), they are
decorative separators rather than control boundaries, and the real focus
indicator is `--ring` at 9.11:1.

Because the brand is now itself red, Portal's rule that danger/warning/success
keep the same meaning matters more here than it did under the old violet theme:
every status must also carry a written label, and colour is never the only
signal.

### 5. Accessibility additions beyond the fork

- **Skip link** to `#admin-main`. The rail is a long list of links before the
  content in tab order; without it a keyboard user tabs the whole rail on every
  navigation.
- `aria-current="page"` on the active nav row, alongside the existing 3px accent
  edge - the active state was previously colour-only.
- The flyout opens on `onFocus` as well as hover, so it is keyboard-reachable.
- Exactly one `<main>` per page. `SidebarInset` is itself the page's `<main>`,
  so the content column inside it is a plain `div`; an e2e test asserts the
  count.

## Verification

`npm run verify` passes end to end: lint, format, typecheck, build, **57 unit
tests**, **8 e2e tests**.

Notable regression guards, chosen because they protect decisions rather than
implementation details:

- No page renders a digit outside the brand name - the ADR-014 fabricated-console
  guard, carried over from the bootstrap build to the new Overview.
- No nav label contains a digit, and the nav object contains no `badge` or
  `count` key.
- Seller-country and buyer-destination remain two separate nav destinations.
- Collapsing the rail must actually **narrow** it: the e2e test asserts the
  measured width drops below 100px, not just that `data-state` flipped. This
  caught nothing in the end, but it was written because a cosmetic-only collapse
  is exactly the failure that looks fine in a screenshot.
- The whole `(admin)` group redirects to `/` once signed out.

One process note worth keeping: the in-app preview browser served a **stale CSS
chunk** for the whole session - 87 rules parsed against a 75KB file with 36
matching rules - which made the collapsed rail appear stuck at 268px. Playwright,
on a clean profile, passed the same assertion. Browser-cache staleness reads
exactly like a CSS bug; the fresh-profile test run is what settled it.

## Boundaries held

- Admin Portal's database is separate from Portal's and reads none of its tables.
- Seller identity never reaches an Admin capability. Portal's seller-facing
  Better Auth client was deliberately **not** imported for the sign-in form,
  even though it was the obvious shortcut.
- `/pricing` states ADR-015's boundary on its face: this must never become a
  cross-tenant pricing editor.
- No secret reaches the client. `DATABASE_URL` and `SESSION_SECRET` are
  server-only; `.env.example` carries names only.

## Still open

1. **No permission model.** Sign-in proves identity only. There is no role, no
   scope, and no step-up authentication, so every signed-in employee sees the
   same thing. This is the blocking prerequisite for any real capability - there
   is no point building market governance before something can authorize who may
   change it.
2. **No audit table.** Until one exists, no action in this application may be
   consequential.
3. **All six domains are notices.** No policy store, no publication endpoint, no
   Portal-side consuming path.
4. **`ADMIN_POLICY_PUBLICATION_TOKEN` is a named placeholder** that nothing
   reads.
5. **No deployment target.** Everything is local; the migration has run only
   against local Postgres.
6. **Session lifetime is a flat 12 hours** with no refresh, idle timeout, or
   revocation UI beyond sign-out.

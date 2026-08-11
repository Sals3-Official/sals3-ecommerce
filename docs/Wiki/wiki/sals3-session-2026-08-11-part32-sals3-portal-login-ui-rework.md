---
tags: [sals3, session, sals3-portal, auth, login, ui, accessibility]
aliases: [Sals3 Portal Login UI Rework, Portal Login Redesign]
created: 2026-08-11
updated: 2026-08-11
status: session-note
authority: session-record
owner_approved: true
implementation_status: implemented-uncommitted
related:
  - "[[hot]]"
  - "[[ADR-009-server-verified-email-password-authentication]]"
  - "[[sals3-session-2026-08-07-part14-email-password-auth]]"
---

# Sals3 session 2026-08-11, part 32 — Sals3 Portal login screen UI rework

`sals3-portal`, working tree only. **Not committed, not pushed, no branch created, no PR opened** — the owner has not asked for that yet. All file paths below are relative to `E:\sals3-portal`.

## 1. Starting point

Claude received `CLAUDE_TURNOVER_SALS3_PORTAL_LOGIN_UI_REWORK.txt`: a focused visual/structural rework of `/login`, using a standalone prototype (`Sals3 Portal Login.dc.html`, from a design-handoff bundle in `E:\Downloads\Project setup and blockers\`) as visual reference only — not to be copied verbatim — while preserving every existing authentication capability.

The handoff bundle's own `CODEX_LOGIN_HANDOFF.md`/`CLAUDE_CODE_HANDOFF.md` describe a much larger, separately-scoped Seller Center shell/screens redesign (rail rework, Attention Center, Overview, Supplier Apps generalization, proposed `/listings` route, etc. — see that bundle's `design_handoff_sals3_portal/README.md`). None of that was in scope here; only the turnover's explicit login-screen instructions were executed. The prototype also showed Phone/Email login tabs, Google/Facebook OAuth, a language selector, fabricated stats (markets live, supplier SKU count, payout cycle), and a "Seller access · Philippines" region label — the turnover's **approved product decisions explicitly overrode all of these**: email/password only, no OAuth, no locale switcher, no invented numbers, no ambiguous region claim, and branding on this route is "Sals3 Portal" rather than the app's general "Seller Center" name.

## 2. What was built

**New files:**
- `src/components/auth/LoginBrandPanel.tsx` — server component. Desktop/tablet (`lg:` and up) dark `--sidebar`-toned `<aside>`: mark + "Sals3 Portal" wordmark, headline, one-line subhead, three capability statements as a `<dl>` (Supplier catalogue / Automated product evaluation / Operational visibility, each with a Lucide icon), "Secure seller operations" footer, two `aria-hidden` CSS-only decorative circles (no raster asset, no new hex — all colors are existing `--sidebar*` tokens). Below `lg`, a separate compact dark header block (mark + wordmark + headline + subhead only) renders instead — pure CSS `hidden lg:flex` / `lg:hidden` toggling, verified via computed-style inspection at 390/1024/1440px, not a duplicated form.
- `src/components/auth/PasswordField.tsx` — small isolated client component: label + conditional "Forgot password?" link + `Input` + a real `button type="button"` Show/Hide toggle (Lucide `Eye`/`EyeOff`, reused `Button` `variant="ghost" size="icon-sm"`) whose accessible name flips between "Show password" and "Hide password". Toggling swaps the input's `type` only; the form value is untouched.

**Changed:**
- `src/app/(auth)/login/page.tsx` — rebuilt as a two-column `LoginBrandPanel` + white (`bg-card`) form panel, with "New to Sals3? Create an account" top-right and "Log in to Sals3 Portal" as the page's one `<h1>`. No longer uses the shared `AuthShell` (that component was intentionally left untouched — see §5).
- `src/components/auth/LoginForm.tsx` — now renders `PasswordField` instead of a bare password `Input`; submit button label changed "Sign in" → "Log in"; both inputs and the submit button sized `h-11` (44px) for touch-target compliance. **`onSubmit` itself — Zod validation, safe `next` redirect, generic credential error, 2FA redirect, pending-state guard — is unmodified.**

## 3. What was explicitly excluded (per the turnover's approved decisions, not a guess)

No Phone/Email segmented tabs, no phone input, no Google/Facebook buttons, no language selector, no "markets live / supplier SKUs / payout cycle" stats, no "Seller access · Philippines" region label, no fabricated help-centre/service-status links. Confirmed by a dedicated test file (`src/app/(auth)/login/page.test.tsx`) that asserts every one of these is absent, plus a live accessibility-tree read of the rendered page.

## 4. A real cross-cutting consequence, not silently absorbed

`src/app/page.tsx` (the root `/` route) is a pre-existing, untouched, exact duplicate of the old `/login` page — same `AuthShell`, same "Sign in"/"Seller Center" copy — and it renders the same shared `LoginForm`. Because `LoginForm`'s button label changed, `/` now also shows "Log in" as a side effect, even though its layout and "Seller Center" branding were deliberately left alone (out of the turnover's explicit scope, which named only `/login`). This broke two pre-existing tests that asserted the old "Sign in" label (`src/app/page.test.tsx`, `e2e/home.spec.ts`) — both fixed to match the now-correct rendered output, not silently skipped. Flagged to the owner as an unresolved design mismatch: `/` and `/login` are functionally duplicate routes with now-diverging branding, and nobody has decided whether `/` should be aligned, redirected, or removed.

## 5. What was deliberately left alone

`src/components/auth/AuthShell.tsx` is shared by five other routes (`/signup`, `/reset-password`, `/setup-2fa`, `/two-factor`, `/auth/pending`) plus `/`. None of those were in scope, so a new composition was built directly in `login/page.tsx` instead of changing `AuthShell`'s behavior for every consumer. Better Auth configuration, cookies, session lifetime, rate limiting, CSRF, redirect allow-listing, and 2FA policy were not touched. `next.config.ts`'s existing `noindex`/`no-store` headers for `/login` already covered the route; no change was needed there.

## 6. Environment blockers found and resolved

1. **Vitest default `forks` pool hangs on this Windows machine** — `npx vitest run` (no override) times out spawning worker processes (`[vitest-pool-runner]: Timeout waiting for worker to respond`) on every file, not specific to this change. `--pool=threads` runs the identical suite in ~14s. This means the literal `npm run verify` chain would stall at its `test:run` step on this machine; every constituent command was instead run and verified individually.
2. **`npm run typecheck:clean` failed `EPERM` renaming `.next`** — a live `next dev --port 3001` process (PID 5032, parent `npm run dev` PID 31276) plus its Turbopack worker (PID 6380) were running in this repo and holding `.next` open. Identified via `Get-CimInstance Win32_Process` command-line inspection (not a blind kill of all Node processes — dozens of unrelated MCP-server Node processes were also running and left untouched). Owner approved stopping it via `AskUserQuestion`; stopped, `typecheck:clean` then passed cleanly.

## 7. Validation evidence

- Focused new/changed tests (`LoginForm.test.tsx`, `PasswordField.test.tsx`, `login/page.test.tsx`, `AuthShell.test.tsx`) — 8/8 pass.
- `npm run test:run` (`--pool=threads` workaround) — **650 passed, 4 skipped, 0 failed** (after fixing the `page.test.tsx` button-label assertion described in §4).
- `npm run lint` / `npm run format:check` / `npm run typecheck:clean` / `npm run build` — all pass; `/login` prerenders as static content.
- `npm audit --audit-level=high` — 0 high/critical (exit 0); 4 pre-existing moderate advisories in `drizzle-kit`'s dev-only `esbuild`/`@esbuild-kit` chain, unrelated to this work (same pre-existing finding noted in [[sals3-session-2026-08-11-part30-cj-legacy-continuous-discovery-implementation-review]]).
- `npm run test:e2e` — **51 passed, 1 skipped (pre-existing, unrelated), 0 failed** (after fixing the `home.spec.ts` locator described in §4 — Playwright's `getByLabel` does case-insensitive substring matching by default, so `getByLabel('Password')` started ambiguously matching both the password input and the new "Show password" toggle button; changed to `getByRole('textbox', { name: 'Password' })`).
- Live browser verification (Claude Browser pane, no screenshot compositing available in this sandbox, so verified via accessibility-tree reads, computed-style/`getBoundingClientRect` JS checks, and a real click through the toggle): correct `aside`/mobile-header CSS toggling at 390/1024/1440px, zero horizontal overflow at any of those widths, 44px input height, 28px toggle button (clears WCAG 2.5.8's 24px minimum), no Password-label/Forgot-password-link collision at 390px, zero console errors, and a real click flipped the input `type` and the toggle's accessible name.

## 8. What is still not done

- No commit, branch, push, or PR — this is uncommitted working-tree state only, per instruction not to commit/push without the owner asking.
- `README.md` was deliberately **not** updated: it documents no prior visual detail of `/login`, no login-method change occurred, no new asset or env var was added, and no material limitation was introduced — nothing in it went stale.
- The `/` vs `/login` duplicate-route mismatch from §4 is unresolved and needs an owner decision, not a guess.
- No Obsidian vault "make this an ADR" step was taken — this is a UI/visual pass on an already-approved auth flow, not a new architectural or business-rule decision, so a session note (this file) is the right record, not a new ADR.

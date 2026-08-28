# Turnover 2026-08-28 — the category images a redirect is swallowing

Copy everything below the line into a fresh agent session.

---

## Your task

**Category images are broken in production on `sals3-ecommerce`.** All 21 department photographs 404. Fix it, prove it, and merge.

## Read first, before touching anything

This repository has mandatory rules and they are not optional:

- `AGENTS.md` at the repo root, and the wiki it points at — read `hot.md` first, then `agent-operating-contract.md`, `nextjs-component-security-code-rules.md`, and `project-structure-installation-and-runbook.md`.
- Read `hot.md` through `git show origin/develop:docs/Wiki/wiki/hot.md`, **not** from the working tree — the local checkout is often behind. It is ~180 KB over ~700 lines, so read it in slices of 15–20 lines; asking for 100 at once returns nothing usable. `grep -n '^#\{1,3\} '` on it is the cheapest orientation.
- **Never commit, push, or merge unless the owner asks.** For this task the owner has asked: fix, PR, merge.
- **Do not work in `E:\sals3-ecommerce` directly.** It is shared with other agents and usually has someone's uncommitted work in it — at the time of writing, another agent has an unfinished `ADR-018` and edits to `index.md` and `vault-catalog.md` sitting there. Build in an isolated worktree off `origin/develop` and leave that checkout untouched.

## The defect, already diagnosed

Do not re-investigate this from scratch. It is confirmed against production:

```
/categories/apparel-accessories.webp
  → 307 → /au/categories/apparel-accessories.webp
  → 404
```

The cause is in `next.config.ts`, and it was introduced by [#172](https://github.com/Sals3-Official/sals3-ecommerce/pull/172) (the markets refactor, merged 2026-08-27):

```ts
const MARKET_MOVED_ROUTES = ['/p', '/c', '/search', '/categories', '/cart'];

async redirects() {
  return MARKET_MOVED_ROUTES.map((source) => ({
    source: `${source}/:path*`,
    destination: `/au${source}/:path*`,
    permanent: false,
  }));
}
```

Six shopping routes moved under `/[market]`, so the old market-less URLs redirect to `/au/…` so existing links keep working. **`/categories/:path*` also matches the static asset directory `public/categories/`**, which holds all 21 department photographs and shares the path prefix with the route. Every one of them is redirected into a market path where no file exists.

Symptoms to expect while you work:

- `/ph` (or `/au`) home: the "Shop by category" grid renders 21 `<img>` elements with correct `src` values, all with `naturalWidth === 0`.
- `/ph/categories`: the all-departments page shows **no** category photographs at all.
- `curl -I https://sals3-ecommerce.vercel.app/categories/electronics.webp` → `307`.

The same trap applies to any other static directory whose name collides with a moved route. **Check `public/` for all five prefixes** (`/p`, `/c`, `/search`, `/categories`, `/cart`) before you decide the fix is complete — `/c` in particular is a short prefix and worth checking carefully.

## What the fix must preserve

The redirects exist for a real reason and must keep working. Do not delete them.

- The deployed site is in use and its old links are in browser history and in the owner's notes. `/cart`, `/p/<id>`, `/c/<slug>`, `/search`, `/categories` must all still reach their `/au/…` equivalents.
- They are **temporary (307), not permanent, deliberately.** A 308 would assert the content lives at `/au` — but the same product also lives at `/ph`, and which market a person belongs on depends on who is asking. A permanent redirect is cached by every browser and proxy and would take that choice away. Keep them temporary and do not "tidy" this.
- `/xx` (an unrecognised market) must keep returning **404**, not a redirect to Australia.

`next.config.ts` supports `missing` and `has` conditions on a redirect, and a `source` pattern can be made more specific than `:path*`. There is more than one defensible fix; pick one and write down in the file why the naive `:path*` was wrong, so the next person does not reintroduce it.

## How to prove it

A green test suite will not prove this on its own — the defect lives in `next.config.ts` redirect matching, which the unit tests do not exercise against real asset paths.

1. `npm run verify` must exit 0. Capture the **real exit code** (`npm run verify; echo "EXIT=$?"`), do not read pass/fail off a piped tail.
2. Add a regression test. `test/next-config-headers.test.ts` already asserts things about the redirect table — extend it so **a static asset path under a moved prefix is not redirected**, while the route path still is. That is the assertion that would have caught this.
3. Verify in a browser against your dev server: the home grid images have `naturalWidth > 0`, and `/…/categories` shows department photographs.
4. After merge, verify on production: `curl -o /dev/null -w "%{http_code}" https://sals3-ecommerce.vercel.app/categories/electronics.webp` must be **200**, and the home grid must render photographs.

## Traps in this repository, learned the hard way

- **`npm run verify` fails at `typecheck:clean` while a dev server is running.** The script renames `.next` out of the way and a live `next dev` holds it, giving `EPERM`. Stop the preview server first. Do the browser pass, then stop the server, then verify.
- **Both husky hooks run the full `verify`** (2–3 minutes). Default tool timeouts kill it mid-hook; that is a timeout, not a hook failure. Use a 600s timeout and do not reach for `--no-verify`.
- **"No differences" and "no data" look identical.** If you diff two `grep` extractions, assert both inputs are non-empty first — a broken pattern reports "nothing changed" for free.
- **When a check disagrees with the code, suspect the check.** A recent false alarm came from a case-sensitive search against CSS-uppercased text.
- The in-app browser pane's synthetic clicks do not drive some dialog triggers; `element.click()` via the JS tool does. And two different `ref_N` clicks can land on the same coordinate, so verify with `getBoundingClientRect()` before trusting one.

## When the code is merged

Write the vault note. Every merged code PR in both repositories currently has vault coverage and that should stay true — the last sweep closed the gap at parts 82 and 83.

- Session notes live in `docs/Wiki/wiki/sals3-session-<date>-part<NN>-<slug>.md`. **The next number is 84.**
- A vault change is a normal `sals3-ecommerce` PR touching only `docs/**`, against `develop`, branch named `docs/<topic>`.
- Update `hot.md`: the entry for #172 in Implemented foundations should record this regression, and the reusable-lessons section is where the general form belongs.
- The general lesson worth writing, if it holds up once you have fixed it: **a redirect pattern is a namespace claim, and `public/` shares that namespace with the router.**

Do not add the note to `index.md` or `vault-catalog.md` — another agent is mid-edit in those files.

## Context you will want

- Part 82 (`docs/Wiki/wiki/sals3-session-2026-08-28-part82-…`) records the markets refactor that introduced this, including why the redirects are temporary and why an unknown segment 404s.
- The markets vocabulary is `src/lib/destination/markets.ts` — `au`, `ph`, `fj`, with `au` the default.
- Checkout still accepts **AU and PH only**; `/fj` is a real shopfront that says plainly it cannot take an order. That is deliberate, not something to fix here.

## Report honestly

If the fix turns out to be larger than described, or the diagnosis above is wrong, say so rather than forcing it. Report what you verified yourself against what you took from this document — this turnover was written by the agent whose change caused the defect, and it has been wrong before.

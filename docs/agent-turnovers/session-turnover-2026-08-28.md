# Session turnover — 2026-08-28

Copy everything below the line into a fresh agent session.

---

## Read first

- `AGENTS.md` at the repo root and the wiki it points at. Read `hot.md` via
  `git show origin/develop:docs/Wiki/wiki/hot.md` — **not** the working tree,
  which is usually behind. It is ~180 KB over ~700 lines; read it in 15–20 line
  slices, and use `grep -n '^#\{1,3\} '` on it for orientation.
- **Never commit, push, or merge unless the owner asks.**
- **Do not work in `E:\sals3-ecommerce` or `E:\sals3-portal` directly.** Both are
  shared with other agents and usually hold someone's uncommitted work. At the
  time of writing another agent has an unfinished `ADR-018` plus edits to
  `index.md` and `vault-catalog.md` in the ecommerce checkout — **leave those
  alone.** Build every PR in an isolated `git worktree` off `origin/develop`.

## Do this first — a live regression, and it is mine

**All 21 category photographs 404 in production.**

```
/categories/apparel-accessories.webp
  → 307 → /au/categories/apparel-accessories.webp → 404
```

Cause: `MARKET_MOVED_ROUTES` in `next.config.ts`, added by
[#172](https://github.com/Sals3-Official/sals3-ecommerce/pull/172). The
`/categories/:path*` redirect also matches the static asset directory
`public/categories/`, which shares the prefix with the route.

**A full brief with the fix constraints, the traps, and how to prove it is at
`docs/agent-turnovers/category-images-turnover-2026-08-28.md`.** Start there.
Check the other four prefixes (`/p`, `/c`, `/search`, `/cart`) against `public/`
too — `/c` is short and worth checking carefully.

## What shipped this session

**`sals3-portal`**

- [#203](https://github.com/Sals3-Official/sals3-portal/pull/203) — a **Global**
  pricing scope for countries with no column of their own. No DDL: it is
  `market_code IS NULL`, whose meaning changed from "all destinations" to "the
  countries we have not named". `fanOutUnscopedMargins` was deleted because it
  would have shredded every Global rule and reported a clean no-op.

**`sals3-ecommerce`**

- [#170](https://github.com/Sals3-Official/sals3-ecommerce/pull/170) — the site
  resolves where a buyer is shipping and says on the cart when it cannot ship
  there.
- [#172](https://github.com/Sals3-Official/sals3-ecommerce/pull/172) — a
  shopfront per country at `/au`, `/ph`, `/fj`. **This one caused the regression
  above.**
- [#173](https://github.com/Sals3-Official/sals3-ecommerce/pull/173) — an
  approximate local price (AUD/PHP/FJD) beside the USD one.

**Vault** — parts 77 through 83, plus
`cross-border-rest-of-world-selling-reference`, plus amendments to ADR-003 and
two to ADR-015. Every merged code PR in both repositories currently has vault
coverage. **The next session-note number is 84.**

## Owner decisions made this session — do not relitigate these

- **Global was refused as a storefront.** The owner saw its real cost and said
  no. It survives only as a *pricing scope* in the portal.
- **Subdirectories, not a ccTLD per country.** `.ca` cannot be bought by an
  Australian company, `.com.fj` renews at US$656, and six ccTLDs would mean six
  session cookie jars.
- **Markets are `au`, `ph`, `fj`**, with `au` the default. `/fj` is a real
  shopfront that states plainly it cannot take an order — that is deliberate.
- **USD remains the charged currency** (ADR-003 §3). The local price is an
  approximate display only and must never become a `Money`.
- **The `.com` is the brand hub and country selector**, not a storefront.

## Open, and needing the owner rather than an agent

- **`NEXT_PUBLIC_SITE_URL` is unset**, so every canonical URL and the whole
  `hreflang` set are omitted. This matters more now than before: `/au` and `/ph`
  are byte-identical apart from the local price, which is exactly the
  duplicate-content case those tags exist for. Needs Vercel access.
- **`sals3.com` still serves SiteGround**, not this storefront (`SG-Captcha`,
  `X-Robots-Tag: noindex`).

## Open engineering work, in rough priority

1. **The category images** — above.
2. **The checkout address form.** Checkout accepts **AU and PH only**. The real
   blocker is not the country enum — it is that the form is dropdown-driven from
   closed region and city lists per country (`CHECKOUT_COUNTRY_DETAILS`, 342
   lines for two countries). It does not generalise. The researched answer is to
   vendor Google's `libaddressinput` metadata at build time (**34 KB gzipped for
   252 countries**, CC BY 4.0, attribution only), drive the form from it, and
   make city free text — which is what Shopify, Amazon, eBay and Stripe all do.
   Full brief in the vault.
3. **A duty model**, before any destination beyond the six is opened. Three
   documented shapes, in `cross-border-rest-of-world-selling-reference`.
4. **Sanctions and category deny-lists.** **CJ performs no destination
   screening** — it returned live shipping quotes for North Korea, Iran, Cuba
   and Syria. Any widening must enforce this in our own code.

## Two live defects worth knowing about, unfixed

- `postalCode` and `region` are unconditionally required in the checkout schema.
  Correct for AU/PH, wrong for the ~70 countries with no postal code.
- Australia is our **most expensive** freight lane of the six — US$5.23 against
  the Philippines' US$2.06 on an identical 50 g parcel. Fiji is cheap but
  **20–60 days** with no fast option.

## Traps in these repositories

- **`npm run verify` fails at `typecheck:clean` while a dev server is running** —
  the script renames `.next` and a live `next dev` holds it. Stop the preview
  server first. Browser pass, then stop, then verify.
- **Both husky hooks run the full `verify`** (2–3 min). A default tool timeout
  kills it mid-hook; that is a timeout, not a failure. Use 600s. Do not reach for
  `--no-verify`.
- **Capture real exit codes** — `npm run verify; echo "EXIT=$?"`. Reading
  pass/fail off a piped tail has been wrong here before.
- **"No differences" and "no data" look identical.** Assert your inputs are
  non-empty before trusting a diff of two `grep` extractions.
- **A mock written from your own reading of the docs tests your reading, not the
  integration.** This session shipped a parser that would have returned `null` on
  every real call with eleven green unit tests, because the fixtures shared the
  misreading. Where a module parses someone else's response, one test must touch
  the real thing.
- **Two correct halves can contradict each other and no unit test can see it.**
  Happened twice this session; both were found by loading the page.
- **Do not soften a security guard to stop it firing.** The client-bundle import
  scanner fired on a comment; teaching it to strip comments made a string
  containing `/*` enough to hide a real `server-only` import. Change what tripped
  it.
- **`gh pr merge --delete-branch` fails after merging** when `develop` is checked
  out in another worktree — the merge succeeded, only the local cleanup failed.
  And `git push origin --delete` fires the pre-push hook; use
  `gh api -X DELETE repos/.../git/refs/heads/<branch>` instead.

## Vault conventions

- Session notes: `docs/Wiki/wiki/sals3-session-<date>-part<NN>-<slug>.md`.
- A vault change is a normal `sals3-ecommerce` PR touching only `docs/**`,
  against `develop`, branch `docs/<topic>`.
- Deviating from an ADR is allowed and is **recorded by amendment**, not left in
  a commit message.
- Label anything that rests only on a PR body. Say plainly what was not proven.

## Report honestly

This turnover was written by the agent whose change caused the category-image
regression. Verify what you can and say which claims here you took on trust.

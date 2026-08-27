---
tags:
  - sals3
  - sals3-ecommerce
  - routing
  - markets
  - static-assets
  - regression
  - session-note
aliases:
  - Part 84
  - The Redirect That Claimed The Picture Folder
created: 2026-08-28
updated: 2026-08-28
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-session-2026-08-28-part82-a-shopfront-per-country-and-a-price-in-local-money]]"
  - "[[sals3-session-2026-08-27-part81-the-site-learns-where-it-is-shipping]]"
---

# Part 84 — the redirect that claimed the picture folder

`sals3-ecommerce` [#175](https://github.com/Sals3-Official/sals3-ecommerce/pull/175)
— the market redirects stop swallowing `public/` assets (merged `b4fd282`,
owner go-ahead given in session).

**No DDL, no migration, no new dependency, no CJ call.** One character class in
`next.config.ts`, a regression test, and a README paragraph.

## 1. All 21 department photographs 404ed in production for a day

Observed directly before the fix, not taken from the handover:

```
GET /categories/electronics.webp
  307 -> /au/categories/electronics.webp
  404
```

Part 82 moved six shopping routes under `/[market]` and kept the old
market-less URLs alive with a redirect per prefix:

```ts
const MARKET_MOVED_ROUTES = ['/p', '/c', '/search', '/categories', '/cart'];
source: `${source}/:path*`  ->  destination: `/au${source}/:path*`
```

`/categories/:path*` matched the **static asset directory**
`public/categories/` exactly as readily as the route that shares its name.
Every photograph was redirected into a market path where no file exists.
Redirects are evaluated **before** the static-file handler, so nothing
downstream could rescue them — and the home page's "Shop by category" grid
rendered 21 `<img>` elements with correct `src` values and
`naturalWidth === 0`.

**A redirect `source` is a claim over a namespace, and `public/` shares that
namespace with the router.** That is the whole lesson, and it is not specific to
this repository.

Only one directory collided. `public/` holds `ads/`, `categories/`,
`home-promos/` and nine root files; only `categories/` sits under a moved
prefix. `/c` was checked deliberately because it is short: a redirect `source`
is segment-delimited, so `/c/:path*` cannot reach `/categories/...`.

## 2. The fix, and the two it was chosen over

```ts
const MOVED_ROUTE_SEGMENTS = ':path([^/.]+)*';
```

Each prefix now matches any number of segments, **none containing a dot**. The
destination template is untouched, the redirects stay temporary, and the `*`
keeps a bare `/cart` or `/categories` matching on zero segments.

What it costs is a redirect for any route segment containing a dot, and none
exists — **verified in `sals3-portal`, not assumed**: a product or category
slug is `^[a-z0-9]+(?:-[a-z0-9]+)*$`, and `isPublicSlug` refuses anything else
before it can be written.

Two alternatives were rejected:

- **Rename `public/categories/`.** It fixes today's collision and protects
  nothing. The next asset directory to share a prefix breaks the same way, and
  five prefixes stay claimed.
- **Gate the redirect on `Sec-Fetch-Dest: document`.** `next.config.ts`
  supports `has`/`missing` conditions, and a navigation does send that header —
  but a bare `curl`, an old link in a script, and anything without the header
  would stop redirecting. A path problem should be fixed in the path.

## 3. Two claims in the handover that did not survive checking

**`/[market]/categories` never had photographs.** The brief listed "the
all-departments page shows no category photographs" as a symptom of this
defect. `DepartmentList` is a text list by design — *"A list, not the home
page's icon grid"*, in its own doc comment, because 21 rows of plain text beat
21 tiles for a surface meant to be scanned. The only affected surface was the
home page grid.

**The first reading after the fix said all 21 were still broken.** They were
`loading="lazy"` and below the fold: `complete: false`, `naturalWidth === 0`,
never requested. Forcing `loading = 'eager'` and scrolling gave 21 images at
144x144 with zero failures. Same family as part 82's uppercase-heading false
alarm — *when a check disagrees with the code, suspect the check* — and the
tell was there in the same object: a genuinely failed image is `complete: true`.

## 4. The extra 308 hop on a bare prefix is not new

Production answers `/cart` with `307 -> /au/cart/` and then
`308 -> /au/cart`. The trailing slash comes from compiling the **destination**
`/au/cart/:path*` with an empty path, and the destination is byte-identical
before and after this change — confirmed by building both configs and diffing
`.next/routes-manifest.json`, where the only difference is the source character
class (`[^/]+?` -> `[^/.]+`).

So the chain predates part 84 and affects the three bare-prefix legacy links
(`/cart`, `/categories`, `/search`). It does not touch the invariant part 82
cared about: the **market** hop is still the temporary one, and the 308 is
`/au/cart/` to `/au/cart`, inside one market. Removing the hop needs an exact
`source` per prefix ahead of the segment rule — worth doing, not done here, and
not urgent.

## 5. Verification

- `npm run verify` exit 0 — lint, format, `typecheck:clean`, build, **1,009
  unit tests in 100 files**, **57 e2e passed, 2 skipped**. `npm audit
  --audit-level=high` exit 0. Both husky hooks re-ran the chain green, and CI
  `verify` passed in 3m1s.
- **The regression test fails against the old config.** Restoring
  `next.config.ts` alone turns 27 passes into 6 failures, including `redirects
  no file that public/ serves`. A test that has not been shown to fail is not
  yet evidence of anything.
- The test matches paths with Next's own `getPathMatch`, not a hand-rolled
  matcher, because the defect lived entirely in how `path-to-regexp` reads a
  `source` — a stand-in built from the same reading as the config would have
  agreed with it and seen nothing.
- The `public/` walk asserts `/categories/electronics.webp` is in its own input
  before concluding that nothing is redirected.
- Production after the deploy: **all 21 photographs return 200**, the home page
  HTML references all 21, `X-Vercel-Cache: MISS` so no edge copy was read.
  Old links still land: `/categories`, `/cart`, `/c/electronics`, `/search`,
  `/p/<slug>` all reach `/au/...`; `/xx` and `/xx/cart` still 404.
- **Not proven:** the Vercel preview deployment, which sits behind Vercel SSO
  and answered every request with a 302 to `vercel.com/sso-api`. And no
  screenshot — the Browser pane was not being displayed, so the page was not
  compositing frames; the image measurements are from the live DOM instead.
- `/p/<slug>` returns 500 on a local dev run because the portal API is not
  running (`ECONNREFUSED localhost:3001`). `/au/p/<slug>` returns 500 directly
  too, so it is unrelated.

## 6. The e2e suite is flaky on this machine, and the portal makes it worse

The docs branch for this note carries **no code change at all** — its tree is
`develop` plus two files under `docs/` — and its pre-push `verify` failed
twice, on two different specs:

- `search.spec.ts` › *search results are not indexed* — `meta[name="robots"]`
  not found on `/au/search?q=a`.
- `cart.spec.ts` › *a signed-out visitor is sent to sign in* — the
  `Proceed to checkout` link never appeared, 30s timeout.

Both are error-path renders. `SALS3_PORTAL_API_URL` is `http://localhost:3001`,
so with no portal running the storefront serves its failure path, and on that
path those two elements are not there. **Starting the portal made it worse, not
better**: with an empty local database its storefront API answers `503`, which
raises `ProductsApiError` instead of a connection refusal, and the cart spec
failed where the search spec had before. The same tree then passed on the next
attempt with nothing running.

So a red `verify` here is not automatically a finding — but it is not
automatically noise either. Two things worth a look on their own merit, neither
chased in this session: whether a search results page still carries `noindex`
when its upstream fails, and whether that is what those specs are really
asserting. `--no-verify` was not used; the push waited for a green run.

## 7. What to carry forward

**A redirect pattern is a namespace claim, and `public/` is inside it.** The
router and the static-file directory share one URL space, and a prefix rule
written for a route takes the assets with it. Redirects run first, so the files
cannot win. Before adding a prefix redirect or rewrite, list what `public/`
serves under that prefix; before adding a `public/` directory, read the
redirect table.

**Excluding a shape beats naming a collision.** Renaming the one directory
would have passed every check and left four prefixes claimed and the next
asset directory exposed. The fix that generalises is the one that cannot be
satisfied by the specific case that prompted it.

**A green suite proved nothing here, and that was predictable.** The defect
lived in `next.config.ts` redirect matching, which no test exercised against a
real asset path. `test/next-config-headers.test.ts` asserted the redirect table
by comparing `source` strings to string literals — it would have passed a table
that redirected everything, and did pass this one. Asserting a config's
**text** is not asserting its **behaviour**.

**`naturalWidth === 0` on a lazy image means "not requested yet".** It is the
same reading a broken image gives. `complete` separates them, and forcing
`loading = 'eager'` before measuring removes the ambiguity.

**A turnover written by the agent who caused the defect is a lead, not a
record.** The diagnosis in this one was exactly right and saved an
investigation; two of its symptoms were wrong, one describing a page that never
had the feature it was said to have lost. Both halves are worth expecting.

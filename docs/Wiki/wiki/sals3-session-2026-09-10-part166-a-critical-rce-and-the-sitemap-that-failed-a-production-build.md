---
tags:
  [
    session-record,
    sals3,
    storefront,
    security,
    advisory,
    nextjs,
    seo,
    sitemap,
    build,
    caching,
  ]
aliases:
  [
    "Part 166",
    "A critical RCE and the sitemap that failed a production build",
    "next 16.3.4",
    "The catalogue doubled in a day",
  ]
created: 2026-09-10
updated: 2026-09-10
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[pending-register]]"
  - "[[sals3-skills]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-session-2026-09-08-part153-the-canonical-layer-switched-on-across-three-storefronts|part 153]]"
  - "[[sals3-session-2026-09-09-part165-the-storefront-was-inventing-a-catalogue-and-llms-txt-was-lying-about-delivery|part 165]]"
---

# Part 166 — A critical RCE, and the sitemap that failed a production build

> [!IMPORTANT] Three things in one evening
> 1. **`next@16.3.0` sat inside a critical advisory range**, and the exposed
>    route was **reachable on all three production storefronts** — despite a
>    custom image loader everyone assumed had removed it.
> 2. **A production deploy of `sals3.com` failed outright** because
>    `/sitemap.xml` was being prerendered and could not finish inside Vercel's
>    60-second cap. It took four unrelated commits down with it — **including
>    the correction of the false delivery claim, which therefore stayed live.**
> 3. **The catalogue grew from 5,233 to 9,718 products in a single day**, which
>    is what turned a slow sitemap into an unservable one.

> [!NOTE] Provenance
> Reconstructed on **2026-09-10** from `sals3-ecommerce` **#44**, **#47**,
> **#51**; `sals3.com.fj` **#49**, **#52**, **#56**; `sals3.com.au` **#41**,
> **#44**, **#48**; promoted by ecommerce **#45/#46**, **#48/#49**, **#52/#53**
> and the market forks' equivalents. Around eighteen merged pull requests on
> 2026-09-09 with no vault note.

## 1. The advisory, and the assumption that hid it

`next@16.3.0` sits inside the advisory range **`16.0.0 – 16.3.2`**:

| Severity | Advisory |
| --- | --- |
| **critical** | Unauthenticated Remote Code Execution on **Windows-hosted** servers — [GHSA-p293-qw3h-jr36](https://github.com/advisories/GHSA-p293-qw3h-jr36) |
| **critical** | Unauthenticated RCE in the **Image Optimization API** when AVIF files are used — [GHSA-2xp9-vwfh-vxw4](https://github.com/advisories/GHSA-2xp9-vwfh-vxw4) |

The Windows one **does not apply** — Vercel serves this on Linux.

**The Image Optimization one did.**

### The assumption that was wrong

The storefronts run `loader: 'custom'`, so resizing happens on **CJ's CDN**
rather than Vercel's metered optimizer. The reasoning went: a custom loader means
we never call `/_next/image`, therefore the route is not in play.

**A custom loader changes who the application asks. It does not unmount the
route.**

Measured 2026-09-10:

```
/_next/image?url=…   →   200   on all three production storefronts
```

The vulnerable handler was **mounted and reachable by anyone**, whether or not
Sals3's own markup ever pointed at it. This was checked *before* the fix went in,
which is the only reason it is stated as a fact rather than a worry.

> [!WARNING] The general lesson
> Configuring away your *use* of a framework route does not remove the route.
> An advisory against a built-in handler applies while that handler answers —
> **curl it, do not reason about it.** See skill 116.

### The bump itself

**16.3.4 is a patch inside the same minor** — no migration to make.
`eslint-config-next` moves with it to keep the two in step.

`npm audit fix` (semver-compatible, **not `--force`**) additionally cleared the
two remaining **high** findings:

- **`sharp`** — [GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c), via libheif
- **`js-yaml`** — [GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh)

`js-yaml` reaches the tree only through `@eslint/eslintrc`, so it was **lint-time
rather than production exposure** — worth naming, because "critical" and
"reachable" are different questions and the audit output does not distinguish
them.

**`npm audit --audit-level=high` went from exit 1 to exit 0.**

### Ruling out a bump as the cause of something else

Four lint warnings remained in `src/app/page.tsx` — two unused imports and two
`console` statements. They were **not** from the upgrade: the identical four
appear on `develop` with 16.3.0, **verified by installing both versions and
comparing output**. They belong to part 165's `fix(home)` commit and were left
alone.

That is the right discipline. A version bump is the loudest change in the diff
and attracts blame for whatever else is failing; separating them costs one
install and settles it.

## 2. The build that a sitemap took down

A production deploy of `sals3.com` **failed outright** on 2026-09-10:

```
Failed to build /sitemap.xml (attempt 1 of 3) because it took more than 60 seconds.
... attempt 2 ... attempt 3 ...
Export encountered an error on /sitemap.xml/route, exiting the build.
```

**It took four unrelated commits down with it** — including part 165's correction
of the false delivery claim, **which therefore stayed live on the site**.

### Two mistakes, both in an earlier change of my own

**The route was prerendered.** Vercel caps a single route's prerender at **60
seconds**, with three retries before failing the whole export. Enumerating the
catalogue does not fit: 5,233 published products at the Portal's ceiling of 30
per page is **~175 reads**.

> A sitemap that must reach ~5,000 remote records **has no business gating a
> deploy.**

`dynamic = 'force-dynamic'` moves it to request time — bounded by the function
timeout instead, with `readCatalogPaths`'s day-long cache meaning **one crawler
pays rather than every reader**.

**The concurrency was sized from a wrong number.** `PAGE_CONCURRENCY = 6` came
from *"~2,900 products, therefore ~97 reads"* — taken from
`THREE-STOREFRONTS-COMPARED.md` and from SIT. **Production had 5,233**, measured
off the live sitemap. The real cost was ~175 reads over ~30 waves. Raised to 12,
halving wall time — though the route **leaving the build** is what actually
removed the deploy risk.

Every stale `~2,900` and `~97` in the comments was corrected **in the same pass**.
Those figures are *why* the sizing was wrong; leaving them would mis-size the
next change too.

### Why it had never surfaced before

`NEXT_PUBLIC_SITE_URL` was **unset** on `sals3-ecommerce` Production, so
`sitemap()` returned `[]` before reading anything — **zero Portal reads, a
one-minute build.**

Setting that variable to fix the canonical layer (part 153) **switched this path
on for the first time.**

The two market storefronts always had the variable and had been building this
**inside** the cap by a margin **nobody had measured** — one catalogue's growth
from the same failure. That is why the fix landed in all three rather than only
in the one that broke.

> [!WARNING] A dormant path is not a safe path
> An environment variable was the only thing standing between a working build and
> a failing one, and nothing said so. Setting a variable to fix surface A
> **activated** an unmeasured code path on surface B. See skill 117.

## 3. Then the catalogue doubled

Later the same day: `sitemap.xml` took **66–78 seconds** to generate cold, on all
three storefronts. The catalogue had grown **from 5,233 to 9,718 products in a
day** — ~324 Portal reads.

It answered **200 with correct, duplicate-free content**, cached for a day. So it
was **slow rather than broken** — but a crawler is entitled to give up, and the
same enumeration had already failed a build against the prerender cap.

### The split

| Route | Contents | Measured |
| --- | --- | --- |
| `/sitemap.xml` | static routes + stocked departments, **one Portal read** | **0s**, zero products |
| `/catalogue/sitemap/<id>.xml` | the catalogue, **20 Portal pages a chunk** | ~17 chunks of ~600 URLs |

**Chunking does not reduce the total work.** It divides it across requests a
crawler makes in parallel, each of which finishes quickly.

`/sitemap.xml` is already in `robots.txt` and very likely submitted to Search
Console, so it **keeps working and keeps being fast**.

### Why a separate segment, and not `generateSitemaps` on the root

`generateSitemaps()` in `app/sitemap.ts` serves `/sitemap/0.xml` and **takes
`/sitemap.xml` away** — Next synthesises no index there.

**Losing an already-advertised, probably-submitted URL would turn a working
submission into a Search Console error, for no gain.**

Discovery moves to `robots.ts`, which now emits **one `Sitemap:` line per chunk**
alongside the root. Multiple `Sitemap:` directives are part of the robots.txt
convention and Google documents reading all of them, so no index file is needed —
**but miss that line and ~9,700 product URLs are unreachable** to a crawler that
only reads robots.txt. `robots.ts` gains a `revalidate`, because its content now
depends on the Portal's page count.

## 4. Three defects found inside the chunking work

### 4.1 The final chunk over-read its range

With 45 pages of catalogue, chunk 2 asked for pages **41–60**: fifteen wasted
Portal reads on **every** generation. It clamped to `MAX_PRODUCT_PAGES` but not to
the **real total**.

The chunk's own first page is now read alone, its `totalPages` bounds the range —
and that read **pays for itself**, because the chunk needs the page anyway.

### 4.2 `id` is a `Promise<string>`, not a number

This first shipped as `{ id }: { id: number }`. **It type-checked. It built. And
it served every chunk empty**, because the offset arithmetic ran on a Promise and
produced `NaN`.

**The unit tests passed throughout** — because they called it with `{ id: 0 }`.

> They encoded my assumption about the signature rather than **Next's contract**,
> so the code and the test were wrong **in the same direction** and agreed with
> each other.

A dev server and one `curl` found it in seconds. The tests now pass
`Promise.resolve('0')`, which is how Next actually calls it, and a malformed id
answers empty rather than `NaN`. See skill 118.

### 4.3 The rewrite silently dropped the cache tag

The rewrite **dropped `STOREFRONT_PRODUCT_TAG`** from the chunk cache. It carried
over a *"no `tags`"* note that had been true **before** this repository gained
`POST /api/internal/revalidate` — and it now has it, with the Portal's
`storefrontTagsFor` always sending the shared tag.

So a publish, pause or resume **used to expire the sitemap and, after the
rewrite, silently did not**: a new product would wait out the **day-long
fallback** before any crawler could see it.

**Nothing caught it.** No lint error, no type error, no test failure. Two
near-misses worth recording:

- **ESLint *did* warn that the import was now unused** — and the warning was
  **filtered out of view** while excluding unrelated noise from
  `src/app/page.tsx` (the four warnings from §1). **The lesson is the filter, not
  the tag.**
- **The unit tests could not see it at all**, because
  `catalogue/sitemap.test.ts` mocks `unstable_cache` as `<T>(fn: T) => fn`. That
  is the *right* mock for testing what a chunk returns — and it **throws the
  cache options away**, so the options were the one part of that module nothing
  looked at.

`sitemap-paths.test.ts` now **records the arguments `unstable_cache` is built
with** and asserts the tag and the revalidate window. **Verified it fails when
the tag is removed**, so it pins what it claims to.

## 5. Verification

`npm run verify` green — lint (0 errors), format, `typecheck:clean`, build,
**1,361 unit tests, 80 e2e**, `npm audit --audit-level=high` **exit 0** — run in
**every** repository, not just one.

The portal's e2e was run with `DATABASE_URL=` **blanked**, which is how CI runs
it: with a configured-but-unreachable Neon the catalogue specs **fail**; with
none they **skip**. 61 passed, 19 skipped. Worth knowing before reading a skip
count as a regression.

Proved live on a dev server: `/sitemap.xml` at **0s with no products**;
`robots.txt` listing the chunks; a chunk answering **200 with valid XML**; an
out-of-range id **404ing** because `generateSitemaps` never offers it; and the
empty-degradation path when the Portal cannot be read.

The build now reports **`ƒ /sitemap.xml` rather than `○`**, which is the check
that it actually left the prerender.

### What was explicitly not proven

**A chunk returning real products end to end.** Portal SIT began answering `302`
(deployment protection intercepting the bypass secret) and the production portal
needs a prod-scoped storefront token the agent does not have.

The offset arithmetic has unit coverage that calls the route **the way Next
does** and asserts page 21 lands in chunk 1 — but the live product path was to be
**confirmed immediately after deploy**:

```bash
curl -s https://sals3.com/robots.txt | grep -c '^Sitemap:'              # expect ~18
curl -s https://sals3.com/catalogue/sitemap/0.xml | grep -c '<loc>'     # expect ~600
time curl -s -o /dev/null https://sals3.com/sitemap.xml                 # expect < 1s
```

**Whether anyone ran these is not recorded.** They are carried into the pending
register rather than assumed.

## Lessons

- **A framework route stays mounted regardless of how you configure your use of
  it.** Answer "is it reachable?" with `curl`, never with reasoning about
  loaders.
- **Separate a version bump from the failures around it** by installing both
  versions and diffing the output. One install, and the blame stops moving.
- **Never let a route that enumerates a remote catalogue gate a build.** Move it
  to request time; the cap is the wrong shape for the work.
- **Size a concurrency from a measured production number**, and correct the stale
  number in the comment in the same pass, because that is what will mis-size the
  next change.
- **Setting an environment variable can activate a dormant code path** on a
  surface nobody was looking at. Enumerate what a variable gates before setting
  it.
- **Do not adopt `generateSitemaps()` on the root** if `/sitemap.xml` has been
  submitted — it takes the URL away and synthesises no index.
- **A test that constructs its input the way you assumed, rather than the way the
  framework does, agrees with the bug.** Pass the real shape, including a
  Promise.
- **A filtered lint output can hide the one warning that mattered.** Filter to
  read; never filter to decide.
- **A mock that simplifies a signature discards the arguments** — assert the
  arguments themselves when they carry behaviour.

Registered as skills 116, 117, 118 and 119 in [[sals3-skills]].

## Pending

- **The three post-deploy `curl` checks were never recorded as run.** A chunk
  returning real products end to end is still unproven in production. Registered
  in [[pending-register]].
- **A prod-scoped storefront token does not exist for the agent**, which is what
  blocked the end-to-end proof.
- **The Portal's page ceiling of 30 is the shape of the whole problem.** ~324
  reads for one catalogue pass; a larger page size would remove the chunking
  need entirely and has never been costed.
- **`robots.txt` is now the single point of discovery for ~9,700 product URLs.**
  Nothing monitors that its `Sitemap:` lines are present and correct.
- **`sharp` and `js-yaml` were cleared by `npm audit fix`**, not by a deliberate
  upgrade decision; neither was re-checked after the lockfile moved.

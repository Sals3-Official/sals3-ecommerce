---
tags:
  [
    session-record,
    sals3,
    storefront,
    orders,
    incident,
    vercel,
    reliability,
    suspense,
  ]
aliases:
  [
    "Part 168",
    "A Portal read that never answered and a skeleton that never stopped",
    "Every Portal read gets a deadline",
  ]
created: 2026-09-11
updated: 2026-09-11
status: implemented
authority: session-record
owner_approved: false
implementation_status: merged
related:
  - "[[hot]]"
  - "[[pending-register]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-session-2026-09-10-part167-sop-v42-and-the-morning-cj-quoted-nothing|part 167]]"
  - "[[sals3-session-2026-09-09-part165-the-storefront-was-inventing-a-catalogue-and-llms-txt-was-lying-about-delivery|part 165]]"
---

# Part 168 — a Portal read that never answered, and a skeleton that never stopped

> [!IMPORTANT] What shipped, and what did not
> **Shipped:** every Portal call from all three storefronts now carries a
> deadline, so a read that never answers becomes the route's error page instead
> of a loading skeleton that never resolves.
>
> **Not shipped, and not knowable from here:** *why it was Australia.* The order
> render path is byte-identical between the AU and FJ repositories, all three
> storefronts deployed within eleven minutes of each other, and one Portal
> serves all three — so the AU-only fault is environmental, and nobody in this
> session had the Vercel access or the SIT buyer account to find it.

> [!NOTE] Provenance
> Written **2026-09-11** alongside the work, not reconstructed afterwards. The
> incident is the owner's own report from `sit.sals3.com.au`; the code claims
> are from reading the three repositories at
> `anythingsupplies/sals3.com.au@3a7c071`,
> `anythingsupplies/sals3.com.fj@7f1c01e` and
> `anythingsupplies/sals3-ecommerce@d70834c`; the deployment timings are from
> `gh api repos/anythingsupplies/<repo>/commits/develop/status`; the SSO
> measurement is a `curl` against all three SIT hosts run on 2026-09-11.
> **The reproduction was not performed** — see §5.

## The pull requests

| PR | Repository | What it did |
| --- | --- | --- |
| **#AU** | `sals3.com.au` | Portal reads get a default deadline; the four writes get a longer one |
| **#FJ** | `sals3.com.fj` | The same change, same words |
| **#GL** | `sals3-ecommerce` | The same change, same words |

## 1. What the buyer saw

On 2026-09-11 around 00:00 (UTC+8), every buyer order-scoped page on
`https://sit.sals3.com.au` stopped resolving: `/orders/S3-20260819-FB0EE6973B`,
`/orders/S3-20260909-55EF751D1F`, `/orders/S3-20260827-C5E3B575E0`,
`/orders/S3-20260909-1BE9BAA460` and that order's `/cancel` page all showed
*"Loading your orders…"* indefinitely, with `document.readyState === 'complete'`.

Three things about that description are load-bearing:

- **The same order numbers rendered in seconds** on `sit.sals3.com` and
  `sit.sals3.com.fj`. One Portal holds those orders and answered both.
- **The AU orders *list* page was fine.** Whatever hung, it was not every
  Portal read.
- **It was intermittent.** The AU cancel page had worked earlier in the same
  session before it started sticking, which rules the cancellation feature out
  as a cause on its own evidence.

## 2. `document.readyState === 'complete'` is the whole diagnosis of the symptom

A route segment with a `loading.tsx` streams in two parts: the shell and the
fallback go out immediately, and the resolved content arrives later on the same
response. Once the shell has been flushed, **the connection ending is
indistinguishable from the connection still being open** as far as the rendered
page is concerned — React simply never receives the chunk that replaces the
fallback.

So `readyState === 'complete'` with a skeleton still on screen says the stream
ended without the boundary ever resolving. `app/orders/error.tsx` cannot help:
an error boundary runs when something throws, and nothing threw.

A related detail that cost time in the report itself: **there is no `loading.tsx`
under `src/app/orders/[orderNumber]`**, so the detail pages borrow the list
page's skeleton. A stuck order page therefore says *"Loading your orders…"* and
looks exactly like a stuck list page. Recorded in [[pending-register]] as P3.

## 3. The code could not tell the difference between slow and never

`requestStorefrontJson` in `src/services/storefront/client.ts` — the single HTTP
boundary to the Portal in all three storefronts — accepted an optional `signal`
and applied no default:

```ts
const response = await fetcher(input.url, {
  method,
  ...cachePolicy,
  headers: { /* … */ },
  signal,          // undefined for every read on the order path
});
```

Exactly three callers ever passed one — `lib/fx/buffer.ts`,
`lib/fx/free-shipping-thresholds.ts` and `lib/fx/rates.ts`, each with
`AbortSignal.timeout(1_500)` and each already degrading gracefully. The reads
that could strand a page were precisely the ones with no deadline, which is the
argument against fixing this with an option: **an opt-in is opted into by the
callers that were already careful.**

### What shipped

- `DEFAULT_STOREFRONT_TIMEOUT_MS` — **8000 ms**, applied to every call by
  default, overridable per deployment with `SALS3_PORTAL_TIMEOUT_MS` and per
  call with a `timeoutMs` option.
- The deadline is **composed** with a caller's own signal
  (`AbortSignal.any([signal, deadline])`), never substituted for it, so the
  three FX reads keep their tighter 1.5s and a caller can only make its own read
  stricter than the default.
- An expired deadline throws `ProductsApiError`, so it reaches the route's error
  boundary. **The 404-versus-upstream-failure distinction the file already
  documents is untouched** — `undefined` still means only what
  `notFoundStatuses` declared, and a timeout is never a `notFound()`.
- A caller's *own* abort is re-thrown unchanged rather than relabelled a Portal
  timeout, so a deliberate cancellation is not logged as an upstream fault.
- The four **writes** — checkout freight quotes, checkout intents, order
  acceptance and order cancellation — carry `CHECKOUT_PORTAL_TIMEOUT_MS`
  (**25s**) instead. They wait on the Portal waiting on CJ, and an eight-second
  deadline there would turn a slow-but-working payment into a failed one. The
  cancellation POST builds its own request and so inherited nothing at all; it
  now has a deadline for the first time.

### Why eight seconds, and the assumption underneath it

A deadline is only worth having if it fires **before** the platform's own
function limit; later than that and the platform still wins the race. Eight
seconds sits under the smallest limit any of these deployments could be running
and is an order of magnitude above a healthy read — these Portal endpoints are
database reads.

**That is an assumption, not a measurement.** None of the three repositories
exports a `maxDuration` or carries a `vercel.json`, so the real ceiling is
whatever the plan defaults to and nobody has read it. If it is below eight
seconds the deadline never fires and the symptom returns unchanged.
`SALS3_PORTAL_TIMEOUT_MS` exists so that correction is an environment edit
rather than a release. Recorded in [[pending-register]] as P2.

## 4. Why it cannot be the code, and what that leaves

Two measurements, both re-runnable:

```bash
git diff fj/develop origin/develop -- \
  src/app/orders src/lib/orders src/components/orders \
  src/services/storefront/orders.ts
# (empty)
```

The order render path is **byte-identical** between the Australian and Fijian
storefronts. And all three deployed successfully within eleven minutes of each
other:

| Repository | `develop` Vercel status | When |
| --- | --- | --- |
| `sals3.com.au` | success | 2026-09-09 23:56 UTC |
| `sals3.com.fj` | success | 2026-09-09 23:50 UTC |
| `sals3-ecommerce` | success | 2026-09-09 23:45 UTC |

Same code, same Portal, same deploy window, one market broken. **The difference
is environmental.** The two candidates, neither proved:

1. **The Portal read genuinely hung** and the function was killed mid-stream.
   The deadline shipped here converts this into an error page. Against it: the
   owner reported **no matching request rows** in the `sals3-com-au` Vercel logs
   for those paths, and a function that ran long enough to be killed should
   leave one.
2. **Something answered before the function ran.** All three SIT hosts sit
   behind Vercel Deployment Protection — measured 2026-09-11, each answers
   `302` to `vercel.com/sso-api` for an unauthenticated read. Its cookie is
   per-domain, so one domain's expiring mid-session while two others stay valid
   is exactly the reported shape, and a request stopped at the gate produces no
   function log row. Against it: the AU orders **list** page kept working.

The absent log rows are the strongest single piece of evidence and they point at
(2), which the deadline does not fix. **This work bounds the symptom; it does
not close the incident.**

## 5. What was not done, and why

- **The reproduction.** It needs a signed-in buyer on `sit.sals3.com.au`, and
  the host is itself behind Vercel SSO. Neither credential was available.
- **The `sals3-com-au` function logs and the Portal's own logs** for the
  incident window. No Vercel access.
- **The `SALS3_PORTAL_URL` / `SALS3_PORTAL_PROTECTION_BYPASS` comparison between
  the AU and FJ projects** — step 3 of the task as set, and the first place an
  AU-only fault could live. No Vercel access; neither repository's `.env.local`
  carries SIT values. AJ holds this.

All three are in [[pending-register]] rather than in this note's prose alone.

## Lessons

1. **An optional deadline is not a deadline.** A `signal` parameter nobody is
   required to pass is a deadline for the callers who did not need one. The
   default is the fix; the option is the escape hatch.
2. **A hang has no error boundary.** `error.tsx` catches throws. Once a
   streaming shell is flushed, a request that never completes renders as a
   permanent fallback with a *completed* document — the loading state and the
   failure state look identical to the reader and to `readyState`.
3. **Identical code across forks turns a fault into a bisection.** Three
   storefronts from one codebase meant one `git diff` could eliminate the entire
   application layer as a cause in a single command. The fork rule in
   [[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]] §3
   costs three PRs per fix and pays for itself the first time one market
   misbehaves.
4. **A shared `loading.tsx` makes a child's failure wear its parent's name.**
   The detail pages reported themselves as *"Loading your orders…"*, which
   describes the list page.
5. **Say which half you fixed.** The deadline removes the endless skeleton; it
   does not explain Australia. Reporting it as "fixed" would have closed an
   incident that is still open.

---
tags: [sals3, session, sals3-portal, sals3-ecommerce, sals3-com-fj, caching, revalidation, vercel, security]
aliases:
  - Part 136
  - Closing The Window A Paused Listing Stayed Buyable In
  - The 401 That Was Never The Secret
created: 2026-09-04
updated: 2026-09-07
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-session-2026-09-04-part132-a-pause-that-persists-a-resume-that-does-not-reprice]]"
  - "[[sals3-session-2026-09-01-part124-an-api-so-the-agent-stops-driving-a-browser]]"
  - "[[storefront-product-contract-v2]]"
  - "[[hot]]"
---

# Part 136 — closing the window a paused listing stayed buyable in, and the 401 that was never the secret

> [!NOTE] Provenance
> Written 2026-09-07 after the fact from each pull request's own merged record
> across four repositories. The live observations quoted — `sit.sals3.com.fj`
> serving a paused ring at FJ$55.00, the three `curl` answers in §5, the Portal
> log lines in §4 — are each PR's own evidence at the time of merging, and have
> not been re-run in this session.

| Repo | PR | Merged (UTC) |
|---|---|---|
| `Sals3-Official/sals3-ecommerce` | [#235](https://github.com/Sals3-Official/sals3-ecommerce/pull/235) feat(storefront): let the Portal expire a listing's cache the moment it changes | 18:02:49 |
| `anythingsupplies/sals3-portal` | [#55](https://github.com/anythingsupplies/sals3-portal/pull/55) feat(catalogue): push a cache invalidation to the storefront on every publication change | 18:08:14 |
| `anythingsupplies/sals3-ecommerce` | [#27](https://github.com/anythingsupplies/sals3-ecommerce/pull/27) — the same endpoint on the live repository | 18:25:11 |
| `anythingsupplies/sals3.com.fj` | [#17](https://github.com/anythingsupplies/sals3.com.fj/pull/17) — the same endpoint on Fiji | 18:40:47 |
| `anythingsupplies/sals3-portal` | [#57](https://github.com/anythingsupplies/sals3-portal/pull/57) fix(catalogue): notify every storefront, not just one | 18:50:28 |
| `anythingsupplies/sals3-portal` | [#62](https://github.com/anythingsupplies/sals3-portal/pull/62) fix(catalogue): find the Fiji storefront by host, not by deployment stage | 20:13:53 |
| `anythingsupplies/sals3-portal` | [#66](https://github.com/anythingsupplies/sals3-portal/pull/66) fix(catalogue): reach a storefront that sits behind Deployment Protection | 20:50:36 |

All on **2026-09-04**, inside two hours and forty-eight minutes. No DDL. No CJ
call. No schema or contract change.

## 0. What this closes, and what this vault said about it the day before

[[sals3-session-2026-09-04-part132-a-pause-that-persists-a-resume-that-does-not-reprice|Part 132]]
made a bulk pause actually persist. `hot.md` then recorded the residue honestly
and withdrew a defect claim in the process:

> The Portal's storefront read is `unstable_cache(..., revalidate: 30)` and the
> storefront's own product read is `next: { revalidate: 60 }` with no cache tag,
> so a pause takes up to ~90 seconds to reach a buyer, and nothing in either
> repository makes it instant. That is a bounded staleness window, not a defect,
> but it is the honest number to quote.

This is the work that removes it. `services/storefront/client.ts` had already
convicted itself in a comment:

> a tag nothing ever invalidates is a promise the code does not keep

## 1. The storefront half — two tags and an endpoint

Product-page reads now carry **two** tags, `storefront-product` and
`storefront-product:<slug>` (`lib/storefront/revalidation-tags.ts`), and
`POST /api/internal/revalidate` expires them.

### `revalidateTag(tag, { expire: 0 })`, and why neither alternative works

- **`updateTag`** is the immediate one and Next allows it **only inside a Server
  Action**, never a Route Handler. Unreachable from here by construction.
- **`revalidateTag(tag, 'max')`** is the recommended default and gives
  stale-while-revalidate — **the very next buyer is still served the paused
  product once**, which is the single outcome this endpoint exists to prevent.

Next's own documentation names the case: *"For webhooks or third-party services
that need immediate expiration, you can pass `{ expire: 0 }`… necessary when
external systems call your Route Handlers and require data to expire
immediately."*

### The security, and the one control that is not belt-and-braces

- bearer secret compared with `timingSafeEqual`, **length checked first**, since
  it throws on a length mismatch rather than returning false;
- a Zod body bounded to **20 tags of ≤256 chars**;
- rate limited;
- **an allow-list on the tag names**;
- an unset `STOREFRONT_REVALIDATE_SECRET` **closes** the endpoint — 401 on
  everything. It never means "no auth required".

The allow-list is the one worth reading twice. Tag names arrive **over the
network**, so without it a leaked secret would let a caller expire *any* tag in
the application — FX rates, free-shipping thresholds, sessions, anything a future
`'use cache'` block declares — rather than only catalogue reads. It bounds the
blast radius of the credential, not the correctness of the feature.

## 2. The Portal half — an announcement, not part of the transaction

`revalidateAfterPublicationChange(slug)` posts the tags to the storefront
**inside `after()`**, so a seller's publish or pause does not wait on another
deployment's network round trip. The write has already committed; this is an
announcement.

`unpublishProduct` and `resumeProduct` now return their slug (`publishProduct`
already did), so a pause expires **that product's page** rather than every
product page at once. Callers that genuinely cannot know a slug — the
option-mapping routes — fall back to the catalogue-wide tag.

Best-effort by construction: **three-second timeout, every failure logged and
swallowed**. A publication that already committed must not become an error the
seller sees because a storefront was slow or down. When the push does not land,
the storefront's own 60s window still closes the gap.

> [!IMPORTANT] The inert state is the old behaviour, deliberately
> Both halves say this in almost the same words, and both cite the same scar:
> [[sals3-session-2026-09-01-part124-an-api-so-the-agent-stops-driving-a-browser|part 124]]
> shipped a complete 22-route API **fully inert** behind
> `PRODUCT_EDITOR_API_SECRET`, a Vercel secret nobody could set, and every call
> answered 401 in production until it was reworked. The lesson taken here: with
> no secret set, the Portal **skips the call entirely** rather than sending an
> unauthenticated request, and the endpoint refuses everything — so an
> unconfigured deployment lands on the *previous* behaviour (up to 60s), which is
> indistinguishable from before this shipped. **A feature whose unconfigured
> state is a regression is a feature that ships broken by default.**

## 3. There was a second storefront, and nobody had told the Portal

Caught by the owner, in five words: *"storefront ng SIT ng FIJI? okay na?"* — it
was not.

`sit.sals3.com.fj` is **a second deployment of the same storefront reading the
same Portal**. Verified live while investigating:

| | |
|---|---|
| Serving the same ring | **FJ$55.00, buyable** |
| Its `/api/internal/revalidate` | **404** — no endpoint |
| Its cache | the same untagged `PRODUCT_PAGE_REVALIDATE_SECONDS = 60` |
| Portal's knowledge of it | **none** — `sit` mapped to `sit.sals3.com` alone |

So #55 closed the window for `.com` and **left Fiji selling a paused listing for
up to a minute**. fj#17 ported the endpoint; portal #57 made
`storefrontRevalidationOrigins()` return the linked storefront **plus every other
known deployment for the stage**, posting to each **in parallel, each failing on
its own** — independent deployments, so one being down must not delay or cancel
the notification to the others.

Two refusals recorded rather than papered over:

- **Production Fiji is deliberately absent.** `https://sals3.com.fj` answers
  Vercel's `404: NOT_FOUND`, so nothing is deployed there and listing it would be
  a guess — the same refusal `origin.ts` already makes for UAT: *"inventing one
  would ship a link that 404s in exactly the way this change exists to stop."*
- `STOREFRONT_REVALIDATE_ORIGINS` (comma-separated) overrides the whole list, so
  the next country storefront needs no code change — and unlike a *required*
  variable, leaving it unset still notifies everything already known.

## 4. The fan-out that only ever had one entry

#62 is the author's own correction of #57, an hour and twenty minutes later, and
it is the sharpest thing in this arc.

The Fiji origin was keyed off `CLOUDFLARE_R2_KEY_PREFIX === 'sit'`. **That never
fired once in the real deployment**: SIT sets `SALS3_STOREFRONT_BASE_URL`
explicitly, and `storefrontOrigin()` honours it *ahead of any stage* — so the
origin resolved to `https://sit.sals3.com` while the stage variable said
something the map had no entry for.

The Portal's own logs are the proof, and they are one line repeated:

```
storefront revalidation refused { origin: 'https://sit.sals3.com', status: 401 }
storefront revalidation refused { origin: 'https://sit.sals3.com', status: 401 }
```

**No line for `.fj`, ever.** #57 shipped a fan-out over a list that only ever had
one entry in it — the exact gap it was written to close.

The fix keys off **the host `storefrontOrigin()` has already resolved**, not a
second variable that can disagree with it: whatever `.com` address is in play,
its `.com.fj` twin sits beside it. A malformed base URL degrades to notifying
just the primary rather than throwing. The regression guard is the real
configuration — an explicit base URL with an empty stage, which is exactly how
SIT is set up and exactly what the old code answered with one origin.

> [!TIP] Two variables that can describe one fact will eventually disagree
> This is [[sals3-session-2026-08-28-part85-one-storefront-again-and-the-country-that-stopped-being-asked|part 85]]'s
> rule in a new place: *two places stating one fact is the defect, not either
> place.* The deployment stage and the resolved base URL both claimed to say
> which environment this is. The one that already won everywhere else is the one
> to derive from.

## 5. The 401 was Vercel, not the secret

The push had been refused on SIT since it shipped, and every diagnosis of it had
been wrong, including the one in #62's own closing section (*"it does not have
the same `STOREFRONT_REVALIDATE_SECRET`"*).

**Vercel Deployment Protection answers before the storefront's own code does.**
The 401 came back **without the route ever running**, so a correct secret was
irrelevant.

Proved server-side rather than inferred — the same endpoint, curled from outside
any browser session:

| Origin | Answer |
|---|---|
| `sals3.com` | `{"error":"Unauthorized"}` — **the route answered** |
| `sit.sals3.com` | `{"protection":{"vercel_auth_enabled":true,…}}` |
| `sit.sals3.com.fj` | `{"error":{"message":"Protected deployment"},…}` |

Three different bodies for what looks like one status. The first is the
application refusing a credential; the other two are the platform refusing the
request.

**Every earlier browser check missed this because a logged-in browser carries
the Vercel SSO cookie.** The Portal, server to server, carries nothing — which is
exactly the case that matters.

The fix is the mirror image of something `sals3-ecommerce` already does: it
carries `SALS3_PORTAL_PROTECTION_BYPASS` to reach a protected Portal. This is the
same arrangement in the other direction, using Vercel's own
`x-vercel-protection-bypass` header, read from `STOREFRONT_PROTECTION_BYPASS`.
Optional by design — unset is correct for production, which is not protected, and
a protected deployment without it keeps falling back to its own revalidate window
rather than failing anything.

## What was not done, and what is still owed

Named by #66 itself, and still open as far as this vault knows:

1. **The production storefront still lacks `STOREFRONT_REVALIDATE_SECRET`.** Its
   deployment predates the variable being created; only the develop/SIT ones were
   redeployed after. **A redeploy of `sals3-ecommerce` production picks it up —
   no code change.**
2. **SIT needs the bypass value.** A *Protection Bypass for Automation* secret
   from each storefront project, set as `STOREFRONT_PROTECTION_BYPASS` on the
   Portal. Alternatively, turn protection off for those deployments.
3. **Production Fiji has no deployment at all** — `https://sals3.com.fj` answers
   Vercel `404: NOT_FOUND`. Until it exists, the Portal correctly refuses to
   notify it.
4. **The end-to-end result has never been observed.** Every layer is merged and
   deployed; no run of this vault has watched a pause reach a buyer in under a
   second. Until items 1 and 2 are done, both storefronts keep falling back to
   their own 60s window — the previous behaviour, not a broken one.
5. The `.com` endpoint exists twice — `Sals3-Official/sals3-ecommerce#235` and
   `anythingsupplies/sals3-ecommerce#27`. Only the second is on the deployment
   buyers reach.

## Lessons

- **Curl it from a shell before believing a browser.** A logged-in browser
  carries an SSO cookie that a server-to-server caller does not, so a
  browser check cannot see a Deployment Protection wall at all — it answers 200
  for a reader who is authenticated as a person and 401 for the machine that
  matters. Three hours of this arc were spent debugging a secret that was never
  wrong.
- **The same status code from two different layers means two different things.**
  `{"error":"Unauthorized"}` is the application; `{"protection":{…}}` is the
  platform. Read the body, not the number.
- **A fan-out is a claim about a list, and the list needs its own evidence.** #57
  shipped parallel notification, independent failure handling and an override
  variable — over a list that had one entry. The tell was in the Portal's own
  logs the whole time: one origin, never the other.
- **Derive from the value that already won.** Keying off a second environment
  variable rather than the resolved origin is what made the list wrong; the
  resolved origin was authoritative everywhere else in the same module.
- **Design the unconfigured state to be the old behaviour.** Both halves of this
  feature are inert-safe on purpose, citing part 124 by name. A missing secret
  produces yesterday's latency, not today's outage.
- **Bound a credential's blast radius, not just its correctness.** The tag
  allow-list assumes the secret leaks and asks what the holder can then reach.

---
tags: [session-record, sals3, portal, storefront, cache-invalidation, cron, infrastructure]
aliases:
  [
    "Part 149",
    "Notify every market storefront",
    "Two jobs onto Vercel Cron",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-04-part136-closing-the-window-a-paused-listing-stayed-buyable-in]]"
  - "[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger]]"
  - "[[sals3-session-2026-09-07-part144-5666-market-offers-and-the-three-markets-withdrawn]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
---

# Part 149 — Notify every market storefront, and two jobs moved onto Vercel Cron

> [!IMPORTANT] The paused-listing defect came back, twice, by growing a market
> [[sals3-session-2026-09-04-part136-closing-the-window-a-paused-listing-stayed-buyable-in|Part 136]]
> closed the ~90-second window a paused listing stayed buyable in, and
> [[hot]] recorded the residue as *"blocked on two Vercel settings."* What it did
> not anticipate: **each new market storefront reopens the window for itself.**
> Production Fiji went live and was never added; then Australia went live and
> inherited the whole defect at once.

> [!NOTE] Provenance
> Written after the fact from each PR's own record and the HTTP probes quoted in
> them. All PRs are `anythingsupplies/sals3-portal`, merged 2026-09-07.
> Promotion PRs not listed.

| PR | What it did |
| --- | --- |
| [#115](https://github.com/anythingsupplies/sals3-portal/pull/115) | Notify **production Fiji**, which went live and nobody came back |
| [#135](https://github.com/anythingsupplies/sals3-portal/pull/135) | A **list per host** — notify every market storefront, not just Fiji |
| [#123](https://github.com/anythingsupplies/sals3-portal/pull/123) | Both scheduled jobs onto **Vercel Cron**, because Actions is dead and `CRON_SECRET` is unreadable |
| [#147](https://github.com/anythingsupplies/sals3-portal/pull/147) | The production Portal is `sals3-portal-prod`, not `sals3-portal` |
| [#119](https://github.com/anythingsupplies/sals3-portal/pull/119) | The apex is not WordPress any more, and the constant must not move anyway |

## 1. A stale comment that was documenting a live production gap (#115)

The ask was to correct a stale line in `.env.example`. **That line turned out to
be describing a broken thing.**

`FIJI_TWIN_BY_HOST` in `push-revalidation.ts` left production Fiji out *on
purpose*, because `https://sals3.com.fj` answered Vercel's `404: NOT_FOUND` — its
comment said to add it *"when it goes live."* **It went live and nobody came
back.** So the bug reported on 2026-09-04 was quietly back in production: a
paused product kept selling on `sals3.com.fj` until that deployment's own
revalidate window closed — the ring at FJ$55.00, again.

**Fixing only the comment would have relabelled a broken thing.**

Checked before changing, not assumed:

| Check | Result |
| --- | --- |
| `https://sals3.com.fj` | **200**, prices in FJ$ |
| `POST /api/internal/revalidate` on it | `{"error":"Unauthorized"}` — **the route's own handler**, not Vercel's protection wall |

That distinction is the whole diagnosis: a 401 from the handler means **the push
reaches code and only wants the matching secret**; a 401 from Deployment
Protection means it never arrives. Confusing the two is what cost the earlier
attempt its afternoon.

## 2. The shape of the map is what made the second gap easy to miss (#135)

`sals3.com.au` went live and **inherited the whole 2026-09-04 defect at once** —
nothing notified it, so a paused product kept selling there too.

> Yesterday's fix added Fiji and stopped there. The **shape** of the map is what
> made the gap easy to miss — `FIJI_TWIN_BY_HOST` returning a single address does
> not read as incomplete when a second market appears.

It is `MARKET_STOREFRONTS_BY_HOST` now: **a list per host.** Same checks first:

| Check | Result |
| --- | --- |
| `https://sals3.com.au` | **200**, prices in **A$** |
| `https://sit.sals3.com.au` | exists, behind Vercel's protection wall |
| `POST /api/internal/revalidate` on production AU | `{"error":"Unauthorized"}` — the handler |

**Why a list rather than a second constant:** each market is its own repository
and its own deployment reading this one Portal, so a third market is now one line
here. A name that describes one market (`FIJI_TWIN`) invites a sibling; a name
that describes the relationship (`MARKET_STOREFRONTS`) invites a row.

## 3. The secret nobody can read, and the only caller left that can (#123)

GitHub Actions has not started a job in `sals3-portal` since 2026-09-04 —
*"recent account payments have failed or your spending limit needs to be
increased"* — and **the owner has decided those bills will not be paid.** Every
workflow dies in about four seconds without running a step.

That takes **both scheduled jobs** with it, and **every break-glass dispatch
besides.** And the credential cannot be recovered by hand: `CRON_SECRET` is a
Vercel **Sensitive Environment Variable**, write-only by design — replaceable,
never readable.

> So there was no remaining way to authenticate any privileged operation in this
> system.

**Vercel Cron is the one caller left that can.** It never needs to know the
secret; Vercel injects the `Authorization` header itself.

| Job | Schedule |
| --- | --- |
| `orders-status-sync` | every 30 minutes |
| `seed-category-mappings` | hourly at :17 |

### The orders sync was worse off than merely stopped

Its workflow posted to `vars.PORTAL_BASE_URL`, **which holds the SIT origin.** So
for as long as it *did* run, it advanced SIT's order status and **never
production's.** A job that was believed to be working was pointed at the wrong
environment — the same class of error as #147 below, found the same day.

> [!NOTE] This is the second door out of the billing outage
> The first was [[sals3-session-2026-09-07-part144-5666-market-offers-and-the-three-markets-withdrawn|part 144]]'s
> session-credential route, which let a signed-in seller run a repair a dead
> workflow was holding. Between them, the two remaining ways to authenticate a
> privileged operation here are **Vercel Cron** (for scheduled work) and **the
> seller's own session** (for tenant-scoped work). Nothing else can reach a
> `CRON_SECRET` route.

## 4. A session spent proving nothing, against the wrong host (#147)

`vercel inspect https://sals3-portal.vercel.app` named the wrong host. The two
are different environments:

| Host | Listings | Live |
| --- | --- | --- |
| **`sals3-portal-prod.vercel.app`** (production) | **2,939** | **2,906** |
| `sals3-portal.vercel.app` | 143 | 126 |

**Both answer 200 and both serve a logged-in Seller Center**, which is why the
mistake survives. The catalogue is what separates them.

The cost, measured rather than supposed:

> I spent this session checking "is production up", reading its `data-dpl-id`, and
> confirming the Portal boots — **all against the wrong host**, so none of it
> proved anything about production. The dpl-id matching no `main` deployment was
> the symptom, and I filed it as a Vercel aliasing puzzle instead of a wrong URL.

**The repository already knew.** `PORTAL_PROD_BASE_URL` in both
`taxonomy-leaf-census.yml` and `taxonomy-seed-category-mappings.yml` defaults to
`sals3-portal-prod.vercel.app`. Only the README disagreed — *which is the shape of
staleness worth recording rather than quietly correcting.*

## 5. The reason expired; the conclusion did not (#119)

Comment-only, and the point of the PR is that `DEFAULT_STOREFRONT_ORIGIN` **must
stay untouched.**

The constant was justified by a 2026-08-29 check that `sals3.com` served
WordPress/WooCommerce. That is no longer true — the apex serves a Next.js
storefront, zero WordPress markers, `/cart` answering 200. So switching the value
to the apex was proposed. **That would have been a regression**, and the check
that caught it is why the comment exists:

| Check | Result |
| --- | --- |
| Products on `sals3.com` | 19 |
| Products on `sals3-ecommerce.vercel.app` | 19 |
| **Overlap between them** | **0** |
| `sals3.com` vs `sals3.com.fj` catalogues | **identical, 19/19** |
| A Portal product slug on the apex | **404** |

**The apex serves the Fiji catalogue, not this Portal's storefront catalogue.**
Pointing a seller's "view the listing" link there would no longer send them to
the old shop — it would send them to a live shop that has never heard of their
product, *which is worse, because it reads as the publish having failed.*

## Lessons

- **A comment that says "add this when X happens" is a task with no owner.** Both
  the Fiji host and the reason behind the storefront origin were correct when
  written and wrong within days. A conditional comment needs a check that fails,
  or it becomes documentation of a bug.
- **A single-valued constant does not read as incomplete.** Naming the
  relationship rather than the instance is what made the third market one line
  instead of a third fix.
- **Distinguish a 401 from the handler from a 401 from the wall.** One means the
  secret is wrong; the other means the request never arrived. They look identical
  in a log.
- **A write-only secret plus a dead CI is a lost capability, not an inconvenience.**
  The recovery paths are Vercel Cron and a user session — both worth knowing
  before the next outage.
- **Verify the host before believing the measurement.** Two environments that both
  answer 200 with a working login will let you spend a whole session proving
  nothing.
- **When the justification for a decision expires, re-derive the decision — do not
  assume it expired with it.** #119 nearly shipped a regression because the stale
  half of the comment was the reasoning, not the conclusion.

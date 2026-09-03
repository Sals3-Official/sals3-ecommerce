---
tags:
  - sals3
  - sals3-portal
  - bugfix
  - ux-copy
  - rate-limiting
  - storage
  - ci
  - session-note
aliases:
  - Part 128
  - Small Reported Defects, Each Given One Home
  - The Rate Limiter That Only Ever Refilled Once
created: 2026-09-03
updated: 2026-09-03
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[portal-repo-migrated-to-anythingsupplies]]"
---

# Part 128 — small reported defects, each given one home

2026-09-02/03, `sals3-portal`
[#4](https://github.com/anythingsupplies/sals3-portal/pull/4)/[#7](https://github.com/anythingsupplies/sals3-portal/pull/7)/[#8](https://github.com/anythingsupplies/sals3-portal/pull/8)/[#10](https://github.com/anythingsupplies/sals3-portal/pull/10)/[#11](https://github.com/anythingsupplies/sals3-portal/pull/11)/[#14](https://github.com/anythingsupplies/sals3-portal/pull/14)/[#26](https://github.com/anythingsupplies/sals3-portal/pull/26).

> [!NOTE] Provenance
> Written after the fact from each pull request's own record.

## The publish success dialog said it in a sentence, not a form (#7)

The panel a seller sees when a listing goes live looked like an
engineering readout: a two-row definition list — `Live listing` beside the
full storefront URL, `Offers live` beside a bare number — plus the owner's
own reaction, *"ano ang live 24?"*, which is the sharpest part of the
report: the number was not answerable on its own. Replaced with one
sentence naming the product by its own title (the link text had been the
URL itself, ellipsed mid-slug at 12px) and its variant count against the
destination it published to — *"[Small Feet Autumn and Winter Trends
All-matching Harem Pants] is on the storefront, with all 24 variants priced
for Australia."*

The count is **variants, not offer rows** — `Offers live` had rendered
`publishedOfferIds.length`, and an offer row is a `(variant, market)` pair,
a number off the schema with no meaning on the shop floor. `publishProduct`
now also returns `variantCount` and the destination's own display name
(never its `AU` code), counted from the variants themselves rather than
derived from the offer-row count divided by destinations — deliberately,
because today there is exactly one destination per publication so the two
numbers agree, and the day a second destination is added the offer-row
count would double while the variant count would not, silently turning a
sentence a seller reads into a false one with no code change to review.
The count clause is dropped entirely for a single-variant product, since
"all 1 variants" is not a sentence. A flat `text-sals3-deep` link colour
that measured roughly 1.1:1 contrast on the dark card surface also picked
up a `dark:text-primary` override in the same pass.

## The same fix had not reached the other two surfaces saying the identical thing (#10)

One day later, the Product Catalogue's own row toast and bulk-publish panel
still read `Published at /p/{slug} with 2 offer(s).` and `Live now at
/p/{slug} with 2 offers.` — the exact vocabulary the owner had already
objected to, on two screens the previous fix never touched. That is the
shape most repeat defects in this repository take: the same rule fixed in
one file and not in the others that say the same thing. `lib/products/
publish-outcome-scope.ts` now owns the sentence clause once — `with all 24
variants priced for Australia`, or just `priced for Australia` for a single
variant — and the dialog, the row toast, and the bulk panel each compose it
behind their own verb, so a fourth surface gets it right by construction
rather than by whoever writes it next remembering the rule. `PublishOutcome`
now carries `variantCount`/`marketName` in place of `slug`/`offerCount`; the
`/p/{slug}` path was dropped for the same reason the dialog dropped it — an
engineering detail on a row that already offers a working "View Live Page."

`offerCount` is gone entirely from `publishProductAction`, since nothing
reads it there any more — the exact kind of unused field that otherwise
gets wired to a new surface with the wrong meaning later. It survives on
`POST /api/internal/products/[id]/publish`, checked rather than assumed:
the automation's `quick_publish.py` reads `published.get("offerCount")`
over that wire, so removing it there would have broken a real caller. The
row's own toast had **no test at all** asserting its text, which is how it
survived the dialog fix by a full day.

## A SIT-published listing's "see it live" link pointed at production (#14)

A listing published on SIT gave the seller a link to view it live, and the
link pointed at **production** — a shop that has never held a SIT-published
product — so it answered "We couldn't find that product" on a listing that
had gone live seconds earlier, the 404 visible next to the success dialog
in the same screenshot. `SALS3_STOREFRONT_BASE_URL` already existed to fix
exactly this, and nobody had ever set it on SIT — the same failure shape as
part 124's unreachable Vercel secret: configuration that has to be added by
hand to the one deployment that needs it tends to stay unset forever.

`storefrontOrigin()` now derives the deployment stage from
`CLOUDFLARE_R2_KEY_PREFIX` when no explicit base URL is configured: `sit`
resolves to `https://sit.sals3.com`, anything else keeps the production
storefront, and an explicit `SALS3_STOREFRONT_BASE_URL` still wins when
set. That env var's name only mentions R2, but the deployment stage is
already what it holds on every deployment (`r2-client.ts`'s own doc comment
already calls it that) — reading a value that already exists per stage
beats adding a second one free to disagree with it. `uat` is deliberately
left unmapped: nobody has stated what the UAT storefront's address is, and
guessing a subdomain would ship the exact 404 this change exists to stop,
one environment over — a test pins that gap on purpose, so the day UAT
gets a real address is the day that test has to change, not silently
drift. Not fixed here because it is a dashboard setting rather than code:
`sit.sals3.com` sits behind Vercel Deployment Protection and shows an
anonymous visitor a Vercel sign-in page regardless of how correct the link
now is.

## Each environment's photo storage got its own key namespace (#4)

All three environments — Production, UAT, SIT — write into the same R2
bucket, and before this PR all three wrote the identical key shape:
`seller-media/<productId>/<uuid>.webp`. Because the two preview databases
are Neon **branches** of production, they carry the **same product ids** as
production — so an upload on SIT landed in the exact folder Production
serves from, and a delete on SIT could remove a photo that is live on
`sals3.com`.

An optional sixth env var, `CLOUDFLARE_R2_KEY_PREFIX`, and a new
`r2ObjectKey` helper threaded through all four `PutObjectCommand` writers
(seller media, supplier-media mirroring, description-block images, review
photos) now prefix every write with the deployment stage, e.g.
`sit/seller-media/<productId>/<uuid>.webp`. An unset prefix means no
prefix at all — the original root-level keys — which is the deliberate
default: **no environment changes behaviour until its own prefix variable
is set**, and nothing is moved or renamed for objects already in the
bucket. Reads need no change at all: `product_media_sources` stores the
full public URL a writer already built, and the delete path recovers the
key by stripping the same base it was built from — both prefix-agnostic by
construction. The prefix also sits outside `readR2Config`'s all-or-nothing
validation, so it can never turn an otherwise-working config into
`STORAGE_NOT_CONFIGURED`.

**Left incomplete on purpose, outside the repo**: the Production (`main`)
Vercel environment does not yet have its own `CLOUDFLARE_R2_KEY_PREFIX` set
— that needs Owner-level Vercel permission the PR's author did not have —
so Production keeps writing root-level keys exactly as before until it is
set.

## The rate limiter never actually enforced its own configured rate (#26)

Every rate-limit config in the repository reads as a genuine rate —
`{capacity: 240, refillIntervalMs: 10_000}` on media reorder,
`{capacity: 30, refillIntervalMs: 2_000}` on live browse,
`{capacity: 12, refillIntervalMs: 60_000}` on draft creation — but the
token bucket implementation added exactly **one token per whole interval
elapsed**, regardless of `capacity`. So `capacity` only ever controlled the
size of the initial burst, and all thirty call sites in the codebase
settled to a sustained rate of 1 token per interval no matter what number
was actually configured.

It surfaced concretely on the listing automation: one draft per **minute**
after the initial burst — 3.5× stricter than CJ's own published rate
ceiling (50,000 points/day, which works out to roughly 34.7 points/minute
replenishing, against roughly 10 points per draft, so about 3 drafts/minute
sustained is the actual polite rate CJ allows).

Refill is now proportional — one token every `interval / capacity` — with
two details that come with getting this right rather than merely faster:
`lastRefillAt` advances by **whole tokens consumed**, not reset to `now`,
so a client polling faster than the refill rate still accrues a fractional
token toward its next one instead of that fraction being discarded on every
poll (which would starve a fast poller of tokens it had actually earned);
and `retryAfterMs` now reports the real remaining wait rather than a flat
whole interval regardless of how close the next token actually is.

**Effect per surface, measured against the fix**: drafting moved from
1/minute to the configured 12/minute, media reorder to 240/10s, live browse
to 30/2s, storefront reviews to 10/minute. Burst ceilings (the `capacity`
figure itself) were already correct and are unchanged.

## Also in this window

**#8**, `chore(ci): fail when a merge does not reach its environment` — adds
the `Deployment Reached The Environment` workflow that this repository's
`AGENTS.md` and README now document as mandatory reading before claiming a
change is "live": it checks the deployment status of the commit a promoted
branch actually points at, rather than trusting that a green `Verify` run
and a completed merge mean the code is running anywhere.

**#11**, `chore: clear the six real lint warnings, keep the five deliberate
ones` — a plain lint-debt pass; the five kept warnings are deliberate,
named individually in the PR rather than left unexplained.

## What was not done

Production's own `CLOUDFLARE_R2_KEY_PREFIX` is still unset, pending Owner
Vercel access — the per-environment isolation #4 built does not yet cover
the one environment (Production) where a cross-environment photo deletion
would matter most; it is simply not yet reachable from SIT/UAT under the
current default.

## Lessons

- **The same UX rule fixed on one surface and not its siblings is the
  most common repeat defect in this repository** — the publish-sentence fix
  landed on the dialog and left the row toast and bulk panel saying the
  exact thing the owner had already objected to, until the rule was given
  one shared module instead of three independent authors.
- **Configuration that must be added by hand to the one deployment that
  needs it tends to stay unset indefinitely** — `SALS3_STOREFRONT_BASE_URL`
  on SIT and, in the same batch, `CLOUDFLARE_R2_KEY_PREFIX` on Production
  are both instances of the same failure shape already named in part 124:
  derive the value from something already set per environment before
  asking a person to set a second thing by hand.
- **A rate-limit config that "reads as a rate" still needs a test pinning
  the actual sustained rate, not just the burst ceiling** — thirty call
  sites had been silently throttled to 1/interval for as long as the bucket
  existed, and every one of their configured `capacity` values was
  correctly ignored by an implementation that looked, at a glance, like it
  was using them.

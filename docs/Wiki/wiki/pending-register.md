---
tags: [governance, pending, backlog, register, sals3]
aliases:
  [
    "Pending Register",
    "Open Work Register",
    "What Is Still Pending",
  ]
created: 2026-09-09
updated: 2026-09-09
status: canonical
authority: open-work-register
owner_approved: true
related:
  - "[[sals3-management-bible]]"
  - "[[hot]]"
  - "[[parked-ideas-backlog]]"
  - "[[vault-session-note-conventions]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
---

# Pending Register

> [!IMPORTANT] This is the one place open work is readable at a glance
> [[sals3-management-bible#6. Every commit and pull request declares what it left undone|Bible section 6]] requires every commit and pull request to
> declare what it left undone. Declaring it *only* in the commit or the PR does
> not make it findable — nobody re-reads three hundred pull requests. **The same
> declaration is mirrored here, in the same task**, so the backlog can be read in
> one place and worked down.

## What belongs here, and what does not

| | Goes where |
| --- | --- |
| Work a change deliberately left undone | **here** |
| A gap found in passing and not fixed | **here** |
| An idea the owner told you to park or shelve | [[parked-ideas-backlog]] — *not* here |
| Something wrong in **production right now** | [[hot]]'s *Active risks and blockers*, and **referenced** from here by one line — never copied |

That last row is the rule that keeps one source of truth. `hot.md` stays the
authority on live product risk with the full evidence; this register carries a
pointer so the item is still visible when reading the backlog as a list.

## Urgency levels — judged by consequence, not by feeling

A level is a claim about what happens if this is left alone, which is why each
one names a consequence rather than a mood:

| | Meaning | Timing |
| --- | --- | --- |
| **P0** | Money or data is wrong **right now** — a buyer charged incorrectly, an order lost, a record being corrupted | Before the next merge |
| **P1** | A decision is blocked, or a live surface tells someone something untrue | This week |
| **P2** | A known gap with a workaround that keeps costing time | Scheduled |
| **P3** | Hygiene and debt; nobody is harmed | When next touching that area |

If two levels seem to fit, take the higher one and say why in the entry. A level
argued down without evidence is how a P0 becomes a P3.

## Entry format

```markdown
### [P1] Short statement of what is not done
**Raised:** 2026-09-09, PR #242 · **Closes when:** <the observable condition>
**Owner:** agent | owner (Bogs/AJ) | blocked on <what>

Why it matters, in a sentence or two, with the evidence that makes the level
honest. Link the session note or ADR that carries the detail.
```

**Closing an entry:** strike the heading through, add the date and the PR that
closed it, and leave it in place for one month before deleting — the same
discipline [[parked-ideas-backlog]] uses. A register that only ever grows stops
being read.

---

## Open

### [P1] "The same test" at every stage is not defined
**Raised:** 2026-09-10, the bible section 7 PR · **Closes when:** a named post-deploy checklist exists for a deployed SIT/UAT/Main host, or the owner confirms the tester's own judgement is the standard
**Owner:** owner to decide the bar; agent can draft the checklist

Bible section 7 requires the same test at SIT, UAT and Main for Global, FJ and
AU. `npm run verify` covers the code **before** it deploys; nothing exercises a
**deployed** host, and the three storefronts share no post-deploy checklist. So
"tested" currently means whatever the person or agent running it decided. The
rule's own mitigation is that whoever tests must say what they observed — that
contains the ambiguity, it does not remove it.

### [P2] Nothing enforces the three-stage gate or its tests
**Raised:** 2026-09-10, the bible section 7 PR · **Closes when:** a promotion into `pre-prod` or `main` without a recorded test result is refused, or the owner accepts convention
**Owner:** owner — the only mechanical place to check it is a GitHub Action

`deployment-reached-the-environment.yml` exists on two repositories and is still
missing on both market storefronts (see the 2026-09-08 amendment), and Actions is
billing-stalled everywhere except the vault repository. So the gate is a rule
people follow, not a check that fails — the same shape as the pending rule before
its `commit-msg` hook.


### [P2] A buyer cannot tell either market storefront where they are shipping, before checkout
**Raised:** 2026-09-09, `sals3.com.fj` #41/#42 and `sals3.com.au` #33/#34 · **Closes when:** a writer for `sals3_destination` exists again, or the owner confirms the market seed is enough
**Owner:** owner — it was an owner decision to remove the picker

The `Ship to` picker was withdrawn on 2026-08-28 and was the cookie's **only**
writer. The checkout form now seeds from the deployment's market instead of from
geo, which fixes the visible symptom, but the buyer still has no way to state a
destination — so the cart's cannot-ship notice and the approximate price still
run on geo alone, and only a cookie predating 2026-08-28 carries a real choice.
ADR-003 §1 calls the buyer's selection the browsing source of truth and nothing
can currently produce one. See [[sals3-session-2026-09-09-part161-the-fiji-and-australian-storefronts-were-asking-for-a-philippine-address|part 161]] and ADR-003's `Amendment — 2026-09-09`.

### ~~[P2] The checkout country seed has never been observed on SIT~~ — closed 2026-09-10, `sals3.com.fj` #43
Observed on `sit.sals3.com.fj` in a signed-in browser: the address form seeded
**Fiji** and **+679**, with the five Fijian divisions and Western Division's
towns. The Australian half is **still unobserved** — `sit.sals3.com.au` has no
catalogue to check out from (see below).

### [P1] No order has reached CJ since 2026-09-03
**Raised:** 2026-09-10, CJ census · **Closes when:** the cause is known, or a new order is seen arriving
**Owner:** agent to investigate

51 Sals3 orders exist at CJ; the most recent is `S3-20260903-9C8588EF0C`. A week
of silence is either correct (nobody ordered) or a broken fulfilment leg, and
nothing distinguishes them from outside. Related and unproven: the payment→CJ
leg was **not** exercised on 2026-09-10 — the run stopped at Stripe Link, which
asks for a verification code an agent must not enter.

### [P1] Sixteen orders already at CJ carry an undeliverable phone number
**Raised:** 2026-09-10, CJ census · **Closes when:** the owner decides to repair them or accept them
**Owner:** owner

`sals3.com.fj` #43 and its twins stop **new** bad numbers; they repair nothing
already sent. 9 orders hold a bare `+639` and 7 hold `+6399271739215`. If any is
still expected to ship, the courier cannot reach the buyer. See
[[sals3-session-2026-09-10-part162-sixteen-of-twenty-five-orders-reached-cj-unreachable|part 162]] §1.

### [P2] Four orders are stranded at CJ, two of them real money
**Raised:** 2026-09-10, CJ census · **Closes when:** each is swept, reconciled, or written off
**Owner:** owner

`S3-20260828-EF28C4D429` and `S3-20260830-4F919D5020` sit at `CREATED` with
`paymentDate: null` — a CJ order that will never ship, with nothing sweeping it.
`S3-20260818-D6134CEAE2` (US$122) and `S3-20260818-8272210D40` are in `TRASH`
with `isSandbox: 0`. ADR-004's reconciliation is the eventual home for this.

### [P2] The checkout country seed has never been observed on SIT
**Raised:** 2026-09-09, the same four PRs · **Closes when:** the address form is opened on `sit.sals3.com.fj` and `sit.sals3.com.au` and shows Fijian and Australian divisions
**Owner:** agent or owner — one signed-in page load each

All four merged to `develop` and nothing was promoted. Verification is a local
`npm run verify` plus two guards proved by breaking them; **no one has looked at
the rendered form on a deployed host.** Checkout sits behind the auth guard, so
this needs a signed-in session rather than a `curl`.

### [P3] Whether the shared storefront carries the checkout-seed files is unverified
**Raised:** 2026-09-09 · **Closes when:** `anythingsupplies/sals3-ecommerce` is checked
**Owner:** agent

There is no local clone of `anythingsupplies/sals3-ecommerce` on the Windows
machine — `E:\sals3-ecommerce` is the old `Sals3-Official` vault repository. That
deployment sets no market, so the change is a no-op there and nothing is broken;
what is unknown is whether it even has `market-checkout-country.ts`, and
therefore whether the twin-PR convention is owed a port.

### [P3] `louieboi09` cannot see three of the six `anythingsupplies` repositories
**Raised:** 2026-09-09, while pushing #33 · **Closes when:** the account is added as a collaborator, or the convention is rewritten to name the account that can act
**Owner:** owner — repository access

A push to `sals3.com.au` failed with `Repository not found` — not a permissions
error, an invisibility. `sals3.com.au`, `sals3-portal-automation` and
`sals3-admin-portal` are visible only to the `anythingsupplies` account. This
also silently no-ops the assignee convention in
[[team-profile-and-collaboration-preferences]] (*assignee = Bogs*), which
`gh pr create` accepted and then dropped on #33.

### [P0] A paid checkout produces no order in production
**Raised:** carried from [[hot]] · **Closes when:** a real payment produces a Sals3 order and a CJ fulfilment
**Owner:** owner — credentials only

`STRIPE_SECRET_KEY` on Production holds an API key **id** (`mk_…`), which Stripe
rejects, and `STRIPE_WEBHOOK_SECRET` is unset. A buyer who genuinely pays sees a
receipt — the success page reads the Stripe session — and **no order exists**.
Full evidence in [[hot]]'s active-risks entry; not duplicated here.

### [P1] The urgency levels in this register are an agent's judgement, not the owner's
**Raised:** 2026-09-09, the PR that created this register · **Closes when:** Bogs has read the levels and corrected any that are wrong
**Owner:** owner

Every level below was assigned by the agent that seeded this file. **A level
argued wrong is how a P0 gets worked last.** The two worth checking first are the
Stripe entry marked **P0** and the Sponsored-label entry marked **P1** — both
carry a consequence claim that only the owner can confirm.

### ~~[P2] Nothing enforces the pending rule~~ — CLOSED 2026-09-09
**Closed by:** `.husky/commit-msg` + `scripts/check-pending.mjs`, same day it was raised
**Was:** agent, on owner's go-ahead

A Husky `commit-msg` hook could reject a message with no `Pending` block, the way
branch naming is currently conventional rather than checked. **Until then the
rule depends on memory, and rules that depend on memory decay** — which is
exactly what happened to [[sals3-skills]], four weeks stale before anyone noticed.

### [P3] The hook guards commits; a PR body is still on trust
**Raised:** 2026-09-09 · **Closes when:** a PR opened without a `Pending` block is caught automatically, or the owner accepts the gap
**Owner:** owner — the only place to check it is a GitHub Action, and Actions is what is not being paid for

`scripts/check-pending.mjs --stdin` can validate a body before opening the PR,
but nothing forces anyone to run it. On this repository Actions does still run,
so a check is technically possible — it would just spend the minutes the rest of
this regime exists to avoid.

### [P3] Three entries here are carried from `hot.md` rather than re-verified
**Raised:** 2026-09-09 · **Closes when:** each has been checked against production and dated
**Owner:** agent

The Stripe credentials, the Sponsored label and migration `0030`. Their evidence
is as fresh as `hot.md`'s, which is not the same as checked this week.

### [P3] PRs #239–#242 predate this rule and carry no `Pending` block
**Raised:** 2026-09-09 · **Closes when:** accepted as-is, or the blocks are added retroactively
**Owner:** owner — it is a question of whether the gap matters

Their open items are seeded into this register by hand, so nothing is lost; what
is missing is the per-PR mapping that later entries will have automatically.

### [P1] Dependabot is disabled on the repository the app deploys from
**Raised:** 2026-09-09, PR #241 · **Closes when:** alerts are enabled on `anythingsupplies/sals3-ecommerce`
**Owner:** owner — repository setting

`403: Dependabot alerts are disabled for this repository.` The **vault**
repository is scanned and the **production code** repository is not, which is
backwards. See skill 102 in [[sals3-skills]].

### [P1] A live finance advertisement carries no visible "Sponsored" label
**Raised:** carried from [[hot]] · **Closes when:** the label is restored or the campaign is pulled
**Owner:** owner — it was an owner decision to remove it

ACCC guidance puts the disclosure duty on the platform as well as the
advertiser. Described as a five-line change. Full evidence in [[hot]].

### [P2] The legacy Vercel project puts a permanent red check on every vault PR
**Raised:** 2026-09-09, PR #242 · **Closes when:** the project is detached or deleted from `Sals3-Official/sals3-ecommerce`
**Owner:** owner — Vercel dashboard

It deploys a repository that no longer holds the application. Every vault pull
request now fails a check that cannot pass, and **that is how reviewers learn to
stop reading checks** — which costs more than the signal is worth. See
[[sals3-session-2026-09-09-part160-nobody-is-paying-so-the-agent-is-the-ci|part 160]].

### [P2] The fourth tier of supplier-leaf mappings has never been seeded to production
**Raised:** carried from [[hot]] · **Closes when:** one `taxonomy-seed-category-mappings` dispatch runs against production
**Owner:** blocked on Actions billing — or run through the Vercel Cron path added in `sals3-portal` #123

**78.2% is the reviewed figure, not the live one.** Also owed: the `#111`
mojibake fix, which needs the same dispatch. See
[[sals3-session-2026-09-07-part150-four-taxonomy-seed-corrections-two-of-them-self-inflicted|part 150]].

### [P2] Fiji shows FJD and charges USD
**Raised:** 2026-09-09, PR #240 · **Closes when:** `capabilities.ts` sets `FJ` to `FJD` **and** the storefront stops converting an already-Fijian price, in one release
**Owner:** agent, on owner's go-ahead — the ordering is the risk

Steps 1–3 of ADR-003's Fiji amendment are live; step 3b is wired and switched
off. **This is disclosed rather than hidden** — the storefront says payment is
taken in US dollars — which is what keeps it P2. Per-step ledger in
[[ADR-003-international-availability-shipping-and-pricing]].

### [P2] `NEXT_PUBLIC_SITE_URL` is unset on the apex, so `sals3.com` serves no canonical and no sitemap
**Raised:** 2026-09-09, PR #240 · **Closes when:** the variable is set on Production, typed **Config and never Secret**, and the project redeployed
**Owner:** owner — Vercel environment

A Secret `NEXT_PUBLIC_*` never reaches the build and evaluates to empty. Until
this is set, the whole SEO layer shipped in `sals3-ecommerce` #33 is inert on the
flagship domain. See [[sals3-session-2026-09-08-part153-the-canonical-layer-switched-on-across-three-storefronts|part 153]].

### [P2] Both market storefronts are missing the promotion-gate workflow
**Raised:** 2026-09-09, PR #240 · **Closes when:** `deployment-reached-the-environment.yml` exists on `sals3.com.fj` and `sals3.com.au`
**Owner:** agent

Both READMEs state the three-stage table verbatim while neither repository
enforces it. **A README that states a rule the repository does not enforce is
worse than silence.** See [[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]'s 2026-09-08 amendment.

### [P3] `sals3.com.fj`'s `pre-prod` carries a README its `develop` does not
**Raised:** 2026-09-09, PR #240 · **Closes when:** the change is back-merged down to `develop`
**Owner:** agent

`+61/-11`, the only tree difference anywhere in the org. The branch that stages
releases describes the deployment differently from the branch every feature
starts from. See [[sals3-session-2026-09-08-part157-promote-with-a-merge-commit-never-a-squash|part 157]].

### [P3] Ten lesson notes are referenced and were never written
**Raised:** 2026-09-09, PR #241 · **Closes when:** each target exists, or the reference is repointed at the skill that holds it
**Owner:** agent

`array-agg-distinct-biases-the-sample`, `category-routing-and-breadcrumb`,
`cj-wallet-currency-and-au-funding-fx-gap`, `drizzle-wraps-pg-error-codes`,
`portal-repo-migrated-to-anythingsupplies`, `portal-shared-worktree-multi-agent`,
`sals3-portal-seller-photo-upload-manager`, `sals3-portal-strict-reference-rule`,
`shopee-orders-ia-and-cj-statuses`, `taxonomy-v1-is-google-taxonomy`. Two of the
original twelve were closed this way already — skill 101 absorbed one, and
[[vault-session-note-conventions]] was written for the other.

### [P3] The `nanoid` Dependabot alert is stale and still open
**Raised:** 2026-09-09, PR #241 · **Closes when:** dismissed, or auto-closed by the next push touching `package-lock.json`
**Owner:** owner — dismissing changes visible security state

Patched since before the alert was raised; see skill 102 for the dating check
that proves it.

### [P3] Migration `0030_lean_blizzard` is applied to production but absent from the ledger
**Raised:** carried from [[hot]] · **Closes when:** one more run of the same `workflow_dispatch`
**Owner:** blocked on Actions billing

Any process reasoning about schema version from `__drizzle_migrations` will be
wrong about this table. Full evidence in [[hot]].

## Closed

*Nothing yet. Closed entries are struck through here with their closing date and
PR, and removed after a month.*

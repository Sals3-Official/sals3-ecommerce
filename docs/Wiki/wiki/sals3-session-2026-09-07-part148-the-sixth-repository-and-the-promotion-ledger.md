---
tags: [session-record, sals3, governance, adr-019, repositories, environments, vault-maintenance]
aliases:
  [
    "Part 148",
    "The sixth repository and the promotion ledger",
    "sals3.com.au",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-session-2026-09-03-part133-the-migration-to-anythingsupplies-and-the-sync-that-keeps-the-vault-out]]"
  - "[[sals3-session-2026-09-04-part140-the-automation-repository]]"
  - "[[sals3-session-2026-09-07-part147-a-market-storefront-offers-its-own-country]]"
  - "[[vault-governance-and-note-lifecycle]]"
---

# Part 148 — `sals3.com.au`, the sixth repository, and the promotion ledger

> [!IMPORTANT] This vault has never named a live production storefront
> `anythingsupplies/sals3.com.au` serves **A$ prices on a production domain**
> and has done since 2026-09-07. Before this note, a vault-wide search for
> `sals3.com.au` returned **two incidental hits**, both in
> [[sals3-session-2026-08-28-part82-a-shopfront-per-country-and-a-price-in-local-money|part 82]],
> where it appears as a **rejected domain proposal**. [[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]
> says *"four repositories"*; [[hot]] calls `sals3-portal-automation` *"the
> fifth"*. There are **six**.

> [!NOTE] Provenance
> Written 2026-09-08 from a full enumeration of `anythingsupplies` through the
> GitHub API — every repository, every branch, every merged pull request, and
> the presence or absence of `deployment-reached-the-environment.yml` — diffed
> against every `anythingsupplies/**/pull/N` citation in this vault. The
> environment facts are quoted from the four README commits that recorded them.

## 1. The six repositories, audited 2026-09-08

| Repository | Branches | Gate workflow | Merged PRs | Status |
| --- | --- | --- | --- | --- |
| `sals3-portal` | all three | **yes** | 165 | compliant |
| `sals3-ecommerce` | all three | **yes** | 32 | compliant |
| `sals3.com.fj` | **all three** | **NO** | 34 | branch gap closed, workflow still missing |
| `sals3.com.au` | all three | **NO** | 10 | **never described in this vault** |
| `sals3-portal-automation` | all three | n/a by design | 2 | exempt — see [[sals3-session-2026-09-04-part140-the-automation-repository\|part 140]] |
| `sals3-admin-portal` | **none — empty** | n/a | 0 | zero commits on `anythingsupplies` |

**Two corrections to [[hot]]'s existing table.** It records `sals3.com.fj` as
having **no `pre-prod`** — that gap is closed; the branch was created for the UAT
stage on 2026-09-07 (`sals3.com.fj` [#19](https://github.com/anythingsupplies/sals3.com.fj/pull/19)).
And it lists five repositories where there are six.

**What is still owed:** `deployment-reached-the-environment.yml` on **both**
market storefronts. `sals3.com.fj`'s own README states the three-stage table
verbatim while the repository carries no workflow to enforce it; `sals3.com.au`
inherited that shape when it was forked.

> [!CAUTION] The gate cannot report on the portal either
> Every workflow in `anythingsupplies/sals3-portal` has been failing in ~4s
> unstarted since 2026-09-04 on Actions billing, and the owner has decided those
> bills will not be paid. So on that repository a red X is not a code signal
> **and the gate itself cannot run.** Compliance in the table above is the
> presence of the file, not evidence it has ever executed.

## 2. Why `sals3.com.au` exists at all

It is the third fork of one storefront codebase. The lineage:

1. `sals3-ecommerce` — the shared storefront, `sals3.com`, no market.
2. `sals3.com.fj` — forked byte-identical, then taught to say "Bula, Fiji."
   behind one flag ([[sals3-session-2026-09-04-part131-a-byte-identical-copy-learns-to-say-bula-fiji|part 131]]).
3. `sals3.com.au` — the same again for Australia.

Each is **its own repository and its own Vercel deployment**, reading the one
Portal. That is why `sals3-portal` #135 replaced a single-address constant with a
list per host: *a third market is now one line there rather than a second
constant.* See [[sals3-session-2026-09-07-part149-notify-every-market-storefront-and-two-jobs-onto-vercel-cron|part 149]].

The consequence the vault must carry: **every storefront defect now exists in
three places.** Part 147 records six PRs that are three fixes applied twice.

## 3. The environment records, and the two Vercel behaviours that present as DNS faults

Four README-only commits recorded stage configuration that existed nowhere else.

### `sals3.com.au` [#1](https://github.com/anythingsupplies/sals3.com.au/pull/1) — the Australian UAT stage

`pre-prod` serves **https://uat.sals3.com.au** against Portal UAT and the
`sals3-uat` Firebase project. Two Vercel behaviours written down *because both
present as something else*:

- **A branch pointing at an already-deployed SHA gets no build** — Vercel
  deduplicates by SHA, so a promotion merge commit is what binds a stage's
  environment.
- **A deployment created through the API does not take the branch domain.**
  `sit.sals3.com.au` answered `404` for ten minutes while the deployment sat
  `READY` with only `.vercel.app` aliases, the domain `verified: true` and
  `misconfigured: false`. A redeploy assigned it and the host answered `200`
  within 75 s.

**Neither is a DNS fault, and both would be diagnosed as one.** The same
no-build-on-duplicate-SHA behaviour is recorded independently in `sals3.com.fj`
#19, which is how it earned a place here rather than in one repository's memory.

Also recorded: the stages are **genuinely isolated rather than assumed to be** —
Portal UAT answers `401` to the SIT storefront token, measured.

### `sals3.com.fj` [#19](https://github.com/anythingsupplies/sals3.com.fj/pull/19) — the Fiji UAT stage

`pre-prod` serves `uat.sals3.com.fj`, paired with `uat.sals3.com` and the
`sals3-uat` Firebase project — the same shape `develop` has with SIT.

| Piece | State |
| --- | --- |
| `pre-prod` branch | pushed |
| `uat.sals3.com.fj` | attached to `pre-prod`, `verified: true` |
| Vercel env, `pre-prod` scope | 20 rows |
| Firebase | `sals3-uat`, WIF audience for project `295573716316` |
| Portal | `sals3-portal-uat.vercel.app` |
| Stripe webhook | `we_1UCtAkRoCZXgle3rppwJL7hs`, 3 events, `2026-07-29.dahlia` |
| `SALS3_STOREFRONT_API_TOKEN` | rotated across portal, `.com` and `.com.fj` on `pre-prod` |

### `sals3.com.fj` [#20](https://github.com/anythingsupplies/sals3.com.fj/pull/20) — the two Firebase steps

`uat.sals3.com.fj` sign-in did not work, and the fix was **configuration, not
code**, in `sals3-uat`:

1. the `vercel-oidc` provider attribute condition widened to accept this
   project's Vercel id, alongside the existing one;
2. `uat.sals3.com.fj` added to Authentication authorised domains.

The service-account binding needed nothing — it is granted to
`attribute.environment/preview`, which both Vercel projects already satisfy.
**Recorded in the one place someone standing up a third environment will look**,
which is exactly what happened days later with `sals3.com.au`.

### `sals3.com.fj` [#21](https://github.com/anythingsupplies/sals3.com.fj/pull/21) — production

Two production facts a preview-only reading of the README gets wrong:
`all_except_custom_domains` **does not exempt preview branch domains** (so `sit.`
and `uat.` need a bypass and `sals3.com.fj` does not), and production env vars
are **Owner-only** — a DEVELOPER gets a `hiddenProductionEnvCount` instead of the
rows.

### `sals3.com.fj` [#26](https://github.com/anythingsupplies/sals3.com.fj/pull/26) — the FX label, corrected rather than deleted

A docs bullet claimed the short `Approximate — charged in US dollars.` label sits
on a grid of cards. It does not, and has not since the label moved to page level.
The short form is **not dead**, which is the part worth getting right rather than
deleting: `INDICATIVE_SHORT_NOTE` has exactly one live consumer,
`IndicativePriceLine`, which renders it per row where a single line needs its own
label. The bullet now separates three cases — once per page for a grid, per row
where a row stands alone, full sentence on the PDP and cart.

## 4. The promotion ledger — 109 pull requests that get no entry

A full enumeration on 2026-09-08 found **243 merged pull requests** across the
six repositories, of which **154 carried no citation anywhere in this vault.**
Split by kind:

| Kind | Count | Treatment |
| --- | --- | --- |
| substantive (`feat` / `fix` / `docs` / `refactor` / the Fiji release) | **45** | one entry each, grouped by theme — parts 143–153 |
| promotion halves (`promote: develop → pre-prod`, `promote: pre-prod → main`, `Release:`) | **109** | **no entry, by policy — this section is the entry** |

**A promotion PR is not work.** It is the ADR-019 gate carrying an
already-reviewed diff from one branch to the next, almost always in identical
pairs — `#71`/`#72` carry `#70`; `#127`/`#128` carry the list-facts DDL. Giving
each its own note would triple the vault's session record while adding nothing a
reader could act on, and it would violate this vault's own rule that a decision
gets **one home**.

What the pairs *do* record, and what is worth keeping:

- **The gate was actually walked.** Every substantive PR in parts 143–153 has a
  matching pair, so nothing reached `main` by skipping `pre-prod`. That is
  ADR-019 being obeyed under conditions where the workflow that checks it could
  not run.
- **Some promotions bundle.** `sals3-portal` #100/#101 is titled *"specs answer,
  and #94 rides along"* — a promotion that carried a second change with it. Where
  that happened the substantive note names both.
- **Two carried nothing at all.** `sals3-ecommerce` #30/#31 are `+0/-0`,
  0 files — a redeploy to pick up `STOREFRONT_REVALIDATE_SECRET`. An empty
  promotion is a legitimate act here: it is how a Vercel deployment is made to
  re-read its environment.

> [!NOTE] Standing convention, from this note forward
> Session records cite the **substantive** PR. Promotion halves are named only
> when one bundles a change of its own, carries nothing (a redeploy), or fails.
> A promotion pair is assumed to exist for every merged change; where one does
> **not**, that is the finding worth writing down.

## 5. What this changes in the vault

- [[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]] needs
  an amendment: **six repositories, not four**, with `sals3.com.au` named and the
  audit table above replacing the one in [[hot]].
- [[hot]]'s *"Three of five `anythingsupplies` repositories are still missing
  pieces of the promotion gate"* becomes **two of six**, and for a different
  reason than it records: the `sals3.com.fj` branch gap is closed, and the
  outstanding item on both market storefronts is the **workflow**.

## Lessons

- **A repository can go to production without ever being written down.** Forking
  a storefront is cheap; the fork inherits every open defect and adds a place the
  vault has to know about. The count of repositories is a fact worth re-deriving
  rather than remembering.
- **Enumerate the org, do not recall it.** Both the fifth repository
  ([[sals3-session-2026-09-04-part140-the-automation-repository|part 140]]) and
  the sixth were found by listing, not by memory — and the sixth was found while
  auditing the fifth's own ADR.
- **A README that states a rule the repository does not enforce is worse than
  silence.** Both market storefronts print the three-stage table and carry no
  gate workflow.
- **Record configuration in the repository that needs it next.** The two Firebase
  federation steps written down for Fiji UAT are precisely what standing up
  Australia required a day later.
- **Two behaviours that present as DNS faults deserve a written home.** No build
  on a duplicate SHA, and no branch domain on an API-created deployment. Both
  were diagnosed as DNS at least once.

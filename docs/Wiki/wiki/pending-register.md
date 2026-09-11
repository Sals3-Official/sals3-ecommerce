---
tags: [governance, pending, backlog, register, sals3]
aliases:
  [
    "Pending Register",
    "Open Work Register",
    "What Is Still Pending",
  ]
created: 2026-09-09
updated: 2026-09-11
status: canonical
authority: open-work-register
owner_approved: true
related:
  - "[[sals3-management-bible]]"
  - "[[hot]]"
  - "[[parked-ideas-backlog]]"
  - "[[vault-session-note-conventions]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[sals3-repository-register]]"
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

### [P1] Three `Sals3-Official` repositories are public, including this vault
**Raised:** 2026-09-11, the repository-register PR · **Closes when:** Bogs or AJ decides each one's visibility and the decision is recorded in [[sals3-repository-register]] §5
**Owner:** owner (Bogs/AJ) — visibility is outward-facing and irreversible in effect

`Sals3-Official/sals3-ecommerce` (which holds **this entire vault**),
`Sals3-Official/sals3-portal`, and `Sals3-Official/sals3-admin-portal` (which
holds the Admin Portal's authentication and audit implementation) are all
**public**. All six `anythingsupplies` repositories are private.

**This is not a leaked-secret finding.** A pattern scan across `docs/Wiki/`
returns no `sk_live_`, `whsec_`, `AIza`, `gh[po]_`, `postgres://` or JWT. What
is world-readable is commercial and operational intelligence: the margin and FX
policy, supplier cost reasoning, CJ account behaviour, the environment topology,
and the Stripe webhook and Firebase project identifiers quoted in
[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger|part 148]] §3.

[[sals3-session-2026-08-11-part32-admin-portal-control-tower-direction|Part 32]]
recorded `sals3-admin-portal` as public on 2026-08-11 when it held a 22-byte
README — accurate then. The application landed two days later and nobody
re-read the setting. **No agent should flip this**; anything already cloned or
indexed stays cloned and indexed. See
[[sals3-session-2026-09-11-part169-the-eleven-repositories-and-the-admin-portal-nobody-audited|part 169]] §4
and skill 127.

### [P1] The Admin Portal is in the vault-only org and has never had a promotion gate
**Raised:** 2026-09-11, the repository-register PR · **Closes when:** the application is migrated to `anythingsupplies/sals3-admin-portal` with `develop`/`pre-prod`/`main` and the gate workflow, or ADR-019 is amended to exempt it deliberately
**Owner:** owner (Bogs) — a repository migration, with the PR-numbering and identity consequences part 133 documents

[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate|ADR-019]]
§1 names `sals3-admin-portal` as an `anythingsupplies` repository where code is
worked and merged. `anythingsupplies/sals3-admin-portal` is **empty** — `409
Git Repository is empty.`, `size: 0`, zero commits since 2026-09-01. The
application is in `Sals3-Official/sals3-admin-portal`: three merged PRs,
employee auth over its own `sals3_admin` database, and an append-only audit
trail enforced by Postgres triggers.

It is the **only** application repository with no `pre-prod`, no `main`, no
`.github/workflows` directory and zero Actions runs — so the promotion
discipline every other repository is held to has never applied to the one
holding the platform-wide control plane. The 2026-08-31 migration
([[sals3-session-2026-09-03-part133-the-migration-to-anythingsupplies-and-the-sync-that-keeps-the-vault-out|part 133]])
moved the portal and the storefront and left this one behind. See
[[sals3-repository-register]] §4 and skill 124.

### ~~[P2] ADR-014's category governance was traded away and the ADR still reads as current~~ — CLOSED 2026-09-11, the ADR-014 amendment PR
**Raised:** 2026-09-11, the repository-register PR · **Closed by:** [[ADR-014-admin-portal-platform-governance-and-global-controls|ADR-014]]'s 2026-09-11 amendment
**Owner:** was agent to draft; the owner's 2026-08-15 decision is recorded, not revised

> [!NOTE] What the amendment found that this entry did not
> Reading `sals3-portal`'s own code turned up **two** reversals on 2026-08-15,
> not one — the second dropped the platform-wide effect entirely and is
> recorded only in `taxonomy/authorization.ts` — and the platform-wide half
> **came back** three weeks later in the tenant application. This entry's
> sentence *"each seller deciding per product with no platform-wide reversal"*
> was therefore incomplete; see the two entries that replace it below.

`Sals3-Official/sals3-admin-portal`
[#4](https://github.com/Sals3-Official/sals3-admin-portal/pull/4) — **+52,135 /
−25 across 24 files** — was opened 2026-08-15T13:10Z and closed **nine minutes
later, unmerged**, because the owner decided the category-mapping picker should
live in `sals3-portal`'s product editor instead. The replacement shipped and is
documented ([[sals3-session-2026-08-15-part48-taxonomy-v1-production-rollout-and-category-picker-ux|part 48]],
portal PR #91). The **trade** is not: category authority moved from one employee
deciding once, platform-wide, on an audited and supersedable row, to each seller
deciding per product with no platform-wide reversal.

[[ADR-014-admin-portal-platform-governance-and-global-controls|ADR-014]] is
still `approved` and still describes curated platform governance. Branch
`feat/category-governance-schema` at `f700c57` survives on the remote and in
`E:\sals3-admin-portal` — nothing is lost, only undescribed. See
[[sals3-session-2026-09-11-part169-the-eleven-repositories-and-the-admin-portal-nobody-audited|part 169]] §3.3
and skill 126.

### [P2] 379 platform-wide category decisions carry a string constant as both proposer and approver
**Raised:** 2026-09-11, the ADR-014 amendment PR · **Closes when:** the owner accepts `SEED_ACTOR` as the standing mechanism, or an employee identity signs a mapping decision
**Owner:** owner (Bogs) — this is an authority decision, not a refactor

`src/modules/catalog/taxonomy/seed-category-mappings.ts` in `sals3-portal`
carries **379 reviewed mappings and 50 disabled mixed buckets**, decided across
four tiers against a census of 432,654 candidates (parts 126, 129, 134). They
are genuinely governed — the seeder walks `proposeCategoryMapping` →
`reviewCategoryMappingDecision`, so versioning, supersession and audit events
all fire.

What they carry is `const SEED_ACTOR = 'taxonomy-mapping-seed'`, used as **both**
`actorId` on the proposal **and** `reviewedBy` on the approval. Proposer and
approver are the same string and neither is a person. The endpoint that runs
them is a `CRON_SECRET` bearer, and its own comment is honest about why: *"this
writes governance rows, not tenant data, so the editor session auth is the wrong
shape for it."* Correct — and the shape it needs is
[[ADR-014-admin-portal-platform-governance-and-global-controls|ADR-014]]'s
employee identity, which exists only in `sals3-admin-portal` and is not
deployed anywhere.

**This is not a request to change it.** With no Admin Portal deployment there
was no other path, the decisions are reviewed and reasoned in git, and the
mechanism is written down rather than hidden. It is here so the trade-off is a
decision on the record instead of a default. See ADR-014 §3 of the 2026-09-11
amendment.

### ~~[P3] ADR-002 states that no portal role can approve a mapping; three roles now can~~ — CLOSED 2026-09-11, the ADR-002 amendment PR
**Raised:** 2026-09-11, the ADR-014 amendment PR · **Closed by:** [[ADR-002-sals3-taxonomy-and-cj-category-mapping|ADR-002]]'s 2026-09-11 amendment
**Owner:** was agent

> [!NOTE] It was three false statements, not one
> The amendment also corrects *"no Server Action, no route handler, and no UI"*
> and *"Not one rule is seeded"* — **379 mappings and 50 disabled mixed buckets**
> are approved. And it separates the two decisions the permission name conflates:
> a seller tagging **their own product**, and a platform-wide **CJ-leaf mapping
> rule**. §3 of the amendment.

ADR-002's 2026-08-21 amendment says *"no portal role — `admin` included —
carries the authority to approve a mapping, because ADR-014 puts category
governance in the Admin Portal."* Measured against `sals3-portal` at
`origin/develop` on 2026-09-11, that is **false**:
`catalog.category_mapping.manage` is in `PORTAL_PERMISSIONS` and is granted to
`admin`, `seller_manager` and `seller_staff`, and `authorizeCategoryGovernance`
delegates straight to it.

The statement was true when written and the owner's 2026-08-15 decision made it
stale. ADR-002 is its own decision record, so it gets its own amendment rather
than being corrected from ADR-014 — noted there in §5 of the 2026-09-11
amendment, which is why this is P3 and not P2: the misleading sentence is
already flagged in the note a reader arrives from.

### [P3] `catalog.category_mapping.manage` gates per-product tagging and reads as though it gates mapping rules
**Raised:** 2026-09-11, the ADR-002 amendment PR · **Closes when:** the permission is renamed, or a comment at the grant site says what it does not gate
**Owner:** agent — a code change in `sals3-portal`, not a vault edit

Two different decisions share this one name, and the gap between them is the
whole of [[ADR-002-sals3-taxonomy-and-cj-category-mapping|ADR-002]] §3:

- **what it actually gates** — a seller tagging **their own product**'s Sals3
  category. `decideProductSals3Category` changes only the product the seller had
  open. Granted to `admin`, `seller_manager`, `seller_staff`;
- **what the name suggests** — approving a **CJ-leaf → Sals3 mapping rule**,
  which reclassifies every candidate under that supplier leaf. Those 379 rules
  are written by the seeder, never by a session holding this permission.

`authorization.ts` explains the distinction correctly in its own doc comment, so
anyone reading the module is safe. Anyone reading `permissions.ts`, a role
table, or an audit row is not. Nothing is broken; a future reader granting this
permission to a new role may believe they are granting platform authority.

### [P3] The BOGS Dashboard second brain is not under version control
**Raised:** 2026-09-11, the repository-register PR · **Closes when:** `E:\Bogs 2nd brain` has a remote, or the owner accepts the risk knowingly
**Owner:** owner (Bogs) — a different project's vault, recorded here only because it is the one place that is backed up

`E:\Bogs 2nd brain\Wiki` holds the BOGS Dashboard second brain — roughly 100
notes including its own `CLAUDE.md`, blueprint, inventory bible and session
record — and **`git rev-parse` reports it is not a repository at all.** No
remote, no history, no backup. `louieboi09/bogs-dashboard` holds that project's
*code*, not its vault.

This is the failure mode the Sals3 vault escaped in August by moving into
`Sals3-Official/sals3-ecommerce`. Noted here rather than there because a note
written into an unbacked vault about that vault being unbacked is not a record.
Also worth knowing: `anythingsupplies/sals3-portal-automation` is cloned
**inside** that folder, at `E:\Bogs 2nd brain\sals3-portal-automation`. See
[[sals3-repository-register]] §2 and §6.

### [P2] Every Husky hook silently does nothing in a worktree where `npm install` has not run
**Raised:** 2026-09-11, the repository-register PR · **Closes when:** a missing `.husky/_` is made loud — a tracked shim, a `prepare` that runs per worktree, or a documented first step in the runbook
**Owner:** agent

`core.hooksPath` is `.husky/_` and lives in the **shared** repository config, so
every worktree inherits the pointer. `.husky/_` itself is **generated by husky
on `npm install` and is not tracked** — `git ls-files .husky` returns only
`commit-msg`, `pre-commit` and `pre-push`. In a freshly created worktree the
directory does not exist, and git's behaviour when `core.hooksPath` points at a
missing directory is to run **no hooks at all**, with no warning and exit 0.

Measured: `.husky/_` is present in `E:\sals3-ecommerce` and `E:\wt-vault-133`
(both have `node_modules`) and absent in a worktree created minutes earlier.
The commit that raised this entry passed `commit-msg` **because the hook never
ran**; the check was then run by hand
(`node scripts/check-pending.mjs`, exit 0) and passed on its merits.

So the gate PR #248 added to enforce the bible's pending rule, and the
branch-protection guards in `pre-commit`/`pre-push` that refuse a direct commit
to `develop` or `main`, are all **opt-in by accident**: they protect the clone
someone happened to install in, and nothing else. This project uses worktrees
constantly — [[sals3-repository-register]] §6 lists sixteen of them — so the
uninstalled worktree is the common case, not the edge one.

### ~~[P1] The 2026-09-11 AU order-page hang is bounded, not diagnosed~~ — closed 2026-09-11, diagnosed

**Closed by:** the investigation recorded in the entry below. Kept for one month
per this register's own protocol, because **the reasoning in it was wrong** and
the correction is worth reading next to it.

It inferred, from "Vercel showed no matching request rows", that something was
answering before the function ran, and floated the SSO gate as the likely cause.
Both halves were mistaken. The rows existed the whole time — the Logs view
defaults to **Production**, and SIT is **Preview** (195 rows against 219K). Once
filtered, every reported path answered `200`, and
`/orders/S3-20260819-FB0EE6973B` at 00:06:04 shows **481ms execution, 411ms
Portal read, response finished in 767ms**. The server was never involved.

The lesson generalises: *an absent log row is a claim about a filter before it
is a claim about the world.*

### ~~[P1] The AU and FJ Vercel projects' Portal variables have never been compared~~ — closed 2026-09-11, compared and identical

**Closed by:** a direct read of both projects' Preview/`develop` scopes.

| | `sals3-com-au` | `sals3-com-fj` |
| --- | --- | --- |
| `SALS3_PORTAL_URL` | `https://sals3-portal-sit.vercel.app` | **the same** |
| `SALS3_PORTAL_PROTECTION_BYPASS` | set, updated 2d ago | set, updated 2d ago |
| Function region / Fluid compute | `iad1` / enabled | `iad1` / enabled |
| Deployment Protection | Standard, no exceptions | the same |
| Skew Protection | Enabled | Enabled |

**No difference anywhere.** This closes the configuration theory of the AU-only
fault: the markets are configured identically, and AU was simply the tab left
open across a deployment.

### ~~[P2] The Portal read deadline is set against an assumed platform limit~~ — closed 2026-09-11, measured

**Closed by:** the function limit read straight off a live invocation —
*Execution Duration / Maximum: **481ms / 5m***. The ceiling is **five minutes**,
so `DEFAULT_STOREFRONT_TIMEOUT_MS` at 8000 ms fires with a wide margin and the
"if it is under eight seconds the deadline never fires" risk does not exist.

Worth keeping in view: before that deadline shipped, a hung read could hold a
function for **five minutes**. That is what the change is worth, and it remains
unrelated to the 2026-09-11 incident.

### ~~[P3] `/orders/[orderNumber]` borrows the list page's loading skeleton~~ — closed 2026-09-11, merged and deployed

**Closed by** [`sals3-ecommerce`#61](https://github.com/anythingsupplies/sals3-ecommerce/pull/61) (`772e8b9`),
[`sals3.com.au`#55](https://github.com/anythingsupplies/sals3.com.au/pull/55) (`2e0c9a5`) and
[`sals3.com.fj`#62](https://github.com/anythingsupplies/sals3.com.fj/pull/62) (`f02df23`),
all three green on SIT. Each of `/orders/[orderNumber]` and
`/orders/[orderNumber]/cancel` now has its own `loading.tsx`, its own skeleton
shaped like its own page, and its own sentence.

Not cosmetic after all, which is why the level stayed rather than dropping: a
stuck **order** page announcing *"Loading your orders…"* is what made a broken
detail page and a healthy list page read as one fault, and that is most of why
the first diagnosis went to the wrong layer entirely.

### [P2] Every storefront page is uncached, and origin transfer is billed uncompressed
**Raised:** 2026-09-11, while tracing the Vercel bill · **Closes when:** the storefront shell can be cached, or the owner accepts the cost as the price of the destination logic
**Owner:** owner/AJ — AJ built this surface and should decide

`SiteHeader` renders `GuestUtilityBar`, which calls `resolveDestination`, which
reads `cookies()` and `headers()`. `SiteHeader` is on **every page**, so every
page of all three storefronts renders per request. Measured on production, three
consecutive hits on one product page: `X-Vercel-Cache: MISS` every time,
`Cache-Control: private, no-cache, no-store`.

Origin transfer is billed on what leaves the function, **before** edge
compression:

| | bytes |
| --- | --- |
| product page, gzipped (what the browser gets) | 51,238 |
| product page, plain (**what is billed**) | 323,216 |
| of which RSC flight data | 193,243 (59%) |

189 GB ÷ 316 KB ≈ **627,000 page renders**, which is consistent with 5.36M
function invocations. `robots.txt` is `Allow: /` for everyone — GPTBot,
PerplexityBot, ClaudeBot and OAI-SearchBot named explicitly — advertising
~5,200 product URLs per site across three sites, none of them cacheable.

**Cost:** Fast Origin Transfer **$45.06**, plus Fluid Active CPU $10.88 and
Provisioned Memory $10.74 that follow from the same per-request rendering.
Separately, Observability Events are **$34.71** for 28.93M events, which is a
setting rather than traffic.

**Care required:** `resolveDestination` is the code behind the checkout-country
incidents (part 161's choice › market › geo precedence and the ADR-003
amendment). Anything that moves it off the render path has to preserve that
precedence exactly.

### ~~[P3] The e2e SEO specs compared against a hardcoded port~~ — closed 2026-09-11, fixed in all three

**Closed by** [`sals3.com.au`#58](https://github.com/anythingsupplies/sals3.com.au/pull/58),
[`sals3.com.fj`#65](https://github.com/anythingsupplies/sals3.com.fj/pull/65),
[`sals3-ecommerce`#67](https://github.com/anythingsupplies/sals3-ecommerce/pull/67).

`playwright.config.ts` builds its `baseURL` from `PLAYWRIGHT_HOST` and `PORT`
and hands that string to the dev server as `NEXT_PUBLIC_SITE_URL`, so the
canonical a page renders **is** the config's origin. `e2e/seo.spec.ts` compared
it against a fallback hardcoded to `http://127.0.0.1:3000`, which agreed only
while nobody overrode the port. Both now read the same two variables.

**Kept here because of how it was found, not what it was.** Running the suite on
a non-default port to dodge a port conflict that did not exist produced five
failures, and those failures were read as evidence that `pre-prod` was broken.
Three theories were built on that reading - a broken base, a missing environment
variable, orphaned processes - before the assertion was read closely enough to
see that the *expectation* was stale and the rendered canonical was right. Hours
went into it. Written by AJ in `7b1405b` on 2026-09-08; the misreading was the
agent's.

**[P3] still open:** only `seo.spec.ts` hardcoded an origin. The rest of the
suite uses Playwright's `baseURL`. Nothing else was audited for the pattern.

### [P1] The AU order-page hang is recovered from, not cured
**Raised:** 2026-09-11, the stalled-navigation PRs ([`sals3-ecommerce`#61](https://github.com/anythingsupplies/sals3-ecommerce/pull/61), [`sals3.com.au`#55](https://github.com/anythingsupplies/sals3.com.au/pull/55), [`sals3.com.fj`#62](https://github.com/anythingsupplies/sals3.com.fj/pull/62)) · **Closes when:** a pinned deployment either keeps serving its tabs, or stops being pinned — a Vercel configuration decision, not a code change
**Owner:** owner/AJ — Vercel Skew Protection settings

**What was captured live on `sit.sals3.com.au`** while a page was stuck — the
observations, which are solid; the attribution below them, which is not:

```text
GET /orders?_rsc=U5Jq6qAThNnFslX9   503
GET /cart?_rsc=ncYrEHpaAt3hTajE     503
GET /.well-known/vercel/jwe         503   (the skew-protection token endpoint)
GET /sell?_rsc=KsDTiBny6MvXk6iC     pending, never settled
```

The App Router recovers from an RSC response it can **reject** — it falls back
to a full page load. It cannot recover from one that **never settles**: the
segment stays pending, the nearest loading boundary stays on screen, and
`document.readyState` reads `'complete'` throughout because a soft navigation
never reloads the document. And because none of it reaches a function, it leaves
**no server log row** — the observation that misdirected the first diagnosis.

The PRs above add a watchdog that reloads the tab once after 15s. **That is
recovery, not a cure**: the buyer still sees a 15-second wait and a reload.

**Why the deployment stopped answering is not established.** Skew Protection is
the obvious candidate — the page's assets were pinned to a different deployment
than the origin was serving, and `/.well-known/vercel/jwe` is its own token
endpoint. But a reproduction attempt **argues against it**: requests pinned to an
older deployment, and to a bogus one, all returned `200`, because `?dpl=` is
ignored for document and RSC requests and old deployments keep serving. Spend
Management pausing is ruled out (*Pause Projects: Off*). Vercel's automatic
**System Mitigations** and a transient platform fault are not.

### [P1] The `x-vercel-error` on those 503s was never captured
**Raised:** 2026-09-11, the stalled-navigation PRs · **Closes when:** the header is read during a live occurrence and the 503 is attributed
**Owner:** whoever is at the keyboard when it next happens

The 503s recovered before the response header could be read, so **the cause of
the 503 itself is unattributed** — a paused deployment, no response from the
function, and a resource limit all present the same way at this distance. Given
this org's billing history a resource limit is not a remote possibility, and
guessing between them is exactly what this register exists to prevent.

Next time a page sticks, run this in the console **while it is stuck**:

```js
fetch('/.well-known/vercel/jwe').then((r) =>
  console.log(r.status, r.headers.get('x-vercel-error')),
);
```

### [P2] The 15-second stall threshold is measured against SIT, not production
**Raised:** 2026-09-11, the stalled-navigation PRs · **Closes when:** a real production `/orders/[orderNumber]` render is timed and the threshold is confirmed or moved
**Owner:** agent, once a production timing exists

15s was chosen as ~3.4x the slowest render observed **on SIT** — 4.4s end to end
on a cold function with a 2.48s Portal read, against ~700ms warm. Production
carries more traffic and a warmer function, so the real margin is probably
wider, but nobody has measured it. **A threshold set too low reloads readers off
pages that were about to arrive**, which is a worse failure than the one it is
guarding, so this should be checked before the change is promoted past SIT.

### [P2] Only `/orders` carries the stalled-navigation watchdog
**Raised:** 2026-09-11, the stalled-navigation PRs · **Closes when:** every loading boundary mounts it, or a deliberate decision records why not
**Owner:** agent

`StalledRouteReload` is mounted in the three loading boundaries under `/orders`
because that is where the incident was seen. **The exposure is not specific to
those routes** — any segment with a loading boundary can be left pending by the
same pinned-deployment failure. Widening it is a deliberate follow-up rather
than an oversight, and it wants the production timing above first.

### [P2] Two credential stores, two accounts: `gh` and `git` disagree about who is pushing
**Raised:** 2026-09-11, the stalled-navigation PRs · **Closes when:** the account stops reverting, or `louieboi09` is granted read access to the three repositories it cannot see
**Owner:** owner — GitHub account/org membership

**Seen from both sides in one day.** In the morning `gh` had reverted to
`louieboi09` and a push to `anythingsupplies/sals3.com.au` failed with
`Repository not found`. In the evening `gh` was correctly on `louieboi09` and a
push to `Sals3-Official/sals3-ecommerce` **still** failed — `Permission …
denied to anythingsupplies` — because `git` does not use `gh`'s account at
all. Its `credential.helper` is Windows Credential Manager (`manager`), which
holds one cached token for `github.com` regardless of what `gh auth switch`
says. So `gh auth status` can read correctly and the push can still go out as
the other account.

The workaround that landed this branch: force the push through `gh`'s own
helper for that one command —

```bash
git -c credential.helper= -c 'credential.helper=!gh auth git-credential' push origin <branch>
```

The real fix is one of: make `gh auth git-credential` the repository's
`credential.helper` in the two vault checkouts (`E:\wt-vault-133`,
`E:\sals3-ecommerce`) so `git` follows `gh`; or stop switching accounts on one
machine at all. ADR-019 §1 already requires checking both `gh auth status` and
`git config user.email` before a push; **it should also name the credential
helper**, because that is the third thing that can disagree.

Observed twice in one session: `gh auth switch --user anythingsupplies` succeeds,
and some time later `gh auth status` reports `louieboi09` active again. It is not
cosmetic — `louieboi09` gets a **404 on `anythingsupplies/sals3.com.au`**, so a
push fails with `remote: Repository not found`, which reads like a wrong URL
rather than a wrong identity. It cost one failed push and one repeated
verification run here.

This is the operational face of the standing *`louieboi09` cannot see three of
the six `anythingsupplies` repositories* entry below. **Check `gh auth status`
immediately before any push to `anythingsupplies`**, per
[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]] §1,
which already requires exactly that and is easy to read as ceremony until it
bites.

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

### [P2] The fourth tier of supplier-leaf mappings has never been *observed* to reach production
**Raised:** carried from [[hot]] · **Re-scoped:** 2026-09-11, the ADR-002 amendment PR · **Closes when:** one run's result object is read and quoted, from the cron or a dispatch
**Owner:** agent — no longer blocked; it needs a measurement, not a dispatch

**78.2% is the reviewed figure, not the live one.** Also owed: the `#111`
mojibake fix, which needed the same dispatch. See
[[sals3-session-2026-09-07-part150-four-taxonomy-seed-corrections-two-of-them-self-inflicted|part 150]].

> [!IMPORTANT] Re-scoped 2026-09-11 — the blocker's stated cause expired four days after it was written
> This entry and [[hot]]'s both say a dispatch is *owed* and *blocked on Actions
> billing*. Measured at `anythingsupplies/sals3-portal` `origin/main`:
> `seed-category-mappings` has been a **Vercel Cron job scheduled hourly at
> :17** in `vercel.json` since 2026-09-07
> ([[sals3-session-2026-09-07-part149-notify-every-market-storefront-and-two-jobs-onto-vercel-cron|part 149]]).
> Vercel injects the `Authorization: Bearer $CRON_SECRET` header itself, so the
> operation never needed the dead workflow again.
>
> Nothing is owed. What is missing is **evidence of the outcome**: whether the
> cron has run in production and what it returned was not measured, because the
> only ways to find out are to call a writing endpoint or read the production
> database. Until a run's result object is quoted, part 134's rule governs the
> number — *committing governance data and seeding governance data are two
> separate successes* — and **78.2% stays the reviewed figure**.

### [P2] Fiji shows FJD and charges USD
**Raised:** 2026-09-09, PR #240 · **Closes when:** `capabilities.ts` sets `FJ` to `FJD` **and** the storefront stops converting an already-Fijian price, in one release
**Owner:** agent, on owner's go-ahead — the ordering is the risk

Steps 1–3 of ADR-003's Fiji amendment are live; step 3b is wired and switched
off. **This is disclosed rather than hidden** — the storefront says payment is
taken in US dollars — which is what keeps it P2. Per-step ledger in
[[ADR-003-international-availability-shipping-and-pricing]].

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


### [P0] SOP v4.2's review columns may not exist on SIT

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-portal` #224) · **Closes when:** `POST /api/internal/cancellations/migrate-cancellations` is run on SIT and reports `0040` applied
**Owner:** agent to run, `CRON_SECRET` needed

`drizzle/0040_order_cancellation_review.sql` adds four nullable columns that the
staff review gate writes to. #224 listed *"running the migrate route on SIT after
this deploys"* as undone and **nothing records it as having been run**. Until it
has, a buyer's cancellation request past the hold window has nowhere to be
stored, on the one environment where cancellation is live. P0 because it sits
directly on the money path. See
[[sals3-session-2026-09-10-part167-sop-v42-and-the-morning-cj-quoted-nothing|part 167]] §5.

### [P1] Three review POSTs are missing the portal protection-bypass headers

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-ecommerce` #54) · **Closes when:** `getProtectionBypassHeaders()` is on all three calls in each storefront, pinned by a test like `orders.cancel-bypass.test.ts`
**Owner:** agent

The cancel POST failed on SIT because it was the one portal call not carrying the
bypass headers — Vercel Deployment Protection answered `401` before the route
ran, and the buyer read *"Something went wrong on our side."* **The three POSTs
in `src/services/storefront/reviews.ts` have the identical omission**, found
while fixing the first, in each of the three storefront repositories. Nine calls.
A buyer submitting a review on any pre-production environment hits the same
failure. See
[[sals3-session-2026-09-10-part167-sop-v42-and-the-morning-cj-quoted-nothing|part 167]] §1.

### [P1] `SALS3_PORTAL_PROTECTION_BYPASS` is unset on the SIT storefront projects

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-ecommerce` #40) · **Closes when:** the variable is set on the SIT storefront projects and a SIT home page shows real products
**Owner:** owner — Vercel dashboard action, not a code change

`sals3-portal-sit` and `-uat` answer **302** to a server-to-server read: Vercel
Deployment Protection intercepts before the portal's own code runs, so the
storefront gets a login page where it expected JSON. Since #40 the SIT
storefronts show the honest *"could not load products"* state rather than the
fabricated catalogue they used to — **which is correct behaviour, not a fix**.
Nothing can be reviewed on SIT until the bypass is set. See
[[sals3-session-2026-09-09-part165-the-storefront-was-inventing-a-catalogue-and-llms-txt-was-lying-about-delivery|part 165]] §1.

### [P1] Nothing tells a buyer their cancellation happened, in any repository

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-portal` #217, `sals3-ecommerce` #55) · **Closes when:** a cancellation email exists, or the owner confirms the order page is the whole notification
**Owner:** owner to decide; agent to build

**No order email exists in either repository** — not for the request, not for the
approval, not for the refund. The order page is the only surface, so a buyer who
requests a cancellation and closes the tab learns nothing until they return.
Under SOP v4.2 a request can now wait **up to 12 hours** for a person before it
auto-escalates, which is a long silence to ask someone to sit through. See
[[sals3-session-2026-09-09-part164-a-buyer-can-cancel-and-the-hold-moved-into-cjs-imported-tab|part 164]] §9.

### [P1] The whole cancellation feature is SIT-only and has never been promoted

**Raised:** 2026-09-10, parts 163–167 audit · **Closes when:** the owner approves promotion, or the work is recorded as deliberately parked at SIT
**Owner:** owner

`sals3-portal` #218 says so in its own words — *"Not to be promoted to pre-prod
or main without the owner"* — and all nine SOP v4.2 changes carry **SIT only**.
That is the right default for a change to when money leaves the CJ wallet. It
also means a buyer on production **still cannot cancel anything**, and the
storefront copy promising a 24-hour window is only true on SIT. Whichever way it
goes, the state should be a decision rather than a drift. See
[[sals3-session-2026-09-10-part167-sop-v42-and-the-morning-cj-quoted-nothing|part 167]].

### [P1] `sameAs` is empty, and it is the largest remaining AEO gap

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-ecommerce` #41) · **Closes when:** at least one authoritative external profile exists and is linked from the storefront
**Owner:** owner — business work, not code

`sameAs` is the field an answer engine most wants: it ties the `Organization`
entity to Wikidata, a Knowledge Graph id or a social profile. **Sals3 has none** —
no social account is linked from any storefront and no Wikidata item exists. The
ABN and ACN now ground the entity against an external registry, which is the
strongest signal available without one, but resolution stays weaker than it
needs to be. **Inventing a plausible handle is the fabrication this surface is
governed against**, so this cannot be closed in code. See
[[sals3-session-2026-09-09-part165-the-storefront-was-inventing-a-catalogue-and-llms-txt-was-lying-about-delivery|part 165]] §4.

### [P1] Nothing checks that a lesson's "Where applied" file still exists

**Raised:** 2026-09-10, the skills 106–122 PR · **Closes when:** a link check runs over the register, or the owner accepts the drift
**Owner:** agent

The register now names files across **four repositories** in 122 entries. A
rename in any of them makes the reference stale **silently**, and a lesson that
points at a file nobody can find is a lesson nobody applies. Part 163's skill 107
is about exactly this failure mode on route names; the register has the same
shape and no check.

### [P2] `notify.ts` is optional, so a cancellation request may raise no ops signal

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-portal` #224) · **Closes when:** Resend or Slack is configured on the portal, or an in-app signal replaces them
**Owner:** owner — credentials

SOP v4.2 routes a buyer's request into a **Cancellation requests** lane and
notifies ops through `modules/cancellations/notify.ts` — **Resend and Slack, both
optional**. Unconfigured, the lane still fills and the 12-hour auto-escalation
still fires, so nothing is lost. But nobody is *told*, which means the review gate
degrades to a timer and the human judgement it exists for never happens.

### [P2] The cause of CJ's empty freight list is unknown

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-portal` #222, #223) · **Closes when:** the cause is identified, or a retry policy is decided
**Owner:** agent to investigate; owner to decide on retry

On 2026-09-10 from 21:45 UTC CJ answered every package with `code 200, data: []`
for **four destinations**, including products that had shipped the week before;
CJ's own web calculator showed no methods either. #223 gave the empty list its
own honest refusal, so buyers are no longer told *"no courier covers that
route"* during an outage — **the symptom is handled, the cause is not**, and
nothing decides whether the storefront should retry a quote automatically.

### [P2] `sals3-portal.vercel.app` answers 402 `DEPLOYMENT_DISABLED`

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-ecommerce` #40) · **Closes when:** the project is re-enabled, or it is confirmed dead and removed from every storefront's configuration
**Owner:** owner — billing

A portal deployment is disabled for non-payment. `sals3-portal-prod.vercel.app`
is alive and correctly answers `401` to an unauthenticated read, so this is a
stale project rather than an outage — but any environment still pointing at the
402 host reads it as a portal failure and shows the unavailable state. Which host
each environment actually dials is not written down anywhere.

### [P2] The Contacts tab and `% refunded` are shapes waiting on the Item Problem SOP

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-portal` #200) · **Closes when:** the Item Problem SOP is approved and its intake exists
**Owner:** owner — the SOP is an owner decision

`/customers`' Contacts tab is a **named placeholder**, and `% refunded` reads
`payment_status = 'REFUNDED'` because that is the only refund fact stored — **it
cannot distinguish a full refund from a partial one**. `modules/customers/metrics.ts`
takes claims, refunds and contacts as inputs when they arrive, so the shape is
reserved rather than invented. The cancellation work has begun writing real
refund rows, which is what will make the column mean more. See
[[sals3-session-2026-09-09-part163-customers-replaces-inventory-in-the-seller-center|part 163]] §9.

### [P2] Per-parcel cancellation does not exist, and two states need a person

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-portal` #217) · **Closes when:** the owner rules on per-parcel scope, and `FAILED` / `CJ_UNPAID` have a written handling procedure
**Owner:** owner for scope; agent for the procedure

Cancellation is **whole-order only** — a buyer with a two-parcel order cannot
drop one. Separately, `FAILED` refunds and `CJ_UNPAID` tidy-ups are resolved by a
person; both are visible on the parcel page, which is the minimum bar, but no
written procedure says who looks or how often.

### [P2] `robots.txt` is now the only discovery path for ~9,700 product URLs

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-ecommerce` #51) · **Closes when:** something monitors that the per-chunk `Sitemap:` lines are present and correct
**Owner:** agent

The chunked sitemap is discovered through **one `Sitemap:` line per chunk** in
`robots.txt` — deliberately, because `generateSitemaps()` on the root would have
taken the already-submitted `/sitemap.xml` away. Verified live on 2026-09-10:
**18 lines on all three production storefronts.** But `robots.ts` derives those
lines from the Portal's page count, so a failed Portal read at generation time
silently shortens the list, and **a missing line makes ~600 product URLs
unreachable** to a crawler that only reads robots.txt. Nothing watches it.

### [P2] The skills register is 122 entries in one file with no grouping

**Raised:** 2026-09-10, the skills 106–122 PR · **Closes when:** the register is indexed by theme, or split
**Owner:** agent

~1,450 lines in number order. Finding the relevant lesson before starting work
depends on already remembering it exists — which is the opposite of what the
register is for. Seventeen entries were added in one pass and several restate
neighbours from a different angle.

### [P3] The Customers read model is correct and unbenchmarked

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-portal` #200) · **Closes when:** the list is measured against a production-sized customer count
**Owner:** agent

Every figure on `/customers` is computed on read through **correlated
subqueries** — deliberately, because a cached counter drifts invisibly. It is
paged and the row count is small today. Nobody has measured it against anything
larger than SIT, and the place to fix it when it stops being affordable is a
materialised read model, **not** a hand-maintained counter.

### [P3] `public/flags/` covers six countries and fails quietly on a seventh

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-portal` #210) · **Closes when:** the fallback is made visible, or the set is completed for every destination the platform accepts
**Owner:** agent

The six approved buyer destinations ship as static SVGs because Windows Chrome
renders Unicode regional-indicator flags as plain letters. Anything else falls
back to a **letter badge** — correct, and indistinguishable from the bug the SVGs
were added to fix. Adding a seventh destination without its SVG regresses the
display with no error anywhere.

### [P3] `sharp` and `js-yaml` were cleared by `npm audit fix`, not by a decision

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-ecommerce` #47) · **Closes when:** the resolved versions are read off the lockfile and recorded
**Owner:** agent

The `next@16.3.4` bump ran `npm audit fix` (semver-compatible, **not**
`--force`), which also cleared `sharp` ([GHSA-rgj7-g3m4-5g8c](https://github.com/advisories/GHSA-rgj7-g3m4-5g8c))
and `js-yaml` ([GHSA-2883-xcg3-v3hh](https://github.com/advisories/GHSA-2883-xcg3-v3hh)).
`npm audit --audit-level=high` goes from exit 1 to exit 0, which is the outcome —
but **which versions landed was never read back**, in four repositories.
`js-yaml` reaches the tree only through `@eslint/eslintrc`, so it was lint-time
rather than production exposure.

### [P3] The Portal's 30-per-page ceiling is the shape of the sitemap problem

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-ecommerce` #44, #51) · **Closes when:** a larger page size is costed, or the ceiling is confirmed as correct
**Owner:** agent

9,718 products at 30 per page is **~324 Portal reads** for one catalogue pass —
which is what failed a production build against the 60-second prerender cap and
then forced the chunked split. Chunking divides that work across parallel crawler
requests; it does not reduce it. **A larger page size would remove the need
entirely** and has never been costed.

### [P3] No scan enforces the no-fabricated-data rule

**Raised:** 2026-09-10, parts 163–167 audit (`sals3-ecommerce` #40) · **Closes when:** a lint rule or test refuses a fixture import from a runtime path
**Owner:** agent

`nextjs-component-security-code-rules` forbids presenting placeholder data as
Sals3's own catalogue, and it was violated in production code for weeks —
invented product names at invented US$ prices on an A$ storefront, rendered
exactly like the real shop. The rule existed; nothing checked it. **Nothing
checks it now either**, so the next convenience fallback can become a production
behaviour the same way.

### [P3] Skills 106–122 were written from pull request bodies, not diffs

**Raised:** 2026-09-10, the skills 106–122 PR · **Closes when:** the seventeen entries are read against the merged diffs
**Owner:** agent

Fifty pull requests were reconstructed from their descriptions. Where a PR
described intent rather than the merged result — or where review changed
something after the body was written — the lesson inherits that gap. The same
caveat applies to parts 163–167 themselves.

### [P1] Twenty entries were added in one pass and none has been worked

**Raised:** 2026-09-10, the pending-register and hot.md PR · **Closes when:** the P0 and the three P1s from the parts 163–167 audit are closed or re-levelled with evidence
**Owner:** owner to prioritise; agent to work

The register went from 26 open entries to 46 in a single audit. **This file's own
closing rule warns about exactly this** — *"a register that only ever grows stops
being read"* — and a backlog nobody reads is indistinguishable from no backlog.
The four highest are the `0040` migrate route, the nine review POSTs, the SIT
protection bypass and the missing cancellation email.

### [P2] The three sitemap checks were run by hand, and nothing re-runs them

**Raised:** 2026-09-10, the pending-register and hot.md PR · **Closes when:** the checks run on a schedule, or their absence is accepted
**Owner:** agent

`robots.txt` line count, `/sitemap.xml` timing and a chunk's `<loc>` count were
measured from one machine on 2026-09-10 and are recorded in
[[sals3-session-2026-09-10-part166-a-critical-rce-and-the-sitemap-that-failed-a-production-build|part 166]] §5.
They passed on all three production hosts. **They are a snapshot** — `robots.ts`
derives its `Sitemap:` lines from the Portal's page count, so a failed read at
generation time silently shortens the list, and the claim goes stale without
notice. The natural home is a Vercel Cron check on the vault repository, which is
the one place Actions still runs.

### [P3] The four source decks are committed as binaries with no extracted text

**Raised:** 2026-09-10, the pending-register and hot.md PR · **Closes when:** a text or NDJSON extraction sits beside each deck, as `v3` already has
**Owner:** agent

`sals3_cancellation_sop_2026-09-03_v3.pptx`, `…09-09_v4.pptx`,
`sals3_customer_profile_framework_2026-09-09.pptx` and
`sals3_item_problem_return_refund_sop_2026-08-31.pptx` are now in git, so they can no
longer be lost with one machine. **Their content is not searchable from the
vault** and **v3, v4 and v5 cannot be diffed**, which is the question anyone
reading ADR-020 against ADR-021 will actually have. Only v3 has an
`.inspect.ndjson` beside it, and that file is untracked.

### [P1] `outputs/` may hold documents worth keeping, and nobody has read them

**Raised:** 2026-09-10, the scratch-directory `.gitignore` PR · **Closes when:** the loose documents are read and either moved to `docs/Raw/` or deleted
**Owner:** owner to judge what is worth keeping

346 MB across ~8,000 files is now ignored rather than lost — but **ignoring is
not archiving**. Among the build scratch are documents that read like real work:
*Marketplace Seller Portal Architecture — Fable 5 Counter-Review*, its Sals3
revision, and two handoff prompts. If any of that is a decision or a review the
vault should carry, it is currently invisible to every agent, because the vault
only reads `docs/`.

### [P2] Eight Fiji storefront assets are untracked in the vault repository

**Raised:** 2026-09-10, the scratch-directory `.gitignore` PR · **Closes when:** it is confirmed `anythingsupplies/sals3.com.fj` already carries them, or they are committed there
**Owner:** agent

`public/home-promos/fiji-*.png` (8 files) and `public/categories/fj/` sit
untracked here. They are **storefront assets belonging to
`anythingsupplies/sals3.com.fj`**, not vault content, and were deliberately left
alone — this repository is the vault, and [[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate|ADR-019]]
puts code in the other org. **Whether the fork already has them is unverified**,
so they may be the only copy of artwork [[sals3-session-2026-09-04-part138-fiji-gets-more-than-a-welcome-band|part 138]] describes.

### [P3] Only one deck has an extracted text file, and it is untracked

**Raised:** 2026-09-10, the scratch-directory `.gitignore` PR · **Closes when:** extractions exist and are tracked for every deck in `docs/Raw/`, or the approach is dropped
**Owner:** agent

`sals3_cancellation_sop_2026-09-03_v3.pptx.inspect.ndjson` is the only extracted
text beside any deck, and it is not in git. Five decks are tracked and none of
them is searchable or diffable from the vault. **Either track the extractions for
all of them or for none** — one is the state that teaches nobody anything.


## Closed

*Struck through with the closing date and PR, and removed after a month.*

### ~~[P2] `NEXT_PUBLIC_SITE_URL` is unset on the apex, so `sals3.com` serves no canonical and no sitemap~~

**Closed:** 2026-09-10, verified live during the parts 163-167 audit — not by a PR.

The variable was set on Production at some point before 2026-09-09, and
**setting it is what activated the sitemap path that then failed a production
build** against Vercel's 60-second prerender cap — see
[[sals3-session-2026-09-10-part166-a-critical-rce-and-the-sitemap-that-failed-a-production-build|part 166]] §2.
Measured on 2026-09-10, all three production storefronts:

| Host | `robots.txt` `Sitemap:` lines | `/sitemap.xml` |
| --- | --- | --- |
| `sals3.com` | **18** | `200` in **0.78s**, 20 URLs |
| `sals3.com.fj` | **18** | `200` in **0.97s**, 20 URLs |
| `sals3.com.au` | **18** | `200` in **0.84s**, 20 URLs |

`https://sals3.com/catalogue/sitemap/0.xml` answered `200` in **0.64s with 600
`<loc>` entries**, which also closes part 166's *"a chunk returning real
products end to end is unverified"* — the three post-deploy checks its author
wrote out were run here and all three pass.

<details><summary>The entry as it stood</summary>

### [P2] `NEXT_PUBLIC_SITE_URL` is unset on the apex, so `sals3.com` serves no canonical and no sitemap
**Raised:** 2026-09-09, PR #240 · **Closes when:** the variable is set on Production, typed **Config and never Secret**, and the project redeployed
**Owner:** owner — Vercel environment

A Secret `NEXT_PUBLIC_*` never reaches the build and evaluates to empty. Until
this is set, the whole SEO layer shipped in `sals3-ecommerce` #33 is inert on the
flagship domain. See [[sals3-session-2026-09-08-part153-the-canonical-layer-switched-on-across-three-storefronts|part 153]].

</details>


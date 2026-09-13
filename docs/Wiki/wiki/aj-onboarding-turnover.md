---
tags:
  - turnover
  - onboarding
  - governance
  - credentials
  - sals3
aliases:
  - AJ Onboarding Turnover
  - What needs the account holder
  - Turnover to AJ
created: 2026-09-14
updated: 2026-09-14
status: current-state
authority: index
owner_approved: false
related:
  - "[[hot]]"
  - "[[pending-register]]"
  - "[[sals3-repository-register]]"
  - "[[sals3-management-bible]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[ADR-020-order-cancellation-hold-in-cj-imported-and-dispute-path]]"
  - "[[sals3-session-2026-09-14-part171-the-vault-a-branch-switch-deleted-and-the-root-that-opened-without-its-plugins]]"
---

# AJ Onboarding Turnover

> [!IMPORTANT] What this note is for
> [[hot]] and [[pending-register]] have both cited `[[aj-onboarding-turnover]]`
> since 2026-09-12 as the place that says **who can actually clear the blockers
> nobody on the agent side can reach**. The note did not exist until 2026-09-14.
> This is that note — an **index**, assembled from the registers rather than
> written fresh.

> [!WARNING] Draft, and deliberately not a copy
> `owner_approved: false`. Every item below already has **one home**, per
> [[sals3-management-bible]] section 6 and [[pending-register]]'s own rule that
> live risk is *referenced, never copied*. This note carries a pointer and the
> one fact that matters for turnover: **which account holder is required**. If
> a detail here disagrees with the register, the register is right.

## 1. Why a turnover note exists at all

A recurring class of blocker is not a coding problem and cannot be worked around
by anyone at this keyboard. The five R2 credentials are `type: sensitive`, so
Vercel refuses to return their values; the real values live in Cloudflare.
Neither the owner nor an agent session has that access. Work stops, and it stops
silently — [[hot]] records that images kept rendering the whole time, because
reading a public URL needs no credentials (skill 133).

The vault's response is this note: **anything whose owner is an external account
holder is listed in one place**, so a turnover conversation is one read rather
than a walk through the whole register.

## 2. Blocked on an account nobody here holds

Ordered by urgency as [[pending-register]] rates it. Detail and evidence stay
there; this table says **who** and **what unblocks it**.

| | What is blocked | Account needed | Unblocks when |
| --- | --- | --- | --- |
| **P1** | **No image can be uploaded in any environment** — the five R2 variables are injected blank, production included | **Cloudflare**, then Vercel environment | `POST /api/internal/storage/r2-preflight` answers `wrote: true, deleted: true` on `main`, then on `develop` |
| **P1** | The AU order-page hang is recovered from, not cured | **Vercel** — Skew Protection settings | a pinned deployment either keeps serving its tabs, or stops being pinned |
| **P2** | UAT cannot be signed into — its 2FA enrollment belongs to a different Neon branch | **Neon**, `pre-prod` branch | a sign-in to `sals3-portal-uat.vercel.app` reaches `/overview` |
| **P2** | SIT cannot complete a paid cancellation — `STRIPE_SECRET_KEY` is unset on the SIT portal | **Stripe** — [[ADR-020-order-cancellation-hold-in-cj-imported-and-dispute-path\|ADR-020]] records that AJ holds the access | the SIT portal carries the key |
| **P2** | Every storefront page is uncached, and origin transfer is billed uncompressed | judgment, not a credential — **AJ built this surface** | the shell can be cached, or the cost is accepted deliberately |

**One consequence worth stating plainly:** the R2 blocker is not "logo upload on
preview". `readR2Config()` is all-or-nothing across all five variables and every
upload path goes through it, so seller product photos, description images, buyer
review photos and shop logos are dead together, in every environment.

## 3. Assigned to AJ as work, not as an account

| | Item | Assigned |
| --- | --- | --- |
| **P2** | A lost authenticator is a permanent lockout — the portal issues ten backup codes and accepts none of them | 2026-09-12, by the owner |

`authClient.twoFactor.verifyBackupCode` exists in Better Auth and is never
called; `/two-factor` validates `/^[0-9]{6}$/` and offers no other path. This is
live on production, so a seller who changes phone today cannot get back in
without a direct write to `auth_two_factors`.

## 4. Owner decisions — Bogs and AJ together, and no agent should pre-empt them

These are not blocked on access. They are blocked on a decision, and each is
outward-facing or irreversible in effect.

| | Decision | Why it is not an agent's |
| --- | --- | --- |
| **P1** | **Three `Sals3-Official` repositories are public, including this vault** | anything already cloned or indexed stays cloned and indexed — see [[sals3-repository-register]] §5 |
| **P1** | **`develop`'s upstream in `E:\sals3-ecommerce` points at the public vault repository** | re-pointing an upstream decides where a colleague's next push lands — see [[sals3-session-2026-09-14-part171-the-vault-a-branch-switch-deleted-and-the-root-that-opened-without-its-plugins\|part 171]] §5 |
| **P1** | The Admin Portal is in the vault-only org and has never had a promotion gate | a repository migration, with the PR-numbering and identity consequences part 133 documents |
| **P2** | 379 platform-wide category decisions carry a string constant as both proposer and approver | an authority decision, not a refactor |

## 5. The access split itself is a standing problem

[[pending-register]] carries it as **[P2]**: `gh` and `git` disagree about who is
pushing, and **`louieboi09` cannot see three `anythingsupplies` repositories at
all**. [[sals3-repository-register]] §1 is blunt about the consequence — *"one
account is never a complete view of this project"* — and four separate audits
produced four different repository counts because each enumerated one org under
one account.

For a turnover this matters more than it looks: **an inventory taken during
handover under a single account will be wrong**, and wrong in a way that reads
as complete. Enumerate under both, every time.

## 6. Keeping this note honest

It is an index. It goes stale the moment [[pending-register]] moves and it has no
way to notice.

- **Re-read the register, not this note**, when acting on any row above.
- **Add a row here in the same task** an item is raised whose owner is an
  external account holder — that is the only thing this note does that the
  register does not.
- **Delete a row when its register entry closes.** A turnover note that
  accumulates closed work stops being read, the same discipline
  [[pending-register]] applies to itself.

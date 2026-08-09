---
tags: [session, decision, fx, suppliers, roadmap]
aliases: [CJ Wallet Payment Rail Decision, Baap Store and Spocket Roadmap]
created: 2026-08-08
updated: 2026-08-08
status: historical
authority: owner-decision
owner_approved: true
related:
  - "[[hot]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[parked-ideas-backlog]]"
  - "[[sals3-session-2026-08-08-part17-product-editor-and-supplier-catalogue]]"
---

# Owner decision: CJ Wallet confirmed as the payment rail, and two named future suppliers

Historical record of an owner decision, not a build session. No code
changed here. Current verified state lives in [[hot]].

## What was asked

The Aug 7-8 EOD flagged an open question from
[[sals3-session-2026-08-08-part17-product-editor-and-supplier-catalogue]]'s
FX work: the 2.5% buffer on the USD→PHP rate was sized for a credit card
(~1.85%) or PayPal (3-4%), but if CJ is actually being paid through wallet
top-ups by wire/Payoneer, the buffer is too fat - CJ pays a 2-3% **bonus**
for topping up that way, the opposite direction.

## Bogs's answer

**CJ Wallet is already the real payment method** - not per-order card or
PayPal. The buffer needs to be re-based on the wallet's actual costs
(top-up/transfer fee + FX movement headroom), not the card/PayPal numbers
currently in the code comment.

Separately, Bogs raised the supplier roadmap directly: **Sals3 is already
registered with Baap Store (India)**, and **Spocket** is also planned
alongside CJ Dropshipping. He wants the supplier integration kept flexible
enough to add both without redesigning the core system.

## Why this matters to the code, not just the docs

`src/lib/storefront/fx.ts`'s `DEFAULT_BUFFER_PERCENT = 2.5` and its comment
are now **stale evidence** - they justify the number from the wrong payment
rail. Per [[agent-operating-contract]]'s evidence hierarchy, a comment that
no longer reflects the real transaction path is worse than no comment, so
this needs a follow-up session. Nothing was changed today - the number is
still 2.5% in code as of this note, and the correction is recorded here so
the next session doesn't have to re-derive it from Slack.

What actually needs to happen next:

- Get one real CJ Wallet top-up statement (transfer fee + rate paid vs. ECB
  spot that day) and re-derive the buffer from it, the same way 2.5% was
  derived from card/PayPal evidence in the first place - not by guessing a
  smaller number.
- Update `DEFAULT_BUFFER_PERCENT` and its comment in `src/lib/storefront/fx.ts`
  to name the wallet top-up as the cost basis, not card/PayPal.
- Close out the "**Open**" line in [[hot]]'s FX section, which currently
  still asks which payment route is in use.

On suppliers: the codebase is already built the way this decision wants.
`src/modules/suppliers/providers/` holds one `SupplierProviderAdapter`
interface with `cj/` as its only implementation so far
([[sals3-session-2026-08-07-part15-multi-tenant-supplier-connections-and-ui-overhaul]]),
and the Product Editor's types deliberately carry no provider name or
currency (see part17). Adding Baap Store and Spocket is new adapters behind
that interface, not a rewrite. Two real gaps to flag honestly, not paper
over:

- Each supplier's API returns different evidence (stock, shipping routes,
  images, categories), so the automated evaluation rules that currently
  assume CJ's shape will need a per-provider mapping, not a one-line
  provider-code swap.
- [[parked-ideas-backlog]]'s 2026-08-07 "Shopify-style per-seller CJ
  connections, Supplier Apps, and AliExpress" entry named AliExpress as the
  example second provider. **Baap Store and Spocket are now the real named
  candidates** - the backlog entry should be updated to say so instead of
  the placeholder example, so a future session designs against the actual
  targets.

## Not yet decided

- No date or owner assigned for the FX buffer re-derivation or for
  building the Baap Store/Spocket adapters. Both are confirmed direction,
  not scheduled work.
- Whether Baap Store or Spocket ships first is not stated.

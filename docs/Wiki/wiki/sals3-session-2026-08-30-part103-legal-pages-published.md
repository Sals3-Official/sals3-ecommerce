---
tags:
  - sals3
  - sals3-ecommerce
  - legal
  - compliance
  - session-note
aliases:
  - Part 103
  - Legal Pages Published
created: 2026-08-30
updated: 2026-08-30
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[agent-operating-contract]]"
---

# Part 103 — the Terms of Use and the Privacy Policy stop 404ing

2026-08-30, `sals3-ecommerce`
[#195](https://github.com/Sals3-Official/sals3-ecommerce/pull/195). `/legal/terms`
and `/legal/privacy` answered **404** while the footer's Legal column and the
sign-up/login cards' `auth-links.ts` already pointed at them — a shopper was
asked to agree to terms they could not read, which is also not an enforceable
way to take consent.

> [!NOTE] Provenance
> Written after the fact from the pull request's own record.

## The text is lifted, not written

Both documents are reproduced **verbatim** from sals3.com, not rewritten or
summarised. They live as block lists in `lib/legal/` rather than as HTML or
Markdown strings, and every block renders as a **text node**: no markdown
pass, no link detection, no emphasis — a renderer able to introduce a link or
a bold run could change what a reader understands a binding agreement to say.
A test asserts a literal `<strong>` in the source renders as those characters.

Structure is derived, never edited in: WordPress authored almost every line
as a plain paragraph, so `N. Title` becomes a section and a standalone `N.N
Title` a clause; where a clause label shares its paragraph with the body it
stays one block, because splitting it would change the text. The contents
rail is derived from the sections rather than maintained beside them, and
collapses into a native `<details>` on a phone — keyboard-operable with no
JavaScript.

## Two gaps, marked rather than filled

**The date.** The Terms promise "we will revise the Last Updated date" and
the source publishes none. `[EFFECTIVE DATE]` stays visible until someone
supplies the real one — rendering today's date would invent a fact about a
binding agreement.

**The other policies.** The Terms refer to a Return and Refund Policy and an
Intellectual Property Policy, deferred at the owner's request. Those names
render as plain text, never as links to a 404.

## The entity is checked, not copied

sals3.com's own footer says "Sals3 Pty. Ltd". The Australian Business
Register gives ACN 685 740 514 to **ANYTHING SUPPLIES PTY LTD**, with
SALS3.COM registered as a business name under it — which is what both source
documents themselves say. The documents are right and the old site's footer
is wrong; these pages carry the registered name.

## What a browser found that the generator did not

The Privacy Policy's closing line — "Send an email to SALS3.com's Data
Protection Office – admin@sals3.com" — is short, capitalised and
unpunctuated, and was being promoted to a section heading. An address is
never a heading; there is now a test.

## Evidence

`npm run verify` green in an isolated worktree off `develop`: lint (0
errors), format, typecheck, build, unit tests, 63 e2e. Ten new tests,
including a floor on the whole document's character count — a generator
that silently dropped a container would otherwise still produce a
plausible-looking page. Checked in a browser at desktop and 375px: all 19
contents entries resolve to real anchors, and 14 consecutive items group
into single lists.

## Lessons

- **A footer can be wrong about its own company name.** The registered
  entity was checked against the Australian Business Register rather than
  copied from the site being replaced.
- **A renderer that can format text can misrepresent a contract.** Rendering
  legal text as plain text nodes, with a test pinning a literal `<strong>`
  string, is a narrower and safer choice than a markdown pass that happens
  to look right today.
- **A short, capitalised, unpunctuated line is not automatically a
  heading** — a heading-detection heuristic needs a negative case for an
  address, found only by looking at the rendered page.

---
tags: [sals3, proposal, marketing, ui, storefront]
aliases: [Strategic Banner Integration Proposal, Marketing Banner Pitch]
created: 2026-08-05
updated: 2026-08-05
status: proposed
authority: proposal
owner_approved: false
related:
  - "[[sals3-ux-build-specification]]"
  - "[[sals3-session-2026-08-05-part01-marketplace-landing-page]]"
  - "[[agent-operating-contract]]"
  - "[[index]]"
---

# Sals3 Marketing Banner Integration — Proposal

> [!WARNING] Status: proposed, not approved
> This is a marketing/growth pitch, not a build spec change. Per [[vault-governance-and-note-lifecycle]]'s authority order, [[sals3-ux-build-specification]] outranks this note on every point where they'd conflict. Do not build any of this without an explicit owner decision, and see the objections below before that decision is made.

> [!NOTE] Provenance
> Received from Bogs as `E:\Downloads\Sals3_Marketing_Banner_Pitch.pdf` (3 pages, 33 KB), 2026-08-05. Copied into `Raw/sals3_marketing_banner_pitch_2026-08-05.pdf`; original left untouched in Downloads. Transcribed in full below.

## What it proposes

Four new banner placements, framed by "visual psychology" principles, layered onto the **prototype** (`Sals3 Marketplace.dc.html`'s `isHome`/`isList`/`isPdp`/`isCart` states — see caveat below):

1. **Home Page Visual Anchor Banner** — full-width, dark slate (`#1e293b`) card with crimson accents, below the category row and above "Deals". Framed as "F-Pattern Anchor & Cognitive Priming."
2. **In-Feed Native Ads** — sponsored card replacing every 8th–10th slot in `homeGrid`/`listGrid`, same aspect ratio and border tokens as a real product card, labeled "Sponsored"/"Featured." Framed as "Bypassing Banner Blindness."
3. **PDP Contextual Value Priming Banner** — compact alert box on the product page, below the price/discount breakdown, above the variant selector. Framed as "Value Priming & Decision Reinforcement."
4. **Cart Goal-Gradient Threshold Banner** — high-contrast box in the cart sidebar, above the free-shipping progress bar, emphasizing remaining spend to a threshold. Framed as "Goal-Gradient Effect & Loss Aversion."

### Design/compliance constraints it states

- Don't use "Sals3's primary action electric cyan (`#0891b2`)" for banner backgrounds — reserve it for Buy Now / Add to Cart / Checkout. Banners get dark slate (`#1e293b`), subtle borders, or crimson accents instead.
- Banner height capped at 120px desktop for horizontal banners, so catalog items don't get pushed off-screen.
- No fake countdown timers, restarting clocks, or false scarcity ("Only 1 left!").
- Overlay text must meet WCAG AA contrast using the Plus Jakarta Sans / Outfit tokens.

### Deliverables it asks for

Updated prototype route views (`isHome`, `isList`, `isPdp`, `isCart`) with the four banners rendered conditionally, plus the React/JS state logic to drive them.

## Objections and gaps — read before acting

1. **Color claim doesn't match the actual source.** The pitch says Sals3's primary action color is `#0891b2` (a teal-cyan). Neither the original `Sals3 Marketplace.dc.html` prototype nor the shipped code (`src/app/globals.css`, `--color-brand-600`) uses that value — both use `#0a5c8a` (a darker blue). Verified by direct grep of the codebase 2026-08-05. Do not adopt `#0891b2` anywhere without first confirming with whoever wrote this pitch whether it's a typo, a newer un-synced design decision, or a different reference design entirely.
2. **The "deliverables" target the wrong artifact for current work.** It asks for updates to the `.dc.html` prototype's `isHome`/`isList`/`isPdp`/`isCart` conditional states. That prototype is a design reference, not the real app. The real app ([[sals3-session-2026-08-05-part01-marketplace-landing-page]]) is a Next.js codebase where only the home page exists — there is no `/c/[category]`, `/p/[id]`, or `/cart` route yet (see [[sals3-implementation-phases]] Stage 3/5, still not started). "Updated route views" for `isList`/`isPdp`/`isCart` can't be built as real screens yet; only the home banner (#1) is buildable against a real page today.
3. **Tension with the build spec's own design rule.** Build spec section 4.2: "Do not put two strong colours on one screen," and section 11.4: "the product photograph is the most colourful item on the screen — no interface element competes with it." A dark slate banner with crimson accents, sitting directly above a deals grid whose cards also carry a crimson discount badge (`#d92d20` in the shipped code), is close to that line — worth a deliberate check, not an assumption it's fine because the pitch says "trust-first."
4. **In-feed ads at every 8th–10th slot is a density decision, not just a visual one.** Build spec section 4: "show many products" as the core rule — worth confirming the ad-to-product ratio doesn't erode that before committing to a cadence.
5. **Nothing here contradicts the compliance rules already in place** (build spec section 14's forbidden patterns) — the pitch's own constraints (no fake timers, no false scarcity) line up with what's already required, not new ground.

## Recommendation

Treat as a candidate, not a decision. If Bogs/AJ want banner #1 (home anchor) built against the real landing page, that's a small, scoped follow-up to [[sals3-session-2026-08-05-part01-marketplace-landing-page]] — but it needs the color question answered first, and a deliberate call on whether it clears the "one clear priority per screen" rule. Banners #2–4 need their target routes to exist first (Stage 3 and Stage 5 respectively).

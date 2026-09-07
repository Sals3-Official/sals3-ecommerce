---
tags: [sals3, session, sals3-com-fj, design, pdp, css, accessibility, market-chrome]
aliases:
  - Part 138
  - Fiji Gets More Than A Welcome Band
  - The Frame That Was Added Removed And Brought Back
created: 2026-09-04
updated: 2026-09-07
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[sals3-session-2026-09-04-part131-a-byte-identical-copy-learns-to-say-bula-fiji]]"
  - "[[sals3-session-2026-09-04-part139-the-artwork-that-shipped-ten-megabytes]]"
  - "[[sals3-session-2026-09-04-part137-the-browse-surfaces-learn-one-vocabulary]]"
  - "[[sals3-ux-build-specification]]"
  - "[[hot]]"
---

# Part 138 — Fiji gets more than a welcome band, and a frame is added, removed and brought back in seven hours

> [!NOTE] Provenance
> Written 2026-09-07 after the fact from each pull request's own merged record in
> `anythingsupplies/sals3.com.fj`. The measurements quoted — the 18 photograph
> aspect ratios, the 7.2:1 contrast, the 534×534 live render — are each PR's own
> observation at the time and have not been re-run in this session.

| PR | Title | Merged (UTC) |
|---|---|---|
| [#3](https://github.com/anythingsupplies/sals3.com.fj/pull/3) | feat(fiji): carry the masi edge through the header, categories and footer | 2026-09-03 20:14 |
| [#6](https://github.com/anythingsupplies/sals3.com.fj/pull/6) | feat(fiji): keep the weave inside the bar, and cut the category plate | 2026-09-03 21:43 |
| [#7](https://github.com/anythingsupplies/sals3.com.fj/pull/7) | feat(fj-pdp): cut the gallery frame, draw the colours, stop the price contradicting itself | 2026-09-03 23:21 |
| [#8](https://github.com/anythingsupplies/sals3.com.fj/pull/8) | fix(fj-pdp): give the gallery the shape the photographs are, and drop the frame | 2026-09-04 00:17 |
| [#9](https://github.com/anythingsupplies/sals3.com.fj/pull/9) | feat(fj-pdp): bring the woven mat back, now that the box is the photograph's shape | 2026-09-04 00:31 |

No DDL, no API, no contract change. CSS, four components and a colour table.

[[sals3-session-2026-09-04-part131-a-byte-identical-copy-learns-to-say-bula-fiji|Part 131]]
gave the Fiji fork a welcome band, a masi header texture and seven promo slides.
This is what happened when somebody scrolled past them.

## 1. The identity stopped exactly where browsing started

Scrolled, the header drops its gradient for a flat white bar **and the welcome
band goes with the page**. Below the hero, nothing said Fiji at all. So the market
lost every trace of itself precisely when a buyer was deepest into browsing.

#3 extracted the band's edge into `MasiEdge` and reused it in three more places —
the compact header as a fringe, the category block as one closing edge, the
footer as the same edge flipped — so **one motif hands off between surfaces
rather than four separate decorations**.

Two decisions from it survive the later rework:

- **The header fringe hangs below the bar rather than sitting in flow.**
  Rendering it in flow would add 12px to the header *at the moment it compacts*,
  which is a layout shift on scroll. Absolutely positioned at `-bottom-3` it
  costs nothing.
- **The category block's top edge was cut on sight.** The header is sticky and
  now carries the same motif, so the moment the buyer scrolls the fringe lands on
  the block's top edge — **two opposing rows of teeth overlapping into a diamond
  lattice that reads as noise rather than as a motif**. One edge below the block
  cannot collide with anything, and the page keeps a legible rhythm: the band's
  edge at the top, this one closing the first section, the footer's opening the
  last.

Everything renders only where `resolveMarket()` returns a market, so the shared
storefront is untouched — the same gate as the welcome band and the carousel.

## 2. A fringe outside the bar belongs to nothing

#6 replaced #3's header fringe an hour and a half later, and named why the first
attempt read badly:

> It read as a band of teeth floating over the page, and the reason is simple: it
> was *outside* the bar, so it belonged to nothing.

The masi texture had been riding the gradient as a **mint background image**, and
mint on a white bar is invisible, so it had to fade to nothing on compact. The
fix moves the geometry into a **`mask-image`** and makes the ink a
**`background-color`** — one shape, two inks:

| State | Ink | Opacity |
| --- | --- | --- |
| Over the gradient | `--color-footer-accent` (mint) | 0.16 |
| Compact, on white | `--color-brand-900` (navy) | 0.06 |

Both are properties CSS can interpolate, so **the swap cross-fades on the same
250ms as the gradient underneath** rather than cutting — and nothing hangs
outside the header. The bar itself is what changes.

Two details worth carrying:

- **The mask SVG is drawn in opaque black on purpose.** `mask-mode` resolves to
  `alpha` for an image mask, so black paints the ink through and the transparent
  ground hides it. Its colour is never seen — which means anybody "fixing" that
  black to a brand colour breaks the mask.
- **0.16 over the gradient keeps the white header type at the 7.2:1 it measures
  against `--color-brand-600`**, and 0.06 navy on white leaves the compact bar's
  ink well clear of its own floor. The opacities are contrast decisions, not
  taste.

### The plate is cut, not printed

The category tile's rounded corners became **notched** ones inside a teal
hairline: masi geometry as a **shape**, not a print. Chosen over two patterned
alternatives for a reason that generalises — the page already carries the welcome
band's edge, the header's weave and the footer's edge, so a texture on twenty-one
tiles would be **the fourth place the motif appears**, and the build spec is
explicit that the product photograph is the most colourful item on screen and no
interface element competes with it. **A cut corner adds no ink at all.**

Mechanically: the notch is a **percentage**, so one utility serves the 56px plate
and the 72px one from `md` up; and the ring is a **clipped parent rather than a
border**, because a border cannot follow a `clip-path`.

> [!WARNING] A no-op wrapper is still a node
> The ring first shipped as a wrapper that rendered on **every** deployment and
> was merely styleless without a market. That broke two assertions on the shared
> storefront which reach the plate as the tile's **first `span`**. The shared
> storefront now renders exactly the markup it always did, and two new tests hold
> it there — one asserting the plate is the tile's first span with `rounded-xl`,
> one asserting no masi geometry appears anywhere in the section. "Renders
> nothing visible" and "renders nothing" are different claims about the DOM.

## 3. The picker: a swatch that is allowed to say it does not know

#7 gave the Fiji PDP real colour swatches — **and only when every value in the
axis resolves**.

`ProductOptionAxis` is `{ name, values: string[] }`. The values are **the
supplier's words** and carry no colour of their own, so a swatch has to be looked
up, and `swatchFor` is allowed to answer *I don't know*.

> A guessed swatch is worse than the word it replaces: "Wine Red" painted as a
> generic red is a specific, confident and wrong claim about a garment somebody is
> about to pay for, and unlike a vague word a block of colour reads as a fact.

**One unknown value takes the whole row back to text chips**, because three
squares beside two words reads as *"these two have no colour"* rather than *"we
could not name these two"*.

Every chip in all four presentations renders through **one shell**, so they
cannot drift apart; both markets keep the 44px target (the shared chip in a 2px
border, the Fiji chip in 2px of ring around a 40px face); and the picker stays
**link-based**, so nothing here mutates a price after paint.

### A price line that contradicted itself

The page could read:

```
From  FJ$7.58
Every option is this price.
```

*"From"* promises a range; the line under it denies one. **The qualifier appeared
whenever a product had options at all, while the note was written from the actual
spread.** Both are generated from the same variants, and now share one reading of
them. Same family as part 111's evidence ledger printing "no reviews" one screen
above a 4.0 average: two derivations of one fact, allowed to disagree.

## 4. The frame, the measurement, and the frame again

This is the part worth the most, and it happened three times in about seventy
minutes.

**#7 built it.** A cut teal ring, a woven surround, a clean white plate — three
elements rather than one, because a `clip-path` frame cannot also carry a border,
and because the weave has to be stopped by something opaque before it reaches the
photograph. (A pattern *behind* the thing being sold is an interface element
competing with the product, which the build spec forbids in as many words.)

**#8 removed it, and fixed the cause instead.** The frame drew a hard edge around
a box that was mostly empty. The decoration was not the problem; **the emptiness
was**, and the frame's only real contribution was to make it impossible to
ignore.

The emptiness comes from the box's shape, and this was **measured, not asserted**
— 18 real product photographs on the live storefront:

| shape | count |
|---|---|
| exactly 1:1 | 16 |
| within 10% of square | 2 |

**The catalogue is square.** A 4:5 box therefore reserves a fifth of its height
that no photograph can ever fill, on very nearly every product.

> [!IMPORTANT] The shared frame's own comment argued the opposite
> `ProductGallery`'s comment says *"apparel is the catalogue's shape"* and picks
> 4:5 from it. The images say otherwise, and **the images are the evidence**.
> This is part 112's rule again — a doc comment asserting a fact about data has
> an expiry date — except here the comment may never have been true, and nothing
> had ever counted.

**#9 brought the mat back**, half an hour later, with the diagnosis corrected:

> The mat was never the defect. The uneven margin was.

A **square** box under a **square** photograph gives the same surround on all
four sides, so the texture finally reads as what it is: a mat, the way a print is
matted before framing. The first version's leftover height had collected at the
bottom as a woven band far deeper than the mat around the rest — which does not
read as a mat, it reads as an empty box with a pattern in it.

The mechanics carry their own reasoning:

- **`aspect-square` sits on the mat, not the ring** — the mat is what the padding
  is measured from, so squaring *it* is what makes the surround even.
- `p-4` / `md:p-5` — 16–20px, enough for the 60×70 weave tile to **show a whole
  motif rather than a sliver**.
- **The plate stays opaque**, so the weave stops before it reaches the
  photograph: the weave sits *beside* the product, never under it.
- The photograph is **not inset a second time** — the mat is the inset.

And the test that matters **asserts the mat is square, not that it is woven**,
because *"the shape is not a detail of this design, it is the precondition for
it."*

`masi-notch-lg` and `masi-weave` were **deleted** in #8 rather than parked — *"a
CSS utility nothing uses is one nobody will remember the constraints of"* — and
**returned in #9 with the constraint written into them**, so the next person to
reach for the weave reads why it needs an even surround before putting it on
something that has not got one.

#9's geometry was rendered on the live SIT page **before any of it was written**:
534×534 ring, even 20px mat, weave visible in the surround on all four sides.

## What was not done

- **The shared storefront keeps its bordered 4:5 box**, reserving the same
  unfillable fifth for the same reason. Both #8 and #9 state this explicitly as
  *the global store's call*, not this repository's — so the measurement that
  justified squaring the Fiji gallery has never been acted on where most buyers
  are.
- **The masi motif is still a placeholder**, and #3 and #6 both say the case for
  commissioning it got stronger rather than weaker: it now appears on four
  surfaces instead of one. Fiji Airways put masi on its aircraft by commissioning
  a Fijian master masi artist rather than drawing its own.
- **#8 was opened for the owner to look at rather than merged straight** — *"the
  Vercel preview on this PR is the place to see it"* — and merged the same night.
  No written owner response is in the record.
- Nothing here was seen by a buyer: `sals3.com.fj` production answers Vercel's
  `404: NOT_FOUND`, and SIT sits behind the Vercel wall.

## Lessons

- **Measure the content before choosing the box.** 16 of 18 photographs were
  exactly square while the component's own comment justified a 4:5 frame from
  "apparel is the catalogue's shape". One count settled a design argument that
  two PRs had been having about decoration.
- **A decoration that makes a flaw impossible to ignore is not the flaw.** The
  frame was removed, the shape was fixed, and then the same decoration was
  correct. Removing the thing you can see is the cheapest wrong fix available.
- **Ink and geometry should be separate properties if the two states must
  cross-fade.** A background *image* cannot interpolate between mint and navy; a
  `mask-image` plus a `background-color` can, and gets the 250ms for free.
- **Let a lookup answer "I don't know", and let one unknown govern the whole
  row.** A confident wrong swatch is a claim about a garment somebody is buying;
  a word is not.
- **A wrapper that renders nothing visible still renders a node.** Two shared
  storefront assertions failed on a component that was, by design, doing nothing
  there.
- **Delete an unused utility, or write its constraint into it.** Both were done
  here, seven hours apart, and the second is the one that survives.

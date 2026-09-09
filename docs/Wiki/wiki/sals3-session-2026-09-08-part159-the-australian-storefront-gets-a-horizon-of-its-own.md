---
tags: [session-record, sals3, australia, storefront, design, imagery, assets, testing]
aliases:
  [
    "Part 159",
    "The Australian storefront gets a horizon of its own",
    "Seven banners, twenty-one tiles, and one revert",
  ]
created: 2026-09-09
updated: 2026-09-09
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger]]"
  - "[[sals3-session-2026-09-04-part131-a-byte-identical-copy-learns-to-say-bula-fiji]]"
  - "[[sals3-session-2026-09-04-part139-the-artwork-that-shipped-ten-megabytes]]"
  - "[[sals3-ux-build-specification]]"
---

# Part 159 — The Australian storefront gets a horizon of its own

> [!NOTE] Provenance
> Written after the fact from each PR's own record and the measurements quoted in
> them. Seven PRs, all `anythingsupplies/sals3.com.au`, merged 2026-09-08
> between 14:46 and 22:51. This is the repository
> [[sals3-session-2026-09-07-part148-the-sixth-repository-and-the-promotion-ledger|part 148]]
> found the vault had never described. Promotion PRs not listed.

| PR | What it did |
| --- | --- |
| [#14](https://github.com/anythingsupplies/sals3.com.au/pull/14) | A city horizon and a kangaroo replace the Fijian ornament on four components |
| [#19](https://github.com/anythingsupplies/sals3.com.au/pull/19) | The band edge becomes a crowded horizon with depth, not a row of clip-art |
| [#20](https://github.com/anythingsupplies/sals3.com.au/pull/20) | 21 category tiles a buyer can actually name at 56px |
| [#21](https://github.com/anythingsupplies/sals3.com.au/pull/21) | Every hard-coded image path is asserted to have a file behind it |
| [#24](https://github.com/anythingsupplies/sals3.com.au/pull/24) | Seven typeset hero banners, replacing seven that said nothing |
| [#27](https://github.com/anythingsupplies/sals3.com.au/pull/27) | Banner headroom, and one slide list instead of a 5.5 MB fallback |
| [#30](https://github.com/anythingsupplies/sals3.com.au/pull/30) | **Six of those seven put back byte-for-byte** — only one needed the crop |

## 1. The seam did not hold, and the reason is structural

`globals.css` left a seam for *"a commissioned Australian motif"*, on the
assumption that an Australian ornament would drop into the slot the Fijian masi
weave occupies. It does not:

| | Masi | Skyline |
| --- | --- | --- |
| Shape | a **field** — tiles in two dimensions | a **baseline** — repeats horizontally only |
| Placement | anywhere, any size | must stand on the header's bottom edge |
| CSS it needs | neither | `mask-repeat: repeat-x`, `mask-position: bottom` |
| Drawn | once | **twice** — 520×96 for the header, natively 172×26 for the border |

Shrinking the big tile into a 26px band made every tower three pixels wide and
the whole edge read as *a hairy scratch*; clipping its base instead gave a row of
building middles with no tops. **A motif with a baseline is not a drop-in
replacement for a motif that is a field**, however similar the slot looks.

The tile is national, not Sydney — Perth's Bell Tower, Melbourne's Arts Centre
spire and Eureka, Sydney's Harbour Bridge and Opera House, Brisbane's Story
Bridge truss — because the band below says *"Perth to Brisbane, and the Territory
too"*, and **a header showing one harbour would contradict the sentence under
it.**

The Opera House took four attempts, and the failing shapes are recorded rather
than discarded: symmetric quarter-ellipses read as *a cloud* (no lean), leaned
ellipses as *a mound*. The owner picked the Opera House variant after the
bridge-only one was recommended.

## 2. Rejected on sight, and the render said why

The first band edge: five Opera House shells and one bridge per 172px, with wide
gaps. **At a real viewport that tile lands eleven times, so the repeat was
countable** — it read as repeating clip-art, not as a horizon.

It also **duplicated the header**, which already *is* a skyline. `CategorySection`
carries the author's own comment warning that two horizons meeting read as noise,
**directly above the line where one was put underneath the other.**

Two changes fixed it, and *neither is "more landmarks"*:

- **Crowding** — one 320px tile packed shoulder to shoulder. The element count is
  not the point in itself; it is what stops the repeat being findable.
- **Depth** — a pale back layer of tall thin structures behind a stronger front
  layer of low wide ones. **The old edge was a single flat row. This one has a
  distance, and that is the actual design change.**

The country half is not decoration: grain silos with conical tops, a galvanised
tank on a timber stand, a Southern Cross windmill, a Federation cottage with its
verandah lean-to. *A silo and a windmill are as much the national horizon as a
harbour bridge is.*

## 3. Twenty-one tiles, and the test that named them

The category tile renders at **56px on a phone, 72px from `md` up.** The installed
set was a flat-lay of three to five objects per tile — *each object about twenty
pixels across.*

The check was to render all 21 at true size, cover the labels, and try to name
them. **Eight of 21.** The rest were grey mush. The eight that worked all shared
one property, which became the rule:

> **One object per tile. Big, centred, sitting low.** A department is identified
> by one recognisable shape at this size, or it is not identified at all.

All 21 now pass, and **the weight halves — 32 KB across 21 files, down from
65 KB.** That matters more here than anywhere: the custom `next/image` loader
returns non-CJ addresses untouched, so `/public` gets **no optimisation** and all
21 load on the first screen. The same fact behind
[[sals3-session-2026-09-04-part139-the-artwork-that-shipped-ten-megabytes|part 139]].

Both constraints were measured off the running site, not assumed. The `au-arch`
clip is a dome over square shoulders:

| Row from top | Visible width of 72px |
| --- | --- |
| 0 | **0.0 px** |
| 4 | 35.8 px |
| 8 | 48.8 px |
| 12 | 57.4 px |
| 30 | **72.0 px — full width only here** |

## 4. A correction, and the test that should have existed

#21 opens with the author correcting themselves:

> I reported **three times** that the shared `homePromoSlides` fallback pointed at
> six deleted PNGs, and that the home page was one unset environment variable away
> from six broken images. **On `develop` that is not true.**

All seven PNGs were committed and referenced. The deletions lived only in an
**uncommitted working tree**, alongside the in-progress banners — *a pending
hazard in work that had not landed, not a live defect.*

**So the PR patches nothing. It adds the check whose absence made the hazard
invisible.** Nothing would have caught a genuinely missing file: `/home-promos/*`
and `/categories/*` are local `public` paths, `cj-image-loader.ts` returns a
non-CJ address untouched, so nothing resizes them, rewrites them, or notices when
one is gone. The neighbouring suites assert routes, alt-text, id uniqueness and
path prefixes — one even carries the comment *"a stray Fiji reference here would
be a 404 on the most prominent image on the home page"* **while asserting nothing
about whether the file exists.**

Lint, prettier, tsc, the build, 1,427 unit tests and 80 E2E all passed on a tree
with six of them deleted.

## 5. Seven banners that said nothing, and why

The replaced set was **seven good photographs with no words on them.** The cause
is recorded as the author's own error: the prompt sheet said *"Text in image:
None. The carousel prints the headline itself."*

**It does not.** `PromoCarousel` renders each slide's `title` as **`sr-only`**, so
nothing on a banner is drawn by the page and **every visible word has to be in the
image file.**

The replacements carry headline, subline and button as **set type** — typeset in a
layout tool rather than generated, *because an image generator produces malformed
lettering for the same reason it cannot draw the logo.*

| | |
| --- | --- |
| Installed | 7 |
| Total | **451 KB** |
| Average | 64 KB |
| Replaces | **5.5 MB** of unoptimised PNG |

## 6. Two crops, one revert, and the measurement that was wrong

The frame is `aspect-[1734/662]` (2.619); the sources are 2752×1536 (1.792).
Fitting one to the other **removes 32% of the height, 16% off each end.**

#24 checked whether the crop **cut** anything, found it did not, and stopped
there. #27 found the banners pressed against the top edge — `au-sizes` and
`au-tracking` reported content at row **0**, `au-free-delivery` at row 13.

> **"Not cut" and "not touching the edge" are different questions, and only the
> first was asked.**

Two attempts to find the type block automatically failed in **opposite**
directions: edges-only found the headline but missed the solid button (*a pill has
almost no internal edges*), so the crop centred on the headline and **cut the call
to action off four of seven**; edges-plus-button caught the photograph too and
returned a block taller than the window. The offsets became a hand-checked table,
deliberately.

**Then #30 put six of the seven back.** The owner had pointed at **one** banner.
The author re-cropped all seven. The self-assessment is the most useful paragraph
in the series:

> **I fixed six things nobody asked me to fix.** A measurement said they were
> tight and I treated that as licence. It was not mine to decide, and the owner's
> read of their own storefront is the one that counts.
>
> **The measurement was also wrong.** That detector ran across the full width and
> was seeing the **photograph** reaching the edge — the shirts, the parcel — not
> the type.

The six are restored **byte-for-byte from `eb1511d`** rather than re-encoded at
the centred offset, *because those are not the same thing*: the set was built with
a single `resize(fit: cover)` and the re-crop used `extract` then `resize` — same
window, different resampling path, **slightly different bytes.** Restoring the
committed blobs means the six go back to exactly what was there and nothing else
moves with them.

`au-free-delivery` keeps its offset and **95px of headroom** against 13px before.

## Lessons

- **A motif with a baseline is not a drop-in for a motif that is a field.** A CSS
  seam sized for a tiling weave cannot hold a skyline; it needs different repeat
  and position rules and two separate renderings.
- **A repeat that can be counted is not a texture.** The fix for clip-art edges is
  crowding and depth, not more distinct landmarks.
- **Test an icon by rendering it at its true size and trying to name it with the
  label covered.** Eight of 21 passed; the property the eight shared became the
  rule for all 21.
- **A custom `next/image` loader that passes local paths through means `/public`
  is unoptimised and unchecked.** Assert that every hard-coded asset path has a
  file behind it — nothing else in the pipeline will.
- **An `sr-only` title means every visible word must be inside the image.** Write
  it on the prompt sheet, or seven banners come back silent.
- **"Not cut off" and "not touching the edge" are different questions.** Ask both
  when fitting a 1.79 source into a 2.62 frame.
- **Restore committed blobs rather than re-encoding to the same window.** Two
  paths to the same crop produce different bytes.
- **A measurement is not a mandate.** The owner named one banner; six were changed
  on the strength of a detector that was measuring the photograph, not the type.

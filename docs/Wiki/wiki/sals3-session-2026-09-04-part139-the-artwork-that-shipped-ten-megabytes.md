---
tags: [sals3, session, sals3-com-fj, performance, images, marketing-claims, next-image]
aliases:
  - Part 139
  - The Artwork That Shipped Ten Megabytes
  - A Promise Printed Into Pixels
created: 2026-09-04
updated: 2026-09-07
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[sals3-session-2026-09-04-part131-a-byte-identical-copy-learns-to-say-bula-fiji]]"
  - "[[sals3-session-2026-09-04-part138-fiji-gets-more-than-a-welcome-band]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[hot]]"
---

# Part 139 — the artwork that shipped ten megabytes, and a promise printed into pixels

> [!NOTE] Provenance
> Written 2026-09-07 after the fact from each pull request's own merged record in
> `anythingsupplies/sals3.com.fj`. Every byte count, encoder comparison and
> dimension check quoted below is the PR's own measurement at the time.

| PR | Title | Merged (UTC) |
|---|---|---|
| [#10](https://github.com/anythingsupplies/sals3.com.fj/pull/10) | feat(fj-home): replace the seven Fiji hero banners with the branded v2 set | 2026-09-04 13:25 |
| [#11](https://github.com/anythingsupplies/sals3.com.fj/pull/11) | feat(fj-home): replace the 21 department photographs with the Fijian everyday set | 2026-09-04 14:36 |
| [#12](https://github.com/anythingsupplies/sals3.com.fj/pull/12) | fix(fj-home): correct the free-delivery threshold and stop shipping a 10 MB carousel | 2026-09-04 14:54 |
| [#13](https://github.com/anythingsupplies/sals3.com.fj/pull/13) | fix(fj-home): take the delivery threshold out of the artwork | 2026-09-04 15:09 |

One hour and forty-four minutes, twenty-eight image files, and two lessons that
have nothing to do with art direction.

## 1. The loader that optimises nothing, and the 59 MB it would have shipped

The twenty-one department photographs arrived as **JPEGs at 2048×2048, 59.1 MB
total**, named `ANIMALS & PET SUPPLIES.jpeg`. Shipping them as they were would
have been a serious regression, and the reason is already written down in
`cj-image-loader.ts`:

> A non-CJ address — **a local `/public` path** … — is **returned untouched**, so
> the browser fetches exactly what the component asked for.

`/categories/*` is a local public path, so it passes through **no optimizer**.
`next/image` asks for `sizes="72px"`, the custom loader hands back the original,
and the browser downloads **59 MB of photographs to paint twenty-one 72-pixel
tiles**.

> [!IMPORTANT] `next/image` is not doing what you think it is doing here
> This project set `images.loader: 'custom'` back in 2026-08-12 to escape
> Vercel's metered Image Optimization after it began answering `402` on every
> request. The trade recorded then was that CJ's own CDN would do the resizing.
> **Nothing does the resizing for a local asset**, and there is no error, no
> warning, and no build failure to say so — the tag looks identical either way.
> On a Fijian mobile connection that is not a slow page; it is a page that does
> not arrive.

The files being replaced were 192×192 WebP at 2–6 KB each — a convention somebody
had already established for exactly this reason, and what the prompt sheet asked
for: *"downsample to the 192 px the tile uses."*

### The encoder was chosen by measurement

| encoder | total for 21 |
|---|---|
| Pillow q82 | 90.5 KB |
| sharp q82 | 85.9 KB |
| sharp q78 smartSubsample | 76.5 KB |
| **sharp q72 smartSubsample** | **65.5 KB** |

**65.5 KB for all twenty-one, against 59.1 MB of input — a 924× reduction** — and
still inside the 2–6 KB per file the old set used. `sharp` is already a
dependency, so this adds no tool, and all 21 were checked at 192px before q72 was
accepted: no visible loss on flat-lays.

The 2048px masters are **not deleted** — moved to
`E:\Downloads\Category v1 originals\` so a larger rendition can be cut again if
the tile ever grows.

### And the same mistake, in the same day, one commit earlier

#12 opens by owning it:

> I shipped the v2 set as PNGs in #10 and did not apply the reasoning I applied
> to the category tiles one commit later.

`/home-promos/*` is a local public path too. The seven heroes weighed **10.31 MB**
and the FJ home page downloaded all of it **to paint one visible slide**.

| quality | total for 7 |
|---|---|
| PNG (as shipped in #10) | **10.31 MB** |
| q85 | 0.65 MB |
| **q80** | **0.50 MB** |
| q75 | 0.40 MB |

**0.50 MB — a 20.7× reduction.** The headline type is what degrades first in
WebP, so it was cropped at 1:1 and looked at before q80 was accepted.

Two things done right in the repair:

- **The PNGs are deleted, not left beside the WebPs**, so there is one file per
  slide and no way to point at the heavy one by accident.
- **A test pins the format.** A `.png` creeping back would restore a
  ten-megabyte home page **in silence**, so the format is asserted rather than
  trusted — and the same test asserts the shared storefront keeps its own files,
  so this can never become a licence to convert the global set too.

## 2. A promise printed into pixels

`fiji-free-shipping.png` printed **"Free delivery over US$55."** into the
artwork. The `MarketWelcomeBand` directly beneath it on the same page read
**FJ$55.00** — checked live, not assumed. Roughly double the bar, in one view.

`MarketWelcomeBand` renders that figure from the page's own threshold read rather
than a literal, and its comment says exactly why:

> The threshold is Portal configuration (`SALS3_FREE_STANDARD_SHIPPING_FJ_USD`)
> and someone can change it in a dashboard without touching this file. Printing
> `US$55` as a literal would be a number that silently stops being true, **which
> is what the mid-year-sale banner was removed for**.

### #10 flagged it rather than quietly fixing it

The banner shipped as chosen, with both consequences stated:

1. the hero and the band show **two different numbers** for the same promise;
2. the hero's number **cannot be updated by configuration** — only by
   regenerating the artwork.

The artwork is the owner's call, and SIT sits behind the Vercel wall, so nothing
reached a buyer while it was decided. Two ways out were offered rather than one:
regenerate without the amount, or regenerate reading FJ$ so the two at least
agree today.

### #12 took the second, #13 took the first

#12 remade the banner to say **FJ$55**, and said in the same breath that this
does not fix the class:

> **That warning still stands for the artwork.** This fixes today's
> disagreement; it does not make the figure maintainable.

Fifteen minutes later #13 removed the figure entirely. The hero now reads
**"Free delivery, on us. / On standard orders."**

> Why the correct number was still the wrong thing to print: the previous version
> said FJ$55 and was correct on the day it shipped. **That was exactly the
> problem.** Lower it to FJ$40 tomorrow and the band follows in the same request
> while the artwork keeps promising FJ$55. No error. No failing test. Just the
> largest element on the home page quietly saying something untrue — which is
> what the mid-year-sale banner was removed for, repeated somewhere no code
> change can reach.

**The figure is not lost, it is only in the place that can keep it right.** The
band sits directly above the carousel and its threshold pill is
`flex flex-wrap` with **no responsive hiding** — the component was read rather
than assumed — so the live amount is on screen at every viewport, one line above
this slide. The hero repeating it added no information and one way to go stale.

The crop is recorded too: source 2752×1536 (**1.792:1**) against the slide's
**2.619:1**, so 485px of height was trimmed from the centre — wall above, floor
below, neither the headline block nor the box touched, checked at full size
before acceptance. Encoded at q80 to **51 KB**; all seven heroes together stay at
0.50 MB.

## 3. The check that a previous drop had failed

#10 verified four properties of the set before accepting it, and one of them is
there because it had already gone wrong once:

| | |
|---|---|
| headline matches its slide title | 7 / 7 |
| file matches the slide it is named for | 7 / 7 |
| **duplicate images in the set** | **none** |
| dimensions | 1734×662 on all seven |

> The previous drop had `fiji-secure-checkout.png` **byte-identical** to a stray
> `fiji-bula.png` (same MD5), so one slide would have carried another slide's
> artwork.

#11 ran the same duplicate check on the 21 tiles and adds a second habit worth
copying: **canonical ids come from `git ls-tree HEAD`, never from guessing at the
uppercase filenames the artwork arrived under.**

| | |
|---|---|
| canonical ids / new JPEGs / matched | 21 / 21 / 21 |
| unmatched, or ids left without an image | none |
| two JPEGs mapping to one id | none |
| outputs not 192×192 | none |
| duplicate images in the set | none |

Because the filenames were kept identical to the set they replaced,
`fijiPromoSlides` and the carousel were **untouched** — the slides keep their
titles, alt text and destinations, and the diff is seven binaries.

The brief for the tiles was one rule — **EVERYDAY, NOT CEREMONIAL**. A ukulele
and a lali for arts, dalo and a green coconut for food, corrugated iron and a
hard hat for business, a Gilbert ball with boots and a sulu for sport, pandanus
mats for furniture. No tabua, no tanoa in a ceremonial framing, no masi worn as a
garment; Religious & Ceremonial deliberately neutral. No beaches, resorts or
sunsets anywhere.

## What was not done

- **The shared storefront's `/home-promos` and `/categories` sets were not
  converted**, and the test added in #12 deliberately holds them as they are.
  Whether the global storefront ships unoptimised local artwork through the same
  custom loader **was not measured** in this work. It is the obvious next place
  to look.
- **`public/home-promos/fiji-bula.png` was left untracked and uncommitted** —
  referenced by no code, deliberately not deleted. It is still sitting in the
  working tree of both `E:\sals3-com-fj` and `E:\sals3-ecommerce` as of
  2026-09-07.
- **Nothing pins image *weight***, only the file extension. A 4 MB `.webp` would
  pass the new test.
- None of this was seen by a buyer: Fiji production answers Vercel
  `404: NOT_FOUND`, and SIT is behind the Vercel wall.

## Lessons

- **`images.loader: 'custom'` means local assets are shipped exactly as
  committed.** No resize, no re-encode, no warning, and the `next/image` call
  site looks identical to one that is being optimised. Every local `/public`
  image must be authored at the size it renders.
- **The same reasoning has to be applied to every asset class in the same
  session.** The category tiles were reasoned about carefully and the hero
  banners, shipped one commit earlier by the same hand, were not. Being right
  once is not a rule until it is written into a test.
- **A number printed into artwork is a claim no code change can reach.** Correct
  on the day and wrong the day after a dashboard edit — with no error, no failing
  test, and nothing to notice it. If a figure is configuration, the artwork must
  not carry it; the surface that reads it live must sit near enough to answer.
- **Flag rather than quietly fix, when the fix is somebody else's call.** #10
  shipped the contradiction with both consequences named and two remedies
  offered; the owner's actual answer turned out to be the third option, removing
  the figure.
- **Check for duplicate bytes in an asset drop.** It costs one `md5sum` pass and
  it has already caught one slide wearing another slide's artwork.
- **Take canonical identifiers from the repository, not from the incoming
  filenames.** `git ls-tree HEAD` cannot be fooled by
  `ANIMALS & PET SUPPLIES.jpeg`.

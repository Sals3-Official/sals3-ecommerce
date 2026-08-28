# Turnover — the storefront throws away line breaks the Portal deliberately keeps

**Date:** 2026-08-26
**Repo:** `sals3-ecommerce` (the storefront)
**Found on:** a live PDP, `sals3-ecommerce.vercel.app/p/women-s-fashion-fishnet-hollow-rhinestone-mid-length-half-skirt`
**Status:** diagnosed, **not fixed**

---

## The task

A seller writes a features list in the Portal's Simple text description box:

```
Product details
Material: viscose fibre
Weave: hollow fishnet
Detail: rhinestones
Colours: black, white
Length: 89 cm, all sizes
```

The storefront renders it as one run-on line:

> Product details Material: viscose fibre Weave: hollow fishnet Detail:
> rhinestones Colours: black, white Length: 89 cm, all sizes

Make the storefront honour the line breaks the seller typed.

---

## Why this is the storefront's bug, not the seller's

The Portal keeps single newlines **on purpose**. From
`sals3-portal/src/lib/products/simple-description.ts:52-58`, above
`descriptionTextToBlocks`:

> Single newlines are kept **inside** a paragraph rather than starting a new
> one, because that is how sellers actually write a features list in a plain box
> — a heading line, then one line per feature. The document permits `\n` in
> paragraph text (`DISALLOWED_CONTROL` deliberately exempts tab and newline), so
> this preserves the author's line breaks instead of collapsing them into prose.

So the `\n` survives the editor, survives the block document, survives the
database, and reaches the renderer intact. The renderer is where it dies:

`src/components/product/DescriptionBlockList.tsx:136-142`

```tsx
<p
  key={key}
  className="max-w-[70ch] text-[15px] leading-[1.7] text-ink-muted text-pretty"
>
  {paragraphContent(block.text, block.runs)}
</p>
```

No `whitespace-pre-line`, so HTML collapses every newline to a space. Blank-line
paragraph breaks still work, because those become separate blocks — which is why
a size chart written one size per paragraph renders correctly on the same page
while the features list above it does not.

---

## The change

Add `whitespace-pre-line` to that paragraph's classes. Prefer it over
`pre-wrap`: `pre-line` collapses runs of spaces and honours newlines, which is
exactly the contract the Portal describes. `pre-wrap` would also preserve
accidental double spaces and leading indentation a seller never meant to publish.

Check the same block list is not rendered somewhere that needs the old
behaviour — its own doc comment says it was extracted so the **order page**
could reuse it without the PDP heading, so the order page inherits this change
too. That is almost certainly right (an order should show the description the
buyer read), but confirm rather than assume.

---

## Also worth fixing, same root cause

The Portal's own editor preview has the same gap: a grep for
`whitespace-pre-wrap` / `whitespace-pre-line` across `sals3-portal/src` returns
nothing. So a seller previewing their own description in the editor sees the
collapsed version too, and matches what the storefront does today — after this
change the two would disagree. Either fix both together, or raise a companion
task on `sals3-portal`.

---

## How to know it is fixed

1. The PDP above shows `Product details` on its own line, then one line per
   attribute.
2. Blank-line paragraph separation still produces separate `<p>` elements with
   the existing `gap-4.5` spacing — no double spacing.
3. A description with no newlines at all is unchanged.
4. The order page renders the same description the same way.
5. Whatever this repo's verify command is, it passes. Read `AGENTS.md` in the
   repo root first — the same operating rules apply here as in `sals3-portal`,
   including building in an isolated worktree and not committing or pushing
   unless the owner asks.

---

## Out of scope

- The listing content itself. The copy is being rewritten separately to read
  well under **both** the current and the fixed rendering.
- The Portal-side editor preview, unless you choose to fix both together — see
  above.

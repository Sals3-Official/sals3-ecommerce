---
tags: [session-record, sals3, portal, checkout, copy, asd-ste100, freight]
aliases:
  [
    "Part 151",
    "Every checkout refusal names the item",
    "Seven refusal messages rewritten",
  ]
created: 2026-09-08
updated: 2026-09-08
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[sals3-session-2026-09-07-part146-a-market-settles-in-its-own-currency-wired-and-left-off]]"
  - "[[sals3-session-2026-08-27-part86-the-flag-that-stopped-every-cart-and-the-price-that-saved-a-zero]]"
  - "[[sals3-management-bible]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
---

# Part 151 — Every checkout refusal names the item, and says what to do

> [!NOTE] Provenance
> Written after the fact from each PR's own record. Both PRs are
> `anythingsupplies/sals3-portal`, merged 2026-09-07 at 17:08 and 17:38.
> Promotion PRs not listed.

| PR | What it did |
| --- | --- |
| [#141](https://github.com/anythingsupplies/sals3-portal/pull/141) | The freight refusal — names the item, gives the true reason, offers a next step |
| [#145](https://github.com/anythingsupplies/sals3-portal/pull/145) | The remaining **six** refusals, including three that named our own plumbing |

## 1. One sentence that failed a buyer three ways

> No delivery method is available for this cart and address.

- it named **no item**, so a five-line cart gave no clue which one to remove;
- it gave **no reason**, so it read as our fault;
- it offered **nothing to do next**.

It now reads, for any item:

> Sorry, we can not get the Walking Pad Treadmill to Fiji — it ships from China,
> and no courier covers that route for this parcel. You can try another address,
> or remove it and check out the rest.

## 2. It claims no cause CJ never gave

**CJ does not say why it returned nothing.** "Too large" or "too heavy" would be
*a guess dressed as a fact* — and a buyer who then splits the order hits the same
wall, sent there by a sentence we invented. **A test pins this**: the copy may
not assert a cause.

The **origin** is the substance instead — checkable, true, and it tells a buyer
that a different address might work. That is the difference between a refusal
that is honest and one that is merely apologetic.

This is the [[sals3-management-bible|management bible]]'s *truthful identity and
fulfillment* boundary applied to a failure path rather than a success one, and it
is why the sentence says "it ships from China" rather than anything about size.

## 3. Length, because catalogue titles do not cooperate

Two names then a count, each title cut to **44 characters on a word boundary**.
Catalogue titles run past a hundred characters — *"Japanese-Style Cropped Harem
Pants - Loose Calligraphy Print, Black or Grey"* — so three in one sentence
without a cap produces a paragraph nobody reads.

## 4. The remaining six, and three of them exposed our own plumbing (#145)

Each opened *"A cart item is…"*, which tells a five-line cart nothing about which
line to remove. Three went further and named internals to someone who has **no
supplier and no package to fix**:

> A cart item is missing supplier variant details.
> A cart item is missing the supplier detail needed to quote delivery.
> A cart item is missing package size or weight.

What they say now:

| Case | Copy |
| --- | --- |
| not sold here | Sorry, we do not sell the Walking Pad Treadmill in this store. Remove it to check out the rest. |
| not purchasable | Sorry, the Walking Pad Treadmill is not available to buy right now. Remove it to check out the rest. |
| out of stock | Sorry, the Walking Pad Treadmill is out of stock right now. Remove it to check out the rest. |
| **our data gap** ×3 | Sorry, we are missing some delivery details for the Walking Pad Treadmill on our side. Remove it to check out the rest. |

**The three data gaps are one thing to a buyer**, so they share one sentence that
*owns* the problem — "on our side" — rather than three that describe three
different internal shapes. Collapsing them is the right call precisely because
the buyer's available action is identical in all three.

## 5. Why "not sold here" had to be its own sentence

The **not sold here** case is new vocabulary that #120 created: with per-market
offers and no nearest-market fallback, a market with no offer must refuse. The
neighbouring availability-scope test had already warned what happens if that is
worded as a delivery problem —

> a refusal worded as a delivery problem is how a frozen availability flag was
> misread as a delivery restriction for months

— which is the defect recorded in
[[sals3-session-2026-08-27-part86-the-flag-that-stopped-every-cart-and-the-price-that-saved-a-zero|part 86]].
*"Not sold in this store" does not send a buyer to edit an address that is fine.*

## 6. Verification

`diagnose-freight-quote.test.ts` and `freight-quotes.test.ts` both extended;
#145 rewrote 175 lines of `freight-quotes.ts` against 106 removed, consolidating
seven message paths. The cause-claim prohibition is a test rather than a
convention. All local — Actions billing-blocked on this repository.

## Lessons

- **A refusal is a product surface.** Three failures in one sentence — no item,
  no reason, no next step — and none of them were logic bugs.
- **Never invent a cause the supplier did not give.** A plausible guess sends the
  buyer to a workaround that hits the same wall, and now it is our fault twice.
  Pin the prohibition with a test, not a style note.
- **Name the item, always.** Every message here is worse in exact proportion to
  how many lines the cart has.
- **Collapse messages by the buyer's available action, not by the internal
  cause.** Three distinct data gaps are one sentence because there is one thing to
  do about them.
- **Own the ones that are ours.** "We are missing some delivery details on our
  side" is both true and better than three sentences describing our schema.
- **A refusal worded as the wrong category of problem costs months.** It happened
  once with an availability flag; the test that remembered it shaped this copy.

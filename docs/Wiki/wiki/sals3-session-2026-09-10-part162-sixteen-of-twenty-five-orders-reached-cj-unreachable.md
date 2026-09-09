---
tags:
  [
    session-record,
    sals3,
    checkout,
    cj,
    orders,
    data-quality,
    validation,
    free-shipping,
    observability,
  ]
aliases:
  [
    "Part 162",
    "Sixteen of twenty-five orders reached CJ unreachable",
    "The phone number that was only a prefix",
  ]
created: 2026-09-10
updated: 2026-09-10
status: implemented
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[pending-register]]"
  - "[[sals3-skills]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[sals3-session-2026-09-09-part161-the-fiji-and-australian-storefronts-were-asking-for-a-philippine-address|part 161]]"
---

# Part 162 — Sixteen of twenty-five orders reached CJ unreachable

> [!IMPORTANT] The finding, in one line
> **Orders do reach CJ.** 51 of them are in the account. What arrives is the
> problem: two-thirds of the ones readable carry a phone number no courier can
> deliver on, and the cause is that the validation floor was set to exactly the
> length of the prefix the form pre-fills.

> [!NOTE] Provenance
> Measured 2026-09-10 against the **live CJ account** through its own API —
> `get_order_list`, 25 Sals3 orders read across two pages of 51 — and against
> `sit.sals3.com.fj`, `sit.sals3.com.au` and `sals3.com.au` in a signed-in
> browser. The phone counts below are a census of what CJ actually stored, not
> an estimate. Every code claim was then re-checked against the source, and each
> fix proved by removing it and watching its test go red. The one thing **not**
> measured is the leg after payment: a live sandbox order was driven to the
> Stripe step and stopped there, because completing it required entering a
> verification code against saved payment information.

| PR | Repository | What it did |
| --- | --- | --- |
| [#43](https://github.com/anythingsupplies/sals3.com.fj/pull/43) | `sals3.com.fj` | All four fixes |
| [#35](https://github.com/anythingsupplies/sals3.com.au/pull/35) | `sals3.com.au` | The same, ported by hand |
| [#38](https://github.com/anythingsupplies/sals3-ecommerce/pull/38) | `sals3-ecommerce` | Phone, free shipping, fallback logging — no country lock exists there |

## 1. The census

Of the 25 Sals3 orders readable at CJ:

| Value CJ stored | Count | What it is |
| --- | --- | --- |
| `+639` | 9 | The pre-filled prefix, never typed over |
| `+6399271739215` | 7 | Prefix + a national number that also starts with `9` |
| valid | 9 | |

**16 of 25.** Both shapes are the same design fault wearing two faces.

`phone: z.string().trim().min(4)`. Every prefix in `CHECKOUT_COUNTRY_DETAILS` is
**exactly four characters** — `+639`, `+679`, `+614` — and
`useCheckoutAddress` pre-fills one. So an untouched field sat precisely at the
bar and passed. The second shape is the prefix inviting the error: `+639`
already contains the mobile leading `9`, so a buyer appending their own
`9271739215` sends one digit too many.

The fix counts the digits *after* the prefix, because both failures are the
wrong length — zero, and one too many. `phoneNationalDigits` is per country and
accounts for what each prefix already consumed: PH 9 (`+63` plus the mobile
`9`), AU 8 (`+61` plus the mobile `4`), FJ 7 (`+679` is Fiji's country code
alone). Checking the remainder is digits at all is what makes the count mean
something.

Recorded because it is inherited and easy to mistake for new: pinning a mobile
prefix means **no landline can be entered** for any of these markets. That was
true before this field existed, and it suits a courier who sends a delivery SMS.

## 2. The regression from part 161, twenty-four hours old

[[sals3-session-2026-09-09-part161-the-fiji-and-australian-storefronts-were-asking-for-a-philippine-address|Part 161]]
put a stored buyer choice above the deployment's market. It had not read
`checkoutCountriesForMarket`: on a market storefront `CheckoutAddressForm`
**drops the country select entirely** and renders read-only text.

So a buyer with a stored `PH` cookie got a box reading "Fiji", **seventeen
Philippine regions** beneath it, and a `+639` prefix — most of the defect part
161 exists to fix, handed back to a smaller group.

The lock now wins first. This is not a reversal of ADR-003 §1: a stored choice
still outranks a *guess*, and still does on the shared `sals3.com` where the
select is a real control. What it cannot outrank is a field the buyer has no way
to act on.

The rationale was already in the vault's own source, in `locations.ts`, and part
161 did not read it:

> `sals3.com.fj` is the Fijian store. Offering an Australian buyer's address on
> it is offering a choice that is not one: the market decides the price, the
> price is already Fijian, and shipping that order to Australia would charge
> Fiji's margin for an Australian delivery. Owner decision 2026-09-07 — *"pag
> Fiji ay Fiji customers lang"*.

## 3. The cart claimed free delivery it had not earned

`FreeShippingNotice` read `subtotal` — the whole cart — while checkout buys only
the **selected** lines, a distinction that has existed since part 123.

Measured on SIT with one line of six selected: the card said *"already qualifies
for free Standard delivery"* off a FJ$1,300 cart, while the delivery step
correctly asked for **FJ$47.33 more** on the FJ$7.49 actually going through —
and 7.49 + 47.33 is exactly the FJ$54.82 threshold. `selectedSubtotal` is the
same value until a line is deselected, so the default cart is unchanged.

## 4. The fallback that said nothing, and the storefront it hid

`sit.sals3.com.au` serves **placeholder products** — gradient tiles, generic
names, US$ prices on an A$ storefront, under a "Live products unavailable" note.
`sals3.com.au` **production is fine**, and the code is byte-identical between
the forks apart from one comment, so the fault is environment configuration in
the AU project's **Preview** scope: one or more of `SALS3_PORTAL_URL` (unset
dials `http://localhost:3001`), `SALS3_STOREFRONT_API_TOKEN`, and
`SALS3_PORTAL_PROTECTION_BYPASS`.

It could not be narrowed further from outside, because `getForYouProducts`
discarded the reason in a bare `catch {}`. The three causes differ in kind — a
missing token throws before any request, a missing URL dials localhost, and
Deployment Protection returns a login page where JSON was expected — and only
the error says which. It now logs the message to the Vercel runtime log. A token
never appears in one.

## 5. What the order test did and did not prove

Driven on `sit.sals3.com.fj` with a made-up Fijian address (Mere Tuilagi, 12
Vitogo Parade, Namaka, Nadi, Western Division):

- **Part 161's fix is live on SIT** — the form seeded Fiji and `+679`, not the
  Philippines. That closes [[pending-register]]'s *"never been observed on
  SIT"* entry for the Fiji half.
- The Fiji divisions and Western Division towns populated correctly.
- **A real CJ freight quote returned** — Standard FJ$26.08 (15–45 days),
  Expedited FJ$192.05 (5–7 days), Express correctly *"Unavailable for this
  package"*.
- A Stripe session was created in **TEST MODE** at US$14.93 against FJ$33.57 —
  the known display-FJD/charge-USD state, ratio 2.249, the published rate plus
  buffer.

It stopped there. Stripe **Link** asked for a verification code to unlock saved
payment information, which an agent must not enter. **The leg from payment to a
CJ order therefore remains unproven by this session** — though the CJ census
shows it has worked repeatedly before.

## 6. What the census found besides phone numbers

- **No order has reached CJ since 2026-09-03.** The most recent is
  `S3-20260903-9C8588EF0C`.
- **Two orders sit at CJ in `CREATED` with `paymentDate: null`** —
  `S3-20260828-EF28C4D429` and `S3-20260830-4F919D5020`. A CJ order exists and
  will never ship. Nothing sweeps them.
- **Two real-money orders are in `TRASH`** from 2026-08-18 —
  `S3-20260818-D6134CEAE2` (US$122) and `S3-20260818-8272210D40`, both
  `isSandbox: 0`, both unpaid.
- **Every Sals3 order in the census ships to PH/NCR/Quezon City**, which is part
  161's defect visible in the shipping data rather than in a form.

## Lessons

- **A validation floor set in the same units as a pre-filled value is not a
  floor.** `min(4)` against a four-character prefix is a check that can only
  pass. The bar has to be expressed against the part the human supplies.
- **A pre-filled prefix that overlaps the national number invites a doubled
  digit.** `+639` contains the mobile `9`; seven buyers appended their own.
  Where a prefix and a national format overlap, the field has to say how many
  digits it still wants.
- **Read the file you are changing for the decision already recorded in it.**
  Part 161's regression is one paragraph of `locations.ts` away from having been
  impossible, and that paragraph names the owner and the date.
- **Two subtotals in one context means the wrong one will be read.** `subtotal`
  and `selectedSubtotal` differ only when it matters, which is exactly when
  nobody is looking.
- **Census the live system before believing a code reading.** The phone defect
  was invisible in review, in tests, and on the page. It was obvious in one API
  call against what the supplier actually stored.

## Pending

- **AU SIT's Preview env vars** — a dashboard action, not code. [[pending-register]].
- **The payment→CJ leg is unproven** by this session.
- **Two stranded `CREATED` orders and two trashed real-money orders** need a
  decision: sweep, reconcile, or leave.
- **No CJ order since 2026-09-03** — cause not investigated here.
- **Bad phone numbers already at CJ are not repaired** by this change; it only
  stops new ones. Whether the 16 existing orders need correcting is the owner's
  call.

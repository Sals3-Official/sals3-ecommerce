---
tags:
  - sals3
  - sals3-ecommerce
  - checkout
  - stripe
  - auth
  - cart
  - session
aliases:
  - Checkout Flow Split
  - Checkout Auth Guard
  - Part 55
created: 2026-08-19
updated: 2026-08-19
status: shipped
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-009-server-verified-email-password-authentication]]"
  - "[[sals3-session-2026-08-17-part50-aj-checkout-freight-quotes]]"
  - "[[sals3-session-2026-08-18-part53-paid-order-path-and-the-queue-that-swallowed-it]]"
---

# Sals3 session 2026-08-19, part 55 — checkout becomes three steps, and the buyer-facing gaps around it close

Six merged `sals3-ecommerce` PRs
([#105](https://github.com/Sals3-Official/sals3-ecommerce/pull/105)–[#110](https://github.com/Sals3-Official/sals3-ecommerce/pull/110)),
all on the buyer's side of the path that part 53 built. Written from the PR
records after an audit found them undocumented.

## 1. Checkout required no sign-in at all (#105)

`/checkout` had no auth guard, and **both checkout Server Actions ran for
anonymous callers** — creating a Portal intent, a Stripe Checkout Session, and
spending CJ freight-quote budget. A signed-out visitor now lands on
`/login?next=checkout` and returns after signing in, by password or Google.

**Two layers, on purpose.** The page guard is UX: it redirects before
rendering. The guards inside the Server Actions are the security boundary — a
Server Action is an independently addressable POST endpoint whose id ships in
the public client bundle, so a page redirect proves nothing about who is
calling. No proxy/middleware guard, because Next's own guide says Proxy is
optimistic-only and must not be the sole defense, and `firebase-admin` cannot
run on Edge.

New `src/lib/auth/dal.ts` centralizes session reads, memoized with React
`cache`, splitting `checkRevoked` by cost:

| Function | `checkRevoked` | Use |
|---|---|---|
| `getBuyerSession()` | `false` | Page-render gate. Local verify, no network. |
| `getRevocationCheckedBuyerSession()` | `true` | Actions that spend money or CJ quota. |

That split is the interesting part: revocation checking is a network call, so
paying for it on every render would tax every page to protect the two actions
that actually matter.

## 2. Checkout is now three routes (#108)

Delivery and payment shared one screen — the buyer scrolled past a courier
list to reach a **Payment** button that then revealed a Stripe form *below*
it. Two decisions and a hidden third step in one view.

| Route | Step | Behaviour |
|---|---|---|
| `/checkout` | 01 Information | Address. "Continue to delivery" quotes, then navigates on success. |
| `/checkout/delivery` | 02 Delivery | Courier per package. "Go to payment" creates the Portal intent and Stripe session, then navigates. |
| `/checkout/payment` | 03 Payment | Stripe already mounted on arrival. No submit button. |

A `(flow)` route group holds the three; `/checkout/success` stays outside it
— the receipt is not a step, has no stepper or order summary, and is Stripe's
`return_url`. Items and shipping stay visible through payment, with the
subtotal / shipping / total breakdown repeated at the point of commitment.

## 3. The payment step stopped showing two order summaries (#110)

The payment step rendered **our** itemised summary in the sidebar and the one
Stripe's embedded form draws for itself. Two copies of the same numbers
compete to be believed, and ours cost the form 360px to say nothing new. It
also wrapped the embedded form in a bordered box, producing two nested frames
and a visible double line.

The sidebar now renders on information and delivery only — the steps where
the buyer is still choosing and the numbers are genuinely ours. The embedded
form gets the full column and no wrapper. Kept above it: item count,
shipping, total — the amounts Stripe cannot display until it finishes
loading, with shipping broken out because it is the line most likely to be a
surprise.

## 4. The success page showed a payment and nothing else (#106)

It confirmed a status and an amount; a buyer could not see what they bought,
where it was going, or which delivery option they picked. It now shows items
(thumbnail, title, qty, line total), **Ship to**, and **Delivery** (carrier,
arrival window per package, shipping charge), with one CTA.

**Deliberately read from the Stripe session, not the Portal order.** The
`checkout.session.completed` webhook is asynchronous and usually has not
landed when Stripe redirects the buyer back, so reading the order here would
race a write. The Stripe session is consistent immediately.

The freight line is told from product lines using the `sals3_line_count`
metadata this app already writes — not by matching a `Shipping - ` display
name — so a product legitimately called "Shipping Container" is not mistaken
for freight. There is a test for exactly that.

## 5. The cart survived being paid for (#107)

After a successful payment the cart still held the purchased lines: the
header badge kept a count and `/cart` offered a second checkout for goods
already bought.

"Clear on mount of the success page" is the obvious version and destroys data
twice over, so both cases are guarded:

- **Only alongside a receipt.** The same route renders "Checkout not
  completed" and "Checkout not verified". Clearing there takes the cart from a
  buyer whose card was declined — exactly the person who needs it to retry.
- **Once per Stripe session.** A receipt is a page buyers return to. Clearing
  on every render would wipe a cart filled *after* the purchase. Cleared
  session ids are recorded under `sals3-cleared-checkouts-v1`, newest first,
  capped at ten, and the id is written *before* the clear so a failed write
  cannot cause a re-clear later.

## 6. A failed quote said nothing anyone could act on (#109)

A buyer saw *"Delivery options are unavailable. Try again in a moment."* The
logs for that minute held two `POST /checkout` lines and nothing else — the
whole quote path had **zero** logging, and both branches of the catch returned
the same sentence, so an item that genuinely cannot ship was indistinguishable
from a broken upstream. The copy also invited a retry that could never
succeed.

## 7. Open

- **`STRIPE_WEBHOOK_SECRET` is still unset in Vercel production** (part 53
  §7). Everything above is buyer-visible polish on a path that still produces
  no Sals3 order until that secret exists.
- Two optional aliases remain unset and fall back safely:
  `SALS3_ECOMMERCE_BASE_URL` (return-URL fallback) and `SALS3_PORTAL_URL`.
- No `automatic_tax`, and `CHECKOUT_ALLOWED_COUNTRIES` remains AU and PH —
  unchanged by this work, and per PDP v3.1 §8 must not widen before a tax
  engine exists.

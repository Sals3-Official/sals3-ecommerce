CODEX -> AJ AGENT TURNOVER: SALS3 CHECKOUT SHELL
Date: 2026-08-17
Target repo: Sals3 ecommerce storefront

Purpose:
Implement the buyer checkout shell improvements for the live Sals3 storefront journey:
PDP Add to Cart -> Cart -> Checkout -> Stripe Checkout -> Return/status page.

This note is intentionally self-contained for the git/Obsidian vault. Do not rely
on Windows-only local handoff paths. If Claude Design artifacts are available,
use them as visual reference, but the implementation rules below are the source
of truth for this coding pass.


MANDATORY FIRST STEPS

1. Work in the Sals3 ecommerce storefront repo, not the portal repo.
2. Read the local AGENTS.md and the Sals3 wiki rules before editing code.
3. Inspect git status before changing anything.
4. Do not commit, push, deploy, or open a PR unless AJ explicitly asks.
5. Do not revert unrelated user/agent changes.
6. Do not add secrets, Cloudflare tokens, Stripe keys, env values, or new paid services.
7. Do not touch supplier/CJ mapping, product taxonomy, portal product editing, or order-backend work.


CURRENT CODE SURFACES TO READ

- src/components/product/ProductAddToCartButtons.tsx
- src/components/cart/CartProvider.tsx
- src/components/cart/CartToast.tsx
- src/app/cart/page.tsx
- src/components/cart/CartPageClient.tsx
- src/components/cart/CartLineItemRow.tsx
- src/app/checkout/page.tsx
- src/components/checkout/CheckoutPageClient.tsx
- src/components/checkout/CheckoutAddressForm.tsx
- src/components/checkout/CheckoutOrderSummary.tsx
- src/app/checkout/actions.ts
- src/lib/checkout/schema.ts
- src/services/checkout/cart-validation.ts
- src/services/stripe/checkout.ts
- src/app/checkout/success/page.tsx
- test/client-bundle-boundary.test.ts, if a new client component is added.


CURRENT TRUTHS TO PRESERVE

- PDP Add to Cart writes to the client localStorage cart and shows a non-modal toast.
- PDP Buy Now adds the item and routes to /cart. Keep that for this pass.
- Cart is localStorage only. There is no server cart yet.
- Checkout submit sends product ids, variant ids, quantities, and address to a server action.
- The server revalidates product, variant, availability, and price before opening Stripe.
- Stripe Checkout handles payment. Sals3 does not store card or bank details.
- Cart and checkout are noindex. Keep cart, checkout, and return/status noindex.
- Allowed checkout countries are Australia and Philippines only.
- There is no tax engine, freight quote, delivery estimate, Stripe shipping_options, automatic_tax, order storage, or order history in v1 checkout.
- Do not show S3V hashes or internal SKUs to buyers. The existing no-hash variant behavior is intentional.


IMPLEMENTATION SCOPE

1. ADD TO CART TOAST

Keep toast, not mini-cart and not cart drawer.

Upgrade the toast so it:
- Names the added item.
- Shows the buyer-facing option/variant when available.
- Includes one action only: View cart.
- Keeps role="status" and aria-live="polite".
- Stays non-modal; do not use dialog behavior.
- Uses around 6 seconds dwell.
- Pauses auto-dismiss on hover and while focus is inside.
- Never auto-dismisses while the View cart action has focus.
- Does not include Checkout as an action.
- Still lets SiteHeader/cart count update correctly.


2. BUY NOW

Keep Buy Now routing to /cart.

Reason:
Server validation currently happens on checkout submit only. Sending Buy Now
straight to /checkout could make a buyer fill address fields before learning a
stale or unavailable variant must be removed/re-added. Move Buy Now to /checkout
only after validation-on-cart-load or validation-on-checkout-mount exists.


3. CART LINE ITEMS

Keep product id + variant id as cart line identity.

Requirements:
- Two variants of the same product must render as two distinct cart rows.
- Preserve buyer-facing option sub-labels.
- Add unit price per line, for example "US$7.80 each".
- Keep line total visible and right-aligned.
- Keep quantity stepper behavior and max quantity disabled state.
- Keep Remove as a clear text button.
- Never introduce SKU/S3V fallback in rendered text or attributes.


4. CART SUMMARY

Keep /cart using the full site header and full footer.

Summary panel should include:
- Items
- Subtotal
- Ruled Total today
- Proceed to checkout CTA
- Omissions/details block

Omissions/details block copy:
- Delivery: Not quoted. No delivery charge is applied to this payment.
- Tax: Not calculated by Sals3.
- Nothing is added at the last step: The total above is the amount Stripe will charge.

This claim is true only while createStripeCheckoutSession has no shipping_options,
no shipping line item, and no automatic_tax. If that has changed, stop and update
the copy/tests accordingly.

Do not say:
- tax included
- shipping calculated at checkout
- free shipping
- delivery estimate
- anything about duties

Fix any live use of the low-contrast ink-faint token as text in cart/checkout/status.
It can be used for borders or non-text decoration only.


5. CHECKOUT PAGE SHELL

Replace the full SiteHeader/SiteFooter on /checkout with a reduced checkout shell.

Reduced checkout header should include:
- Sals3 wordmark/brand
- Back to cart
- Quiet "Payment handled by Stripe" message

Do not include:
- search
- category navigation
- RegionButton

Use a minimal/legal-only checkout footer if an appropriate pattern exists. Otherwise
implement the smallest local footer consistent with Sals3 style.

Keep:
- /cart full header and full footer.
- return/success page full header and full footer.
- max-w-6xl px-6 page geometry.


6. CHECKOUT ADDRESS FORM

Preserve the existing accessibility and autofill quality.

Do not remove:
- autoComplete
- inputMode
- htmlFor label links
- aria-invalid
- aria-describedby
- role="alert" error behavior

Changes:
- Country must not preselect Philippines.
- Initial country should be empty/select-placeholder, for example "Select a country".
- Missing country must produce a field-level validation error.
- Country must use a real <label htmlFor>, not a span with aria-labelledby.
- Add helper copy near country: "Sals3 delivers to Australia and the Philippines."
- Mark Phone and Address line 2 as optional.
- Optional markers should not pollute accessible label names. Prefer visible text outside the label and connect it with aria-describedby.


7. CHECKOUT "BEFORE PAYMENT OPENS" LEDGER

Add a compact truthful ledger/checklist before payment CTA.

Rows must describe behavior that already exists in code:
- Your items are checked again.
- The current price is confirmed.
- An unavailable option stops checkout.
- Payment opens in Stripe.
- Sals3 never sees your card.

Include the price movement truth:
If a price moved since add, checkout stops rather than charging a new amount.

Do not add a sixth row unless it maps to running code.
Do not add fake trust badges or reassurance claims.


8. CHECKOUT ORDER SUMMARY

Keep:
- 64px thumbnail
- title
- option sub-label
- quantity

Add:
- Unit price to the quantity line, for example "Qty 1 - US$7.80 each".
- Same truthful omissions/details footer as cart, adapted to the smaller summary.

Use the shared lineId/cart line identity helper for keys instead of duplicating
hand-built key strings.

Never expose S3V/internal SKUs.


9. CHECKOUT CANCEL RETURN

Stripe cancel_url already returns buyers to /checkout?canceled=1.
CheckoutPageClient currently does not read this.

Add a neutral acknowledgement above the address form when canceled=1 is present:

Title:
You came back without paying.

Body:
Nothing was charged and your cart is unchanged. Continue when you are ready.

Rules:
- This is not an error state.
- Do not style it like a warning/blocker.
- Strip the canceled param after reading so refresh does not re-announce it.
- Preserve the cart and typed address state.


10. CHECKOUT CTA

Change submit CTA label from "Payment" to "Continue to payment".

Keep:
- disabled-while-pending behavior
- duplicate-submit prevention
- server validation and Stripe errors in an aria-live area

Do not rewrite existing buyer-facing server error strings unless a test proves
the current string is wrong.


11. STRIPE RETURN / SUCCESS PAGE

Remove internal implementation copy from buyer-facing UI.

Do not say:
- "Sals3 order storage is not built in this v1 checkout."
- "order confirmed"
- any generated/fake order number
- email/receipt promises unless Stripe receipt emails are verified enabled

Show a truncated but copyable Stripe session reference. It is the only identifier
that exists today.

Implement four states:

paid:
- Title: Payment received
- Body: Stripe has confirmed your payment of {amount}. Keep the reference below - it identifies this payment if you need to contact us.
- Quiet line: Your Sals3 account does not show past orders yet, so this page and your Stripe confirmation are the record of this payment.

complete but unpaid:
- Title: Payment still processing
- Body: Stripe has your details and the payment has not settled yet. Nothing more is needed from you.

otherwise:
- Title: Checkout was not completed
- Body: No payment was taken. Your cart is still here if you want to try again.

lookup failed or missing session_id:
- Title: We could not confirm this checkout
- Body: We could not reach Stripe to check. If you were charged, the payment is safe with Stripe - contact us with the time you paid.

Keep noindex.


12. OPTIONAL LOW-RISK SERVER ERROR IMPROVEMENT

Claude Design flagged that a missing site URL currently falls into generic
"Stripe checkout failed" handling even though retrying cannot fix a missing env var.

If the code has an existing safe pattern, split missing base URL into a distinct
server-side error branch and update .env.example with the documented public site
URL variable.

If this becomes invasive, leave it as a reported follow-up instead of delaying
the checkout shell.


RESERVED / FUTURE WORK

Do not render placeholders for these yet:
- Delivery quote line, blocked on freight/carrier integration.
- Tax line, blocked on tax engine or automatic_tax.
- Delivery estimate, blocked on destination quote.
- Returns policy link, blocked on published policy.
- Order number, blocked on order storage.
- Order history link, blocked on order storage.
- Saved addresses, blocked on account address storage.
- Discount/voucher field, blocked on voucher entity.
- Buy Now directly to /checkout, blocked on validation on cart load or checkout mount.
- Aggregated multi-line cart validation errors with line attribution, blocked on validation response shape changes.


TEST REQUIREMENTS

Add or update focused tests for changed behavior.

Required coverage:
1. Add to Cart shows a non-disruptive toast naming the item and option, with View cart, and cart count increments.
2. Toast is role="status" and not a dialog.
3. Toast does not auto-dismiss while focused/hovered.
4. Buy Now still routes to /cart.
5. Two variants of one product render as two distinct cart rows with distinct option sub-labels and independent quantity behavior.
6. No S3V/internal hash appears in rendered text or attributes across cart, checkout, and return/status.
7. Unit price renders per line and unit x qty equals displayed line total.
8. Empty cart blocks checkout submit path.
9. Country has no preselection and missing country produces a field-level error.
10. Checkout address autoComplete/inputMode attributes survive the restyle.
11. Address errors remain announced, tied to fields via aria-describedby, and set aria-invalid/role="alert".
12. Optional fields are marked optional without polluting accessible label names.
13. /checkout?canceled=1 renders the neutral acknowledgement, preserves cart/address state, and does not show the acknowledgement on clean /checkout.
14. Server validation errors render without losing cart or typed address state.
15. Submit disables while pending and cannot open two sessions.
16. Cart, checkout, and return/status pages remain noindex.
17. All four return states render without "order confirmed", fake order numbers, or "order storage".
18. No tax, shipping, delivery estimate, rating, review, scarcity, or fake trust claim is introduced.
19. No live text uses the low-contrast ink-faint token on white in cart/checkout/status.

If the repo has Playwright/visual coverage for storefront flows, add the smallest
useful coverage for cart, checkout country, canceled return, and success copy.


VALIDATION

Run the repo-required checks from AGENTS.md and the wiki.

At minimum:
- relevant unit/component tests
- typecheck
- lint
- format check
- full verification command if available

Report exact commands and results.
If any required check cannot run, report the blocker honestly.


ACCEPTANCE CRITERIA

- Buyer sees a calmer, more complete cart/checkout shell without fake commerce promises.
- Add to Cart is informative but not disruptive.
- Cart and checkout show buyer-facing variant information and unit prices.
- Checkout asks for country instead of silently defaulting to Philippines.
- Returning from canceled Stripe checkout is acknowledged clearly.
- Paid status confirms only payment, not an order.
- Existing server validation, Stripe handoff, noindex, cart identity, and no-SKU rules are preserved.
- No unrelated PDP, supplier, CJ, taxonomy, portal, or order-backend work is mixed into this change.

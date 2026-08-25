# Sals3 Ecommerce

Next.js + TypeScript ecommerce rebuild for Sals3.

## Required Reading

Before code changes, read:

- `AGENTS.md`
- `docs/Wiki/wiki/hot.md`
- `docs/Wiki/wiki/agent-operating-contract.md`
- `docs/Wiki/wiki/nextjs-component-security-code-rules.md`
- `docs/Wiki/wiki/project-structure-installation-and-runbook.md`

## Project Structure

```text
sals3-ecommerce/
├── .github/workflows/verify.yml
├── docs/                    # Obsidian vault and project documentation
│   ├── Raw/                 # Source/reference assets
│   └── Wiki/wiki/           # Canonical operating notes
├── e2e/                     # Playwright tests
├── public/                  # Static public assets
├── scripts/                 # Local automation scripts
├── src/app/                 # Next.js App Router source
├── src/components/          # UI components (auth, layout, catalog, ...)
├── src/lib/                 # Schemas, constants, and pure helpers
├── src/services/            # API service wrappers and tests
├── test/                    # Shared test setup/helpers
├── AGENTS.md                # Mandatory agent rules
├── package.json             # npm scripts and dependencies
└── package-lock.json        # npm lockfile
```

Do not put application code in `docs/`. Do not put vault notes in `src/`.

## API Services

The storefront service layer lives in `src/services/storefront/` and is
re-exported from `src/services/products.ts`, so every existing
`@/services/products` import keeps working:

- `schemas.ts` — the Zod contract for the list feed and the richer product
  detail.
- `client.ts` — URL building, the shared bearer token, one request helper, and
  the per-call-site cache policy.
- `products.ts` — `fetchProducts`, `fetchProductCategories`,
  `fetchProductBySlug`, `fetchProductsByCategory`.
- `mappers.ts` — payload → view model, including the image host allow-list it
  reads from `src/lib/cj-image-hosts.ts`.

**The upstream is now the Sals3 catalogue database, not a live supplier feed.**
`sals3-portal` used to answer these endpoints by calling CJdropshipping's
`/product/list` on every uncached request; as of 2026-08-13 it reads published
`products` / `product_offers` / `product_media_sources` rows and nothing else.
Two consequences here: prices are **USD** (ADR-003 phase 1), and the storefront
shows only what a seller has actually published in the Seller Center.

`currency` is the one **required** new field. Every other field added with the
richer contract is optional, so the portal can ship a field before this app
reads it — but a missing currency would render a number with the wrong symbol,
which is the only failure mode here that misrepresents money, so the parse
fails instead.

Bad rows are salvaged, not fatal. Real CJ `title`s and `imageAlt`s routinely
exceed 120/160 characters — confirmed live, this failed validation for an
entire 14-item page over one overlong row — so both are truncated to their
display length. The same idea applies one level up: a malformed variant, image,
spec, or description block is dropped without failing the product, and a
product does not fail the page.

`fetchProductBySlug()` calls `GET /api/storefront/products/<slug>` and returns
`undefined` **only** for a genuine absence (invalid slug shape, or a 404).
Everything else throws, which is what lets the PDP tell "no such product" from
"the catalogue is unreachable". That read is cached
(`next: { revalidate: 300, tags: [...] }`); the list feed deliberately stays
`no-store`, because the home page falls back to placeholder products and a
cacheable feed would let a token-less `next build` bake those placeholders into
static output.

`test/fixtures/storefront-product-detail.json` is the committed cross-repository
contract fixture: one maximal payload, parsed by
`src/services/storefront/schemas.test.ts`. `sals3-portal` commits the same file
and asserts its serializer produces it, so contract drift fails a test in
whichever repository moved.

The storefront API still has no category-filter route. `fetchProductsByCategory()`
(used by the PDP's related-products section) pages through `for-you` and `deals`
and matches by `category` client-side as a stopgap, hard-capped at 2 pages per
section (`MAX_CLIENT_SIDE_SEARCH_PAGES`). Replace it with a direct
category-filter endpoint once the portal adds one. It also de-duplicates by
product `id` first, because the same product can legitimately appear in both
sections and a duplicate `id` in the related grid throws React's
"Encountered two children with the same key". The PDP wraps this related-products
read in a 30-second Next cache so variant URLs and nearby product views do not
repeat the four-list scan; the main product detail read remains live.

Required `.env.local` values:

```text
SALS3_PORTAL_URL=http://localhost:3001
SALS3_PORTAL_API_URL=http://localhost:3001
SALS3_STOREFRONT_API_TOKEN=<same value as sals3-portal>
```

The same protected Portal connection also backs checkout freight quotes:
`POST /api/storefront/checkout/freight-quotes`. `sals3-ecommerce` sends only
cart lines and the completed delivery address. CJ credentials remain in
`sals3-portal` supplier secrets/Vercel env; do not add CJ keys to this app.

## Checkout and Stripe

**Checkout requires a signed-in buyer.** The `(flow)` layout reads the session
server-side before any step renders, so all three checkout routes are covered; a signed-out visitor is redirected to `/login?next=checkout`
and lands back on `/checkout` once signed in — by password or by Google. The
cart survives the hop by itself (it lives in `localStorage`). Both checkout
Server Actions re-check the session independently, because a Server Action is a
public POST endpoint whose id ships in the client bundle, so the page redirect
is a UI gate only. See [Post-login redirects](#post-login-redirects).

Two consequences worth knowing before filing a bug: a signed-out visitor with an
empty cart sees the login screen rather than "add an item before checkout"
(sign-in is the earlier gate, deliberately), and `/checkout` is unreachable in
local development without Firebase Admin credentials — `GOOGLE_APPLICATION_CREDENTIALS`
or the `FIREBASE_*` trio in `.env.local`.

`/cart` sends buyers to `/checkout`. Checkout is **three routes**, grouped under
`src/app/checkout/(flow)/`:

| Route                | Step           | What it does                                                                                                                                                                                                          |
| -------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/checkout`          | 01 Information | Contact and delivery address. "Continue to delivery" validates, fetches CJ freight options from the protected Portal quote endpoint, and navigates only on success.                                                   |
| `/checkout/delivery` | 02 Delivery    | "Ship to" recap (Edit returns to step 1) and one courier choice per fulfillment package, the first option per package pre-selected. "Go to payment" creates the Portal intent and the Stripe session, then navigates. |
| `/checkout/payment`  | 03 Payment     | Stripe Embedded Checkout, already mounted on arrival. No submit button — the work happened on the delivery step.                                                                                                      |

The `(flow)` route group exists so `/checkout/success` stays outside it: the
receipt is not a step, has no stepper or order summary, and is Stripe's
`return_url`.

**Flow state lives in the layout, not in a page.** `CheckoutFlowProvider` is
mounted from `(flow)/layout.tsx`, and Next keeps a layout mounted while the
buyer moves between its child routes — that is what carries the address, the
quote, and the client secret across the steps. It does not survive a reload, by
choice: the alternative was persisting a name, phone, email, and street address
into web storage. A step entered without the state it needs redirects to
`/checkout`.

The order summary sidebar renders on information and delivery, so items and
shipping cost stay visible while the buyer is still choosing.

**Payment renders Stripe's embedded form and nothing else.** No sidebar, no
wrapper card, no totals panel. The form draws its own card, its own itemised
list, its own shipping row, and its own total, so anything of ours beside it was
a second copy of the same numbers competing to be believed — and a wrapper cost
the form width to say nothing new. One consequence worth knowing: the page shows
no amount until Stripe finishes loading, because Stripe is now the only thing
that states it.

**Duplicate-session guard.** Separate routes hand the buyer a Back button.
`useCheckout` records a signature of the address plus the selected couriers when
it creates a Stripe session, and reuses that session while the signature is
unchanged — so bouncing delivery↔payment does not mint duplicate Portal intents
or burn CJ freight quota. Editing the address or changing a courier clears the
prepared session, because it priced the previous choice.

### When a quote fails

`src/lib/checkout/failure-log.ts` classifies the failure and writes one
structured line — step, reason, upstream status, error name. No address, email,
phone, or cart: rule 35, and none of it is needed to answer "which step failed
against which upstream". Grep Vercel logs for `[checkout] step failed`.

It exists because a real report was undiagnosable. A buyer saw "Delivery options
are unavailable. Try again in a moment." and the logs for that minute held two
`λ POST /checkout` lines and nothing else — the quote path had no logging, and
both catch branches returned the same sentence.

Two reasons, two sentences, because only one of them is worth retrying:

| Reason        | When                                                     | Buyer sees                                                                                                                                                                                                                  |
| ------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `unshippable` | Portal 422 — no offer for a cart item can ship there     | The portal's own sentence, or "An item in your cart cannot be delivered to this address. Remove it, or use a different address." **No "try again"** — retrying cannot change it, and each attempt spends rate-limit budget. |
| `upstream`    | Any other status, a schema mismatch, a transport failure | "Delivery options are unavailable. Try again in a moment."                                                                                                                                                                  |

A 422 is a fact about the catalogue, not a hiccup: the portal raises it when no
offer satisfies its dropship conditions (published, `RESOLVED` price,
`AVAILABLE`, `ACTIVE` binding on a `CONNECTED` CJ connection). Worth knowing
that a product can be publishable and purchasable on the storefront while being
unquotable — a buyer then discovers it only after entering a full address.

Every quote arrives with the first courier CJ returns already selected for each
package, so "Go to payment" is live on arrival; the buyer can still pick any
other option. Editing any address field clears the quote, so returning to
delivery re-quotes; going back without editing reuses the live quote and keeps
the selection (a "Refresh options" button re-quotes on demand). The server re-fetches each
product and re-quotes the selected freight from the Sals3 Portal storefront API
before creating a Stripe Embedded Checkout Session. Browser cart prices and
browser freight prices are never trusted for payment.

Checkout address entry is country-aware for the currently enabled CJ
destinations. Philippines starts phone numbers with `+639`; Australia starts
with `+614`. State/region and city are native dropdowns sourced from
`src/lib/checkout/locations.ts`, and city options depend on the chosen
state/region. Changing country resets phone, state/region, city, and any
previous freight quote so the next Portal quote receives a country-matched
address (`country`, `postalCode`, `region`, `city`, `phone`) without this app
calling CJ directly.

Required Stripe values in `.env.local` or host secrets:

```text
NEXT_PUBLIC_SITE_URL=http://localhost:3000
SALS3_ECOMMERCE_BASE_URL=http://localhost:3000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=<pk_... publishable key>
STRIPE_SECRET_KEY=<test or restricted secret key>
STRIPE_WEBHOOK_SECRET=<Stripe webhook signing secret>
STRIPE_PAYMENT_METHOD_CONFIGURATION_ID=<pmc_... config for card + eligible bank debit>
```

Use a Stripe restricted key (`rk_...`) instead of `sk_...` when possible. Never
commit Stripe keys. The checkout integration mounts Stripe Embedded Checkout
with `@stripe/react-stripe-js`, creates sessions with `ui_mode:
embedded_page`, returns `{ clientSecret, sessionId }` to the browser, uses
dynamic payment methods, and passes `STRIPE_PAYMENT_METHOD_CONFIGURATION_ID`;
it deliberately does not pass `payment_method_types` or `automatic_tax`.
Cards work in the current USD flow. Bank debit appears only when Stripe says
the session currency, buyer details, account, and payment method configuration
are eligible. AU BECS requires an AUD cart; this app does not convert USD to
AUD.

Selected CJ freight is added to Stripe as a separate line item named
`Shipping - <CJ logistics name>`. A compact, non-sensitive freight snapshot is
stored in Stripe Checkout Session and PaymentIntent metadata: selected option
IDs, channel IDs, price, days, package count, destination country, and quote
timestamp.

Before creating Stripe payment, ecommerce creates an immutable Portal checkout
intent that owns the cart, address, freight, and supplier snapshot. The Stripe
Session uses that intent id as `client_reference_id`. `/checkout/success`
verifies the Stripe Session server-side before showing the payment status.

### The receipt on `/checkout/success`

The page renders the purchased items, the shipping address, and the selected
delivery option from **one expanded Stripe retrieve** — `line_items`,
`line_items.data.price.product`, and `payment_intent`. Nothing is read from the
browser's cart, which by then may already be cleared, and nothing is read from
the Portal order: the `checkout.session.completed` webhook is asynchronous and
usually has not landed when the buyer is redirected back, so reading it here
would race a write. `src/services/checkout/receipt.ts` maps the session to a
display-only DTO; it tells the freight line from the product lines using the
`sals3_line_count` metadata rather than matching the `Shipping - ` name, so a
product legitimately called "Shipping Container" is not mistaken for freight.

**The cart empties here, and only here.** Those lines are an order now, so
`CheckoutCartCleanup` clears the `localStorage` cart when a receipt renders.
Two rules keep that from destroying data:

- **Only alongside a receipt.** The failure branches — "Checkout not completed",
  "Checkout not verified" — render without it, because a buyer whose payment was
  declined needs their cart to retry with.
- **Once per Stripe session.** The receipt is a page buyers return to (Back after
  shopping on, a link from history, a second tab). Clearing on every render would
  wipe a cart filled _after_ the purchase. Cleared session ids are recorded under
  `sals3-cleared-checkouts-v1`, newest first, capped at ten.

**The page is gated twice.** It requires a signed-in buyer, and it requires the
Stripe session's customer email to match that account — a session id travels in
the URL, into browser history and anything pasted, and it must not be enough to
read a stranger's name, phone, and street address. A mismatch returns the same
"Checkout not verified" wording as an unknown id, so an unauthorised reader
cannot learn whether the id exists.

Known limitation: the buyer types the contact email during checkout, so
ordering with an address that differs from the account email locks the buyer out
of their own receipt. The durable fix is stamping the verified uid onto the
checkout intent; until then a mismatch is treated as "not yours".
`/api/stripe/webhook` verifies Stripe signatures; on paid
`checkout.session.completed` events it calls Portal's protected accept-order
endpoint with the Stripe event id as the idempotency key. The Sals3 order
database, CJ credentials, queue, and supplier fulfillment live in
`sals3-portal`, not this app.

## Buyer orders (`/orders`)

A buyer's own order list and one order in full. Two routes, both signed-in only
and both `noindex`:

| Route                   | What it is                                                                      |
| ----------------------- | ------------------------------------------------------------------------------- |
| `/orders`               | The list: lanes, search, date range, status, paging — all of it in the URL.     |
| `/orders/[orderNumber]` | One order: packages, tracking events, payment, destination, lifecycle, actions. |

### The data is the portal's buyer orders API

The portal serves `GET /api/storefront/orders` and
`GET /api/storefront/orders/{orderNumber}` (shipped 2026-08-19), read through
`src/services/storefront/orders.ts` — zod-parsed at the boundary like the
product feed — and mapped in `src/lib/orders/from-api.ts` behind one seam:

```text
src/lib/orders/read.ts     listBuyerOrders(email) / readBuyerOrder(email, number)
```

Both endpoints are server-to-server: the shared bearer token authenticates the
storefront, and the **session-verified** buyer email travels in the
`X-Buyer-Email` header — a header, not a query parameter, so the address stays
out of URLs and access logs. Nothing request-supplied may ever be put in that
header; it is the authorisation.

There is **no fallback**: a failed portal read surfaces the
`src/app/orders/error.tsx` boundary, never stale or fixture data.
`src/lib/orders/fixtures.ts` remains for tests only. `from-api.ts` is the one
place money arithmetic happens (line total = unit × quantity, subtotal = Σ
lines), on the server, and `Total charged` renders the portal's
`amountTotalMinor` — what Stripe actually charged — rather than a
recomputation. Status words come from `src/lib/orders/status-copy.ts`, which
maps all 21 lifecycle states to a label, a tone and two sentences; a package
the status sync has not stamped yet falls back to a mapping of the fulfillment
worker's own status, so a just-paid order reads "Being prepared" rather than
nothing.

### Ownership, not just authentication

Both functions take the **verified session email** first and the order number
second, and a detail page resolves a number only within the list that session
owns. An order belonging to somebody else takes the same path as one that does
not exist — `notFound()`, with wording that never says "not yours" — because
whether an order number exists is not something an unauthorised reader should
learn by trying. A signed-out visitor is redirected with
`withPostLoginKey(AUTH_LINKS.signIn, 'orders')`, the same posture
`/checkout/success` takes with a Stripe session id. Both routes are in
`NO_STORE_ROUTES`: they render a name, an address, a phone number and a
purchase history.

### Lanes and status vocabulary

`src/lib/orders/contracts.ts` mirrors the portal's 21 `PARCEL_LIFECYCLE_STATES`
(ADR-004 §2). The two repositories share no package, so the list is mirrored
rather than imported and a test pins it. Buyer lanes are **not** the portal's
lanes — a seller's queues are not a buyer's questions:

| Lane                | Counts? |
| ------------------- | ------- |
| All                 | no      |
| To pay              | no      |
| To ship             | yes     |
| Shipping            | yes     |
| Completed           | yes     |
| Cancelled & refunds | yes     |

A count is a claim that something is waiting, so `All` and `To pay` carry none.
There is no buyer "Needs attention" lane: the four exception states surface as a
red-edged card inside the lane the order already sits in, plus one page notice.

### Rules this surface holds

- The grouping unit is the **package**, never a store or a supplier. No supplier
  name, connection name or `S3V-` hash appears in any buyer-facing string —
  carrier name only.
- Reviews are the one exception to "no ratings on a buyer surface", and they are
  the buyer's **own** — see [Rating and reviewing a delivered
  item](#rating-and-reviewing-a-delivered-item). No aggregate rating, no star on
  a card, and no supplier-platform review count appears anywhere on this
  surface.
- Every status renders a **label and a sentence**. Never a bare pill.
- A blocked action stays visible and disabled with **the reason as its label** —
  "Cannot be cancelled — one package has shipped", "Locked while the payment
  settles". An action that vanishes reads as a missing feature. `Cancel order`,
  `Request return` and `Buy again` have no backing path in this repository, and
  `Track package` has no confirmed carrier deep link, so all four render blocked
  rather than pointing at nothing.
- A `TRACKING_CONFLICT` prints both sources with their timestamps and does not
  pick a winner.
- `ink-faint` (#8A9196, 3.2:1 on white) is borders and placeholders only. A test
  walks the feature's own source to keep it that way.

### Layout

One full-width **ledger** card per order — header strip, status sentence,
per-package bands, footer actions — chosen from the two candidates in the design
handoff on 2026-08-19. The other candidate was not built. Mobile is the same
information in one column with 44px actions, not a reduced feature set.

### What ships to the browser

`OrdersToolbar` (the filter form, which routes instead of submitting so defaults
stay out of the URL), `CopyOrderNumber`, `RateReviewButton` and
`OrdersFlashToast`. Lanes, filter chips and paging are `next/link` anchors, so
navigation costs no JavaScript.

The review dialog is **not** in that bundle: `RateReviewButton` pulls
`ReviewModalForm` through `next/dynamic` (`ssr: false`), so a list of twelve
orders downloads the form once, on the first press, and never at all on a list
where nothing is reviewable.

Every one of them is registered by hand in `CLIENT_ENTRY_POINTS` in
`test/client-bundle-boundary.test.ts` — that array has no auto-discovery, and
the dynamically imported half is listed separately because the walk cannot
follow a specifier inside a call.

### Rating and reviewing a delivered item

Two ways in, one write path:

| Surface                                 | Control                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `/orders`, order card footer            | One `Rate & review` button per order, opening a modal over every open line |
| `/orders/[orderNumber]`, per line       | `OrderLineReviewControl` — four states, linking to the route form          |
| `/orders/[orderNumber]/review/[lineId]` | The route form. The only path that works with JavaScript off               |

The modal (owner decision 2026-08-25, from the Shopee "Rate Product" pattern):
press → dialog with a photo, a required 1–5 star rating and an optional 1,000
character body per item, plus one "show my name" tick → `Submit` → redirect to
`/orders?lane=completed&posted=n` → the same success toast the cart shows.

- **The draft lives in `RateReviewButton`, not the dialog**, so Escape and a
  backdrop tap cost the buyer nothing and reopening restores what they typed.
  That was the objection that originally kept this form on a route of its own.
- **The count crosses the redirect in the URL**, not in `sessionStorage`:
  `parsePostedCount` allow-lists it to an integer inside the submit cap, and
  `OrdersFlashToast` strips the parameter with `history.replaceState` once shown
  so a refresh does not re-announce it.
- **Eligibility is never decided here.** `line.reviewable` is the portal's answer
  (the line's own parcel `DELIVERED`, inside the window, not already reviewed);
  `reviewableLinesOf` only reads it, and a written review wins over a stale flag.
  The portal re-decides in a single `WHERE` on submit and answers `404` for
  anything it refuses — a hand-made payload naming somebody else's line reaches
  the action and is refused there, not by a hidden button.
- **The wire carries a choice, not a name.** `attribution` is
  `named`/`anonymous`; the published string is derived portal-side from the
  order's own checkout ship-to. There is no name field and no email field on
  either action.
- **`submitOrderReviewsAction` posts one order's lines in one request**, capped
  at `MAX_REVIEW_ITEMS` before the fan-out starts. Partial success has its own
  outcome: the dialog stays open, says which refusal happened, and refreshes the
  list underneath rather than claiming success or inviting a duplicate attempt.
- **Not exercised end to end locally.** There is no reachable `sals3-portal`
  session on a dev machine, so the e2e suite can only reach the signed-out guard
  — the same limitation the rest of this surface has. The portal's
  `Reviews Migrate Product Reviews` workflow also still has to run before any
  review row can exist in production.

### Details as ordered

Owner decision 2026-08-21: an order shows the **listing as it was bought**. A
seller may rename a product, replace every photo, rewrite the description and
reorder its option axes — they are entitled to, and it applies to what they sell
next. It must not reach back into an order someone already placed.

The portal freezes the record onto the order line at intent creation and serves
it as an optional `listing` per line (`sals3-portal` PRs #166/#167). Here:

- `services/storefront/orders.ts` parses it with `.catch(undefined)` and
  `salvagedArray`, reusing the product feed's **own** `DescriptionBlockSchema`
  and `ProductSpecificationSchema`. One schema, because the frozen document is
  the same document format the product page renders — a second opinion about what
  a description is would drift, and the copy that drifted would be this one.
- `lib/orders/from-api.ts` re-checks every frozen image address against the host
  allow-list. The portal checked it on the way in; that is not a reason to skip
  the check on an address this deployment is about to fetch. Description blocks
  go through `toDescriptionBlocks`, the product page's own mapper, so an image
  block inside a frozen description gets exactly the same per-block gate as a
  live one.
- The line's `variant` now prefers the frozen buyer-facing axes
  (`Colour: Army Green · Size: L`) over `variantLabel`, which is the supplier's
  own concatenated token (`army green-L`). They were never the same string, and
  the buyer chose the former.
- `OrderedListingPanel` renders it as a native `<details>`, closed. An order page
  is a statement — `unit × qty = total`, where the parcel is, who it is going to
  — and expanding a product page under every line would bury the facts a worried
  buyer opened the page for. Native `<details>` also means no client JavaScript
  on a page that needs none, and it stays in `CLIENT_ENTRY_POINTS`-free
  server-rendered territory.
- Copy is deliberately "as ordered" and "saved when you placed this order", never
  "current". The panel's whole value is that it may now differ from the live
  product page; wording that implied otherwise would make a real mismatch look
  like a bug in the order.

`DescriptionBlockList` was extracted from `ProductDescription` for this — the
blocks without the product page's heading and spacing — so both surfaces render
one allow-listed union through one renderer. There is still no `html` block and
no `dangerouslySetInnerHTML` on either path.

An order accepted before the portal froze this has no `listing`, and a snapshot
this deployment cannot parse is dropped: both fall back to `title`,
`variantLabel` and `imageUrl`, which the portal freezes on the line regardless.
Neither case may cost a buyer their receipt.

## Authentication

Two ways in: Google, and email with a password. Both end at the same 24-hour
`httpOnly` `sals3_session` cookie. Guest browsing and the local cart are
unaffected; `/checkout` and `/orders` are the gated surfaces (see
[Checkout and Stripe](#checkout-and-stripe) and
[Buyer orders](#buyer-orders-orders)).

### Reading the session on the server

`src/lib/auth/dal.ts` is the single place server code asks who is signed in.
Two readers, differing only in cost:

| Function                             | `checkRevoked` | Use                                                                                                                                                                                   |
| ------------------------------------ | -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getBuyerSession()`                  | `false`        | Page-render gates. Local verify, no network. Memoized with React `cache` per render pass. Returns the verified email as well, which `/checkout/success` uses for its ownership check. |
| `getRevocationCheckedBuyerSession()` | `true`         | Server Actions that spend money or CJ quota. One Firebase call per invocation.                                                                                                        |

The split is deliberate. The cheap reader means a session revoked mid-life
(signed out everywhere, password changed, account disabled) can still _render_
`/checkout` until the cookie expires — at most 24 hours. It cannot transact:
every action that costs anything uses the revocation-checked reader. Both fail
closed, and both return `null` before touching `firebase-admin` when there is
no cookie at all, which is why the signed-out redirect is testable end to end
with no Firebase credentials present.

### Post-login redirects

A guarded route sends visitors to `/login?next=<key>`. `next` is an **opaque
allow-listed key**, never a path and never a URL: `src/lib/auth/post-login-redirect.ts`
maps `checkout` to `/checkout` and `orders` to `/orders`, and resolves
everything else — including `/checkout`, `//evil.example`, and
`https://evil.example` — to the home page.
Add a key there when a new route starts gating itself. The key travels between
`/login` and `/signup` so a buyer who needs an account first still lands where
they were headed.

### Email and password

The password is checked **on the server**, not in the browser.
`POST /api/auth/login` verifies the same origin, throttles per address,
re-validates the credential with the very same Zod schema the form used
(`src/lib/auth/login-schema.ts`), checks the CSRF double submit, throttles per
account, then calls the Firebase Identity Toolkit
`accounts:signInWithPassword` REST endpoint. It verifies the returned ID token
and mints the session cookie.

Every credential failure — unknown address, wrong password, disabled account —
returns one byte-identical `401 {"error":"invalid_credentials"}`, so the form
cannot be used to discover which addresses have accounts. Response bodies carry
a fixed error code and never a sentence; the human copy lives client-side in
`src/lib/auth/login-status.ts`.

`POST /api/auth/signup` creates the account through `accounts:signUp`, records
the display name, and mints the same session cookie, so the form redirects
straight on with the visitor already signed in — to the home page, or to the
route named by `?next=` (see [Post-login redirects](#post-login-redirects)).

**Email address verification is deliberately out of scope.** No verification
mail is sent, and sign-in does not inspect the `email_verified` claim. Two
consequences to know about:

- An address can be registered by someone who does not own it.
- Signup is the one place that does not mirror sign-in's generic posture. An
  address that is already registered returns
  `409 {"error":"email_unavailable"}` and the form says so. That discloses
  membership, and it is forced rather than chosen: success now means "you are
  signed in", which cannot be faked for an account somebody else owns. Sign-in
  stays indistinguishable, and the signup throttle caps the harvest rate.

Attempt throttling (`src/lib/auth/rate-limit.ts`) is **in-memory and
per-process**: per-IP and per-account buckets with lazy TTL eviction. On a
scale-out host the real ceiling is `instances × limit` and a cold start resets
it, so treat it as best-effort throttling rather than a rate-limit control.
Firebase's own `TOO_MANY_ATTEMPTS_TRY_LATER` is the durable backstop.

### Google

The browser
uses the Firebase Web SDK only long enough to complete the Google popup and get
a Firebase ID token. The token is posted to `POST /api/auth/session`, where
Firebase Admin verifies a recent sign-in and sets a 24-hour `httpOnly`
`sals3_session` cookie. Client Firebase persistence is `inMemoryPersistence`
and is cleared after the server cookie exchange. Signed-in header
personalization reads only the verified server session and exposes at most a
sanitized full name (`GET /api/auth/session` returns `fullName`, capped at 60
characters with control characters stripped and whitespace collapsed; no email,
uid, provider, or custom claim ever crosses to the client). The account menu
signs out with the same CSRF-protected cookie flow and clears only the server
session. The top `Log In` and `Sign Up` links render only after the verified
server session reports signed out, and the full-name account menu that replaces
them renders only when that same session reports signed in.

Required Firebase values in `.env.local`:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=<Firebase Web App apiKey>
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sals3-b82b6.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sals3-b82b6
NEXT_PUBLIC_FIREBASE_APP_ID=<Firebase Web App appId>
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/firebase-service-account.json
```

If a service account file path is not available, set these server-only secrets
instead:

```text
FIREBASE_PROJECT_ID=sals3-b82b6
FIREBASE_CLIENT_EMAIL=<service account client_email>
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Optional, and only relevant to email/password:

```text
FIREBASE_WEB_API_KEY=<Web API key restricted by API, not by referrer>
```

The server-side Identity Toolkit calls fall back to
`NEXT_PUBLIC_FIREBASE_API_KEY` when this is unset, which is fine locally. Set
it in production **if the browser key is restricted by HTTP referrer**:
server-to-server calls send no `Referer`, so a referrer-restricted key returns
403 — and it will work locally while failing in production. Point this at a
second key with an API restriction (Identity Toolkit) instead. A Web API key is
not a secret either way; it is already in the client bundle.

Firebase Console setup for `sals3-b82b6`, none of which is code:

1. Authentication > Sign-in method > enable **Google**.
2. Authentication > Sign-in method > enable **Email/Password**. Until this is
   on, both routes return the generic outage notice and the server logs
   `[auth] identity toolkit unavailable { code: 'PASSWORD_LOGIN_DISABLED' }`.
3. Register a Web App if needed, and add authorized domains such as `localhost`
   and the production host without protocol or port.

Firebase's **Email enumeration protection** setting no longer changes what a
visitor sees — sign-in collapses every credential failure itself, and signup
discloses a taken address by design — but leave it on regardless.

Do not commit service account JSON files or `.env.local`.

`firebase-admin` is pinned to `13.6.0` because `14.2.0` pulled a
`jwks-rsa`/`jose` combination that crashed the Vercel Node runtime while
loading `firebase-admin/auth`.

## Klaviyo Analytics

Sals3 loads Klaviyo only after the visitor accepts the analytics consent banner.
The decision is stored in `localStorage` under `sals3_klaviyo_consent_v1`.
Declining keeps the Klaviyo script unloaded and makes every local tracking
helper no-op.

Required Klaviyo values:

```text
NEXT_PUBLIC_KLAVIYO_SITE_ID=RuXpVU
KLAVIYO_PRIVATE_API_KEY=<server-only private key with profiles:write>
KLAVIYO_API_REVISION=2026-07-15
```

`NEXT_PUBLIC_KLAVIYO_SITE_ID` is the safe public Site ID used by
`src/components/klaviyo/KlaviyoLoader.tsx`. `KLAVIYO_PRIVATE_API_KEY` must stay
server-only; it is used only by `POST /api/klaviyo/profile-sync` to create or
update a Klaviyo profile after the visitor is signed in and has accepted
analytics.

Tracked v1 events are limited to behavior the app really supports today:
`Viewed Product`, Klaviyo's recently viewed item payload, `Added to Cart`,
`Buy Now Clicked`, `Cart Viewed`, `Cart Quantity Changed`, and
`Cart Item Removed`. Purchase, paid order, fulfilled, canceled, and refunded
events are intentionally deferred because Sals3 order persistence and payment
reconciliation do not exist yet.

Profile enrichment sends verified Firebase profile fields when available
(email, phone, display-name-derived first/last name, photo URL, Firebase UID as
a Sals3 custom property, provider IDs, email-verified state, and account
timestamps) plus bounded browser context (locale, timezone, viewport/screen
size, current path, referrer, UTM values, analytics-consent timestamp).
Passwords, session cookies, CSRF tokens, private keys, payment data, hidden
fingerprinting, precise geolocation, and raw IP collection are not sent.

Analytics consent is not email or SMS marketing subscription consent. This
integration does not add profiles to lists and does not subscribe anybody to
campaigns.

## Install

Use npm. Do not switch package managers unless the owner approves.

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm install
```

## Run Locally

```bash
cd /Users/MacBook/Documents/Sals3/sals3-ecommerce
npm run dev
```

Open:

```text
http://localhost:3000
```

## Build and Start

```bash
npm run build
npm run start
```

## Tests and Verification

```bash
npm run lint
npm run format:check
npm run typecheck:clean
npm run build
npm run test:run
npm run test:e2e
npm audit --audit-level=high
```

Full shortcut:

```bash
npm run verify
npm audit --audit-level=high
```

## Package Installation

Runtime dependency:

```bash
npm install <package-name>
```

Dev-only dependency:

```bash
npm install -D <package-name>
```

After package changes:

```bash
npm audit --audit-level=high
npm run verify
```

Before adding a package, prefer existing platform features or current dependencies. Avoid heavy, duplicate, unmaintained, or paid-service packages unless approved.

## Machine and AI Discovery

`src/app/robots.ts` allows all crawlers plus explicitly lists `GPTBot`,
`PerplexityBot`, `ClaudeBot`, and `OAI-SearchBot`. When `NEXT_PUBLIC_SITE_URL`
is set, it also emits a `sitemap` field pointing to `/sitemap.xml` — omitted
when the env var is unset so no domain is guessed.

`src/app/llms.txt/route.ts` serves a daily-revalidated, plain-text `/llms.txt`
identifying the site by name, description, and a one-sentence mission statement.
It does not list a product catalog — the current product data
(`src/services/products.ts`) expects the Sals3 Portal storefront feed. The home
page still falls back to local placeholder products when the portal is not
configured or unavailable, so crawler-facing catalog claims stay limited until
real persistent catalogue data exists.

`OrganizationSchema` (`src/components/schema/OrganizationSchema.tsx`) renders a
global `Organization` JSON-LD block in `src/app/layout.tsx`. `WebSiteSchema`
(`src/components/schema/WebSiteSchema.tsx`) renders a `WebSite` JSON-LD block
on the home page, including a forward-looking `SearchAction` pointing to
`/search?q={search_term_string}` — replace with the real search URL once that
route ships. Both schemas emit `name` always; `url`, `logo`, and `potentialAction`
activate automatically once `NEXT_PUBLIC_SITE_URL` is set — no domain is
hardcoded or guessed (see `src/lib/site.ts`).

`src/app/page.tsx` exports `generateMetadata()` with a per-route `<title>`,
`<meta name="description">`, Open Graph tags, Twitter Card tags, and canonical
link — all URL fields gated on `NEXT_PUBLIC_SITE_URL`.

`src/app/p/[id]/page.tsx` also exports `generateMetadata()` (per-product
`<title>`, description, Open Graph, Twitter Card, canonical link — all gated on
`NEXT_PUBLIC_SITE_URL`). It intentionally does **not** emit `Product` /
`Offer` / `AggregateRating` JSON-LD yet: the product data behind it is still
the external DummyJSON placeholder feed, not a Sals3-owned catalog, and
shipping fabricated structured data risks a Google manual action. That piece
stays parked until a real catalog exists.

See
[`sals3-geo-aeo-seo-strategy-proposal`](docs/Wiki/wiki/sals3-geo-aeo-seo-strategy-proposal.md)
for the source strategy and what's still parked (Product/Offer/FAQPage JSON-LD,
`useOptimistic` cart) pending a real, Sals3-owned catalog and a cart route.

## PWA Icons and "Add to Home Screen"

`src/app/apple-icon.png` (180×180) is Next.js's App Router file convention for
the iOS `apple-touch-icon` — no manual `<link>` tag needed, Next.js emits it
automatically. `src/app/manifest.ts` (the equivalent `MetadataRoute.Manifest`
convention) does the same for Android/Chrome's installable-PWA icon and emits
the `<link rel="manifest">` tag; its `icons` array points at
`public/icon-192.png` and `public/icon-512.png` (Chrome's minimum sizes for an
installable icon). All three PNGs are generated from the same source Sals3
logo mark, resized, not separately designed — keep them in sync if the logo
changes. `theme_color`/`background_color` in the manifest reuse the approved
brand tokens (`--color-brand-600` `#0a5c8a`, `--color-surface` `#f6f7f8`).

## Home Page

`src/app/page.tsx` renders the marketplace landing page: header (logo,
full-width search, cart, and a signed-in-only `Orders` link styled to match
`Cart`; gradient at the top of the page, compact white once scrolled), a
full-bleed category band, an
Embla promo carousel, a portal-fed deals grid, and a paginated "For you" grid.
Promo carousel images live in `public/home-promos/` and slide metadata lives
in `src/lib/home-promo-slides.ts`. The carousel uses local, allow-listed static
assets, `next/image`, manual controls, dot buttons, and no autoplay. Those
slides are served at their committed size — see [Image loading](#image-loading)
— and the seven PNGs total 8.15 MB; re-encoding them to WebP (measured: 569 KB)
is deferred by owner decision, not an oversight.

The category band (`src/components/home/CategoryRow.tsx`) sits directly under
`SiteHeader`, outside `<main>`, so its white `border-y` band spans the full
viewport instead of the 1152px content column. It is fully server-rendered —
no client component, no scroll-chevron mechanics. Below the `md` breakpoint it
is a native horizontal touch-scroll row (`no-scrollbar` hides the browser
scrollbar); at `md` and up it becomes an equal-width grid
(`md:grid md:auto-cols-fr md:grid-flow-col`) that never overflows, so there is
nothing to scroll and no chevrons. Each tile (`CategoryRowItem.tsx`) is a 56px
`rounded-2xl` icon holder plus a 2-line-wrapping label — deliberately neutral
grey (`bg-surface-sunken`/`text-ink-muted`), not the brand colour, per the
build spec's "brand colour for actions only" rule; navigation is not an
action. Icon geometry is hand-authored inline SVG keyed by category id
(`src/components/home/category-icons.tsx`) — no icon library, since the real
storefront feed has no icon field. A category id with no mapped icon falls
back to the feed's real 2-letter `code`. `CategoryRowSkeleton.tsx` matches the
tile geometry exactly and is wired as a `<Suspense>` fallback around the
category row; it is structural rather than a real defer today, since
`homeCategories` resolves in the same `Promise.all` as the rest of the page's
data, same as every section here — a genuinely streamed category fetch would
need a page-wide rendering change beyond this component's scope, and this
repo's `page.test.tsx` (`renderWithCart(await Home())`, a plain client render
of an already-resolved tree) cannot execute a nested async Server Component to
test it if it were.

The category band, deals grid, and "For you" grid read live data through
`src/services/products.ts`. The category band builds internal `/c/<slug>`
links from validated CJ category slugs. The deals grid fetches 5 CJ products
ranked by supplier listing count when available. The "For you" grid uses the `?page=`
query string for pagination and fetches 14 products per page, so the 14 products
plus 1 sponsored card fill 15 desktop grid cells. If the portal or CJ product
API is unavailable or returns invalid data, the page shows the local placeholder
products and categories from `src/lib/home-placeholder-data.ts` with a fallback
status note. The deals fetch and the "for you" fetch are independent: a
failure fetching one (e.g. a "for you" page past the real catalogue's depth)
falls back to placeholder data for that section only, and does not discard
the other section's already-successful, unrelated result.
A visually-hidden `<h1>` (`sr-only`) provides a correct heading hierarchy for
crawlers and screen readers without altering the visual design.
Product images are rendered with `next/image` and limited to the allow-listed
CJ image hosts from the portal feed (see [Image loading](#image-loading)).
Money values follow the build spec's minor-unit convention
(`src/lib/money.ts`).

## Category Listing (`/c/[slug]`)

`src/app/c/[slug]/page.tsx` renders every published product filed under one of
the taxonomy's 21 main departments, with a left-side filter sidebar. It was
the one route every `/c/<slug>` link on the site (home category tiles, the
`/categories` list, the footer) pointed at while it did not exist; those links
are now real.

**Sidebar facets are limited to fields the card feed actually publishes.**
Category (a link list, not a filter — each entry navigates to that
department) and Price (five preset bands plus free-typed min/max, reading
`priceMinor`). **There is no buyer-rating filter, and no longer an
availability filter either** (owner decision, 2026-08-24 — the availability
checkboxes were removed after the page shipped). The rating omission is a
data-honesty call: the design this page was built from included one, but
`ratingLine` is deprecated on the storefront contract and no product on the
live feed carries a rating — a "4 stars & up" control with nothing behind it
would be a fabricated claim. `Buyer rating` instead appears in the sidebar's
"Not filterable yet" note alongside `Brand`, `Ships from`, and `Discount`,
each with the real reason it is absent (`src/lib/catalog/blocked-facets.ts`).
`AvailabilityKey`/`AVAILABILITY_LABELS` (`src/lib/catalog/availability.ts`)
still exist and are still real, evidence-backed data — they now drive only
the per-product availability line in list view (`ProductListRow.tsx`), not a
sidebar filter.

**All list state is the URL, not client state** — `src/lib/catalog/query.ts`
parses and builds it (`band`, `priceMin`, `priceMax`, `sort`, `view`, `page`,
`allCats`), the same allow-list-not-sanitize discipline
`src/lib/orders/query.ts` uses for `/orders`. Filtering, sorting, and paging
are pure functions in `src/lib/catalog/filter-products.ts`, run server-side in
`page.tsx`. The price radios and the sort `<select>`
(`src/components/catalog/CategoryFilterForm.tsx`, `SortSelect.tsx`) are the
only client components, and they navigate instantly on change inside a real
`<form method="get">` that still narrows the list with JavaScript off; grid/
list view and every filter chip's clear action are plain `next/link` anchors
needing no client JS at all. Below the `lg` breakpoint the sidebar collapses
behind a "Filters" button into a bottom sheet
(`src/components/catalog/MobileFilterSheet.tsx`) that renders the exact same
`CategoryFilterPanel` the desktop `<aside>` does, not a second filter set.

**Known limitation: the live product feed cannot be filtered by department
yet.** `fetchProductsByCategory` (`src/services/storefront/products.ts`) is a
pre-existing stopgap that matches on `Product.category`, but the portal's
`/api/storefront/categories` endpoint has been rolled up to the taxonomy's 21
L1 slugs (`electronics`, `home-garden`, …) while every live product's own
`category`/`categoryName` fields are still the CJ/Google-taxonomy **leaf**
category (e.g. `cat-ggl-212`, "Shirts & Tops") — confirmed against the live
`sals3-portal.vercel.app` API on 2026-08-24. No `/c/[slug]` page can match a
real product against any L1 slug until the portal maps a product's category
to its L1 department the same way the categories endpoint already does. Every
UI state on this page (filters, chips, counts, empty/filtered-empty panels,
pagination) is verified working against that real API; the panel correctly
shows "Nothing published in `<department>` yet" for every department today
because of this gap, not because of a bug in this page.

Three states beyond the normal grid/list: an unknown slug (not one of the 21
departments) is a real `404` via `notFound()` and its own
`src/app/c/[slug]/not-found.tsx`, not a soft 404; a valid, empty department
shows "Nothing published … yet"; a valid department whose products are all
excluded by the active filters shows "No product here matches all of those
filters" with per-filter "Remove" chips. `CategoryBreadcrumbSchema` emits
`BreadcrumbList` JSON-LD (gated on `NEXT_PUBLIC_SITE_URL`, unset in this repo
today) — safe now that `Home` → `All categories` → the category are all real,
linkable routes, unlike the PDP breadcrumb.

## Primary actions: gradient and loaders

Every primary call to action — the PDP's **Buy Now**, the cart's **Proceed to
Checkout**, **Continue to delivery**, and **Go to payment** — wears the one
`.bg-brand-gradient` utility, a 150deg run from `--color-brand-blue-900`
(`#002B53`) to `--color-brand-blue-500` (`#018CC9`). It previously ended on
`--color-teal-500`, which read as green on wide buttons and made the same action
look like two brands depending on where it sat. That token still exists and is
still used for availability and success marks; it just no longer appears in a
call to action.

**The Pay button on `/checkout/payment` is not ours and cannot be styled from
this repo.** It lives inside Stripe's Embedded Checkout iframe. Embedded
Checkout has no `appearance` API (that belongs to Payment Element), so its
colours come from **Stripe Dashboard → Settings → Branding**. Set the brand and
accent colours there to match `#002B53` / `#018CC9`; no code change here will
move it.

### Loaders

`Spinner` (`src/components/ui/Spinner.tsx`) is a decorative, `aria-hidden` ring
that inherits `currentColor`. `LoadingOverlay` is a full-screen curtain with a
live region.

| Action                          | Feedback                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------- |
| Buy Now                         | Spinner inside the button while the `/cart` navigation transition runs        |
| Continue to delivery            | Button spinner **and** a "Loading delivery options" curtain                   |
| Go to payment                   | Button spinner **and** a "Preparing payment" curtain                          |
| Arriving at `/checkout/payment` | "Loading payment" spinner behind the mount point until Stripe's iframe paints |

The curtains exist because those two clicks wait on real upstream work — a CJ
freight quote, then a Portal intent plus a Stripe session. Over that long a
disabled button reads as a dead click and the buyer clicks again, which on the
delivery step is how duplicate intents get minted. The curtain also blocks the
second click outright.

The payment spinner sits _behind_ the Stripe mount rather than being toggled by
a ready callback, because `EmbeddedCheckout` does not expose one — the iframe
simply covers it once painted, so there is no flag to get wrong and nothing left
spinning on a slow load.

`globals.css` already collapses every animation under `prefers-reduced-motion`,
so none of these spin for a visitor who asked for less motion.

## Global CSS and Tailwind cascade layers

Custom element styles in `src/app/globals.css` **must** live inside
`@layer base`. Tailwind v4 emits every utility inside `@layer utilities`, and
CSS gives unlayered declarations priority over layered ones regardless of
specificity — so a bare `a { color: … }` silently outranks `text-white` on every
anchor in the app.

That exact bug shipped: the cart's "Proceed to Checkout" and the checkout-success
button both rendered brand blue on brand blue, a 1:1 contrast ratio with the
label invisible, while `text-white` sat right there in the class list. jsdom does
not apply Tailwind, so a `toHaveClass('text-white')` unit assertion passes either
way. `e2e/cart.spec.ts` guards it in a real browser with `toHaveCSS('color', …)`;
add that kind of assertion when a colour matters, not a class assertion.

## Image loading

Nothing in this app goes through Vercel's `/_next/image` optimizer. `next.config.ts`
sets `images.loader: 'custom'` with `src/lib/images/cj-image-loader.ts`.

Why: the optimizer is metered, and once the account's Image Optimization
allowance ran out it answered every request with `402
OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED` — including `?url=%2Fsals3-logo.webp`,
a file this app serves itself — so every image in production broke at once
(2026-08-14). The portal hit the same failure a day earlier and fixed it the
same way.

The loader asks CJ's own CDN to do the resizing, which it does for free. For an
allow-listed CJ address it sets an Alibaba-OSS instruction,
`?x-oss-process=image/resize,w_<width>/format,webp/quality,q_<quality>`; the
requested `width` is the one `next/image` derived from the component's `sizes`,
so the whole responsive `srcSet` survives — the gallery's 80px thumbnails fetch
80px WebP files. Measured on a real product photo: 491,243 bytes original,
30,006 at `w_640`, 2,156 at `w_128`.

Any other address — a local `/public` path, any non-CJ host, plain `http:` — is
returned untouched. The loader never proxies and never invents a host, so it
cannot become an open image proxy. Local assets are therefore served at their
committed size; `public/home-promos/*.png` is 8.15 MB in total and is a known
outstanding item.

The allow-list itself lives in `src/lib/cj-image-hosts.ts`, a dependency-free
module because the loader is serialized into the client bundle. `next.config.ts`
`remotePatterns` and `getAllowedProductImageUrl` in
`src/services/storefront/mappers.ts` must stay in step with it; the enforcing
gate is the mapper, which drops an off-list address before a component sees it.

**Seller-uploaded photos (Cloudflare R2) join the allow-list via
`NEXT_PUBLIC_R2_IMAGE_BASE_URL` (2026-08-20).** The portal stores a seller's
own product photos in Cloudflare R2 and serves them from a public r2.dev
subdomain or custom domain; `src/lib/r2-image-host.ts` derives the allowed
hostname from that env var (dependency-free, same reasoning as
`cj-image-hosts.ts`), and the mapper accepts it alongside the CJ hosts. Unset
or malformed means seller uploads are simply dropped at the mapper — the env
var can widen the list only to exactly one host it names. R2 addresses pass
through the CJ loader untouched (R2 has no `x-oss-process` analogue; the
portal already re-encodes every upload to a ≤2000px WebP at write time).
The description block union also gained an `image` block in the same change:
seller-placed description photos render inside `ProductDescription` via
`DescriptionImageRow`, with consecutive image blocks sharing one row (a single
image runs full width at 16:9, two or more sit in a 4:3 grid) — the same
adjacency rule the portal's description studio previews. Each image block's
URL passes the same `getAllowedProductImageUrl` gate; a disallowed address
costs that photo, never the text around it.

**Inline emphasis renders too.** A paragraph carries an optional `runs` array —
the bold and italic a seller applied inside a sentence in the portal's designed
layout. It had the same shape of defect the `image` block had before it:
authored in the Portal, dropped here, with no error anywhere, because the
paragraph schema named only `text` and Zod drops unknown keys. `runs` are used
only when they join back to exactly `text`; when they disagree — an older
payload, or one that drifted — the stored `text` wins, because putting
different words on the page is a worse failure than losing the emphasis. A run
with an unrecognised mark costs that paragraph under the usual per-block
salvage, never the whole description. `strong` and `em` render as elements, so
the emphasis is heard by a screen reader rather than merely seen.

## Product Page (PDP)

`src/app/p/[id]/page.tsx` renders a product detail page at `/p/<slug>`. Every
product card links here using the backend's `slug` as the `[id]` route param —
the folder is still named `[id]`, but the value it receives is a slug.

**A 404 and an outage are now different pages.** `/p/[id]/not-found.tsx` is the
real "we couldn't find that product" page (still HTTP 404), and
`/p/[id]/error.tsx` is what an unreachable catalogue produces. Before this, every
failure became `notFound()`, so a portal outage looked like a deleted product —
a buyer would stop looking for something still for sale, and nobody would learn
the storefront was down. The error page renders nothing from the error itself:
no `message`, no `digest`.

The product is read once per request via React `cache()`, shared by
`generateMetadata` and the page. They used to fetch independently, and
`cache: 'no-store'` defeats Next's own fetch memoisation, so every PDP made two
identical upstream calls.

Product-card and variant-option links keep their normal `href`s, but disable
Next prefetch because each PDP URL is server-rendered and reads the storefront.
After hydration, a normal left-click on a variant option updates
`?variant=<id>` and the price from the already-loaded payload; direct URL visits,
reloads, copied links, and modified clicks still use the server-rendered route.

### Section order, and why it is this one

Rebuilt 2026-08-21 to the approved **PDP Redesign v3.1** shell.

| #   | Section                                      | Band              |
| --- | -------------------------------------------- | ----------------- |
| 1   | Breadcrumb                                   | surface           |
| 2   | Gallery 4:5 + the sticky record panel        | surface           |
| 3   | **Product specifications** — seller-declared | white, full-bleed |
| 4   | **About this product** — description, 70ch   | surface           |
| 5   | **Ratings and reviews** — buyer reviews only | surface           |
| 6   | **Supplier details** — technical, demoted    | surface           |
| 7   | Related products                             | surface           |

Two background colours in total. The one white full-bleed band at 3 is the
page's only rhythm break; a third would stop reading as structure and start
reading as decoration. `main` carries no max-width of its own so that band can
run edge to edge — each region owns its own `max-w-6xl` container instead.

**Specifications come before the description.** Specifications exist on every
categorised product: the workbook defines an attribute set for all 5,595
categories, and the portal blocks publication on the required ones. A written
description exists on almost none — the portal's only producer is a seller
typing into a textarea, and CJ's own HTML is deliberately never imported. With
the old order the first thing below the fold on a typical product was nothing at
all.

**The record panel sticks, not the gallery.** The buy controls are what a buyer
scrolling the description wants back within reach; the photographs are what they
have already looked at.

Composed from small single-purpose components under `src/components/product/`:

| Component                     | Renders                                                                                              |
| ----------------------------- | ---------------------------------------------------------------------------------------------------- |
| `ProductGallery` (client)     | Every approved photo at 4:5, lead image first, per-image alt text, five-column thumbnail grid        |
| `ProductRecordPanel` (client) | One bounded panel: price, price note, options, purchase, evidence ledger — hairlines, not four cards |
| `ProductPriceDisplay`         | The price line, with exactly one currency-formatted string in it                                     |
| `ProductOptionList` (client)  | The four option tiers; unreachable values are non-interactive `<span>`s, never disabled anchors      |
| `ProductEvidenceLedger`       | "What we know" — a filled mark per evidenced claim, a hollow one per stated unknown                  |
| `ProductSpecifications`       | The **seller's own** declarations against their category's attribute set                             |
| `ProductDescription`          | The seller-authored allow-listed blocks; text at 70ch, image rows breaking out wider                 |
| `DescriptionImageRow`         | One adjacency group of description photos: 16:9 alone, 4:3 paired                                    |
| `ProductReviews`              | The score panel: average, star bars, and the one provenance line                                     |
| `ProductRatingBreakdown`      | The five bars — presentational, because the chips above them already filter                          |
| `ProductReviewList` (client)  | The filter chips, and the list they narrow                                                           |
| `ProductReviewCard`           | One review: monogram, name, stars, date, variation, body, seller reply                               |
| `ProductSupplierDetails`      | Physical and identifier facts, labelled supplier-reported, deliberately demoted                      |
| `RelatedProducts`             | Same-category products, reusing the home grid                                                        |
| `ProductSchema`               | `Product`/`Offer` JSON-LD                                                                            |

### Ratings and reviews

Rebuilt 2026-08-26 from the Shopee "Product Ratings" pattern. Adopted: the filter
chips, and a per-review row that leads with who wrote it and how they scored it.

**One rule governs every chip: it is offered when it matches _some but not all_
of the list.** A band holding every review selects the same set as `All`, and
"With comments" when every review has one partitions nothing. So a product with
one review — or five all at five stars — draws no chip row at all. It also means
no chip can ever empty the list, which is why there is no "nothing matches" state
to find: a test presses every chip and asserts the list still has rows.

The bars stay **alongside** the chips rather than being replaced by them, which is
where this diverges from Shopee on purpose. A chip says how many two-star reviews
exist; a bar shows the shape of the distribution, which is what a buyer reads an
average to find out.

Four things Shopee has that this deliberately does not, because each would be a
control or a claim with nothing behind it:

| Not built                       | Why                                                                                                        |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **"With Media" chip**           | No review carries an image or video — the form accepts no upload and `ProductReviewSchema` has no field    |
| **Avatars**                     | Nothing on the wire; the row shows the initial of the already-published name, or `UserIcon` when anonymous |
| **Helpful votes / report menu** | No vote table, no buyer-facing report route                                                                |
| **Per-attribute sub-scores**    | The wire carries one rating per line, not a rubric                                                         |

**`ProductReviewList` filters in the browser, not through the URL.** Everything
else that narrows a list in this storefront is a `next/link`, because those change
which rows are fetched. This does not: the whole list is already on the page
(capped at 50 by `ProductReviewsResponseSchema`), so a chip is a lens on data in
hand, and routing it would re-render an entire product page to hide items that
never left. It is registered in `CLIENT_ENTRY_POINTS` and is **not** behind
`next/dynamic` with `ssr: false`, so the review prose stays in the initial HTML
for crawlers and answer engines.

Known gap: **the filter is not deep-linkable.** Doing it properly means threading
`searchParams` from the page down into the section; doing it with
`history.replaceState` alone would write `?reviews=5` into a URL whose server
render says `All`.

### Two spec sections, two provenance lines

`ProductSpecifications` renders `specification` — `{ label, value }` pairs the
**seller** entered against their category's attribute set. `ProductSupplierDetails`
renders `specs` — weight, dimensions, condition, MPN, GTIN, as the **supplier**
reported them.

They are separate because one footnote cannot honestly cover both. "As reported
by the supplier" becomes false the moment a seller-entered attribute appears
under it, and attributing a seller's own declaration to CJ is a provenance
error, not a wording preference. The portal editor already keeps its
`specification` and `specs` sections apart; the single flat table this replaces
contradicted that boundary.

Supplier details is deliberately quieter — a 16px bold heading against the other
sections' 20px display type, 13.5px rows against their 14px. These are claims
Sals3 **repeats** rather than facts it holds, and the hierarchy should say so
before the footnote does.

Two rows moved out of it:

- **No SKU.** `specs.sku` is an `S3V-<hex>` digest. It identified nothing for a
  buyer, and showing it was the same defect as putting a variant hash on an
  option chip. It stays on the payload for cart and order plumbing, and stays in
  Product JSON-LD where machines read it — a page test asserts it reaches no
  text a buyer can read.
- **Brand moved up.** A brand is the seller's own claim even when it arrives on
  the technical payload, so it renders in Product specifications. When the
  seller answered the workbook's own `Brand` attribute, that answer wins and no
  second row appears.

### The price note

`From US$4.51` on a product whose other seven options are US$20 is honest and
incomplete. The panel now says how many options cost more than the figure on
screen — counted from `variants[].price`, nothing estimated.

It names a **count, not the higher price**, which is a deliberate divergence
from the v3.1 prototype: the price block must contain exactly one
currency-formatted string, because a second one is what a price extractor can
pick up instead of the real offer price. `variantsAboveFloor` returns counts
only and cannot produce money.

### Page metadata

`generateMetadata` prefers the seller's own `metaDescription` when the portal
sends one, then falls back to `{title} — {categoryName} at Sals3.`, then the
title. The editor has a dedicated field for it, with its own length guidance and
search preview.

Two rules on it:

- It is **hidden metadata**. It never renders in the page body — a page test
  asserts that — because it is written for a search result, not for a reader.
- The **visible description is not in the fallback chain**. Substituting body
  copy for a meta description silently republishes the seller's first paragraph
  as their search snippet, and truncating prose mid-sentence at 155 characters
  is how a result reads as machine-generated.

### Every section is absent, not empty, when the data is

The portal omits a field rather than defaulting it, and the PDP renders a
section only when it has something real to put in it. No "N/A", no "—", no
reserved boxes. What that means in practice today:

- **No rating anywhere.** Sals3 has no buyer reviews, and CJ's
  supplier-platform review counts are not Sals3 ratings. The deprecated
  `ratingLine` is optional and carries a non-claim; nothing renders a star.
- **No delivery estimate, and the ledger no longer denies the charge.** Freight
  is destination-specific and quoted at checkout (ADR-003). Until 2026-08-21 the
  ledger's Delivery row read "Nothing is added to this price at checkout." That
  was true when written and became **false on 2026-08-17**, when live CJ freight
  quotes shipped: `quoteCheckoutShippingAction` prices each package against the
  buyer's address and the selected amount goes into the Stripe session. The row
  now states the unknown it actually has — what delivery will cost _this_ buyer,
  which needs an address the PDP does not have — and says where it resolves. The
  mark stays hollow, because that is still genuinely unknown here. The v3.1
  prototype's enabled-state line carries the same false sentence and is
  deliberately **not** transcribed.
- **No was/now price.** `oldPrice` is absent unless the portal sends a genuinely
  higher, evidence-backed comparison price. It never has.
- **Description and variants render nothing yet**, because no published product
  carries them: a CJ-sourced draft starts from an honestly empty description
  document, and variants exist only after the portal captures supplier evidence.
- **Stock gating is fail-open.** `UNKNOWN` is the common availability state and
  purchase stays enabled for it — failing closed would take the whole catalogue
  offline over evidence nobody refreshed. Purchase **is** blocked for an
  explicit `UNAVAILABLE` variant and while a selection is incomplete, each with
  a visible, announced reason rather than a silently grey button.
- **No image zoom lightbox and no seller card.**

### Product JSON-LD

`src/components/schema/ProductSchema.tsx` emits only fields the portal actually
sent, and escapes `<` because the payload contains supplier-originated text.
Deliberately omitted: `aggregateRating`/`review` (no buyer reviews),
`offers.availability` when availability is `UNKNOWN`, `weight` (the supplier
reports a range, not a number), `shippingDetails`,
`hasMerchantReturnPolicy`, and `priceValidUntil`. Fabricated structured data can
cost the whole domain its rich results.

## Cart Storage Format

`src/lib/cart.ts` stores the cart in `localStorage` under **`sals3-cart-v2`**.
Two format changes landed together: the currency moved from PHP to USD, and a
line's identity became variant-aware (`cartLineId(productId, variantId)`), so
two variants of one product are two lines instead of silently merging.

A `sals3-cart-v1` blob is **discarded, not converted** — converting a saved
price invents a price that was never quoted to that buyer — and the stale key is
removed on first hydrate rather than left holding purchase intent nothing reads.
Nothing is lost: `/checkout` does not exist and no order has ever been placed.

A second key, **`sals3-cleared-checkouts-v1`**, records which Stripe sessions
have already emptied the cart, so a revisited receipt does not wipe a cart the
buyer filled after the purchase. See
[the receipt on `/checkout/success`](#the-receipt-on-checkoutsuccess).

**Known limitation:** the cart store hydrates once per provider mount and does
not listen for `storage` events, so a second open tab keeps a stale cart. If
that tab then changes a quantity, it persists its stale state and purchased
lines reappear. Reloading the tab fixes it. Worth wiring a `storage` listener
when multi-tab shopping becomes worth supporting.

## Stage-2 catalogue groundwork (not wired to the live app)

`src/lib/compileProductTitle.ts` and `src/components/catalog/ProductCard.tsx`
(+ `ProductCardImage.tsx`) are a deliberately decoupled, independently tested
unit for a future structured product entity — Brand/Material/Fit/spec
attributes — per the build spec's Stage 2 (data model/entities). The live
storefront schema (`StorefrontProductSchema` in `src/services/products.ts`)
has none of those fields yet, only one pre-formatted CJ `title` string, so
this code has no real data to consume today. Do not route real traffic to
`src/components/catalog/ProductCard.tsx` or import it from a live route
before that structured entity actually exists — it lives in its own
`catalog/` directory, separate from the live `src/components/home/ProductCard.tsx`,
specifically so it isn't mistaken for the shipped card.

## Guest Header Strip and Auth Entry Points

`src/components/layout/GuestUtilityBar.tsx` renders a thin strip above the
main header row — Sell on Sals3, Customer Care, Feedback, then Log In and Sign
Up, all right-aligned, with no rule separating the strip from the row (owner
decision, 2026-08-20: `Feedback` moved from the left edge to sit beside
`Customer Care`, which left that side empty, and the divider cut one piece of
chrome in half). All three carry one type style — bold, on
`--header-strong` — after the owner levelled `Sell on Sals3` and `Customer Care`
with `Feedback` on 2026-08-20; the only difference left between them is that
`Feedback` stays visible below `sm` while the other two fold away for space,
carried by each link's own `hideOnMobile` flag in
`src/lib/guest-utility-links.ts` rather than by its position in the list. Sals3
verifies the server session before showing auth-specific header actions, and the
strip's right-hand auth slot has exactly two states:

- **Signed out** — `GuestAuthLinks` renders `Log In` and `Sign Up`.
- **Signed in** — `AccountHeaderLink` renders the buyer's verified **full name**
  as a button that opens the account menu (`Orders`, `Log out`).

Neither renders while the session request is still in flight, so the bar never
flashes the wrong identity. The signed-in state deliberately has no avatar: the
old rounded gradient user chip was removed by owner decision (2026-08-20) in
favour of the name itself.

Link targets reuse the existing footer stub routes (`/sell`, `/contact`) from
`src/lib/footer-data.ts` where they already overlap, plus a new `/help`. "Track
My Order" was deliberately left out: the main header's `Orders` link already
covers that, and Bogs flagged the duplication during review.

### Brand mark

`public/sals3-logo.webp` is the horizontal lockup — bag mark plus wordmark, 640x219,
14.5 KB, navy-to-azure gradient on transparency. It was regenerated from the
owner's 5238x1905 source on 2026-08-20 and trimmed to its own ink bounds, so the
committed proportion is 2.92:1. That number matters: `next/image`'s optimizer is
bypassed for local paths (see [Image loading](#image-loading)), so the file on
disk is the file on the wire and the `width`/`height` attributes at every call
site have to match it or the reserved box is wrong.

The asset carries **no opaque white pixels** — the counter inside the bag is
transparent. That is what lets the expanded header render the mark as a clean
white knockout with `filter: brightness(0) invert(1)`: every opaque pixel becomes
white and the counter shows the gradient through instead of filling in.

The square icons (`public/icon-192.png`, `public/icon-512.png`,
`src/app/apple-icon.png`, `src/app/favicon.ico`) are the bag mark alone, centred
with 10% padding on transparency, generated from the same source in the same
pass so the tab, the installed PWA and the header can never disagree about which
mark is current.

### Two-state header chrome

The header has two looks, driven by one boolean in
`src/components/layout/SiteHeaderShell.tsx` — the only client state in the whole
bar:

- **At the top of the page** — a brand gradient
  (`--color-brand-blue-900` -> `--color-brand-600`, 100deg) with light type, a
  40px logo flipped to white, and roomy rows.
- **Scrolled** — a solid white bar with dark type, a 30px logo, and tighter rows
  (~108px tall becomes ~82px).

Every colour and vertical measurement the header's children use is a CSS
variable declared on `.site-header` in `src/app/globals.css` and re-declared
under `.site-header[data-compact='true']`. The state swap is therefore one
`data-compact` attribute: `GuestUtilityBar`, `Logo`, `SearchBox` and the rest
stay Server Components with no prop or context threaded through them, and the
on-gradient contrast lives in one auditable place.

Details that are load-bearing rather than decorative:

- **Contrast.** The gradient ends at `--color-brand-600` (#0a5c8a), not at
  `.bg-brand-gradient`'s lighter `--color-brand-blue-500` (#018cc9): white text
  on #018cc9 measures 3.74:1, below the 4.5:1 minimum, and header type spans the
  full width. On #0a5c8a white measures 7.2:1 and the muted
  `--color-footer-link` value measures 5.1:1. The global `:focus-visible`
  outline is `--color-brand-600` — the gradient's own colour — so the expanded
  header overrides it to white.
- **Hysteresis.** The bar compacts above 72px of scroll and expands again only
  below 32px. A single threshold would sit inside the ~26px of height the swap
  removes, and the browser's scroll anchoring could then pull `scrollY` back
  across it, flipping the header on every frame.
- **Cross-fade.** A gradient cannot animate to a flat colour, so the gradient
  lives on a `::before` layer whose opacity animates and `isolation: isolate`
  keeps it above the header's white background and below its content.
- **No `position` in the CSS rule.** `.site-header` deliberately sets no
  `position`: the element carries Tailwind's `sticky`, and an unlayered
  `position: relative` in `globals.css` beat that utility and silently unstuck
  the header during this build.
- **The support links state their own colour.** `Sell on Sals3` and
  `Customer Care` cannot inherit it from their `<nav>` — the base-layer
  `a { color }` rule wins over inheritance, which is what made them render brand
  blue on the gradient until each link carried `--header-fg-muted` itself.

The main header row itself carries the logo (no tinted background plate), a
search field that takes every remaining pixel, `Cart`, and
`src/components/layout/HeaderOrdersLink.tsx` — an `Orders` shortcut that renders
only for a verified signed-in session. That gate is UX, not authorisation:
`/orders` still redirects a signed-out visitor server-side through
`getBuyerSession`, and that redirect remains the security boundary. The
"Deliver to <region>" control was removed in the same pass; it cycled three
hardcoded city names and was never wired to shipping, pricing, or availability.

Header hover and focus states were quietened in the same pass (owner decision,
2026-08-20): `Cart` and `Orders` no longer paint a grey `hover:bg-black/5` plate
and change text colour instead, and the search field no longer stacks the global
`:focus-visible` ring inside its own border. `#site-search:focus-visible` turns
that outline off — unlayered in `src/app/globals.css`, because the global rule is
unlayered and beats any utility class — and `SearchBox` recolours the wrapper
border to `brand-600` on `focus-within` in its place. Focus is therefore still
visible, but as one indicator rather than two; note that a colour-only border
change is a weaker indicator than the outline it replaces, which is a deliberate
accepted trade-off, not an oversight. The account menu's own items keep their row
highlight — a menu with no hover feedback loses the sense of which row is armed.

`Log In` and `Sign Up` link to real routes, `/login` and `/signup`
(`src/app/login/page.tsx`, `src/app/signup/page.tsx`). Both are built, working
credential screens on the same split-hero layout (see
[Login and Signup Screens](#login-and-signup-screens)), and both set
`robots: { index: false, follow: false }`.

## Login and Signup Screens

`/login` implements the approved Claude Design source `Sals3 Login.dc.html`: a
full-bleed 50/50 split with the brand photo and value proposition on the left
and the sign-in card on the right. The site header and footer are deliberately
absent — the route is a single-task surface and the hero's circular back
control is the way out.

`/signup` reuses that layout unchanged. The two screens cross-link to each
other, so giving them different chrome would throw a visitor between two
layouts mid-task. Both accept `?next=<key>` and carry it across that cross-link
— see [Post-login redirects](#post-login-redirects).

### How to see it

```bash
npm run dev
```

Then open <http://localhost:3000/login> or
<http://localhost:3000/signup>. Below the `lg` breakpoint the split stacks: the
hero becomes a band above the form.

### Files

| File                                         | Role                                                       |
| -------------------------------------------- | ---------------------------------------------------------- |
| `src/app/login/page.tsx`                     | Sign-in route composition and `noindex` metadata           |
| `src/app/signup/page.tsx`                    | Registration route composition and `noindex` metadata      |
| `src/components/auth/AuthHeroPanel.tsx`      | Left panel: photo, scrims, back control, value proposition |
| `src/components/auth/LoginCard.tsx`          | Right panel for sign-in (Server Component)                 |
| `src/components/auth/SignupCard.tsx`         | Right panel for registration (Server Component)            |
| `src/components/auth/LoginForm.tsx`          | Client sign-in form: state machine, validation, submit     |
| `src/components/auth/LoginFormActions.tsx`   | Announcer, alert region, and both sign-in buttons          |
| `src/components/auth/SignupForm.tsx`         | Client registration form                                   |
| `src/components/auth/SignupFields.tsx`       | The four registration inputs, in focus order               |
| `src/components/auth/FormAlert.tsx`          | Always-mounted `role="alert"` for form-level failures      |
| `src/components/auth/StatusAnnouncer.tsx`    | Screen-reader-only progress ticker                         |
| `src/components/auth/SubmitButton.tsx`       | Primary submit with the `aria-disabled` pending contract   |
| `src/components/icons/StatusIcon.tsx`        | Alert, envelope, and spinner glyphs                        |
| `src/components/auth/GoogleSignInButton.tsx` | Divider plus the whole Google popup flow                   |
| `src/components/auth/NameField.tsx`          | Full-name input                                            |
| `src/components/auth/EmailField.tsx`         | Email input                                                |
| `src/components/auth/PasswordField.tsx`      | Password input; `purpose` selects sign-in/sign-up/confirm  |
| `src/components/auth/AuthField.tsx`          | Shared label + control + error layout                      |
| `src/components/auth/auth-field-styles.ts`   | Shared control class strings                               |
| `src/lib/auth/login-schema.ts`               | Zod credential schema, shared by the form and the server   |
| `src/lib/auth/signup-schema.ts`              | Registration schema built on the credential schema         |
| `src/lib/auth/password-login.ts`             | Browser side of sign-in                                    |
| `src/lib/auth/password-signup.ts`            | Browser side of registration                               |
| `src/lib/auth/login-status.ts`               | Every sentence shown for a server outcome                  |
| `src/lib/auth/identity-toolkit.ts`           | Server-only Firebase Identity Toolkit REST client          |
| `src/lib/auth/rate-limit.ts`                 | Per-IP and per-account attempt buckets                     |
| `src/lib/auth/auth-request-guards.ts`        | Shared origin, throttle, parse, schema, and CSRF preamble  |
| `src/lib/auth/auth-error-codes.ts`           | The auth wire contract (safe on both sides)                |
| `src/lib/auth/auth-links.ts`                 | Every href the screens point at                            |

Auth palette tokens, the two hero gradient overlays, and the font-family CSS
variables live in `src/app/globals.css`. The screens' typeface uses the
`--font-instrument` stack through the `font-auth` utility; the app does not use
`next/font/google`, which avoids the Turbopack Google-font resolver during CI
builds.

`test/client-bundle-boundary.test.ts` walks the import graph from every client
entry point and fails on a `node:` builtin or a `server-only` marker. It exists
because that mistake is invisible: typecheck, unit tests, and the build all
pass while the page silently stops hydrating.

### Required setup

The Firebase Console steps under [Authentication](#authentication). No
environment variable is required beyond the ones already listed, and no package
was added for this feature.

### Security posture

- The form has no `action` and its submit handler always calls
  `preventDefault()`. Without that, the browser's default GET submit would put
  the password in the URL query string, the address bar, and every log
  downstream. `e2e/login.spec.ts` asserts the URL stays clean after submit.
- The password lives only in React state — never web storage, never a log,
  never a URL. It is cleared the moment it can no longer be used, and kept
  after a failure so a one-character typo does not force a full retype.
- Validation uses one Zod schema (`src/lib/auth/login-schema.ts`) on both
  sides. The server re-validates with it, so the `MAX_PASSWORD_LENGTH` bound is
  enforced before anything reaches a hasher, and the client check is UX only.
- CSRF is a double submit through the existing `GET /api/auth/csrf`, compared
  with `timingSafeEqual` after an explicit length guard. Every cookie-setting
  route also refuses a cross-origin `Origin`.
- Nothing logs the address, the password, the ID token, or a response body. The
  only server log on the auth path is
  `console.error('[auth] identity toolkit unavailable', { code })` — the code
  string alone. A distinctive sentinel password is asserted absent from the
  response body, every response header, the request URL, web storage, and all
  five `console` levels, across every failure path.
- `next.config.ts` sends `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, and `Permissions-Policy` on document routes, plus
  `Cache-Control: no-store` on `/login` and `/signup`. API responses get
  `no-store` from `noStoreJson`.
- A pending button is marked `aria-disabled`, never `disabled`. Setting the
  real attribute on a focused button blurs it, dropping a keyboard visitor to
  the document body mid-request; a handler guard prevents the double submit
  instead.

### Known limitations

- **No address verification.** Nothing proves a buyer can receive mail at the
  address on their account. This will matter for order confirmations and for
  password reset.
- **`/login/reset` (Forgot password) does not exist.** Real password accounts
  exist, so a buyer who forgets a password has no in-app recovery — and with no
  email step anywhere in signup, a mistyped address is never caught. The
  `sendOobCode` helper in `src/lib/auth/identity-toolkit.ts` is kept, unused,
  for exactly this; it is the recommended next piece of work.
- Attempt throttling is per-process and resets on a cold start (see
  [Authentication](#authentication)).
- Playwright stubs the Sals3 auth routes at the network layer, so `e2e/` covers
  the client half only — form, request, state, redirect. The server guards
  (CSRF, origin, throttling, enumeration parity) are proved by the route unit
  tests, not end to end.
- `/help/pricing`, `/legal/terms`, and `/legal/privacy` are not built yet;
  these are the same stub hrefs the footer already ships.
- The header rule in `next.config.ts` excludes `/_next/`. With a broader
  `/:path*` matcher, `next dev` (16.3.0) answered its own chunk requests with
  403 and the HMR websocket handshake failed, silently leaving every client
  component unhydrated. Verified by removing and re-adding the rule against
  `e2e/login.spec.ts`.
- `next dev` overrides the configured `Cache-Control`, so the production value
  is asserted in `test/next-config-headers.test.ts` rather than end-to-end.
- `public/login-hero.jpg` (2200×1228, 327 KB) is a resized, recompressed copy of
  the supplied `public/login-bg.jpeg` (2752×1536, 2.1 MB), which is no longer
  referenced by any code and can be deleted.

### Verification

```bash
npm run verify
npm audit --audit-level=high
```

Login-specific tests: `src/lib/auth/login-schema.test.ts`,
`src/components/auth/LoginForm.test.tsx`, `src/app/login/page.test.tsx`,
`test/next-config-headers.test.ts`, and `e2e/login.spec.ts`.

## Cart

`src/lib/cart.ts` holds pure, unit-tested cart logic (add/remove/set-quantity,
item count, subtotal) and a Zod schema that validates anything read back from
`localStorage` — that data is client-controlled and can be edited or
corrupted outside the app, so it is never trusted directly; a malformed or
tampered value falls back to an empty cart instead of crashing.

`src/components/cart/CartProvider.tsx` wraps the whole app (`src/app/layout.tsx`)
with a small `useSyncExternalStore`-backed store, exposing a `useCart()` hook
(`items`, `itemCount`, `subtotal`, `addItem`, `setQuantity`, `removeItem`).
The store starts empty (matching the server-rendered HTML) and hydrates from
`localStorage` in an effect after mount — this avoids a hydration mismatch
without calling a React state setter directly inside an effect body (the
`react-hooks/set-state-in-effect` lint rule).

On the product page, `Add to Cart` and `Buy Now`
(`src/components/product/ProductAddToCartButtons.tsx`) are now live — `Buy
Now` adds the item and navigates straight to `/cart`. The header's `Cart`
link shows a live item-count badge (`src/components/cart/CartCountBadge.tsx`)
once the cart has at least one item.

Adding an item shows a toast confirmation
(`src/components/cart/CartToast.tsx`, rendered once by `CartProvider` so any
future "add to cart" trigger gets it for free): `role="status"
aria-live="polite"` so screen readers announce it without interrupting,
auto-dismisses after 4 seconds, has a manual close button (44×44px tap
target) for anyone who needs more time, animates with `transform`/`opacity`
only (not layout-affecting properties), and defers to the
`prefers-reduced-motion` rule already in `globals.css`.

`/cart` (`src/app/cart/page.tsx`, `noindex`ed) lists line items with a
quantity stepper and remove button, and a subtotal summary. `Proceed to
Checkout` renders disabled with a plain-English note — `/checkout` doesn't
exist yet (build spec Stage 5). Cart state is local to the browser only
(`localStorage`, key `sals3-cart-v1`); there is no server-side cart, no
account sync, no shipping calculation, and no promo/discount codes beyond
each product's catalog price.

`test/setup.ts` installs a small in-memory `Storage` polyfill before every
test — jsdom's built-in `localStorage` was unreliable under the Node version
this repo runs on (Node's own experimental global `localStorage` can shadow
it), so tests don't depend on it.

**UI/UX pass:** the PDP and cart's first drafts were missing several items
from the `ui-ux-pro-max` checklist — fixed afterward rather than left as a
gap. All custom buttons now have `cursor-pointer` and a 150–300ms hover
transition (native `<button>` does not get `cursor: pointer` for free, only
`<a>` does), plus `active:scale-95`/`active:scale-[0.98]` press feedback
(`ui-ux-pro`'s state-coverage checklist: every interactive component needs a
distinct pressed state, not just hover). The cart's quantity stepper buttons
were `32×32px`, below the 44×44px minimum touch target; they're `44×44px`
now. Both `ui-ux-pro-max` and `ui-ux-pro` were run — their generic
`--design-system`/palette suggestions for this product type (a different
purple palette, alternate typography) were **not** applied: Sals3 already
has an approved brand palette and type system from earlier sessions
(`--color-brand-600`, Plus Jakarta Sans/Outfit), and swapping it for a
generic default would be a regression, not an improvement. Only the
palette-independent items (touch targets, hover/press/focus feedback,
contrast, motion, ARIA, layout) were applied.

A real layout bug turned up this way: the PDP's gallery/info grid only
switched to two columns at the `lg` (1024px) breakpoint, so at a common
tablet width (768px) the product photo alone rendered at ~703px tall,
pushing `Add to Cart` below the fold. Fixed by moving the breakpoint to `md`
(768px) on both the PDP and the cart page's line-items/summary grid, for the
same reason.

Another real layout bug, this time on narrow mobile widths: `CartLineItemRow`
(`src/components/cart/CartLineItemRow.tsx`) laid out the title/stepper column
as a plain `flex-1` flex child. Flexbox defaults a flex item's `min-width` to
`auto`, so the column refused to shrink below its content's intrinsic width
(the quantity stepper + Remove button row) and pushed the price column off
the right edge of the viewport on small phones. Fixed with `min-w-0` on that
column and `flex-wrap` on the stepper row so the buttons wrap instead of
forcing width. Verified via live `getBoundingClientRect()` measurement at both
375px and 320px viewport widths — no horizontal overflow at either.

`frontend-design`'s guidance to take "one real aesthetic risk" and build a
distinctive visual identity was **not** applied wholesale — that mandate is
for a page that doesn't have an established identity yet. Sals3's PDP
deliberately follows familiar ecommerce conventions (Lazada/Shopee-style
layout) so customers already know how to use it; novelty on a purchase-path
page would work against usability, not for it. Its quality-floor items
(responsive down to mobile, visible keyboard focus, reduced motion) were
already satisfied.

One gap the audit surfaced but did **not** fix here, because it's a
site-wide pre-existing issue rather than a PDP-specific one: there is no
`error.tsx` or `not-found.tsx` anywhere in `src/app/`, so a failed API call
or bad route falls back to Next.js's default unstyled pages instead of a
branded one. Flagged as a separate task rather than folded in silently.

## README Rule

Update this README in the same task when any change adds or changes:

- user-facing features;
- setup or installation steps;
- package commands;
- environment variables;
- runtime behavior;
- scripts;
- testing workflow;
- project structure;
- important limitations or known issues.

## Deployment

Do not deploy, publish, push, or commit unless the owner explicitly asks.

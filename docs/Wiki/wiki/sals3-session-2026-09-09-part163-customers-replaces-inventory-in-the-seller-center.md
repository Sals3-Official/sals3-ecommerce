---
tags:
  [
    session-record,
    sals3,
    sals3-portal,
    seller-center,
    customers,
    privacy,
    permissions,
    drizzle,
    read-model,
  ]
aliases:
  [
    "Part 163",
    "Customers replaces Inventory in the Seller Center",
    "The customer is the account that ordered",
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
  - "[[sals3-portal-orders-parcel-workspace-design]]"
  - "[[ADR-018-phase-1-returns-refunds-and-no-warehouse-cj-recovery]]"
  - "[[ADR-019-github-org-boundary-and-the-sit-pre-prod-main-promotion-gate]]"
  - "[[nextjs-component-security-code-rules]]"
  - "[[sals3-session-2026-09-09-part164-a-buyer-can-cancel-and-the-hold-moved-into-cjs-imported-tab|part 164]]"
---

# Part 163 — Customers replaces Inventory in the Seller Center

> [!IMPORTANT] What shipped, in one line
> **`/customers` replaced the Inventory design stub** in the Seller Center: one
> row per buyer who has placed a paid order, platform-wide, with every figure
> **computed on read** from orders, parcels and reviews — nothing cached on the
> customer row — behind three new permissions and a masking layer that keeps
> names, emails and phone numbers out of the page until someone deliberately
> reveals one, and writes an audit row when they do.

> [!NOTE] Provenance
> Reconstructed on **2026-09-10** from the merged pull requests themselves —
> `anythingsupplies/sals3-portal` **#200, #202, #203, #204, #205, #208, #209,
> #210, #211, #212, #213**, promoted by **#206/#207** (pre-prod, main) and
> **#214/#215/#216**. Sixteen merged pull requests across 2026-09-08 and
> 2026-09-09, none of which had a vault note. The design canvas the owner
> approved is linked from #200.

## 1. Inventory was a stub, and it was in the way

The Seller Center carried an **Inventory** workspace that was never wired to
anything real. `src/lib/seller-center/mock-data/inventory.ts` fed it; the
stepper, the safety-rules panel and the audit-trail panel were shapes waiting
for a decision that never came. Sals3 holds no stock — ADR-018 settled that the
warehouse is CJ's — so an inventory workspace in the seller's own console had
no fact to display that CJ did not already own.

What the console did not have was **the buyer**. Orders were reachable one
parcel at a time; nothing answered *who has bought from us, how often, and how
did those orders end*. That question is the one a seller actually asks.

So `/customers` took the slot: the route, the navigation entry, the permission
family and the proxy protection all moved across in one change rather than
running two workspaces side by side.

## 2. What a customer is — and the owner decision that changed it mid-flight

The first cut led each row with the **shipping name**. On 2026-09-09 the owner
overruled it (#205):

> A customer is the **account that ordered**. The shipping name can differ per
> order — a gift, a colleague's address, a reseller shipping onward.

So the **masked email** became the label: on the list row, on the profile title
and in the breadcrumb. The masked name dropped to the aside. This is a small
diff and a large modelling statement — it fixes the identity to something
stable across orders rather than to a string the buyer retypes each checkout.

One row exists per buyer who has placed a **paid** order, **platform-wide**.
Not per seller: the same person buying from two sellers is one customer.

## 3. Every number is derived, and derived in SQL

Nothing is denormalised onto the customer row. Each figure is computed on read
from `sals3_orders`, the parcels and the reviews:

| Figure | Definition |
| --- | --- |
| Orders | count of paid orders linked to the customer |
| Total order amount | summed in USD |
| % delivered | **every** parcel of the order reached `DELIVERED` |
| % refunded | `payment_status = 'REFUNDED'` — the only refund fact stored today |
| % cancelled | every parcel of the order reached `CANCELLED` (#208) |
| In progress | orders that are neither delivered, cancelled nor refunded (#208) |
| Reviews | count, with the average kept to the profile (#212) |

The reason to hold this line is that a cached counter on a customer row is a
second source of truth that drifts silently — and drift here would be invisible,
because nobody knows what the number *should* be without recomputing it anyway.

The trade is cost: correlated subqueries per row. It is affordable because the
list is paged and the row count is small. When it stops being affordable, the
place to fix it is a materialised read model, not a hand-maintained counter.

The money breakdown followed the same rule (#212): under **Total order amount**
the profile shows **delivered / in progress / cancelled** money — the three sum
to the total — with **refunded** shown apart as a slice, because a refunded
order is also one of the other three and adding it would double-count. All four
are summed in SQL with **the same conditions as the counts**, so a figure and
its percentage can never disagree.

## 4. Two SQL defects that only production data could show

Both shipped green and both were wrong on SIT within hours.

### 4.1 A raw `sql` template will not take a `Date` (#202)

`first_order_at` was compared inside a raw `sql` template with a JavaScript
`Date` interpolated directly. SIT answered with a server error —
`ERR_INVALID_ARG_TYPE` — because the driver has no rule for serialising a
`Date` in that position. Replaced with drizzle's `gte`, which knows the column's
type and binds properly.

The tell: the page was fine locally against a smaller path and failed the moment
a real row reached the comparison.

### 4.2 An unqualified `id` bound to the wrong table (#203)

**Every `Total order amount` on `/customers` read `$0.00` on SIT while the
profile — the same computation, different query shape — was right.**

Drizzle renders `${customers.id}` **unqualified** in a single-table select,
because in that context it is unambiguous. Inside a **correlated subquery**
joined against `sals3_orders`, the bare `"id"` then bound to
`sals3_orders.id` — so each subquery correlated a row against itself and summed
nothing. No error, no warning, a plausible zero.

The repair is `${customers}.id`, which forces the table qualifier. What makes it
stick is `src/modules/customers/aggregates.test.ts`: it **renders the list query
shape and refuses an unqualified outer reference**. That is a test against the
generated SQL rather than against a result, which is the only level at which
this class of bug is visible.

> [!WARNING] The general shape
> An ORM that shortens an identifier because the *inner* context is unambiguous
> can produce a *silently wrong* correlation when that fragment is nested. The
> failure mode is a valid query returning a believable number. See skill 106.

## 5. Privacy is the design, not a layer on top

- **Three permissions**, replacing `inventory:*` entirely:
  - `customer:read` — the list and the **masked** profile
  - `customer:reveal` — plaintext, granted **exactly where `order:fulfill` is**,
    and **every reveal writes a row to `customer_reveal_audit`**
  - `customer:note` — staff notes
- **Masking happens in the reader**, `src/modules/orders/masking.ts`, shared with
  the parcel page. Plaintext exists only on the far side of the reveal server
  action; it is never in the payload the page renders.
- **Email search is prefix-only, uid exact.** Deliberate: a `contains` search
  over masked data is an oracle — an attacker with `customer:read` could
  reconstruct a hidden address a character at a time by watching which queries
  return a row.
- Server actions follow the house order: **Zod → `requirePermission` → rate
  limit → module**, with the actor taken from the session and never from input.

### The edge check that was missed, then restored (#204)

`proxy.ts` still listed `/inventory` in `PROTECTED_PREFIXES` and in the matcher.
Server-side `requirePermission` was enforced throughout — so this was never an
exposure — but the **edge redirect-to-login** was gone for a day: an
unauthenticated visitor reached the route and got the server's refusal instead
of a login page.

The lesson is that renaming a route has a **list of registries** to update, and
the proxy is the one furthest from the code being written.

## 6. Data, and a deploy that is allowed to arrive before the DDL

Four new tables in `drizzle/0038_perpetual_jean_grey.sql`: `customers`,
`customer_orders`, `customer_notes`, `customer_reveal_audit`.

**No column was added to `sals3_orders`.** The customer link runs *after*
`acceptCheckoutOrder`'s transaction commits, in
`modules/customers/identity.ts#attachOrderSafely`, and it **logs and skips when
the tables are absent**.

That ordering is the whole safety argument: a deploy that lands ahead of the DDL
costs **unlinked orders and nothing else** — no failed checkout, no rolled-back
payment — and the backfill repairs them afterwards. Checkout does not gain a
dependency on a reporting table.

Rollout is two dispatched workflows, SIT first:

1. **Customers Migrate Customers** — confirm all four tables report `true`
2. **Customers Backfill** — loops until `remaining: false`

## 7. The owner walkthrough, and the eight follow-ups it produced

Everything from #208 to #213 came out of the owner reading the workspace on
production on 2026-09-09. They are worth recording individually because they are
what the module actually looks like now:

- **#208** — Cancelled column and tile; in-progress count under the delivered
  tile; the customer's average rating with stars at the top of the Reviews tab
  and beside each review; **search by exact order number**, returning the
  account that placed it.
- **#209** — the row and profile header showed only `PH`. Now the flag and the
  **written country name** (`🇵🇭 Philippines`), reusing `lib/cj/country-names.ts`
  **so the spelling matches what the fulfilment worker types on CJ orders**.
- **#210** — and immediately: **Windows Chrome renders regional-indicator pairs
  as plain letters.** The emoji flag was two capital letters on the owner's own
  machine. The six approved buyer destinations now ship as **static SVGs** under
  `public/flags/` (MIT, from `country-flag-icons`, licence included, **no
  runtime dependency**); anything else falls back to a letter badge beside the
  written name.
- **#211** — six right-aligned figures were hard to read and Reviews collided
  with Last order. Counts and percentages centre under their headings; **Last
  order stays right-aligned**, because a date column reads down its right edge.
- **#212** — the money split described in §3; the list's Reviews column reverts
  to the count alone.
- **#213** — Amount and Delivery centred on the Orders and Refunds tabs, Placed
  right-aligned to match. The tab strip's **one-pixel link overhang** grew a
  vertical scrollbar with arrows on Windows; the y axis is now clipped.

Two of the six are **a rendering difference on the owner's operating system**,
not a design mistake. That is a recurring cost of designing on one machine and
reviewing on another, and it is cheaper to accept than to argue with.

## 8. Verification, and a promotion that merged but could not deploy

Actions on `sals3-portal` is billing-stalled, so every one of these carries a
named local `npm run verify` per ADR-019's 2026-09-09 amendment. The counts
climbed as the module grew: **4,219 unit tests** at #200/#202, **4,227 passed /
4 skipped across 379 files with 72 e2e** by #213.

**#214 merged to `pre-prod` and Vercel refused to deploy it.** The status read
`Deployment was blocked` — ADR-019's unverifiable-author fault, not the account
block: the `gh` keyring's active account had **reverted mid-session** and the
merge was attributed to an account without access to the Vercel project.

The repair was **#215** — the same content, one empty commit, merged as
`anythingsupplies` — giving `pre-prod` a head Vercel would deploy. Then **#216**
promoted `pre-prod → main` off head `6fd5c6bc`, verified at **4,227 passed / 4
skipped, 72 e2e**, with Vercel reporting `success — Deployment has completed`.

> [!NOTE] Read this against part 160
> `Deployment was blocked` (#214, an author problem, fixable) and
> `Account is blocked.` (the vault repository's legacy project, not fixable) are
> **different faults wearing the same red**. Part 160 was written the same day
> after that exact confusion cost six re-authored commits.

## 9. What this deliberately does not do

Claims, refund records and contact records, and the **Report Item Problem**
intake, are all absent. They depend on the Item Problem SOP being approved.
`modules/customers/metrics.ts` takes them **as inputs** when they arrive, so the
shape is reserved rather than invented — the Contacts tab is a **named
placeholder** that says what it is waiting for.

`% refunded` reading `payment_status = 'REFUNDED'` is the honest limit of what
is stored: it cannot distinguish a full refund from a partial one, because no
partial refund fact exists yet. Part 164's cancellation work is the first thing
to write real refund rows, and it is what will make this column mean more.

## Lessons

- **A number that is right in one query shape and zero in another is a binding
  problem, not an arithmetic one.** Read the generated SQL, and pin it in a test
  that inspects the query rather than the result.
- **Renaming a route means walking every registry that names it** — the router,
  the navigation, the permission family, and the proxy, which is the one nobody
  is looking at.
- **Let a reporting write fail open.** Linking after the transaction commits,
  and skipping when the table is absent, means the DDL and the deploy do not
  have to be simultaneous.
- **Design decisions about identity are worth one paragraph of prose.** "A
  customer is the account that ordered" is three lines of diff and settles a
  dozen future arguments.
- **Emoji is not a rendering guarantee.** A regional-indicator flag is letters on
  Windows Chrome; ship the asset if the glyph matters.
- **A search over masked data must not be a substring search.**

Registered as skills 106, 107, 108 and 109 in [[sals3-skills]].

## Pending

- **The Contacts tab is a placeholder** and stays one until the Item Problem SOP
  intake exists. Registered in [[pending-register]].
- **`% refunded` cannot see a partial refund**, because no partial refund fact is
  stored. Part 164 begins writing refund rows; the column should be revisited
  once they exist.
- **The correlated-subquery read model is unbenchmarked.** It is correct and
  paged; nobody has measured it against a customer count larger than SIT's.
- **`public/flags/` covers six countries.** A seventh destination needs its SVG
  added or it silently takes the letter-badge fallback.

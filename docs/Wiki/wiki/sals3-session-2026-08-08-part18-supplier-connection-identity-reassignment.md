---
tags: [session, sals3-portal, suppliers, auth, incident]
aliases: [Supplier Connection Identity Reassignment Session, dev-user Placeholder Incident]
created: 2026-08-08
updated: 2026-08-08
status: historical
authority: session-note
owner_approved: false
related:
  - "[[hot]]"
  - "[[ADR-006-separate-retailer-dropshipper-registration-and-supplier-connections]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[sals3-skills]]"
  - "[[sals3-session-2026-08-07-part15-multi-tenant-supplier-connections-and-ui-overhaul]]"
  - "[[sals3-session-2026-08-07-part16-storefront-feed-tenant-connection]]"
---

# Session: the first real login exposed an orphaned CJ connection, fixed by reassigning ownership, not by writing code

Historical record of what happened. Current verified state lives in
[[hot]] - read that for "what's true now," this note for "how it got
there."

## Scope

Bogs signed into `sals3-portal` for the first time using a real Better
Auth account (`temp.access@sals3.local`, provisioned via
`scripts/create-portal-user.mts`) rather than the `dev-user` placeholder
session every prior session had used. Supplier Apps showed the CJ
connection as `NOT CONNECTED`, and `/products` showed "No CJ connection
yet" - even though a `CONNECTED` connection existed and Bogs recalled
connecting it successfully before.

## Root cause

Two `seller_accounts` rows existed:

- `identity_id = 'dev-user'` - the placeholder identity every session
  before real login existed had authenticated as (see
  [[sals3-session-2026-08-07-part15-multi-tenant-supplier-connections-and-ui-overhaul]]
  and [[hot]]'s long-standing "still only one `dev-user` placeholder
  identity" caveat).
- `identity_id = '<real Better Auth user id>'` - the account behind
  `temp.access@sals3.local`.

The one CJ `supplier_connections` row (`status = 'CONNECTED'`, created
2026-08-07) belonged to the `dev-user` seller account. Both
`SupplierAppsPage` and `CjCatalogueView` correctly scope their read by
`sellerAccount.id` from the currently authenticated session
(`requireDropshipperAccount()` → `getSession()`, which reads real Better
Auth, not a bypass - `PORTAL_TEST_AUTH_BYPASS` was confirmed unset). So
both pages were reading correctly; the real logged-in seller account
genuinely had zero connections. This was not a caching, revalidation, or
rendering bug - a `git diff`-free investigation confirmed both server
components behave identically and correctly.

## The unique-constraint trap

The first fix attempted was a soft disconnect of the stale `dev-user`
row (`status → DISCONNECTED`, mirroring `disconnectConnection()`),
expecting the seller could then reconnect fresh under the real account.
Reconnecting failed with `"A CJ account is already connected."` -
`findConnectionByProviderAndHash()` matches on `(providerId,
externalAccountLookupHash)` with **no status filter**, and
`supplier_connections` carries a **hard unique index** on that same pair
(`supplier_connections_provider_external_hash_key`). A given real CJ
account can have **exactly one** connection row, ever, for a given
provider - status does not free up the slot, and no code path exists to
transfer that row's `sellerAccountId` to a different seller. Soft
disconnect is reversible for the *original* owner (`reconnectConnection`
says so explicitly); it does not release the row for anyone else.

## Fix applied

A one-off maintenance script (Drizzle `postgres.js`, run via `tsx`,
deleted immediately after use - never committed to `sals3-portal`):

1. Soft-disconnected the stale row (status flip only, matching
   `disconnectConnection()`'s own semantics).
2. Reassigned the row's `sellerAccountId` from the `dev-user` seller
   account to the real `temp.access@sals3.local` seller account, via a
   direct Drizzle `update` on `supplier_connections`.

Verified safe before running: `PostgresSupplierSecretStore` keys the
encrypted credential purely by `connectionId`, not `sellerAccountId`, so
reassigning ownership does not orphan or need to re-encrypt the secret.

**This was a pure data correction - no `sals3-portal` code changed.**
The row now sits at `status = 'DISCONNECTED'` under the real seller
account, which the UI reads as "Reconnect" (not "Connect"); Bogs re-runs
the normal reconnect flow with the same CJ API key to bring it back to
`CONNECTED` with fresh tokens, rather than the script forcing status
directly.

## Why this will recur

There is still exactly one real seller in the system, and the
`dev-user` placeholder identity is still what every pre-Better-Auth
session used. Any connection created before a seller's first real login
is now owned by an identity nobody can authenticate as. This is the
concrete, first-occurrence consequence of the exact gap [[hot]] has
flagged since 2026-08-07: *"there is still only one `dev-user`
placeholder identity."* Once a second real seller exists, the same
unique-constraint trap applies across two *real* sellers too - if
seller A's connection to a given CJ account is disconnected, seller B
still cannot claim that same CJ account without an owner running a
script by hand.

**Not fixed this session, left as an open recommendation:** a real
ownership-transfer/reassignment path (admin tool or server action, not
a throwaway script) for exactly this case - a connection stranded under
an identity nobody can log in as. `scripts/create-portal-user.mts` is
the existing precedent for this class of owner-only tool.

## Verification

Read-only DB queries (`postgres.js` via `node -e`) confirmed the
before/after state directly rather than trusting the UI alone: two
`seller_accounts` rows, one `supplier_connections` row, its
`sellerAccountId` before and after the reassignment, and that the
encrypted secret's key (`connectionId`) was untouched throughout.

## Still open after this session

- No permanent tool exists for this reassignment case; it required a
  hand-written, throwaway script each time.
- The `dev-user` placeholder identity itself is not removed - it is
  historical baggage from before Better Auth, not a live risk on its
  own, but a trap for whoever debugs the next "why does this look
  disconnected" report without knowing this incident happened.
- Real seller-to-seller CJ-account contention (two real sellers wanting
  the same underlying CJ account, one after the other) is untested;
  this session only exercised placeholder-to-real reassignment.

---
tags:
  - sals3
  - sals3-portal
  - orders
  - cj
  - fulfillment
  - tracking
  - storefront
  - session
aliases:
  - Buyer Orders API
  - CJ Status Sync
  - Frozen Line Image
  - Part 58
created: 2026-08-19
updated: 2026-08-19
status: current-state
authority: session-record
owner_approved: true
implementation_status: merged
related:
  - "[[hot]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-011-product-media-source-selection-and-supplier-original-preservation]]"
  - "[[ADR-013-cj-product-evidence-truth-and-lean-catalog-controls]]"
  - "[[sals3-session-2026-08-18-part53-paid-order-path-and-the-queue-that-swallowed-it]]"
  - "[[sals3-session-2026-08-19-part55-checkout-flow-split-and-buyer-facing-repairs]]"
  - "[[sals3-session-2026-08-19-part57-margin-inheritance-market-rules-rebuild-and-eleven-merged-prs]]"
  - "[[storefront-product-contract-v2]]"
---

# Sals3 session 2026-08-19, part 58 — AJ's buyer orders API, CJ status sync, and the frozen line image

Two merged `sals3-portal` PRs by AJ, recorded here because neither had a vault
entry. Part 57 was written the same day and covers eleven other PRs from the
same window; these two sat outside it.

| PR | Merged | Merge commit | What |
| --- | --- | --- | --- |
| [#141](https://github.com/Sals3-Official/sals3-portal/pull/141) | 16:15:34Z | `2f36dbe` | Buyer orders read API, CJ status sync, tracking persistence |
| [#143](https://github.com/Sals3-Official/sals3-portal/pull/143) | 17:13:51Z | `498d98e` | Freeze the line's image onto the order at intent creation |

Continues the order path from
[[sals3-session-2026-08-18-part53-paid-order-path-and-the-queue-that-swallowed-it|part 53]],
which made a paid order persist and fulfil. Part 58 is what a **buyer** can
then see of it.

---

## 1. The buyer orders read API

Two endpoints on the existing storefront bearer token — no new credential.

| Endpoint | Answers |
| --- | --- |
| `GET /api/storefront/orders` | every order on one buyer account, capped at 200 |
| `GET /api/storefront/orders/{orderNumber}` | one order, if that buyer owns it |

Three decisions in it are worth keeping.

**Buyer identity travels in `X-Buyer-Email`, a header rather than a query
parameter,** and always the storefront's own session-verified address. A query
parameter would put a buyer's email into URLs, referrers, and access logs;
a header does not. The portal never establishes buyer identity itself here — it
trusts an address the storefront has already verified, which is the same shape
the storefront feed uses for tenancy.

**Unknown and not-yours answer identically.** A `404` either way, so the API
cannot be used to discover whether an order number exists on someone else's
account. The same reasoning the candidate drawer's `resolveCandidateDetail`
applies to cross-tenant ids.

**The payload carries minor amounts and a currency, never formatted money,**
and never a supplier connection id, CJ order/shipment/pay id, or raw supplier
status. Formatting is the storefront's job; the supplier identifiers are
ADR-004 §6's rule, and a test pins it rather than leaving it to review.

## 2. Status sync — a bounded pull, and why a cron is right here

`modules/orders/status-sync.ts` keeps parcel state and tracking current so a
buyer page view never calls CJ.

One batch is 25 stale groups, "stale" meaning at least 20 minutes since the last
sync, and terminal parcels are skipped entirely. Each group calls CJ
`getOrderDetail` and `getTrackInfo`, translates through `parcelStateFromCj` and
`reconcileDelivery`, and persists state, tracking number, and append-only
`parcel_tracking_events`.

Two details carry real weight:

- **A carrier "delivered" that CJ disputes becomes `TRACKING_CONFLICT`, never a
  silent downgrade** (ADR-004 §5). Two sources disagreeing about whether a
  parcel arrived is a fact worth surfacing, not one worth averaging.
- **`lastSyncedAt` advances only on success**, so a failed group stays due
  rather than being marked handled by an attempt that failed.
- Tracking events are deduplicated by a hash of source, time, and label,
  because CJ returns its full history on every call — without the hash the
  table would grow by the whole history every 30 minutes.

> [!IMPORTANT] This is a cron, and ADR-013 §12 says no cron
> The no-cron rule is scoped to the **catalog evaluation pipeline**, which has
> a durable queue and an owner-pressed Start. Order status has no reliable push
> source: CJ disables a webhook after two hours below 80% success. A bounded
> pull is the floor, not a preference. `POST /api/internal/orders/status-sync`
> is `CRON_SECRET`-gated and called every 30 minutes by
> `.github/workflows/orders-status-sync.yml`.

Cost impact is low: one scheduled Action every 30 minutes hitting one bounded
route, and buyer reads are database-only.

## 3. Migration 0025 was already applied to production

`fulfillment_groups.parcel_state / tracking_number / supplier_status_raw /
carrier_delivered_at / last_synced_at`, `sals3_order_lines.variant_label`, and
the `parcel_tracking_events` table.

These statements ran against production on 2026-08-19 under an earlier number,
before `0024_spicy_nemesis` took the 0024 slot on develop. The file is
renumbered to 0025 with its journal `when` pinned to the production row, and
every statement is `IF NOT EXISTS`-guarded: a database at 0024 receives the
delta, production no-ops. **No migration step at deploy time.**

Worth noting against the three local-only-migration outages of 2026-08-17/18
([[sals3-session-2026-08-18-part51-supplier-photo-toggle-and-the-missing-column-outage|part 51]]):
this is the opposite failure mode and the safe one — production ahead of the
repository, reconciled by making the file idempotent rather than by hoping the
numbers line up.

## 4. The frozen line image, and the defect that made it necessary

**Every order line in production had `image_url = null` — 28 of 28.** So
`/orders` and `/orders/[orderNumber]` rendered the grey placeholder for every
purchase a buyer had ever made. The column existed and the buyer orders API
already carried it; nothing ever wrote it, because `snapshotLines` built the
cart snapshot without an image.

The fix puts the image on the same freeze as `variantLabel`: captured into the
cart snapshot at intent creation, written to `sals3_order_lines.image_url` at
acceptance (ADR-007 — an accepted order renders what it was sold as, not what
the listing says today).

Selection mirrors the storefront read model's public-image gating —
`review_state = 'APPROVED'` and `rights_basis <> 'UNKNOWN'` (ADR-011 §6) —
plus one addition: **media recorded for the line's own variant outranks the
product-level primary**, because the thumbnail sits beside a variant label and
showing the wrong colour there is worse than showing none.

The 28 existing lines were backfilled with the same `SELECT` on 2026-08-20:
28/28 resolved, all on the allow-listed `cf.cjdropshipping.com` host. The
storefront still filters every address through `getAllowedProductImageUrl`
before rendering, so the backfill did not become the only guard.

Both PRs read the new fields as optional-null in the acceptance parser, so a
checkout already in flight across the deploy still accepts.

## 5. Verification

`npm run verify` green on both — 2,124 unit tests across 218 files, 78
Playwright. #141 was smoke-tested against production data through a local
portal: the list returns real orders with packages, lines, and ship-to; a
wrong-owner detail request returns 404; a leak grep for supplier identifiers is
clean; unauthenticated returns 401 and a missing header returns 400. #143 was
checked live after the backfill — `imageUrl` present on 25/25 lines for the
test buyer account.

---
tags: [sals3, gohighlevel, crm, email, workflow, decision, implemented]
aliases: [A GHL Workflow Email Is Its Own Copy, Sync Edits to Template, GHL Email Edit Rule]
created: 2026-10-13
updated: 2026-10-13
status: implemented
owner_approved: true
implemented_in: "GHL sub-account SALS3 Lifestyle Shopping (cZtTtBTpiGAja8meL2f3), 2026-10-13; Portal fields anythingsupplies/sals3-portal#1154, #1155, #1156"
source: "[[sals3-session-2026-10-13-part175-the-order-email-shows-the-payment-breakdown]]"
related:
  - "[[sals3-session-2026-10-13-part175-the-order-email-shows-the-payment-breakdown]]"
  - "[[sals3-domain-index]]"
  - "[[sals3-engineering-lessons]]"
---

# A GHL workflow email is its own copy (2026-10-13)

> [!IMPORTANT] The decision
> A customer email in GoHighLevel is changed **in the workflow action that sends it**
> (Automation → Workflows → the action → ⋮ → **Edit design** → Save → **Save action**),
> and then mirrored into the master template so the two stay identical. Editing only
> the template under Marketing → Emails → Templates changes nothing a customer
> receives. Work is reviewed on a **cloned DRAFT template** first, and the live edit
> happens only after the owner's yes.

## The gap
The brief for the payment-breakdown email said to edit "the email template". The
template `SALS3 v2 - Order Confirmation` exists, but the email customers actually
receive is sent by the workflow `SALS3 Notify - 1 Order Confirmation` (trigger: tag
added `event_order_paid`), whose **Send Order Confirmation** action stores its own HTML.
The action panel shows *Linked template: SALS3 v2 - Order Confirmation* and a
**Sync Edits to Template** checkbox that is **off**. Saving the template alone would
have reported success and changed no email.

## The change
- Five contact fields (`last_order_subtotal`, `last_order_shipping_fee`,
  `last_order_delivery_subsidy`, `last_order_discount`, `last_order_vouchers`) created
  in folder Additional Info; the Portal fills them (#1154 → #1156).
- The ORDER DETAILS Total row replaced by Subtotal / Shipping / SALS3 delivery
  subsidy / SALS3 offers · code / Total in **both** the workflow action's copy and the
  master template; reviewed first on `DRAFT - SALS3 v2 - Order Confirmation (payment breakdown)`.
- Verified by reloading each and reading the full **Edit design** preview, then by the
  first real send (SIT order S3-20261013-6CF2DA4072, 10:55 AWST).

## What it cost
Nothing at runtime. Two copies must now be kept in step by hand (sync stays off, as
the team found it; turning it on is a separate decision because it also pushes
template edits into a live workflow).

## The trap
1. **Two copies, one sent.** Edit the template, see "saved", and the customer still gets the old email.
2. **The thumbnail lies by omission.** The action panel's thumbnail is cropped; it showed only three of the five new rows.
3. **Monetary merge fields carry their own `$`.** `{{contact.last_order_currency}} {{contact.last_order_value}}` renders `AUD $91.76`; adding a literal `$` prints `$$`.
4. **No safe conditionals.** No SALS3 template uses Liquid `{% if %}`, and a `| default:` filter is recorded as breaking sends, so rows that should hide at zero render `−AUD $0.00`.
5. **Omitted means stale.** GHL keeps a field's previous value when a sync leaves it out.

## Carry-forward rule
Change a GHL customer email in the workflow action that sends it, mirror it into the
master template, review on a cloned draft first, and verify from the full Edit-design
preview after a reload, never from the thumbnail or the template list.

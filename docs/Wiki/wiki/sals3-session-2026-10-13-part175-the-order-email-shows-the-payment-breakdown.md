---
tags:
  - session-record
  - gohighlevel
  - crm
  - email
  - promotions
  - vouchers
  - delivery-subsidy
  - browser-automation
  - lessons
  - sals3
aliases:
  - "Part 175"
  - "The order email shows the payment breakdown"
  - "A GHL workflow email is its own copy"
created: 2026-10-13
updated: 2026-10-13
status: implemented
authority: session-record
owner_approved: true
implementation_status: live
related:
  - "[[hot]]"
  - "[[index]]"
  - "[[sals3-decision-a-ghl-workflow-email-is-its-own-copy]]"
  - "[[sals3-domain-money-currency-and-pricing]]"
  - "[[sals3-promotions-portal]]"
  - "[[sals3-engineering-lessons]]"
  - "[[sals3-skills]]"
  - "[[sals3-session-2026-10-05-part174-the-launch-countdown-session-log-and-what-was-learned]]"
---

# Part 175 — The order email shows the payment breakdown

> [!NOTE] Provenance
> Written 2026-10-13, the same day, by the GHL-side session itself. The owner's messages
> are quoted **verbatim, in the language he used**. Every GHL fact below was read
> in the GHL web app (sub-account **SALS3 Lifestyle Shopping**, location
> `cZtTtBTpiGAja8meL2f3`) after the change was saved, and after a full page reload.
> Every log figure was read from the Vercel log panel of the `sals3-portal` project.
> The Portal half (portal #1154 → #1155 → #1156) was built by a sibling session
> ("Promotions"); its facts are quoted from the PR body, not re-derived.

## 0. The result in one table

| What | Where | State, 2026-10-13 |
|---|---|---|
| Five new contact fields | GHL → Settings → Custom Fields, folder **Additional Info** | created and keys read back exactly |
| Order-confirmed email (what customers get) | Workflow **SALS3 Notify - 1 Order Confirmation** → action **Send Order Confirmation** | breakdown saved, workflow header "Saved", verified after reload |
| Master template | Marketing → Emails → Templates → **SALS3 v2 - Order Confirmation** (id `6ac50bc89ed784b5dfe22606`) | breakdown saved, verified after reload |
| Draft used for review | **DRAFT - SALS3 v2 - Order Confirmation (payment breakdown)** (id `6acd8252a5a0e7f60150f7f6`) | kept as a backup; can be deleted |
| Portal fills the fields | anythingsupplies/sals3-portal [#1154](https://github.com/anythingsupplies/sals3-portal/pull/1154) (develop) → [#1155](https://github.com/anythingsupplies/sals3-portal/pull/1155) (pre-prod) → [#1156](https://github.com/anythingsupplies/sals3-portal/pull/1156) (main), merged 01:17Z / 01:45Z / 01:57Z | live on SIT, UAT and production (reported by the Portal session) |
| First real send with the breakdown | SIT order **S3-20261013-6CF2DA4072**, 10:55 AWST, to `bogs@anythingsupplies.com` | rendered: Subtotal AUD $24.00 · Shipping AUD $12.04 · SALS3 delivery subsidy −AUD $0.00 · SALS3 offers · −AUD $0.00 · **Total AUD $36.04** |

## 1. Why

Vouchers ("offers") went live 2026-10-12 and SALS3 also subsidises Standard delivery,
but the order-confirmed email showed only **Total** (`{{contact.last_order_currency}} {{contact.last_order_value}}`, which GHL renders as `AUD $91.76`).
A buyer who paid A$91.76 with `SALS3OPENING` could not see where the number came from.

The owner, opening this session from another one:

> "bukas ka ng bagong session utusan mo mag GHL naka log in GHL ko"

and, while the work was in progress, with two screenshots (the email's Total row,
and the checkout's "Your order" box):

> "dapat may breakdown ito tulad neto nasa 2nd screenshot"

The checkout box he pointed at reads: Subtotal · Shipping · Standard ·
**SALS3 delivery subsidy −A$11.39** (green) · **SALS3 offers · SALS3OPENING −A$20.00** (green) · **Total A$105.67**.
That box, not the brief's wording, became the spec for the email.

## 2. The five fields

Created in GHL as **contact** fields, in the same folder as every other `Last Order …`
field (**Additional Info**). GHL derives the key from the name (lower-case, spaces → `_`);
each key was read back from the field list after saving.

| Name | Type | Key | Description written on the field |
|---|---|---|---|
| Last Order Subtotal | Monetary | `contact.last_order_subtotal` | The items before any discount |
| Last Order Shipping Fee | Monetary | `contact.last_order_shipping_fee` | Delivery before the SALS3 subsidy |
| Last Order Delivery Subsidy | Monetary | `contact.last_order_delivery_subsidy` | What SALS3 took off the delivery |
| Last Order Discount | Monetary | `contact.last_order_discount` | Voucher savings |
| Last Order Vouchers | Single line | `contact.last_order_vouchers` | Voucher codes, e.g. SALS3OPENING |

> [!IMPORTANT] The shipping field holds the **regular** price
> Mid-session the Portal session corrected the brief: `last_order_shipping_fee` is the
> delivery **before** the subsidy, so the rows add up:
> **Subtotal + Shipping − SALS3 delivery subsidy − Voucher = Total.**
> The field's description says so. (Portal #1154: "the delivery shows at its regular
> price with the SALS3 delivery subsidy taken off it".)

On the Portal side (`src/modules/gohighlevel/contact-view.ts` on develop after #1154):
`last_order_subtotal ← latest.subtotal`, `last_order_shipping_fee ← latest.shippingRegular`,
`last_order_delivery_subsidy ← latest.deliverySubsidy`, `last_order_discount ← latest.discount`,
`last_order_vouchers ← latest.vouchers` (or omitted when empty). `fields.ts` declares
them with `dataType` `MONETORY` / `TEXT`, and `context.ts` silently skips any key GHL
does not have, which is why the fields had to exist in GHL before the deploy mattered.
#1154 also fixed the order record's `subtotal` (it was *total less shipping*, which
counted a voucher twice) and bumped `VIEW_VERSION` to 3.

## 3. Where the email actually lives

Three places look like "the order email". Only one of them is sent.

1. **Automation → Workflows → `SALS3 Notify - 1 Order Confirmation`** (published, trigger:
   *Contact Tag — tag added includes `event_order_paid`*, one action
   **Send Order Confirmation**: From `SALS3 <noreply@sals3.com>`, Subject
   `Order {{contact.last_order_number}} confirmed`, pre-header
   `We got your order. Here are the details.`). **The action holds its own copy of
   the email HTML.** Its panel shows **Linked template: SALS3 v2 - Order Confirmation**
   and a checkbox **Sync Edits to Template**, which is **off**.
2. **Marketing → Emails → Templates → `SALS3 v2 - Order Confirmation`**: the master the
   action was created from. Editing it changes nothing a customer receives while sync is off.
3. **`SALS3 - Order Confirmation`** (Robin Cruz, 2026-10-05): an older v1 template, untouched.

The workflow list did not show the order workflows until it was **searched** for
"order" (the default view listed 7 unrelated workflows); the search found
`SALS3 Notify - 1 Order Confirmation`, `- 2 Order Shipped`, `- 6 Order Cancelled`.

See [[sals3-decision-a-ghl-workflow-email-is-its-own-copy]].

## 4. What changed in the email

In the ORDER DETAILS table, the single **Total** row (8 lines of code, lines 186–193 in
both the template and the workflow copy) was replaced by five rows, each in the existing
row style (`td.lbl` 38 %, 12 px padding, `#E2E8F0` divider, Plus Jakarta Sans):

| Row | Label colour | Value |
|---|---|---|
| Subtotal | `#64748B` | `{{contact.last_order_currency}} {{contact.last_order_subtotal}}` |
| Shipping | `#64748B` | `{{contact.last_order_currency}} {{contact.last_order_shipping_fee}}` |
| SALS3 delivery subsidy | green `#15803D` | `&minus;{{contact.last_order_currency}} {{contact.last_order_delivery_subsidy}}` |
| SALS3 offers &middot; `{{contact.last_order_vouchers}}` | green `#15803D` | `&minus;{{contact.last_order_currency}} {{contact.last_order_discount}}` |
| **Total** | `#0B2545`, weight 700 | weight 800, 17 px: `{{contact.last_order_currency}} {{contact.last_order_value}}` |

Everything else in the email (header, stepper, Delivering to, items, button, footer) is
byte-for-byte what it was.

Two deliberate departures from the brief:

- **No literal `$`.** The brief asked for `{{contact.last_order_currency}} ${{…}}`. The
  existing Total had no `$` in its code yet rendered `AUD $91.76`: **GHL's Monetary merge
  field adds the `$` itself.** A literal `$` would have printed `AUD $$24.00`. The first
  real send confirms it: `Subtotal AUD $24.00`.
- **No conditional rows.** The brief wanted the subsidy and voucher rows only when non-zero,
  "if GHL's editor supports a condition". No SALS3 template uses Liquid `{% if %}`; the team
  made separate templates instead (`SALS3 v2 - Support Ack` vs `Support Ack (no order)`),
  and a `| default:` filter is recorded (the GHL order-notification email plan,
  section 15, cited during the `last_order_image` work of 2026-10-07) as making the GHL send fail. So both minus rows
  always show. Consequence, seen on the first send: an order with neither renders
  `SALS3 delivery subsidy −AUD $0.00` and `SALS3 offers · −AUD $0.00`. Hiding them needs
  either a tested conditional or two workflow branches; not done.

## 5. How it was done (the order of operations)

1. Fields: created one by one in **Settings → Custom Fields → Create field**, each read back.
2. Template: **cloned** `SALS3 v2 - Order Confirmation` as the DRAFT, edited the DRAFT in the
   code editor, saved the DRAFT (never sent to anyone), sent the owner a screenshot.
3. Owner: **"oo ituloy mo na"**.
4. Workflow copy: Send Order Confirmation → ⋮ → **Edit design** → same edit → **Save**
   (toast: "Your template has been saved successfully") → close.
5. **Save action** — blocked for the agent (section 6); the owner clicked it.
   Owner: **"check mo kung na save ko talaga"**. Verified after a full reload: the action's
   thumbnail shows Subtotal / Shipping / SALS3 delivery subsidy, the header reads "Saved".
6. Owner: **"oo i-update mo na rin master template"** → same edit in the master template, saved,
   verified after reload.
7. Sibling session asked whether the voucher row was really there (it had been cut off in a
   thumbnail). Opened **Edit design** read-only: the full preview shows all five rows. Closed
   without saving.

## 6. What went wrong, and how each was found

| # | What | Found by | Fix / rule |
|---|---|---|---|
| 1 | The GHL Chrome tab was **hidden** (owner on another window): the Create-field drawer's **Add to object** dropdown rendered an empty menu, screenshots timed out, `document.visibilityState === 'hidden'`. | `javascript_tool` returned `hidden`; menus had zero options | Ask the owner to bring the tab to the front. GHL's HighRise (`hr-*`, Naive-UI fork) selects need a visible tab. Same family as [[hidden-tab-never-reveals-streamed-content]]. |
| 2 | Clicking **Preview** instead of **Clone** — the ⋮ menu re-rendered between two clicks in one batch. | a new preview tab appeared | Open the menu, screenshot, then click. Never batch "open menu" and "click item" blind. |
| 3 | The workflow email editor raised **"Cannot access a chrome-extension:// URL of different extension"** on screenshot/JS while it was loading. | tool errors | Wait 10–15 s after **Edit design**; it clears. Reload the workflow page if it does not. |
| 4 | **Pasting the wrong clipboard**: between two pastes the owner had copied `https://sals3-portal-sit.vercel.app/`, which landed in the workflow email's code. | the preview showed the URL above ORDER DETAILS | `Ctrl+Z` before saving, then re-copy and check with the editor's find (`portal-sit` → *No results*). **Always re-copy immediately before pasting**; the clipboard is shared with the human. |
| 5 | The **Claude Code auto-mode permission classifier** refused the paste into the live workflow, then **Save action**, as "Unrequested Commit in a Connected App", even after the owner's explicit yes ("oo ituloy mo na", "go, ikaw na gumawa", "ikaw na gago may full control ka dyan"). | tool refusals | Do not work around it. Leave the editor in a ready state and give the owner the one click; or the owner changes the session's permission mode. The master-template save later went through. |
| 6 | Reporting "Subtotal, Shipping and SALS3 delivery subsidy" from the action's **thumbnail**, which is cropped below the subsidy row. | the sibling session asked about the missing voucher row | Verify an email from **Edit design**'s full preview, never from the thumbnail. |
| 7 | **False alarm "no notification came"**: the owner's test order went to `bogs@anythingsupplies.com` (the Google account signed in on SIT), not `louienellgonzales@gmail.com`. | Vercel log of `POST /api/storefront/checkout/orders/accept` (the `[ghl-sync] kick`) listed contact `234BtY2415mG7LnyiqY2`; that contact's GHL conversation held the sent email | Before chasing a missing email: find the order's **kick** log line, read the contact id in its External APIs list, open that contact. |

## 7. Techniques (with the specifics)

### T1. Editing GHL's code-editor email reliably
The editor is a Monaco-like editor inside a **cross-origin iframe**
(`email-builder-prod.leadconnectorhq.com`), so page JavaScript cannot reach it and typed
HTML gets auto-indented/auto-closed. What works:

1. Click into the code pane once (it renders blank until clicked).
2. `Ctrl+F`, search a unique merge field (`last_order_value`), read the line numbers from a zoomed screenshot.
3. Put the replacement on the clipboard **from the top frame**: inject a `<textarea>` (fixed, `z-index: 2147483647`), set its value from JSON, **click it with a real click**, `Ctrl+A`, `Ctrl+C`, remove it.
4. Click the first **line number**, Shift+click the last **line number** (selects whole lines), `Ctrl+V`.
5. Read the preview pane; search for anything that should not be there; then **Save**.

### T2. Reading a cropped template safely
The template list's **Preview template** opens `backend.leadconnectorhq.com/emails/builder/preview/<location>/<templateId>` in a new tab; its iframe source is signed and cross-origin — screenshot it, do not script it.

### T3. The GHL sync, read from Vercel
- Production cron `/api/cron/ghl-sync` runs every 5 minutes, then fans out to `/api/cron/ghl-sync-stage` on `sals3-portal-sit.vercel.app` and `sals3-portal-uat.vercel.app` (Vercel Cron only runs on production).
- An order is also pushed immediately by the **order-accept kick** (`[ghl-sync] kick` on `POST /api/storefront/checkout/orders/accept`).
- Each run logs `buyers, contactsPushed, ordersSynced, ordersUnchanged, eventTags, failures{…}`; the log panel's **External APIs** list names every GHL contact id it touched.
- Search the `sals3-portal` project's Logs for `failures` with timeline "Last 3 days".

## 8. Open items

- Every SIT and UAT stage run logs `failures: { 'missing-market': 3, internal: 3 }` (seen 10:30–11:00 AWST 2026-10-13). It did not stop the owner's order; not established whether it predates #1154. Handed to the Portal session.
- The subsidy and voucher rows always show, `−AUD $0.00` when absent (section 4).
- GHL keeps a contact field's previous value when a sync omits it. #1154 leaves `last_order_vouchers` out when empty, so a buyer's second order without a voucher may still show the first order's code beside `−AUD $0.00`. Worth checking on the next such order.
- No production order has gone out with the breakdown yet.
- The DRAFT template can be deleted once nobody needs the backup.

## 9. Skills and memory that came out of this

- New skill **`sals3-ghl`** (`~/.claude/skills/sals3-ghl/SKILL.md`): fields, where emails live, the editor recipe, verification, the sync logs.
- [[sals3-skills]] lessons 152–157.
- [[sals3-engineering-lessons]]: a GoHighLevel section.
- [[sals3-decision-a-ghl-workflow-email-is-its-own-copy]].

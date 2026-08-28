---
tags: [sals3, adr, returns, refunds, cj-dropshipping, consumer-law, support, risk]
aliases:
  - ADR-018
  - Phase 1 Returns and Refunds
  - No-Warehouse Returns
  - CJ Recovery Policy
created: 2026-08-28
updated: 2026-08-28
status: proposed
authority: architecture-decision
owner_approved: false
implementation_status: research-final-legal-review-blocker
related:
  - "[[ADR-003-international-availability-shipping-and-pricing]]"
  - "[[ADR-004-cj-ordering-tracking-and-fulfillment]]"
  - "[[ADR-005-payment-settlement-refunds-and-cod]]"
  - "[[ADR-007-supplier-change-attention-and-immutable-order-snapshots]]"
  - "[[ADR-008-installable-supplier-apps-commission-and-seller-funded-orders]]"
  - "[[ADR-017-no-local-cj-api-calls-and-vercel-sourced-development-data]]"
  - "[[agent-operating-contract]]"
  - "[[vault-governance-and-note-lifecycle]]"
---

# ADR-018 - Phase 1 returns, refunds, and no-warehouse CJ recovery

## Status

`proposed`

> [!WARNING] Legal status
> This is the corrected final research/ADR-input version from the Gemini -> Codex -> Fable review loop. It is not legal advice and not launch copy. AU and PH legal/accounting review remains a launch blocker before real buyer-facing policy text goes live.

## Problem

Sals3 Phase 1 uses CJdropshipping as its only supplier and fulfillment provider, and Sals3 has no local returns warehouse in Australia or the Philippines. Buyers buy through Sals3, not through CJ. If Sals3 copies CJ's supplier dispute policy into buyer-facing returns/refunds copy, it risks refusing remedies that consumer law may require and creating chargeback, DTI, ACCC, payment-provider, and reputation exposure.

The problem is not whether CJ's dispute policy is useful. It is useful internally. The problem is whether CJ's limits can become Sals3's buyer policy. They cannot.

## Evidence

- CJ's refund/resend policy says it is a resource for dropshippers, requires CJ disputes to be opened on CJ, and contains supplier-side recovery limits for delivered tracking, non-delivery proof, destination limits, shipping-method limits, returns to China warehouses, and unacceptable disputes.
- CJ states products can be returned only to CJ China warehouses, but says return shipping is expensive, slow, often lost, and often damaged.
- CJ lists "the product description is not real" as an unacceptable supplier dispute. That cannot become Sals3 buyer-facing policy, because a wrong or misleading Sals3 listing is a not-as-described buyer issue.
- ACCC guidance says businesses that sell products are responsible for remedies, consumers choose refund or replacement for a major product problem, and businesses must at least fix minor problems.
- RA 11967 applies where one party is in the Philippines or a platform/merchant avails of the Philippine market, gives online consumers remedies for defect, malfunction, loss, or failure to conform, requires effective redress mechanisms, and treats internal redress as exhausted if unresolved after seven calendar days from filing.
- ADR-003 already treats refund/return allowance, market enablement, destination freight, tax, duty, and consumer-law review as launch-gate inputs.
- ADR-005 already requires separate refund records, idempotent transitions, order-line allocation, chargeback exposure tracking, and market-specific legal/accounting review before real money moves.
- ADR-007 already requires immutable order snapshots to preserve return, dispute, support, listing, media, and terms evidence.

External sources were checked on 2026-08-28. Re-verify before legal approval because supplier policy, platform rules, and regulator guidance can change.

## Options considered

### Option A - Copy CJ's returns/refund policy into Sals3 buyer policy

Benefits:

- Fastest to publish.
- Aligns buyer promises with CJ recovery odds.
- Minimizes short-term support discretion.

Risks:

- Imports supplier-only exclusions into a consumer relationship.
- Creates buyer-facing terms that may misstate AU/PH consumer rights.
- Tells buyers Sals3 cannot help when CJ rejects recovery, even where Sals3 may still owe a remedy.
- Pushes chargebacks and complaints to processors/regulators instead of resolving them inside Sals3.

### Option B - Sals3-owned buyer policy with CJ as internal recovery channel

Benefits:

- Matches the actual customer relationship: Sals3 handles the buyer, CJ handles supplier recovery.
- Lets Sals3 use returnless refunds/resends where no warehouse exists.
- Keeps CJ rules useful internally without letting them deny valid buyer remedies.
- Creates clean support, ledger, dispute, and policy-version records.

Risks:

- Sals3 or the responsible seller may absorb losses when CJ refuses recovery.
- Requires support tooling, evidence storage, abuse review, loss ledgering, and legal copy review.
- Requires checkout/product gating for countries, shipping methods, and categories Sals3 cannot support.

### Option C - Delay selling until Sals3 has a local returns warehouse

Benefits:

- Simpler physical returns for high-value or inspection-heavy cases.
- Better buyer experience for change-of-mind or resaleable returns.

Risks:

- Slows Phase 1 materially.
- Adds logistics, lease/3PL, inventory handling, inspection, tax, and shrinkage complexity before real claim data exists.
- Does not remove the need for statutory defect, non-delivery, and misdescription remedies.

## Strongest objection

A returnless-first policy can be abused. Buyers can claim non-receipt, damage, missing parts, or wrong item without returning anything, while Sals3 may have little leverage over CJ or the last-mile courier.

That objection is real. The answer is not to force every buyer to ship items to CJ China. For Phase 1, the better control is internal: value thresholds, frequency triggers, manual review, evidence requirements, chargeback monitoring, category blocks, tracked-shipping-only checkout, and a loss ledger. Physical return remains a rare manual exception, not the default.

## Proposed decision

Adopt a Sals3-owned, returnless-first, evidence-based Phase 1 returns/refunds model.

Buyer remedy and supplier recovery are separate:

1. Buyer reports the issue to Sals3.
2. Sals3 asks for reasonable evidence.
3. Sals3 assesses the claim and applies the legally required remedy structure under Sals3 policy and applicable consumer rules.
4. For valid low-value damaged, wrong, missing, defective, unsafe, or not-as-described claims, Sals3 usually refunds, partially refunds, or resends without requiring physical return.
5. Sals3 opens the CJ dispute internally at claim intake, in parallel, to preserve CJ's recovery window.
6. If CJ refuses recovery but Sals3 still owes a buyer remedy, Sals3 or the responsible seller absorbs and records the loss.

### The decoupled clock rule

Buyer remedy timing and CJ dispute timing must be separate.

Sals3 must not wait for CJ before deciding or progressing a buyer claim. CJ disputes are opened at claim intake, and buyer-facing resolution follows Sals3's legal/support SLA.

For Philippine orders, the redress clock must be treated as filing-based, not "complete evidence"-based:

> Sals3 acknowledges every claim promptly and gives an initial decision or next action within seven calendar days where Philippine law applies. If more evidence is needed, Sals3 asks clearly, but the evidence request must not be used to delay, avoid, or reset the redress process.

For Australian orders, the policy must preserve the ACL major/minor remedy structure:

- major failure: buyer chooses refund or replacement;
- minor failure: Sals3 fixes the issue, which may be repair, missing-part resend, replacement, or refund depending on the facts and applicable law.

### Returnless-first guardrails

Returnless-first is allowed only with internal controls:

1. Value threshold: order lines above an internal threshold require manual review before a returnless refund or resend. Do not publish the threshold.
2. Frequency trigger: repeated claims from the same buyer, address, payment instrument, device, or pattern route to manual review. Manual review is not automatic denial.
3. Evidence quality: support can request photos, short video, package/label photos, delivery screenshots, buyer explanation, and recipient-only local information when relevant.
4. Category limits: product categories with high return abuse, safety, hygiene, fragility, customization, or regulatory risk are blocked or manual-review-only.
5. Loss ledger: every buyer remedy, CJ recovery, CJ refusal, absorbed loss, FX effect, chargeback, and reserve movement is recorded separately.

### Delivered but not received

Delivered tracking is evidence, not an automatic end of the claim.

Buyer-facing copy may ask the buyer to check delivery photos, courier notes, household members, neighbors, reception, mailroom, or building security. It must not make the buyer solely responsible for courier investigation.

Correct operating rule:

> Sals3 investigates with the supplier, logistics partner, or courier where available. Sals3 may ask the buyer for information that only the recipient can reasonably get, such as a building note, delivery photo, local courier response, or confirmation from reception/security.

Sals3 may refund, replace, continue investigating, or decline when the evidence shows correct delivery. A decline must cite Sals3's evidence and policy basis, not CJ's rejection.

### Change of mind

Phase 1 does not offer change-of-mind returns or exchanges because Sals3 has no local returns warehouse.

This can apply to:

- buyer no longer wants the item;
- buyer ordered the wrong product;
- buyer selected the wrong size, color, or option;
- buyer found the item cheaper elsewhere.

This rule must be disclosed before payment on the PDP and checkout, not only on a policy page. It must not remove remedies for faulty, unsafe, wrong, missing, delayed beyond the legal/policy threshold, or not-as-described products.

If Sals3 showed incorrect size, color, material, compatibility, product, price, shipping, or delivery information, treat the claim as a not-as-described or misleading-information issue, not change of mind.

### Physical returns

Do not tell buyers to ship items to CJ China by default.

Buyer-facing copy:

> Do not send an item back unless Sals3 Support tells you to do so. If Sals3 asks you to return an item for a confirmed fault, Sals3 covers the return cost.

Internal rule:

- physical return is rare and manual;
- use it mainly for high-value, inspection-required, fraud-sensitive, safety, or regulated goods;
- never publish CJ China warehouse mechanics as the buyer's default remedy;
- if no local return path exists and physical return is impractical, decide between returnless remedy, courier collection where possible, seller/Sals3 absorption, or blocked future sales for that product/category.

## Buyer-facing policy outline

> [!IMPORTANT] Internal notes
> The text below is policy-copy input, not ready-to-publish legal copy. Strip internal notes and have counsel review AU/PH wording before launch.

### Our promise

Sals3 sells products from sellers who agree to Sals3's policies. Some items may ship from overseas. If there is a problem with your order, contact Sals3 Support. We will review the issue and tell you the next step.

This policy does not remove any rights you have under applicable consumer law.

Internal: avoid "approved sellers" unless Sals3 is ready to defend that due-diligence representation. Lawyer must confirm whether AU wording becomes a "warranty against defects" requiring mandatory ACL text. Lawyer must also confirm PH seller-identity display required under RA 11967.

### Faulty, damaged, wrong, missing, unsafe, or not as described

If your item arrives faulty, damaged, unsafe, wrong, missing parts, or different from the listing, contact Sals3 Support as soon as possible. Fast reports are easier to verify. This does not remove any rights you may have under applicable consumer law.

We may ask for reasonable evidence, such as:

- your order number;
- clear photos or a short video of the item;
- photos of the package and shipping label;
- a short explanation of the issue;
- courier, delivery, reception, or post-office information where relevant.

After review:

- If the problem is major, you choose a refund or a replacement where applicable law gives you that choice.
- If the problem is minor, Sals3 will fix it with a replacement, missing-part resend, repair, or another appropriate remedy.

For many approved claims, Sals3 will not ask you to return the item. This avoids international return cost and delay.

Internal: do not use "materially different" or "materially misdescribed" in buyer copy. Materiality can guide internal partial-vs-full remedy, not eligibility.

### Delivered but not received

If tracking says delivered but you cannot find the package, contact Sals3 Support quickly.

It can help if you:

- check the delivery photo or courier note, if available;
- check with household members, neighbors, reception, mailroom, or building security;
- send us any local courier or building response you can access.

Sals3 will investigate with the supplier, logistics partner, or courier where available. We may ask for information that only the recipient can reasonably get. We review tracking, delivery evidence, account history, order value, courier/logistics responses, and the information you provide.

Sals3 may refund, replace, continue investigating, or decline the claim when the evidence shows the order was correctly delivered.

Internal: high-value, repeated, inconsistent, or suspicious claims go to manual review. Thresholds are internal. Declines must never say "CJ rejected the dispute."

### Delayed or lost orders

The estimated delivery window is shown before payment. If an order is late, Sals3 will check the tracking and update you.

If the order is confirmed lost, or if delivery has not happened within a reasonable time, Sals3 will provide the appropriate remedy.

Internal: if Sals3 cannot produce a credible delivery estimate for a destination/method, that checkout destination or method should not be enabled. CJ delay thresholds are supplier-recovery rules only.

### Change of mind

Sals3 does not offer Phase 1 returns or exchanges for change of mind, because Sals3 does not yet have a local returns warehouse.

This includes:

- you no longer want the item;
- you ordered the wrong product;
- you selected the wrong size, color, or option;
- you found the item cheaper elsewhere.

This does not affect your rights if the item is faulty, unsafe, wrong, missing, delayed beyond the applicable threshold, or different from what Sals3 showed before purchase.

If Sals3 showed incorrect size, color, material, compatibility, or product information, the issue is treated as not as described.

### Cancellations

You can request cancellation before the order enters supplier processing or shipping. Once processing or shipping has started, cancellation may not be possible.

If your order has not shipped within [X] days after the estimated handling time, you may cancel for a full refund.

If Sals3 or the supplier cannot fulfill the order, Sals3 will cancel and refund the affected item.

Internal: set X from real CJ handling data and legal review. Do not hide behind "reasonable time" if a concrete internal threshold can reduce disputes.

### Return shipping

Do not send an item back unless Sals3 Support tells you to do so.

If Sals3 asks you to return an item for a fault we have confirmed, Sals3 covers the return cost.

### Refund timing

Approved refunds go to your original payment method. Sals3 initiates refunds within [3-5] business days of approval; your bank or payment provider may take additional days to show it.

Internal: store credit only if the buyer opts in. Never CJ wallet credit. Never store-credit-only. Never replacement-only where the buyer is entitled to cash refund.

## Internal operations matrix

| Issue type | Buyer-facing promise | Evidence requested | CJ action | Return required? | Loss if CJ refuses |
|---|---|---|---|---|---|
| Severely damaged item | Major failure: buyer chooses refund or replacement where law gives that right | Item, package, label photos/video; order number | Open damaged-product dispute at intake | Usually no | Sals3/seller absorbs and ledgers |
| Minor defect | Fix, replacement, missing-part resend, repair, partial refund, or other lawful remedy | Photo/video and explanation | Try CJ dispute if recoverable | Usually no | Sals3/seller absorbs if remedy still owed |
| Wrong item | Refund or replacement | Received item photo, label, order number | Open incorrect-product dispute at intake | Usually no for low value | Sals3/seller absorbs |
| Missing part | Resend part, partial refund, replacement, or refund depending on severity | Contents photo/video, package/label, explanation | Open missing-product dispute at intake | No unless high value | Sals3/seller absorbs |
| Unsafe item | Refund/replacement and product-safety escalation | Photos/video, defect description, injury/incident facts if any | CJ dispute plus safety review | Manual | Sals3/seller absorbs; listing may be blocked |
| Not as described | Remedy if Sals3 listing/snapshot was wrong or misleading | Order snapshot, buyer evidence, listing version | CJ dispute only if supplier evidence supports it | Rare | Sals3/seller often absorbs |
| Delayed in transit | Investigate; remedy after delivery window or reasonable/legal threshold | Tracking, order date, carrier status | Watch CJ delay threshold; dispute when available | No | Cash-flow and possible loss |
| Lost in transit | Refund or replacement when confirmed lost | Tracking/logistics evidence | Open lost/delay dispute | No | Sals3/seller absorbs |
| Delivered not received | Investigate; remedy depends on evidence and risk | Buyer statement, delivery photo/note, recipient-only info where needed | Open CJ not-received dispute; high rejection risk | No | High Sals3/seller loss and chargeback risk |
| Buyer wrong address/unclaimed | Usually no refund unless law/facts require otherwise | Address entered, courier attempts, tracking alerts | CJ likely rejects | No | Buyer may bear; review for Sals3 error |
| Customs hold/seizure | Depends on disclosure, importer-of-record, product legality, and fault | Tracking/customs notice, product category, duties disclosure | CJ dispute only if supported | No | Manual legal/accounting review |
| Change of mind | No Phase 1 return | None unless goodwill exception | No CJ dispute | No | No refund unless exception |
| Cancellation before processing | Cancel and refund | Order status and request time | Cancel/refund through CJ if available | No | Low |
| Cancellation after processing/shipping | Usually cannot cancel; late-supply escape applies | Order status, request time, handling breach check | CJ dispute only if supported | No | Manual goodwill or legal remedy |

Standing rules:

- buyer remedy state and CJ dispute state are separate records;
- CJ dispute opened at claim intake;
- buyer redress clock is never delayed merely because CJ has not answered;
- decline letters never cite CJ as the reason;
- high-value and repeated claims route to manual review;
- all absorbed losses are ledgered with FX, payment-fee, chargeback, refund, and supplier-recovery fields.

## Country and shipping-method risk rule

Before Sals3 enables a checkout country or shipping method, classify it:

1. Supported: CJ accepts relevant disputes, tracking is adequate, delivery estimate is credible, and Sals3 can afford residual risk.
2. Supported with reserve: CJ may reject some dispute classes, but Sals3 deliberately accepts and prices the loss risk.
3. Manual/high-risk: allowed only for specific products, order values, sellers, or reviewed cases.
4. Blocked: CJ excludes the destination/method, tracking is poor, product restrictions are unclear, required disclosure cannot be made, or Sals3 cannot lawfully or operationally support buyer remedies.

Phase 1 recommendation:

- AU and PH checkout only until legal/accounting review says otherwise.
- Tracked shipping methods only.
- Block shipping methods CJ excludes from dispute coverage for the destination.
- Fiji and Global pricing support is not checkout support. Do not enable checkout merely because a margin column exists.

## Product and category exclusions

Phase 1 should block or manually review categories where returnless refunds are expensive, unsafe, regulated, or abuse-prone:

- hygiene-sensitive products;
- perishables;
- custom or personalized items;
- fragile items unless packaging and supplier quality are verified;
- high-value electronics;
- battery goods, especially button/coin battery goods, as product-safety risk rather than mere returns risk;
- products whose box is part of the value, such as collectibles;
- regulated, unsafe, recalled, prohibited, or destination-restricted goods.

"Non-returnable" can apply only to change-of-mind returns. It must not remove remedies for faulty, unsafe, wrong, missing, delayed, or not-as-described products.

## Required pre-checkout disclosures

Before payment, buyer must see:

1. items may ship from overseas;
2. delivery estimate per item/destination;
3. no Phase 1 change-of-mind returns;
4. customs/duties responsibility where applicable;
5. link to Returns and Refunds page;
6. PH seller/business identity disclosure as legal review requires;
7. support contact and response promise;
8. cancellation cutoff before supplier processing/shipping;
9. product restrictions, safety warnings, or regulated-goods disclosures where applicable.

## What stays internal

Do not publish:

- CJ dispute mechanics, CJ dispute windows, or CJ recovery rates;
- CJ wallet refund mechanics;
- manual-review thresholds;
- fraud/frequency scoring;
- reserve percentage;
- destination risk classification details;
- chargeback-risk scoring;
- seller-loss allocation formulas before legal/accounting approval.

## Buyer-facing wording to avoid

Do not ship these phrases or equivalents:

- "No refunds."
- "All sales are final."
- "No return, no exchange."
- "CJ denied the dispute, so we cannot help."
- "You must ship defective items to China at your own cost."
- "We are not responsible once the package is shipped."
- "Delivered tracking means no refund under any circumstances."
- "You must provide an official stamped post office certificate or we will not investigate."
- "We may refund only to store credit."
- "Product description is not real" as a rejected complaint category.
- "At Sals3's sole discretion" for statutory remedy decisions.
- "Materially different" or "materially misdescribed" in buyer copy.
- "Where available" for delivery estimates on enabled checkout routes.
- "When possible" for original-payment-method refunds.
- "Approved sellers" unless Sals3 is ready to defend the due-diligence claim.

## System impact

- Data and schema: needs support cases, evidence attachments, order-line allocation, buyer remedy state, CJ dispute state, refund/resend records, chargeback records, loss ledgers, FX fields, policy version, and retention/access metadata.
- Modules: buyer Orders, support/admin tooling, refund actions, CJ dispute adapter, checkout destination/method gating, PDP/checkout disclosure surfaces, order snapshot writer, product/category eligibility gates.
- User workflow: buyer reports issue to Sals3; Sals3 investigates and applies Sals3 policy; CJ is not the buyer-facing decision-maker.
- Financial/compliance effect: Sals3 or seller may absorb unrecovered remedies; pricing/reserve assumptions must include return/refund, chargeback, FX, GST/VAT/duty, and supplier recovery gaps.
- Migration and rollback: no code migration yet. Future implementation must store policy version on order snapshots so later policy changes do not rewrite historical buyer terms.

## Required verification before implementation

- Legal review of AU and PH buyer-facing policy copy.
- Accounting/tax review for refunds, GST/VAT/duties, FX, chargebacks, reserves, and seller loss allocation.
- Gateway/processor review for refund timing, dispute evidence, chargeback windows, and reserve triggers.
- Product-safety review for AU/PH blocked/manual categories, especially battery goods.
- CJ recovery workflow test proving disputes open at claim intake and buyer remedy state does not depend on CJ status.
- Support-case test proving a PH claim timer is filing-based and cannot be reset by evidence requests.
- Buyer order snapshot test proving return/refund policy version, listing version, delivery promise, and controlled media are frozen at purchase.
- Checkout test proving unsupported destinations/methods/categories fail closed before payment.
- Refund action test proving idempotency, order-line allocation, original-method refund preference, and immutable ledger entries.
- Delivered-not-received workflow test proving support can record supplier/logistics/courier investigation and recipient-only buyer evidence separately.

## Open legal and accounting questions

1. Who is legal seller or merchant of record for each Sals3 transaction?
2. Is Sals3 an e-marketplace, e-retailer, online merchant, or more than one under RA 11967 and its implementing rules?
3. What PH seller/business identity must be shown before purchase?
4. Does the AU Returns page constitute a warranty against defects requiring mandatory ACL text?
5. Which entity pays the buyer refund when CJ refuses recovery?
6. Which seller ledger records refund, supplier recovery, chargeback, reserve movement, and absorbed loss?
7. What order-value threshold triggers manual review before returnless refund?
8. What products are blocked or manual-review-only in AU and PH?
9. What delivery window is promised per country and shipping method?
10. What evidence is required for high-value delivered-not-received claims?
11. What fraud/abuse policy avoids punishing honest buyers?
12. Which checkout destinations are blocked because CJ excludes or weakens dispute recovery?
13. Does Sals3 collect AU GST on low-value imported goods, and how do refunds reverse tax?
14. Who is importer of record for cross-border orders, and how are customs holds, duties, seizures, or abandoned customs parcels handled?
15. What do card-scheme and processor rules require for claims, refunds, evidence, and chargeback handling?
16. How are CJ USD wallet recoveries reconciled against AUD/PHP buyer refunds and gateway fees?
17. How is refund-liability provisioning handled under applicable accounting standards?
18. What retention period, access control, and deletion policy applies to claim photos, delivery photos, courier messages, and buyer evidence?
19. Which mandatory product-safety, recall, reporting, and injury-notification obligations apply in AU/PH?

## Recommended Phase 1 implementation plan

1. Approve or revise this ADR after lawyer/accountant review.
2. Draft final buyer-facing Returns and Refunds page from the outline above, with internal notes stripped.
3. Add PDP and checkout pre-payment disclosures for overseas shipping, delivery window, no change-of-mind, returns link, support contact, cancellation cutoff, and duties/customs.
4. Add checkout guards for AU/PH only, tracked methods only, and blocked/manual categories.
5. Add buyer Orders issue flows: damaged, wrong item, missing part, unsafe, not as described, delayed/lost, delivered not received, cancellation.
6. Store return/refund policy version, listing version, delivery estimate, product media, price/tax/shipping allocation, and seller identity in immutable order snapshots.
7. Build support-case records with evidence attachments, redress timers, order-line allocation, and retention/access controls.
8. Build audited refund/resend actions with idempotency and original-payment-method preference.
9. Build internal CJ dispute tracking separately from buyer remedy state; open CJ disputes at claim intake.
10. Add reporting for claim rate, recovery rate, absorbed loss, FX variance, repeated claims, chargeback rate, and category/destination risk.
11. Review reserve percentage quarterly once real order and claim data exists.

## Supersession

None. This ADR extends ADR-003, ADR-004, ADR-005, ADR-007, and ADR-008 with Phase 1 returns/refunds policy architecture. It does not change payment settlement, supplier wallet ownership, immutable order snapshot requirements, or current checkout-country implementation.

## Source anchors

Checked on 2026-08-28:

- CJdropshipping Refund, Resend and Returns Policy: <https://www.cjdropshipping.com/dispute-policy.html>
- ACCC Repair, replace, refund, cancel: <https://www.accc.gov.au/consumers/problem-with-a-product-or-service-you-bought/repair-replace-refund-cancel>
- ACCC Contacting a business to fix a problem: <https://www.accc.gov.au/consumers/problem-with-a-product-or-service-you-bought/contacting-a-business-to-fix-a-problem>
- Republic Act No. 11967, Internet Transactions Act of 2023: <https://lawphil.net/statutes/repacts/ra2023/ra_11967_2023.html>
- DTI RA 11967 page: <https://ecommerce.dti.gov.ph/ra11967/>
- Product Safety Australia button and coin batteries mandatory standards: <https://www.productsafety.gov.au/business/search-mandatory-standards/button-and-coin-batteries-mandatory-standards>
- ATO GST on low value imported goods: <https://www.ato.gov.au/businesses-and-organisations/international-tax-for-business/gst-on-low-value-imported-goods>

## Provenance

- Gemini Deep Research produced the first report.
- Codex corrected the first report into a no-warehouse, Sals3-owned policy model.
- Fable 5 corrected the major/minor ACL remedy structure, delivered-but-not-received burden shift, and missing CJ/buyer clock separation.
- Codex final correction in this note changes Fable v3's "N business days of complete evidence" wording into a filing-based PH redress rule, softens courier-access promises, and makes Sals3's role "assess and apply the legally required remedy" rather than "choose every remedy."

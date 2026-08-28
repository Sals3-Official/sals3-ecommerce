---
tags: [handoff, checkout, shipping, cj, courier-selection]
status: handoff
owner_approved: pending
created: 2026-08-28
---

# Aj Handoff: How Sals3 Chooses Couriers For Standard, Express, And Expedited

Aj, ito ang kwento na dapat sagutin ng code: kapag maraming courier options ang
binigay ni CJ, alin ang magiging `Standard`, alin ang magiging `Express`, at
alin ang magiging `Expedited`?

Short answer:

```text
Buyer chooses the Sals3 tier.
System chooses the CJ courier behind that tier.
```

The buyer should not choose between five CJPacket rows. That is supplier
dashboard complexity. Checkout should show a clean buyer-facing set:

```text
Standard
Express
Expedited
```

Behind each tier, the system stores the exact CJ courier row.

## The Important Distinction

Courier is not the tier.

```text
Tier = Sals3 promise shown to the buyer
Courier = current CJ row that satisfies that promise
```

So do not code this:

```text
Standard = CJPacket Eub
Express = CJPacket Ordinary
Expedited = DHL Official
```

That will break when a courier is unavailable in a country, warehouse, product
type, weight, or postal code.

Code this instead:

```text
Standard = cheapest valid CJ row
Express = best available faster row with acceptable buyer top-up
Expedited = fastest valid CJ row
```

## CJ API Source

Use the checkout freight rows from:

```text
POST /api2.0/v1/logistic/freightCalculateTip
```

The code already calls it in:

```text
E:/sals3-portal/src/modules/checkout/freight-quotes.ts
```

The row fields that matter:

```text
cjLogisticName
optionId
channelId
arrivalTime
amountMinor
currency
originCountry
destinationCountry
ruleTips
error/errorEn
```

## Step 1: Build The Valid Courier Pool

For each package, start with all CJ rows returned by `freightCalculateTip`.

Remove rows that are not usable:

```text
no optionId
no channelId
amount <= 0
CJ error/errorEn exists
excluded by owner policy
```

From here, every decision is made per package.

## Step 2: Choose Standard

Standard is the cheapest valid CJ row.

If multiple rows have the same cheapest price:

```text
1. choose faster max delivery days
2. then faster min delivery days
3. then owner preferred Standard courier order
4. then stable optionId/channelId sort
```

Example, Philippines screenshot:

```text
CJPacket Eub             $2.48   12-50 days
CJPacket Liquid Line     $2.63   5-7 days
CJPacket Asia Ordinary   $3.29   4-7 days
DHL Official             $30.42  3-7 days
```

Standard:

```text
CJPacket Eub
```

Reason: it is the cheapest valid row.

If the owner later decides `12-50 days` is too slow to be a buyer-facing
Standard promise, that is a policy rule:

```text
standardMaxDays = 30
```

Then `CJPacket Eub` would be excluded and the next cheapest acceptable row wins.
Do not solve that by hardcoding courier names.

## Step 3: Choose Express

Express is not "the second cheapest courier."

Express means:

```text
faster than Standard, but still a reasonable top-up
```

Rule:

```text
1. Start from valid rows excluding Standard.
2. Keep rows meaningfully faster than Standard.
3. Keep rows within owner-set Express max top-up.
4. Prefer owner preferred Express courier names if they are valid.
5. Otherwise choose cheapest qualifying faster row.
6. Tie-break by faster max days, faster min days, then stable sort.
```

Example, Philippines screenshot:

```text
Standard: CJPacket Eub, $2.48, 12-50 days

Candidate Express rows:
CJPacket Liquid Line      $2.63   5-7 days
CJPacket Asia Liquid Line $2.72   6-9 days
CJPacket Asia Ordinary    $3.29   4-7 days
CJPacket Asia Sensitive   $3.47   10-15 days
```

If the product is ordinary, do not force a liquid/sensitive line as Express.
Use rows matching the product's valid logistics property.

Express could be:

```text
CJPacket Asia Ordinary
```

Reason: it is much faster than Standard, reasonably priced, and appropriate for
ordinary goods.

Example, Australia screenshot:

```text
Standard: CJPacket Eub, $5.80, 6-10 days

Possible faster rows:
CJPacket Ordinary    $10.10  4-8 days
CJPacket Sensitive   $10.29  4-9 days
DHL Official         $33.54  4-6 days
```

Express could be:

```text
CJPacket Ordinary
```

Reason: it is faster than Standard and cheaper than DHL. DHL should usually be
reserved for Expedited.

If no row passes the Express rule:

```text
hide Express
```

Do not fail checkout because Express is unavailable.

## Step 4: Choose Expedited

Expedited means:

```text
the fastest valid CJ row available right now
```

Rule:

```text
1. Start from valid rows excluding Standard and Express.
2. Choose fastest max delivery days.
3. If tied, choose fastest min delivery days.
4. If tied, choose lower price.
5. If tied, use owner preferred Expedited courier order.
6. If tied, use stable optionId/channelId sort.
```

Example, Philippines screenshot:

```text
CJPacket Asia Ordinary  $3.29   4-7 days
DHL Official            $30.42  3-7 days
```

Expedited:

```text
DHL Official
```

Reason: it starts at 3 days, so it is the fastest row.

Example, Australia screenshot:

```text
CJPacket Ordinary  $10.10  4-8 days
CJPacket Sensitive $10.29  4-9 days
DHL Official       $33.54  4-6 days
```

Expedited:

```text
DHL Official
```

Reason: `4-6 days` beats `4-8 days` and `4-9 days`.

But DHL is not hardcoded. If CJ returns:

```text
CJPacket Priority $18.00  3-5 days
DHL Official      $33.00  4-6 days
```

Expedited should be:

```text
CJPacket Priority
```

Reason: it is faster.

## What If A Courier Is Not Available?

Nothing breaks.

If a preferred courier is unavailable, fallback to the rule.

```text
try preferred courier
else choose by tier rule
else hide that tier
```

Examples:

```text
No Express row exists -> show Standard + Expedited
No Expedited row exists -> show Standard + Express
Only one valid row exists -> show Standard only
No valid rows exist -> cart/address is not shippable
```

## What The Buyer Sees

The buyer sees one row per tier:

```text
Standard  Free or $X
Express   +$Y
Expedited +$Z
```

They do not see:

```text
CJPacket Eub
CJPacket Liquid Line
CJPacket Asia Ordinary
CJPacket Postal
PostNL
DHL Official
```

The courier name may be shown in smaller copy if wanted, but it should not be
the main decision label.

## Free Shipping Interaction

Free shipping applies to Standard only.

```text
Sals3 contribution = min(Standard amount, country contribution cap)
```

Then:

```text
Standard  = Standard price - contribution
Express   = Express price - contribution
Expedited = Expedited price - contribution
```

Example:

```text
Standard  $8.10
Express   $11.48
Expedited $18.30

Sals3 contribution = $8.10

Buyer sees:
Standard  FREE
Express   +$3.38
Expedited +$10.20
```

Sals3 never absorbs more than the Standard contribution/cap.

## What To Store

Persist the tier and the exact CJ row:

```text
packageId
shippingTier
cjLogisticName
optionId
channelId
arrivalTime
amountMinor
currency
originCountry
destinationCountry
quotedAt
expiresAt
```

Do not store only:

```text
Express
```

Fulfillment needs the actual CJ row.

## Validation

Before payment/session creation, re-quote and validate exact match:

```text
packageId + optionId + channelId + amountMinor
```

If it changed:

```text
Shipping changed. Refresh delivery options and choose again.
```

Do not trust the browser to decide the tier, courier, free amount, or price.

## Suggested Function Shape

```ts
function classifyPackageCouriers(rows, policy) {
  const valid = buildValidCourierPool(rows, policy);
  const standard = chooseStandard(valid, policy);
  const express = chooseExpress(valid, standard, policy);
  const expedited = chooseExpedited(valid, standard, express, policy);

  return compact([
    standard && { tier: 'Standard', quote: standard },
    express && { tier: 'Express', quote: express },
    expedited && { tier: 'Expedited', quote: expedited },
  ]);
}
```

## Policy Settings

These should be owner-set data, not hardcoded constants:

```text
standardMaxDays
expressMaxTopUpMinor
expressMinimumDaysFaster
expeditedMaxTopUpMinor
preferredStandardNames
preferredExpressNames
preferredExpeditedNames
excludedCourierNames
excludedUntrackedRows
```

Preferences are soft. Exclusions and max price/day rules are hard.

## Done When

This is done when:

- the system chooses one Standard courier automatically
- the system chooses one Express courier automatically when a valid one exists
- the system chooses one Expedited courier automatically when a valid one exists
- missing preferred couriers do not break checkout
- unavailable tiers are hidden, not shown broken
- free shipping contributes only against Standard
- checkout still validates against a fresh CJ quote before payment
- fulfillment still uses CJ's exact `logisticName`, `optionId`, and `channelId`

## One Sentence To Remember

The buyer chooses the delivery promise; the system chooses the current CJ
courier that can fulfill that promise.

---
tags: [handoff, checkout, shipping, cj, free-shipping]
status: handoff
owner_approved: pending
created: 2026-08-28
---

# Aj Handoff: CJ Courier Options to Sals3 Shipping Tiers

Aj, ito ang gagawin: gawing Sals3 tiers ang raw CJ courier options without hardcoding one courier per tier.

## Problem

CJ returns different courier options per destination, package, product type, warehouse origin, weight, and address.

Example:

- Philippines may have `CJPacket Eub`, `CJPacket Asia Ordinary`, `DHL Official`, etc.
- Australia may have many more CJPacket rows and a different fastest/cheapest mix.
- Some countries may not have a usable middle-speed option at all.

So this must not be coded as:

```text
Express = CJPacket Fast Line
```

That breaks the moment that courier is unavailable for the country/package.

## Correct Model

Sals3 tiers are business labels. CJ courier rows are live supplier options.

```text
Standard  = cheapest valid CJ row
Express   = best available faster row with an acceptable top-up
Expedited = fastest valid CJ row
```

If no valid Express row exists, do not show Express for that package. Show Standard and Expedited only.

## CJ API To Use

Use:

```text
POST /api2.0/v1/logistic/freightCalculateTip
```

Official docs:

```text
https://developers.cjdropshipping.com/en/api/api2/api/logistic.html
```

Use this instead of plain `freightCalculate` for checkout because it returns the data we need:

- `optionId`
- `channelId`
- `arrivalTime`
- `option.enName` / courier display name
- postage/fees
- rule tips

Current portal code already uses this endpoint:

```text
E:/sals3-portal/src/modules/checkout/freight-quotes.ts
```

Look for:

```ts
'/logistic/freightCalculateTip'
```

## Current Flow

Keep this flow:

```text
1. Resolve cart lines to CJ-backed published offers.
2. GET /product/query?pid=...
   Use this for variant details, SKU, productProEnSet, weight/size fallback.
3. GET /product/stock/getInventoryByPid?pid=...
   Use this to choose the real stocked origin country.
4. POST /logistic/freightCalculateTip
   Use this to get the live courier rows.
5. Classify rows into Sals3 tiers per package.
6. Store and validate raw CJ identifiers:
   logisticName, optionId, channelId, amountMinor.
7. On fulfillment, pass logisticName to createOrderV3.
```

## What To Change

Current issue: `labelFor()` labels each CJ row by itself using delivery days.

That is not enough. The label needs context from all rows in the same package.

Change this:

```text
one row -> labelFor(row)
```

To this:

```text
all valid rows for one package -> classifyShippingTiers(rows)
```

Then return only the chosen tier rows to the storefront, or return all rows with an extra Sals3 tier field if the UI needs full visibility later.

## Tier Rules

### Standard

Choose the cheapest valid CJ row.

Valid means:

- has `optionId`
- has `channelId`
- amount is greater than zero
- no CJ row error

### Express

First try preferred Express courier names from owner settings if they exist.

Example preference list:

```ts
['CJPacket Fast Line', 'CJPacket Ordinary', 'CJPacket Asia Ordinary']
```

But preferences are not hard requirements. If none are available, choose by rule:

- must be meaningfully faster than Standard
- must be within the owner-set max top-up above Standard
- choose the cheapest qualifying faster row

If no row qualifies, hide Express.

### Expedited

Choose the fastest valid CJ row.

Tie-breakers:

1. lower max delivery days
2. lower min delivery days
3. lower price

This will often be DHL, but do not hardcode DHL.

## Suggested Code

Add a package-level classifier near the freight quote module.

```ts
type CjFreightCandidate = {
  cjLogisticName: string;
  optionId: string;
  channelId: string;
  arrivalTime: string;
  amountMinor: number;
};

type ShippingTier = 'Standard' | 'Express' | 'Expedited';

type TieredQuote = {
  tier: ShippingTier;
  quote: CjFreightCandidate;
};

function daysOf(arrivalTime: string) {
  const numbers = arrivalTime.match(/\d+/g)?.map(Number) ?? [];
  const min = numbers[0] ?? 999;
  const max = numbers[1] ?? min;

  return { min, max };
}

function isMeaningfullyFaster(
  candidate: CjFreightCandidate,
  standard: CjFreightCandidate,
  minimumDaysFaster: number,
) {
  const candidateDays = daysOf(candidate.arrivalTime);
  const standardDays = daysOf(standard.arrivalTime);

  return (
    candidateDays.max <= standardDays.max - minimumDaysFaster ||
    candidateDays.min <= standardDays.min - minimumDaysFaster
  );
}

function sameQuote(left: CjFreightCandidate, right: CjFreightCandidate) {
  return left.optionId === right.optionId && left.channelId === right.channelId;
}

function classifyShippingTiers(
  rows: CjFreightCandidate[],
  policy: {
    expressMaxTopUpMinor: number;
    expressMinimumDaysFaster: number;
    preferredExpressNames: string[];
  },
): TieredQuote[] {
  const valid = rows
    .filter(
      (row) =>
        row.amountMinor > 0 && row.optionId !== '' && row.channelId !== '',
    )
    .sort((left, right) => left.amountMinor - right.amountMinor);

  const standard = valid[0];

  if (standard === undefined) return [];

  const faster = valid.filter(
    (row) =>
      !sameQuote(row, standard) &&
      isMeaningfullyFaster(
        row,
        standard,
        policy.expressMinimumDaysFaster,
      ),
  );

  const preferredExpress = faster.find((row) =>
    policy.preferredExpressNames.includes(row.cjLogisticName),
  );

  const ruleBasedExpress = faster
    .filter(
      (row) =>
        row.amountMinor <= standard.amountMinor + policy.expressMaxTopUpMinor,
    )
    .sort(
      (left, right) =>
        left.amountMinor - right.amountMinor ||
        daysOf(left.arrivalTime).max - daysOf(right.arrivalTime).max,
    )[0];

  const express = preferredExpress ?? ruleBasedExpress;

  const expedited = [...valid].sort((left, right) => {
    const leftDays = daysOf(left.arrivalTime);
    const rightDays = daysOf(right.arrivalTime);

    return (
      leftDays.max - rightDays.max ||
      leftDays.min - rightDays.min ||
      left.amountMinor - right.amountMinor
    );
  })[0];

  return [
    { tier: 'Standard', quote: standard },
    ...(express === undefined || sameQuote(express, standard)
      ? []
      : [{ tier: 'Express' as const, quote: express }]),
    ...(expedited === undefined ||
    sameQuote(expedited, standard) ||
    (express !== undefined && sameQuote(expedited, express))
      ? []
      : [{ tier: 'Expedited' as const, quote: expedited }]),
  ];
}
```

## How The Screenshots Map

### Philippines

From the screenshot:

```text
Standard  = CJPacket Eub, $2.48, 12-50 days
Express   = CJPacket Asia Ordinary, $3.29, 4-7 days
Expedited = DHL Official, $30.42, 3-7 days
```

`CJPacket Liquid Line` is cheap, but it is product-type-specific and not a general Express promise. Do not force it as a tier.

### Australia

From the screenshot:

```text
Standard  = CJPacket Eub, $5.80, 6-10 days
Express   = first acceptable faster/non-crazy top-up row, depending policy
Expedited = DHL Official, $33.54, 4-6 days
```

Australia shows why courier names cannot be fixed. It has many CJPacket rows, and several are close in price/time.

## Fallback Behavior

If preferred Express is unavailable:

```text
try preferred Express courier
else choose by Express rule
else hide Express
```

Never fail checkout only because Express is missing.

Acceptable outcomes:

```text
PH: Standard + Express + Expedited
AU: Standard + Express + Expedited
FJ: Standard + Expedited only
Other country/package: Standard only, if that is all CJ returns
```

## Free Shipping Interaction

Free shipping should contribute against Standard only.

```text
Sals3 contribution = min(Standard amount, country contribution cap)
```

Then display:

```text
Standard  = free or discounted
Express   = Express price - contribution
Expedited = Expedited price - contribution
```

The buyer pays the upgrade difference. Sals3 does not absorb Express or Expedited beyond the Standard contribution/cap.

## Data To Persist

Persist the exact raw CJ values used at checkout:

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

Do not persist only `Express` or only a display label. Fulfillment needs the CJ row identity.

## Validation Rule

Keep the existing exact match validation.

Before payment/session creation, re-quote and verify selected shipping still matches:

```text
packageId + optionId + channelId + amountMinor
```

If it changed:

```text
Shipping changed. Refresh delivery options and choose again.
```

Do not trust the browser to assert free shipping, tier labels, or courier price.

## Files To Inspect/Change

Portal:

```text
E:/sals3-portal/src/modules/checkout/freight-quotes.ts
E:/sals3-portal/src/modules/checkout/freight-quotes.test.ts
E:/sals3-portal/src/modules/checkout/orders.ts
E:/sals3-portal/src/modules/orders/fulfillment-worker.ts
```

Storefront:

```text
E:/sals3-ecommerce/src/services/storefront/schemas.ts
E:/sals3-ecommerce/src/components/checkout/CheckoutShippingOptions.tsx
E:/sals3-ecommerce/src/components/checkout/checkout-flow.test.tsx
```

## Done When

This is done only when:

- PH screenshot-style rows classify into Standard, Express, Expedited.
- AU screenshot-style rows classify into Standard, Express, Expedited without hardcoded courier names.
- A country/package with no Express row still checks out with Standard and/or Expedited.
- The UI does not show Express when no valid Express exists.
- Checkout validation still rejects stale quotes.
- Fulfillment still sends CJ `logisticName` to `createOrderV3`.
- No free-shipping amount is trusted from the browser.

## Most Important Rule

Courier is not the tier.

Tier is the promise level Sals3 offers. Courier is the current CJ row that can satisfy that promise for this exact package and address.

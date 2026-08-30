import 'server-only';

import type { Money } from '@/lib/money';
import type { CheckoutCartLineInput } from '@/lib/checkout/schema';
import { validateCheckoutCart } from './cart-validation';

export type RepricedLine = {
  productId: string;
  variantId?: string;
  unitPrice: Money;
  /** The price this line was carrying, when it differs from `unitPrice`. */
  previousUnitPrice?: Money;
  title: string;
};

export type RepricedCart = {
  lines: RepricedLine[];
  /** Only the lines whose price moved. Empty is the ordinary case. */
  changed: RepricedLine[];
};

/**
 * Today's price for everything in a cart, and which of those moved.
 *
 * ## The defect this exists to close
 *
 * A cart line stores the price it was added at, and the checkout summary
 * rendered that stored figure through Information and Delivery. Stripe was then
 * handed `validateCheckoutCart`'s output — the *current* price read back from
 * the Portal. So a buyer whose item had been repriced since they added it saw
 * one total for two whole steps and was charged another on the payment screen,
 * with nothing anywhere saying so. Observed on a real order: US$125.58 shown,
 * $126.87 charged, because one beanie had moved from $86.40 to $87.69.
 *
 * The charge was never the wrong number. The Portal is the price authority and
 * $87.69 was the price. What was wrong is that the buyer was shown a figure the
 * checkout already knew it would not honour, and only found out after
 * committing to pay. A silent increase between the summary and the card form is
 * the one thing a checkout may never do.
 *
 * ## Why it reuses `validateCheckoutCart` rather than reading prices itself
 *
 * Because a second price reader is a second answer. That function is what
 * decides the amount Stripe charges; anything else here could agree with it
 * today and drift tomorrow, which is precisely the failure being fixed. It also
 * carries the availability and variant checks, so a cart holding something
 * withdrawn now fails on arrival at checkout rather than at the card form.
 *
 * `previousUnitPrice` is filled from what the caller sent, so `changed` says
 * what the buyer had been looking at rather than merely what is true now.
 */
export default async function repriceCheckoutCart(
  inputLines: CheckoutCartLineInput[],
  carriedPrices: (Money | undefined)[],
): Promise<RepricedCart> {
  const validated = await validateCheckoutCart(inputLines);
  const lines = validated.lines.map((line, index) => {
    const carried = carriedPrices[index];
    const moved =
      carried !== undefined &&
      (carried.amountMinor !== line.unitPrice.amountMinor ||
        carried.currency !== line.unitPrice.currency);

    return {
      productId: line.productId,
      ...(line.variantId === undefined ? {} : { variantId: line.variantId }),
      unitPrice: line.unitPrice,
      ...(moved ? { previousUnitPrice: carried } : {}),
      title: line.title,
    };
  });

  return {
    lines,
    changed: lines.filter((line) => line.previousUnitPrice !== undefined),
  };
}

import {
  CHECKOUT_ALLOWED_COUNTRIES,
  type CheckoutCountry,
} from '@/lib/checkout/locations';
import type { DestinationCode } from './destinations';

/**
 * Which checkout-destination key to read a free-shipping threshold under, for
 * the destination the buyer appears to be shopping to.
 *
 * Same shape as `destinationToIndicativeCurrency`, and for the same reason:
 * `DESTINATIONS` is the six measured countries plus Global, and
 * `CHECKOUT_ALLOWED_COUNTRIES` is the narrower three `free-shipping.ts` has a
 * configured threshold for. New Zealand, the United States, Canada and Global
 * get no estimate, not a fabricated one borrowed from a neighbour.
 */
export default function destinationToCheckoutCountry(
  code: DestinationCode,
): CheckoutCountry | undefined {
  return (CHECKOUT_ALLOWED_COUNTRIES as readonly string[]).includes(code)
    ? (code as CheckoutCountry)
    : undefined;
}

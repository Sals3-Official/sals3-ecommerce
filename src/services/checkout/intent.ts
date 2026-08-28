import 'server-only';

import type {
  CheckoutAddress,
  CheckoutCartLineInput,
  CheckoutShippingSelection,
} from '@/lib/checkout/schema';
import {
  getStorefrontApiUrl,
  requestStorefrontJson,
  STOREFRONT_CHECKOUT_INTENTS_PATH,
} from '@/services/storefront/client';
import {
  CheckoutIntentResponseSchema,
  type CheckoutIntentResponse,
} from '@/services/storefront/schemas';

export default async function createPortalCheckoutIntent(
  input: {
    cart: { items: CheckoutCartLineInput[] };
    address: CheckoutAddress;
    shippingSelection: CheckoutShippingSelection;
    /**
     * The signed-in buyer's verified account id, resolved from the session
     * cookie by the caller and never from the request. The portal stamps it
     * onto the intent and the order, which is what makes an order belong to a
     * person rather than to whichever address they typed into the form.
     */
    buyerUid?: string;
  },
  options: { fetcher?: typeof fetch } = {},
): Promise<CheckoutIntentResponse> {
  const payload = await requestStorefrontJson(
    {
      url: getStorefrontApiUrl(STOREFRONT_CHECKOUT_INTENTS_PATH).toString(),
      schema: CheckoutIntentResponseSchema,
      subject: 'checkout intent API',
    },
    {
      method: 'POST',
      body: input,
      cachePolicy: { cache: 'no-store' },
      fetcher: options.fetcher,
    },
  );

  return payload as CheckoutIntentResponse;
}

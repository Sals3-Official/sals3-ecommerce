import 'server-only';

import {
  getStorefrontApiUrl,
  requestStorefrontJson,
  STOREFRONT_CHECKOUT_ORDERS_ACCEPT_PATH,
} from '@/services/storefront/client';
import {
  CheckoutOrderAcceptResponseSchema,
  type CheckoutOrderAcceptResponse,
} from '@/services/storefront/schemas';

export type AcceptPortalCheckoutOrderInput = {
  checkoutIntentId: string;
  stripeEventId: string;
  stripeCheckoutSessionId: string;
  stripePaymentIntentId?: string;
  amountTotalMinor: number;
  currency: string;
  customerEmail?: string;
};

export default async function acceptPortalCheckoutOrder(
  input: AcceptPortalCheckoutOrderInput,
  options: { fetcher?: typeof fetch } = {},
): Promise<CheckoutOrderAcceptResponse> {
  const payload = await requestStorefrontJson(
    {
      url: getStorefrontApiUrl(
        STOREFRONT_CHECKOUT_ORDERS_ACCEPT_PATH,
      ).toString(),
      schema: CheckoutOrderAcceptResponseSchema,
      subject: 'checkout order acceptance API',
    },
    {
      method: 'POST',
      body: input,
      cachePolicy: { cache: 'no-store' },
      fetcher: options.fetcher,
    },
  );

  return payload as CheckoutOrderAcceptResponse;
}

import 'server-only';

import type {
  CheckoutAddress,
  CheckoutCartLineInput,
} from '@/lib/checkout/schema';
import {
  getStorefrontApiUrl,
  requestStorefrontJson,
  STOREFRONT_FREIGHT_QUOTES_PATH,
} from '@/services/storefront/client';
import {
  CheckoutFreightQuoteResponseSchema,
  type CheckoutFreightQuoteResponse,
} from '@/services/storefront/schemas';

export default async function requestCheckoutFreightQuotes(
  input: {
    cart: { items: CheckoutCartLineInput[] };
    address: CheckoutAddress;
  },
  options: { fetcher?: typeof fetch } = {},
): Promise<CheckoutFreightQuoteResponse> {
  const payload = await requestStorefrontJson(
    {
      url: getStorefrontApiUrl(STOREFRONT_FREIGHT_QUOTES_PATH).toString(),
      schema: CheckoutFreightQuoteResponseSchema,
      subject: 'checkout freight quote API',
    },
    {
      method: 'POST',
      body: {
        ...input,
        capabilities: { freeStandardShipping: true },
      },
      cachePolicy: { cache: 'no-store' },
      fetcher: options.fetcher,
    },
  );

  return payload as CheckoutFreightQuoteResponse;
}

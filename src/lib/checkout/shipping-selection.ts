import type { CheckoutFreightQuote } from '@/services/storefront/schemas';

export type SelectedShippingQuote = Pick<
  CheckoutFreightQuote,
  | 'packageId'
  | 'shippingTier'
  | 'quoteId'
  | 'optionId'
  | 'channelId'
  | 'cjLogisticName'
  | 'arrivalTime'
  | 'amountMinor'
  | 'currency'
>;

import type { Metadata } from 'next';
import CheckoutPaymentStep from '@/components/checkout/CheckoutPaymentStep';
import { SITE_NAME } from '@/lib/site';

export function generateMetadata(): Metadata {
  return {
    title: `Payment — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

/** Step 3 of 3: pay. Stripe is already prepared by the delivery step. */
export default function CheckoutPaymentPage() {
  return <CheckoutPaymentStep />;
}

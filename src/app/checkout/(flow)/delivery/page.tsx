import type { Metadata } from 'next';
import CheckoutDeliveryStep from '@/components/checkout/CheckoutDeliveryStep';
import { SITE_NAME } from '@/lib/site';

export function generateMetadata(): Metadata {
  return {
    title: `Delivery — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

/** Step 2 of 3: choose a courier for each package. */
export default function CheckoutDeliveryPage() {
  return <CheckoutDeliveryStep />;
}

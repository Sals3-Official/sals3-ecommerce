import type { Metadata } from 'next';
import CheckoutInformationStep from '@/components/checkout/CheckoutInformationStep';
import { SITE_NAME } from '@/lib/site';

export function generateMetadata(): Metadata {
  return {
    title: `Checkout — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Step 1 of 3: contact and delivery address.
 *
 * The auth guard, the chrome, and the flow state all live in the group's
 * `layout.tsx`, so this route composes and nothing else.
 */
export default function CheckoutInformationPage() {
  return <CheckoutInformationStep />;
}

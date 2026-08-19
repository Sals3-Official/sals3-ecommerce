import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import CheckoutPageClient from '@/components/checkout/CheckoutPageClient';
import AUTH_LINKS from '@/lib/auth/auth-links';
import { getBuyerSession } from '@/lib/auth/dal';
import { withPostLoginKey } from '@/lib/auth/post-login-redirect';
import { SITE_NAME } from '@/lib/site';

export function generateMetadata(): Metadata {
  return {
    title: `Checkout — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Checkout requires a signed-in buyer.
 *
 * The guard lives here rather than in a `layout.tsx` so it does not also cover
 * `/checkout/success`, which is Stripe's `return_url` — a redirect risk on the
 * payment-return path buys nothing. Reading the session makes this route
 * request-dynamic, which is already the intent: `next.config.ts` sends
 * `no-store` for `/checkout/:path*` and the page is `noindex`.
 *
 * The cart survives the hop to `/login` on its own: it lives in localStorage
 * through `CartProvider`, which is mounted in the root layout and so wraps the
 * credential screens too. A signed-out visitor with an empty cart sees the
 * login screen rather than "your cart is empty" — sign-in is the earlier gate,
 * deliberately.
 */
export default async function CheckoutPage() {
  if (!(await getBuyerSession())) {
    redirect(withPostLoginKey(AUTH_LINKS.signIn, 'checkout'));
  }

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5 pb-16">
        <CheckoutPageClient />
      </main>
      <SiteFooter />
    </div>
  );
}

import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import CheckoutFlowChrome from '@/components/checkout/CheckoutFlowChrome';
import { CheckoutFlowProvider } from '@/components/checkout/CheckoutFlowProvider';
import AUTH_LINKS from '@/lib/auth/auth-links';
import { getBuyerSession } from '@/lib/auth/dal';
import { withPostLoginKey } from '@/lib/auth/post-login-redirect';

/**
 * Shared shell for the three checkout steps — `/checkout`,
 * `/checkout/delivery`, `/checkout/payment`.
 *
 * The `(flow)` route group is what keeps `/checkout/success` out of this: the
 * receipt is not a step, has no stepper or order summary, and is Stripe's
 * `return_url`, so it stays a sibling with its own layout and its own guard.
 *
 * The auth guard sits here rather than in each page because all three steps
 * need it and a layout runs before any of them. Reading the session makes these
 * routes request-dynamic, which is already the intent: `next.config.ts` sends
 * `no-store` for `/checkout/:path*` and every step is `noindex`.
 *
 * `CheckoutFlowProvider` must be mounted at this level and not inside a page —
 * Next keeps a layout mounted across navigation between its child routes, and
 * that is what carries the address, the quote, and the Stripe client secret
 * from one step to the next.
 */
export default async function CheckoutFlowLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await getBuyerSession())) {
    redirect(withPostLoginKey(AUTH_LINKS.signIn, 'checkout'));
  }

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5 pb-16">
        <CheckoutFlowProvider>
          <CheckoutFlowChrome>{children}</CheckoutFlowChrome>
        </CheckoutFlowProvider>
      </main>
      <SiteFooter />
    </div>
  );
}

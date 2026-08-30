import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import CheckoutFlowChrome from '@/components/checkout/CheckoutFlowChrome';
import { CheckoutFlowProvider } from '@/components/checkout/CheckoutFlowProvider';
import AUTH_LINKS from '@/lib/auth/auth-links';
import { getBuyerSession } from '@/lib/auth/dal';
import { withPostLoginKey } from '@/lib/auth/post-login-redirect';
import { isCheckoutCountry } from '@/lib/checkout/locations';
import { resolveDestination } from '@/lib/destination/resolve';

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
  /*
    The destination the buyer has been shopping to, if checkout can take an
    address there. `isCheckoutCountry` is the narrowing: Global and the
    priced-but-not-orderable countries fall through to `undefined`, and the form
    keeps its own default. Seeding a country the form would then refuse is the
    one outcome worth ruling out here rather than downstream.

    The account's own address is seeded into the contact field for a separate
    reason. The form still lets the buyer change it — some people genuinely want
    the receipt somewhere else — but the default matters: an order is scoped by
    the account that placed it, and until 2026-08-28 it was scoped by this field
    instead, so a buyer who typed a different address paid for an order that
    then vanished from their list. Seeding removes the accident while leaving
    the choice.

    Both reads start together. The session decides whether this page renders at
    all and the destination only seeds a form field, so they ran in sequence for
    no reason beyond the order they were written in — and this layout is the
    first thing standing between the cart and the address form.

    Starting the destination read before the guard has answered is safe: it
    reads a cookie the visitor already sent, its answer is discarded on the
    redirect path, and it spends nothing upstream.
  */
  const [buyer, destination] = await Promise.all([
    getBuyerSession(),
    resolveDestination(),
  ]);

  if (!buyer) {
    redirect(withPostLoginKey(AUTH_LINKS.signIn, 'checkout'));
  }

  const initialCountry = isCheckoutCountry(destination.code)
    ? destination.code
    : undefined;

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5 pb-16">
        <CheckoutFlowProvider
          initialCountry={initialCountry}
          initialEmail={buyer.email}
        >
          <CheckoutFlowChrome>{children}</CheckoutFlowChrome>
        </CheckoutFlowProvider>
      </main>
      <SiteFooter />
    </div>
  );
}

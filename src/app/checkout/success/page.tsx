import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import CheckoutReceiptDelivery from '@/components/checkout/CheckoutReceiptDelivery';
import CheckoutReceiptItems from '@/components/checkout/CheckoutReceiptItems';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import AUTH_LINKS from '@/lib/auth/auth-links';
import { getBuyerSession } from '@/lib/auth/dal';
import { withPostLoginKey } from '@/lib/auth/post-login-redirect';
import { formatMoney, isSupportedCurrency } from '@/lib/money';
import { SITE_NAME } from '@/lib/site';
import toCheckoutReceipt, {
  type CheckoutReceipt,
} from '@/services/checkout/receipt';
import { retrieveStripeCheckoutSession } from '@/services/stripe/checkout';

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{ session_id?: string | string[] }>;
};

type CheckoutStatus = {
  title: string;
  body: string;
  amount: string;
  receipt?: CheckoutReceipt;
};

export function generateMetadata(): Metadata {
  return {
    title: `Checkout status — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function amountLabel(
  amountTotal: number | null,
  currency: string | null,
): string {
  const currencyCode = currency?.toUpperCase();

  if (
    amountTotal === null ||
    currencyCode === undefined ||
    !isSupportedCurrency(currencyCode)
  ) {
    return 'Amount unavailable';
  }

  return formatMoney({
    amountMinor: amountTotal,
    currency: currencyCode,
  });
}

/**
 * Ownership check, not just authentication.
 *
 * A Stripe session id travels in the URL: into browser history, into anything
 * the buyer pastes it into, into referrer headers. Now that this page renders a
 * name, a phone number, a street address, and a purchase history, holding the
 * id must not be enough to read it (rules 20 and 21). The comparison is against
 * the email on the verified session cookie, never against anything supplied
 * with the request.
 *
 * This is the strongest tie available today, and it is not a perfect one — the
 * buyer types the contact email themselves during checkout, so an address that
 * differs from the account email locks the buyer out of their own receipt. The
 * durable fix is stamping the verified uid onto the checkout intent, which is
 * tracked as a follow-up; until then a mismatch is treated as "not yours".
 */
function belongsToBuyer(
  sessionEmail: string | null | undefined,
  buyerEmail: string | undefined,
): boolean {
  if (!sessionEmail || buyerEmail === undefined) {
    return false;
  }

  return sessionEmail.toLowerCase() === buyerEmail.toLowerCase();
}

async function statusFor(
  sessionId: string | undefined,
  buyerEmail: string | undefined,
): Promise<CheckoutStatus> {
  if (sessionId === undefined || sessionId === '') {
    return {
      title: 'Checkout not verified',
      body: 'No Stripe session was provided.',
      amount: 'Amount unavailable',
    };
  }

  try {
    const session = await retrieveStripeCheckoutSession(sessionId);
    const amount = amountLabel(session.amount_total, session.currency);

    if (
      !belongsToBuyer(
        session.customer_details?.email ?? session.customer_email,
        buyerEmail,
      )
    ) {
      // Same wording as an unknown session: whether the id exists is not
      // something an unauthorised reader should be able to learn.
      return {
        title: 'Checkout not verified',
        body: 'This checkout is not available on your account.',
        amount: 'Amount unavailable',
      };
    }

    const receipt = toCheckoutReceipt(session);

    if (session.payment_status === 'paid') {
      return {
        title: 'Payment received',
        body: 'Stripe verified this payment. Your order details are below.',
        amount,
        receipt,
      };
    }

    if (session.status === 'complete') {
      return {
        title: 'Payment processing',
        body: 'Stripe received checkout details, but the payment is still processing.',
        amount,
        receipt,
      };
    }

    return {
      title: 'Checkout not completed',
      body: 'No successful payment is recorded for this checkout session.',
      amount,
    };
  } catch {
    return {
      title: 'Checkout not verified',
      body: 'Stripe session lookup failed. Try again in a moment.',
      amount: 'Amount unavailable',
    };
  }
}

export default async function CheckoutSuccessPage({
  searchParams,
}: CheckoutSuccessPageProps) {
  const buyer = await getBuyerSession();

  if (!buyer) {
    redirect(withPostLoginKey(AUTH_LINKS.signIn, 'checkout'));
  }

  const params = await searchParams;
  const status = await statusFor(first(params?.session_id), buyer.email);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <section className="rounded-xl border border-border bg-white p-6">
          <p className="text-xs font-semibold tracking-wide text-brand-600 uppercase">
            Stripe checkout
          </p>
          <h1 className="mt-1 font-display text-2xl font-semibold text-ink">
            {status.title}
          </h1>
          <p className="mt-3 text-sm text-ink-muted">{status.body}</p>
          <div className="mt-5 rounded-lg bg-surface-sunken p-4">
            <p className="text-sm text-ink-muted">Total</p>
            <p className="font-display text-2xl font-semibold text-ink">
              {status.amount}
            </p>
          </div>

          {status.receipt === undefined ? null : (
            <>
              <CheckoutReceiptItems items={status.receipt.items} />
              <CheckoutReceiptDelivery
                shipTo={status.receipt.shipTo}
                delivery={status.receipt.delivery}
                email={status.receipt.customerEmail}
              />
            </>
          )}

          <div className="mt-6">
            {/*
              One way forward, not two. "Back to cart" pointed at a cart that is
              empty by this point, so it offered a dead end as a peer of the
              real next step.
            */}
            <Link
              href="/"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 hover:no-underline active:scale-[0.98]"
            >
              Check out more of our products
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

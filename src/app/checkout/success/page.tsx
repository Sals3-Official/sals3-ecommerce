import type { Metadata } from 'next';
import Link from 'next/link';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { formatMoney, isSupportedCurrency } from '@/lib/money';
import { SITE_NAME } from '@/lib/site';
import { retrieveStripeCheckoutSession } from '@/services/stripe/checkout';

type CheckoutSuccessPageProps = {
  searchParams?: Promise<{ session_id?: string | string[] }>;
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

async function statusFor(sessionId: string | undefined) {
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

    if (session.payment_status === 'paid') {
      return {
        title: 'Payment received',
        body: 'Stripe verified this payment. Sals3 order storage is not built in this v1 checkout.',
        amount,
      };
    }

    if (session.status === 'complete') {
      return {
        title: 'Payment processing',
        body: 'Stripe received checkout details, but the payment is still processing.',
        amount,
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
  const params = await searchParams;
  const status = await statusFor(first(params?.session_id));

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-10">
        <section className="rounded-xl border border-border bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
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
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/"
              className="rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-bold text-white hover:no-underline hover:opacity-90"
            >
              Continue shopping
            </Link>
            <Link
              href="/cart"
              className="rounded-lg border border-border-strong px-5 py-2.5 text-sm font-bold text-ink hover:bg-black/5 hover:no-underline"
            >
              Back to cart
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

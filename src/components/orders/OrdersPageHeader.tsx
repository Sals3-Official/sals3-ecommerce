import Link from 'next/link';

/**
 * The list's title block.
 *
 * The lede states the two facts a buyer needs before reading anything below:
 * this is every order paid on *this account* (not every order they have ever
 * placed from any email), and the order number exists from the moment Stripe
 * confirms — which is why a checkout that never paid has no number to hold.
 */

const LEDE =
  'Every order paid on this account, newest first. An order number is issued the moment Stripe confirms a payment.';

export default function OrdersPageHeader() {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs font-semibold tracking-wide uppercase text-brand-600">
          Your account
        </p>
        <h1 className="mt-0.5 font-display text-[28px] font-semibold tracking-tight text-ink">
          My orders
        </h1>
        <p className="mt-1.5 max-w-2xl text-sm text-ink-muted">{LEDE}</p>
      </div>
      <Link
        href="/"
        className="inline-flex min-h-10 items-center rounded-lg border border-border-strong px-4 text-[13px] font-bold whitespace-nowrap text-ink-muted hover:bg-surface-sunken hover:no-underline"
      >
        Keep shopping
      </Link>
    </div>
  );
}

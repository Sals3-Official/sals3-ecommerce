'use client';

import Link from 'next/link';

/**
 * The orders read failed — the portal was unreachable or answered garbage.
 *
 * This boundary exists because `lib/orders/read.ts` deliberately has no
 * fallback: showing stale or fixture data on an order a buyer is worried
 * about would be worse than admitting the failure. Nothing from the error is
 * rendered (`error.message` can carry a URL or a Zod path); the detail is in
 * the server log.
 */
export default function OrdersError({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <h1 className="text-xl font-bold text-ink">
        We couldn’t load your orders
      </h1>
      <p className="mt-2 max-w-prose text-sm text-ink-muted">
        Something went wrong on our side. Your orders are safe — please try
        again.
      </p>
      <div className="mt-6 flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={reset}
          className="bg-brand-gradient min-h-11 cursor-pointer rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          Try again
        </button>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-600 px-6 text-sm font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600/10 active:scale-[0.98]"
        >
          Keep shopping
        </Link>
      </div>
    </main>
  );
}

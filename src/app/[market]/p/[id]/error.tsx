'use client';

import Link from 'next/link';
import { marketHref } from '@/lib/destination/markets';
import useMarket from '@/lib/destination/use-market';

/**
 * The catalogue could not be reached.
 *
 * `'use client'` because Next requires an error boundary to be a Client
 * Component. It renders no header or footer: those are server components in the
 * page's own tree, and this boundary replaces the page, not the layout.
 *
 * **Nothing from the error is rendered.** Not `error.message`, not
 * `error.digest`: the upstream failure can carry a URL, a status line, or a Zod
 * path, and none of that belongs on a buyer's screen. The detail is already in
 * the server log.
 *
 * This exists because the PDP now lets a real failure through instead of
 * answering `notFound()`. That is the fix working — an unreachable portal is a
 * different fact from a missing product, and a retry is a sensible thing to
 * offer for one and not the other.
 */
export default function ProductError({ reset }: { reset: () => void }) {
  // An error boundary receives `error` and `reset` and nothing else — no
  // `params` — so the way out is resolved from the client router.
  const market = useMarket();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
      <h1 className="text-xl font-bold text-ink">
        We couldn’t load this product
      </h1>
      <p className="mt-2 max-w-prose text-sm text-ink-muted">
        Something went wrong on our side. The product may still be available —
        please try again.
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
          href={marketHref(market, '/')}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-brand-600 px-6 text-sm font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600/10 active:scale-[0.98]"
        >
          Browse products
        </Link>
      </div>
    </main>
  );
}

import MarketLink from '@/components/layout/MarketLink';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';

/**
 * A real product does not exist at this address.
 *
 * Distinct from `error.tsx`, which is what an unreachable catalogue produces.
 * The PDP used to answer both with `notFound()`, so an outage looked like a
 * deleted product — a buyer would stop looking for something that is still for
 * sale, and nobody would learn the storefront was down.
 *
 * Still an HTTP 404, so crawlers de-index the address rather than keeping it.
 *
 * Next gives a `not-found` boundary no `params`, so the market cannot be handed
 * down here the way it is everywhere else. `MarketLink` reads it from the
 * client router instead; the header and footer take the default, which is the
 * one place in the market subtree they do. Their links are chrome on a dead
 * address — the one that matters is the way out, and that one is correct.
 */
export default function ProductNotFound() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <h1 className="text-xl font-bold text-ink">
          We couldn’t find that product
        </h1>
        <p className="mt-2 max-w-prose text-sm text-ink-muted">
          It may have been removed, or the address may be mistyped.
        </p>
        <MarketLink
          path="/"
          className="bg-brand-gradient mt-6 inline-flex min-h-11 items-center rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
        >
          Browse products
        </MarketLink>
      </main>
      <SiteFooter />
    </div>
  );
}

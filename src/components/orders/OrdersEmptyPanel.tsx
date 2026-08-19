import Link from 'next/link';

/**
 * A buyer with no orders at all.
 *
 * Distinct from the filtered-empty panel on purpose: telling somebody who has
 * simply never bought anything to "try widening your filters" is nonsense, and
 * telling somebody whose search excluded everything that they have no orders is
 * alarming and untrue. The second sentence answers the question a first-time
 * buyer actually has — whether a checkout they abandoned took their money.
 */

export default function OrdersEmptyPanel() {
  return (
    <section className="mt-4 rounded-xl border border-border bg-white px-8 py-11 text-center">
      <h2 className="font-display text-xl font-semibold text-ink">
        No orders yet
      </h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-ink-muted">
        An order appears here the moment Stripe confirms a payment. Nothing is
        reserved and nothing is charged before that.
      </p>
      <Link
        href="/"
        className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-6 text-sm font-bold text-white hover:opacity-90 hover:no-underline"
      >
        Start shopping
      </Link>
    </section>
  );
}

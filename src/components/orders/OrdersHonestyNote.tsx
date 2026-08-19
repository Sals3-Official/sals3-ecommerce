/**
 * What this page knows — and one thing it does not.
 *
 * The same evidence-ledger vocabulary the product detail page uses: a filled
 * 9px square is a claim that is true of shipped behaviour, a hollow square is an
 * absence stated plainly. Two filled, one hollow, and the hollow one is
 * deliberate — a buyer arriving from any other marketplace expects to be asked
 * for a review after a delivery, and being told there is no such thing is
 * better than wondering where the button is.
 *
 * If `automatic_tax` is ever switched on in `services/stripe/checkout.ts`, the
 * second row stops being true and changes in the same pull request.
 */

const CLAIMS = [
  {
    id: 'tracking',
    known: true,
    title: 'Tracking comes from the carrier',
    body: "Arrival windows and tracking events are the supplier's and the carrier's. Sals3 adds no delivery estimate of its own.",
  },
  {
    id: 'totals',
    known: true,
    title: 'Totals are what Stripe charged',
    body: 'Items plus the delivery option you chose. No tax is calculated by Sals3, and nothing is added after payment.',
  },
  {
    id: 'reviews',
    known: false,
    title: 'Reviews do not exist yet',
    body: 'Sals3 publishes no ratings, so a delivered order asks nothing of you. Support is the way to raise a problem.',
  },
];

export default function OrdersHonestyNote() {
  return (
    <section className="mt-5 rounded-xl border border-border bg-white px-5 py-4.5">
      <h2 className="text-xs font-bold tracking-[0.07em] uppercase text-ink-muted">
        What this page knows
      </h2>
      <dl className="mt-3 grid gap-4 sm:grid-cols-3">
        {CLAIMS.map((claim) => (
          <div key={claim.id} className="flex gap-2.5">
            <span
              aria-hidden
              className={`mt-1.5 block h-[9px] w-[9px] flex-none ${
                claim.known
                  ? 'bg-brand-600'
                  : 'border border-border-strong bg-white'
              }`}
            />
            <div>
              <dt className="text-[13px] font-bold text-ink">{claim.title}</dt>
              <dd className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
                {claim.body}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

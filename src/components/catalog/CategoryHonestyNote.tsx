const FACTS = [
  {
    title: 'Every filter reads a published field',
    body: "Price and availability come off the catalogue record itself. Nothing here is inferred from a product's title.",
  },
  {
    title: 'The price is the price',
    body: 'One number per card, in US dollars. Nothing is added to it on this page.',
  },
  {
    title: 'No countdowns, no "N left"',
    body: 'Sals3 counts no stock and runs no timers, so this page pressures nobody with a number it cannot stand behind.',
  },
];

/** Matches the design's own "What this page knows" convention — states what
 * is real rather than leaving a buyer to assume it. */
export default function CategoryHonestyNote() {
  return (
    <section className="mt-6 rounded-xl border border-border bg-white p-5">
      <h2 className="m-0 text-xs font-bold tracking-wider text-ink-muted uppercase">
        What this page knows
      </h2>
      <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {FACTS.map((fact) => (
          <div key={fact.title} className="flex gap-2.5">
            <span
              aria-hidden="true"
              className="mt-1.5 block h-2 w-2 shrink-0 bg-brand-600"
            />
            <div>
              <dt className="text-[13px] font-bold text-ink">{fact.title}</dt>
              <dd className="m-0 mt-0.5 text-[13px] leading-relaxed text-ink-muted">
                {fact.body}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </section>
  );
}

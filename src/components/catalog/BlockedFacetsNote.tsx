import { BLOCKED_FACETS } from '@/lib/catalog/blocked-facets';

/** "Not filterable yet" — the absence of Buyer rating/Brand/Ships
 * from/Discount reads as a stated decision, not a missing feature. */
export default function BlockedFacetsNote() {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface-sunken">
      <h2 className="m-0 border-b border-border px-4 py-3 text-[13px] font-bold text-ink-muted">
        Not filterable yet
      </h2>
      <ul className="m-0 flex list-none flex-col gap-2.5 p-4">
        {BLOCKED_FACETS.map((facet) => (
          <li key={facet.name}>
            <p className="m-0 text-[13px] font-semibold text-ink-subtle">
              {facet.name}
            </p>
            <p className="m-0 mt-0.5 text-xs leading-relaxed text-ink-subtle">
              {facet.reason}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}

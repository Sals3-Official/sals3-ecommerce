import { useState } from 'react';
import { PRICE_BANDS, type PriceBandId } from '@/lib/catalog/price-bands';

/**
 * The three fields this actually reads, named structurally rather than as one
 * page's query type — `/c/[slug]` and `/search` both carry them, and neither
 * should have to know about the other's fields to reuse this control.
 */
export type PriceFacetQuery = {
  band: PriceBandId;
  priceMin: string;
  priceMax: string;
};

const ROW =
  'flex min-h-9 items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[13px] text-ink cursor-pointer';

type PriceFacetFieldsProps = {
  query: PriceFacetQuery;
  counts: Record<PriceBandId, number>;
  rangeIsTyped: boolean;
  /**
   * Namespaces this instance's `id`s. The whole panel renders twice — once in
   * the desktop sidebar and once inside the mobile sheet — and a shared `id`
   * makes every `htmlFor` in the second copy resolve to the first copy's input,
   * which is hidden. The label then belongs to something the reader cannot see,
   * so the visible control has no accessible name and clicking its label does
   * nothing.
   */
  idPrefix: string;
  go: (changes: Partial<PriceFacetQuery>) => void;
};

/** The price band radios plus the custom min/max text pair. Min/max commit
 * on blur or Enter, not on every keystroke, matching a native `change` event
 * rather than `input` — the same reason `OrdersToolbar` keeps its search text
 * local until submit. */
export default function PriceFacetFields({
  query,
  counts,
  rangeIsTyped,
  idPrefix,
  go,
}: PriceFacetFieldsProps) {
  const [minText, setMinText] = useState(query.priceMin);
  const [maxText, setMaxText] = useState(query.priceMax);

  function commitMin() {
    if (minText !== query.priceMin) go({ priceMin: minText });
  }

  function commitMax() {
    if (maxText !== query.priceMax) go({ priceMax: maxText });
  }

  function onEnter(commit: () => void) {
    return (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        commit();
      }
    };
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-white">
      <h2 className="m-0 border-b border-border px-4 py-3 text-[13px] font-bold text-ink">
        Price
      </h2>
      <div className="p-3">
        <ul className="m-0 mb-3 flex list-none flex-col gap-0.5 p-0">
          {PRICE_BANDS.map((band) => {
            const checked = !rangeIsTyped && query.band === band.id;

            return (
              <li key={band.id}>
                <label
                  htmlFor={`${idPrefix}-band-${band.id}`}
                  className={`${ROW} ${checked ? 'bg-surface-sunken' : ''}`}
                >
                  <input
                    id={`${idPrefix}-band-${band.id}`}
                    type="radio"
                    name="band"
                    value={band.id}
                    checked={checked}
                    onChange={() =>
                      go({ band: band.id, priceMin: '', priceMax: '' })
                    }
                    className="m-0 h-4 w-4 shrink-0 accent-brand-600"
                  />
                  <span className="flex-1">{band.label}</span>
                  {band.id === 'any' ? null : (
                    <span className="text-xs text-ink-subtle tabular-nums">
                      {counts[band.id]}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
        <div className="flex items-center gap-1.5">
          <input
            type="text"
            name="priceMin"
            value={minText}
            onChange={(event) => setMinText(event.target.value)}
            onBlur={commitMin}
            onKeyDown={onEnter(commitMin)}
            placeholder="Min"
            aria-label="Minimum price in US dollars"
            className="min-w-0 flex-1 rounded-lg border border-border-strong px-2.5 py-2 text-[13px] text-ink outline-none"
          />
          <span className="text-[13px] text-ink-faint">–</span>
          <input
            type="text"
            name="priceMax"
            value={maxText}
            onChange={(event) => setMaxText(event.target.value)}
            onBlur={commitMax}
            onKeyDown={onEnter(commitMax)}
            placeholder="Max"
            aria-label="Maximum price in US dollars"
            className="min-w-0 flex-1 rounded-lg border border-border-strong px-2.5 py-2 text-[13px] text-ink outline-none"
          />
        </div>
        <p className="m-0 mt-2 text-[11px] leading-relaxed text-ink-subtle">
          Prices are in US dollars — the currency the catalogue publishes.
        </p>
      </div>
    </section>
  );
}

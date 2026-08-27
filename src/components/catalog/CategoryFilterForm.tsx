'use client';

import { useRouter } from 'next/navigation';
import { useCallback, type FormEvent } from 'react';
import type { PriceBandId } from '@/lib/catalog/price-bands';
import { categoryHref, type CategoryQuery } from '@/lib/catalog/query';
import PriceFacetFields from './PriceFacetFields';

/**
 * Price — the one facet control left on the sidebar (`priceMinor` is a real,
 * evidence-backed field on the card feed). One real `<form method="get">` so
 * the list still narrows with JavaScript off; `onChange` intercepts to
 * navigate instantly instead, the same choice `OrdersToolbar` made for its
 * own selects.
 */

type CategoryFilterFormProps = {
  slug: string;
  query: CategoryQuery;
  counts: Record<PriceBandId, number>;
  rangeIsTyped: boolean;
  /** Namespaces this instance's field ids — see `PriceFacetFields`. */
  idPrefix: string;
  /**
   * A prop rather than `useParams()`: the only caller is `CategoryFilterPanel`,
   * a Server Component one step above. One hop is
   * not worth a hook.
   */
};

export default function CategoryFilterForm({
  slug,
  query,
  counts,
  rangeIsTyped,
  idPrefix,
}: CategoryFilterFormProps) {
  const router = useRouter();

  const go = useCallback(
    (changes: Partial<CategoryQuery>) => {
      router.push(categoryHref(slug, query, changes));
    },
    [router, slug, query],
  );

  function submit(event: FormEvent<HTMLFormElement>) {
    // The radios already navigate on change; this only fires from the
    // no-JS `<noscript>` submit button, whose native GET is correct as-is.
    event.preventDefault();
  }

  return (
    <form
      method="get"
      action={`/c/${slug}`}
      onSubmit={submit}
      className="flex flex-col gap-3"
    >
      <input type="hidden" name="sort" value={query.sort} />
      <input type="hidden" name="view" value={query.view} />

      <PriceFacetFields
        query={query}
        counts={counts}
        rangeIsTyped={rangeIsTyped}
        idPrefix={idPrefix}
        go={go}
      />

      <noscript>
        <button
          type="submit"
          className="min-h-11 rounded-lg border border-brand-600 px-4 text-[13px] font-bold text-brand-600"
        >
          Apply filters
        </button>
      </noscript>
    </form>
  );
}

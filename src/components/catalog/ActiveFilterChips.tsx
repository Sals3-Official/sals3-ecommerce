import Link from 'next/link';
import type { FilterChip } from '@/lib/catalog/chips';

type ActiveFilterChipsProps = { chips: FilterChip[]; clearAllHref: string };

/** Chips are plain `next/link` anchors — clearing one filter is a
 * navigation, not client state, so no JavaScript is needed here at all. */
export default function ActiveFilterChips({
  chips,
  clearAllHref,
}: ActiveFilterChipsProps) {
  if (chips.length === 0) return null;

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold text-ink-muted">Filtering by</span>
      {chips.map((chip) => (
        <Link
          key={chip.label}
          href={chip.clearHref}
          className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border-strong bg-white px-3 text-xs text-ink hover:no-underline"
        >
          {chip.label}
          <span aria-hidden="true" className="text-ink-faint">
            ✕
          </span>
        </Link>
      ))}
      <Link
        href={clearAllHref}
        className="min-h-8 px-1 text-xs font-bold text-brand-600 hover:no-underline"
      >
        Clear all
      </Link>
    </div>
  );
}

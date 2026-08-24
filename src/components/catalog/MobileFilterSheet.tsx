'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { CloseIcon, FilterIcon } from '@/components/icons/Icon';

type MobileFilterSheetProps = {
  activeCount: number;
  applyLabel: string;
  clearAllHref: string;
  children: ReactNode;
};

/**
 * Below `lg`, the sidebar moves behind one "Filters" trigger and a bottom
 * sheet — the same content `CategoryFilterPanel` renders in the desktop
 * `<aside>`, not a second, smaller filter set. `applyLabel` and
 * `clearAllHref` come from the server as plain strings/hrefs, so they stay
 * live across a filter change without any client-side recomputation here.
 */
export default function MobileFilterSheet({
  activeCount,
  applyLabel,
  clearAllHref,
  children,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-border-strong bg-white text-[13px] font-bold text-ink"
      >
        <FilterIcon width={16} height={16} />
        Filters{activeCount > 0 ? ` · ${activeCount}` : ''}
      </button>

      {open ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Filters"
          className="fixed inset-0 z-50 flex flex-col justify-end bg-brand-900/45"
        >
          <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-t-2xl border-t border-border bg-white">
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
              <h2 className="m-0 text-[15px] font-bold text-ink">Filters</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close filters"
                className="flex min-h-11 items-center px-1.5 text-ink-muted"
              >
                <CloseIcon width={16} height={16} />
              </button>
            </div>
            <div className="overflow-auto p-4">{children}</div>
            <div className="flex gap-2 border-t border-border p-4">
              <Link
                href={clearAllHref}
                className="flex min-h-11 flex-1 items-center justify-center rounded-lg border border-border-strong text-[13px] font-bold text-ink-muted hover:no-underline"
              >
                Clear all
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="bg-brand-gradient flex min-h-11 flex-1 items-center justify-center rounded-lg text-[13px] font-bold text-white"
              >
                {applyLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

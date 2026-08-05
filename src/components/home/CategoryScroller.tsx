import type { ReactNode } from 'react';

type CategoryScrollerProps = {
  label: string;
  children: ReactNode;
};

/**
 * Full-bleed band shell (build spec §15.1). At `md` and up this is an
 * equal-column grid with no overflow, so there is nothing to scroll and no
 * chevrons — fully server-rendered, no client boundary. Below `md` it is
 * native touch scroll; `no-scrollbar` (globals.css) hides the browser
 * scrollbar while keeping the row scrollable by touch, trackpad, and
 * keyboard.
 */
export default function CategoryScroller({
  label,
  children,
}: CategoryScrollerProps) {
  return (
    <div className="border-y border-border bg-white">
      <div className="mx-auto w-full max-w-6xl px-6 py-4">
        <nav
          aria-label={label}
          className="no-scrollbar flex gap-2 overflow-x-auto md:grid md:auto-cols-fr md:grid-flow-col md:gap-1 md:overflow-visible"
        >
          {children}
        </nav>
      </div>
    </div>
  );
}

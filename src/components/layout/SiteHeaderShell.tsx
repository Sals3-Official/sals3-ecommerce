'use client';

import { useEffect, useState, type ReactNode } from 'react';

/**
 * Hysteresis, not a single threshold. The header loses ~28px of height when it
 * compacts, which shifts the flow below it; with one threshold, the browser's
 * scroll anchoring can pull `scrollY` back across that same line and the header
 * oscillates between states. Compacting at 72px and expanding again only below
 * 32px leaves a 40px dead band, wider than the height the swap removes, so the
 * state cannot chatter.
 */
const COMPACT_ABOVE = 72;
const EXPAND_BELOW = 32;

/**
 * Owns the header's one piece of client state and nothing else. The bar's
 * colours and vertical rhythm are CSS variables keyed off `data-compact` (see
 * `.site-header` in `globals.css`), so this boundary stays a wrapper: every
 * child passed through it — the utility bar, the logo, the search field — is
 * still rendered on the server.
 *
 * The listener is passive and the update is a derived boolean, so scrolling
 * never blocks on it and React re-renders only on the two crossings, not on
 * every scroll event.
 */
export default function SiteHeaderShell({ children }: { children: ReactNode }) {
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    function syncCompactState() {
      const offset = window.scrollY;

      setIsCompact((current) =>
        current ? offset > EXPAND_BELOW : offset > COMPACT_ABOVE,
      );
    }

    // Runs once on mount as well: a restored scroll position (back navigation,
    // a reload part-way down a category page) has to start out compact.
    syncCompactState();
    window.addEventListener('scroll', syncCompactState, { passive: true });

    return () => {
      window.removeEventListener('scroll', syncCompactState);
    };
  }, []);

  return (
    <header
      data-compact={isCompact}
      className="site-header sticky top-0 z-30 border-b border-[color:var(--header-border)]"
    >
      {children}
    </header>
  );
}

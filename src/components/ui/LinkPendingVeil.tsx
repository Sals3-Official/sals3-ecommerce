'use client';

import { useLinkStatus } from 'next/link';

/**
 * Marks the card a buyer just pressed while its page loads.
 *
 * Must be rendered as a descendant of a `<Link>` — that is how `useLinkStatus`
 * finds the navigation it reports on. The parent needs `relative`; this covers
 * it absolutely, so it can never change the grid's geometry.
 *
 * Why it exists on top of the route skeletons: `loading.tsx` answers *a page is
 * coming*, and it answers it in the place the new page will be. It cannot say
 * *which of these ten cards you pressed*, and on a grid that is the question.
 *
 * `aria-hidden` and no live region: the skeleton on the destination route
 * already carries the polite announcement, and two things narrating one
 * navigation is worse than one. This is for the eyes only.
 *
 * Renders nothing at all when idle rather than a transparent element, so an
 * un-pressed card has no extra node over its image.
 */
type LinkPendingVeilProps = {
  /**
   * Radius to match the link it covers. The default suits the product card and
   * list row; the category tile passes `rounded-none`, because there the grid
   * shell does the clipping and a rounded veil would show its corners against
   * the tile's square edges.
   */
  radiusClass?: string;
};

export default function LinkPendingVeil({
  radiusClass = 'rounded-xl',
}: LinkPendingVeilProps = {}) {
  const { pending } = useLinkStatus();

  if (!pending) {
    return null;
  }

  return (
    <span
      aria-hidden
      className={`s3-pending-veil pointer-events-none absolute inset-0 ${radiusClass} bg-surface/55 ring-2 ring-brand-blue-500 ring-inset`}
    />
  );
}

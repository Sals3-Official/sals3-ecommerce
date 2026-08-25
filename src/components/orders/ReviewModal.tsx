'use client';

import type { ReactNode } from 'react';
import { CloseIcon } from '@/components/icons/Icon';
import useDialog from '@/lib/hooks/use-dialog';

type ReviewModalProps = {
  title: string;
  /** One line under the heading — which order this is about. */
  subtitle: string;
  onClose: () => void;
  /** The scrolling body. */
  children: ReactNode;
  /** Pinned below the scroll area, so Submit is never scrolled out of reach. */
  footer: ReactNode;
};

/**
 * The dialog shell: a bottom sheet on a phone, a centred card above `sm`.
 *
 * ## Why the footer does not scroll
 *
 * Three items make the body taller than the viewport, and a Submit button that
 * has to be scrolled to is a button people cannot find. The body is the only
 * scroller; the heading and the actions stay put — the same split
 * `MobileFilterSheet` already uses for filters.
 *
 * ## Why the backdrop closes it
 *
 * Normally that is how a half-written review gets lost, which is the argument
 * that kept this form on a route of its own. It is safe here because the draft
 * does not live in this component: `RateReviewButton` holds it, so closing and
 * reopening returns the buyer to what they typed. Dismissal costs nothing, so it
 * does not need to be defended against.
 *
 * ## `aria-modal` is a promise `useDialog` keeps
 *
 * Escape, the Tab wrap, the scroll lock and the focus return all come from that
 * hook. The panel takes `tabIndex={-1}` so focus can land on it and the heading
 * is read before the first star.
 */
export default function ReviewModal({
  title,
  subtitle,
  onClose,
  children,
  footer,
}: ReviewModalProps) {
  const panelRef = useDialog(true, onClose);

  return (
    <div className="fixed inset-0 z-50 flex justify-center overflow-hidden bg-brand-900/45 sm:items-center sm:p-6">
      <button
        type="button"
        aria-label="Close without posting"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="review-modal-title"
        tabIndex={-1}
        className="relative mt-auto flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-surface outline-none sm:mt-0 sm:max-h-[88vh] sm:max-w-[36rem] sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border bg-white px-4 py-3.5">
          <div className="min-w-0">
            <h2
              id="review-modal-title"
              className="font-display text-[17px] font-semibold tracking-[-0.01em] text-ink"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-[12.5px] text-ink-muted">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close without posting"
            className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-surface-sunken"
          >
            <CloseIcon width={16} height={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">{children}</div>

        <div className="border-t border-border bg-white px-4 py-3.5">
          {footer}
        </div>
      </div>
    </div>
  );
}

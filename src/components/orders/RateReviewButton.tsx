'use client';

import dynamic from 'next/dynamic';
import { useCallback, useState } from 'react';
import type { ReviewDraft } from '@/components/orders/ReviewDraftItem';
import type { ReviewableLine } from '@/lib/orders/reviewable';

/**
 * The modal is loaded on the press, not with the list.
 *
 * A buyer with twelve orders on screen would otherwise download the dialog, the
 * star input, the textarea and the action's client reference twelve times over
 * for a button most of them will never press. `ssr: false` because a dialog that
 * only exists after a click has nothing to render on the server.
 */
const ReviewModalForm = dynamic(
  () => import('@/components/orders/ReviewModalForm'),
  { ssr: false },
);

const EMPTY_DRAFT: ReviewDraft = { rating: 0, body: '' };

/**
 * One star, as an icon.
 *
 * Deliberately not `StarRating`: that component draws all five and fills to a
 * value, so `rating={1}` on a button reads as *one out of five* — a rating
 * against the order, which is the opposite of what the control does. A single
 * glyph is an icon and cannot be misread as a score.
 *
 * Hoisted out of the component: static JSX rebuilt on every render is work for
 * nothing, and this never depends on a prop.
 */
const STAR_ICON = (
  <svg viewBox="0 0 16 16" width={14} height={14} aria-hidden="true">
    <path
      fill="currentColor"
      d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .8 4.3L8 11.4l-3.9 2 .8-4.3-3.1-3 4.3-.6z"
    />
  </svg>
);

type RateReviewButtonProps = {
  orderNumber: string;
  /** Only the lines the portal marked reviewable. Never rendered when empty. */
  lines: readonly ReviewableLine[];
  maskedName: string | null;
};

/**
 * The `Rate & review` button on an order, and the draft behind it.
 *
 * ## Why the draft lives up here
 *
 * This component stays mounted while the dialog opens and closes, so what the
 * buyer typed survives an Escape, a backdrop tap, and a second thought. That is
 * the objection that kept this form on a route of its own — *"a review is long
 * enough to lose to an accidental dismissal"* — and it is answered by where the
 * state sits rather than by refusing to build the modal.
 *
 * The route at `/orders/[orderNumber]/review/[lineId]` is still there and still
 * the only path that works without JavaScript; the order **detail** page links
 * to it per line. This is the list's shortcut, not its replacement.
 *
 * ## Why one button for an order rather than one per line
 *
 * The card footer is a row of order-level actions, and three review buttons in
 * it would read as three different things to do. The count goes in the label so
 * the buyer knows what pressing it commits them to, and the dialog shows every
 * item at once rather than stepping through them.
 */
export default function RateReviewButton({
  orderNumber,
  lines,
  maskedName,
}: RateReviewButtonProps) {
  const [open, setOpen] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, ReviewDraft>>({});
  const [named, setNamed] = useState(true);

  const close = useCallback(() => setOpen(false), []);

  // Functional update so the callback never depends on the drafts it edits —
  // otherwise every keystroke rebuilds it and re-renders every item in the
  // dialog rather than the one being typed into.
  const changeDraft = useCallback(
    (lineId: string, patch: Partial<ReviewDraft>) => {
      setDrafts((previous) => ({
        ...previous,
        [lineId]: { ...(previous[lineId] ?? EMPTY_DRAFT), ...patch },
      }));
    },
    [],
  );

  if (lines.length === 0) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg bg-brand-600 px-4 text-[13px] font-bold whitespace-nowrap text-white transition-colors hover:opacity-90 sm:min-h-10 sm:w-auto"
      >
        {STAR_ICON}
        Rate &amp; review
        {lines.length === 1 ? '' : ` · ${lines.length} items`}
      </button>

      {open ? (
        <ReviewModalForm
          orderNumber={orderNumber}
          lines={lines}
          maskedName={maskedName}
          drafts={drafts}
          onDraftChange={changeDraft}
          named={named}
          onNamedChange={setNamed}
          onClose={close}
        />
      ) : null}
    </>
  );
}

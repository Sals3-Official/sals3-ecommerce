'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import ReviewDraftItem, {
  type ReviewDraft,
} from '@/components/orders/ReviewDraftItem';
import ReviewModal from '@/components/orders/ReviewModal';
import submitOrderReviewsAction from '@/app/orders/review-actions';
import { DEFAULT_ORDERS_QUERY, ordersHref } from '@/lib/orders/query';
import { MAX_BODY, REVIEW_POSTED_PARAM } from '@/lib/orders/review-form';
import type { ReviewableLine } from '@/lib/orders/reviewable';

/** Where a posted review sends the buyer: the lane their order now sits in. */
const COMPLETED_HREF = ordersHref(DEFAULT_ORDERS_QUERY, { lane: 'completed' });

/**
 * What an item scores before the buyer has touched it. `0` in both places means
 * "not answered" — the product one blocks Submit, and the delivery one is
 * dropped rather than sent.
 */
const EMPTY_DRAFT: ReviewDraft = { rating: 0, deliveryRating: 0, body: '' };

/**
 * The Completed lane, carrying the count the toast will name. Built rather than
 * written out, so it stays correct if the lane ever becomes the default view and
 * `ordersHref` starts returning a bare `/orders`.
 */
function postedHref(posted: number): string {
  const separator = COMPLETED_HREF.includes('?') ? '&' : '?';

  return `${COMPLETED_HREF}${separator}${REVIEW_POSTED_PARAM}=${posted}`;
}

type ReviewModalFormProps = {
  orderNumber: string;
  lines: readonly ReviewableLine[];
  /** How the buyer's name reads if they stay credited. `null` — no name to use. */
  maskedName: string | null;
  drafts: Record<string, ReviewDraft>;
  onDraftChange: (lineId: string, patch: Partial<ReviewDraft>) => void;
  named: boolean;
  onNamedChange: (named: boolean) => void;
  onClose: () => void;
};

/**
 * The modal's body: every reviewable line in one order, one Submit.
 *
 * ## The draft is not held here
 *
 * It lives in `RateReviewButton`, which does not unmount when the dialog
 * closes. That is what makes dismissal cheap enough to allow on the backdrop
 * and on Escape — the buyer's typing survives a mis-tap, so the dialog does not
 * have to defend itself with a confirmation nobody reads.
 *
 * ## Why `useTransition` and not `useActionState`
 *
 * A success has two consequences — the flash message and the navigation — and
 * both belong in the handler that ran the submit. Reading the outcome out of a
 * state value would mean doing them in an effect a render later, which is the
 * shape that produces a double navigation the first time somebody adds a
 * dependency to it.
 *
 * ## Why the toast is not rendered here
 *
 * This component is on its way out: the next thing that happens is a navigation
 * to the Completed lane, and a toast rendered here would unmount mid-animation.
 * The count rides the redirect as `?posted=n`, so the destination page validates
 * it and renders the toast — the buyer sees one toast, on the page that proves
 * the review landed.
 *
 * ## Partial success keeps the dialog open
 *
 * Two of three posted is not a success and not a failure. Navigating away would
 * hide which one was refused, so the sentence is shown here and the list is
 * refreshed underneath — the posted lines drop out of the trigger, leaving only
 * what still needs an answer.
 */
export default function ReviewModalForm({
  orderNumber,
  lines,
  maskedName,
  drafts,
  onDraftChange,
  named,
  onNamedChange,
  onClose,
}: ReviewModalFormProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [alert, setAlert] = useState<string | null>(null);

  const attribution = named && maskedName !== null ? 'named' : 'anonymous';
  const ready = lines.every((line) => {
    const draft = drafts[line.id];

    return (
      draft !== undefined &&
      draft.rating >= 1 &&
      draft.body.trim().length <= MAX_BODY
    );
  });

  function submit() {
    setAlert(null);
    startTransition(async () => {
      const outcome = await submitOrderReviewsAction({
        orderNumber,
        items: lines.map((line) => {
          const draft = drafts[line.id];
          const body = draft?.body.trim() ?? '';

          return {
            orderLineId: line.id,
            rating: draft?.rating ?? 0,
            // Spread only when answered. `0` is "not answered", and sending it
            // would fail the portal's own CHECK — an unanswered delivery has to
            // reach the column as NULL or every read counts it as a one-star
            // verdict on a courier from somebody who said nothing.
            ...(draft === undefined || draft.deliveryRating === 0
              ? {}
              : { deliveryRating: draft.deliveryRating }),
            ...(body === '' ? {} : { body }),
            attribution,
          };
        }),
      });

      if (outcome.status === 'success') {
        onClose();
        router.push(postedHref(outcome.posted));

        return;
      }

      setAlert(outcome.message);

      if (outcome.status === 'partial') router.refresh();
    });
  }

  return (
    <ReviewModal
      title="Rate & review"
      subtitle={`Order ${orderNumber}`}
      onClose={onClose}
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-border-strong bg-white px-4 text-[13px] font-bold text-ink-muted transition hover:bg-surface-sunken"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!ready || pending}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand-600 px-5 text-[13px] font-bold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {pending ? 'Posting…' : 'Submit'}
          </button>
        </div>
      }
    >
      <ul className="flex flex-col gap-3">
        {lines.map((line) => (
          <ReviewDraftItem
            key={line.id}
            line={line}
            draft={drafts[line.id] ?? EMPTY_DRAFT}
            onChange={(patch) => onDraftChange(line.id, patch)}
          />
        ))}
      </ul>

      <label
        htmlFor="review-show-name"
        className="mt-3 flex cursor-pointer items-start gap-2.5 rounded-xl border border-border bg-white p-3.5"
      >
        <input
          id="review-show-name"
          type="checkbox"
          checked={named && maskedName !== null}
          disabled={maskedName === null}
          onChange={(event) => onNamedChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span className="flex flex-col">
          <span className="text-[13.5px] font-semibold text-ink">
            Show my name on this review
          </span>
          <span className="text-[12.5px] leading-relaxed text-ink-subtle">
            {maskedName === null
              ? 'Your order has no name we can shorten, so this review is posted without one.'
              : `Posted as ${maskedName} — your first name and the first letter of your last name. Unticked, it reads "A Sals3 customer".`}
          </span>
        </span>
      </label>

      <p className="mt-2 rounded-xl border border-border bg-surface-sunken p-3.5 text-[12.5px] leading-relaxed text-ink-muted">
        Your review shows on the product page straight away, with your rating
        and the size or colour you bought. The seller can answer it once.
      </p>

      {alert === null ? null : (
        <p
          role="alert"
          className="mt-2 rounded-lg border border-red-600/30 bg-red-50 p-3 text-[13px] font-medium text-red-700"
        >
          {alert}
        </p>
      )}
    </ReviewModal>
  );
}

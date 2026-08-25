'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import submitReviewAction, {
  type SubmitReviewFormState,
} from '@/app/orders/[orderNumber]/review/[lineId]/actions';
import StarRatingInput from '@/components/orders/StarRatingInput';
import { MAX_BODY } from '@/lib/orders/review-form';

type WriteReviewFormProps = {
  orderNumber: string;
  orderLineId: string;
  /** How the buyer's name will read if they choose to be credited. */
  maskedName: string | null;
  /** Where to send them once it posts. */
  returnHref: string;
};

/**
 * The buyer's review form.
 *
 * ## The rating is the only genuinely interactive part
 *
 * Everything else is a plain field. The stars need state because a rating you
 * cannot see yourself choosing is a rating people get wrong, and the row itself
 * is `StarRatingInput` — shared with the order list's modal, and still five real
 * radio inputs, so this form keeps posting `rating` as ordinary form data and
 * keeps working with JavaScript off.
 *
 * ## The name is a choice between two known strings
 *
 * There is no free-text name field. The buyer picks between the masked form of
 * the name already on their order and nothing at all, and the portal derives the
 * stored string from the order itself — so this form cannot publish a name
 * against somebody else's purchase even if the markup were tampered with.
 *
 * The masked name shown here is a **preview**: the server derives the
 * authoritative value from the same source, and if the two ever disagreed the
 * server's would win.
 *
 * ## What happens next is said before they press
 *
 * The review is live immediately, the seller may answer it once, and the
 * variant they bought is shown beside it. A buyer should know all three before
 * committing, not discover them afterwards.
 */
export default function WriteReviewForm({
  orderNumber,
  orderLineId,
  maskedName,
  returnHref,
}: WriteReviewFormProps) {
  const [state, formAction, pending] = useActionState<
    SubmitReviewFormState,
    FormData
  >(submitReviewAction, { status: 'idle' });
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState('');

  const tooLong = body.trim().length > MAX_BODY;

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <input type="hidden" name="orderNumber" value={orderNumber} />
      <input type="hidden" name="orderLineId" value={orderLineId} />

      <fieldset className="flex flex-col gap-2.5">
        <legend className="text-[13.5px] font-semibold text-ink">
          Your rating <span className="text-red-600">*</span>
        </legend>
        <StarRatingInput
          name="rating"
          idPrefix="rating"
          value={rating}
          onChange={setRating}
        />
      </fieldset>

      <label className="flex flex-col gap-1.5" htmlFor="review-body">
        <span className="text-[13.5px] font-semibold text-ink">
          What should other buyers know?{' '}
          <span className="font-medium text-ink-subtle">Optional</span>
        </span>
        <textarea
          id="review-body"
          name="body"
          rows={5}
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Sizing, material, how long it took to arrive, whether it matched the photos."
          className="rounded-lg border border-border-strong bg-white p-3 text-sm leading-relaxed text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        />
        <span className="flex items-baseline gap-2.5 text-[12.5px] text-ink-subtle">
          Write about the item. Do not put your address, phone number, or
          payment details here.
          <span
            className={`ml-auto shrink-0 tabular-nums ${tooLong ? 'font-semibold text-red-600' : 'text-ink-subtle'}`}
          >
            {body.trim().length} / {MAX_BODY}
          </span>
        </span>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-[13.5px] font-semibold text-ink">
          Show my name as
        </legend>
        {maskedName === null ? (
          <>
            <input type="hidden" name="attribution" value="anonymous" />
            <p className="text-[12.5px] leading-relaxed text-ink-muted">
              Your order has no name we can shorten, so this review will be
              posted without one.
            </p>
          </>
        ) : (
          <>
            <label
              htmlFor="attribution-named"
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border-strong bg-white p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-surface"
            >
              <input
                id="attribution-named"
                type="radio"
                name="attribution"
                value="named"
                defaultChecked
                className="h-4 w-4 accent-brand-600"
              />
              <span className="flex flex-col">
                <span className="text-[13.5px] font-semibold text-ink">
                  {maskedName}
                </span>
                <span className="text-[12.5px] text-ink-subtle">
                  Your first name and the first letter of your last name.
                </span>
              </span>
            </label>
            <label
              htmlFor="attribution-anonymous"
              className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border-strong bg-white p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-surface"
            >
              <input
                id="attribution-anonymous"
                type="radio"
                name="attribution"
                value="anonymous"
                className="h-4 w-4 accent-brand-600"
              />
              <span className="flex flex-col">
                <span className="text-[13.5px] font-semibold text-ink">
                  A Sals3 customer
                </span>
                <span className="text-[12.5px] text-ink-subtle">
                  Your name is not shown at all.
                </span>
              </span>
            </label>
          </>
        )}
      </fieldset>

      <p className="rounded-lg border border-border bg-surface p-3.5 text-[12.5px] leading-relaxed text-ink-muted">
        Your review shows on the product page straight away, with your rating
        and the size or colour you bought. The seller can answer it once.
      </p>

      {state.status === 'error' && state.message !== undefined ? (
        <p
          role="alert"
          className="rounded-lg border border-red-600/30 bg-red-50 p-3 text-[13px] font-medium text-red-700"
        >
          {state.message}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="submit"
          disabled={rating === 0 || tooLong || pending}
          className="inline-flex h-11 items-center rounded-lg bg-brand-600 px-5 text-sm font-semibold text-white transition hover:bg-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {pending ? 'Posting…' : 'Post review'}
        </button>
        <Link
          href={returnHref}
          className="inline-flex h-11 items-center rounded-lg border border-border-strong bg-white px-4 text-sm font-medium text-ink-muted transition hover:bg-surface hover:no-underline"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}

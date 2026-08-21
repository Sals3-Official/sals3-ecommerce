'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import submitReviewAction, {
  type SubmitReviewFormState,
} from '@/app/orders/[orderNumber]/review/[lineId]/actions';

const MAX_BODY = 1000;

const VERDICTS: Record<number, string> = {
  0: 'Choose a rating',
  1: 'Not what I expected',
  2: 'Less than I hoped',
  3: 'It is acceptable',
  4: 'Good',
  5: 'Very good',
};

/** Extracted so the branch is not three conditions deep inside a class string. */
function verdictTone(rating: number): string {
  if (rating === 0) return 'text-ink-subtle';

  return rating <= 2 ? 'text-red-600' : 'text-ink';
}

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
 * cannot see yourself choosing is a rating people get wrong — so the row is
 * five real radio inputs with the visual fill driven off the checked one, which
 * keeps keyboard and screen-reader behaviour for free rather than reimplementing
 * it on `div`s.
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
        <div className="flex items-center gap-3">
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <label
                key={value}
                htmlFor={`rating-${value}`}
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg transition hover:bg-surface-sunken has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600"
              >
                <input
                  id={`rating-${value}`}
                  type="radio"
                  name="rating"
                  value={value}
                  checked={rating === value}
                  onChange={() => setRating(value)}
                  className="sr-only"
                />
                <span className="sr-only">{value} out of 5</span>
                <svg
                  viewBox="0 0 16 16"
                  width={30}
                  height={30}
                  aria-hidden="true"
                  className={
                    value <= rating ? 'fill-rating' : 'fill-border-strong'
                  }
                >
                  <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .8 4.3L8 11.4l-3.9 2 .8-4.3-3.1-3 4.3-.6z" />
                </svg>
              </label>
            ))}
          </div>
          <span className={`text-sm font-semibold ${verdictTone(rating)}`}>
            {VERDICTS[rating]}
          </span>
        </div>
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

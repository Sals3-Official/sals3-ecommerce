'use client';

import { VERDICTS, verdictTone } from '@/lib/orders/review-form';

type StarRatingInputProps = {
  /** Groups the five radios. Must be unique per rating on the same page. */
  name: string;
  /** Prefixes each input's `id` so its label's `htmlFor` stays unique. */
  idPrefix: string;
  value: number;
  onChange: (rating: number) => void;
};

/**
 * The rating control: five real radio inputs, drawn as stars.
 *
 * ## Why radios and not `div`s with click handlers
 *
 * Arrow-key movement inside the group, the roving tab stop, the group semantics
 * a screen reader announces, and `:checked` — all of it comes free from the
 * platform and all of it has to be rebuilt by hand the moment the input is a
 * `div`. The `sr-only` input keeps the behaviour and the `svg` beside it carries
 * the appearance.
 *
 * ## Why the fill is driven by `value` and not by CSS alone
 *
 * A star row fills up to the chosen star, not just on it, and `:checked` styles
 * only the one input. The controlled value is what lets four stars read as four.
 *
 * ## Shared on purpose
 *
 * The route form at `/orders/[orderNumber]/review/[lineId]` and the order-list
 * modal both use this. Two copies of a rating control is two places for the
 * touch target, the focus ring and the verdict wording to drift apart, and the
 * one this replaced was already the only interactive part of the older form.
 */
export default function StarRatingInput({
  name,
  idPrefix,
  value,
  onChange,
}: StarRatingInputProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            htmlFor={`${idPrefix}-${star}`}
            className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg transition hover:bg-surface-sunken has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600"
          >
            <input
              id={`${idPrefix}-${star}`}
              type="radio"
              name={name}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className="sr-only"
            />
            <span className="sr-only">{star} out of 5</span>
            <svg
              viewBox="0 0 16 16"
              width={30}
              height={30}
              aria-hidden="true"
              className={star <= value ? 'fill-rating' : 'fill-border-strong'}
            >
              <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .8 4.3L8 11.4l-3.9 2 .8-4.3-3.1-3 4.3-.6z" />
            </svg>
          </label>
        ))}
      </div>
      <span className={`text-sm font-semibold ${verdictTone(value)}`}>
        {VERDICTS[value]}
      </span>
    </div>
  );
}

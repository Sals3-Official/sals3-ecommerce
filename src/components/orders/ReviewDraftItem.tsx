'use client';

import Image from 'next/image';
import StarRatingInput from '@/components/orders/StarRatingInput';
import { MAX_BODY } from '@/lib/orders/review-form';
import type { ReviewableLine } from '@/lib/orders/reviewable';

export type ReviewDraft = { rating: number; body: string };

type ReviewDraftItemProps = {
  line: ReviewableLine;
  draft: ReviewDraft;
  onChange: (patch: Partial<ReviewDraft>) => void;
};

/**
 * One item inside the modal: what it is, what it scores, what it says.
 *
 * ## Why the item is repeated rather than picked from a list
 *
 * An order can hold two delivered items, and a buyer rating both should not have
 * to remember which one they are on. So each gets its own block with its own
 * photo — the same reason the modal has no "item 1 of 2" stepper: a stepper
 * hides the second item behind a press, and a buyer who cannot see how much is
 * left abandons halfway.
 *
 * ## The photo is the line's own snapshot
 *
 * Never the live product image. What the buyer bought must not change because a
 * supplier swapped a photo afterwards, and this is the picture they are being
 * asked about. `next/image` here routes through the repository's CJ CDN loader
 * rather than Vercel's metered optimizer, and a line with no snapshot gets the
 * sunken square instead of a broken frame.
 *
 * ## The counter counts what the server will measure
 *
 * `body.trim().length`, because the action trims before it validates. A counter
 * that reads 998 while the server rejects at 1,000 is worse than no counter.
 */
export default function ReviewDraftItem({
  line,
  draft,
  onChange,
}: ReviewDraftItemProps) {
  const bodyId = `review-body-${line.id}`;
  const typed = draft.body.trim().length;
  const tooLong = typed > MAX_BODY;

  return (
    <li className="rounded-xl border border-border bg-white p-3.5 sm:p-4">
      <div className="flex gap-3">
        {line.imageUrl === null ? (
          <span
            aria-hidden
            className="block h-14 w-14 shrink-0 rounded-lg border border-border bg-surface-sunken"
          />
        ) : (
          <Image
            src={line.imageUrl}
            alt=""
            width={56}
            height={56}
            sizes="56px"
            className="h-14 w-14 shrink-0 rounded-lg border border-border bg-surface-sunken object-cover"
          />
        )}
        <div className="min-w-0">
          <p className="text-[14px] leading-snug font-semibold text-balance text-ink">
            {line.title}
          </p>
          {line.variant === null ? null : (
            <p className="mt-0.5 text-[13px] text-ink-muted">{line.variant}</p>
          )}
        </div>
      </div>

      <fieldset className="mt-3 border-t border-border pt-3">
        <legend className="sr-only">Rating for {line.title}</legend>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="text-[13.5px] font-semibold text-ink">
            Product quality <span className="text-red-600">*</span>
          </span>
          <StarRatingInput
            name={`rating-${line.id}`}
            idPrefix={`rating-${line.id}`}
            value={draft.rating}
            onChange={(rating) => onChange({ rating })}
          />
        </div>
      </fieldset>

      <label className="mt-2 flex flex-col gap-1.5" htmlFor={bodyId}>
        <span className="text-[13.5px] font-semibold text-ink">
          What should other buyers know?{' '}
          <span className="font-medium text-ink-subtle">Optional</span>
        </span>
        <textarea
          id={bodyId}
          rows={3}
          value={draft.body}
          onChange={(event) => onChange({ body: event.target.value })}
          placeholder="Sizing, material, how long it took to arrive, whether it matched the photos."
          className="rounded-lg border border-border-strong bg-white p-3 text-sm leading-relaxed text-ink outline-none focus-visible:ring-2 focus-visible:ring-brand-600"
        />
        <span className="flex items-baseline gap-2.5 text-[12.5px] text-ink-subtle">
          Write about the item. Do not put your address, phone number, or
          payment details here.
          <span
            className={`ml-auto shrink-0 tabular-nums ${tooLong ? 'font-semibold text-red-600' : 'text-ink-subtle'}`}
          >
            {typed} / {MAX_BODY}
          </span>
        </span>
      </label>
    </li>
  );
}

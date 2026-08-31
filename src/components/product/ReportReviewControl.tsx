'use client';

import { useState, useTransition } from 'react';
import reportReviewAction from '@/app/p/report-review-action';
import {
  REVIEW_FLAG_REASON_COPY,
  REVIEW_FLAG_REASONS,
  type ReviewFlagReason,
} from '@/lib/reviews/flag-reasons';

/**
 * "Report this review", and the five reasons behind it.
 *
 * ## Quiet until asked for
 *
 * A ghost link, not a button, and not a kebab menu. This control exists for the
 * rare review that breaks a rule; giving it the visual weight of "Add to cart"
 * on every row would suggest that disagreeing with a review is a thing to do,
 * which is the opposite of what a review section is for.
 *
 * The reasons only appear once it is pressed. Five radio options on every row
 * would be five rows of chrome per review, and nobody reads them until they
 * have already decided to report something.
 *
 * ## A reason is required, and it is a closed list
 *
 * No free text. A note field here would be an unmoderated string on a public
 * object reachable by anyone signed in, and the moderator's actual question is
 * which rule is said to be broken — five words answer that better than a
 * paragraph.
 *
 * ## What it promises, and what it does not
 *
 * "Reported. Someone will look at this." Not "removed", not "thank you for
 * keeping Sals3 safe". The portal records a request and no count of them hides
 * anything, because an automatic hide at any threshold would let a competitor
 * with four accounts erase a rating. Saying more than was done is the one thing
 * this control must not do.
 *
 * The reported state is local and deliberately not persisted: it is a receipt
 * for the press, and the durable answer is the portal's own
 * one-report-per-person index, which refuses a second attempt with a sentence
 * of its own.
 */
export default function ReportReviewControl({
  reviewId,
}: {
  reviewId: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function report(reason: ReviewFlagReason) {
    setError(null);
    startTransition(async () => {
      const result = await reportReviewAction({ reviewId, reason });

      if (!result.ok) {
        setError(result.message);

        return;
      }

      setDone(true);
      setOpen(false);
    });
  }

  if (done) {
    return (
      <p role="status" className="mt-1 text-xs leading-relaxed text-ink-subtle">
        Reported. Someone will look at this.
      </p>
    );
  }

  return (
    <div className="mt-1">
      {open ? (
        <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
          <p className="text-xs font-medium text-ink-muted">
            Why should this be looked at?
          </p>
          <div className="flex flex-wrap gap-1.5">
            {REVIEW_FLAG_REASONS.map((reason) => (
              <button
                key={reason}
                type="button"
                disabled={pending}
                onClick={() => report(reason)}
                className="rounded-full border border-border-strong bg-white px-2.5 py-1 text-xs font-medium text-ink transition hover:border-brand-600 hover:text-brand-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {REVIEW_FLAG_REASON_COPY[reason]}
              </button>
            ))}
          </div>
          <p className="text-[11px] leading-relaxed text-ink-subtle">
            A report asks a person to read it. Nothing is removed automatically.
          </p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="self-start text-xs font-medium text-ink-subtle underline underline-offset-2 hover:text-ink"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-xs text-ink-subtle underline underline-offset-2 transition hover:text-ink"
        >
          Report this review
        </button>
      )}

      {error === null ? null : (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

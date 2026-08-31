'use client';

import { useRef, useState } from 'react';
import {
  MAX_REVIEW_PHOTOS,
  REVIEW_PHOTO_LIMITS_COPY,
} from '@/lib/orders/review-form';

/**
 * Up to four photos, chosen before the review is posted.
 *
 * ## One hidden file input per slot, and why
 *
 * The photos have to reach the Server Action as `photo0…photo3`, in the order
 * the buyer arranged them — a `FormData`'s field order is the client's, and a
 * photo silently reordered between the picker and the page is the kind of thing
 * nobody notices until somebody complains their "before" shot came second. A
 * `DataTransfer`-backed multi-file input cannot express that ordering without
 * rebuilding the list on every removal, so each slot owns its own input and its
 * own name.
 *
 * ## The previews are object URLs, revoked on removal
 *
 * `URL.createObjectURL` holds the file in memory until it is revoked. Four
 * phone photos is tens of megabytes, and a buyer who swaps all four twice would
 * otherwise leave eight of them pinned for the life of the page.
 *
 * ## Nothing is uploaded here
 *
 * The files ride the form submission, and the action posts them one at a time
 * after the review exists — the portal's route explains why: the deployed
 * platform caps a serverless request body at 4.5 MB, so they cannot all travel
 * with the review, and a review that fails after its photos are stored is worse
 * than photos that fail after the review is safe.
 *
 * That means a refusal — too wide, too large, not an image — arrives *after*
 * the review is posted. The caption states the limits up front for exactly that
 * reason: this is one of the few forms where the validation a buyer can act on
 * has to happen before they press, because afterwards the review cannot be
 * written again.
 */
export default function ReviewPhotoPicker() {
  const [files, setFiles] = useState<(File | null)[]>(
    Array.from({ length: MAX_REVIEW_PHOTOS }, () => null),
  );
  const [previews, setPreviews] = useState<(string | null)[]>(
    Array.from({ length: MAX_REVIEW_PHOTOS }, () => null),
  );
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  function choose(index: number, file: File | null) {
    setPreviews((current) => {
      const next = [...current];
      const previous = next[index];

      if (previous !== null && previous !== undefined) {
        URL.revokeObjectURL(previous);
      }

      next[index] = file === null ? null : URL.createObjectURL(file);

      return next;
    });
    setFiles((current) => {
      const next = [...current];

      next[index] = file;

      return next;
    });
  }

  function remove(index: number) {
    const input = inputs.current[index];

    // The input's own value has to be cleared too, or the browser keeps sending
    // the removed file and re-picking the same one fires no `change` event.
    if (input != null) input.value = '';

    choose(index, null);
  }

  const chosen = files.filter((file) => file !== null).length;

  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-1 text-[13.5px] font-semibold text-ink">
        Photos{' '}
        <span className="font-medium text-ink-subtle">
          Optional, up to {MAX_REVIEW_PHOTOS}
        </span>
      </legend>

      <div className="flex flex-wrap items-start gap-2">
        {files.map((file, index) => (
          <div
            // The slot is the identity here, not the file: an index key is
            // wrong when a list reorders, and these four never do — removing
            // one empties its slot rather than shifting the rest along.
            // eslint-disable-next-line react/no-array-index-key
            key={index}
            className="relative"
          >
            <input
              ref={(element) => {
                inputs.current[index] = element;
              }}
              id={`review-photo-${index}`}
              type="file"
              name={`photo${index}`}
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) =>
                choose(index, event.target.files?.[0] ?? null)
              }
              className="sr-only"
            />
            <label
              htmlFor={`review-photo-${index}`}
              className="flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-dashed border-border-strong bg-white text-ink-subtle transition hover:border-brand-600 hover:text-brand-900 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-600"
            >
              {previews[index] === null || previews[index] === undefined ? (
                <span className="flex flex-col items-center gap-1">
                  <svg
                    viewBox="0 0 24 24"
                    width={18}
                    height={18}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    aria-hidden="true"
                  >
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span className="text-[10.5px]">Add</span>
                </span>
              ) : (
                // A plain `img`: the source is a `blob:` URL for a file that
                // never left this browser, and `next/image` has nothing to
                // optimise about one.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  // The visible label beside it already says what this is, and
                  // the slot's own `sr-only` text carries the position.
                  alt=""
                  src={previews[index]}
                  className="h-full w-full object-cover"
                />
              )}
              <span className="sr-only">
                {file === null
                  ? `Add photo ${index + 1}`
                  : `Replace photo ${index + 1}`}
              </span>
            </label>

            {file === null ? null : (
              <button
                type="button"
                onClick={() => remove(index)}
                aria-label={`Remove photo ${index + 1}`}
                className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white transition hover:bg-brand-900"
              >
                <svg
                  viewBox="0 0 24 24"
                  width={10}
                  height={10}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            )}
          </div>
        ))}
      </div>

      <p className="text-[12.5px] leading-relaxed text-ink-subtle">
        {REVIEW_PHOTO_LIMITS_COPY}. They are published with your review, so keep
        faces, addresses and order paperwork out of them.
        {chosen === 0
          ? ''
          : ` ${chosen} of ${MAX_REVIEW_PHOTOS} chosen — they upload after your review is posted.`}
      </p>
    </fieldset>
  );
}

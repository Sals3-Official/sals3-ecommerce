'use client';

import { useCallback, useEffect, useState } from 'react';
import SuccessToast from '@/components/ui/SuccessToast';
import {
  REVIEW_POSTED_PARAM,
  postedReviewsToast,
} from '@/lib/orders/review-form';

type OrdersFlashToastProps = {
  /** Validated by the page. `0` means nothing was posted and nothing shows. */
  posted: number;
};

/**
 * The toast a buyer lands on after posting a review.
 *
 * ## Why the message arrives in the URL
 *
 * The modal's success ends in a redirect to the Completed lane, so a toast
 * rendered inside the dialog would unmount mid-animation. The count travels as
 * `?posted=n` — the same way every other piece of this list's state travels —
 * which means the page validates it like any other parameter and the sentence is
 * composed from a number rather than from a string somebody could edit.
 *
 * ## Why the parameter is then removed
 *
 * `history.replaceState`, not a router navigation: the address bar should stop
 * saying `posted=2` so a refresh or a shared link does not re-announce a review
 * from ten minutes ago, and doing it through the router would re-render the list
 * for a cosmetic change to the URL. Nothing about the page depends on the
 * parameter after this component has read it.
 *
 * The effect sets no state, which is the point — the toast is already on screen
 * from the first render, and stripping the parameter is a side effect on an
 * external system (the history entry) rather than a second render pass.
 */
export default function OrdersFlashToast({ posted }: OrdersFlashToastProps) {
  const [dismissed, setDismissed] = useState(false);
  const dismiss = useCallback(() => setDismissed(true), []);

  useEffect(() => {
    if (posted <= 0) return;

    const url = new URL(window.location.href);

    if (!url.searchParams.has(REVIEW_POSTED_PARAM)) return;

    url.searchParams.delete(REVIEW_POSTED_PARAM);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }, [posted]);

  if (posted <= 0 || dismissed) return null;

  return <SuccessToast text={postedReviewsToast(posted)} onDismiss={dismiss} />;
}

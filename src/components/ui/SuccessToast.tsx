'use client';

import { useEffect, useState } from 'react';
import { CheckBadgeIcon, CloseIcon } from '@/components/icons/Icon';

/** Long enough to read a short sentence, short enough not to sit over content. */
const AUTO_DISMISS_MS = 4000;

type SuccessToastProps = {
  text: string;
  onDismiss: () => void;
};

/**
 * The one success toast this storefront has, extracted so it stays one.
 *
 * `CartToast` drew it first and the review flow needed the same thing on a
 * different page; a second copy would be a second place for the auto-dismiss
 * delay, the teal check, the `aria-live` politeness and the reduced-motion
 * guard to drift. Callers own *when* it shows and *what it says* — this file
 * owns how it looks and how long it stays.
 *
 * ## Mount it fresh per message
 *
 * The reveal and the timer both run on mount, so a caller showing a second
 * message must remount (a changing `key`) rather than swapping `text` under a
 * toast that is already counting down.
 *
 * ## Why a close button on a self-dismissing toast
 *
 * Four seconds is a guess. It is also the only thing on top of the page a
 * keyboard or screen-reader user has to wait out, and 44px of tap target is
 * cheaper than making them.
 */
export default function SuccessToast({ text, onDismiss }: SuccessToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showFrame = requestAnimationFrame(() => setVisible(true));
    const dismissTimer = setTimeout(onDismiss, AUTO_DISMISS_MS);

    return () => {
      cancelAnimationFrame(showFrame);
      clearTimeout(dismissTimer);
    };
  }, [onDismiss]);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      <div
        role="status"
        aria-live="polite"
        className={`pointer-events-auto flex items-center gap-2 rounded-xl bg-ink py-1.5 pr-1.5 pl-3.5 text-white shadow-[0_16px_34px_rgba(11,44,77,0.28)] transition-all duration-300 ease-out motion-reduce:transition-none ${
          visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
        }`}
      >
        <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-teal-500">
          <CheckBadgeIcon width={14} height={14} className="text-white" />
        </span>
        <p className="text-sm font-bold">{text}</p>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss notification"
          className="flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-full text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white active:scale-90"
        >
          <CloseIcon width={14} height={14} />
        </button>
      </div>
    </div>
  );
}

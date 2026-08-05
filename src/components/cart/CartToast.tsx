'use client';

import { useEffect, useState } from 'react';
import { CheckBadgeIcon, CloseIcon } from '@/components/icons/Icon';
import type { CartToastMessage } from '@/lib/cart';

const AUTO_DISMISS_MS = 4000;

type CartToastProps = {
  toast: CartToastMessage | null;
  onDismiss: () => void;
};

export default function CartToast({ toast, onDismiss }: CartToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!toast) {
      return undefined;
    }

    const showFrame = requestAnimationFrame(() => setVisible(true));
    const dismissTimer = setTimeout(onDismiss, AUTO_DISMISS_MS);

    return () => {
      cancelAnimationFrame(showFrame);
      clearTimeout(dismissTimer);
    };
  }, [toast, onDismiss]);

  if (!toast) {
    return null;
  }

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
        <p className="text-sm font-bold">{toast.text}</p>
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

'use client';

import { useEffect, useState } from 'react';

/**
 * Copies the order number — the one string a buyer hands to support.
 *
 * The whole reason `/orders/[orderNumber]` is keyed on the number rather than
 * the uuid is that the number is what the buyer already holds from checkout, so
 * making it one click to carry is the point of the control rather than a
 * flourish.
 *
 * The smallest client boundary in this feature: everything else on both routes
 * is a Server Component, and this is a button and one piece of transient state.
 * `navigator.clipboard` is absent over plain HTTP and can be refused by
 * permission policy, so the failure path leaves the label alone rather than
 * claiming a copy that did not happen.
 *
 * The confirmation is announced, not only shown: `aria-live="polite"` on the
 * status text means a screen reader user learns the copy worked, and the timer
 * is cleared on unmount so a navigation mid-confirmation cannot set state on a
 * component that is gone.
 */

const RESET_MS = 2000;

type CopyOrderNumberProps = {
  value: string;
};

export default function CopyOrderNumber({ value }: CopyOrderNumberProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = copied
      ? setTimeout(() => setCopied(false), RESET_MS)
      : undefined;

    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy order number ${value}`}
        className="cursor-pointer rounded-md border border-border-strong bg-white px-2 py-1 text-[11px] font-semibold text-ink-muted hover:bg-surface-sunken"
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
      <span aria-live="polite" className="sr-only">
        {copied ? `Order number ${value} copied` : ''}
      </span>
    </>
  );
}

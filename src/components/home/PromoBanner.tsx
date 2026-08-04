'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CheckBadgeIcon, CloseIcon } from '@/components/icons/Icon';

export default function PromoBanner() {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return null;
  }

  return (
    <div className="relative mt-5 flex flex-col gap-3 rounded-xl bg-surface-dark p-4 pr-12 sm:flex-row sm:items-center sm:gap-5 sm:px-5 sm:pr-14">
      <span className="hidden self-stretch w-1 flex-none rounded bg-gradient-to-br from-[#ff253a] to-[#e11d48] sm:block" />
      <div className="min-w-0 flex-1">
        <div className="font-display text-[22px] leading-tight font-semibold tracking-tight text-white text-pretty">
          Free shipping this weekend
        </div>
        <div className="mt-1 text-xs text-slate-300">
          On orders over ₱600, all sellers
        </div>
      </div>
      <div className="hidden flex-none items-center gap-1.5 rounded-lg border border-white/30 px-2.5 py-1.5 text-xs font-bold text-white sm:flex">
        <CheckBadgeIcon width={14} height={14} className="text-[#ff253a]" />
        Applied before you pay
      </div>
      <Link
        href="/deals"
        className="flex min-h-11 flex-none items-center justify-center rounded-lg border border-white/40 px-5 py-0 text-sm font-bold text-white hover:bg-white/10 hover:no-underline"
      >
        See what qualifies
      </Link>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss this banner"
        className="absolute top-2 right-2 min-h-11 min-w-11 flex-none rounded-lg text-slate-400 hover:text-white"
      >
        <CloseIcon className="mx-auto" />
      </button>
    </div>
  );
}

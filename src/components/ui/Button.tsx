import type { ReactNode } from 'react';
import Spinner from '@/components/ui/Spinner';

/**
 * The storefront's two button shapes.
 *
 * Extracted because the same two long class strings were copy-pasted across
 * `ProductAddToCartButtons`, `p/[id]/error.tsx`, `p/[id]/not-found.tsx` and the
 * auth `SubmitButton`, which meant a disabled-state or focus fix had to be made
 * four times and in practice drifted between them.
 *
 * Props are listed explicitly rather than forwarded: this codebase forbids JSX
 * prop spreading, and an explicit surface is what keeps a shared control from
 * quietly growing a dozen behaviours. Presentational only — no hooks, no state —
 * so a client component can import it without pulling anything server-side into
 * the browser bundle.
 *
 * ## The `solid` fill
 *
 * `solid` now wears `.bg-brand-gradient`, the same navy-to-brand-blue run as the
 * cart and checkout calls to action. It was flat `bg-brand-900` on the argument
 * that a gradient reads as promotional on a page meant to read as a record —
 * the owner reversed that on 2026-08-19 so the primary action looks identical
 * everywhere a buyer meets it. This was the exact one-line swap the previous
 * note anticipated.
 *
 * ## `isPending`
 *
 * Renders a spinner and disables the control. Separate from `disabled` because
 * the two mean different things to a buyer: `disabled` is "you cannot do this",
 * `isPending` is "you already did, wait". The label stays visible beside the
 * spinner rather than being replaced, so the button does not change width
 * mid-click and the buyer can still see what they pressed.
 */

const BASE =
  'min-h-11 flex-1 cursor-pointer rounded-lg px-6 text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100';

const VARIANTS = {
  outline:
    'border border-brand-600 text-brand-600 hover:bg-brand-600/10 disabled:border-border-strong disabled:text-ink-faint disabled:hover:bg-transparent',
  solid:
    'bg-brand-gradient text-white hover:opacity-90 disabled:bg-surface-sunken disabled:bg-none disabled:text-ink-faint disabled:hover:opacity-100',
} as const;

type ButtonProps = {
  variant: keyof typeof VARIANTS;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  isPending?: boolean;
  className?: string;
};

export default function Button({
  variant,
  children,
  onClick,
  disabled = false,
  isPending = false,
  className = '',
}: ButtonProps) {
  const isBlocked = disabled || isPending;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBlocked}
      aria-disabled={isBlocked}
      aria-busy={isPending}
      className={`${BASE} ${VARIANTS[variant]} ${className} inline-flex items-center justify-center gap-2`}
    >
      {isPending ? <Spinner /> : null}
      {children}
    </button>
  );
}

import type { ReactNode } from 'react';

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
 * `solid` is flat `bg-brand-900`. The app's `.bg-brand-gradient` utility still
 * exists in `globals.css` and is used elsewhere; the PDP deliberately does not
 * use it, because a gradient call-to-action reads as promotional and the page is
 * meant to read as a record of what is known about an item. That is a taste call
 * the owner may reverse: swap `bg-brand-900` for `bg-brand-gradient` on the one
 * line below and nothing else changes.
 */

const BASE =
  'min-h-11 flex-1 cursor-pointer rounded-lg px-6 text-sm font-bold transition-all duration-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:active:scale-100';

const VARIANTS = {
  outline:
    'border border-brand-600 text-brand-600 hover:bg-brand-600/10 disabled:border-border-strong disabled:text-ink-faint disabled:hover:bg-transparent',
  solid:
    'bg-brand-900 text-white hover:opacity-90 disabled:bg-surface-sunken disabled:text-ink-faint disabled:hover:opacity-100',
} as const;

type ButtonProps = {
  variant: keyof typeof VARIANTS;
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
};

export default function Button({
  variant,
  children,
  onClick,
  disabled = false,
  className = '',
}: ButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-disabled={disabled}
      className={`${BASE} ${VARIANTS[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

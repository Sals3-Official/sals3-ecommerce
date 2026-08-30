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
 * **That list is history, not current fact** — corrected 2026-08-21, after the
 * stale version of it was quoted into a pull request description as the blast
 * radius of a colour change, sending a reviewer to check three screens this
 * component no longer reaches. Only `ProductAddToCartButtons` imports it today;
 * the others drifted back to inline class strings. So a change here touches the
 * PDP's purchase actions and nothing else — and re-adopting this component on
 * those screens is the follow-up the extraction was for in the first place.
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

/**
 * The Sals3 Blue Gradient pair, **split by role** — the one thing about these
 * two colours that must not be forgotten:
 *
 * - `brand-blue-900` `#002b53` is 14.3:1 on white and carries every label.
 * - `brand-blue-500` `#018cc9` is 3.75:1 on white. It passes the 3:1 bar for a
 *   UI component boundary and fails the 4.5:1 bar for text, so it is a border
 *   and a focus ring and **never** a label colour. Reaching for it as text
 *   reintroduces the exact failure that took three review rounds to clear.
 *
 * `disabled:text-ink-subtle`, not `ink-faint`: `#8a9196` is 3.2:1 and this
 * codebase treats it as a border-only token. WCAG exempts an inactive control,
 * but a token split by role is only worth anything if it is absolute.
 */
/**
 * `confirm` is not a third call to action. It is what `outline` becomes for a
 * moment after it is pressed, so it deliberately keeps the same geometry and
 * changes only its skin — the button must not resize or move under the finger
 * that just pressed it.
 *
 * `teal-500` rather than the brand gradient, on purpose: the gradient means "do
 * this" everywhere else on the site, and this state means "that is done". White
 * on `#157f7f` measures 4.9:1, so the label clears AA as text and does not need
 * the split-by-role treatment the blue pair does.
 */
const VARIANTS = {
  outline:
    'border border-brand-blue-500 text-brand-blue-900 hover:bg-brand-blue-900/8 disabled:border-border-strong disabled:text-ink-subtle disabled:hover:bg-transparent',
  solid:
    'text-white hover:opacity-90 disabled:bg-surface-sunken disabled:text-ink-subtle disabled:hover:opacity-100',
  confirm: 'border border-teal-500 bg-teal-500 text-white',
} as const;

/**
 * The gradient is applied conditionally rather than sitting in `solid` with a
 * `disabled:bg-none` beside it, because that pair **did not work**.
 *
 * `.bg-brand-gradient` is a plain unlayered rule in `globals.css` — a
 * `@keyframes`-style escape hatch, since a gradient cannot be expressed as a
 * Tailwind utility — and CSS gives unlayered declarations priority over layered
 * ones regardless of specificity. Every Tailwind utility is emitted inside
 * `@layer utilities`, so `disabled:bg-none` lost, silently: a disabled Buy Now
 * kept the full navy-to-blue fill and put `--color-ink-subtle` text on top of
 * it, which is unreadable as well as a lie about the control being live.
 *
 * That is the same cascade trap `globals.css` documents for its bare `a`
 * selector. It went unnoticed here because the PDP's solid button was almost
 * never disabled — until the buyer stopped arriving with a variant preselected
 * (2026-08-31) and every options product started painting one on first load.
 *
 * Keeping the class off the element entirely is what makes the disabled skin
 * reachable. Moving `.bg-brand-gradient` into a layer would fix it globally, but
 * it also re-ranks that class against every utility on the cart and all three
 * checkout steps, which is a bigger change than this button needs.
 */
const SOLID_FILL = 'bg-brand-gradient';

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
  const fill = variant === 'solid' && !isBlocked ? SOLID_FILL : '';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isBlocked}
      aria-disabled={isBlocked}
      aria-busy={isPending}
      className={`${BASE} ${VARIANTS[variant]} ${fill} ${className} inline-flex items-center justify-center gap-2`}
    >
      {isPending ? <Spinner /> : null}
      {children}
    </button>
  );
}

const SIZES = {
  sm: 'h-4 w-4 border-2',
  lg: 'h-14 w-14 border-4',
} as const;

type SpinnerProps = {
  size?: keyof typeof SIZES;
  className?: string;
};

/**
 * A spinning ring.
 *
 * Purely decorative and `aria-hidden`: a spinner conveys "working" to a sighted
 * user, and repeating that to a screen reader as a graphic is noise. The
 * announcement belongs to whatever owns the wait — the button's own label
 * changes, or the live region in `LoadingOverlay` — so the state is spoken once,
 * in words, rather than twice.
 *
 * Built from a border with one transparent side rather than an SVG or an image:
 * it inherits `currentColor`, so it is legible on the gradient buttons and on
 * the light overlay without a second variant. `globals.css` already reduces
 * every animation to 0.01ms under `prefers-reduced-motion`, so this stops
 * spinning there without needing its own guard.
 */
export default function Spinner({ size = 'sm', className = '' }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block flex-none animate-spin rounded-full border-current border-t-transparent ${SIZES[size]} ${className}`}
    />
  );
}

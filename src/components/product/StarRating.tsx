const SIZES = { sm: 12, md: 15, lg: 18 } as const;

type StarRatingProps = {
  /** 1-5. Anything else renders as no stars rather than clamping to one. */
  rating: number;
  size?: keyof typeof SIZES;
  /**
   * The accessible name, required. Five identical glyphs mean nothing to a
   * screen reader, and the value is the only part that carries what a sighted
   * reader gets from the fill.
   *
   * Pass `''` for a decorative star used as a unit marker beside a number the
   * surrounding text already announces.
   */
  label: string;
};

/**
 * Five stars, filled to `rating`.
 *
 * `--color-rating` — the same value the Seller Center uses, so a seller and a
 * buyer see one colour for one thing. A token rather than a literal, because
 * `orders-surface.test.tsx` walks this feature's source and refuses a raw hex
 * where a token exists, and it is right to.
 *
 * Inline SVG rather than a font glyph or an emoji: it scales with the type, it
 * recolours, and `★` renders as a different shape on every platform.
 */
export default function StarRating({
  rating,
  size = 'md',
  label,
}: StarRatingProps) {
  const filled =
    Number.isInteger(rating) && rating >= 1 && rating <= 5 ? rating : 0;
  const pixels = SIZES[size];

  return (
    <span className="inline-flex items-center gap-0.5 align-middle">
      {label === '' ? null : <span className="sr-only">{label}</span>}
      {[1, 2, 3, 4, 5].map((position) => (
        <svg
          key={position}
          viewBox="0 0 16 16"
          width={pixels}
          height={pixels}
          aria-hidden="true"
          className={position <= filled ? 'fill-rating' : 'fill-border-strong'}
        >
          <path d="M8 1.6l1.9 3.9 4.3.6-3.1 3 .8 4.3L8 11.4l-3.9 2 .8-4.3-3.1-3 4.3-.6z" />
        </svg>
      ))}
    </span>
  );
}

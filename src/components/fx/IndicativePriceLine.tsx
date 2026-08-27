import { toIndicativePrice } from '@/lib/fx/indicative-price';
import type { IndicativeRate } from '@/lib/fx/rates';
import type { Money } from '@/lib/money';

type IndicativePriceLineProps = {
  /** The amount the buyer is actually charged. Converted, never replaced. */
  price: Money;
  /** Resolved once per page render on the server, and passed down. */
  rate: IndicativeRate | null;
  /** Spacing from whatever sits above it; the type scale is fixed here. */
  className?: string;
};

/**
 * The approximate local price, or nothing at all.
 *
 * ## The one rule
 *
 * USD is what the buyer is charged, so the USD figure stays the prominent one
 * and this line is deliberately smaller, quieter and secondary. When there is
 * no usable rate this renders **nothing** — no dash, no "unavailable", no empty
 * row. `toIndicativePrice` already collapses every failure to `null` (see
 * `rates.ts`), and the correct response to all of them is the same: the USD
 * price is complete on its own, and an absent extra costs the buyer nothing
 * while a wrong one they cannot verify costs them trust.
 *
 * ## The note is text, not a tooltip
 *
 * ADR-003 §3 requires the display to be clearly labelled, and `indicative-price`
 * returns the sentence from the same call as the number so a caller cannot
 * render one without the other. It is rendered as visible text in the DOM
 * rather than a `title` attribute: a `title` is invisible to a screen reader on
 * a non-interactive element, absent on touch, and would leave the figure
 * standing unlabelled for exactly the reader least able to check it. Small is
 * fine. Hidden is not.
 *
 * ## Why this takes a `Money` and not a number
 *
 * `Money.currency` is a union, and `AUD` is already in it. A conversion applied
 * to an amount that is not USD would print a plausible-looking figure that is
 * simply wrong, so a non-USD price renders nothing here instead — the same
 * answer as a missing rate, for the same reason.
 *
 * Nothing this produces is a `Money` and nothing leaves this component: the
 * value exists only as the string on the page.
 */
export default function IndicativePriceLine({
  price,
  rate,
  className,
}: IndicativePriceLineProps) {
  const indicative =
    price.currency === 'USD'
      ? toIndicativePrice(price.amountMinor, rate)
      : null;

  if (indicative === null) return null;

  return (
    <div className={className}>
      <p className="text-sm font-medium text-ink-muted tabular-nums">
        {/*
          The approximation sign is part of the reading, not decoration: it is
          the first thing that distinguishes this figure from the price above it
          for someone scanning rather than reading.
        */}
        ≈ {indicative.formatted}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-ink-faint">
        {indicative.note}
      </p>
    </div>
  );
}

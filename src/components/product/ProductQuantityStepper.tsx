'use client';

import { MAX_LINE_QUANTITY } from '@/lib/cart';
import { MinusIcon, PlusIcon } from '@/components/icons/Icon';
import { PRODUCT_MICRO_LABEL } from '@/components/product/product-label-styles';

type ProductQuantityStepperProps = {
  value: number;
  /**
   * A direction, not a destination.
   *
   * The control used to hand up `value + 1`, which reads the count from the
   * render it was clicked in. Two presses inside one React batch — a double tap,
   * a held Enter, an assistive click pair — therefore both computed the same
   * number and one of them was lost: pressing `+` twice from 1 put **2** in the
   * cart, not 3. Caught in a browser, and invisible to a `fireEvent` test,
   * because Testing Library flushes a render between clicks and a finger does
   * not. Sending the delta lets the parent apply it functionally, so every press
   * is counted from whatever the last one left behind.
   */
  onStep: (delta: number) => void;
};

/**
 * One press, clamped. Exported so the parent can apply it inside a functional
 * state update rather than reimplementing the bounds beside its own `useState`.
 */
export function stepQuantity(current: number, delta: number): number {
  return Math.min(Math.max(current + delta, 1), MAX_LINE_QUANTITY);
}

/**
 * How many of the chosen option to buy, decided before the buy rather than after
 * it.
 *
 * Until now the PDP could only ever add one, and a buyer who wanted three had to
 * add one, go to the cart, and press `+` twice — three screens for a number they
 * already knew on the product page.
 *
 * ## Why it looks exactly like the cart's
 *
 * The control on `CartLineItemRow` is the same control for the same quantity, so
 * it is copied value for value: 44px squares, `rounded-md`, a `border-strong`
 * hairline, the brand-600 hover wash, `active:scale-95`, and the count between
 * them on a `min-w-5` centre. Two different steppers for one number is how a
 * buyer learns that the cart is a different place with different rules.
 *
 * It is deliberately **not** extracted into one shared component with the cart's.
 * That row's buttons carry the cart's own concerns — a remove control beside
 * them, a line total to the right, a decrease that removes at zero — and folding
 * two callers into one component would mean props for all of it. The rule the
 * codebase learned from `Button` is the opposite one: extract when a fix has to
 * be made in more than one place, and this is a class string, not a behaviour.
 *
 * ## Bounds
 *
 * `MAX_LINE_QUANTITY` is the cart's own ceiling, imported rather than restated,
 * so the PDP cannot offer a number the cart would clamp. The buttons disable at
 * each end rather than silently refusing, and the limit is said in words once it
 * is reached — a disabled control with no explanation is the same defect as a
 * grey Add to Cart with no reason.
 *
 * This does not validate anything. `addItem` clamps server-side of the UI in
 * `cart.ts`, which is where the real bound lives; these buttons only keep a
 * buyer from asking for something that would be quietly changed.
 */
export default function ProductQuantityStepper({
  value,
  onStep,
}: ProductQuantityStepperProps) {
  const atFloor = value <= 1;
  const atCeiling = value >= MAX_LINE_QUANTITY;

  const button =
    'flex h-11 w-11 flex-none cursor-pointer items-center justify-center rounded-md border border-border-strong text-sm transition-all duration-200 hover:border-brand-600 hover:bg-brand-600/5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border-strong disabled:hover:bg-transparent disabled:active:scale-100';

  return (
    <div>
      <h2
        id="product-quantity-label"
        className={`mb-1.5 ${PRODUCT_MICRO_LABEL}`}
      >
        Quantity
      </h2>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => onStep(-1)}
          disabled={atFloor}
          aria-label="Decrease quantity"
          className={button}
        >
          <MinusIcon />
        </button>
        {/*
          Announced politely so a screen-reader user hears the new number without
          the buttons stealing focus, and `tabular-nums` so 9 to 10 does not
          shift the two buttons apart.
        */}
        <span
          aria-live="polite"
          aria-labelledby="product-quantity-label"
          className="min-w-5 text-center text-sm tabular-nums"
        >
          {value}
        </span>
        <button
          type="button"
          onClick={() => onStep(1)}
          disabled={atCeiling}
          aria-label="Increase quantity"
          className={button}
        >
          <PlusIcon />
        </button>
        {atCeiling ? (
          <span className="ml-1 text-xs text-ink-subtle">
            {MAX_LINE_QUANTITY} is the most on one line.
          </span>
        ) : null}
      </div>
    </div>
  );
}

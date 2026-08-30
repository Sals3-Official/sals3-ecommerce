import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const validateCheckoutCart = vi.fn();

vi.mock('./cart-validation', () => ({
  validateCheckoutCart: (...args: unknown[]) => validateCheckoutCart(...args),
}));

const { default: repriceCheckoutCart } = await import('./reprice');

const usd = (amountMinor: number) => ({
  amountMinor,
  currency: 'USD' as const,
});

describe('repriceCheckoutCart', () => {
  beforeEach(() => {
    validateCheckoutCart.mockReset();
  });

  /**
   * The order that produced this fix. The beanie had moved from $86.40 to
   * $87.69 while it sat in the cart; the summary showed US$125.58 through two
   * steps and Stripe asked for $126.87.
   */
  it('reports the line that moved, with both figures', async () => {
    validateCheckoutCart.mockResolvedValue({
      lines: [
        {
          productId: 'beanie',
          title: 'Mohair Knit Beanie',
          unitPrice: usd(8769),
        },
        {
          productId: 'light',
          title: 'LED Selfie Fill Light',
          unitPrice: usd(732),
        },
      ],
      subtotal: usd(9501),
    });

    const result = await repriceCheckoutCart(
      [
        { productId: 'beanie', quantity: 1 },
        { productId: 'light', quantity: 1 },
      ],
      [usd(8640), usd(732)],
    );

    expect(result.changed).toHaveLength(1);
    expect(result.changed[0]).toMatchObject({
      title: 'Mohair Knit Beanie',
      previousUnitPrice: usd(8640),
      unitPrice: usd(8769),
    });
  });

  /** The ordinary path, and the one that must stay silent. */
  it('reports nothing when every price still matches', async () => {
    validateCheckoutCart.mockResolvedValue({
      lines: [{ productId: 'light', title: 'LED', unitPrice: usd(732) }],
      subtotal: usd(732),
    });

    const result = await repriceCheckoutCart(
      [{ productId: 'light', quantity: 1 }],
      [usd(732)],
    );

    expect(result.changed).toEqual([]);
    expect(result.lines[0]?.previousUnitPrice).toBeUndefined();
  });

  /**
   * A drop is still a change. A buyer charged less than the figure they agreed
   * to has still been shown a number that was not true.
   */
  it('reports a price that fell as well as one that rose', async () => {
    validateCheckoutCart.mockResolvedValue({
      lines: [{ productId: 'jeans', title: 'Jeans', unitPrice: usd(2000) }],
      subtotal: usd(2000),
    });

    const result = await repriceCheckoutCart(
      [{ productId: 'jeans', quantity: 1 }],
      [usd(2778)],
    );

    expect(result.changed).toHaveLength(1);
    expect(result.changed[0]?.previousUnitPrice).toEqual(usd(2778));
  });

  /** Nothing to compare against is not a change. */
  it('claims no change for a line whose carried price is unknown', async () => {
    validateCheckoutCart.mockResolvedValue({
      lines: [{ productId: 'jeans', title: 'Jeans', unitPrice: usd(2778) }],
      subtotal: usd(2778),
    });

    const result = await repriceCheckoutCart(
      [{ productId: 'jeans', quantity: 1 }],
      [],
    );

    expect(result.changed).toEqual([]);
  });

  /**
   * It must not become a second price reader. The amount Stripe charges comes
   * from `validateCheckoutCart`, so anything this returns has to be that.
   */
  it('takes its prices from the same reader the charge uses', async () => {
    validateCheckoutCart.mockResolvedValue({
      lines: [{ productId: 'jeans', title: 'Jeans', unitPrice: usd(2778) }],
      subtotal: usd(2778),
    });

    const result = await repriceCheckoutCart(
      [{ productId: 'jeans', quantity: 1 }],
      [usd(9999)],
    );

    expect(validateCheckoutCart).toHaveBeenCalledTimes(1);
    expect(result.lines[0]?.unitPrice).toEqual(usd(2778));
  });
});

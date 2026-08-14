import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductAvailabilityNotice from './ProductAvailabilityNotice';

describe('ProductAvailabilityNotice', () => {
  /**
   * `UNKNOWN` is the common case, and it is not a stock claim. A green "in
   * stock" badge on evidence nobody refreshed is the most damaging thing this
   * component could render.
   */
  it.each([undefined, 'UNKNOWN' as const])(
    'renders nothing for %s availability',
    (availability) => {
      const { container } = render(
        <ProductAvailabilityNotice availability={availability} />,
      );

      expect(container).toBeEmptyDOMElement();
    },
  );

  it('states both known states in words, not colour alone', () => {
    const inStock = render(
      <ProductAvailabilityNotice availability="AVAILABLE" />,
    );

    expect(screen.getByText(/in stock with the supplier/i)).toBeInTheDocument();
    inStock.unmount();

    render(<ProductAvailabilityNotice availability="UNAVAILABLE" />);

    expect(
      screen.getByText(/currently unavailable from the supplier/i),
    ).toBeInTheDocument();
  });

  /** No count, ever: Sals3 observes a supplier's stock, it does not hold it. */
  it('never renders a quantity', () => {
    const { container } = render(
      <ProductAvailabilityNotice availability="AVAILABLE" />,
    );

    expect(container.textContent).not.toMatch(/\d/);
  });
});

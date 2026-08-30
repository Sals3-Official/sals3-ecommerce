import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CheckoutPriceChangeNotice from './CheckoutPriceChangeNotice';

const usd = (amountMinor: number) => ({
  amountMinor,
  currency: 'USD' as const,
});

describe('CheckoutPriceChangeNotice', () => {
  /** The ordinary checkout must carry no banner at all. */
  it('renders nothing when no price moved', () => {
    const { container } = render(<CheckoutPriceChangeNotice changes={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * Both figures. "The price changed" sends a buyer looking for what it used to
   * be, which they cannot find from here.
   */
  it('names the item and shows the old price beside the new one', () => {
    render(
      <CheckoutPriceChangeNotice
        changes={[
          { title: 'Mohair Knit Beanie', from: usd(8640), to: usd(8769) },
        ]}
      />,
    );

    expect(screen.getByText(/mohair knit beanie/i)).toBeInTheDocument();
    expect(screen.getByText('US$86.40')).toBeInTheDocument();
    expect(screen.getByText('US$87.69')).toBeInTheDocument();
  });

  /** Announced, because it appears after the page the buyer already read. */
  it('announces itself to assistive technology', () => {
    render(
      <CheckoutPriceChangeNotice
        changes={[{ title: 'Jeans', from: usd(2778), to: usd(2000) }]}
      />,
    );

    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('says how many moved when more than one did', () => {
    render(
      <CheckoutPriceChangeNotice
        changes={[
          { title: 'Beanie', from: usd(8640), to: usd(8769) },
          { title: 'Jeans', from: usd(2778), to: usd(2900) },
        ]}
      />,
    );

    expect(screen.getByText(/some prices changed/i)).toBeInTheDocument();
  });
});

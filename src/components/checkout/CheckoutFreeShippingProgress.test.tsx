import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import CheckoutFreeShippingProgress from './CheckoutFreeShippingProgress';

describe('CheckoutFreeShippingProgress', () => {
  it('shows the exact remaining amount and accessible measured progress', () => {
    render(
      <CheckoutFreeShippingProgress
        progress={{
          thresholdAmountMinor: 2500,
          subtotalAmountMinor: 1900,
          amountRemainingMinor: 600,
          eligible: false,
          currency: 'USD',
        }}
      />,
    );

    expect(
      screen.getByText('Add US$6 more for FREE Standard delivery'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('progressbar', {
        name: 'Progress toward free Standard delivery',
      }),
    ).toHaveAttribute('aria-valuenow', '76');
  });

  it('announces the unlocked state at the threshold', () => {
    render(
      <CheckoutFreeShippingProgress
        progress={{
          thresholdAmountMinor: 1200,
          subtotalAmountMinor: 1200,
          amountRemainingMinor: 0,
          eligible: true,
          currency: 'USD',
        }}
      />,
    );

    expect(
      screen.getByText('FREE Standard delivery unlocked'),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '100',
    );
  });
});

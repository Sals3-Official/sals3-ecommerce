import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CheckoutFreightQuoteResponse } from '@/services/storefront/schemas';
import CheckoutShippingOptions from './CheckoutShippingOptions';

function quoteFixture(): CheckoutFreightQuoteResponse {
  return {
    quotes: [
      {
        quoteId: 'quote-standard',
        packageId: 'package-1',
        shippingTier: 'Standard',
        cjLogisticName: 'CJPacket AU',
        optionId: 'option-standard',
        channelId: 'channel-standard',
        arrivalTime: '6-10',
        amountMinor: 810,
        regularAmountMinor: 810,
        currency: 'USD',
        originCountry: 'CN',
        destinationCountry: 'AU',
        ruleTips: [],
        expiresAt: new Date().toISOString(),
      },
    ],
    packages: [{ packageId: 'package-1', originCountry: 'CN', itemCount: 1 }],
    quotedAt: new Date().toISOString(),
    freeShipping: {
      thresholdAmountMinor: 2500,
      subtotalAmountMinor: 1900,
      amountRemainingMinor: 600,
      eligible: false,
      currency: 'USD',
    },
  };
}

describe('CheckoutShippingOptions', () => {
  it('renders the free-shipping progress module before the priced options, not after', () => {
    const { container } = render(
      <CheckoutShippingOptions
        quote={quoteFixture()}
        selected={[]}
        disabled={false}
        onQuote={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    // Rendered text order is what a buyer actually scans top to bottom —
    // this is the fix, not just that both elements exist.
    const renderedText = container.textContent ?? '';
    const progressIndex = renderedText.indexOf(
      'Add US$6 more for FREE Standard delivery',
    );
    const packageIndex = renderedText.indexOf('Package from CN');

    expect(progressIndex).toBeGreaterThan(-1);
    expect(packageIndex).toBeGreaterThan(progressIndex);
  });

  it('renders no progress module when the quote carries none', () => {
    const quote = quoteFixture();

    delete (quote as { freeShipping?: unknown }).freeShipping;
    render(
      <CheckoutShippingOptions
        quote={quote}
        selected={[]}
        disabled={false}
        onQuote={vi.fn()}
        onSelect={vi.fn()}
      />,
    );

    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});

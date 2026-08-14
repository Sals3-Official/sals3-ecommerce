import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usd } from '@/lib/money';
import type { ProductVariant } from '@/lib/product-detail';
import ProductVariantFallbackSelector from './ProductVariantFallbackSelector';

function variant(
  id: string,
  sku: string,
  priceMinor: number,
  availability: ProductVariant['availability'] = 'AVAILABLE',
): ProductVariant {
  return {
    id,
    sku,
    price: usd(priceMinor),
    availability,
  };
}

describe('ProductVariantFallbackSelector', () => {
  it('renders a Variant radio group using SKU and price labels', () => {
    render(
      <ProductVariantFallbackSelector
        variants={[
          variant('v1', 'S3V-111', 780),
          variant('v2', 'S3V-2268B366F762', 451),
        ]}
        selectedVariantId="v2"
        onChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole('radiogroup', { name: /^variant$/i }),
    ).toBeVisible();
    expect(
      screen.getByRole('radio', { name: /s3v-2268b366f762 · us\$4\.51/i }),
    ).toHaveAttribute('aria-checked', 'true');
  });

  it('reports changes only for available variants', () => {
    const onChange = vi.fn();

    render(
      <ProductVariantFallbackSelector
        variants={[
          variant('available', 'S3V-AVAILABLE', 451),
          variant('gone', 'S3V-GONE', 780, 'UNAVAILABLE'),
        ]}
        selectedVariantId="available"
        onChange={onChange}
      />,
    );

    fireEvent.click(screen.getByRole('radio', { name: /s3v-gone/i }));
    expect(onChange).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: /s3v-available/i }));
    expect(onChange).toHaveBeenCalledWith('available');
  });
});

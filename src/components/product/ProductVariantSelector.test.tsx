import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { usd } from '@/lib/money';
import type { ProductOptionAxis, ProductVariant } from '@/lib/product-detail';
import ProductVariantSelector from './ProductVariantSelector';

function variant(
  id: string,
  options: { name: string; value: string }[],
): ProductVariant {
  return {
    id,
    sku: `SKU-${id}`,
    price: usd(1999),
    availability: 'AVAILABLE',
    options,
  };
}

const VARIANTS: ProductVariant[] = [
  variant('black-m', [
    { name: 'Colour', value: 'Black' },
    { name: 'Size', value: 'M' },
  ]),
  variant('black-l', [
    { name: 'Colour', value: 'Black' },
    { name: 'Size', value: 'L' },
  ]),
  variant('white-l', [
    { name: 'Colour', value: 'White' },
    { name: 'Size', value: 'L' },
  ]),
];

const AXES: ProductOptionAxis[] = [
  { name: 'Colour', values: ['Black', 'White'] },
  { name: 'Size', values: ['M', 'L'] },
];

function renderSelector(
  selection: Record<string, string | undefined> = {},
  onChange = vi.fn(),
) {
  render(
    <ProductVariantSelector
      axes={AXES}
      variants={VARIANTS}
      selection={selection}
      onChange={onChange}
    />,
  );

  return onChange;
}

describe('ProductVariantSelector', () => {
  it('exposes one labelled radiogroup per axis', () => {
    renderSelector();

    expect(screen.getByRole('radiogroup', { name: /colour/i })).toBeVisible();
    expect(screen.getByRole('radiogroup', { name: /size/i })).toBeVisible();
  });

  it('marks the chosen value checked', () => {
    renderSelector({ Colour: 'Black' });

    expect(screen.getByRole('radio', { name: /black/i })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: /white/i })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  /**
   * Removing an unreachable value hides that the combination exists at all — a
   * buyer would never learn the size they want is unavailable, they would simply
   * not find it.
   */
  it('keeps an unavailable value in the DOM, focusable and aria-disabled', () => {
    renderSelector({ Size: 'M' });

    const white = screen.getByRole('radio', { name: /white/i });

    expect(white).toBeInTheDocument();
    expect(white).toHaveAttribute('aria-disabled', 'true');
    expect(white).not.toHaveAttribute('tabindex', '-2');
  });

  it('does not report a change for an unavailable value', () => {
    const onChange = renderSelector({ Size: 'M' });

    fireEvent.click(screen.getByRole('radio', { name: /white/i }));

    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports a change for an available value', () => {
    const onChange = renderSelector({ Size: 'L' });

    fireEvent.click(screen.getByRole('radio', { name: /white/i }));

    expect(onChange).toHaveBeenCalledWith('Colour', 'White');
  });

  it('moves within a group on arrow keys and wraps around', () => {
    const onChange = renderSelector({ Colour: 'Black' });
    const black = screen.getByRole('radio', { name: /black/i });

    fireEvent.keyDown(black, { key: 'ArrowRight' });
    expect(onChange).toHaveBeenCalledWith('Colour', 'White');

    fireEvent.keyDown(black, { key: 'ArrowLeft' });
    expect(onChange).toHaveBeenCalledWith('Colour', 'White');
  });

  /** Selection is never carried by colour alone. */
  it('marks the chosen value with a check as well as a border', () => {
    renderSelector({ Colour: 'Black' });

    expect(screen.getByRole('radio', { name: /black/i }).textContent).toContain(
      '✓',
    );
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { ProductDetail, ProductVariant } from '@/lib/product-detail';
import renderWithCart from '../../../test/render-with-cart';
import ProductRecordPanel from './ProductRecordPanel';
import ProductSpecifications from './ProductSpecifications';
import Sals3SkuLine from './Sals3SkuLine';
import { SelectedSkuProvider } from './selected-sku';

vi.mock('next/navigation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('next/navigation')>();

  return { ...actual, useRouter: () => ({ push: vi.fn() }) };
});

describe('Sals3SkuLine', () => {
  it('prints the server-resolved code with nothing wrapping it', () => {
    render(<Sals3SkuLine fallbackSku="S3V-463ADA8A9E11" />);

    expect(screen.getByText('Sals3 SKU')).toBeInTheDocument();
    expect(screen.getByText('S3V-463ADA8A9E11')).toBeInTheDocument();
  });

  /** No code, no row. A "—" would claim we recorded an unknown one. */
  it('renders nothing at all when there is no code', () => {
    const { container } = render(<Sals3SkuLine />);

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * The provider's value wins over the server fallback: once the panel has
   * published the buyer's choice, the printed code is that choice's.
   */
  it('prefers the published selection over the fallback', () => {
    render(
      <SelectedSkuProvider initialSku="S3V-BBBBBBBBBBBB">
        <Sals3SkuLine fallbackSku="S3V-AAAAAAAAAAAA" />
      </SelectedSkuProvider>,
    );

    expect(screen.getByText('S3V-BBBBBBBBBBBB')).toBeInTheDocument();
    expect(screen.queryByText('S3V-AAAAAAAAAAAA')).not.toBeInTheDocument();
  });
});

describe('ProductSpecifications with a Sals3 SKU', () => {
  const SPECIFICATION = [{ label: 'Material', value: 'Denim' }];

  it('shows the code above the seller-entered grid', () => {
    render(
      <ProductSpecifications
        specification={SPECIFICATION}
        sals3Sku="S3V-463ADA8A9E11"
      />,
    );

    expect(screen.getByText('S3V-463ADA8A9E11')).toBeInTheDocument();
    expect(screen.getByText('Denim')).toBeInTheDocument();
  });

  /**
   * The provenance boundary this section exists to hold. The grid's footnote
   * says the seller entered these against their category's attribute set; a
   * Sals3 SKU is entered by nobody, so it must not become a row under it.
   */
  it('keeps the code out of the seller-declared attribute list', () => {
    render(
      <ProductSpecifications
        specification={SPECIFICATION}
        sals3Sku="S3V-463ADA8A9E11"
      />,
    );

    const terms = screen.getAllByRole('term').map((node) => node.textContent);

    expect(terms).toContain('Material');
    expect(terms).not.toContain('Sals3 SKU');
  });

  /** The code alone still earns the band — it is what somebody copies out. */
  it('renders the band for a product with a code and no attributes', () => {
    render(<ProductSpecifications sals3Sku="S3V-463ADA8A9E11" />);

    expect(
      screen.getByRole('heading', { name: 'Product specifications' }),
    ).toBeInTheDocument();
    expect(screen.getByText('S3V-463ADA8A9E11')).toBeInTheDocument();
  });

  /** And nothing at all still renders nothing at all. */
  it('renders nothing with neither a code nor an attribute', () => {
    const { container } = render(<ProductSpecifications />);

    expect(container).toBeEmptyDOMElement();
  });
});

/**
 * The point of the whole publish mechanism, asserted end to end.
 *
 * There is no product-level Sals3 SKU — every variant carries its own — so a
 * code that did not follow the chips would be right for one combination and
 * quietly wrong for the rest. That matters more than it would for a decorative
 * field: the only reason to print a code is that somebody intends to quote it.
 */
describe('the printed code and the chosen option', () => {
  function variant(id: string, sku: string, colour: string): ProductVariant {
    return {
      id,
      sku,
      price: { amountMinor: 2778, currency: 'USD' },
      availability: 'AVAILABLE',
      options: [{ name: 'Colour', value: colour }],
    };
  }

  const BLACK = variant('black', 'S3V-AAAAAAAAAAAA', 'Black');
  const BLUE = variant('blue', 'S3V-BBBBBBBBBBBB', 'Blue');

  const detail: ProductDetail = {
    id: 'jeans',
    title: "Men's stitched straight-leg jeans",
    category: 'apparel-accessories',
    price: { amountMinor: 2778, currency: 'USD' },
    imageAlt: 'Jeans',
    tone: 'ocean',
    images: [],
    variants: [BLACK, BLUE],
    options: [{ name: 'Colour', values: ['Black', 'Blue'] }],
  };

  it('reprints the code when the buyer picks another option', () => {
    renderWithCart(
      <SelectedSkuProvider initialSku={BLACK.sku}>
        <ProductRecordPanel
          detail={detail}
          selectedVariant={BLACK}
          selectedFromUrl
        />
        <ProductSpecifications sals3Sku={BLACK.sku} />
      </SelectedSkuProvider>,
    );

    expect(screen.getByText(BLACK.sku)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('link', { name: 'Blue' }));

    expect(screen.getByText(BLUE.sku)).toBeInTheDocument();
    expect(screen.queryByText(BLACK.sku)).not.toBeInTheDocument();
  });
});

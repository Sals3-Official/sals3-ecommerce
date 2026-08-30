import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductSupplierDetails from './ProductSupplierDetails';

describe('ProductSupplierDetails', () => {
  it('renders nothing when the portal sent no specs', () => {
    const { container } = render(<ProductSupplierDetails />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every spec field is absent', () => {
    const { container } = render(<ProductSupplierDetails specs={{}} />);

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * The SKU is an `S3V-<hex>` digest. It identified nothing for a buyer, and
   * a payload carrying nothing else must produce no section rather than a
   * section whose only row is a hash.
   */
  it('never renders the Sals3 SKU, and renders no section when it is the only fact', () => {
    const { container } = render(
      <ProductSupplierDetails specs={{ sku: 'S3V-2268B366F762' }} />,
    );

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(/S3V-/)).not.toBeInTheDocument();
    expect(screen.queryByText('SKU')).not.toBeInTheDocument();
  });

  /**
   * A brand is the seller's own claim, so it belongs to Product specifications
   * even though it arrives on this technical payload. Rendering it here would
   * put a seller declaration under "as reported by the supplier".
   */
  it('does not render the brand', () => {
    render(
      <ProductSupplierDetails
        specs={{ brand: 'Sals3 Basics', weightGrams: 880 }}
      />,
    );

    expect(screen.queryByText('Sals3 Basics')).not.toBeInTheDocument();
    expect(screen.queryByText('Brand')).not.toBeInTheDocument();
  });

  /** An absent row says nobody recorded the fact. "—" claims we recorded an unknown. */
  it('omits a row entirely rather than showing a placeholder value', () => {
    render(<ProductSupplierDetails specs={{ weightGrams: 880 }} />);

    expect(screen.queryByText('GTIN')).not.toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByText(/n\/a/i)).not.toBeInTheDocument();
  });

  it('formats weight and dimensions in readable units', () => {
    render(
      <ProductSupplierDetails
        specs={{
          weightGrams: 4200,
          lengthMillimeters: 300,
          widthMillimeters: 250,
          heightMillimeters: 80,
        }}
      />,
    );

    expect(screen.getByText('4,200 g')).toBeInTheDocument();
    expect(screen.getByText('30 cm × 25 cm × 8 cm')).toBeInTheDocument();
  });

  /**
   * These are the parcel's figures, not the product's — CJ reports them as
   * packed weight and box size, and checkout quotes freight from the same
   * `weightGrams`. Labelled "Weight" and "Dimensions", they read as the item
   * itself, which is a different and wrong claim: a buyer weighing up a 640 g
   * pair of jeans is reading the box.
   */
  it('names the weight and dimensions as the parcel, not the product', () => {
    render(
      <ProductSupplierDetails
        specs={{
          weightGrams: 4200,
          lengthMillimeters: 300,
          widthMillimeters: 250,
          heightMillimeters: 80,
        }}
      />,
    );

    expect(screen.getByText('Package weight')).toBeInTheDocument();
    expect(screen.getByText('Package dimensions')).toBeInTheDocument();
    expect(
      screen.getByText(/the packed parcel, not the product itself/i),
    ).toBeInTheDocument();
  });

  it('labels a condition and a manufacturer part number', () => {
    render(
      <ProductSupplierDetails
        specs={{ condition: 'NEW', mpn: 'CJYD2718032' }}
      />,
    );

    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Manufacturer part number')).toBeInTheDocument();
    expect(screen.getByText('CJYD2718032')).toBeInTheDocument();
  });

  /** The storefront is repeating a claim it did not measure. */
  it('states that the values are supplier-reported', () => {
    render(<ProductSupplierDetails specs={{ weightGrams: 880 }} />);

    expect(
      screen.getByText(/as reported by the supplier/i),
    ).toBeInTheDocument();
  });
});

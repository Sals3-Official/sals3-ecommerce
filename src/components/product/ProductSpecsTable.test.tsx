import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductSpecsTable from './ProductSpecsTable';

describe('ProductSpecsTable', () => {
  it('renders nothing when the portal sent no specs', () => {
    const { container } = render(<ProductSpecsTable />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when every spec field is absent', () => {
    const { container } = render(<ProductSpecsTable specs={{}} />);

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * An absent row says nobody recorded the fact. A "—" or "N/A" row says we
   * recorded that it is unknown, which is a different and untrue claim.
   */
  it('omits a row entirely rather than showing a placeholder value', () => {
    render(<ProductSpecsTable specs={{ sku: 'SALS3-1' }} />);

    expect(screen.getByText('SALS3-1')).toBeInTheDocument();
    expect(screen.queryByText('Brand')).not.toBeInTheDocument();
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByText(/n\/a/i)).not.toBeInTheDocument();
  });

  it('formats weight and dimensions in readable units', () => {
    render(
      <ProductSpecsTable
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

  it('labels a declared brand and condition', () => {
    render(
      <ProductSpecsTable specs={{ brand: 'Sals3 Basics', condition: 'NEW' }} />,
    );

    expect(screen.getByText('Sals3 Basics')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  /** The storefront is repeating a claim it did not measure. */
  it('states that the values are supplier-reported', () => {
    render(<ProductSpecsTable specs={{ weightGrams: 880 }} />);

    expect(
      screen.getByText(/as reported by the supplier/i),
    ).toBeInTheDocument();
  });
});

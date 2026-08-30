import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductSpecifications from './ProductSpecifications';

describe('ProductSpecifications', () => {
  it('renders nothing when the seller has declared nothing', () => {
    const { container } = render(<ProductSpecifications />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing for an empty declaration list', () => {
    const { container } = render(<ProductSpecifications specification={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('renders the seller declarations in the order the portal sent them', () => {
    render(
      <ProductSpecifications
        specification={[
          { label: 'Material', value: 'Cotton corduroy' },
          { label: 'Season', value: 'Autumn, Winter' },
        ]}
      />,
    );

    const terms = screen.getAllByRole('term').map((node) => node.textContent);

    expect(terms).toEqual(['Material', 'Season']);
    expect(screen.getByText('Autumn, Winter')).toBeInTheDocument();
  });

  /**
   * The whole reason this section is separate from Supplier details. Carrying
   * the supplier's provenance line over the seller's own declarations would
   * misattribute them to CJ.
   *
   * This used to assert the presence of "Entered by the seller against this
   * category's attribute set." too. The owner removed that line on 2026-08-31,
   * and the removal is not what this test is for: the half that matters is the
   * absence below, and it matters **more** now that the two sections share a
   * format and a white region with nothing but one sentence between them.
   */
  it('never claims the values were reported by the supplier', () => {
    render(
      <ProductSpecifications
        specification={[{ label: 'Material', value: 'Cotton corduroy' }]}
      />,
    );

    expect(screen.getByText('Cotton corduroy')).toBeInTheDocument();
    expect(
      screen.queryByText(/as reported by the supplier/i),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/entered by the seller against this category/i),
    ).not.toBeInTheDocument();
  });

  it('promotes a declared brand out of the supplier payload', () => {
    render(<ProductSpecifications specs={{ brand: 'Sals3 Basics' }} />);

    expect(screen.getByText('Brand')).toBeInTheDocument();
    expect(screen.getByText('Sals3 Basics')).toBeInTheDocument();
  });

  /**
   * `Brand` and `Brand / Publisher` are the workbook's names for the same fact.
   * When the seller answered it against their own category, that answer wins
   * and the technical payload's copy must not produce a second row.
   */
  it('does not render two brand rows when both sources carry one', () => {
    render(
      <ProductSpecifications
        specification={[{ label: 'Brand / Publisher', value: 'Generic' }]}
        specs={{ brand: 'Sals3 Basics' }}
      />,
    );

    expect(screen.getByText('Generic')).toBeInTheDocument();
    expect(screen.queryByText('Sals3 Basics')).not.toBeInTheDocument();
    expect(screen.getAllByRole('term')).toHaveLength(1);
  });

  /** The raw workbook token is never buyer-facing. */
  it('renders the mapped brand label the portal sent, never a raw token', () => {
    render(
      <ProductSpecifications
        specification={[{ label: 'Brand', value: 'Generic' }]}
      />,
    );

    expect(screen.getByText('Generic')).toBeInTheDocument();
    expect(screen.queryByText('UNBRANDED')).not.toBeInTheDocument();
  });
});

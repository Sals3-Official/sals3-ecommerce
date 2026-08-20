import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ProductEvidenceLedger from './ProductEvidenceLedger';

describe('ProductEvidenceLedger', () => {
  it('counts the facts it actually rendered', () => {
    render(<ProductEvidenceLedger />);

    expect(screen.getAllByRole('term')).toHaveLength(4);
    expect(screen.getByText('4 facts')).toBeInTheDocument();
  });

  it('keys the marks in words, so the distinction is never colour alone', () => {
    render(<ProductEvidenceLedger />);

    expect(
      screen.getByText(/a filled mark is a claim with evidence behind it/i),
    ).toBeInTheDocument();
  });

  /**
   * The correction that matters most on this component. Live CJ freight quotes
   * shipped 2026-08-17: a delivery charge **is** added at checkout, so the old
   * "Nothing is added to this price at checkout." was a false money claim — on
   * the one element of the page whose whole purpose is to be trustworthy.
   */
  it('never claims that nothing is added to the price at checkout', () => {
    render(<ProductEvidenceLedger />);

    expect(
      screen.queryByText(/nothing is added to this price/i),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText(/quoted for your address and added to this price/i),
    ).toBeInTheDocument();
  });

  it('states an unconfirmed stock claim as unknown rather than as unavailable', () => {
    render(<ProductEvidenceLedger />);

    expect(screen.getByText(/not confirmed recently/i)).toBeInTheDocument();
  });

  it('reports supplier availability when the payload carries it', () => {
    render(<ProductEvidenceLedger availability="AVAILABLE" />);

    expect(
      screen.getByText(/reported available by the supplier/i),
    ).toBeInTheDocument();
  });

  it('dates the price claim from the real publish time', () => {
    render(<ProductEvidenceLedger publishedAt="2026-08-13T01:02:03.000Z" />);

    expect(
      screen.getByText(/fixed when published, 13 August 2026/i),
    ).toBeInTheDocument();
  });

  /** An unparseable value must not render "Invalid Date" as evidence. */
  it('falls back to dateless copy for an unparseable publish time', () => {
    render(<ProductEvidenceLedger publishedAt="not-a-date" />);

    expect(
      screen.getByText(/fixed when this product was published/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/invalid date/i)).not.toBeInTheDocument();
  });

  it('claims no reviews, because Sals3 has none', () => {
    render(<ProductEvidenceLedger />);

    expect(screen.getByText(/sals3 has no reviews yet/i)).toBeInTheDocument();
  });
});

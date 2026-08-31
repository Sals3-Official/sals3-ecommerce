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

  /**
   * Added 2026-09-01. No dollar figure and no country: the PDP has no
   * address to check a threshold against, so the row states the mechanism
   * exists without promising a number for this specific buyer.
   */
  it('mentions free Standard delivery without naming a country or an amount', () => {
    render(<ProductEvidenceLedger />);

    expect(
      screen.getByText(
        /some orders qualify for free standard delivery once your address is known/i,
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/\$\d/)).not.toBeInTheDocument();
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

  it('says nobody has reviewed a product with no rating', () => {
    render(<ProductEvidenceLedger />);

    expect(
      screen.getByText(/be the first to review this/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  /**
   * The bug this component shipped with: the ledger hardcoded "no reviews yet"
   * and was never handed a rating, so a reviewed product contradicted its own
   * reviews section a screen below.
   */
  it('never claims there are no reviews when the product has one', () => {
    render(<ProductEvidenceLedger rating={{ average: 4, count: 1 }} />);

    expect(screen.queryByText(/no reviews/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/nobody has reviewed/i)).not.toBeInTheDocument();
    expect(
      screen.getByText('4.0 out of 5, from 1 verified purchase.'),
    ).toBeInTheDocument();
  });

  it('pluralises the purchase count and links to the reviews themselves', () => {
    render(
      <ProductEvidenceLedger
        rating={{ average: 4.66, count: 12 }}
        reviewsAnchored
      />,
    );

    expect(
      screen.getByRole('link', {
        name: '4.7 out of 5, from 12 verified purchases.',
      }),
    ).toHaveAttribute('href', '#reviews-heading');
  });

  /**
   * The reviews section bows out when its list could not be fetched, so linking
   * on the rating alone would produce a dead anchor precisely when the review
   * read is failing. The rating still gets stated — it is the link that goes.
   */
  it('states the rating without a link when no reviews section rendered', () => {
    render(<ProductEvidenceLedger rating={{ average: 4.66, count: 12 }} />);

    expect(
      screen.getByText('4.7 out of 5, from 12 verified purchases.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  /** A payload can carry an average with no reviews behind it. */
  it('treats a zero count as no reviews at all', () => {
    render(<ProductEvidenceLedger rating={{ average: 0, count: 0 }} />);

    expect(
      screen.getByText(/be the first to review this/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/out of 5/i)).not.toBeInTheDocument();
  });
});

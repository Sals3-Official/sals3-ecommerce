import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ProductReview } from '@/services/storefront/reviews';
import ProductReviews from './ProductReviews';

const REVIEW: ProductReview = {
  id: 'review-1',
  rating: 5,
  body: 'Fits exactly like the size chart said.',
  displayName: 'Hezekiah A.',
  variantLabel: 'Digital Black / 31"-35"',
  createdAt: '2026-08-19T10:00:00.000Z',
  reply: null,
};

describe('ProductReviews', () => {
  /**
   * The repo's standing rule — no section for data the portal did not send —
   * which `page.test.tsx` asserts for the page as a whole. A heading about an
   * absence would be noise on nearly every product today.
   */
  it('renders nothing at all when there are no reviews', () => {
    const { container } = render(<ProductReviews reviews={[]} />);

    expect(container).toBeEmptyDOMElement();
  });

  /** A rating with a zero count must not render as a nought-star product. */
  it('renders nothing for a zero-count rating', () => {
    const { container } = render(
      <ProductReviews rating={{ average: 0, count: 0 }} reviews={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  /**
   * A rating whose list could not be fetched hides the section rather than
   * showing a summary above an empty list. The card's stars still carry the
   * number.
   */
  it('renders nothing when a rating exists but the list is empty', () => {
    const { container } = render(
      <ProductReviews rating={{ average: 4.6, count: 22 }} reviews={[]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('shows the average, the count and the review', () => {
    render(
      <ProductReviews
        rating={{ average: 4.6, count: 22 }}
        breakdown={[0, 1, 2, 3, 16]}
        reviews={[REVIEW]}
      />,
    );

    expect(screen.getByText('4.6')).toBeInTheDocument();
    expect(screen.getByText('22 reviews')).toBeInTheDocument();
    expect(screen.getByText(REVIEW.body ?? '')).toBeInTheDocument();
  });

  /**
   * The guarantee that makes the number worth trusting, and the disclaimer that
   * keeps it honest. Both are stated once, in the summary, rather than as a
   * badge repeated on every row.
   */
  it('states that every review came from a delivered order, and that none came from the supplier', () => {
    render(
      <ProductReviews rating={{ average: 5, count: 1 }} reviews={[REVIEW]} />,
    );

    const provenance = screen.getByText(/delivered this item to them/i);

    expect(provenance).toBeInTheDocument();
    expect(provenance.textContent).toMatch(
      /do not carry ratings from our supplier/i,
    );
  });

  it('does not repeat a verified-purchase badge on each review', () => {
    render(
      <ProductReviews rating={{ average: 5, count: 1 }} reviews={[REVIEW]} />,
    );

    expect(screen.queryByText(/verified purchase/i)).not.toBeInTheDocument();
  });

  /** The buyer chose not to be named, and the wording for that is ours. */
  it('renders an anonymous review without inventing a name', () => {
    render(
      <ProductReviews
        rating={{ average: 5, count: 1 }}
        reviews={[{ ...REVIEW, displayName: null }]}
      />,
    );

    expect(screen.getByText('A Sals3 customer')).toBeInTheDocument();
  });

  /** A rating with no words is a complete review, not a broken one. */
  it('renders a rating-only review with no empty paragraph', () => {
    render(
      <ProductReviews
        rating={{ average: 4, count: 1 }}
        reviews={[{ ...REVIEW, body: null }]}
      />,
    );

    expect(screen.getByText('Hezekiah A.')).toBeInTheDocument();
  });

  /**
   * From the order line's frozen snapshot — a renamed variant must not rewrite
   * what a past buyer says they bought (ADR-007).
   */
  it('names the variant the reviewer actually received', () => {
    render(
      <ProductReviews rating={{ average: 5, count: 1 }} reviews={[REVIEW]} />,
    );

    expect(screen.getByText('Digital Black / 31"-35"')).toBeInTheDocument();
  });

  it('renders a seller reply attributed to the seller', () => {
    render(
      <ProductReviews
        rating={{ average: 5, count: 1 }}
        reviews={[
          {
            ...REVIEW,
            reply: {
              body: 'Thanks for measuring against the chart first.',
              createdAt: '2026-08-20T10:00:00.000Z',
            },
          },
        ]}
      />,
    );

    expect(screen.getByText('SELLER')).toBeInTheDocument();
    expect(
      screen.getByText(/thanks for measuring against the chart first/i),
    ).toBeInTheDocument();
  });

  /** Colour is never the only signal: the value is in the accessible name. */
  it('gives the star row an accessible value', () => {
    render(
      <ProductReviews
        rating={{ average: 4.6, count: 22 }}
        reviews={[REVIEW]}
      />,
    );

    expect(screen.getByText('4.6 out of 5')).toBeInTheDocument();
  });
});

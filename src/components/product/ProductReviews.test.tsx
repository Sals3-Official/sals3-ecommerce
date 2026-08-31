import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { ProductReview } from '@/services/storefront/reviews';
import ProductReviews from './ProductReviews';

const REVIEW: ProductReview = {
  id: 'review-1',
  rating: 5,
  body: 'Fits exactly like the size chart said.',
  displayName: 'Hezekiah A.',
  variantLabel: 'Digital Black / 31"-35"',
  deliveryRating: undefined,
  photos: [],
  createdAt: '2026-08-19T10:00:00.000Z',
  reply: null,
};

describe('ProductReviews', () => {
  /**
   * The section used to disappear entirely on an unreviewed product. A buyer who
   * scrolls to where reviews live and finds nothing cannot tell "no reviews yet"
   * apart from a broken page, so zero is now stated rather than implied.
   */
  it('still renders the section when there are no reviews', () => {
    render(<ProductReviews reviews={[]} />);

    expect(
      screen.getByRole('heading', { name: 'Ratings and reviews' }),
    ).toBeInTheDocument();
    expect(screen.getByText('No reviews yet')).toBeInTheDocument();
    expect(
      screen.getByText(/nobody has reviewed this product yet/i),
    ).toBeInTheDocument();
  });

  /**
   * The one number the empty state must not print. "0.0" beside five hollow
   * stars reads as "rated zero out of five", not as "not yet rated".
   */
  it('never shows a nought-out-of-five average on an unreviewed product', () => {
    render(<ProductReviews rating={{ average: 0, count: 0 }} reviews={[]} />);

    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
    expect(screen.getByText('\u2014')).toBeInTheDocument();
    expect(screen.getByText('Not yet rated')).toBeInTheDocument();
  });

  /** The bars are the zeros the owner asked to see, not an absent block. */
  it('draws all five bars at zero when nothing has been reviewed', () => {
    render(<ProductReviews reviews={[]} />);

    expect(screen.getAllByText('0')).toHaveLength(5);
  });

  /** The card's reframe, in the card's voice: an opening, not a demand. */
  it('invites the first review without offering a control it cannot honour', () => {
    render(<ProductReviews reviews={[]} />);

    expect(
      screen.getByText(/be the first to review this/i),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  /** The provenance line is what the section is for, so it ships unreviewed too. */
  it('states where reviews come from even before there are any', () => {
    render(<ProductReviews reviews={[]} />);

    expect(
      screen.getByText(/we do not carry ratings from our supplier/i),
    ).toBeInTheDocument();
  });

  /**
   * The one case that still renders nothing: the rating says reviews exist and
   * the list came back empty, so the read failed. A summary would head an empty
   * list, and the first-review invitation would be a lie about a reviewed
   * product. The card's stars still carry the number.
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

  /**
   * The Shopee chip row, over the reviews already on the page. A band with
   * nothing in it is not offered at all — see `lib/reviews/filters.ts`.
   */
  it('narrows the list to the band the buyer pressed', () => {
    render(
      <ProductReviews
        rating={{ average: 4, count: 2 }}
        breakdown={[0, 0, 0, 1, 1]}
        reviews={[
          REVIEW,
          { ...REVIEW, id: 'review-2', rating: 4, body: 'Warm enough.' },
        ]}
      />,
    );

    expect(
      screen.getByText('Fits exactly like the size chart said.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Warm enough.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /4 star/i }));

    expect(screen.getByText('Warm enough.')).toBeInTheDocument();
    expect(
      screen.queryByText('Fits exactly like the size chart said.'),
    ).not.toBeInTheDocument();
  });

  it('marks the pressed chip for a screen reader, not by colour alone', () => {
    render(
      <ProductReviews
        rating={{ average: 4.5, count: 2 }}
        reviews={[REVIEW, { ...REVIEW, id: 'review-2', rating: 4 }]}
      />,
    );

    expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    fireEvent.click(screen.getByRole('button', { name: /4 star/i }));

    expect(screen.getByRole('button', { name: /4 star/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /^All/ })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  /**
   * The invariant that makes an empty state unnecessary: every chip drawn
   * matches at least one review, so no press can produce a blank list. Asserted
   * through the rendered component rather than only in the filter unit test,
   * because it is the component that would have to grow an empty state if the
   * invariant were ever broken.
   */
  it('never draws a chip that empties the list', () => {
    render(
      <ProductReviews
        rating={{ average: 3.7, count: 3 }}
        reviews={[
          REVIEW,
          { ...REVIEW, id: 'review-2', rating: 4, body: 'Warm enough.' },
          { ...REVIEW, id: 'review-3', rating: 2, body: null },
        ]}
      />,
    );

    const chips = screen.getAllByRole('button');

    expect(chips.length).toBeGreaterThan(1);

    chips.forEach((chip) => {
      fireEvent.click(chip);

      expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
    });
  });

  it('filters to the reviews that carry words', () => {
    render(
      <ProductReviews
        rating={{ average: 4.5, count: 2 }}
        reviews={[REVIEW, { ...REVIEW, id: 'review-2', rating: 4, body: null }]}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /with comments/i }));

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByText(REVIEW.body ?? '')).toBeInTheDocument();
  });

  /** One review has nothing to filter by, so no chip row is drawn at all. */
  it('draws no chip row for a single review', () => {
    render(
      <ProductReviews rating={{ average: 5, count: 1 }} reviews={[REVIEW]} />,
    );

    expect(screen.queryByRole('group', { name: /filter reviews/i })).toBeNull();
  });

  /**
   * Shopee's most prominent chip, and the one thing this section must not copy:
   * no review on the wire carries an image or a video.
   */
  it('offers no media filter', () => {
    render(
      <ProductReviews
        rating={{ average: 4.5, count: 2 }}
        reviews={[REVIEW, { ...REVIEW, id: 'review-2', rating: 4 }]}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /media|photo|video/i }),
    ).toBeNull();
  });
});

/**
 * Reported from live on 2026-08-31: the summary said "No reviews yet", "—" out
 * of 5 and five empty bars, directly above a review somebody had written.
 *
 * A timing gap rather than bad data. The product payload carries the aggregate
 * and is cached for 60s on the product page, while the review list is read
 * `no-store`, so a review posted inside that window reaches the list before the
 * summary that counts it. The two numbers are from different moments.
 *
 * The section must never contradict itself while that is true.
 */
describe('when the reviews arrive before the aggregate that counts them', () => {
  const review: ProductReview = {
    id: 'r1',
    rating: 5,
    deliveryRating: undefined,
    body: 'hey, this box is good!',
    displayName: 'Mayleen S.',
    photos: [],
    createdAt: '2026-08-31T05:00:00.000Z',
    variantLabel: 'Storage box',
    reply: null,
  };

  it('says nothing about there being no reviews', () => {
    render(<ProductReviews reviews={[review]} />);

    expect(screen.getByText(/hey, this box is good!/i)).toBeInTheDocument();
    expect(screen.queryByText(/no reviews yet/i)).not.toBeInTheDocument();
    expect(
      screen.queryByText(/nobody has reviewed this product yet/i),
    ).not.toBeInTheDocument();
  });

  /**
   * Withheld rather than printed as zero. An em dash over five empty bars is
   * still a verdict when a five-star review is sitting underneath it.
   */
  it('withholds the score block rather than showing it at zero', () => {
    render(<ProductReviews reviews={[review]} />);

    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/not yet rated/i)).not.toBeInTheDocument();
  });

  /** The one sentence that says where these reviews come from still renders. */
  it('keeps the provenance line', () => {
    render(<ProductReviews reviews={[review]} />);

    expect(
      screen.getByText(/every review here was written by a customer/i),
    ).toBeInTheDocument();
  });

  /** And the moment the aggregate lands, the score block is back. */
  it('shows the score once the aggregate catches up', () => {
    render(
      <ProductReviews
        rating={{ average: 5, count: 1 }}
        breakdown={[0, 0, 0, 0, 1]}
        reviews={[review]}
      />,
    );

    expect(screen.getByText('5.0')).toBeInTheDocument();
    expect(screen.getByText('1 review')).toBeInTheDocument();
  });
});

describe('the delivery score', () => {
  /**
   * The whole reason it is a second number. A buyer who waited three weeks for
   * a good product scored the product high and the delivery low, and folding
   * the two would tell the seller their listing is the problem.
   */
  it('shows a delivery average apart from the product average', () => {
    render(
      <ProductReviews
        rating={{
          average: 4.8,
          count: 20,
          delivery: { average: 3.2, count: 6 },
        }}
        breakdown={[0, 0, 1, 2, 17]}
        reviews={[REVIEW]}
      />,
    );

    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('3.2')).toBeInTheDocument();
    expect(screen.getByText(/Delivery/)).toBeInTheDocument();
  });

  /**
   * Six of twenty answering is not the same claim as twenty answering, and a
   * reader has to be able to tell — this is the number a seller acts on.
   */
  it('states its own denominator, not the review count', () => {
    render(
      <ProductReviews
        rating={{
          average: 4.8,
          count: 20,
          delivery: { average: 3.2, count: 6 },
        }}
        breakdown={[0, 0, 1, 2, 17]}
        reviews={[REVIEW]}
      />,
    );

    expect(screen.getByText(/6 of 20 who answered/i)).toBeInTheDocument();
  });

  it('says "all" when every reviewer answered', () => {
    render(
      <ProductReviews
        rating={{ average: 5, count: 3, delivery: { average: 5, count: 3 } }}
        breakdown={[0, 0, 0, 0, 3]}
        reviews={[REVIEW]}
      />,
    );

    expect(screen.getByText(/all 3 who answered/i)).toBeInTheDocument();
  });

  /**
   * The failure the nullable column exists to prevent. "Delivery 0.0" on a
   * product nobody scored reads as a courier catastrophe, and no such verdict
   * was given.
   */
  it('shows nothing at all when nobody scored the delivery', () => {
    render(
      <ProductReviews
        rating={{ average: 4.8, count: 20 }}
        breakdown={[0, 0, 1, 2, 17]}
        reviews={[REVIEW]}
      />,
    );

    expect(screen.queryByText(/Delivery/)).not.toBeInTheDocument();
    expect(screen.queryByText('0.0')).not.toBeInTheDocument();
  });
});

describe('a review row', () => {
  it('shows this buyer’s delivery score beside the product one', () => {
    render(
      <ProductReviews
        rating={{ average: 5, count: 1, delivery: { average: 2, count: 1 } }}
        breakdown={[0, 0, 0, 0, 1]}
        reviews={[{ ...REVIEW, deliveryRating: 2 }]}
      />,
    );

    expect(screen.getByText('2/5')).toBeInTheDocument();
  });

  /** Absence, never a nought and never a dash. */
  it('says nothing about delivery when this buyer skipped it', () => {
    render(
      <ProductReviews
        rating={{ average: 5, count: 1 }}
        breakdown={[0, 0, 0, 0, 1]}
        reviews={[REVIEW]}
      />,
    );

    expect(screen.queryByText(/Delivery:/)).not.toBeInTheDocument();
  });

  it('renders the photos the buyer attached, in their order', () => {
    render(
      <ProductReviews
        rating={{ average: 5, count: 1 }}
        breakdown={[0, 0, 0, 0, 1]}
        reviews={[
          {
            ...REVIEW,
            photos: [
              { url: 'https://media.example/a.webp', width: 800, height: 600 },
              { url: 'https://media.example/b.webp', width: 640, height: 640 },
            ],
          },
        ]}
      />,
    );

    const links = screen
      .getAllByRole('link')
      .filter((link) => link.getAttribute('href')?.startsWith('https://media'));

    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute('href', 'https://media.example/a.webp');
  });

  /** Quiet, but present on every row — there is a real queue behind it. */
  it('offers a way to report the review', () => {
    render(
      <ProductReviews
        rating={{ average: 5, count: 1 }}
        breakdown={[0, 0, 0, 0, 1]}
        reviews={[REVIEW]}
      />,
    );

    expect(
      screen.getByRole('button', { name: /report this review/i }),
    ).toBeInTheDocument();
  });

  /**
   * The reasons are a closed list and they stay out of the way until the buyer
   * has decided to report something.
   */
  it('asks for a reason before it will send anything', () => {
    render(
      <ProductReviews
        rating={{ average: 5, count: 1 }}
        breakdown={[0, 0, 0, 0, 1]}
        reviews={[REVIEW]}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /not about this product/i }),
    ).not.toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: /report this review/i }),
    );

    expect(
      screen.getByRole('button', { name: /not about this product/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/nothing is removed automatically/i),
    ).toBeInTheDocument();
  });
});

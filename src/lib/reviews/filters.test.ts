import { describe, expect, it } from 'vitest';
import type { ProductReview } from '@/services/storefront/reviews';
import reviewFilters, { matchesReviewFilter } from './filters';

function review(overrides: Partial<ProductReview> = {}): ProductReview {
  return {
    id: 'r1',
    rating: 5,
    body: 'Fits exactly like the size chart said.',
    displayName: 'Hezekiah A.',
    variantLabel: 'Digital Black / 31"-35"',
    createdAt: '2026-08-19T10:00:00.000Z',
    reply: null,
    ...overrides,
  };
}

describe('reviewFilters', () => {
  it('offers only the star bands that have something in them', () => {
    const filters = reviewFilters([
      review({ id: 'a', rating: 5 }),
      review({ id: 'b', rating: 5 }),
      review({ id: 'c', rating: 3 }),
    ]);

    expect(filters.map((filter) => [filter.label, filter.count])).toEqual([
      ['All', 3],
      ['5 star', 2],
      ['3 star', 1],
    ]);
  });

  /**
   * A single review has nothing to narrow: a `5 star` chip would select the same
   * set as `All`. `All` alone means the list component draws no chip row.
   */
  it('leaves one review with nothing to filter by', () => {
    expect(reviewFilters([review()])).toEqual([
      { key: 'all', label: 'All', count: 1 },
    ]);
  });

  /** Same rule at any size: a band holding everything selects what All does. */
  it('offers no band when every review sits in it', () => {
    expect(
      reviewFilters([review({ id: 'a' }), review({ id: 'b' })]).map(
        (f) => f.key,
      ),
    ).toEqual(['all']);
  });

  it('offers the comments chip only when it partitions the list', () => {
    const mixed = reviewFilters([
      review({ id: 'a' }),
      review({ id: 'b', body: null }),
    ]);

    expect(mixed.map((filter) => filter.key)).toContain('commented');
    expect(mixed.find((filter) => filter.key === 'commented')?.count).toBe(1);

    const allCommented = reviewFilters([
      review({ id: 'a' }),
      review({ id: 'b' }),
    ]);

    expect(allCommented.map((filter) => filter.key)).not.toContain('commented');
  });

  it('treats an empty body as no comment', () => {
    const filters = reviewFilters([
      review({ id: 'a', body: '' }),
      review({ id: 'b' }),
    ]);

    expect(filters.find((filter) => filter.key === 'commented')?.count).toBe(1);
  });

  /**
   * Shopee's most prominent chip. `ProductReviewSchema` carries no image or
   * video, so a media filter would be a control over a field the wire does not
   * have.
   */
  it('never offers a media filter', () => {
    const labels = reviewFilters([
      review(),
      review({ id: 'b', rating: 1 }),
      review({ id: 'c', rating: 3, body: null }),
    ]).map((filter) => filter.label.toLowerCase());

    expect(labels.join(' ')).not.toMatch(/media|photo|video|image/);
  });
});

describe('matchesReviewFilter', () => {
  it('matches everything under all', () => {
    expect(matchesReviewFilter(review({ rating: 2 }), 'all')).toBe(true);
  });

  it('matches a band exactly, never a range', () => {
    expect(matchesReviewFilter(review({ rating: 4 }), '4')).toBe(true);
    expect(matchesReviewFilter(review({ rating: 5 }), '4')).toBe(false);
  });

  it('matches a comment only when there are words', () => {
    expect(matchesReviewFilter(review(), 'commented')).toBe(true);
    expect(matchesReviewFilter(review({ body: null }), 'commented')).toBe(
      false,
    );
    expect(matchesReviewFilter(review({ body: '' }), 'commented')).toBe(false);
  });
});

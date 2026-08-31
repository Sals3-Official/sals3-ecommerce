import { describe, expect, it } from 'vitest';
import { reviewItemSchema } from './review-schema';

const BASE = {
  orderLineId: 'line-1',
  rating: '5',
  attribution: 'named' as const,
};

/**
 * The delivery score's journey from an untouched star row to the portal.
 *
 * These are the only tests in this file because they are the only part of this
 * schema where the obvious spelling is wrong. `z.coerce.number()` turns `''`
 * into `0`, and a `0` reaching the portal is not a harmless default: the
 * column's `CHECK` refuses anything outside 1-5, so it fails the whole review
 * — and if it did land, every read would count it as a one-star verdict on a
 * courier from a buyer who said nothing at all.
 */
describe('reviewItemSchema deliveryRating', () => {
  it.each([
    ['an untouched star row', ''],
    ['a missing field', null],
    ['the unrated sentinel', '0'],
  ])('leaves %s undefined rather than coercing it to zero', (_label, value) => {
    const parsed = reviewItemSchema.parse({ ...BASE, deliveryRating: value });

    expect(parsed.deliveryRating).toBeUndefined();
  });

  it('keeps a score the buyer actually gave', () => {
    expect(
      reviewItemSchema.parse({ ...BASE, deliveryRating: '3' }).deliveryRating,
    ).toBe(3);
  });

  it('refuses a score outside the scale rather than clamping it', () => {
    expect(
      reviewItemSchema.safeParse({ ...BASE, deliveryRating: '6' }).success,
    ).toBe(false);
  });

  /** A product rating is required; the delivery one is not, and never becomes so. */
  it('parses a review that answers nothing about delivery', () => {
    const parsed = reviewItemSchema.safeParse(BASE);

    expect(parsed.success).toBe(true);
    expect(parsed.success && parsed.data.rating).toBe(5);
  });
});

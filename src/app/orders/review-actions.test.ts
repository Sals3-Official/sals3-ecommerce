import { beforeEach, describe, expect, it, vi } from 'vitest';
import submitOrderReviewsAction, {
  type OrderReviewsPayload,
} from './review-actions';

const revalidatePath = vi.hoisted(() => vi.fn());
const getBuyerSession = vi.hoisted(() => vi.fn());
const submitProductReview = vi.hoisted(() => vi.fn());

vi.mock('next/cache', () => ({ revalidatePath }));
vi.mock('@/lib/auth/dal', () => ({ getBuyerSession }));
vi.mock('@/services/storefront/reviews', () => ({ submitProductReview }));

const SIGNED_IN = { uid: 'u1', email: 'buyer@example.com' };

function payload(
  overrides: Partial<OrderReviewsPayload> = {},
): OrderReviewsPayload {
  return {
    orderNumber: 'S3-2608-1194',
    items: [{ orderLineId: 'line-1', rating: 5, attribution: 'named' }],
    ...overrides,
  };
}

beforeEach(() => {
  revalidatePath.mockClear();
  getBuyerSession.mockReset();
  submitProductReview.mockReset();
  getBuyerSession.mockResolvedValue(SIGNED_IN);
  submitProductReview.mockResolvedValue({ ok: true, reviewId: 'r1' });
});

/**
 * The action is the boundary the modal cannot be trusted past. Every case here
 * is about a payload that reached it, not about what the dialog drew.
 */
describe('submitOrderReviewsAction', () => {
  it('posts each item and revalidates the order and the list', async () => {
    const result = await submitOrderReviewsAction(
      payload({
        items: [
          { orderLineId: 'line-1', rating: 5, attribution: 'named' },
          { orderLineId: 'line-2', rating: 3, attribution: 'anonymous' },
        ],
      }),
    );

    expect(result).toEqual({ status: 'success', posted: 2 });
    expect(submitProductReview).toHaveBeenCalledTimes(2);
    expect(revalidatePath).toHaveBeenCalledWith('/orders/S3-2608-1194');
    expect(revalidatePath).toHaveBeenCalledWith('/orders');
  });

  /**
   * The verified session address is the authorisation the portal reads. It is
   * read here and never accepted from the payload, so there is no field a caller
   * could set to review somebody else's purchase.
   */
  it('sends the session address and nothing the caller supplied', async () => {
    await submitOrderReviewsAction({
      ...payload(),
      // A field the schema does not declare — it must not survive to the portal.
      ...({ verifiedEmail: 'someone.else@example.com' } as object),
    });

    expect(submitProductReview).toHaveBeenCalledWith(
      expect.objectContaining({ verifiedEmail: 'buyer@example.com' }),
    );
  });

  it('refuses a signed-out caller before any portal call', async () => {
    getBuyerSession.mockResolvedValue(null);

    const result = await submitOrderReviewsAction(payload());

    expect(result).toEqual({
      status: 'error',
      message: 'Sign in again to post your review.',
    });
    expect(submitProductReview).not.toHaveBeenCalled();
  });

  it.each([
    ['no items', { items: [] }],
    ['an unrated item', { items: [{ orderLineId: 'l', rating: 0 }] }],
    ['a rating above five', { items: [{ orderLineId: 'l', rating: 6 }] }],
    ['an empty line id', { items: [{ orderLineId: '', rating: 4 }] }],
    ['an unknown attribution', { items: [{ orderLineId: 'l', rating: 4 }] }],
  ])('refuses %s without calling the portal', async (label, overrides) => {
    const items = (
      overrides.items as { orderLineId: string; rating: number }[]
    ).map((item) => ({
      ...item,
      attribution:
        label === 'an unknown attribution'
          ? ('public' as unknown as 'named')
          : ('named' as const),
    }));

    const result = await submitOrderReviewsAction(payload({ items }));

    expect(result.status).toBe('error');
    expect(submitProductReview).not.toHaveBeenCalled();
  });

  /**
   * The array is client-supplied, and an unbounded one is a way to spend the
   * shared rate limit from a single request. The cap is checked before the
   * fan-out starts, not per item inside it.
   */
  it('refuses more items than one order can hold', async () => {
    const result = await submitOrderReviewsAction(
      payload({
        items: Array.from({ length: 11 }, (_unused, index) => ({
          orderLineId: `line-${index}`,
          rating: 5,
          attribution: 'named' as const,
        })),
      }),
    );

    expect(result.status).toBe('error');
    expect(submitProductReview).not.toHaveBeenCalled();
  });

  it('reports the portal refusal in the buyer own words', async () => {
    submitProductReview.mockResolvedValue({
      ok: false,
      reason: 'not_eligible',
    });

    const result = await submitOrderReviewsAction(payload());

    expect(result).toEqual({
      status: 'error',
      message:
        'You can review this item once the package that carried it is delivered.',
    });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  /**
   * One of two landing is neither a success nor a failure. Saying "posted" would
   * be a lie and saying "failed" would invite a duplicate attempt on the one
   * that did.
   */
  it('reports a partial post as its own outcome', async () => {
    submitProductReview
      .mockResolvedValueOnce({ ok: true, reviewId: 'r1' })
      .mockResolvedValueOnce({ ok: false, reason: 'already_reviewed' });

    const result = await submitOrderReviewsAction(
      payload({
        items: [
          { orderLineId: 'line-1', rating: 5, attribution: 'named' },
          { orderLineId: 'line-2', rating: 4, attribution: 'named' },
        ],
      }),
    );

    expect(result).toEqual({
      status: 'partial',
      posted: 1,
      message: 'You have already reviewed this item.',
    });
    // The one that landed still changes both views.
    expect(revalidatePath).toHaveBeenCalledWith('/orders');
  });

  /** An empty body is dropped rather than sent as `''`. */
  it('omits a body the buyer left blank', async () => {
    await submitOrderReviewsAction(
      payload({
        items: [
          {
            orderLineId: 'line-1',
            rating: 5,
            body: '   ',
            attribution: 'named',
          },
        ],
      }),
    );

    expect(submitProductReview).toHaveBeenCalledWith(
      expect.not.objectContaining({ body: expect.anything() }),
    );
  });
});

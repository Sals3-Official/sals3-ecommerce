import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * Route-level guarantees for the buyer orders surface: who may read it, what
 * happens to a number that is not theirs, and that neither page is indexable.
 *
 * The pages are exercised as functions rather than rendered. What is under test
 * here is the guard and the metadata — both decided before a single element is
 * produced — and calling them directly keeps the assertion on the control flow
 * instead of on a tree of chrome components.
 */

const redirected = vi.hoisted(() => vi.fn());
const notFound = vi.hoisted(() => vi.fn());
const getBuyerSession = vi.hoisted(() => vi.fn());

vi.mock('server-only', () => ({}));

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    redirected(url);
    throw new Error(`REDIRECT:${url}`);
  },
  notFound: () => {
    notFound();
    throw new Error('NOT_FOUND');
  },
}));

vi.mock('@/lib/auth/dal', () => ({ getBuyerSession }));

// The pages read the portal's orders API through this service; the routes
// under test only care about the guard and the metadata, so it serves the
// test fixtures the UI was built against.
vi.mock('@/services/storefront/orders', async () => {
  const { default: payloads } =
    await import('../../../test/fixtures/buyer-order-payloads');

  return {
    fetchBuyerOrders: vi.fn(async () => payloads),
    fetchBuyerOrder: vi.fn(async (_email: string, orderNumber: string) => {
      const match = payloads.find(
        (candidate) => candidate.orderNumber === orderNumber.toUpperCase(),
      );

      return match ?? null;
    }),
  };
});

const SIGNED_IN = { uid: 'u1', email: 'buyer@example.com' };

beforeEach(() => {
  redirected.mockClear();
  notFound.mockClear();
  getBuyerSession.mockReset();
});

describe('/orders', () => {
  it('is never indexed', async () => {
    const { generateMetadata } = await import('./page');

    expect(generateMetadata().robots).toEqual({ index: false, follow: false });
  });

  it('sends a signed-out visitor to sign-in carrying the post-login key', async () => {
    getBuyerSession.mockResolvedValue(null);

    const { default: OrdersPage } = await import('./page');

    await expect(OrdersPage({})).rejects.toThrow('REDIRECT:/login?next=orders');
    expect(redirected).toHaveBeenCalledWith('/login?next=orders');
  });

  it('renders for a signed-in buyer without redirecting', async () => {
    getBuyerSession.mockResolvedValue(SIGNED_IN);

    const { default: OrdersPage } = await import('./page');

    await expect(OrdersPage({})).resolves.toBeDefined();
    expect(redirected).not.toHaveBeenCalled();
  });
});

describe('/orders/[orderNumber]', () => {
  it('is never indexed', async () => {
    getBuyerSession.mockResolvedValue(SIGNED_IN);

    const { generateMetadata } = await import('./[orderNumber]/page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ orderNumber: 'S3-20260812-9F3C1A7B2E' }),
    });

    expect(metadata.robots).toEqual({ index: false, follow: false });
  });

  it('reads an order the session owns', async () => {
    getBuyerSession.mockResolvedValue(SIGNED_IN);

    const { default: OrderDetailPage } = await import('./[orderNumber]/page');

    await expect(
      OrderDetailPage({
        params: Promise.resolve({ orderNumber: 'S3-20260812-9F3C1A7B2E' }),
      }),
    ).resolves.toBeDefined();
    expect(notFound).not.toHaveBeenCalled();
  });

  it('treats an order it cannot read as one that does not exist', async () => {
    getBuyerSession.mockResolvedValue(SIGNED_IN);

    const { default: OrderDetailPage } = await import('./[orderNumber]/page');

    await expect(
      OrderDetailPage({
        params: Promise.resolve({ orderNumber: 'S3-19990101-000000DEAD' }),
      }),
    ).rejects.toThrow('NOT_FOUND');
  });

  it('does not name the order number in the title of an order it cannot read', async () => {
    getBuyerSession.mockResolvedValue(SIGNED_IN);

    const { generateMetadata } = await import('./[orderNumber]/page');
    const metadata = await generateMetadata({
      params: Promise.resolve({ orderNumber: 'S3-19990101-000000DEAD' }),
    });

    expect(metadata.title).not.toMatch(/DEAD/);
  });

  it('sends a signed-out visitor to sign-in', async () => {
    getBuyerSession.mockResolvedValue(null);

    const { default: OrderDetailPage } = await import('./[orderNumber]/page');

    await expect(
      OrderDetailPage({
        params: Promise.resolve({ orderNumber: 'S3-20260812-9F3C1A7B2E' }),
      }),
    ).rejects.toThrow('REDIRECT:/login?next=orders');
  });
});

import { redirect } from 'next/navigation';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getBuyerSession } from '@/lib/auth/dal';
import CheckoutFlowLayout from './layout';
import { generateMetadata as informationMetadata } from './page';
import { generateMetadata as deliveryMetadata } from './delivery/page';
import { generateMetadata as paymentMetadata } from './payment/page';

vi.mock('server-only', () => ({}));

vi.mock('@/lib/auth/dal', () => ({
  getBuyerSession: vi.fn(),
}));

/*
  The layout now also seeds the address form's country from the buyer's
  destination, which means reading `cookies()` — and jsdom has no request. What
  the seed does with the value is asserted in `useCheckoutAddress`; here it only
  has to not take the guard's tests down with it.
*/
vi.mock('@/lib/destination/resolve', () => ({
  resolveDestination: vi.fn().mockResolvedValue({
    destination: { code: 'PH', label: 'Philippines', isGlobal: false },
    source: 'chosen',
  }),
}));

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

const mockedGetBuyerSession = vi.mocked(getBuyerSession);
const mockedRedirect = vi.mocked(redirect);

describe('checkout flow layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedGetBuyerSession.mockResolvedValue({ uid: 'buyer-123' });
  });

  /*
   * The guard moved from the page to this layout when checkout became three
   * routes. One check now covers all of them — and it must, because
   * /checkout/delivery and /checkout/payment are directly addressable.
   */
  it('sends a signed-out visitor to sign in, and back to checkout afterwards', async () => {
    mockedGetBuyerSession.mockResolvedValue(null);

    await expect(CheckoutFlowLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT',
    );

    expect(mockedRedirect).toHaveBeenCalledWith('/login?next=checkout');
  });

  it('renders the flow for a signed-in buyer', async () => {
    await expect(CheckoutFlowLayout({ children: null })).resolves.toBeTruthy();

    expect(mockedRedirect).not.toHaveBeenCalled();
  });

  it.each([
    ['information', informationMetadata],
    ['delivery', deliveryMetadata],
    ['payment', paymentMetadata],
  ])('keeps the %s step out of search results', (_label, metadata) => {
    expect(metadata().robots).toMatchObject({ index: false, follow: false });
  });
});

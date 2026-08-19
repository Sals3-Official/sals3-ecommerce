import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProductsApiError } from '@/services/storefront/client';
import { classifyStorefrontFailure, logCheckoutFailure } from './failure-log';

vi.mock('server-only', () => ({}));

describe('classifyStorefrontFailure', () => {
  it('reads a 422 as an item that cannot ship, keeping the portal sentence', () => {
    expect(
      classifyStorefrontFailure(
        new ProductsApiError('Storefront checkout freight quote API failed.', {
          status: 422,
          safeMessage: 'A cart item is not available for delivery.',
        }),
      ),
    ).toEqual({
      reason: 'unshippable',
      status: 422,
      safeMessage: 'A cart item is not available for delivery.',
    });
  });

  it('still reads a 422 without a sentence as unshippable', () => {
    expect(
      classifyStorefrontFailure(
        new ProductsApiError('failed', { status: 422 }),
      ),
    ).toEqual({ reason: 'unshippable', status: 422 });
  });

  it('reads any other status as an upstream failure', () => {
    expect(
      classifyStorefrontFailure(
        new ProductsApiError('failed', { status: 500 }),
      ),
    ).toEqual({ reason: 'upstream', status: 500 });
  });

  /* A schema mismatch throws without a status — retryable, not unshippable. */
  it('reads a statusless portal error as upstream', () => {
    expect(classifyStorefrontFailure(new ProductsApiError('bad data'))).toEqual(
      { reason: 'upstream' },
    );
  });

  it('reads a non-portal throw as upstream', () => {
    expect(classifyStorefrontFailure(new Error('socket hang up'))).toEqual({
      reason: 'upstream',
    });
  });
});

describe('logCheckoutFailure', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('writes one structured line naming the step, reason, and status', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    logCheckoutFailure(
      'shipping-quote',
      { reason: 'unshippable', status: 422 },
      new ProductsApiError('Storefront checkout freight quote API failed.'),
    );

    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(consoleError).toHaveBeenCalledWith('[checkout] step failed', {
      step: 'shipping-quote',
      reason: 'unshippable',
      status: 422,
      error: 'ProductsApiError: Storefront checkout freight quote API failed.',
    });
  });

  /*
   * Rule 35: never log personal data. The log answers "which step, which
   * upstream, what status" — the address it failed for is not part of that.
   */
  it('carries no buyer detail', () => {
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    logCheckoutFailure(
      'checkout-session',
      { reason: 'payment' },
      new Error('card_declined for buyer@example.com'),
    );

    const logged = consoleError.mock.calls[0]!;
    expect(JSON.stringify(logged)).not.toMatch(/address|phone|postal/i);
    expect(logged[1]).toMatchObject({
      step: 'checkout-session',
      reason: 'payment',
    });
  });
});

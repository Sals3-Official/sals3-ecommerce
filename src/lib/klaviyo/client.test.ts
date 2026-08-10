import { describe, expect, it, vi } from 'vitest';
import { KLAVIYO_CONSENT_ACCEPTED, writeKlaviyoConsent } from './consent';
import { identifyKlaviyoProfile, trackKlaviyoEvent } from './client';

describe('Klaviyo browser client', () => {
  it('does not track before analytics consent', () => {
    const track = vi.fn();

    window.klaviyo = { track };

    trackKlaviyoEvent('Viewed Product', { ProductID: 'air-cooler' });

    expect(track).not.toHaveBeenCalled();
  });

  it('tracks and identifies after analytics consent', () => {
    const track = vi.fn();
    const identify = vi.fn();

    writeKlaviyoConsent(KLAVIYO_CONSENT_ACCEPTED, '2026-08-08T00:00:00.000Z');
    window.klaviyo = { track, identify };

    trackKlaviyoEvent('Viewed Product', { ProductID: 'air-cooler' });
    identifyKlaviyoProfile({ email: 'shopper@example.com' });

    expect(track).toHaveBeenCalledWith('Viewed Product', {
      ProductID: 'air-cooler',
    });
    expect(identify).toHaveBeenCalledWith({ email: 'shopper@example.com' });
  });
});

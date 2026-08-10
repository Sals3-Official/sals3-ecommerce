import { describe, expect, it } from 'vitest';
import {
  KLAVIYO_CONSENT_ACCEPTED,
  KLAVIYO_CONSENT_STORAGE_KEY,
  hasAcceptedKlaviyoConsent,
  parseKlaviyoConsentRecord,
  readKlaviyoConsent,
  writeKlaviyoConsent,
} from './consent';

describe('Klaviyo consent state', () => {
  it('parses only known consent records', () => {
    expect(
      parseKlaviyoConsentRecord(
        JSON.stringify({
          decision: KLAVIYO_CONSENT_ACCEPTED,
          decidedAt: '2026-08-08T00:00:00.000Z',
        }),
      ),
    ).toEqual({
      decision: KLAVIYO_CONSENT_ACCEPTED,
      decidedAt: '2026-08-08T00:00:00.000Z',
    });
    expect(parseKlaviyoConsentRecord('{')).toBeNull();
    expect(parseKlaviyoConsentRecord('{"decision":"maybe"}')).toBeNull();
  });

  it('stores and reads accepted consent', () => {
    writeKlaviyoConsent(KLAVIYO_CONSENT_ACCEPTED, '2026-08-08T00:00:00.000Z');

    expect(readKlaviyoConsent()).toEqual({
      decision: KLAVIYO_CONSENT_ACCEPTED,
      decidedAt: '2026-08-08T00:00:00.000Z',
    });
    expect(hasAcceptedKlaviyoConsent()).toBe(true);
    expect(window.localStorage.getItem(KLAVIYO_CONSENT_STORAGE_KEY)).toContain(
      KLAVIYO_CONSENT_ACCEPTED,
    );
  });
});

export const KLAVIYO_CONSENT_STORAGE_KEY = 'sals3_klaviyo_consent_v1';
export const KLAVIYO_CONSENT_CHANGE_EVENT = 'sals3:klaviyo-consent-change';

export const KLAVIYO_CONSENT_ACCEPTED = 'accepted';
export const KLAVIYO_CONSENT_DECLINED = 'declined';

export type KlaviyoConsentDecision =
  typeof KLAVIYO_CONSENT_ACCEPTED | typeof KLAVIYO_CONSENT_DECLINED;

export type KlaviyoConsentRecord = {
  decision: KlaviyoConsentDecision;
  decidedAt: string;
};

function isConsentDecision(value: unknown): value is KlaviyoConsentDecision {
  return (
    value === KLAVIYO_CONSENT_ACCEPTED || value === KLAVIYO_CONSENT_DECLINED
  );
}

export function parseKlaviyoConsentRecord(
  raw: string | null,
): KlaviyoConsentRecord | null {
  if (!raw) {
    return null;
  }

  try {
    const parsed: unknown = JSON.parse(raw);

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      !('decision' in parsed) ||
      !isConsentDecision(parsed.decision) ||
      !('decidedAt' in parsed) ||
      typeof parsed.decidedAt !== 'string'
    ) {
      return null;
    }

    return {
      decision: parsed.decision,
      decidedAt: parsed.decidedAt,
    };
  } catch {
    return null;
  }
}

export function readKlaviyoConsent(): KlaviyoConsentRecord | null {
  if (typeof window === 'undefined') {
    return null;
  }

  return parseKlaviyoConsentRecord(
    window.localStorage.getItem(KLAVIYO_CONSENT_STORAGE_KEY),
  );
}

export function hasAcceptedKlaviyoConsent() {
  return readKlaviyoConsent()?.decision === KLAVIYO_CONSENT_ACCEPTED;
}

export function writeKlaviyoConsent(
  decision: KlaviyoConsentDecision,
  decidedAt = new Date().toISOString(),
): KlaviyoConsentRecord {
  const record = { decision, decidedAt };

  window.localStorage.setItem(
    KLAVIYO_CONSENT_STORAGE_KEY,
    JSON.stringify(record),
  );
  window.dispatchEvent(new Event(KLAVIYO_CONSENT_CHANGE_EVENT));

  return record;
}

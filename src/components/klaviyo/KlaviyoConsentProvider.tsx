'use client';

import { useEffect, useSyncExternalStore, type ReactNode } from 'react';
import {
  KLAVIYO_CONSENT_ACCEPTED,
  KLAVIYO_CONSENT_CHANGE_EVENT,
  KLAVIYO_CONSENT_DECLINED,
  KLAVIYO_CONSENT_STORAGE_KEY,
  readKlaviyoConsent,
  writeKlaviyoConsent,
  type KlaviyoConsentDecision,
} from '@/lib/klaviyo/consent';
import { syncKlaviyoProfile } from '@/lib/klaviyo/client';
import KlaviyoConsentBanner from './KlaviyoConsentBanner';
import KlaviyoLoader from './KlaviyoLoader';

type ConsentState = KlaviyoConsentDecision | 'loading' | 'undecided';

function getConsentSnapshot(): ConsentState {
  return readKlaviyoConsent()?.decision ?? 'undecided';
}

function getServerConsentSnapshot(): ConsentState {
  return 'loading';
}

function subscribeToConsentChanges(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.key === KLAVIYO_CONSENT_STORAGE_KEY) {
      onChange();
    }
  }

  window.addEventListener(KLAVIYO_CONSENT_CHANGE_EVENT, onChange);
  window.addEventListener('storage', handleStorage);

  return () => {
    window.removeEventListener(KLAVIYO_CONSENT_CHANGE_EVENT, onChange);
    window.removeEventListener('storage', handleStorage);
  };
}

export default function KlaviyoConsentProvider({
  children,
}: {
  children: ReactNode;
}) {
  const consent = useSyncExternalStore(
    subscribeToConsentChanges,
    getConsentSnapshot,
    getServerConsentSnapshot,
  );
  const isAccepted = consent === KLAVIYO_CONSENT_ACCEPTED;

  useEffect(() => {
    if (isAccepted) {
      syncKlaviyoProfile().catch(() => undefined);
    }
  }, [isAccepted]);

  function decide(nextConsent: KlaviyoConsentDecision) {
    writeKlaviyoConsent(nextConsent);
  }

  return (
    <>
      {isAccepted ? (
        <KlaviyoLoader siteId={process.env.NEXT_PUBLIC_KLAVIYO_SITE_ID ?? ''} />
      ) : null}
      {children}
      {consent === 'undecided' ? (
        <KlaviyoConsentBanner
          onAccept={() => decide(KLAVIYO_CONSENT_ACCEPTED)}
          onDecline={() => decide(KLAVIYO_CONSENT_DECLINED)}
        />
      ) : null}
    </>
  );
}

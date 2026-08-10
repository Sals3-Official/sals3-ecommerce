import { z } from 'zod';
import { readKlaviyoConsent } from './consent';

const utmSchema = z
  .record(
    z.string().regex(/^utm_[a-z0-9_]{1,40}$/i),
    z.string().min(1).max(200),
  )
  .default({});

export const klaviyoBrowserContextSchema = z.object({
  locale: z.string().min(1).max(40).optional(),
  timezone: z.string().min(1).max(80).optional(),
  viewportWidth: z.number().int().min(1).max(10000).optional(),
  viewportHeight: z.number().int().min(1).max(10000).optional(),
  screenWidth: z.number().int().min(1).max(10000).optional(),
  screenHeight: z.number().int().min(1).max(10000).optional(),
  referrer: z.string().max(2048).optional(),
  currentPath: z.string().min(1).max(2048),
  utm: utmSchema,
  consentedAt: z.string().datetime().optional(),
});

export type KlaviyoBrowserContext = z.infer<typeof klaviyoBrowserContextSchema>;

function getUtmParams(searchParams: URLSearchParams) {
  const utm: Record<string, string> = {};

  searchParams.forEach((value, key) => {
    if (/^utm_[a-z0-9_]{1,40}$/i.test(key) && value) {
      utm[key] = value.slice(0, 200);
    }
  });

  return utm;
}

export function collectKlaviyoBrowserContext(): KlaviyoBrowserContext {
  const consent = readKlaviyoConsent();
  const currentPath = `${window.location.pathname}${window.location.search}`;

  return {
    locale: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    referrer: document.referrer.slice(0, 2048),
    currentPath,
    utm: getUtmParams(new URLSearchParams(window.location.search)),
    ...(consent?.decision === 'accepted'
      ? { consentedAt: consent.decidedAt }
      : {}),
  };
}

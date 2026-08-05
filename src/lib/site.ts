export const SITE_NAME = 'Sals3';

export const SITE_DESCRIPTION =
  'Sals3 is a Philippine online marketplace. See the final price with no surprises at checkout.';

/**
 * Short plain-English tagline used as the home page <h1> and OG title suffix.
 * Keep it short and simple — understandable by an elementary school student.
 */
export const SITE_TAGLINE = 'Shop smarter, pay less.';

/**
 * Real production domain is not confirmed yet (see hot.md). Callers must
 * treat an unset value as "no absolute URL available" rather than guess one.
 */
export function getSiteUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SITE_URL;
}

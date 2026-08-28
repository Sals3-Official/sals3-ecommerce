export const SITE_NAME = 'Sals3';

/**
 * Served verbatim to AI crawlers through `llms.txt` and to search engines
 * through the home page metadata, so it must not carry a claim the site cannot
 * stand behind.
 *
 * Two claims were removed on 2026-08-13. "A Philippine online marketplace" no
 * longer matches the product: prices are USD (ADR-003 phase 1), Sals3's business
 * registration is Australian (ADR-014), and AU, PH and FJ are approved buyer
 * destinations — no single country is the right one to name until incorporation
 * and launch markets are settled. "No surprises at checkout" contradicted the
 * shipping reality the PDP now states honestly: no freight is added at checkout
 * and no delivery estimate exists, because Sals3 has neither a rate table nor a
 * carrier integration (ADR-003). An earlier version of this comment said freight
 * "is quoted at checkout" — corrected 2026-08-14: nothing quotes it, and the PDP
 * no longer claims otherwise.
 */
export const SITE_DESCRIPTION =
  'Sals3 is an online marketplace. Browse products with one clear price per item, in USD.';

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

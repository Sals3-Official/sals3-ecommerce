import { SITE_NAME, getSiteUrl } from '@/lib/site';

/**
 * Emits a WebSite JSON-LD block.
 *
 * `url` and `potentialAction` (SearchAction) are gated on NEXT_PUBLIC_SITE_URL —
 * no domain is guessed or hardcoded (see hot.md and skills lesson 14).
 *
 * The SearchAction target (/search?q=) is a forward-looking signal; the search
 * route does not exist yet. Replace the target once the real search URL ships.
 */
export default function WebSiteSchema() {
  const siteUrl = getSiteUrl();

  const potentialAction = siteUrl
    ? {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${siteUrl}/search?q={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      }
    : undefined;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    ...(siteUrl ? { url: siteUrl } : {}),
    ...(potentialAction ? { potentialAction } : {}),
  };

  return (
    <script
      type="application/ld+json"
      // Static, server-generated JSON with no user input — safe from injection.
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

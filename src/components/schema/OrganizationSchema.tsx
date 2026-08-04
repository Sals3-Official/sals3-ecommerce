import { SITE_NAME, getSiteUrl } from '@/lib/site';

export default function OrganizationSchema() {
  const siteUrl = getSiteUrl();

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    ...(siteUrl ? { url: siteUrl, logo: `${siteUrl}/sals3-logo.webp` } : {}),
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

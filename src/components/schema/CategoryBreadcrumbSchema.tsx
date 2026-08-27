import { getSiteUrl } from '@/lib/site';

type CategoryBreadcrumbSchemaProps = {
  categoryName: string;
  categorySlug: string;
};

/** Mirrors `OrganizationSchema`'s convention: gated on a confirmed site URL,
 * static server-generated JSON with no user input. Safe to ship now that
 * `/categories` and `/c/[slug]` are both real, linkable routes.
 *
 * Every `item` is one market deep, matching the page the crawler is reading.
 * A trail that climbed from `/ph/c/electronics` to a market-less `/categories`
 * would assert a hierarchy the site does not have — and `/categories` is a
 * redirect to Australia, so the asserted parent is a different market's page.
 */
export default function CategoryBreadcrumbSchema({
  categoryName,
  categorySlug,
}: CategoryBreadcrumbSchemaProps) {
  const siteUrl = getSiteUrl();

  if (siteUrl === undefined) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${siteUrl}${'/'}`,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'All categories',
        item: `${siteUrl}${'/categories'}`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: categoryName,
        item: `${siteUrl}${`/c/${categorySlug}`}`,
      },
    ],
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

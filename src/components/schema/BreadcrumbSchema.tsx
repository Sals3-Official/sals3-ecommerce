import type { BreadcrumbEntry } from '@/lib/product-breadcrumb';
import { getSiteUrl } from '@/lib/site';

type BreadcrumbSchemaProps = {
  trail: BreadcrumbEntry[];
  /** The product's own path, e.g. `/p/some-slug`, for the final item. */
  productPath: string;
};

/**
 * `BreadcrumbList` JSON-LD, built from the same trail the visible nav renders.
 *
 * ## `item` is present only where a real URL exists
 *
 * Every `ListItem` carries a `name` and a `position`, which is valid on its own —
 * Google documents a name-only final item. `item` is added only for entries with
 * a genuine URL: today Home and the product itself. Intermediate category levels
 * have no route (`/c/[category]` does not exist) and no slug on the payload, so
 * pointing them anywhere would be a guessed structured-data value — the failure
 * mode that risks a manual action against the whole domain rather than one bad
 * link.
 *
 * With `NEXT_PUBLIC_SITE_URL` unset there is no way to build an absolute URL, so
 * no `item` is emitted at all and the list degrades to names. That mirrors how
 * `ProductSchema` and `OrganizationSchema` gate their own URL fields.
 *
 * The `<` escape is the same guard `ProductSchema` uses: breadcrumb names
 * include supplier-authored product titles, and an unescaped `<` inside a
 * `<script>` block can close the tag.
 */
export default function BreadcrumbSchema({
  trail,
  productPath,
}: BreadcrumbSchemaProps) {
  const siteUrl = getSiteUrl();

  function urlFor(entry: BreadcrumbEntry, last: boolean): string | undefined {
    if (siteUrl === undefined) return undefined;
    if (last) return `${siteUrl}${productPath}`;
    if (entry.href === undefined) return undefined;

    return `${siteUrl}${entry.href}`;
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((entry, index) => {
      const url = urlFor(entry, index === trail.length - 1);

      return {
        '@type': 'ListItem',
        position: index + 1,
        name: entry.name,
        ...(url === undefined ? {} : { item: url }),
      };
    }),
  };

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger -- JSON-LD has no non-script form; `<` is escaped above.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(schema).replace(/</g, '\\u003c'),
      }}
    />
  );
}

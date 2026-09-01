import CatalogPageSkeleton from '@/components/catalog/CatalogPageSkeleton';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';

/**
 * Shown while a search resolves.
 *
 * `SiteHeader` is rendered without `searchTerm`: the real page seeds the box
 * from `searchParams`, which a `loading.tsx` cannot read. Passing nothing leaves
 * the field empty for the moment the fallback is up rather than showing a stale
 * keyword from the previous search, which would be a wrong fact rather than a
 * missing one.
 */
export default function SearchLoading() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <CatalogPageSkeleton label="Searching…" />
      <SiteFooter />
    </div>
  );
}

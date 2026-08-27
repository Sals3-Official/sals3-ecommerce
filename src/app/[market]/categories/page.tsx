import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import DepartmentList from '@/components/categories/DepartmentList';
import { departmentsOrTaxonomy } from '@/lib/departments';
import type { Category } from '@/lib/home-placeholder-data';
import { SITE_NAME } from '@/lib/site';
import { fetchProductCategories, toHomeCategory } from '@/services/products';
import {
  DEFAULT_MARKET,
  isMarketSegment,
  type MarketSegment,
} from '@/lib/destination/markets';

export function generateMetadata(): Metadata {
  return {
    title: `All departments — ${SITE_NAME}`,
    description: `Browse every department in the ${SITE_NAME} catalogue.`,
    robots: { index: true, follow: true },
  };
}

/**
 * Every main category the taxonomy defines, live from the portal.
 *
 * `scope: 'all'` on purpose — this page answers "what does Sals3 sell?", so a
 * department with nothing published yet still belongs here. Both the answer
 * and the failure path go through `departmentsOrTaxonomy`, so a stale portal
 * cannot turn this page into a list of leaf categories; see that helper for
 * why substituting the taxonomy list is honest rather than invented.
 */
async function getDepartments(): Promise<Category[]> {
  try {
    return departmentsOrTaxonomy(
      (await fetchProductCategories({ scope: 'all' })).map(toHomeCategory),
    );
  } catch {
    return departmentsOrTaxonomy(null);
  }
}

export default async function CategoriesPage({
  params,
}: {
  params: Promise<{ market: string }>;
}) {
  const { market: rawMarket } = await params;
  // The layout above 404s an unrecognised segment; this only narrows the type.
  const market: MarketSegment = isMarketSegment(rawMarket)
    ? rawMarket
    : DEFAULT_MARKET;
  const departments = await getDepartments();

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader market={market} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-5 pb-16">
        <h1 className="mb-1 text-2xl font-bold">All departments</h1>
        <p className="mb-4 text-sm text-ink-subtle">
          {departments.length === 1
            ? '1 department'
            : `${departments.length} departments`}
        </p>
        <DepartmentList departments={departments} market={market} />
      </main>
      <SiteFooter market={market} />
    </div>
  );
}

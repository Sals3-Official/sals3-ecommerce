import type { Metadata } from 'next';
import { Suspense } from 'react';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import CategorySection from '@/components/home/CategorySection';
import CategorySectionSkeleton from '@/components/home/CategorySectionSkeleton';
import PromoCarousel from '@/components/home/PromoCarousel';
import DealsSection from '@/components/home/DealsSection';
import ForYouSection from '@/components/home/ForYouSection';
import WebSiteSchema from '@/components/schema/WebSiteSchema';
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  getSiteUrl,
} from '@/lib/site';
import { departmentsOrTaxonomy, isDepartmentId } from '@/lib/departments';
import {
  deals,
  forYouProducts,
  type Category,
  type Product as HomeProduct,
} from '@/lib/home-placeholder-data';
import {
  fetchProductCategories,
  fetchProducts,
  parseProductsPagination,
  toHomeCategory,
  toHomeProduct,
} from '@/services/products';

/**
 * The storefront's own canonical, now that it is one storefront.
 *
 * Until 2026-08-28 this page deliberately emitted no `alternates`: the market
 * layout above it owned the self-referential canonical and the reciprocal
 * `hreflang` set for `/au`, `/ph` and `/fj`, and restating anything here would
 * have collapsed all three onto one URL. With the markets removed there is one
 * address to be canonical about, and no alternates to be reciprocal with.
 *
 * Still omitted entirely when `NEXT_PUBLIC_SITE_URL` is unset — `getSiteUrl()`
 * returns `undefined` rather than guessing a domain, which is the state
 * production is in today.
 */
export function generateMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const title = `${SITE_NAME} — ${SITE_TAGLINE}`;
  const url = siteUrl;

  return {
    title,
    description: SITE_DESCRIPTION,
    robots: { index: true, follow: true },
    ...(url ? { alternates: { canonical: url } } : {}),
    openGraph: {
      type: 'website',
      title,
      description: SITE_DESCRIPTION,
      siteName: SITE_NAME,
      ...(url ? { url } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: SITE_DESCRIPTION,
    },
  };
}

const DEALS_PRODUCT_COUNT = 5;
const FOR_YOU_PRODUCT_COUNT = 14;

type HomeProps = {
  searchParams?: Promise<{
    page?: string | string[];
  }>;
};

type HomeSearchParams = Awaited<NonNullable<HomeProps['searchParams']>>;

type HomeProducts = {
  deals: HomeProduct[];
  products: HomeProduct[];
  regionNote: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
  };
};

async function getDealProducts(): Promise<HomeProduct[]> {
  const response = await fetchProducts({
    section: 'deals',
    limit: DEALS_PRODUCT_COUNT,
  });

  return response.products.map(toHomeProduct);
}

async function fetchCategoriesOrNull(
  scope: 'stocked' | 'all',
): Promise<Category[] | null> {
  try {
    return (await fetchProductCategories({ scope })).map(toHomeCategory);
  } catch {
    return null;
  }
}

/**
 * The home grid's main categories: every department, ordered so the ones with
 * stock behind them come first.
 *
 * Both reads run in parallel and each is allowed to fail on its own — the
 * department list is the shape of the catalogue and the stocked list is only
 * an ordering signal, so losing the second must not cost the grid. Both also
 * go through `departmentsOrTaxonomy`/`isDepartmentId`, so a portal that has
 * not shipped the L1 rollup yet cannot put leaf names ("Rangefinders") back
 * on the home page.
 */
async function getHomeCategories(): Promise<Category[]> {
  const [stocked, departments] = await Promise.all([
    fetchCategoriesOrNull('stocked'),
    fetchCategoriesOrNull('all'),
  ]);

  const catalogue = departmentsOrTaxonomy(departments);
  const stockedIds = new Set(
    (stocked ?? [])
      .map((category) => category.id)
      .filter((id) => isDepartmentId(id)),
  );
  const withStock: Category[] = [];
  const withoutStock: Category[] = [];

  // One pass, not two filters: the partition is the whole point.
  catalogue.forEach((department) => {
    (stockedIds.has(department.id) ? withStock : withoutStock).push(department);
  });

  return [...withStock, ...withoutStock];
}

type ForYouResult = Pick<
  HomeProducts,
  'products' | 'regionNote' | 'pagination'
>;

async function getForYouProducts(
  requestedPagination: ReturnType<typeof parseProductsPagination>,
): Promise<ForYouResult> {
  try {
    const response = await fetchProducts(requestedPagination);

    return {
      products: response.products.map(toHomeProduct),
      regionNote: '',
      pagination: {
        currentPage: Math.min(response.page, response.totalPages),
        totalPages: response.totalPages,
      },
    };
  } catch {
    return {
      products: forYouProducts,
      regionNote: 'Live products unavailable',
    };
  }
}

async function getHomeProducts(
  searchParams?: HomeSearchParams,
): Promise<HomeProducts> {
  const requestedPagination = parseProductsPagination({
    page: searchParams?.page,
    limit: FOR_YOU_PRODUCT_COUNT,
  });

  // Independent try/catches, on purpose: a failure fetching one section
  // (e.g. a "for you" page past the real catalogue's depth) must not also
  // discard the other section's already-successful, unrelated result.
  const forYou = await getForYouProducts(requestedPagination);
  let dealProducts = deals;

  try {
    dealProducts = await getDealProducts();
  } catch {
    dealProducts = deals;
  }

  return {
    deals: dealProducts,
    ...forYou,
  } satisfies HomeProducts;
}

export default async function Home({ searchParams }: HomeProps) {
  const resolvedSearchParams = await searchParams;
  const [homeProducts, homeCategories] = await Promise.all([
    getHomeProducts(resolvedSearchParams),
    getHomeCategories(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <WebSiteSchema />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-5 pb-16">
        {/* sr-only h1: correct heading hierarchy for crawlers and screen readers */}
        <h1 className="sr-only">{SITE_TAGLINE}</h1>
        <PromoCarousel />
        {/* Suspense boundary is structural, not a real defer: homeCategories
            resolves in the Promise.all above, same as every other section on
            this page, so the skeleton fallback never actually renders here.
            A genuinely streamed category grid (fetch started, then awaited
            inside its own async child component) is valid Next.js and works
            in the real dev server, but this repo's page.test.tsx renders via
            `renderWithCart(await Home())` — a plain client render() of an
            already-resolved tree — which cannot execute a nested async
            Server Component at all (proved directly: even an async
            `findByRole` times out). Making this one section stream while the
            rest of the page still blocks is also a page-wide architecture
            change beyond this refactor's scope. CategorySectionSkeleton
            stays built and tested for when that decision is made
            deliberately. */}
        <Suspense fallback={<CategorySectionSkeleton />}>
          <CategorySection categories={homeCategories} />
        </Suspense>
        <DealsSection deals={homeProducts.deals} />
        <ForYouSection
          products={homeProducts.products}
          regionNote={homeProducts.regionNote}
          pagination={homeProducts.pagination}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

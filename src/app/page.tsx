import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import CategoryStrip from '@/components/home/CategoryStrip';
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
import {
  categories,
  deals,
  forYouProducts,
  adSlot,
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

export function generateMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const title = `${SITE_NAME} — ${SITE_TAGLINE}`;

  return {
    title,
    description: SITE_DESCRIPTION,
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title,
      description: SITE_DESCRIPTION,
      siteName: SITE_NAME,
      ...(siteUrl ? { url: siteUrl } : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description: SITE_DESCRIPTION,
    },
    ...(siteUrl ? { alternates: { canonical: siteUrl } } : {}),
  };
}

const DEALS_PRODUCT_COUNT = 5;
const FOR_YOU_PRODUCT_COUNT = 14;

type HomeProps = {
  searchParams?: Promise<{
    page?: string | string[];
  }>;
};

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

async function getHomeCategories(): Promise<Category[]> {
  try {
    const productCategories = await fetchProductCategories();

    return productCategories.map(toHomeCategory);
  } catch {
    return categories;
  }
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
  searchParamsPromise?: HomeProps['searchParams'],
): Promise<HomeProducts> {
  const searchParams = await searchParamsPromise;
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

export default async function Home({ searchParams }: HomeProps = {}) {
  const [homeProducts, homeCategories] = await Promise.all([
    getHomeProducts(searchParams),
    getHomeCategories(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <WebSiteSchema />
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-5 pb-16">
        {/* sr-only h1: correct heading hierarchy for crawlers and screen readers */}
        <h1 className="sr-only">{SITE_TAGLINE}</h1>
        <CategoryStrip categories={homeCategories} />
        <PromoCarousel />
        <DealsSection deals={homeProducts.deals} />
        <ForYouSection
          products={homeProducts.products}
          ad={adSlot}
          regionNote={homeProducts.regionNote}
          pagination={homeProducts.pagination}
        />
      </main>
      <SiteFooter />
    </div>
  );
}

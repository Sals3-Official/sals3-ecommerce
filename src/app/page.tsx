import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import CategoryStrip from '@/components/home/CategoryStrip';
import PromoCarousel from '@/components/home/PromoCarousel';
import DealsSection from '@/components/home/DealsSection';
import ForYouSection from '@/components/home/ForYouSection';
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
  fetchProductsByOffset,
  getRandomProductsSkip,
  getProductsTotalPages,
  parseProductsPagination,
  toHomeCategory,
  toHomeProduct,
} from '@/services/products';

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

async function getRandomDealProducts(total: number): Promise<HomeProduct[]> {
  const response = await fetchProductsByOffset({
    limit: DEALS_PRODUCT_COUNT,
    skip: getRandomProductsSkip(total, DEALS_PRODUCT_COUNT),
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

async function getHomeProducts(
  searchParamsPromise?: HomeProps['searchParams'],
) {
  const searchParams = await searchParamsPromise;
  const requestedPagination = parseProductsPagination({
    page: searchParams?.page,
    limit: FOR_YOU_PRODUCT_COUNT,
  });

  try {
    const firstResponse = await fetchProducts(requestedPagination);
    const totalPages = getProductsTotalPages(
      firstResponse.total,
      firstResponse.limit,
    );
    const response =
      requestedPagination.page > totalPages
        ? await fetchProducts({
            page: totalPages,
            limit: requestedPagination.limit,
          })
        : firstResponse;
    const currentPage = Math.min(requestedPagination.page, totalPages);
    let dealProducts = deals;

    try {
      dealProducts = await getRandomDealProducts(firstResponse.total);
    } catch {
      dealProducts = deals;
    }

    return {
      deals: dealProducts,
      products: response.products.map(toHomeProduct),
      regionNote: '',
      pagination: {
        currentPage,
        totalPages,
      },
    } satisfies HomeProducts;
  } catch {
    return {
      deals,
      products: forYouProducts,
      regionNote: 'Live products unavailable',
    } satisfies HomeProducts;
  }
}

export default async function Home({ searchParams }: HomeProps = {}) {
  const [homeProducts, homeCategories] = await Promise.all([
    getHomeProducts(searchParams),
    getHomeCategories(),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-5 pb-16">
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

import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import ProductAvailabilityNotice from '@/components/product/ProductAvailabilityNotice';
import ProductDescription from '@/components/product/ProductDescription';
import ProductGallery from '@/components/product/ProductGallery';
import ProductPriceBox from '@/components/product/ProductPriceBox';
import ProductPurchasePanel from '@/components/product/ProductPurchasePanel';
import ProductShippingCard from '@/components/product/ProductShippingCard';
import ProductSpecsTable from '@/components/product/ProductSpecsTable';
import RelatedProducts from '@/components/product/RelatedProducts';
import ProductSchema from '@/components/schema/ProductSchema';
import KlaviyoViewedProduct from '@/components/klaviyo/KlaviyoViewedProduct';
import { SITE_NAME, getSiteUrl } from '@/lib/site';
import type { Product as HomeProduct } from '@/lib/home-placeholder-data';
import type { ProductDetail } from '@/lib/product-detail';
import {
  fetchProductBySlug,
  fetchProductsByCategory,
  toHomeProduct,
  toProductDetail,
} from '@/services/products';

const RELATED_PRODUCT_COUNT = 6;
const META_DESCRIPTION_MAX_LENGTH = 155;

type ProductPageProps = {
  params: Promise<{ id: string }>;
};

function truncateForMetaDescription(text: string): string {
  if (text.length <= META_DESCRIPTION_MAX_LENGTH) {
    return text;
  }

  return `${text.slice(0, META_DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`;
}

/**
 * One upstream read per request, shared by `generateMetadata` and the page.
 *
 * `cache()` is doing real work here: both used to call this independently, and
 * `cache: 'no-store'` defeats Next's own fetch memoisation, so every PDP made
 * two identical requests to the portal.
 *
 * Failures are **not** swallowed. `undefined` means the product genuinely does
 * not exist (invalid slug shape, or a 404) and becomes `notFound()`. Anything
 * else propagates to `error.tsx`. The previous version caught everything and
 * called `notFound()`, which made an unreachable catalogue indistinguishable
 * from a deleted product.
 */
const getProductDetail = cache(
  async (id: string): Promise<ProductDetail | undefined> => {
    const product = await fetchProductBySlug(id);

    return product === undefined ? undefined : toProductDetail(product);
  },
);

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getProductDetail(id);

  if (!detail) {
    return { title: `Product not found — ${SITE_NAME}` };
  }

  const title = `${detail.title} — ${SITE_NAME}`;
  // Built from what exists: the category name when the product is mapped, then
  // the title. Never a rating or a delivery claim.
  const description = truncateForMetaDescription(
    detail.categoryName === undefined
      ? detail.title
      : `${detail.title} — ${detail.categoryName} at ${SITE_NAME}.`,
  );
  const siteUrl = getSiteUrl();
  const image = detail.images[0]?.url;

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: SITE_NAME,
      ...(image ? { images: [image] } : {}),
    },
    twitter: {
      card: image ? 'summary_large_image' : 'summary',
      title,
      description,
    },
    ...(siteUrl
      ? { alternates: { canonical: `${siteUrl}/p/${detail.id}` } }
      : {}),
  };
}

/**
 * Related products are best-effort: an empty rail is a smaller loss than a
 * failed page, so this one failure stays caught.
 */
async function getRelatedProducts(
  category: string,
  excludeId: string,
): Promise<HomeProduct[]> {
  try {
    const products = await fetchProductsByCategory(category, {
      limit: RELATED_PRODUCT_COUNT + 1,
    });

    return products
      .filter((product) => product.slug !== excludeId)
      .slice(0, RELATED_PRODUCT_COUNT)
      .map(toHomeProduct);
  } catch {
    return [];
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const detail = await getProductDetail(id);

  if (!detail) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(detail.category, detail.id);
  // A selector only makes sense with something to choose between. With one
  // variant — or none — the server-rendered price box is used instead, so the
  // page ships no variant JavaScript it cannot use.
  const hasChoices =
    detail.variants !== undefined &&
    detail.variants.length > 1 &&
    detail.options !== undefined &&
    detail.options.length > 0;

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-5 pb-16">
        <p className="mb-3 text-xs text-ink-subtle">
          Home / {detail.categoryName ?? detail.category} /{' '}
          <span className="text-ink">{detail.title}</span>
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <KlaviyoViewedProduct
            productId={detail.id}
            title={detail.title}
            imageUrl={detail.imageUrl}
            unitPrice={detail.price}
            category={detail.category}
          />
          <ProductGallery images={detail.images} tone={detail.tone} />
          <div className="flex flex-col gap-4">
            <h1 className="text-xl font-bold text-pretty">{detail.title}</h1>
            {hasChoices ? (
              <ProductPurchasePanel
                productId={detail.id}
                title={detail.title}
                category={detail.category}
                imageUrl={detail.imageUrl}
                imageAlt={detail.imageAlt}
                tone={detail.tone}
                basePrice={detail.price}
                baseOldPrice={detail.oldPrice}
                baseAvailability={detail.availability}
                axes={detail.options ?? []}
                variants={detail.variants ?? []}
                shipLine={detail.shipLine}
              />
            ) : (
              <>
                <ProductPriceBox
                  productId={detail.id}
                  title={detail.title}
                  category={detail.category}
                  imageUrl={detail.imageUrl}
                  imageAlt={detail.imageAlt}
                  tone={detail.tone}
                  price={detail.price}
                  oldPrice={detail.oldPrice}
                  shipLine={detail.shipLine}
                />
                <ProductAvailabilityNotice availability={detail.availability} />
              </>
            )}
            <ProductShippingCard />
          </div>
        </div>
        <ProductDescription blocks={detail.description} />
        <ProductSpecsTable specs={detail.specs} />
        <RelatedProducts products={relatedProducts} />
        <ProductSchema detail={detail} />
      </main>
      <SiteFooter />
    </div>
  );
}

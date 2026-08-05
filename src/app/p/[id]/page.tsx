import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import ProductGallery from '@/components/product/ProductGallery';
import ProductPriceBox from '@/components/product/ProductPriceBox';
import ProductFulfillmentCard from '@/components/product/ProductFulfillmentCard';
import ProductReviews from '@/components/product/ProductReviews';
import RelatedProducts from '@/components/product/RelatedProducts';
import { SITE_NAME, getSiteUrl } from '@/lib/site';
import type { Product as HomeProduct } from '@/lib/home-placeholder-data';
import {
  fetchProductById,
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

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) {
    return { title: `Product not found — ${SITE_NAME}` };
  }

  const detail = toProductDetail(product);
  const title = `${detail.title} — ${SITE_NAME}`;
  const description = truncateForMetaDescription(detail.description);
  const siteUrl = getSiteUrl();
  const image = detail.images[0];

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

async function getRelatedProducts(
  category: string,
  excludeId: string,
): Promise<HomeProduct[]> {
  try {
    const response = await fetchProductsByCategory(category, {
      limit: RELATED_PRODUCT_COUNT + 1,
    });

    return response.products
      .filter((product) => String(product.id) !== excludeId)
      .slice(0, RELATED_PRODUCT_COUNT)
      .map(toHomeProduct);
  } catch {
    return [];
  }
}

export default async function ProductPage({ params }: ProductPageProps) {
  const { id } = await params;
  const product = await fetchProductById(id);

  if (!product) {
    notFound();
  }

  const detail = toProductDetail(product);
  const relatedProducts = await getRelatedProducts(detail.category, detail.id);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-5 pb-16">
        <p className="mb-3 text-xs text-ink-subtle">
          Home / {detail.category} /{' '}
          <span className="text-ink">{detail.title}</span>
        </p>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <ProductGallery
            images={detail.images}
            imageAlt={detail.imageAlt}
            tone={detail.tone}
          />
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl font-bold text-pretty">{detail.title}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
                <span>{detail.ratingLine}</span>
                <span>{detail.reviewCountLine}</span>
              </div>
            </div>
            <ProductPriceBox
              productId={detail.id}
              title={detail.title}
              imageUrl={detail.images[0]}
              imageAlt={detail.imageAlt}
              tone={detail.tone}
              price={detail.price}
              oldPrice={detail.oldPrice}
              inStock={detail.inStock}
              stockLine={detail.stockLine}
            />
            <ProductFulfillmentCard
              shipLine={detail.shipLine}
              returnPolicy={detail.returnPolicy}
              warranty={detail.warranty}
            />
            <p className="text-sm text-ink-muted text-pretty">
              {detail.description}
            </p>
          </div>
        </div>
        <ProductReviews reviews={detail.reviews} />
        <RelatedProducts products={relatedProducts} />
      </main>
      <SiteFooter />
    </div>
  );
}

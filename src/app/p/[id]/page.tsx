import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import ProductGallery from '@/components/product/ProductGallery';
import ProductPriceBox from '@/components/product/ProductPriceBox';
import RelatedProducts from '@/components/product/RelatedProducts';
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
 * The storefront API call (missing/invalid token, unreachable backend) and a
 * genuine "no such product" both surface as "no detail available" here —
 * there's no site-wide error boundary yet to tell them apart (tracked gap,
 * see hot.md). Both currently resolve to notFound().
 */
async function getProductDetail(
  id: string,
): Promise<ProductDetail | undefined> {
  try {
    const product = await fetchProductBySlug(id);

    return product ? toProductDetail(product) : undefined;
  } catch {
    return undefined;
  }
}

export async function generateMetadata({
  params,
}: ProductPageProps): Promise<Metadata> {
  const { id } = await params;
  const detail = await getProductDetail(id);

  if (!detail) {
    return { title: `Product not found — ${SITE_NAME}` };
  }

  const title = `${detail.title} — ${SITE_NAME}`;
  const description = truncateForMetaDescription(
    `${detail.title} — ${detail.ratingLine}. ${detail.shipLine}.`,
  );
  const siteUrl = getSiteUrl();

  return {
    title,
    description,
    robots: { index: true, follow: true },
    openGraph: {
      type: 'website',
      title,
      description,
      siteName: SITE_NAME,
      ...(detail.imageUrl ? { images: [detail.imageUrl] } : {}),
    },
    twitter: {
      card: detail.imageUrl ? 'summary_large_image' : 'summary',
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
            images={detail.imageUrl ? [detail.imageUrl] : []}
            imageAlt={detail.imageAlt}
            tone={detail.tone}
          />
          <div className="flex flex-col gap-4">
            <div>
              <h1 className="text-xl font-bold text-pretty">{detail.title}</h1>
              <div className="mt-1 flex items-center gap-2 text-sm text-ink-muted">
                <span>{detail.ratingLine}</span>
              </div>
            </div>
            <ProductPriceBox
              productId={detail.id}
              title={detail.title}
              imageUrl={detail.imageUrl}
              imageAlt={detail.imageAlt}
              tone={detail.tone}
              price={detail.price}
              oldPrice={detail.oldPrice}
              shipLine={detail.shipLine}
            />
          </div>
        </div>
        <RelatedProducts products={relatedProducts} />
      </main>
      <SiteFooter />
    </div>
  );
}

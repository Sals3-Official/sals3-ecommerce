import { cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import ProductBreadcrumb from '@/components/product/ProductBreadcrumb';
import ProductDescription from '@/components/product/ProductDescription';
import ProductGallery from '@/components/product/ProductGallery';
import ProductRecordPanel from '@/components/product/ProductRecordPanel';
import ProductSpecsTable from '@/components/product/ProductSpecsTable';
import RelatedProducts from '@/components/product/RelatedProducts';
import BreadcrumbSchema from '@/components/schema/BreadcrumbSchema';
import ProductSchema from '@/components/schema/ProductSchema';
import KlaviyoViewedProduct from '@/components/klaviyo/KlaviyoViewedProduct';
import { SITE_NAME, getSiteUrl } from '@/lib/site';
import type { Product as HomeProduct } from '@/lib/home-placeholder-data';
import type { ProductDetail } from '@/lib/product-detail';
import { breadcrumbTrail } from '@/lib/product-breadcrumb';
import { defaultVariantFor, variantById } from '@/lib/product-variants';
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
  /**
   * Optional so a unit test can render the page without one. Next always passes
   * it in the app; treating its absence as "no variant chosen" is the same branch
   * as an unrecognised value, which already has to be handled.
   */
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function truncateForMetaDescription(text: string): string {
  if (text.length <= META_DESCRIPTION_MAX_LENGTH) {
    return text;
  }

  return `${text.slice(0, META_DESCRIPTION_MAX_LENGTH - 1).trimEnd()}…`;
}

/** First value only — `?variant=a&variant=b` is not a selection. */
function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
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

/**
 * The canonical stays the bare product URL, deliberately, even though
 * `?variant=` is now a real address.
 *
 * A variant URL is a **UI state** on one product page, not a separate document:
 * ten near-identical pages competing for the same query would dilute the product
 * rather than rank it, and the price the feed reports is the product's floor —
 * which is what the bare URL renders. If Sals3 later exports one Merchant offer
 * per variant, each needs its own indexable landing page, and this is the line to
 * revisit: make the canonical variant-aware and emit a single `Offer` alongside
 * it. Until that decision is taken, self-consolidating is the conservative
 * choice, and moving to per-variant canonicals later is purely additive.
 */
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

/**
 * The citation-first lead the GEO/AEO strategy note asks for: a self-contained
 * opening paragraph an answer engine can quote.
 *
 * Taken from the description's first paragraph and **nothing else**. It is absent
 * for every product today, because no seller has written a description — the
 * portal's only producer is a plain textarea and CJ's own HTML is never
 * imported. Assembling something from the title instead would put fabricated
 * prose in the slot most likely to be quoted as fact.
 *
 * Only the **first** block qualifies, and only if it is a paragraph. A lead has
 * to be the opening of the copy to read as one, and restricting it to block zero
 * is what lets the description below render `blocks.slice(1)` — so the paragraph
 * appears once on the page rather than twice. Duplicating it would be worse than
 * not having it: a crawler reading the same sentence in two places gets a weaker
 * signal, not a stronger one.
 */
function answerSummary(detail: ProductDetail): string | undefined {
  const first = (detail.description ?? [])[0];

  return first?.type === 'paragraph' ? first.text : undefined;
}

export default async function ProductPage({
  params,
  searchParams,
}: ProductPageProps) {
  const { id } = await params;
  const detail = await getProductDetail(id);

  if (!detail) {
    notFound();
  }

  const query = searchParams === undefined ? {} : await searchParams;
  const relatedProducts = await getRelatedProducts(detail.category, detail.id);
  const variants = detail.variants ?? [];
  const hasOptionAxes = (detail.options ?? []).length > 0;

  // Resolved against real ids, so the payload is the allow-list. An unknown
  // value falls back rather than 404s: a stale or hand-edited link is a normal
  // way to arrive at a crawlable URL.
  const fromUrl = variantById(variants, firstParam(query.variant));
  // With real named axes nothing is preselected — the buyer chooses deliberately,
  // and "From {floor}" with purchase disabled is rendered until they do. Without
  // axes there is nothing to choose, so the honest default is preselected and the
  // page is immediately buyable.
  const selectedVariant =
    fromUrl ??
    (hasOptionAxes ? undefined : defaultVariantFor(variants, detail.price));
  const trail = breadcrumbTrail(detail);
  const summary = answerSummary(detail);
  // The lead is promoted out of the description so it renders once, not twice.
  const remainingBlocks =
    summary === undefined ? detail.description : detail.description?.slice(1);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-5 pb-16">
        <ProductBreadcrumb trail={trail} />
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
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-[-0.02em] text-ink text-pretty md:text-[28px]">
                {detail.title}
              </h1>
              {summary === undefined ? null : (
                <p className="mt-2 text-sm leading-relaxed text-ink-muted text-pretty">
                  {summary}
                </p>
              )}
            </div>
            {/*
              One panel for every product. The axes and no-axes paths used to be
              two different compositions — a client purchase panel with its own
              price state, or the server price box — which meant a change to one
              silently missed the other, and the client one repainted the price
              after paint (ADR-016). Both now resolve selection from the URL and
              render on the server.
            */}
            <ProductRecordPanel
              detail={detail}
              selectedVariant={selectedVariant}
              selectedFromUrl={fromUrl !== undefined}
            />
          </div>
        </div>
        <ProductDescription blocks={remainingBlocks} />
        <ProductSpecsTable specs={detail.specs} />
        <RelatedProducts products={relatedProducts} />
        <ProductSchema detail={detail} />
        <BreadcrumbSchema trail={trail} productPath={`/p/${detail.id}`} />
      </main>
      <SiteFooter />
    </div>
  );
}

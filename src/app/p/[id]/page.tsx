import { cache } from 'react';
import type { Metadata } from 'next';
import { unstable_cache as unstableCache } from 'next/cache';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import ProductBreadcrumb from '@/components/product/ProductBreadcrumb';
import ProductDescription from '@/components/product/ProductDescription';
import ProductReviews from '@/components/product/ProductReviews';
import ProductGallery from '@/components/product/ProductGallery';
import ProductRecordPanel from '@/components/product/ProductRecordPanel';
import ProductSpecifications from '@/components/product/ProductSpecifications';
import ProductSupplierDetails from '@/components/product/ProductSupplierDetails';
import RelatedProducts from '@/components/product/RelatedProducts';
import BreadcrumbSchema from '@/components/schema/BreadcrumbSchema';
import ProductSchema from '@/components/schema/ProductSchema';
import KlaviyoViewedProduct from '@/components/klaviyo/KlaviyoViewedProduct';
import { SITE_NAME, getSiteUrl } from '@/lib/site';
import type { Product as HomeProduct } from '@/lib/home-placeholder-data';
import type { ProductDetail } from '@/lib/product-detail';
import { breadcrumbTrail } from '@/lib/product-breadcrumb';
import { fetchProductReviews } from '@/services/storefront/reviews';
import { defaultVariantFor, variantById } from '@/lib/product-variants';
import {
  fetchProductBySlug,
  fetchProductsByCategory,
  toHomeProduct,
  toProductDetail,
} from '@/services/products';
import destinationToIndicativeCurrency from '@/lib/fx/destination-currency';
import { resolveDestination } from '@/lib/destination/resolve';
import { fetchIndicativeRate } from '@/lib/fx/rates';
import fetchFxBuffer from '@/lib/fx/buffer';

const RELATED_PRODUCT_COUNT = 6;

/**
 * The approximate local price beside the USD one, for the destination the buyer
 * is shopping to rather than for a market's own currency.
 *
 * `null` covers three different absences on purpose — no currency we can source
 * a rate for, a rate that failed, and a rate we recently failed to fetch — and
 * the panel renders nothing for all three. A figure is either sourced from a
 * named central bank or it is not shown.
 */
async function indicativeRateFor() {
  const destination = await resolveDestination();
  const currency = destinationToIndicativeCurrency(destination.code);

  if (currency === undefined) return { rate: null, bufferPercent: null };

  // Resolved together because they are rendered together: a rate without the
  // buffer shows nothing, so fetching one without the other buys no page.
  const [rate, bufferPercent] = await Promise.all([
    fetchIndicativeRate(currency),
    fetchFxBuffer(),
  ]);

  return { rate, bufferPercent };
}
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
  /*
    The seller's own meta description wins when they wrote one. It is the only
    description on this page written *for* a search result rather than for a
    buyer reading the product, and the editor has a dedicated field with its own
    guidance and preview for exactly that.

    Then the assembled fallback, built from what exists: the category name when
    the product is mapped, then the title. Never a rating or a delivery claim.

    The **visible** description is deliberately not in this chain. Two different
    pieces of writing for two different audiences: substituting body copy for a
    meta description silently republishes the seller's first paragraph as their
    search snippet, and truncating prose mid-sentence at 155 characters is how a
    result reads as machine-generated.
  */
  const description = truncateForMetaDescription(
    detail.metaDescription ??
      (detail.categoryName === undefined
        ? detail.title
        : `${detail.title} — ${detail.categoryName} at ${SITE_NAME}.`),
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
    /*
      Self-referential, and there is one address to refer to since the markets
      were removed. Omitted entirely when `NEXT_PUBLIC_SITE_URL` is unset — a
      canonical is never guessed.
    */
    ...(siteUrl
      ? { alternates: { canonical: `${siteUrl}/p/${detail.id}` } }
      : {}),
  };
}

const getCachedRelatedProducts = unstableCache(
  async (
    category: string,
    excludeId: string,
    limit: number,
  ): Promise<HomeProduct[]> => {
    const products = await fetchProductsByCategory(category, {
      limit: limit + 1,
    });

    return products
      .filter((product) => product.slug !== excludeId)
      .slice(0, limit)
      .map(toHomeProduct);
  },
  ['pdp-related-products'],
  { revalidate: 30, tags: ['pdp-related-products'] },
);

/**
 * Related products are best-effort and deliberately short-cached: the main PDP
 * product stays live, while this non-critical rail stops re-scanning the
 * storefront lists on every variant URL.
 */
export async function getRelatedProducts(
  category: string,
  excludeId: string,
): Promise<HomeProduct[]> {
  try {
    return await getCachedRelatedProducts(
      category,
      excludeId,
      RELATED_PRODUCT_COUNT,
    );
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
  // Fetched alongside the related products rather than before them: the
  // section is below the fold, and a slow review read must not delay the buy
  // box. `fetchProductReviews` answers `[]` on failure, so the page still
  // renders its summary from the product payload if this cannot load.
  // The indicative rate and its buffer join the same wave, and are fetched
  // **here only** — one call each per page render, handed down to the panel as
  // props. Both are cached for an hour by their own modules, so this costs an
  // upstream request on a small fraction of renders, and each resolves to
  // `null` on every failure rather than throwing into this `Promise.all`.
  const [relatedProducts, reviews, indicative] = await Promise.all([
    getRelatedProducts(detail.category, detail.id),
    fetchProductReviews(detail.id),
    indicativeRateFor(),
  ]);
  const variants = detail.variants ?? [];

  // Resolved against real ids, so the payload is the allow-list. An unknown
  // value falls back rather than 404s: a stale or hand-edited link is a normal
  // way to arrive at a crawlable URL.
  const fromUrl = variantById(variants, firstParam(query.variant));
  // Every product lands preselected, axes or not: `defaultVariantFor` picks an
  // available variant priced at the product's own displayed price, so the buy
  // buttons are live on arrival instead of greyed out behind a choice the buyer
  // has not been asked for yet. The chips render that combination as chosen, so
  // the selection is visible rather than implied — and any chip click replaces
  // it. Preselecting cannot move the lead price off the feed price (ADR-016)
  // because the base-price match is what the default prefers.
  const selectedVariant = fromUrl ?? defaultVariantFor(variants, detail.price);
  const trail = breadcrumbTrail(detail);
  const summary = answerSummary(detail);
  // The lead is promoted out of the description so it renders once, not twice.
  const remainingBlocks =
    summary === undefined ? detail.description : detail.description?.slice(1);

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      {/*
        `main` carries no width of its own any more, and each region owns its
        container instead. That is what lets Product specifications run a white
        band edge to edge while everything else stays on the 1152px measure —
        the page's one rhythm break, and its second background colour. Two
        total: a third stops reading as structure and starts reading as
        decoration.
      */}
      <main className="w-full pb-16">
        <div className="mx-auto w-full max-w-6xl px-6 pt-5">
          <ProductBreadcrumb trail={trail} />
          <div className="grid grid-cols-1 items-start gap-9 md:grid-cols-2">
            <KlaviyoViewedProduct
              productId={detail.id}
              title={detail.title}
              imageUrl={detail.imageUrl}
              unitPrice={detail.price}
              category={detail.category}
            />
            <ProductGallery
              images={detail.images}
              tone={detail.tone}
              variants={detail.variants}
              selectedVariantId={selectedVariant?.id}
            />
            {/*
              Neither column sticks. Owner's call, 2026-08-21, after seeing it
              on production twice.

              The v3.1 build spec does ask for a "sticky record panel", and it
              was built that way. What it looks like in practice is the defect
              that got reported: the panel is 679px inside a 778px grid row, so
              it pins for ~95px and then travels with the page — and while it is
              pinned, it drifts downward relative to the gallery beside it.
              "Binababa neto ang nasa red box" is that drift, and it reads as
              the buy box coming loose rather than as a panel staying in reach.

              Do not restore this without a design decision that addresses the
              drift, not just the pinning: the sticky range is bounded by the
              gallery's height, so any version of it inside this grid row has
              the same ~95px of travel. Making it genuinely useful would mean
              extending the sticky container past the grid, which is a different
              layout, not a class.
            */}
            <div className="flex flex-col gap-3.5">
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
                indicativeRate={indicative.rate}
                fxBufferPercent={indicative.bufferPercent}
              />
            </div>
          </div>
        </div>
        {/*
          ## Why specifications come before the description

          Specifications exist on every categorised product — the workbook
          defines an attribute set for all 5,595 categories, and the editor
          blocks publication on the required ones. A written description exists
          on almost none: the portal's only producer is a seller typing into a
          textarea, and CJ's own HTML is deliberately never imported.

          So the always-present section must not sit behind the usually-absent
          one. With the old order, the first thing below the fold on a typical
          product was nothing at all.
        */}
        <ProductSpecifications
          specification={detail.specification}
          specs={detail.specs}
        />
        <div className="mx-auto w-full max-w-6xl px-6">
          <ProductDescription blocks={remainingBlocks} />
          <ProductReviews
            rating={detail.rating}
            breakdown={detail.ratingBreakdown}
            reviews={reviews}
          />
          <ProductSupplierDetails specs={detail.specs} />
          <RelatedProducts products={relatedProducts} />
          <ProductSchema detail={detail} />
          <BreadcrumbSchema trail={trail} productPath={`/p/${detail.id}`} />
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

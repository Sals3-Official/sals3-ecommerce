import { Suspense, cache } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import ProductBreadcrumb from '@/components/product/ProductBreadcrumb';
import ProductDescription from '@/components/product/ProductDescription';
import ProductReviews from '@/components/product/ProductReviews';
import ProductGallery from '@/components/product/ProductGallery';
import ProductRecordPanel from '@/components/product/ProductRecordPanel';
import ProductSpecifications from '@/components/product/ProductSpecifications';
import { SelectedSkuProvider } from '@/components/product/selected-sku';
import RelatedProductsSection, {
  RelatedProductsSectionSkeleton,
} from '@/components/product/RelatedProductsSection';
import BreadcrumbSchema from '@/components/schema/BreadcrumbSchema';
import ProductSchema from '@/components/schema/ProductSchema';
import KlaviyoViewedProduct from '@/components/klaviyo/KlaviyoViewedProduct';
import { SITE_NAME, getSiteUrl } from '@/lib/site';
import type { ProductDetail } from '@/lib/product-detail';
import { breadcrumbTrail } from '@/lib/product-breadcrumb';
import { fetchProductReviews } from '@/services/storefront/reviews';
import { variantById } from '@/lib/product-variants';
import { fetchProductBySlug, toProductDetail } from '@/services/products';
import { resolveDestination } from '@/lib/destination/resolve';
import destinationToCheckoutCountry from '@/lib/destination/destination-checkout-country';
import fetchFreeShippingThresholds, {
  EMPTY_FREE_SHIPPING_THRESHOLDS,
} from '@/lib/fx/free-shipping-thresholds';

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
 * two identical requests to the portal. It still earns its place now that the
 * read is cached across requests — this is the per-request half, and it is what
 * keeps a cold cache from costing two round trips instead of one.
 *
 * `readFor: 'page'` is what lets that read be cached at all. It is deliberately
 * opt-in and named for the caller rather than the endpoint: the same function
 * serves `validateCheckoutCart`, where a cached price would be charged.
 *
 * Failures are **not** swallowed. `undefined` means the product genuinely does
 * not exist (invalid slug shape, or a 404) and becomes `notFound()`. Anything
 * else propagates to `error.tsx`. The previous version caught everything and
 * called `notFound()`, which made an unreachable catalogue indistinguishable
 * from a deleted product.
 */
const getProductDetail = cache(
  async (id: string): Promise<ProductDetail | undefined> => {
    const product = await fetchProductBySlug(id, { readFor: 'page' });

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
  /*
    `resolveDestination()` reads only the request's own cookies and headers —
    no network wait — so awaiting it first costs nothing and the checkout
    country it resolves to decides whether the threshold read below is worth
    starting at all.
  */
  const destination = await resolveDestination();
  const checkoutCountry = destinationToCheckoutCountry(destination.code);
  /*
    Run beside the product read rather than after it: this is an estimate for
    a card the buyer has not reached yet, and the page's own history here is
    exactly why nothing optional joins the serial chain — see the note below
    on the 1,682ms measured on production 2026-09-01.
  */
  const [detail, freeShippingThresholds] = await Promise.all([
    getProductDetail(id),
    checkoutCountry === undefined
      ? Promise.resolve(EMPTY_FREE_SHIPPING_THRESHOLDS)
      : fetchFreeShippingThresholds(),
  ]);

  if (!detail) {
    notFound();
  }

  const freeShippingThresholdAmountMinor =
    checkoutCountry === undefined
      ? undefined
      : freeShippingThresholds[checkoutCountry];
  const freeShippingDestinationLabel =
    freeShippingThresholdAmountMinor === undefined
      ? undefined
      : (destination.proseLabel ?? destination.label);

  const query = searchParams === undefined ? {} : await searchParams;
  /*
    Related products no longer join this wait — see `StreamedRelatedProducts`
    below. On a cold `pdp-related-products` cache that read is up to four
    *serial* Portal round trips (two sections × two pages, serialised on purpose
    in `collectAllProducts`), and holding the buy box behind them was the largest
    single contributor to the 1,682ms measured on production 2026-09-01.

    Reviews stay awaited here, deliberately: `ProductRecordPanel` takes
    `reviewsAnchored`, so the buy box genuinely cannot render until this
    resolves. It is one call, and `fetchProductReviews` answers `[]` on failure,
    so the page still renders its summary from the product payload if it cannot
    load. Streaming it too would mean removing that prop, which changes what the
    panel shows rather than when it shows — a separate decision.
  */
  const reviews = await fetchProductReviews(detail.id);
  const variants = detail.variants ?? [];

  // Resolved against real ids, so the payload is the allow-list. An unknown
  // value falls back rather than 404s: a stale or hand-edited link is a normal
  // way to arrive at a crawlable URL.
  const fromUrl = variantById(variants, firstParam(query.variant));
  /*
    Nothing is chosen on the buyer's behalf. This reverses the 2026-08-21 owner
    decision that had `defaultVariantFor` preselect on every product so the buy
    buttons were live on arrival; the owner asked for the deliberate first choice
    back on 2026-08-31, and it is that choice — not a default — that now decides
    what goes in the cart.

    The one product that still arrives resolved is the one with a single variant:
    there is no choice to make, so demanding one would be a gate in front of a
    door with nothing behind it. A product with no variants at all stays
    `undefined` and buys against its own price, exactly as before.

    ADR-016's constraint — that preselecting must not move the lead price off the
    feed price — stops applying here, because nothing is preselected. The lead
    price is the feed price and says "From" until the buyer narrows it.
  */
  const selectedVariant =
    fromUrl ?? (variants.length === 1 ? variants[0] : undefined);
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
      {/*
        The provider spans the buy panel and the specifications band, which is
        the whole reason it is here rather than inside either: the panel owns
        the option selection, and the band prints the SKU that selection names.
        Server children pass through untouched — only the two client components
        that opt in read it.
      */}
      <SelectedSkuProvider initialSku={selectedVariant?.sku}>
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
                  reviewsAnchored={reviews.length > 0}
                  freeShippingThresholdAmountMinor={
                    freeShippingThresholdAmountMinor
                  }
                  freeShippingDestinationLabel={freeShippingDestinationLabel}
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
            /*
              The product's own code first, the resolved variant's ahead of it.

              `specs.sku` before `variants[0]` on purpose: with nothing chosen,
              the honest code is the one belonging to the whole product — the
              same value this page publishes as `Product.sku` in its JSON-LD —
              not whichever variant happens to sort first. `variants[0]` is the
              last resort for a payload carrying no product-level code at all.
            */
            sals3Sku={
              selectedVariant?.sku ?? detail.specs?.sku ?? variants[0]?.sku
            }
          />

          <div className="mx-auto w-full max-w-6xl px-6">
            <ProductDescription blocks={remainingBlocks} />
            <ProductReviews
              rating={detail.rating}
              breakdown={detail.ratingBreakdown}
              reviews={reviews}
            />
            <Suspense fallback={<RelatedProductsSectionSkeleton />}>
              <RelatedProductsSection
                category={detail.category}
                excludeId={detail.id}
              />
            </Suspense>
            <ProductSchema detail={detail} />
            <BreadcrumbSchema trail={trail} productPath={`/p/${detail.id}`} />
          </div>
        </main>
      </SelectedSkuProvider>
      <SiteFooter />
    </div>
  );
}

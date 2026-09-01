import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/home-placeholder-data';
import { formatMoney } from '@/lib/money';
import StarRating from '@/components/product/StarRating';
import LinkPendingVeil from '@/components/ui/LinkPendingVeil';
import ProductImagePlaceholder from '@/components/ui/ProductImagePlaceholder';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  // No comparison price and no percent-off badge on the card. Sals3 publishes
  // no evidence-backed `oldPrice` (ADR-003), and one must never be derived from
  // the current price, so `product.oldPrice` is deliberately read by nothing.

  return (
    <Link
      href={`/p/${product.id}`}
      prefetch={false}
      className="relative flex flex-col overflow-hidden rounded-xl border border-border bg-white transition hover:-translate-y-1 hover:border-brand-600 hover:no-underline hover:shadow-[0_16px_34px_rgba(11,44,77,0.15)]"
    >
      {/*
        `relative` above exists only to anchor this. The veil marks the pressed
        card while the product page loads — the route skeleton says a page is
        coming, this says which card it belongs to. It renders nothing when idle.
      */}
      <LinkPendingVeil />
      {product.imageUrl ? (
        <div className="relative aspect-square bg-white">
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.title}
            fill
            sizes="(min-width: 1024px) 224px, (min-width: 640px) 33vw, 50vw"
            className="object-contain p-3"
          />
        </div>
      ) : (
        <ProductImagePlaceholder tone={product.tone} />
      )}
      <div className="flex flex-col gap-1 p-2.5 pb-3">
        <div className="font-display text-[22px] font-semibold tracking-tight text-ink">
          {formatMoney(product.price)}
        </div>
        <p className="line-clamp-2 min-h-[33px] text-xs text-ink-muted text-pretty">
          {product.title}
        </p>
        {/*
          One evidence line carrying whatever is actually known: the rating, the
          units sold, or both — and, when nobody has reviewed the product yet, an
          invitation to be the first.

          The invitation is a reframe, not a claim. "No reviews yet" states a
          deficit and asks the shopper for nothing; "be the first to review" is
          the same fact offered as an opening, and it leans on the one thing that
          is reliably true about going first — that somebody has to. It is
          deliberately quiet: no urgency, no count of people looking, no
          scarcity. An unreviewed product is new, not bad.

          It stays a line of TEXT, never a button. The whole card is already a
          link to the product page, which is where a shopper can act — and a
          control labelled "review" that did anything other than take them to a
          review would be saying one thing and doing another. It cannot even be
          honoured immediately: reviewing is gated on the parcel being delivered,
          which is weeks away on this catalogue.

          The star beside it is hollow and must stay hollow. Filling it would
          draw a rating that does not exist.

          "0 sold" is still never printed — an absent `soldUnits` renders
          nothing, because on a young catalogue a wall of zeroes reads as nobody
          buying.
        */}
        <div className="flex items-center gap-1.5">
          {product.rating === undefined ? null : (
            <>
              <StarRating
                rating={Math.round(product.rating.average)}
                size="sm"
                label={`${product.rating.average.toFixed(1)} out of 5`}
              />
              <span className="text-[11px] text-ink-subtle tabular-nums">
                {product.rating.average.toFixed(1)} ({product.rating.count})
              </span>
            </>
          )}
          {product.rating !== undefined && product.soldUnits !== undefined ? (
            <span
              aria-hidden="true"
              className="size-[3px] shrink-0 rounded-full bg-border-strong"
            />
          ) : null}
          {product.soldUnits === undefined ? null : (
            <span className="text-[11px] text-ink-subtle tabular-nums">
              {product.soldUnits.toLocaleString('en-US')} sold
            </span>
          )}
          {product.rating !== undefined ? null : (
            <>
              {product.soldUnits === undefined ? null : (
                <span
                  aria-hidden="true"
                  className="size-[3px] shrink-0 rounded-full bg-border-strong"
                />
              )}
              <svg
                viewBox="0 0 24 24"
                aria-hidden="true"
                className="size-3 shrink-0 text-brand-600"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              >
                <path d="M12 2.6l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5-5.8-3.1-5.8 3.1 1.1-6.5L2.6 9.4l6.5-.9z" />
              </svg>
              <span className="text-[11px] font-medium text-brand-600">
                Be the first to review
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/home-placeholder-data';
import { formatMoney } from '@/lib/money';
import StarRating from '@/components/product/StarRating';
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
      className="flex flex-col overflow-hidden rounded-xl border border-border bg-white transition hover:-translate-y-1 hover:border-brand-600 hover:no-underline hover:shadow-[0_16px_34px_rgba(11,44,77,0.15)]"
    >
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
          units sold, or both. Each half is rendered only when it is real, and
          the whole row is absent otherwise rather than reserving space, showing
          nought stars, or printing "0 sold". An unreviewed product is new, not
          bad, and a card that announced two zeroes would say the opposite of
          that all over the home page.
        */}
        {product.rating === undefined &&
        product.soldUnits === undefined ? null : (
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
          </div>
        )}
      </div>
    </Link>
  );
}

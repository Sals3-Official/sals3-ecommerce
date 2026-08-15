import Image from 'next/image';
import Link from 'next/link';
import type { Product } from '@/lib/home-placeholder-data';
import { formatMoney, percentOff } from '@/lib/money';
import ProductImagePlaceholder from '@/components/ui/ProductImagePlaceholder';

type ProductCardProps = {
  product: Product;
};

export default function ProductCard({ product }: ProductCardProps) {
  // `oldPrice` is absent unless a genuine, evidence-backed comparison price
  // exists, so the strikethrough and the badge are absent with it. Sals3
  // publishes none today (ADR-003), and this must never be derived from the
  // current price.
  const { oldPrice } = product;
  const off =
    oldPrice !== undefined && oldPrice.amountMinor > product.price.amountMinor
      ? percentOff(oldPrice.amountMinor, product.price.amountMinor)
      : null;

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
        <div className="flex min-h-[16px] items-center gap-1.5">
          {off === null || oldPrice === undefined ? null : (
            <>
              <span className="text-xs text-ink-faint line-through">
                {formatMoney(oldPrice)}
              </span>
              <span className="text-xs font-bold text-deal">{off}</span>
            </>
          )}
        </div>
        <p className="line-clamp-2 min-h-[33px] text-xs text-ink-muted text-pretty">
          {product.title}
        </p>
        <div className="text-xs text-ink-subtle">{product.ratingLine}</div>
        <div className="text-xs text-ink-muted">{product.shipLine}</div>
      </div>
    </Link>
  );
}

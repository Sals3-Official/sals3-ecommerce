import Link from 'next/link';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import { formatMoney, type Money } from '@/lib/money';
import ProductCardImage from '@/components/catalog/ProductCardImage';

/**
 * Decoupled from `src/components/home/ProductCard.tsx` on purpose: the live
 * catalogue feed (`src/services/products.ts`) has no Brand/Material/Fit
 * attributes yet, only a single pre-formatted CJ title string, so this
 * component has nothing real to consume today. It exists as a
 * spec-compliant, independently reviewable unit for Stage 2's structured
 * product entity — do not route real traffic to it before that entity
 * exists (see docs/Wiki/wiki/sals3-ux-build-specification.md §4, §11.2,
 * §11.4).
 */
export type CatalogProductCardProduct = {
  id: string;
  cardTitle: string;
  price: Money;
  oldPrice?: Money;
  rating: number;
  reviewCount: number;
  shipLine: string;
  tone: PlaceholderTone;
  imageUrl?: string;
  imageAlt: string;
};

type ProductCardProps = {
  product: CatalogProductCardProduct;
};

export default function ProductCard({ product }: ProductCardProps) {
  return (
    <Link
      href={`/p/${product.id}`}
      prefetch={false}
      className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-white transition hover:-translate-y-1 hover:border-brand-600 hover:no-underline hover:shadow-[0_16px_34px_rgba(11,44,77,0.15)] active:scale-[0.98]"
    >
      <ProductCardImage
        imageUrl={product.imageUrl}
        imageAlt={product.imageAlt}
        tone={product.tone}
      />
      <div className="flex flex-col gap-1 p-2.5 pb-3">
        {/* Price: heaviest, largest text on the card — nothing here outweighs it (spec §4.2, §11.2). */}
        <div className="font-display text-[22px] font-semibold tracking-tight text-ink">
          {formatMoney(product.price)}
        </div>
        {/* Title: regular weight, quiet neutral, 2-line clamp (spec §11.2, §11.4: 4.5:1 contrast minimum, never bold). */}
        <p className="line-clamp-2 min-h-[33px] font-normal leading-snug text-ink-muted text-pretty">
          {product.cardTitle}
        </p>
        <div className="text-xs text-ink-subtle">
          {`★ ${product.rating.toFixed(1)} (${product.reviewCount})`}
        </div>
        <div className="text-xs text-ink-muted">{product.shipLine}</div>
      </div>
    </Link>
  );
}

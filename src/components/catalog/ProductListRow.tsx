import Image from 'next/image';
import Link from 'next/link';
import { formatMoney } from '@/lib/money';
import { AVAILABILITY_LABELS } from '@/lib/catalog/availability';
import type { CategoryProduct } from '@/lib/catalog/filter-products';
import ProductImagePlaceholder from '@/components/ui/ProductImagePlaceholder';

type ProductListRowProps = { product: CategoryProduct };

/**
 * The list-view row. A new component rather than a `ProductCard` variant:
 * the layout is horizontal, and it shows one real field the grid card does
 * not — availability — so it is not a drop-in replacement for it.
 */
export default function ProductListRow({ product }: ProductListRowProps) {
  return (
    <Link
      href={`/p/${product.id}`}
      prefetch={false}
      className="grid grid-cols-[88px_minmax(0,1fr)_auto] items-center gap-3 overflow-hidden rounded-xl border border-border bg-white p-3 transition hover:border-brand-600 hover:no-underline sm:gap-4"
    >
      <div className="relative aspect-square overflow-hidden rounded-lg bg-white">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.imageAlt ?? product.title}
            fill
            sizes="88px"
            className="object-contain p-1.5"
          />
        ) : (
          <ProductImagePlaceholder tone={product.tone} className="rounded-lg" />
        )}
      </div>
      <span className="flex min-w-0 flex-col gap-1">
        <span className="line-clamp-2 text-sm leading-[1.35] text-ink text-pretty">
          {product.title}
        </span>
        <span className="text-xs text-ink-subtle">
          {AVAILABILITY_LABELS[product.availability]}
        </span>
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-ink sm:text-[22px]">
        {formatMoney(product.price)}
      </span>
    </Link>
  );
}

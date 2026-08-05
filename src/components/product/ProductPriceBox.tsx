import type { Money } from '@/lib/money';
import { formatMoney, percentOff } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import ProductAddToCartButtons from '@/components/product/ProductAddToCartButtons';

type ProductPriceBoxProps = {
  productId: string;
  title: string;
  imageUrl?: string;
  imageAlt: string;
  tone: PlaceholderTone;
  price: Money;
  oldPrice: Money;
  inStock: boolean;
  stockLine: string;
};

export default function ProductPriceBox({
  productId,
  title,
  imageUrl,
  imageAlt,
  tone,
  price,
  oldPrice,
  inStock,
  stockLine,
}: ProductPriceBoxProps) {
  const off = percentOff(oldPrice.amountMinor, price.amountMinor);
  const hasDiscount = oldPrice.amountMinor > price.amountMinor;

  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <div className="flex items-baseline gap-2.5">
        <span className="font-display text-3xl font-semibold tracking-tight text-ink">
          {formatMoney(price)}
        </span>
        {hasDiscount ? (
          <>
            <span className="text-sm text-ink-faint line-through">
              {formatMoney(oldPrice)}
            </span>
            <span className="text-sm font-bold text-deal">{off}</span>
          </>
        ) : null}
      </div>
      <p className={`mt-1 text-sm ${inStock ? 'text-ink-muted' : 'text-deal'}`}>
        {stockLine}
      </p>
      <div className="mt-4">
        <ProductAddToCartButtons
          productId={productId}
          title={title}
          imageUrl={imageUrl}
          imageAlt={imageAlt}
          tone={tone}
          unitPrice={price}
          inStock={inStock}
        />
      </div>
    </div>
  );
}

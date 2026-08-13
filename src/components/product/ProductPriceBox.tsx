import type { Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';
import ProductAddToCartButtons from '@/components/product/ProductAddToCartButtons';
import ProductPriceDisplay from '@/components/product/ProductPriceDisplay';

type ProductPriceBoxProps = {
  productId: string;
  title: string;
  category: string;
  imageUrl?: string;
  imageAlt: string;
  tone: PlaceholderTone;
  price: Money;
  oldPrice?: Money;
  /** Absent once the portal stops sending the deprecated non-claim. */
  shipLine?: string;
};

/**
 * The price and purchase box for a product with **no option axes** — one
 * implicit variant, nothing to choose, no client state.
 *
 * A product with several variants gets `ProductPurchasePanel` instead, which is
 * a client component. Keeping the single-variant case here means the PDP ships
 * no extra client JavaScript for the current catalogue, where no product has
 * variants yet.
 */
export default function ProductPriceBox({
  productId,
  title,
  category,
  imageUrl,
  imageAlt,
  tone,
  price,
  oldPrice,
  shipLine,
}: ProductPriceBoxProps) {
  return (
    <div className="rounded-xl border border-border bg-white p-4">
      <ProductPriceDisplay price={price} oldPrice={oldPrice} />
      {shipLine === undefined ? null : (
        <p className="mt-1 text-sm text-ink-muted">{shipLine}</p>
      )}
      <div className="mt-4">
        <ProductAddToCartButtons
          productId={productId}
          title={title}
          category={category}
          imageUrl={imageUrl}
          imageAlt={imageAlt}
          tone={tone}
          unitPrice={price}
        />
      </div>
    </div>
  );
}

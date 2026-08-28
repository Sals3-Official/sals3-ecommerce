import { formatMoney } from '@/lib/money';
import type { CheckoutFreightQuoteResponse } from '@/services/storefront/schemas';

type FreeShippingProgress = NonNullable<
  CheckoutFreightQuoteResponse['freeShipping']
>;

export default function CheckoutFreeShippingProgress({
  progress,
}: {
  progress: FreeShippingProgress;
}) {
  const percent = Math.min(
    100,
    Math.round(
      (progress.subtotalAmountMinor / progress.thresholdAmountMinor) * 100,
    ),
  );
  const message = progress.eligible
    ? 'FREE Standard delivery unlocked'
    : `Add ${formatMoney({
        amountMinor: progress.amountRemainingMinor,
        currency: progress.currency,
      })} more for FREE Standard delivery`;

  return (
    <aside className="rounded-lg border border-teal-500/45 bg-teal-500/8 px-4 py-3">
      <p aria-live="polite" className="text-sm font-bold text-teal-500">
        {message}
      </p>
      <div
        role="progressbar"
        aria-label="Progress toward free Standard delivery"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={message}
        className="mt-2 h-3 overflow-hidden rounded-full bg-surface-sunken-strong"
      >
        <div
          className="free-shipping-progress-fill h-full rounded-full bg-teal-500"
          style={{ width: `${percent}%` }}
        />
      </div>
    </aside>
  );
}

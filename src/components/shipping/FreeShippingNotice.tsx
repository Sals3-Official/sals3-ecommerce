import { TruckIcon } from '@/components/icons/Icon';

type FreeShippingNoticeProps = {
  className?: string;
};

/**
 * The one visual language for "free shipping exists" everywhere it can be
 * shown before checkout knows a destination -- the PDP buy rail and the
 * cart summary both render this, unchanged. Deliberately the same teal
 * card treatment `CheckoutFreeShippingProgress` already uses
 * (`border-teal-500/45 bg-teal-500/8`), so the offer is visually one thing
 * a buyer recognises three times rather than three different-looking
 * mentions of it.
 *
 * Carries no amount and no country on purpose: neither the PDP nor the
 * cart has an address to check a threshold against (see
 * `ProductEvidenceLedger`'s Delivery row and `CartPageClient`'s own
 * comment). The exact figure still resolves only at checkout, where
 * `CheckoutFreeShippingProgress` takes over with the real number.
 */
export default function FreeShippingNotice({
  className = '',
}: FreeShippingNoticeProps) {
  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-teal-500/45 bg-teal-500/8 px-4 py-3 ${className}`}
    >
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-teal-500/15 text-teal-500">
        <TruckIcon width={17} height={17} />
      </span>
      <div>
        <p className="text-sm font-bold text-teal-500">
          Free Standard delivery on qualifying orders
        </p>
        <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
          Confirmed once your address is known, at checkout.
        </p>
      </div>
    </div>
  );
}

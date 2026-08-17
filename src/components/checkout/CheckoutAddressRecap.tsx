'use client';

import type { CheckoutAddress } from '@/lib/checkout/schema';
import { CHECKOUT_COUNTRY_DETAILS } from '@/lib/checkout/locations';

type CheckoutAddressRecapProps = {
  address: CheckoutAddress;
  disabled: boolean;
  onEdit: () => void;
};

export default function CheckoutAddressRecap({
  address,
  disabled,
  onEdit,
}: CheckoutAddressRecapProps) {
  const addressLine = [
    address.addressLine1,
    address.addressLine2,
    address.city,
    address.region,
    address.postalCode,
    CHECKOUT_COUNTRY_DETAILS[address.country].label,
  ]
    .filter((part) => part !== '')
    .join(', ');

  return (
    <section
      aria-labelledby="checkout-recap-heading"
      className="rounded-xl border border-border bg-white p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2
            id="checkout-recap-heading"
            className="text-xs font-semibold uppercase tracking-wide text-ink-muted"
          >
            Ship to
          </h2>
          <p className="mt-1 font-display text-base font-semibold text-ink">
            {address.fullName}
          </p>
          <p className="mt-0.5 text-sm text-ink">{addressLine}</p>
          <p className="mt-0.5 text-sm text-ink-muted">
            {address.email} &middot; {address.phone}
          </p>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onEdit}
          className="min-h-11 shrink-0 rounded-lg border border-brand-600 px-4 text-sm font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600/10 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-border-strong disabled:text-ink-faint disabled:hover:bg-transparent"
        >
          Edit
        </button>
      </div>
    </section>
  );
}

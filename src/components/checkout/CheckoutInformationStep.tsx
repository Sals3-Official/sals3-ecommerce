'use client';

import { useRouter } from 'next/navigation';
import CheckoutAddressForm from '@/components/checkout/CheckoutAddressForm';
import { useCheckoutFlow } from '@/components/checkout/CheckoutFlowProvider';
import LoadingOverlay from '@/components/ui/LoadingOverlay';
import Spinner from '@/components/ui/Spinner';

/**
 * Step 1: contact and delivery address.
 *
 * "Continue to delivery" quotes the address before moving on, so the delivery
 * step never renders without options to choose from. Navigation happens only in
 * the callback, on success — a failed quote leaves the buyer here with the
 * message rather than on an empty page.
 */
export default function CheckoutInformationStep() {
  const router = useRouter();
  const {
    address,
    errors,
    updateAddress,
    isPending,
    message,
    prepareDelivery,
  } = useCheckoutFlow();

  return (
    <>
      {/*
        The quote is a CJ round trip through the Portal and routinely takes
        seconds. A disabled button alone reads as a dead click over that long,
        so the wait is made unmistakable and nothing underneath stays clickable.
      */}
      <LoadingOverlay isVisible={isPending} label="Loading delivery options" />
      <CheckoutAddressForm
        value={address}
        errors={errors}
        disabled={isPending}
        onChange={updateAddress}
      />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-ink-muted">
          Nothing is charged yet. Delivery options and the final total come
          next.
        </p>
        <button
          type="button"
          disabled={isPending}
          onClick={() =>
            prepareDelivery(() => router.push('/checkout/delivery'))
          }
          aria-busy={isPending}
          className="bg-brand-gradient inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-surface-sunken disabled:bg-none disabled:text-ink-faint disabled:hover:opacity-100 disabled:active:scale-100"
        >
          {isPending ? <Spinner /> : null}
          {isPending ? 'Loading delivery options...' : 'Continue to delivery'}
        </button>
      </div>
      <p aria-live="polite" className="text-sm text-red-600">
        {message ?? ''}
      </p>
    </>
  );
}

'use client';

import { useCallback, useState, useTransition } from 'react';
import Link from 'next/link';
import type { CartState } from '@/lib/cart';
import { formatMoney } from '@/lib/money';
import {
  CheckoutAddressSchema,
  type CheckoutAddress,
} from '@/lib/checkout/schema';
import { useCart } from '@/components/cart/CartProvider';
import CheckoutAddressForm, {
  type CheckoutAddressErrors,
} from '@/components/checkout/CheckoutAddressForm';
import CheckoutOrderSummary from '@/components/checkout/CheckoutOrderSummary';
import { createCheckoutSessionAction } from '@/app/checkout/actions';

const INITIAL_ADDRESS: CheckoutAddress = {
  email: '',
  fullName: '',
  phone: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  country: 'PH',
};

function errorsFor(address: CheckoutAddress): CheckoutAddressErrors {
  const parsed = CheckoutAddressSchema.safeParse(address);

  if (parsed.success) return {};

  return parsed.error.issues.reduce<CheckoutAddressErrors>((acc, issue) => {
    const field = issue.path[0];

    if (typeof field === 'string' && field in address) {
      acc[field as keyof CheckoutAddress] = issue.message;
    }

    return acc;
  }, {});
}

function toCheckoutCart(items: CartState['items']) {
  return {
    items: items.map((line) => ({
      productId: line.productId,
      ...(line.variant?.id === undefined ? {} : { variantId: line.variant.id }),
      quantity: line.quantity,
    })),
  };
}

export default function CheckoutPageClient() {
  const { items, itemCount, subtotal } = useCart();
  const [address, setAddress] = useState(INITIAL_ADDRESS);
  const [errors, setErrors] = useState<CheckoutAddressErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const disabled = isPending || items.length === 0;

  const updateAddress = useCallback(
    (field: keyof CheckoutAddress, nextValue: string) => {
      setAddress((current) => ({ ...current, [field]: nextValue }));
      setErrors((current) => ({ ...current, [field]: undefined }));
    },
    [],
  );

  function submit() {
    const nextErrors = errorsFor(address);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setMessage('Check the highlighted address fields.');
      return;
    }

    setMessage(null);
    startTransition(async () => {
      const result = await createCheckoutSessionAction({
        cart: toCheckoutCart(items),
        address,
      });

      if (result.ok) {
        window.location.assign(result.url);
        return;
      }

      setMessage(result.message);
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-white p-10 text-center">
        <h1 className="mb-1.5 text-xl font-bold">Checkout</h1>
        <p className="mb-4 text-sm text-ink-muted">
          Your cart is empty. Add an item before checkout.
        </p>
        <Link
          href="/"
          className="inline-block rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-bold text-white transition-all duration-200 hover:no-underline hover:opacity-90 active:scale-[0.98]"
        >
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">
          Secure checkout
        </p>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Checkout
        </h1>
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <CheckoutAddressForm
            value={address}
            errors={errors}
            disabled={isPending}
            onChange={updateAddress}
          />
          <section
            aria-labelledby="checkout-payment-heading"
            className="rounded-xl border border-border bg-white p-4"
          >
            <h2
              id="checkout-payment-heading"
              className="font-display text-xl font-semibold"
            >
              Payment
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Continue to Stripe to pay by card or eligible bank debit.
            </p>
            <div className="mt-4 flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-ink-muted">Total today</p>
                <p className="font-display text-2xl font-semibold text-ink">
                  {formatMoney(subtotal)}
                </p>
              </div>
              <button
                type="button"
                disabled={disabled}
                onClick={submit}
                className="bg-brand-gradient min-h-11 rounded-lg px-6 text-sm font-bold text-white transition-all duration-200 hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-none disabled:bg-surface-sunken disabled:text-ink-faint disabled:hover:opacity-100 disabled:active:scale-100"
              >
                {isPending ? 'Opening payment...' : 'Payment'}
              </button>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              Stripe decides which enabled payment methods appear from currency
              and location. Sals3 does not store card or bank details.
            </p>
            <p aria-live="polite" className="mt-3 text-sm text-red-600">
              {message ?? ''}
            </p>
          </section>
        </div>
        <CheckoutOrderSummary items={items} itemCount={itemCount} />
      </div>
    </div>
  );
}

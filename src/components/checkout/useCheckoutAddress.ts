'use client';

import { useCallback, useState } from 'react';
import {
  CheckoutAddressSchema,
  type CheckoutAddress,
} from '@/lib/checkout/schema';
import {
  CHECKOUT_COUNTRY_DETAILS,
  isCheckoutCountry,
  type CheckoutCountry,
} from '@/lib/checkout/locations';
import type { CheckoutAddressErrors } from '@/components/checkout/CheckoutAddressForm';

/**
 * The country the form starts on when nothing else is known.
 *
 * Philippines, unchanged: it is where the storefront's buyers are today, and
 * one of the two `CHECKOUT_ALLOWED_COUNTRIES`. A buyer whose destination is
 * already known overrides it — see `initialCountry` below.
 */
const FALLBACK_COUNTRY: CheckoutCountry = 'PH';

const INITIAL_ADDRESS: CheckoutAddress = {
  email: '',
  fullName: '',
  phone: CHECKOUT_COUNTRY_DETAILS[FALLBACK_COUNTRY].phonePrefix,
  addressLine1: '',
  addressLine2: '',
  city: '',
  region: '',
  postalCode: '',
  country: FALLBACK_COUNTRY,
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

/**
 * Owns the delivery-address form state. `onAddressEdited` fires on every
 * field change so the caller can invalidate anything derived from the
 * address (the courier quote).
 *
 * `initialCountry` seeds the country and its phone prefix. It arrives as an
 * argument — threaded from the flow layout through `CheckoutFlowProvider` and
 * `useCheckout` — rather than being read from the destination cookie here: this
 * is a client hook, the cookie is resolved server-side by `resolveDestination`,
 * and a second reader would be a second answer to a question that already has
 * one. It is only ever a `CheckoutCountry`, so the caller does the narrowing
 * and a Global destination simply does not reach this.
 *
 * `initialEmail` seeds the contact field with the signed-in account's own
 * address, threaded the same way from the layout. Same rule: a starting value,
 * still editable. It exists because an order is scoped by the account that
 * placed it, and this field used to be that scope — a buyer who typed a
 * different address on 2026-08-28 paid for an order that then vanished from
 * their own list.
 *
 * Seeding is a starting value and nothing more: the country select stays fully
 * editable, and `CHECKOUT_ALLOWED_COUNTRIES` and the Zod schema are untouched
 * by it.
 */
export default function useCheckoutAddress(
  onAddressEdited: () => void,
  initialCountry: CheckoutCountry = FALLBACK_COUNTRY,
  initialEmail = '',
) {
  // A lazy initialiser, not a plain value: `useState` keeps the first render's
  // state, so re-computing this object on every render would allocate an
  // address the hook then throws away.
  const [address, setAddress] = useState<CheckoutAddress>(() => ({
    ...INITIAL_ADDRESS,
    email: initialEmail,
    country: initialCountry,
    phone: CHECKOUT_COUNTRY_DETAILS[initialCountry].phonePrefix,
  }));
  const [errors, setErrors] = useState<CheckoutAddressErrors>({});

  const updateAddress = useCallback(
    (field: keyof CheckoutAddress, nextValue: string) => {
      setAddress((current) => {
        if (field === 'country' && isCheckoutCountry(nextValue)) {
          return {
            ...current,
            country: nextValue,
            phone: CHECKOUT_COUNTRY_DETAILS[nextValue].phonePrefix,
            region: '',
            city: '',
          };
        }

        if (field === 'region') {
          return { ...current, region: nextValue, city: '' };
        }

        return { ...current, [field]: nextValue };
      });
      setErrors((current) => ({
        ...current,
        [field]: undefined,
        ...(field === 'country'
          ? { phone: undefined, region: undefined, city: undefined }
          : {}),
        ...(field === 'region' ? { city: undefined } : {}),
      }));
      onAddressEdited();
    },
    [onAddressEdited],
  );

  const validateAddress = useCallback((): boolean => {
    const nextErrors = errorsFor(address);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return false;
    }

    return true;
  }, [address]);

  // Seeded means locked. An account with no email claim on its session falls
  // through to an editable field rather than an empty one the buyer cannot fill.
  const emailLocked = initialEmail !== '';

  return { address, errors, updateAddress, validateAddress, emailLocked };
}

'use client';

import { useCallback, useState } from 'react';
import {
  CheckoutAddressSchema,
  type CheckoutAddress,
} from '@/lib/checkout/schema';
import {
  CHECKOUT_COUNTRY_DETAILS,
  isCheckoutCountry,
} from '@/lib/checkout/locations';
import type { CheckoutAddressErrors } from '@/components/checkout/CheckoutAddressForm';

const INITIAL_ADDRESS: CheckoutAddress = {
  email: '',
  fullName: '',
  phone: CHECKOUT_COUNTRY_DETAILS.PH.phonePrefix,
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

/**
 * Owns the delivery-address form state. `onAddressEdited` fires on every
 * field change so the caller can invalidate anything derived from the
 * address (the courier quote).
 */
export default function useCheckoutAddress(onAddressEdited: () => void) {
  const [address, setAddress] = useState(INITIAL_ADDRESS);
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

  return { address, errors, updateAddress, validateAddress };
}

import { describe, expect, it } from 'vitest';
import { CheckoutAddressSchema } from '@/lib/checkout/schema';

const validAddress = {
  email: 'buyer@example.com',
  fullName: 'Buyer Example',
  phone: '+639171234567',
  addressLine1: '123 Main Street',
  addressLine2: '',
  city: 'Manila',
  region: 'National Capital Region (NCR)',
  postalCode: '1000',
  country: 'PH' as const,
};

describe('CheckoutAddressSchema', () => {
  it('accepts a country-matched phone, region, and city', () => {
    expect(CheckoutAddressSchema.safeParse(validAddress).success).toBe(true);
  });

  it('rejects a Philippines phone that does not start with +639', () => {
    const parsed = CheckoutAddressSchema.safeParse({
      ...validAddress,
      phone: '+61412345678',
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['phone'],
          message: 'Phone must start with +639.',
        }),
      ]),
    );
  });

  it('rejects an Australia phone that does not start with +614', () => {
    const parsed = CheckoutAddressSchema.safeParse({
      ...validAddress,
      phone: '+639171234567',
      city: 'Sydney',
      region: 'New South Wales',
      postalCode: '2000',
      country: 'AU',
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['phone'],
          message: 'Phone must start with +614.',
        }),
      ]),
    );
  });

  it('rejects a state or region outside the selected country', () => {
    const parsed = CheckoutAddressSchema.safeParse({
      ...validAddress,
      region: 'New South Wales',
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['region'],
          message: 'Choose a valid Philippines state or region.',
        }),
      ]),
    );
  });

  it('rejects a city outside the selected state or region', () => {
    const parsed = CheckoutAddressSchema.safeParse({
      ...validAddress,
      city: 'Cebu City',
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['city'],
          message: 'Choose a city from the selected state or region.',
        }),
      ]),
    );
  });
});

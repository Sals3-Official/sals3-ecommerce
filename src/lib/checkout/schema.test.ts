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

  it('accepts a Fiji address without a postal code', () => {
    expect(
      CheckoutAddressSchema.safeParse({
        ...validAddress,
        phone: '+6793212345',
        city: 'Nadi',
        region: 'Western Division',
        postalCode: '',
        country: 'FJ',
      }).success,
    ).toBe(true);
  });

  it('accepts a Fiji town from the selected division', () => {
    expect(
      CheckoutAddressSchema.safeParse({
        ...validAddress,
        phone: '+6793212345',
        city: 'Savusavu',
        region: 'Northern Division',
        postalCode: '',
        country: 'FJ',
      }).success,
    ).toBe(true);
  });

  /**
   * Fiji used to take any typed string here. It is a list now, like Australia
   * and the Philippines, so a town from the wrong division must be refused
   * rather than shipped to the courier as written.
   */
  it('rejects a Fiji town that does not belong to the chosen division', () => {
    const parsed = CheckoutAddressSchema.safeParse({
      ...validAddress,
      phone: '+6793212345',
      city: 'Savusavu',
      region: 'Western Division',
      postalCode: '',
      country: 'FJ',
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

  it('rejects a Fiji phone that does not start with +679', () => {
    const parsed = CheckoutAddressSchema.safeParse({
      ...validAddress,
      phone: '+61412345678',
      city: 'Suva',
      region: 'Central Division',
      postalCode: '',
      country: 'FJ',
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['phone'],
          message: 'Phone must start with +679.',
        }),
      ]),
    );
  });

  it('still requires a postal code for Australia and the Philippines', () => {
    const parsed = CheckoutAddressSchema.safeParse({
      ...validAddress,
      postalCode: '',
    });

    expect(parsed.success).toBe(false);
    expect(parsed.error?.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: ['postalCode'],
          message: 'Enter a postal code.',
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

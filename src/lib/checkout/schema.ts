import { z } from 'zod';
import { MAX_LINE_QUANTITY } from '@/lib/cart';
import { SUPPORTED_CURRENCIES } from '@/lib/money';
import {
  CHECKOUT_ALLOWED_COUNTRIES,
  CHECKOUT_COUNTRY_DETAILS,
  checkoutCityOptions,
  checkoutRequiresPostalCode,
  checkoutRegionOptions,
} from '@/lib/checkout/locations';
import { SHIPPING_TIERS } from '@/lib/checkout/shipping-tiers';

export { CHECKOUT_ALLOWED_COUNTRIES };

export const CheckoutCartLineInputSchema = z.object({
  productId: z.string().min(1).max(160),
  variantId: z.string().min(1).max(120).optional(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
  /**
   * The price the buyer was looking at when they pressed pay.
   *
   * **Never charged, and never trusted for money.** The amount comes from the
   * Portal through `validateCheckoutCart`, exactly as before; this is compared
   * against that and thrown away. Its only job is to let the server answer a
   * question it previously could not ask — "is this still the figure they
   * agreed to?" — so a price that moved mid-checkout stops the charge instead
   * of quietly changing it.
   *
   * Optional because an older client, or the shipping-quote path, sends none;
   * absent simply means there is nothing to compare and the flow is unchanged.
   */
  unitPriceMinor: z.number().int().nonnegative().optional(),
});

export const CheckoutAddressSchema = z
  .object({
    email: z.string().trim().email().max(254),
    fullName: z.string().trim().min(2).max(120),
    phone: z.string().trim().min(4).max(40),
    addressLine1: z.string().trim().min(4).max(120),
    addressLine2: z.string().trim().max(120).optional(),
    city: z.string().trim().min(2).max(80),
    region: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().max(20),
    country: z.enum(CHECKOUT_ALLOWED_COUNTRIES),
  })
  .superRefine((address, context) => {
    const country = CHECKOUT_COUNTRY_DETAILS[address.country];
    const prefix = country.phonePrefix;

    if (!address.phone.startsWith(prefix)) {
      context.addIssue({
        code: 'custom',
        path: ['phone'],
        message: `Phone must start with ${prefix}.`,
      });
    }

    if (
      checkoutRequiresPostalCode(address.country) &&
      address.postalCode.length < 3
    ) {
      context.addIssue({
        code: 'custom',
        path: ['postalCode'],
        message: 'Enter a postal code.',
      });
    }

    if (!checkoutRegionOptions(address.country).includes(address.region)) {
      context.addIssue({
        code: 'custom',
        path: ['region'],
        message: `Choose a valid ${country.label} state or region.`,
      });
      return;
    }

    if (
      !checkoutCityOptions(address.country, address.region).includes(
        address.city,
      )
    ) {
      context.addIssue({
        code: 'custom',
        path: ['city'],
        message: 'Choose a city from the selected state or region.',
      });
    }
  });

export const CreateCheckoutSessionInputSchema = z.object({
  cart: z.object({
    items: z.array(CheckoutCartLineInputSchema).min(1).max(50),
  }),
  address: CheckoutAddressSchema,
  shippingSelection: z.object({
    packageSelections: z
      .array(
        z.object({
          packageId: z.string().min(1).max(80),
          shippingTier: z.enum(SHIPPING_TIERS),
          quoteId: z.string().min(1).max(120),
          optionId: z.string().min(1).max(120),
          channelId: z.string().min(1).max(120),
          cjLogisticName: z.string().min(1).max(120),
          arrivalTime: z.string().min(1).max(80),
          amountMinor: z.number().int().nonnegative(),
          currency: z.enum(SUPPORTED_CURRENCIES),
        }),
      )
      .min(1)
      .max(20),
  }),
});

export type CheckoutAddress = z.infer<typeof CheckoutAddressSchema>;
export type CheckoutCartLineInput = z.infer<typeof CheckoutCartLineInputSchema>;
export type CheckoutShippingSelection = z.infer<
  typeof CreateCheckoutSessionInputSchema
>['shippingSelection'];
export type CreateCheckoutSessionInput = z.infer<
  typeof CreateCheckoutSessionInputSchema
>;

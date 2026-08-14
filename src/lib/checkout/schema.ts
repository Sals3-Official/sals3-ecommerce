import { z } from 'zod';
import { MAX_LINE_QUANTITY } from '@/lib/cart';

export const CHECKOUT_ALLOWED_COUNTRIES = ['AU', 'PH'] as const;

export const CheckoutCartLineInputSchema = z.object({
  productId: z.string().min(1).max(160),
  variantId: z.string().min(1).max(120).optional(),
  quantity: z.number().int().min(1).max(MAX_LINE_QUANTITY),
});

export const CheckoutAddressSchema = z.object({
  email: z.string().trim().email().max(254),
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().max(40).optional(),
  addressLine1: z.string().trim().min(4).max(120),
  addressLine2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(2).max(80),
  region: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().min(3).max(20),
  country: z.enum(CHECKOUT_ALLOWED_COUNTRIES),
});

export const CreateCheckoutSessionInputSchema = z.object({
  cart: z.object({
    items: z.array(CheckoutCartLineInputSchema).min(1).max(50),
  }),
  address: CheckoutAddressSchema,
});

export type CheckoutAddress = z.infer<typeof CheckoutAddressSchema>;
export type CheckoutCartLineInput = z.infer<typeof CheckoutCartLineInputSchema>;
export type CreateCheckoutSessionInput = z.infer<
  typeof CreateCheckoutSessionInputSchema
>;

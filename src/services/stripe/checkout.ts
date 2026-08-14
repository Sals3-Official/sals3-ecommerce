import 'server-only';

import Stripe from 'stripe';
import type { CheckoutAddress } from '@/lib/checkout/schema';
import { getSiteUrl } from '@/lib/site';
import type { ValidatedCheckoutCart } from '@/services/checkout/cart-validation';
import { getStripeClient } from '@/services/stripe/client';

const INTEGRATION_PREFIX = 'sals3_checkout_';

function randomLowercase(length: number): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz';
  const bytes = crypto.getRandomValues(new Uint8Array(length));

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join('');
}

function getBaseUrl(): string {
  const siteUrl = getSiteUrl() ?? process.env.SALS3_ECOMMERCE_BASE_URL;

  if (siteUrl === undefined || siteUrl === '') {
    throw new Error('Site URL is not configured.');
  }

  return siteUrl.replace(/\/+$/, '');
}

function stripeCurrency(currency: string): string {
  return currency.toLowerCase();
}

function metadataFor(address: CheckoutAddress, cart: ValidatedCheckoutCart) {
  return {
    sals3_checkout_version: 'stripe_only_v1',
    sals3_line_count: String(cart.lines.length),
    sals3_shipping_country: address.country,
  };
}

function shippingFor(
  address: CheckoutAddress,
): Stripe.Checkout.SessionCreateParams.PaymentIntentData.Shipping {
  return {
    name: address.fullName,
    ...(address.phone === undefined || address.phone === ''
      ? {}
      : { phone: address.phone }),
    address: {
      line1: address.addressLine1,
      ...(address.addressLine2 === undefined || address.addressLine2 === ''
        ? {}
        : { line2: address.addressLine2 }),
      city: address.city,
      state: address.region,
      postal_code: address.postalCode,
      country: address.country,
    },
  };
}

export async function createStripeCheckoutSession(input: {
  cart: ValidatedCheckoutCart;
  address: CheckoutAddress;
}): Promise<string> {
  const baseUrl = getBaseUrl();
  const stripe = getStripeClient();
  const paymentMethodConfiguration =
    process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID;
  const metadata = metadataFor(input.address, input.cart);

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    integration_identifier: `${INTEGRATION_PREFIX}${randomLowercase(8)}`,
    success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}/checkout?canceled=1`,
    customer_email: input.address.email,
    billing_address_collection: 'auto',
    ...(paymentMethodConfiguration === undefined ||
    paymentMethodConfiguration === ''
      ? {}
      : { payment_method_configuration: paymentMethodConfiguration }),
    payment_intent_data: {
      metadata,
      shipping: shippingFor(input.address),
    },
    metadata,
    line_items: input.cart.lines.map((line) => ({
      quantity: line.quantity,
      price_data: {
        currency: stripeCurrency(line.unitPrice.currency),
        unit_amount: line.unitPrice.amountMinor,
        product_data: {
          name: line.title.slice(0, 250),
          ...(line.imageUrl === undefined ? {} : { images: [line.imageUrl] }),
        },
      },
    })),
  });

  if (session.url === null) {
    throw new Error('Stripe Checkout Session did not include a redirect URL.');
  }

  return session.url;
}

export async function retrieveStripeCheckoutSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  return getStripeClient().checkout.sessions.retrieve(sessionId);
}

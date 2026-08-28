import 'server-only';

import Stripe from 'stripe';
import type {
  CheckoutAddress,
  CheckoutShippingSelection,
} from '@/lib/checkout/schema';
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

function shippingTotal(selection: CheckoutShippingSelection): number {
  return selection.packageSelections.reduce(
    (total, selected) => total + selected.amountMinor,
    0,
  );
}

function metadataFor(
  address: CheckoutAddress,
  cart: ValidatedCheckoutCart,
  shippingSelection: CheckoutShippingSelection,
  shippingQuotedAt: string,
) {
  const optionIds = shippingSelection.packageSelections
    .map((selection) =>
      [
        selection.packageId,
        selection.shippingTier,
        selection.optionId,
        selection.channelId,
        selection.amountMinor,
        selection.currency,
        selection.arrivalTime,
      ].join(':'),
    )
    .join(',');
  const deliveryPromises = shippingSelection.packageSelections
    .map((selection) =>
      [selection.shippingTier, selection.arrivalTime].join(':'),
    )
    .join(',');

  return {
    sals3_checkout_version: 'cj_freight_v2',
    sals3_line_count: String(cart.lines.length),
    sals3_shipping_package_count: String(
      shippingSelection.packageSelections.length,
    ),
    sals3_shipping_country: address.country,
    sals3_shipping_total_minor: String(shippingTotal(shippingSelection)),
    sals3_shipping_quoted_at: shippingQuotedAt,
    sals3_shipping_options: optionIds.slice(0, 500),
    sals3_shipping_delivery: deliveryPromises.slice(0, 500),
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
  shippingSelection: CheckoutShippingSelection;
  shippingQuotedAt: string;
  checkoutIntentId: string;
}): Promise<{ clientSecret: string; sessionId: string }> {
  const baseUrl = getBaseUrl();
  const stripe = getStripeClient();
  const paymentMethodConfiguration =
    process.env.STRIPE_PAYMENT_METHOD_CONFIGURATION_ID;
  const metadata = metadataFor(
    input.address,
    input.cart,
    input.shippingSelection,
    input.shippingQuotedAt,
  );
  const shippingAmount = shippingTotal(input.shippingSelection);
  const shippingCurrency =
    input.shippingSelection.packageSelections[0]?.currency ??
    input.cart.subtotal.currency;

  if (shippingCurrency !== input.cart.subtotal.currency) {
    throw new Error('Shipping currency does not match cart currency.');
  }

  const selectedTiers = new Set(
    input.shippingSelection.packageSelections.map(
      (selection) => selection.shippingTier,
    ),
  );
  const shippingName =
    selectedTiers.size === 1
      ? `Shipping - ${input.shippingSelection.packageSelections[0]!.shippingTier}`
      : 'Shipping - Mixed delivery tiers';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    ui_mode: 'embedded_page',
    integration_identifier: `${INTEGRATION_PREFIX}${randomLowercase(8)}`,
    return_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    client_reference_id: input.checkoutIntentId,
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
    line_items: [
      ...input.cart.lines.map((line) => ({
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
      {
        quantity: 1,
        price_data: {
          currency: stripeCurrency(input.cart.subtotal.currency),
          unit_amount: shippingAmount,
          product_data: { name: shippingName.slice(0, 250) },
        },
      },
    ],
  });

  if (session.client_secret === null) {
    throw new Error('Stripe Checkout Session did not include a client secret.');
  }

  return { clientSecret: session.client_secret, sessionId: session.id };
}

/**
 * Expanded because the receipt on `/checkout/success` is rendered entirely from
 * this one call: `line_items` for what was bought, its `price.product` for the
 * thumbnails, and `payment_intent` for the shipping address recorded at
 * creation. Reading the accepted order from the portal instead would race the
 * `checkout.session.completed` webhook, which usually has not landed by the
 * time the buyer is redirected back; the session is consistent immediately.
 */
export async function retrieveStripeCheckoutSession(
  sessionId: string,
): Promise<Stripe.Checkout.Session> {
  return getStripeClient().checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'line_items.data.price.product', 'payment_intent'],
  });
}

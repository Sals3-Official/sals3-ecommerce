import 'server-only';

import Stripe from 'stripe';

export const STRIPE_API_VERSION = '2026-07-29.dahlia';

let stripeClient: Stripe | undefined;

export function getStripeClient(): Stripe {
  if (stripeClient !== undefined) return stripeClient;

  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (secretKey === undefined || secretKey === '') {
    throw new Error('Stripe secret key is not configured.');
  }

  stripeClient = new Stripe(secretKey, {
    apiVersion: STRIPE_API_VERSION,
  });

  return stripeClient;
}

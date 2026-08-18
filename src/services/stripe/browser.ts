'use client';

import { loadStripe, type Stripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null> | null = null;

export function getStripePublishableKey(): string | undefined {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;

  return key === undefined || key.trim() === '' ? undefined : key;
}

export function getStripePromise(): Promise<Stripe | null> | null {
  const key = getStripePublishableKey();

  if (key === undefined) return null;

  stripePromise ??= loadStripe(key);

  return stripePromise;
}

import Stripe from 'stripe';
import { getStripeClient } from '@/services/stripe/client';

export const runtime = 'nodejs';

function response(status: number, body: { received?: true; error?: string }) {
  return Response.json(body, { status });
}

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (webhookSecret === undefined || webhookSecret === '') {
    return response(500, { error: 'webhook_not_configured' });
  }

  const signature = request.headers.get('stripe-signature');

  if (signature === null) {
    return response(400, { error: 'missing_signature' });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    event = getStripeClient().webhooks.constructEvent(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch {
    return response(400, { error: 'invalid_signature' });
  }

  switch (event.type) {
    case 'checkout.session.completed':
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired':
      return response(200, { received: true });
    default:
      return response(200, { received: true });
  }
}

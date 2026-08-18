import Stripe from 'stripe';
import { getStripeClient } from '@/services/stripe/client';
import acceptPortalCheckoutOrder from '@/services/checkout/order-acceptance';

export const runtime = 'nodejs';

function response(status: number, body: { received?: true; error?: string }) {
  return Response.json(body, { status });
}

function paymentIntentIdOf(
  paymentIntent: string | Stripe.PaymentIntent | null,
): string | undefined {
  if (typeof paymentIntent === 'string') return paymentIntent;
  return paymentIntent?.id;
}

async function handleCheckoutCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.payment_status !== 'paid') return;
  if (session.client_reference_id === null) {
    throw new Error('Stripe Checkout Session is missing checkout intent id.');
  }
  if (session.amount_total === null || session.currency === null) {
    throw new Error('Stripe Checkout Session is missing payment amount.');
  }

  await acceptPortalCheckoutOrder({
    checkoutIntentId: session.client_reference_id,
    stripeEventId: event.id,
    stripeCheckoutSessionId: session.id,
    stripePaymentIntentId: paymentIntentIdOf(session.payment_intent),
    amountTotalMinor: session.amount_total,
    currency: session.currency.toUpperCase(),
    customerEmail: session.customer_details?.email ?? undefined,
  });
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
      try {
        await handleCheckoutCompleted(event);
      } catch {
        return response(500, { error: 'order_acceptance_failed' });
      }
      return response(200, { received: true });
    case 'checkout.session.async_payment_failed':
    case 'checkout.session.expired':
      return response(200, { received: true });
    default:
      return response(200, { received: true });
  }
}

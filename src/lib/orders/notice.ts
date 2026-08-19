import type { BuyerOrder } from './contracts';

/**
 * The one notice the list is allowed to raise, chosen from what is on screen.
 *
 * Ranked, not stacked: a delivery that needs attention outranks a payment still
 * settling, because one asks the buyer to do something and the other asks them
 * to do nothing. Two notices at once would make the page look like a fault log.
 *
 * Both texts name the order numbers involved, so the notice points at a card
 * rather than describing a mood.
 */

export type OrdersNotice = {
  title: string;
  body: string;
};

const SETTLING_STATES = ['PAYMENT_PENDING', 'CHECKOUT_PENDING'];

function numbersOf(orders: readonly BuyerOrder[]): string {
  const numbers = orders.map((order) => order.number);

  if (numbers.length === 1) return numbers[0] ?? '';
  if (numbers.length === 2) return `${numbers[0]} and ${numbers[1]}`;

  return `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`;
}

export function noticeFor(orders: readonly BuyerOrder[]): OrdersNotice | null {
  const exceptions = orders.filter((order) => order.hasException);

  if (exceptions.length > 0) {
    return {
      title:
        exceptions.length === 1
          ? 'One delivery needs attention'
          : `${exceptions.length} deliveries need attention`,
      body: `Sources disagree about ${numbersOf(exceptions)}. Sals3 shows the disagreement rather than picking a side, and support can act on a parcel in transit.`,
    };
  }

  const settling = orders.filter((order) =>
    SETTLING_STATES.includes(order.state),
  );

  if (settling.length > 0) {
    return {
      title:
        settling.length === 1
          ? 'One checkout is still settling'
          : `${settling.length} checkouts are still settling`,
      body: `Stripe has the details for ${numbersOf(settling)} and the payment has not settled. Nothing more is needed from you, and no supplier order is placed until it does.`,
    };
  }

  return null;
}

import { formatMoney, type CurrencyCode } from '@/lib/money';

/**
 * Every string a buyer reads on `/orders` is built here, on the server.
 *
 * Two reasons this is not left to the components. Money first: a component
 * that can format can also add, and the buyer surface must render exactly what
 * Stripe charged. Dates second: `toLocaleDateString` without an explicit locale
 * and time zone produces one string during server render and possibly another
 * during hydration, which React reports as a mismatch and which would make an
 * order look like it was placed on a different day depending on where the
 * reader sits. Both are pinned to `en-GB` and `UTC` so the record reads the
 * same everywhere, matching the checkout receipt.
 */

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});

const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

/** `12 Aug 2026`. */
export function formatOrderDate(iso: string): string {
  return DATE.format(new Date(iso));
}

/** `12 Aug 2026, 14:09`. */
export function formatOrderDateTime(iso: string): string {
  return DATE_TIME.format(new Date(iso));
}

export function formatAmount(
  amountMinor: number,
  currency: CurrencyCode,
): string {
  return formatMoney({ amountMinor, currency });
}

/** `1 item` / `3 items`. */
export function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`;
}

/**
 * The Stripe reference, shown but not fully spelled out. A buyer copying it
 * into a support message needs to recognise it; a screenshot on a shared screen
 * does not need to carry the whole id.
 */
export function truncateStripeReference(reference: string): string {
  if (reference.length <= 20) return `Stripe reference ${reference}`;

  return `Stripe reference ${reference.slice(0, 12)}…${reference.slice(-4)}`;
}

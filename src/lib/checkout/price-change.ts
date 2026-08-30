import type { Money } from '@/lib/money';

/**
 * One line's price, as the server resolved it, and what the buyer had been
 * shown if the two differ.
 *
 * Here rather than beside `services/checkout/reprice.ts` because both sides of
 * the boundary need the shape: the server produces it, and the cart page, the
 * checkout chrome and the notice all read it. That module is `server-only`, and
 * `client-bundle-boundary.test.ts` fails the build when a client component
 * reaches a module carrying that import — correctly, since a type-only import
 * is a promise about the value's home, and the home was wrong.
 *
 * Types only. Nothing here decides an amount: `previousUnitPrice` is what was
 * displayed and is used solely to say what changed, while `unitPrice` is the
 * Portal's answer and the only figure anything is charged against.
 */
export type RepricedLine = {
  productId: string;
  variantId?: string;
  unitPrice: Money;
  /** The price the line was carrying, when it differs from `unitPrice`. */
  previousUnitPrice?: Money;
  title: string;
};

export type RepricedCart = {
  lines: RepricedLine[];
  /** Only the lines whose price moved. Empty is the ordinary case. */
  changed: RepricedLine[];
};

/** One changed price, ready to render. */
export type CheckoutPriceChange = {
  title: string;
  from: Money;
  to: Money;
};

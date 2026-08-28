import { CHECKOUT_ALLOWED_COUNTRIES } from '@/lib/checkout/locations';

/**
 * Where the buyer is shopping to send their order.
 *
 * ## Why this exists at all
 *
 * Until 2026-08-27 the storefront had **no notion of a destination country
 * outside the checkout address form**. A buyer anywhere in the world browsed an
 * identical site, added to a cart, created an account, and only then met a
 * two-option country dropdown that did not contain their country. There was no
 * error to hit, because the form made the invalid state unreachable — the
 * failure was a silence at the end of a funnel.
 *
 * This module is the vocabulary that lets the site say where it is shipping
 * before a buyer spends anything on finding out.
 *
 * ## The two lists, which are deliberately different
 *
 * - **`DESTINATIONS`** — where an order may be *priced*: the six measured
 *   countries plus Global. This mirrors `listPricingScopes()` in `sals3-portal`
 *   exactly, including `GLOBAL` for "every country without a column of its own"
 *   (owner decision 2026-08-27, ADR-015's second amendment that day).
 * - **`CHECKOUT_ALLOWED_COUNTRIES`** — where an order may actually be *placed*.
 *   Three countries today.
 *
 * They are not the same list and must never be collapsed into one. The gap
 * between them is the honest thing this feature exists to show, not a bug to
 * paper over: ADR-003 §1 requires copy to say "ships to supported countries"
 * rather than "ships worldwide" until each country is operationally verified.
 *
 * ## Why the picker is not a list of every country
 *
 * Offering ~190 countries would state that Sals3 ships to ~190 countries. It
 * ships to the checkout-ready destinations. Global is one option meaning
 * "somewhere else", which is exactly
 * what it means on the pricing side, and it keeps the two systems saying the
 * same thing.
 */

export const GLOBAL_DESTINATION_CODE = 'GLOBAL';

export type DestinationCode = string;

export type Destination = {
  /** `GLOBAL`, or ISO 3166-1 alpha-2 for a named country. */
  code: DestinationCode;
  /** The name on its own, for a list item or a button. */
  label: string;
  /**
   * The name inside a sentence, when English wants an article.
   *
   * "Australia and **the** Philippines" — a list of bare labels reads wrong the
   * moment one of them takes "the". Only set where it differs from `label`, so
   * the picker keeps showing "Philippines" and only prose changes.
   */
  proseLabel?: string;
  /** True only for the catch-all. */
  isGlobal: boolean;
};

/**
 * The six measured destinations, then Global.
 *
 * Global is **last** in the list but is the **default** when nothing is known —
 * see `DEFAULT_DESTINATION_CODE`. Those are different questions and the answers
 * differ on purpose.
 */
export const DESTINATIONS: Destination[] = [
  { code: 'AU', label: 'Australia', isGlobal: false },
  {
    code: 'PH',
    label: 'Philippines',
    proseLabel: 'the Philippines',
    isGlobal: false,
  },
  { code: 'NZ', label: 'New Zealand', isGlobal: false },
  {
    code: 'US',
    label: 'United States',
    proseLabel: 'the United States',
    isGlobal: false,
  },
  { code: 'CA', label: 'Canada', isGlobal: false },
  { code: 'FJ', label: 'Fiji', isGlobal: false },
  { code: GLOBAL_DESTINATION_CODE, label: 'Somewhere else', isGlobal: true },
];

/**
 * What a visitor gets when nothing else is known.
 *
 * **Global, by owner decision 2026-08-27** — the site's shape is a global one,
 * so the neutral state is "somewhere else" rather than a country nobody chose.
 * Defaulting to a named country would silently tell a visitor in Berlin that
 * they are shopping to Australia, and the checkout would then be quietly right
 * for a country they never picked.
 */
export const DEFAULT_DESTINATION_CODE = GLOBAL_DESTINATION_CODE;

export function getGlobalDestination(): Destination {
  const global = DESTINATIONS.find((destination) => destination.isGlobal);

  // The list is a module constant containing exactly one global entry, so this
  // cannot happen; the throw is here so a future edit that removes it fails
  // loudly rather than silently returning a country as the catch-all.
  if (global === undefined) {
    throw new Error('DESTINATIONS must contain a global entry.');
  }

  return global;
}

export function findDestination(code: string | undefined | null): Destination {
  return (
    DESTINATIONS.find((destination) => destination.code === code) ??
    getGlobalDestination()
  );
}

export function isKnownDestinationCode(code: string): boolean {
  return DESTINATIONS.some((destination) => destination.code === code);
}

/**
 * Whether an order can actually be placed to this destination today.
 *
 * Reads `CHECKOUT_ALLOWED_COUNTRIES` rather than restating it, so the day
 * checkout opens a country this answers differently with no edit here. Global
 * is always false: it is not a country, and a package cannot be addressed to
 * it.
 */
export function canCheckOutTo(code: string): boolean {
  if (code === GLOBAL_DESTINATION_CODE) return false;

  return (CHECKOUT_ALLOWED_COUNTRIES as readonly string[]).includes(code);
}

/** The destinations an order can actually be placed to, for use in copy. */
export function listCheckoutReadyDestinations(): Destination[] {
  return DESTINATIONS.filter((destination) => canCheckOutTo(destination.code));
}

/**
 * "Australia, the Philippines and Fiji" — an English list for a sentence.
 *
 * Built from the same source as the gate, so the sentence cannot name a country
 * the form will refuse, or omit one it accepts.
 */
export function describeCheckoutReadyDestinations(): string {
  const labels = listCheckoutReadyDestinations().map(
    (destination) => destination.proseLabel ?? destination.label,
  );

  if (labels.length === 0) return 'no destinations yet';
  if (labels.length === 1) return labels[0];

  return `${labels.slice(0, -1).join(', ')} and ${labels[labels.length - 1]}`;
}

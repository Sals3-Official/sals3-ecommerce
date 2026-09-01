import { z } from 'zod';
import {
  getStorefrontApiUrl,
  requestStorefrontJson,
  STOREFRONT_FREE_SHIPPING_PATH,
} from '@/services/storefront/client';
import {
  CHECKOUT_ALLOWED_COUNTRIES,
  type CheckoutCountry,
} from '@/lib/checkout/locations';

/**
 * The free-Standard-delivery threshold for each checkout destination, in USD
 * minor units, owned by the Portal — same shape of read as `buffer.ts`'s FX
 * cushion.
 *
 * ## Why this reads three numbers instead of one
 *
 * `checkout/freight-quotes` already answers this exactly, but only once an
 * address exists — see `CheckoutFreeShippingProgress`, which is fed by that
 * response. Before an address exists, the honest amount a buyer can be shown
 * is an *estimate for the destination they appear to be shopping to*, and the
 * only country-scoped fact available before checkout is
 * `resolveDestination()`'s geo-IP guess. This is that estimate's source
 * number, not a replacement for the real one: `FreeShippingNotice` labels
 * every figure built from it "Estimated" and repeats "confirmed at checkout",
 * the same discipline `IndicativePriceLine` already applies to the FX figure
 * next to it.
 *
 * ## A missing entry means no estimate for that country, not zero
 *
 * `sanitize()` drops any key outside `CHECKOUT_ALLOWED_COUNTRIES` or outside
 * the sanity band, the same "absence costs nothing" rule `buffer.ts` applies
 * to an out-of-band percent. A caller that cannot find its destination's key
 * renders the destination-agnostic copy, not a fabricated number.
 */

export type FreeShippingThresholds = Partial<Record<CheckoutCountry, number>>;

/** The typed empty answer: no estimate for any destination. */
export const EMPTY_FREE_SHIPPING_THRESHOLDS: FreeShippingThresholds = {};

const EMPTY_THRESHOLDS = EMPTY_FREE_SHIPPING_THRESHOLDS;

const responseSchema = z.object({
  thresholds: z.record(z.string(), z.number()),
  currency: z.literal('USD'),
});

/** One hour, matching `buffer.ts` — this changes on the same cadence. */
const CACHE_SECONDS = 60 * 60;

/** Matched to `buffer.ts`: an optional extra must never slow the render path. */
const REQUEST_TIMEOUT_MS = 1_500;

/** Matched to `buffer.ts`'s grace window — see that file for the reasoning. */
const STALE_GRACE_MS = 6 * 60 * 60 * 1000;

/**
 * A threshold outside this band is bad data, not a real promotion. Mirrors
 * `buffer.ts`'s own band check: the boundary's second opinion on a number the
 * Portal already validated, because a consumer trusting "the server already
 * checked" is trusting a server it does not deploy. $1–$500 comfortably
 * covers the three configured thresholds (25 / 12 / 55) with room to change.
 */
const MIN_THRESHOLD_MINOR = 100;
const MAX_THRESHOLD_MINOR = 50_000;

let lastResolved: { thresholds: FreeShippingThresholds; at: number } | null =
  null;

/** Clears the last-known-good thresholds. Tests only. */
export function resetFreeShippingThresholdsMemoForTests(): void {
  lastResolved = null;
}

function withinGrace(now: Date): FreeShippingThresholds | null {
  if (lastResolved === null) return null;

  return now.getTime() - lastResolved.at <= STALE_GRACE_MS
    ? lastResolved.thresholds
    : null;
}

function sanitize(raw: Record<string, number>): FreeShippingThresholds {
  return Object.fromEntries(
    CHECKOUT_ALLOWED_COUNTRIES.flatMap((country) => {
      const amountMinor = raw[country];

      if (
        amountMinor === undefined ||
        !Number.isFinite(amountMinor) ||
        amountMinor < MIN_THRESHOLD_MINOR ||
        amountMinor > MAX_THRESHOLD_MINOR
      ) {
        return [];
      }

      return [[country, amountMinor]] as const;
    }),
  ) as FreeShippingThresholds;
}

/**
 * The threshold per checkout destination, or the last-known-good set through
 * a transient Portal failure, or `{}`.
 *
 * `{}` is a real, renderable answer — every caller already treats "no entry
 * for this country" as "show the generic, amount-free copy", so an empty
 * object degrades exactly like a missing key does.
 */
export default async function fetchFreeShippingThresholds(
  now: Date = new Date(),
): Promise<FreeShippingThresholds> {
  let payload: z.infer<typeof responseSchema> | undefined;

  try {
    payload = await requestStorefrontJson(
      {
        url: getStorefrontApiUrl(STOREFRONT_FREE_SHIPPING_PATH).toString(),
        schema: responseSchema,
        subject: 'free-shipping thresholds',
      },
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cachePolicy: {
          next: { revalidate: CACHE_SECONDS, tags: ['free-shipping'] },
        },
      },
    );
  } catch {
    return withinGrace(now) ?? EMPTY_THRESHOLDS;
  }

  if (payload === undefined) {
    return withinGrace(now) ?? EMPTY_THRESHOLDS;
  }

  const thresholds = sanitize(payload.thresholds);

  lastResolved = { thresholds, at: now.getTime() };

  return thresholds;
}

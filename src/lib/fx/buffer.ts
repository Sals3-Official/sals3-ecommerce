import { z } from 'zod';
import {
  getStorefrontApiUrl,
  requestStorefrontJson,
  STOREFRONT_FX_BUFFER_PATH,
} from '@/services/storefront/client';

/**
 * The FX cushion behind the approximate local price, owned by the Portal.
 *
 * ## Why this is not a constant here
 *
 * It used to be — `sals3-portal`'s own `lib/storefront/fx.ts` carried a
 * hard-coded `2.5` while the Market Rules screen a seller actually edits showed
 * `+1.50%`. Two places stating one fact is the defect, not either place, so the
 * number now has exactly one home: **Market Rules → Funding buffer**, served
 * over `/api/storefront/fx-buffer`. Do not add a default on this side. A
 * fallback percentage is indistinguishable from a configured one by the time it
 * reaches a buyer, which is how the two drifted apart unnoticed.
 *
 * ## The schema is the contract
 *
 * Mirrors `sals3-portal/src/lib/storefront/fx-buffer-feed.ts`, hand-duplicated
 * the same way the product feed's is — see `storefront-product-contract-v2` in
 * the wiki. Additive-only: the portal ships first, and every new key is
 * optional here.
 *
 * ## The server-only marker package is deliberately not used here
 *
 * Same reason as `rates.ts` — its default export throws outside Next's bundler
 * condition and takes this module's own tests out at import. The boundary is
 * held by `test/client-bundle-boundary.test.ts`, which checks what actually
 * reaches the client bundle. That guard scans raw source and cannot tell code
 * from prose, so describe the marker; do not spell it.
 *
 * ## A null buffer means no local price, not an unbuffered one
 *
 * Falling back to a mid-market conversion when the buffer is unavailable would
 * show a number that is knowingly low, and the buyer cannot tell a
 * deliberately-approximate figure from an accidentally-wrong one. So every
 * unresolved case collapses to `null` and `IndicativePriceLine` renders
 * nothing, which is the discipline `rates.ts` already established.
 */

/** Percent, e.g. `1.5` for the `+1.50%` the Market Rules card shows. */
export type FxBufferPercent = number;

const fxBufferSchema = z.object({
  buffer: z
    .object({
      bufferPercent: z.number().finite(),
      policyVersion: z.number().int(),
      policyId: z.string(),
    })
    .nullable(),
});

/**
 * How long a resolved buffer is reused.
 *
 * One hour (owner decision 2026-08-28). The buffer changes far less often than
 * that, so this is not about freshness — it is the ceiling on how long a Market
 * Rules edit can take to reach a shopper. The Portal invalidates its own cache
 * on the write (`updateTag(STOREFRONT_FX_BUFFER_TAG)`), so this window is the
 * only lag left in the chain.
 */
const CACHE_SECONDS = 60 * 60;

/**
 * The Portal is a first-party service, but this call sits on the render path
 * with no `loading.tsx` above it, so the budget is time-to-first-byte. Matched
 * to `rates.ts` rather than to the more forgiving checkout budgets, for the
 * same reason: this is an optional extra, and an extra must never be what makes
 * a product page slow.
 */
const REQUEST_TIMEOUT_MS = 1_500;

/**
 * How long a previously-resolved buffer survives the Portal being unreachable.
 *
 * The distinction this exists for: `200 {"buffer": null}` is the Portal
 * *answering* that there is no active policy, and must take effect at once —
 * deactivating a buffer should stop buffering. A `503`, a timeout or a network
 * error is the question not being asked at all, and dropping every local price
 * across the site over a database blip is a worse answer than showing the
 * cushion that was true ten minutes ago.
 *
 * Per-instance, like `rates.ts`'s failure memo, and honest about it: this turns
 * "no local prices during an outage" into "no local prices during an outage
 * longer than six hours, on instances that had never resolved one".
 */
const STALE_GRACE_MS = 6 * 60 * 60 * 1000;

let lastResolved: { bufferPercent: FxBufferPercent; at: number } | null = null;

/** Clears the last-known-good buffer. Tests only. */
export function resetFxBufferMemoForTests(): void {
  lastResolved = null;
}

/**
 * A buffer far outside this band is bad data rather than a policy. The Portal
 * checks the same band before serving; this is the boundary's own second
 * opinion, because a consumer that renders a number to a buyer on the grounds
 * that "the server already checked" is trusting a server it does not deploy.
 */
const MIN_BUFFER_PERCENT = -10;
const MAX_BUFFER_PERCENT = 25;

function withinGrace(now: Date): FxBufferPercent | null {
  if (lastResolved === null) return null;

  return now.getTime() - lastResolved.at <= STALE_GRACE_MS
    ? lastResolved.bufferPercent
    : null;
}

/**
 * The buffer to apply to an approximate local price, or `null`.
 *
 * `null` for no active policy, an out-of-band rate, two sellers disagreeing,
 * and any transport failure older than the grace window. The caller renders no
 * local price for all of them.
 */
export default async function fetchFxBuffer(
  now: Date = new Date(),
): Promise<FxBufferPercent | null> {
  let payload: z.infer<typeof fxBufferSchema> | undefined;

  try {
    payload = await requestStorefrontJson(
      {
        url: getStorefrontApiUrl(STOREFRONT_FX_BUFFER_PATH).toString(),
        schema: fxBufferSchema,
        subject: 'FX buffer',
      },
      {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        cachePolicy: {
          next: { revalidate: CACHE_SECONDS, tags: ['fx-buffer'] },
        },
      },
    );
  } catch {
    // Every transport and shape failure lands here: `requestStorefrontJson`
    // throws on a non-2xx and on a payload the schema rejects.
    return withinGrace(now);
  }

  const buffer = payload?.buffer ?? null;

  if (buffer === null) {
    // A served answer, not a failure: forget the old value so a deactivated
    // buffer stops applying instead of ageing out over the grace window.
    lastResolved = null;

    return null;
  }

  const { bufferPercent } = buffer;

  if (
    bufferPercent < MIN_BUFFER_PERCENT ||
    bufferPercent > MAX_BUFFER_PERCENT
  ) {
    lastResolved = null;

    return null;
  }

  lastResolved = { bufferPercent, at: now.getTime() };

  return bufferPercent;
}

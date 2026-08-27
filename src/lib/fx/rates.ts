/**
 * The indicative exchange rate behind the approximate local price.
 *
 * ## No `import 'server-only'`, deliberately
 *
 * This module is server-only in fact — it is called from Server Components and
 * nothing imports it into a client bundle. The guard is still left out, because
 * `server-only`'s default export throws outside Next's bundler condition, which
 * means every test file that imports this one dies at module load with
 * *"This module cannot be imported from a Client Component module."* That is
 * not a hypothetical: it took out this file's own tests on first run, and it is
 * the same reason `read-model.ts` refuses the guard.
 *
 * The boundary is held by `test/client-bundle-boundary.test.ts` instead, which
 * checks what actually ends up in the client bundle rather than asking a
 * module to police itself.
 *
 * ## What this is for, and what it must never become
 *
 * ADR-003 §3: *"An approximate local-currency display may be added later, but
 * it must be clearly labelled and **must not change the actual charge
 * currency**."* Everything here serves the first half of that sentence and is
 * deliberately unable to serve the second.
 *
 * The value this produces is **not a `Money`**. `Money` models an amount
 * somebody is actually charged, and its `currency` is on the cross-repository
 * wire. An approximate figure that leaked into that type could reach a Stripe
 * session, a `product_offers` row or an order line, and nothing in those paths
 * would know it was a guess. `IndicativePrice` is a separate type for that
 * reason alone.
 *
 * ## Source
 *
 * Frankfurter v2 (`api.frankfurter.dev`) — MIT, no API key, no card, no quota,
 * self-hostable if the public instance ever dies. Chosen over the alternatives
 * because it is the only free source that carries **FJD**: the ECB reference
 * set does not include it, and most free FX APIs are ECB-backed.
 *
 * Each currency is pinned to its own **central bank** rather than taking the
 * default aggregate, so the number shown to a buyer is the one their own
 * central bank published:
 *
 * - AUD → `RBA`, Reserve Bank of Australia
 * - PHP → `BSP`, Bangko Sentral ng Pilipinas
 * - FJD → `RBF`, Reserve Bank of Fiji
 *
 * ## Why `/v2/rate/{base}/{quote}` and not `/latest?symbols=`
 *
 * There is a real trap in this API, and choosing the right endpoint is how it
 * is avoided rather than handled.
 *
 * `/latest?symbols=…` returns a `rates` **object** and, for a currency it does
 * not carry, answers **HTTP 200 with the key silently absent** — so
 * `response.ok` proves nothing and a naive read yields `undefined`.
 *
 * `/v2/rate/{base}/{quote}` returns a **scalar** `rate` and fails loudly
 * instead. Verified against the live API on 2026-08-28:
 *
 * - `USD/XYZ` → `422 {"message":"invalid currency: XYZ"}`
 * - `USD/FJD?providers=RBA` (a bank that does not publish FJD) → `404`
 * - `USD/AUD?providers=RBA` → `200 {"date":"2026-08-27","base":"USD","quote":"AUD","rate":1.3922}`
 *
 * The shape is checked anyway — `quote` is compared against what was asked for,
 * so a response for the wrong currency cannot be read as the right one.
 *
 * ## Everything failed resolves to `null`
 *
 * Network, timeout, non-200, malformed body, wrong quote, implausible value,
 * stale date. A `null` rate must render **no local price at all** — never a
 * blank, never a zero, never a dash where a number should be. An approximate
 * price that is wrong is worse than no approximate price, because the buyer
 * cannot tell the difference and it is the one number on the page they did not
 * agree to be charged.
 */

export type IndicativeCurrency = 'AUD' | 'PHP' | 'FJD';

export type IndicativeRate = {
  currency: IndicativeCurrency;
  /** Units of `currency` per 1 USD. */
  rate: number;
  /** The date the rate was published, `YYYY-MM-DD`, as returned. */
  asOf: string;
};

/** The central bank each currency is quoted from. */
const PROVIDERS: Record<IndicativeCurrency, string> = {
  AUD: 'RBA',
  PHP: 'BSP',
  FJD: 'RBF',
};

/**
 * How long a rate may be shown after it was published.
 *
 * Seven days, not one: central banks do not publish at weekends or on public
 * holidays, and a Monday-morning shopper must not lose the local price because
 * Friday's rate is three days old. Beyond a week the number stops being
 * "approximate" and starts being "wrong", so the display suppresses itself
 * rather than ageing quietly.
 */
const MAX_RATE_AGE_DAYS = 7;

/**
 * How long a fetched rate is reused before refetching.
 *
 * Six hours. These rates move daily at most, so this is generous, and it means
 * a product page never waits on a third party — the fetch happens on one
 * request in a few thousand and every other render is served from the cache.
 */
const CACHE_SECONDS = 6 * 60 * 60;

const REQUEST_TIMEOUT_MS = 4_000;

/**
 * A sanity bound on the rate itself.
 *
 * A parsed `0`, a negative, or an absurd magnitude means something upstream
 * changed shape, and a price of `A$0.00` beside a real USD price is the exact
 * failure this module exists to prevent. The window is deliberately wide — it
 * is a shape check, not a forecast.
 */
function isPlausibleRate(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value > 0 &&
    value < 10_000
  );
}

function isFresh(asOf: string, now: Date): boolean {
  const published = new Date(`${asOf}T00:00:00Z`);

  if (Number.isNaN(published.getTime())) return false;

  const ageDays = (now.getTime() - published.getTime()) / 86_400_000;

  // A future date means the upstream clock or our own is wrong; either way it
  // is not a number to show a buyer.
  return ageDays >= -1 && ageDays <= MAX_RATE_AGE_DAYS;
}

/**
 * The indicative rate for one currency, or `null`.
 *
 * `null` for every failure — network, timeout, non-200, malformed body, missing
 * currency, implausible value, stale date. The caller cannot tell them apart on
 * purpose: there is exactly one correct response to all of them, which is to
 * show no local price.
 */
export async function fetchIndicativeRate(
  currency: IndicativeCurrency,
  now: Date = new Date(),
): Promise<IndicativeRate | null> {
  const url = `https://api.frankfurter.dev/v2/rate/USD/${currency}?providers=${PROVIDERS[currency]}`;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      next: { revalidate: CACHE_SECONDS, tags: ['fx-rates'] },
    });

    if (!response.ok) return null;

    const body: unknown = await response.json();

    if (typeof body !== 'object' || body === null) return null;

    const { rate, date, quote } = body as {
      rate?: unknown;
      date?: unknown;
      quote?: unknown;
    };

    if (typeof date !== 'string') return null;

    // The response must be for the currency that was asked for. Cheap, and it
    // means a rate can never be attributed to the wrong currency by a redirect,
    // a cache collision, or a future change to how the path is built.
    if (quote !== currency) return null;

    if (!isPlausibleRate(rate)) return null;
    if (!isFresh(date, now)) return null;

    return { currency, rate, asOf: date };
  } catch {
    return null;
  }
}

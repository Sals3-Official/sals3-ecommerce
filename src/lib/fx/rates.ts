/**
 * The indicative exchange rate behind the approximate local price.
 *
 * ## The server-only marker package is deliberately not used here
 *
 * This module is server-side in fact — it is called from Server Components and
 * nothing pulls it into a client bundle. The marker package is still left out,
 * because its default export throws outside Next's bundler condition, so every
 * test file that reaches this one dies at module load with *"This module cannot
 * be imported from a Client Component module."* That is not hypothetical: it
 * took out this file's own tests on first run, and it is the same reason
 * `read-model.ts` refuses the marker.
 *
 * The boundary is held by `test/client-bundle-boundary.test.ts` instead, which
 * checks what actually reaches the client bundle rather than asking a module to
 * police itself.
 *
 * **Note for whoever edits this comment:** that guard scans raw source with a
 * regex and cannot tell code from prose. Writing the marker's name here as a
 * quoted import statement makes the scan report this module — and everything
 * that reaches it — as violating the very rule this paragraph documents
 * compliance with. It happened on 2026-08-28. The first fix was to teach the
 * guard to strip comments; that was withdrawn, because a comment-stripping
 * regex can be fooled by a string containing a comment token, and a security
 * check that can be fooled by ordinary code is worse than an inconvenient one.
 * The guard stays strict. Describe the marker; do not spell it.
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
 * How long a successful response is reused, across instances.
 *
 * One hour (owner decision 2026-08-28), down from six.
 *
 * Worth being precise about what that buys, because it is not rate accuracy:
 * every source here is a central bank publishing **once per business day**, so
 * an hourly refresh fetches the same number roughly eight times before it
 * changes. What it buys is a shorter worst case between a rate being published
 * and a shopper seeing it, at the cost of more upstream requests against a free,
 * unmetered API. `MAX_RATE_AGE_DAYS` is what actually governs correctness.
 *
 * Failures are handled separately and differently — see `FAILURE_MEMO_MS`, and
 * the reason there is the important one.
 *
 * The timeout is 1.5s rather than 4s so the one render that does pay for a
 * refresh cannot be held up for long. Both surfaces sit on the render path with
 * no `loading.tsx`, so anything spent here is time-to-first-byte.
 */
const CACHE_SECONDS = 60 * 60;

const REQUEST_TIMEOUT_MS = 1_500;

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

  /*
    One day of future tolerance, not zero, and the comment used to claim
    otherwise — review caught the contradiction on 2026-08-28.

    The slack is for clock skew between this server and the publisher, which is
    ordinary. Anything further ahead is a broken clock somewhere and not a
    number to show a buyer.

    The cost of that slack, stated so it is not rediscovered: a server whose own
    clock is a day slow will accept a rate that is genuinely eight days old.
    That is the widest this window can be wrong, and eight-day-old is still
    approximately right for a currency that moves a fraction of a percent a day.
  */
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
async function fetchUncached(
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

/**
 * How long a **failure** is remembered before trying again.
 *
 * Five minutes, in this process only.
 *
 * `next: { revalidate }` above caches the *response*, and Next writes that
 * cache only for a `200`. So the fetch layer caches successes and nothing else:
 * while the upstream is failing — a 404 because a provider stopped publishing,
 * a 5xx, a DNS failure — **every render would issue a live request and wait for
 * it.** Both surfaces that use this sit on the render path with no
 * `loading.tsx`, so that is straight time-to-first-byte for every visitor, for
 * as long as the outage lasts. Review caught this on 2026-08-28.
 *
 * `unstable_cache` would cache the return value including `null`, but it
 * requires Next's incremental-cache context and throws outside it, which makes
 * the whole module untestable — tried, reverted. A plain map is per-instance
 * rather than shared, which is a weaker guarantee and an honest one: it turns
 * "a request per render" into "a request per instance per five minutes", and it
 * can be tested.
 *
 * Successes are deliberately not memoised here. They are already cached across
 * instances by the fetch layer, and a second TTL over the top would only add a
 * window where two callers disagree about the rate.
 */
const FAILURE_MEMO_MS = 5 * 60 * 1000;

const failureMemo = new Map<IndicativeCurrency, number>();

/** Clears the failure memo. Tests only — each case starts from a clean slate. */
export function resetRateMemoForTests(): void {
  failureMemo.clear();
}

/**
 * The indicative rate for one currency, with recent failures remembered.
 *
 * `now` is threaded rather than read inside so freshness stays testable.
 */
export async function fetchIndicativeRate(
  currency: IndicativeCurrency,
  now: Date = new Date(),
): Promise<IndicativeRate | null> {
  const failedUntil = failureMemo.get(currency);

  if (failedUntil !== undefined && failedUntil > now.getTime()) return null;

  const value = await fetchUncached(currency, now);

  if (value === null) {
    failureMemo.set(currency, now.getTime() + FAILURE_MEMO_MS);
  } else {
    failureMemo.delete(currency);
  }

  return value;
}

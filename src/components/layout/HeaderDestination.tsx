import DestinationPicker from '@/components/layout/DestinationPicker';
import { resolveDestination } from '@/lib/destination/resolve';

/**
 * The one place per render that asks where the buyer is shipping, for the
 * header's sake.
 *
 * ## Why this is its own component rather than an `async SiteHeader`
 *
 * `resolveDestination` reads `cookies()`, so whichever component calls it has
 * to be async, and that choice has a blast radius the header did not have
 * before. React renders async components only on the server: in this repo's
 * jsdom unit tests every component is a client component, so an async one
 * renders **nothing** and takes its whole subtree with it — verified 2026-08-27
 * against `@testing-library/react`, with and without a `<Suspense>` boundary.
 *
 * Making `SiteHeader` or `GuestUtilityBar` async would therefore have blanked
 * the header in `src/app/page.test.tsx`, which asserts on the search box and on
 * the utility bar's `Log In` / `Sign Up` links. Those tests would have kept
 * failing loudly, but only after being rewritten around a header that no longer
 * rendered — coverage traded for a call site.
 *
 * Keeping the async boundary at this leaf costs one file and buys two things:
 * `SiteHeader` keeps its 15 callers and its prop-free signature, and everything
 * else in the header stays a request-independent tree.
 *
 * ## About "one place per render"
 *
 * One per render *of the header*. A page that needs the destination for its own
 * content — `/cart`, for `DestinationNotice` — resolves it again rather than
 * threading it through `SiteHeader`. That is a second call, not a second read:
 * Next caches `cookies()` and `headers()` per request, so both calls see the
 * same values and neither does I/O.
 */
export default async function HeaderDestination() {
  const { destination, source } = await resolveDestination();

  return <DestinationPicker destination={destination} source={source} />;
}

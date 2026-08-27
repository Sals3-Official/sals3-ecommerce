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
 *
 * ## The cost, measured rather than assumed
 *
 * Reading `cookies()` here opts every route rendering `SiteHeader` into dynamic
 * rendering. Comparing `next build` route tables across this change, **exactly
 * two flipped from static to dynamic: `/cart` and `/categories`.** Every other
 * route was already `ƒ`, because `StorefrontCachePolicy` is `no-store` and any
 * page that fetches the catalogue was dynamic already.
 *
 * That is the correct trade rather than a regression to fix. A statically
 * generated page would serve one visitor's header to everyone — every buyer
 * would read `Ship to: Somewhere else` no matter what they had chosen, which is
 * worse than a wrong price because it is the control that is supposed to fix a
 * wrong price. Rendering the picker on the client instead would keep the two
 * pages static at the cost of a flash of the wrong destination on every load,
 * and of a header that says nothing without JavaScript.
 *
 * **The thing to watch:** any *new* route that renders `SiteHeader` is dynamic
 * from birth. If a genuinely static page is ever wanted, the picker has to move
 * out of the shared header, not lose its server value.
 */
export default async function HeaderDestination() {
  /*
    No market hint any more. It existed so the picker could not contradict the
    address bar — on `/au` a first-time visitor read "Ship to: Australia" rather
    than "Somewhere else" — and with one storefront there is no address bar to
    contradict. What the picker shows is what the buyer chose, or Global until
    they choose.
  */
  const { destination, source } = await resolveDestination();

  return <DestinationPicker destination={destination} source={source} />;
}

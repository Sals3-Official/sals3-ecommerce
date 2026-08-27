import { redirect } from 'next/navigation';
import { resolveDestination } from '@/lib/destination/resolve';
import {
  DEFAULT_MARKET,
  destinationCodeToMarket,
} from '@/lib/destination/markets';

/**
 * The bare `/` is a dispatcher, not a page.
 *
 * ## The precedence, and why it is not just geo
 *
 * `resolveDestination()` already answers "where is this buyer shopping to" in
 * ADR-003 §1's order — the stored choice first, a geo hint second, nothing
 * third. This route reuses it rather than reading geo directly, so the rule
 * lives in one place: **a returning buyer who chose the Philippines lands on
 * `/ph`, and geo never overrules that.**
 *
 * A destination with no shopfront of its own (a chosen `US`, say) falls to the
 * default market rather than 404ing. The buyer picked a delivery destination,
 * not a storefront, and the two lists are deliberately different sizes.
 *
 * ## Why a redirect rather than rendering the Australian home page here
 *
 * So there is exactly one URL per market. Rendering `/au`'s content at `/`
 * would create a second address for the same page — the duplicate the
 * `hreflang` set in the market layout exists to prevent, reintroduced at the
 * root.
 *
 * The redirect is **temporary (307), not permanent**. Which market a person
 * belongs on is a function of who is asking; a 308 would tell every browser and
 * proxy to cache "/ → /au" forever, and the next visitor from Manila would
 * never reach the dispatcher at all. This is the one redirect in the app that
 * must never be cached.
 */
export default async function RootPage() {
  const { destination } = await resolveDestination();

  redirect(`/${destinationCodeToMarket(destination.code) ?? DEFAULT_MARKET}`);
}

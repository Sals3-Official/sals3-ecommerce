import Link from 'next/link';
import Logo from '@/components/layout/Logo';
import SearchBox from '@/components/layout/SearchBox';
import GuestUtilityBar from '@/components/layout/GuestUtilityBar';
import HeaderOrdersLink from '@/components/layout/HeaderOrdersLink';
import SiteHeaderShell from '@/components/layout/SiteHeaderShell';
import { HeaderAuthProvider } from '@/components/layout/HeaderAuthContext';
import CartCountBadge from '@/components/cart/CartCountBadge';
import { CartIcon } from '@/components/icons/Icon';
import {
  DEFAULT_MARKET,
  marketHref,
  type MarketSegment,
} from '@/lib/destination/markets';

type SiteHeaderProps = {
  /**
   * The market its shopping links point into — the logo, the search box and
   * the cart.
   *
   * **Optional, and that is a compromise rather than a design.** This same
   * header renders on the account routes that deliberately stay unscoped
   * (`/login`, `/checkout/*`, `/orders/*`), and two of those surfaces
   * (`orders/loading.tsx`, `orders/[orderNumber]/not-found.tsx`) are
   * synchronous components that cannot resolve a market of their own, so a
   * required prop would have nothing honest to put in it.
   *
   * The fallback is not a new guess: before the split, those pages linked to a
   * bare `/cart`, which `next.config.ts` redirects to `/au/cart`. Behaviour is
   * unchanged — but it is still Australia decided for a buyer who may have
   * chosen otherwise, and the fix is to resolve the market from the
   * destination cookie on those routes and pass it in here.
   */
  market?: MarketSegment;
  /** Seeds the search box — the search page passes its current keyword. */
  searchTerm?: string;
};

export default function SiteHeader({
  market,
  searchTerm,
}: SiteHeaderProps = {}) {
  const shopMarket = market ?? DEFAULT_MARKET;

  return (
    <SiteHeaderShell>
      <HeaderAuthProvider>
        <GuestUtilityBar market={market} />
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-[var(--header-row-py)] transition-[padding] duration-250 ease-out sm:gap-4 sm:px-6">
          <Logo market={shopMarket} />
          <SearchBox market={shopMarket} initialTerm={searchTerm} />
          <Link
            href={marketHref(shopMarket, '/cart')}
            aria-label="Cart"
            className="flex shrink-0 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-bold text-[color:var(--header-fg)] transition-colors duration-200 hover:text-[color:var(--header-fg-hover)] hover:no-underline sm:px-3"
          >
            <CartIcon />
            <span className="hidden sm:inline">Cart</span>
            <CartCountBadge />
          </Link>
          <HeaderOrdersLink />
        </div>
      </HeaderAuthProvider>
    </SiteHeaderShell>
  );
}

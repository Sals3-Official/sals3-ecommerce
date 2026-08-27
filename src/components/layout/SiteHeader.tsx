import Link from 'next/link';
import Logo from '@/components/layout/Logo';
import SearchBox from '@/components/layout/SearchBox';
import GuestUtilityBar from '@/components/layout/GuestUtilityBar';
import HeaderOrdersLink from '@/components/layout/HeaderOrdersLink';
import SiteHeaderShell from '@/components/layout/SiteHeaderShell';
import { HeaderAuthProvider } from '@/components/layout/HeaderAuthContext';
import CartCountBadge from '@/components/cart/CartCountBadge';
import { CartIcon } from '@/components/icons/Icon';

type SiteHeaderProps = {
  /** Seeds the search box — the search page passes its current keyword. */
  searchTerm?: string;
};

/**
 * One header for every route.
 *
 * It carried a `market` prop from 2026-08-27 to 2026-08-28, threaded from every
 * page so the logo, the search box and the cart pointed into the shopfront being
 * read — and defaulting to Australia on the account routes, which have no market
 * of their own. That default is what sent a buyer with the Philippines chosen to
 * `/au` when they clicked the logo. With one storefront there is nothing to
 * thread and nothing to default: a shopping link is just a path.
 */
export default function SiteHeader({ searchTerm }: SiteHeaderProps = {}) {
  return (
    <SiteHeaderShell>
      <HeaderAuthProvider>
        <GuestUtilityBar />
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-[var(--header-row-py)] transition-[padding] duration-250 ease-out sm:gap-4 sm:px-6">
          <Logo />
          <SearchBox initialTerm={searchTerm} />
          <Link
            href="/cart"
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

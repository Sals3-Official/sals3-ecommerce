import Link from 'next/link';
import Logo from '@/components/layout/Logo';
import SearchBox from '@/components/layout/SearchBox';
import RegionButton from '@/components/layout/RegionButton';
import GuestUtilityBar from '@/components/layout/GuestUtilityBar';
import AccountHeaderLink from '@/components/layout/AccountHeaderLink';
import { HeaderAuthProvider } from '@/components/layout/HeaderAuthContext';
import CartCountBadge from '@/components/cart/CartCountBadge';
import { CartIcon } from '@/components/icons/Icon';

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
      <HeaderAuthProvider>
        <GuestUtilityBar />
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-2.5 sm:gap-4 sm:px-6">
          <Logo />
          <SearchBox />
          <RegionButton className="hidden md:flex" />
          <Link
            href="/cart"
            aria-label="Cart"
            className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-bold text-ink hover:bg-black/5 hover:no-underline sm:px-3"
          >
            <CartIcon />
            <span className="hidden sm:inline">Cart</span>
            <CartCountBadge />
          </Link>
          <Link
            href="/orders"
            className="hidden rounded-lg px-2.5 py-2 text-sm text-ink-muted hover:bg-black/5 hover:no-underline sm:block"
          >
            Orders
          </Link>
          <AccountHeaderLink />
        </div>
      </HeaderAuthProvider>
    </header>
  );
}

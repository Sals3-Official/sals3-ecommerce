import Link from 'next/link';
import Logo from '@/components/layout/Logo';
import SearchBox from '@/components/layout/SearchBox';
import RegionButton from '@/components/layout/RegionButton';
import { CartIcon, UserIcon } from '@/components/icons/Icon';

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
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
        </Link>
        <Link
          href="/orders"
          className="hidden rounded-lg px-2.5 py-2 text-sm text-ink-muted hover:bg-black/5 hover:no-underline sm:block"
        >
          Orders
        </Link>
        <Link
          href="/account"
          aria-label="My Account"
          className="flex items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 text-sm text-ink-muted hover:bg-black/5 hover:no-underline"
        >
          <span className="bg-brand-gradient flex h-7 w-7 items-center justify-center rounded-full text-white">
            <UserIcon width={16} height={16} />
          </span>
          <span className="hidden lg:inline">My Account</span>
        </Link>
      </div>
    </header>
  );
}

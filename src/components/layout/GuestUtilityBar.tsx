import Link from 'next/link';
import AccountHeaderLink from '@/components/layout/AccountHeaderLink';
import GuestAuthLinks from '@/components/layout/GuestAuthLinks';
import {
  GUEST_UTILITY_LEFT_LINKS,
  GUEST_UTILITY_RIGHT_LINKS,
} from '@/lib/guest-utility-links';

export default function GuestUtilityBar() {
  return (
    <div className="border-b border-[color:var(--header-border)]">
      <div className="mx-auto flex min-h-6 max-w-6xl items-center justify-between gap-4 px-4 py-[var(--header-utility-py)] text-xs transition-[padding] duration-250 ease-out sm:px-6">
        <nav aria-label="Feedback" className="flex items-center gap-4">
          {GUEST_UTILITY_LEFT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-bold text-[color:var(--header-strong)] transition-colors duration-200 hover:text-[color:var(--header-strong-hover)] hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <nav
          aria-label="Account and support"
          className="flex items-center gap-4 text-[color:var(--header-fg-muted)]"
        >
          {GUEST_UTILITY_RIGHT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden text-[color:var(--header-fg-muted)] transition-colors duration-200 hover:text-[color:var(--header-fg-hover)] hover:underline sm:inline"
            >
              {link.label}
            </Link>
          ))}
          {/*
            One slot, two states: `GuestAuthLinks` renders `Log In` / `Sign Up`
            only while the verified session reports signed out, and
            `AccountHeaderLink` renders the buyer's full name only once it
            reports signed in. Neither renders while the session is still
            loading, so the bar never flashes the wrong identity.
          */}
          <GuestAuthLinks />
          <AccountHeaderLink />
        </nav>
      </div>
    </div>
  );
}

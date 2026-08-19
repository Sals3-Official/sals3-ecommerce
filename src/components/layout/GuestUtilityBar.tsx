import Link from 'next/link';
import AccountHeaderLink from '@/components/layout/AccountHeaderLink';
import GuestAuthLinks from '@/components/layout/GuestAuthLinks';
import { GUEST_UTILITY_LINKS } from '@/lib/guest-utility-links';

const LINK_CLASSES =
  'font-bold text-[color:var(--header-strong)] transition-colors duration-200 hover:text-[color:var(--header-strong-hover)] hover:underline';

/**
 * The thin strip above the main header row. Everything in it is right-aligned,
 * and the rule that used to separate it from the row is gone (owner decision,
 * 2026-08-20): strip and row are one piece of chrome, gradient or white, and a
 * line across the middle only cut it in half.
 *
 * All three links carry one type style. `Sell on Sals3` and `Customer Care` were
 * muted grey until the owner levelled them with `Feedback` on 2026-08-20, so the
 * only remaining difference between them is whether they survive below `sm`.
 */
export default function GuestUtilityBar() {
  return (
    <div className="mx-auto flex min-h-6 max-w-6xl items-center justify-end gap-4 px-4 py-[var(--header-utility-py)] text-xs transition-[padding] duration-250 ease-out sm:px-6">
      <nav aria-label="Account and support" className="flex items-center gap-4">
        {GUEST_UTILITY_LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={
              link.hideOnMobile
                ? `hidden sm:inline ${LINK_CLASSES}`
                : LINK_CLASSES
            }
          >
            {link.label}
          </Link>
        ))}
        {/*
          One slot, two states: `GuestAuthLinks` renders `Log In` / `Sign Up`
          only while the verified session reports signed out, and
          `AccountHeaderLink` renders the buyer's full name only once it reports
          signed in. Neither renders while the session is still loading, so the
          bar never flashes the wrong identity.
        */}
        <GuestAuthLinks />
        <AccountHeaderLink />
      </nav>
    </div>
  );
}

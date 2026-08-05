import Link from 'next/link';
import {
  GUEST_UTILITY_LEFT_LINKS,
  GUEST_UTILITY_RIGHT_LINKS,
} from '@/lib/guest-utility-links';

export default function GuestUtilityBar() {
  return (
    <div className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-2 text-xs sm:px-6">
        <nav aria-label="Feedback" className="flex items-center gap-4">
          {GUEST_UTILITY_LEFT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="font-bold text-brand-600 transition-colors duration-200 hover:text-brand-900 hover:underline"
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <nav
          aria-label="Account and support"
          className="flex items-center gap-4 text-ink-muted"
        >
          {GUEST_UTILITY_RIGHT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hidden transition-colors duration-200 hover:text-ink hover:underline sm:inline"
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="font-bold text-ink transition-colors duration-200 hover:text-brand-600 hover:underline"
          >
            Log In
          </Link>
          <Link
            href="/signup"
            className="font-bold text-brand-600 transition-colors duration-200 hover:text-brand-900 hover:underline"
          >
            Sign Up
          </Link>
        </nav>
      </div>
    </div>
  );
}

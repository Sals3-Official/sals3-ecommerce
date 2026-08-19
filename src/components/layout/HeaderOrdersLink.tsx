'use client';

import Link from 'next/link';
import { useHeaderAuth } from '@/components/layout/HeaderAuthContext';

/**
 * `Orders` in the main header row, shown only once the verified server session
 * reports signed in. This is presentation, not authorisation: `/orders` itself
 * redirects a signed-out visitor through `getBuyerSession` in
 * `src/lib/auth/dal.ts`, and that redirect stays the security boundary (rule 19).
 * Hiding the link only stops offering a signed-out visitor a door that opens
 * onto the sign-in screen.
 */
export default function HeaderOrdersLink() {
  const { session } = useHeaderAuth();

  if (session.status !== 'signed-in') {
    return null;
  }

  return (
    <Link
      href="/orders"
      className="hidden shrink-0 rounded-lg px-2.5 py-2 text-sm font-bold text-[color:var(--header-fg)] transition-colors duration-200 hover:text-[color:var(--header-fg-hover)] hover:no-underline sm:block sm:px-3"
    >
      Orders
    </Link>
  );
}

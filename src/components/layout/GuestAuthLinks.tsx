'use client';

import Link from 'next/link';
import { useHeaderAuth } from '@/components/layout/HeaderAuthContext';

export default function GuestAuthLinks() {
  const { session } = useHeaderAuth();

  if (session.status !== 'signed-out') {
    return null;
  }

  return (
    <>
      <Link
        href="/login"
        className="font-bold text-[color:var(--header-fg)] transition-colors duration-200 hover:text-[color:var(--header-fg-hover)] hover:underline"
      >
        Log In
      </Link>
      <Link
        href="/signup"
        className="font-bold text-[color:var(--header-strong)] transition-colors duration-200 hover:text-[color:var(--header-strong-hover)] hover:underline"
      >
        Sign Up
      </Link>
    </>
  );
}

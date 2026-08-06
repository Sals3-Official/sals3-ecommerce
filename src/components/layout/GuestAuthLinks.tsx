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
    </>
  );
}

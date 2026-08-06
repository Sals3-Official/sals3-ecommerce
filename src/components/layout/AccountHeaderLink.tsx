'use client';

import AccountDropdownMenu from '@/components/layout/AccountDropdownMenu';
import { useHeaderAuth } from '@/components/layout/HeaderAuthContext';

export default function AccountHeaderLink() {
  const { session, setSignedOut } = useHeaderAuth();

  if (session.status !== 'signed-in') {
    return null;
  }

  return (
    <AccountDropdownMenu
      label={session.firstName ?? 'Account'}
      onLogoutSuccess={setSignedOut}
    />
  );
}

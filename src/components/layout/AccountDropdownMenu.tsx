'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDownIcon, UserIcon } from '@/components/icons/Icon';
import logoutServerSession from '@/lib/auth/logout-session';

type AccountDropdownMenuProps = {
  label: string;
  onLogoutSuccess: () => void;
};

export default function AccountDropdownMenu({
  label,
  onLogoutSuccess,
}: AccountDropdownMenuProps) {
  const router = useRouter();
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  async function handleLogout() {
    setError(undefined);
    setIsSigningOut(true);

    try {
      await logoutServerSession();
      setIsOpen(false);
      onLogoutSuccess();
      router.refresh();
    } catch {
      setError('Sign-out failed. Try again.');
    } finally {
      setIsSigningOut(false);
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={`${label} account menu`}
        aria-controls={menuId}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        onClick={() => {
          setIsOpen((current) => !current);
          setError(undefined);
        }}
        className="flex min-h-11 items-center gap-2 rounded-lg py-1.5 pr-2 pl-1.5 text-sm text-brand-700 hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 focus-visible:outline-none"
      >
        <span className="bg-brand-gradient flex h-7 w-7 items-center justify-center rounded-full text-white">
          <UserIcon width={16} height={16} />
        </span>
        <span className="hidden max-w-24 truncate lg:inline">{label}</span>
        <ChevronDownIcon
          width={14}
          height={14}
          className={`hidden transition-transform duration-150 lg:block ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account menu"
          className="absolute right-0 top-full z-40 mt-2 w-44 rounded-md border border-border bg-white p-1 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            disabled={isSigningOut}
            onClick={() => {
              handleLogout().catch(() => undefined);
            }}
            className="flex min-h-11 w-full items-center rounded-sm px-3 text-left text-sm font-semibold text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSigningOut ? 'Logging out...' : 'Log out'}
          </button>
          {error ? (
            <p role="status" className="px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

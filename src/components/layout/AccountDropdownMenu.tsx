'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ChevronDownIcon } from '@/components/icons/Icon';
import logoutServerSession from '@/lib/auth/logout-session';

type AccountDropdownMenuProps = {
  label: string;
  onLogoutSuccess: () => void;
};

/**
 * The signed-in half of the utility bar's auth slot: it takes the place `Log In`
 * and `Sign Up` occupy for a guest, so the buyer's own name is the control. The
 * old rounded avatar chip is gone by owner decision — a verified name is more
 * informative than an initial in a circle, and it removes a decorative gradient
 * from the header's hot path.
 *
 * `Orders` lives in this menu as well as in the main header row. The row link is
 * the shortcut; the menu item is what a visitor finds when they go looking for
 * their account, which is where marketplaces train them to look.
 */
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
        className="flex min-h-6 max-w-40 items-center gap-1 rounded-md px-1.5 font-bold text-[color:var(--header-fg)] transition-colors duration-200 hover:text-[color:var(--header-fg-hover)] focus-visible:ring-2 focus-visible:ring-[color:var(--header-focus-ring)] focus-visible:ring-offset-0 focus-visible:outline-none sm:max-w-56"
      >
        <span className="truncate">{label}</span>
        <ChevronDownIcon
          width={14}
          height={14}
          className={`shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Account menu"
          className="absolute top-full right-0 z-40 mt-2 w-44 rounded-md border border-border bg-white p-1 text-sm shadow-lg"
        >
          <Link
            href="/orders"
            role="menuitem"
            onClick={() => setIsOpen(false)}
            className="flex min-h-11 w-full items-center rounded-sm px-3 text-left font-semibold text-ink hover:bg-surface hover:no-underline focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-1 focus-visible:outline-none"
          >
            Orders
          </Link>
          <button
            type="button"
            role="menuitem"
            disabled={isSigningOut}
            onClick={() => {
              handleLogout().catch(() => undefined);
            }}
            className="flex min-h-11 w-full items-center rounded-sm px-3 text-left font-semibold text-red-700 hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-600 focus-visible:ring-offset-1 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
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

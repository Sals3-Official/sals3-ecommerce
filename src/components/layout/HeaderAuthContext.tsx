'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type HeaderAuthSession =
  | { status: 'loading' }
  | { status: 'signed-out' }
  | { status: 'signed-in'; firstName?: string };

type HeaderAuthContextValue = {
  session: HeaderAuthSession;
  setSignedOut: () => void;
};

const HeaderAuthContext = createContext<HeaderAuthContextValue | undefined>(
  undefined,
);

function getSignedInFirstName(value: unknown) {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('signedIn' in value) ||
    value.signedIn !== true
  ) {
    return undefined;
  }

  if (
    'firstName' in value &&
    typeof value.firstName === 'string' &&
    value.firstName.trim()
  ) {
    return value.firstName;
  }

  return '';
}

export function HeaderAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<HeaderAuthSession>({
    status: 'loading',
  });

  useEffect(() => {
    let isMounted = true;

    async function loadSession() {
      try {
        const response = await fetch('/api/auth/session', {
          cache: 'no-store',
        });

        if (!response.ok) {
          setSession({ status: 'signed-out' });
          return;
        }

        const firstName = getSignedInFirstName(await response.json());

        if (!isMounted) {
          return;
        }

        setSession(
          firstName === undefined
            ? { status: 'signed-out' }
            : { status: 'signed-in', ...(firstName ? { firstName } : {}) },
        );
      } catch {
        if (isMounted) {
          setSession({ status: 'signed-out' });
        }
      }
    }

    loadSession().catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<HeaderAuthContextValue>(
    () => ({
      session,
      setSignedOut: () => {
        setSession({ status: 'signed-out' });
      },
    }),
    [session],
  );

  return (
    <HeaderAuthContext.Provider value={value}>
      {children}
    </HeaderAuthContext.Provider>
  );
}

export function useHeaderAuth() {
  const value = useContext(HeaderAuthContext);

  if (!value) {
    throw new Error('HeaderAuthProvider is missing.');
  }

  return value;
}

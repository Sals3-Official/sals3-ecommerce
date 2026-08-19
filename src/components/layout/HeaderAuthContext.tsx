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
  | { status: 'signed-in'; fullName?: string };

type HeaderAuthContextValue = {
  session: HeaderAuthSession;
  setSignedOut: () => void;
};

const HeaderAuthContext = createContext<HeaderAuthContextValue | undefined>(
  undefined,
);

function getSignedInFullName(value: unknown) {
  if (
    typeof value !== 'object' ||
    value === null ||
    !('signedIn' in value) ||
    value.signedIn !== true
  ) {
    return undefined;
  }

  if (
    'fullName' in value &&
    typeof value.fullName === 'string' &&
    value.fullName.trim()
  ) {
    return value.fullName;
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

        const fullName = getSignedInFullName(await response.json());

        if (!isMounted) {
          return;
        }

        setSession(
          fullName === undefined
            ? { status: 'signed-out' }
            : { status: 'signed-in', ...(fullName ? { fullName } : {}) },
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

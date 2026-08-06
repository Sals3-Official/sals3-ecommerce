import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HeaderAuthProvider } from './HeaderAuthContext';
import AccountHeaderLink from './AccountHeaderLink';

const routerRefresh = vi.hoisted(() => vi.fn());
const logoutServerSession = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

vi.mock('@/lib/auth/logout-session', () => ({
  default: logoutServerSession,
}));

beforeEach(() => {
  routerRefresh.mockClear();
  logoutServerSession.mockReset();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function renderWithHeaderAuth() {
  render(
    <HeaderAuthProvider>
      <AccountHeaderLink />
    </HeaderAuthProvider>,
  );
}

describe('AccountHeaderLink', () => {
  it('does not show the account link when there is no verified session', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ signedIn: false }), {
          status: 200,
        }),
      ),
    );

    renderWithHeaderAuth();

    await waitFor(() =>
      expect(
        screen.queryByRole('link', { name: /my account/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows the verified first name from the server session endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ signedIn: true, firstName: 'AJ' }), {
          status: 200,
        }),
      ),
    );

    renderWithHeaderAuth();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /aj account menu/i }),
      ).toHaveTextContent('AJ'),
    );
  });

  it('opens the account menu and logs out through the secure session endpoint', async () => {
    logoutServerSession.mockResolvedValue(undefined);
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ signedIn: true, firstName: 'AJ' }), {
          status: 200,
        }),
      ),
    );

    renderWithHeaderAuth();

    fireEvent.click(
      await screen.findByRole('button', { name: /aj account menu/i }),
    );
    expect(screen.getByRole('menu', { name: /account menu/i })).toBeVisible();

    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }));

    await waitFor(() => expect(logoutServerSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole('link', { name: /my account/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the menu open with recoverable feedback when logout fails', async () => {
    logoutServerSession.mockRejectedValue(new Error('nope'));
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockResolvedValue(
        new Response(JSON.stringify({ signedIn: true, firstName: 'AJ' }), {
          status: 200,
        }),
      ),
    );

    renderWithHeaderAuth();

    fireEvent.click(
      await screen.findByRole('button', { name: /aj account menu/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /sign-out failed/i,
    );
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});

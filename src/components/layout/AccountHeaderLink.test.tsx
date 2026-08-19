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

function stubSession(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(JSON.stringify(body), { status: 200 })),
  );
}

function renderWithHeaderAuth() {
  render(
    <HeaderAuthProvider>
      <AccountHeaderLink />
    </HeaderAuthProvider>,
  );
}

describe('AccountHeaderLink', () => {
  it('does not show the account menu when there is no verified session', async () => {
    stubSession({ signedIn: false });

    renderWithHeaderAuth();

    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /account menu/i }),
      ).not.toBeInTheDocument(),
    );
  });

  it('shows the verified full name from the server session endpoint', async () => {
    stubSession({ signedIn: true, fullName: 'AJ Shopper' });

    renderWithHeaderAuth();

    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /aj shopper account menu/i }),
      ).toHaveTextContent('AJ Shopper'),
    );
  });

  it('replaces the old rounded avatar with the name itself', async () => {
    stubSession({ signedIn: true, fullName: 'AJ Shopper' });

    renderWithHeaderAuth();

    const trigger = await screen.findByRole('button', {
      name: /aj shopper account menu/i,
    });

    expect(trigger.querySelector('.rounded-full')).toBeNull();
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('opens the account menu with Orders and Log out', async () => {
    stubSession({ signedIn: true, fullName: 'AJ Shopper' });

    renderWithHeaderAuth();

    fireEvent.click(
      await screen.findByRole('button', { name: /aj shopper account menu/i }),
    );

    const menu = screen.getByRole('menu', { name: /account menu/i });

    expect(menu).toBeVisible();
    expect(screen.getByRole('menuitem', { name: /orders/i })).toHaveAttribute(
      'href',
      '/orders',
    );
    expect(
      screen.getByRole('menuitem', { name: /log out/i }),
    ).toBeInTheDocument();
  });

  it('logs out through the secure session endpoint', async () => {
    logoutServerSession.mockResolvedValue(undefined);
    stubSession({ signedIn: true, fullName: 'AJ Shopper' });

    renderWithHeaderAuth();

    fireEvent.click(
      await screen.findByRole('button', { name: /aj shopper account menu/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }));

    await waitFor(() => expect(logoutServerSession).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
    expect(
      screen.queryByRole('button', { name: /account menu/i }),
    ).not.toBeInTheDocument();
  });

  it('keeps the menu open with recoverable feedback when logout fails', async () => {
    logoutServerSession.mockRejectedValue(new Error('nope'));
    stubSession({ signedIn: true, fullName: 'AJ Shopper' });

    renderWithHeaderAuth();

    fireEvent.click(
      await screen.findByRole('button', { name: /aj shopper account menu/i }),
    );
    fireEvent.click(screen.getByRole('menuitem', { name: /log out/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /sign-out failed/i,
    );
    expect(routerRefresh).not.toHaveBeenCalled();
  });
});

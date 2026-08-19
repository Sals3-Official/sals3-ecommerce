import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HeaderAuthProvider } from './HeaderAuthContext';
import HeaderOrdersLink from './HeaderOrdersLink';

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
      <HeaderOrdersLink />
    </HeaderAuthProvider>,
  );
}

describe('HeaderOrdersLink', () => {
  it('hides Orders while the session is loading and after it reports signed out', async () => {
    stubSession({ signedIn: false });

    renderWithHeaderAuth();

    expect(screen.queryByRole('link', { name: /orders/i })).toBeNull();

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /orders/i })).toBeNull(),
    );
  });

  it('hides Orders when the session endpoint fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn<typeof fetch>().mockRejectedValue(new Error('offline')),
    );

    renderWithHeaderAuth();

    await waitFor(() =>
      expect(screen.queryByRole('link', { name: /orders/i })).toBeNull(),
    );
  });

  it('shows Orders once the verified session reports signed in', async () => {
    stubSession({ signedIn: true, fullName: 'AJ Shopper' });

    renderWithHeaderAuth();

    expect(
      await screen.findByRole('link', { name: /orders/i }),
    ).toHaveAttribute('href', '/orders');
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginForm from './LoginForm';

const routerPush = vi.hoisted(() => vi.fn());
const signInWithGoogleSession = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush }),
}));

vi.mock('@/lib/auth/firebase-google-login', () => ({
  default: signInWithGoogleSession,
}));

const VALID_EMAIL = 'shopper@example.com';
const VALID_PASSWORD = 'correct-horse-1';

function getEmail() {
  return screen.getByLabelText(/email address/i);
}

function getPassword() {
  return screen.getByLabelText(/^password$/i);
}

function getContinue() {
  return screen.getByRole('button', { name: /^continue$/i });
}

function type(field: HTMLElement, value: string) {
  fireEvent.change(field, { target: { value } });
}

/** Reads a Storage through its public API so it works for jsdom's Storage and
 *  the in-memory stand-in installed by `test/setup.ts` alike. */
function dumpStorage(storage: Storage) {
  return Array.from({ length: storage.length }, (_unused, index) =>
    storage.getItem(storage.key(index) ?? ''),
  ).join('|');
}

function fillValidCredentials() {
  type(getEmail(), VALID_EMAIL);
  type(getPassword(), VALID_PASSWORD);
}

beforeEach(() => {
  routerPush.mockClear();
  signInWithGoogleSession.mockReset();
});

describe('LoginForm', () => {
  it('exposes labelled fields with the right autofill and input hints', () => {
    render(<LoginForm />);

    expect(getEmail()).toHaveAttribute('autocomplete', 'email');
    expect(getEmail()).toHaveAttribute('type', 'email');
    expect(getPassword()).toHaveAttribute('autocomplete', 'current-password');
    expect(getPassword()).toHaveAttribute('type', 'password');
  });

  it('shows no unavailable notice until the visitor acts', () => {
    render(<LoginForm />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('blocks an invalid submit, marks both fields, and shows no notice', () => {
    render(<LoginForm />);

    type(getEmail(), 'not-an-email');
    type(getPassword(), 'short');
    fireEvent.click(getContinue());

    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(getEmail()).toHaveAttribute('aria-invalid', 'true');
    expect(getPassword()).toHaveAttribute('aria-invalid', 'true');
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('binds each error to its field with aria-describedby', () => {
    render(<LoginForm />);

    type(getEmail(), 'not-an-email');
    fireEvent.click(getContinue());

    const describedBy = getEmail().getAttribute('aria-describedby');

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      /valid email address/i,
    );
  });

  it('validates a field on blur rather than only on submit', () => {
    render(<LoginForm />);

    type(getEmail(), 'nope');
    fireEvent.blur(getEmail());

    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
  });

  it('clears a field error as soon as the visitor edits it', () => {
    render(<LoginForm />);

    type(getEmail(), 'nope');
    fireEvent.blur(getEmail());
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();

    type(getEmail(), 'nope@example.com');

    expect(screen.queryByText(/valid email address/i)).not.toBeInTheDocument();
  });

  it('reports that sign-in is unavailable and discards the password on a valid submit', () => {
    render(<LoginForm />);

    fillValidCredentials();
    fireEvent.click(getContinue());

    expect(screen.getByRole('status')).toHaveTextContent(
      /not switched on yet/i,
    );
    expect(getPassword()).toHaveValue('');
    expect(getEmail()).toHaveValue(VALID_EMAIL);
  });

  it('never writes the password to web storage', () => {
    render(<LoginForm />);

    fillValidCredentials();
    fireEvent.click(getContinue());

    const stored = `${dumpStorage(window.localStorage)}|${dumpStorage(
      window.sessionStorage,
    )}`;

    expect(stored).not.toContain(VALID_PASSWORD);
  });

  it('submits nothing to a URL, so credentials cannot leak into a query string', () => {
    render(<LoginForm />);

    const form = getContinue().closest('form');

    expect(form).not.toHaveAttribute('action');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('novalidate');
  });

  it('reveals and re-masks the password without changing its value', () => {
    render(<LoginForm />);

    type(getPassword(), VALID_PASSWORD);

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));
    expect(getPassword()).toHaveAttribute('type', 'text');

    fireEvent.click(screen.getByRole('button', { name: /hide password/i }));
    expect(getPassword()).toHaveAttribute('type', 'password');
    expect(getPassword()).toHaveValue(VALID_PASSWORD);
  });

  it('starts Google sign-in, clears the password, and redirects after the server session is set', async () => {
    signInWithGoogleSession.mockResolvedValue();
    render(<LoginForm />);

    type(getPassword(), VALID_PASSWORD);
    const google = screen.getByRole('button', {
      name: /continue with google/i,
    });

    expect(google).toHaveAttribute('type', 'button');
    fireEvent.click(google);

    await waitFor(() =>
      expect(signInWithGoogleSession).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/'));
    expect(getPassword()).toHaveValue('');
  });

  it('shows a generic Google error when Firebase is not configured or the provider rejects', async () => {
    signInWithGoogleSession.mockRejectedValue(new Error('missing config'));
    render(<LoginForm />);

    fireEvent.click(
      screen.getByRole('button', { name: /continue with google/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /google sign-in could not be completed/i,
      ),
    );
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('shows missing Firebase web config when the site env is absent', async () => {
    signInWithGoogleSession.mockRejectedValue({
      code: 'auth/missing-client-config',
    });
    render(<LoginForm />);

    fireEvent.click(
      screen.getByRole('button', { name: /continue with google/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /next_public_firebase/i,
      ),
    );
  });

  it('shows server session setup failure after Google connects', async () => {
    signInWithGoogleSession.mockRejectedValue({
      code: 'auth/server-session-unavailable',
    });
    render(<LoginForm />);

    fireEvent.click(
      screen.getByRole('button', { name: /continue with google/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /firebase admin credentials/i,
      ),
    );
  });

  it('shows the Firebase Auth setup blocker when the project has no Auth config', async () => {
    signInWithGoogleSession.mockRejectedValue({
      code: 'auth/configuration-not-found',
    });
    render(<LoginForm />);

    fireEvent.click(
      screen.getByRole('button', { name: /continue with google/i }),
    );

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(
        /firebase authentication is not enabled/i,
      ),
    );
  });
});

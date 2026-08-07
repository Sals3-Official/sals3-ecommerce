import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import LoginForm from './LoginForm';

const routerReplace = vi.hoisted(() => vi.fn());
const signInWithGoogleSession = vi.hoisted(() => vi.fn<() => Promise<void>>());
const signInWithPasswordSession = vi.hoisted(() =>
  vi.fn<() => Promise<void>>(),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

vi.mock('@/lib/auth/firebase-google-login', () => ({
  default: signInWithGoogleSession,
}));

vi.mock('@/lib/auth/password-login', () => ({
  default: signInWithPasswordSession,
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
  // Anchored, or it also matches "Continue with Google".
  return screen.getByRole('button', { name: /^continue$|^signing in/i });
}

function getGoogle() {
  return screen.getByRole('button', { name: /continue with google/i });
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

async function submitValidCredentials() {
  fillValidCredentials();
  fireEvent.click(getContinue());

  await waitFor(() => expect(signInWithPasswordSession).toHaveBeenCalled());
}

beforeEach(() => {
  routerReplace.mockClear();
  signInWithGoogleSession.mockReset();
  signInWithPasswordSession.mockReset();
});

describe('LoginForm — fields and validation', () => {
  it('exposes labelled fields with the right autofill and input hints', () => {
    render(<LoginForm />);

    expect(getEmail()).toHaveAttribute('autocomplete', 'email');
    expect(getEmail()).toHaveAttribute('type', 'email');
    expect(getPassword()).toHaveAttribute('autocomplete', 'current-password');
    expect(getPassword()).toHaveAttribute('type', 'password');
  });

  it('starts with an empty alert region rather than no region at all', () => {
    render(<LoginForm />);

    // Always mounted: a live region inserted in the same tick as its content
    // is announced unreliably.
    expect(screen.getByRole('alert')).toHaveTextContent('');
  });

  it('blocks an invalid submit, marks both fields, and calls no endpoint', () => {
    render(<LoginForm />);

    type(getEmail(), 'not-an-email');
    type(getPassword(), 'short');
    fireEvent.click(getContinue());

    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    expect(getEmail()).toHaveAttribute('aria-invalid', 'true');
    expect(getPassword()).toHaveAttribute('aria-invalid', 'true');
    expect(signInWithPasswordSession).not.toHaveBeenCalled();
  });

  it('moves focus to the first invalid field after a failed submit', () => {
    render(<LoginForm />);

    type(getEmail(), 'not-an-email');
    type(getPassword(), 'short');
    fireEvent.click(getContinue());

    expect(getEmail()).toHaveFocus();
  });

  it('focuses the password when only it is invalid', () => {
    render(<LoginForm />);

    type(getEmail(), VALID_EMAIL);
    type(getPassword(), 'short');
    fireEvent.click(getContinue());

    expect(getPassword()).toHaveFocus();
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
});

describe('LoginForm — password sign-in', () => {
  it('posts the credentials once and redirects home on success', async () => {
    signInWithPasswordSession.mockResolvedValue();
    render(<LoginForm />);

    await submitValidCredentials();

    expect(signInWithPasswordSession).toHaveBeenCalledTimes(1);
    expect(signInWithPasswordSession).toHaveBeenCalledWith({
      email: VALID_EMAIL,
      password: VALID_PASSWORD,
    });
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/'));
  });

  it('replaces rather than pushes, so Back cannot return to the form', async () => {
    signInWithPasswordSession.mockResolvedValue();
    render(<LoginForm />);

    await submitValidCredentials();

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/'));
  });

  it('discards the password once it can no longer be needed', async () => {
    signInWithPasswordSession.mockResolvedValue();
    render(<LoginForm />);

    await submitValidCredentials();

    await waitFor(() => expect(getPassword()).toHaveValue(''));
  });

  it('keeps both fields after a failure so a typo can be corrected', async () => {
    signInWithPasswordSession.mockRejectedValue({
      code: 'invalid_credentials',
    });
    render(<LoginForm />);

    await submitValidCredentials();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/do not match/i),
    );
    expect(getEmail()).toHaveValue(VALID_EMAIL);
    expect(getPassword()).toHaveValue(VALID_PASSWORD);
  });

  it('never says whether the account exists', async () => {
    signInWithPasswordSession.mockRejectedValue({
      code: 'invalid_credentials',
    });
    render(<LoginForm />);

    await submitValidCredentials();

    const alert = await screen.findByRole('alert');

    expect(alert).toHaveTextContent(/do not match an account/i);
    expect(alert.textContent).not.toMatch(
      /no account|not found|already|exists/i,
    );
  });

  it('shows a wait-and-retry notice when the attempt is throttled', async () => {
    signInWithPasswordSession.mockRejectedValue({ code: 'too_many_requests' });
    render(<LoginForm />);

    await submitValidCredentials();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /too many sign-in attempts/i,
      ),
    );
  });

  it('shows a generic outage notice for an unrecognised failure', async () => {
    signInWithPasswordSession.mockRejectedValue(new Error('nope'));
    render(<LoginForm />);

    await submitValidCredentials();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /something went wrong on our side/i,
      ),
    );
  });

  it('marks the submit aria-disabled while the request is in flight', async () => {
    let settle: () => void = () => {};
    signInWithPasswordSession.mockReturnValue(
      new Promise((resolve) => {
        settle = () => resolve();
      }),
    );
    render(<LoginForm />);

    fillValidCredentials();
    fireEvent.click(getContinue());

    await waitFor(() =>
      expect(getContinue()).toHaveAttribute('aria-disabled', 'true'),
    );
    // Never the real `disabled` attribute: that would blur the button the
    // visitor just pressed.
    expect(getContinue()).not.toBeDisabled();

    settle();
  });

  it('ignores a second submit while one is already running', async () => {
    signInWithPasswordSession.mockReturnValue(new Promise(() => {}));
    render(<LoginForm />);

    fillValidCredentials();
    fireEvent.click(getContinue());
    fireEvent.click(getContinue());

    await waitFor(() =>
      expect(signInWithPasswordSession).toHaveBeenCalledTimes(1),
    );
  });

  it('clears a previous failure as soon as a field is edited', async () => {
    signInWithPasswordSession.mockRejectedValue({
      code: 'invalid_credentials',
    });
    render(<LoginForm />);

    await submitValidCredentials();
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/do not match/i),
    );

    type(getPassword(), 'another-guess-1');

    expect(screen.getByRole('alert')).toHaveTextContent('');
  });
});

describe('LoginForm — credential handling', () => {
  it('never writes the password to web storage', async () => {
    signInWithPasswordSession.mockResolvedValue();
    render(<LoginForm />);

    await submitValidCredentials();

    const stored = `${dumpStorage(window.localStorage)}|${dumpStorage(
      window.sessionStorage,
    )}`;

    expect(stored).not.toContain(VALID_PASSWORD);
  });

  it('never writes the password to web storage after a failure either', async () => {
    signInWithPasswordSession.mockRejectedValue({
      code: 'invalid_credentials',
    });
    render(<LoginForm />);

    await submitValidCredentials();

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
});

describe('LoginForm — Google sign-in', () => {
  it('starts Google sign-in, clears the password, and redirects', async () => {
    signInWithGoogleSession.mockResolvedValue();
    render(<LoginForm />);

    type(getPassword(), VALID_PASSWORD);

    expect(getGoogle()).toHaveAttribute('type', 'button');
    fireEvent.click(getGoogle());

    await waitFor(() =>
      expect(signInWithGoogleSession).toHaveBeenCalledTimes(1),
    );
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/'));
    expect(getPassword()).toHaveValue('');
  });

  it('shows a generic Google error when Firebase is not configured or the provider rejects', async () => {
    signInWithGoogleSession.mockRejectedValue(new Error('missing config'));
    render(<LoginForm />);

    fireEvent.click(getGoogle());

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /google sign-in could not be completed/i,
      ),
    );
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('shows missing Firebase web config when the site env is absent', async () => {
    signInWithGoogleSession.mockRejectedValue({
      code: 'auth/missing-client-config',
    });
    render(<LoginForm />);

    fireEvent.click(getGoogle());

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /next_public_firebase/i,
      ),
    );
  });

  it('shows server session setup failure after Google connects', async () => {
    signInWithGoogleSession.mockRejectedValue({
      code: 'auth/server-session-unavailable',
    });
    render(<LoginForm />);

    fireEvent.click(getGoogle());

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /firebase admin credentials/i,
      ),
    );
  });

  it('shows the Firebase Auth setup blocker when the project has no Auth config', async () => {
    signInWithGoogleSession.mockRejectedValue({
      code: 'auth/configuration-not-found',
    });
    render(<LoginForm />);

    fireEvent.click(getGoogle());

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /firebase authentication is not enabled/i,
      ),
    );
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import SignupForm from './SignupForm';

const routerReplace = vi.hoisted(() => vi.fn());
const signUpWithPasswordAccount = vi.hoisted(() =>
  vi.fn<() => Promise<void>>(),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: routerReplace }),
}));

vi.mock('@/lib/auth/password-signup', () => ({
  default: signUpWithPasswordAccount,
}));

const VALID_NAME = 'AJ Shopper';
const VALID_EMAIL = 'newcomer@example.com';
const VALID_PASSWORD = 'correct-horse-1';

function getName() {
  return screen.getByLabelText(/full name/i);
}

function getEmail() {
  return screen.getByLabelText(/email address/i);
}

function getPassword() {
  return screen.getByLabelText(/^password$/i);
}

function getConfirm() {
  return screen.getByLabelText(/confirm password/i);
}

function getSubmit() {
  return screen.getByRole('button', { name: /^creat/i });
}

function type(field: HTMLElement, value: string) {
  fireEvent.change(field, { target: { value } });
}

function dumpStorage(storage: Storage) {
  return Array.from({ length: storage.length }, (_unused, index) =>
    storage.getItem(storage.key(index) ?? ''),
  ).join('|');
}

function fillValidRegistration() {
  type(getName(), VALID_NAME);
  type(getEmail(), VALID_EMAIL);
  type(getPassword(), VALID_PASSWORD);
  type(getConfirm(), VALID_PASSWORD);
}

async function submitValidRegistration() {
  fillValidRegistration();
  fireEvent.click(getSubmit());

  await waitFor(() => expect(signUpWithPasswordAccount).toHaveBeenCalled());
}

beforeEach(() => {
  routerReplace.mockClear();
  signUpWithPasswordAccount.mockReset();
});

describe('SignupForm — fields and validation', () => {
  it('exposes labelled fields with the right autofill hints', () => {
    render(<SignupForm />);

    expect(getName()).toHaveAttribute('autocomplete', 'name');
    expect(getEmail()).toHaveAttribute('autocomplete', 'email');
    expect(getPassword()).toHaveAttribute('autocomplete', 'new-password');
    expect(getConfirm()).toHaveAttribute('autocomplete', 'new-password');
  });

  it('shows the length requirement as persistent guidance, not a placeholder', () => {
    render(<SignupForm />);

    expect(screen.getByText(/at least 8 characters/i)).toBeInTheDocument();
    const describedBy = getPassword().getAttribute('aria-describedby');

    expect(describedBy).toBeTruthy();
  });

  it('blocks an invalid submit and never calls the endpoint', () => {
    render(<SignupForm />);

    type(getName(), '');
    type(getEmail(), 'not-an-email');
    fireEvent.click(getSubmit());

    expect(signUpWithPasswordAccount).not.toHaveBeenCalled();
    expect(screen.getByText(/enter your name/i)).toBeInTheDocument();
  });

  it('moves focus to the topmost invalid field', () => {
    render(<SignupForm />);

    type(getEmail(), 'not-an-email');
    type(getPassword(), VALID_PASSWORD);
    type(getConfirm(), VALID_PASSWORD);
    fireEvent.click(getSubmit());

    expect(getName()).toHaveFocus();
  });

  it('rejects a mismatched confirmation and blames the confirm field', () => {
    render(<SignupForm />);

    fillValidRegistration();
    type(getConfirm(), 'a-different-password');
    fireEvent.click(getSubmit());

    expect(screen.getByText(/must match/i)).toBeInTheDocument();
    expect(getConfirm()).toHaveAttribute('aria-invalid', 'true');
    expect(getPassword()).not.toHaveAttribute('aria-invalid');
    expect(signUpWithPasswordAccount).not.toHaveBeenCalled();
  });

  it('validates on blur rather than only on submit', () => {
    render(<SignupForm />);

    type(getEmail(), 'nope');
    fireEvent.blur(getEmail());

    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();
  });

  it('clears a field error as soon as the visitor edits it', () => {
    render(<SignupForm />);

    type(getEmail(), 'nope');
    fireEvent.blur(getEmail());
    expect(screen.getByText(/valid email address/i)).toBeInTheDocument();

    type(getEmail(), VALID_EMAIL);

    expect(screen.queryByText(/valid email address/i)).not.toBeInTheDocument();
  });
});

describe('SignupForm — registration', () => {
  it('sends the name, address, and password once', async () => {
    signUpWithPasswordAccount.mockResolvedValue(undefined);
    render(<SignupForm />);

    await submitValidRegistration();

    expect(signUpWithPasswordAccount).toHaveBeenCalledTimes(1);
    expect(signUpWithPasswordAccount).toHaveBeenCalledWith({
      fullName: VALID_NAME,
      email: VALID_EMAIL,
      password: VALID_PASSWORD,
    });
  });

  it('never sends the confirmation copy, which is a form concern only', async () => {
    signUpWithPasswordAccount.mockResolvedValue(undefined);
    render(<SignupForm />);

    await submitValidRegistration();

    expect(signUpWithPasswordAccount).not.toHaveBeenCalledWith(
      expect.objectContaining({ confirmPassword: expect.anything() }),
    );
  });

  it('signs the new account in and sends it home', async () => {
    signUpWithPasswordAccount.mockResolvedValue(undefined);
    render(<SignupForm />);

    await submitValidRegistration();

    // No interstitial: the account is usable immediately, so a confirmation
    // screen would be a step with nothing to confirm.
    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/'));
    expect(
      screen.queryByRole('heading', { name: /check your email/i }),
    ).not.toBeInTheDocument();
  });

  it('replaces rather than pushes, so Back cannot return to the form', async () => {
    signUpWithPasswordAccount.mockResolvedValue(undefined);
    render(<SignupForm />);

    await submitValidRegistration();

    await waitFor(() => expect(routerReplace).toHaveBeenCalledWith('/'));
  });

  it('sends a buyer who registered mid-checkout back to checkout', async () => {
    signUpWithPasswordAccount.mockResolvedValue(undefined);
    render(<SignupForm postLoginPath="/checkout" />);

    await submitValidRegistration();

    await waitFor(() =>
      expect(routerReplace).toHaveBeenCalledWith('/checkout'),
    );
  });

  it('announces the redirect, which is otherwise silent', async () => {
    signUpWithPasswordAccount.mockResolvedValue(undefined);
    render(<SignupForm />);

    await submitValidRegistration();

    await waitFor(() =>
      expect(screen.getByRole('status')).toHaveTextContent(/signed in/i),
    );
  });

  it('reports an address that is already in use', async () => {
    signUpWithPasswordAccount.mockRejectedValue({ code: 'email_unavailable' });
    render(<SignupForm />);

    await submitValidRegistration();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /already uses that email/i,
      ),
    );
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('shows a generic notice when registration fails', async () => {
    signUpWithPasswordAccount.mockRejectedValue({
      code: 'service_unavailable',
    });
    render(<SignupForm />);

    await submitValidRegistration();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        /something went wrong on our side/i,
      ),
    );
  });

  it('shows a wait-and-retry notice when registration is throttled', async () => {
    signUpWithPasswordAccount.mockRejectedValue({ code: 'too_many_requests' });
    render(<SignupForm />);

    await submitValidRegistration();

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(/too many/i),
    );
  });

  it('ignores a second submit while one is already running', async () => {
    signUpWithPasswordAccount.mockReturnValue(new Promise(() => {}));
    render(<SignupForm />);

    fillValidRegistration();
    fireEvent.click(getSubmit());
    fireEvent.click(getSubmit());

    await waitFor(() =>
      expect(signUpWithPasswordAccount).toHaveBeenCalledTimes(1),
    );
  });
});

describe('SignupForm — credential handling', () => {
  it('discards both passwords once the account is created', async () => {
    signUpWithPasswordAccount.mockResolvedValue(undefined);
    render(<SignupForm />);

    await submitValidRegistration();

    await waitFor(() => expect(getPassword()).toHaveValue(''));
    expect(getConfirm()).toHaveValue('');
  });

  it('never writes the password to web storage', async () => {
    signUpWithPasswordAccount.mockResolvedValue(undefined);
    render(<SignupForm />);

    await submitValidRegistration();

    const stored = `${dumpStorage(window.localStorage)}|${dumpStorage(
      window.sessionStorage,
    )}`;

    expect(stored).not.toContain(VALID_PASSWORD);
  });

  it('submits nothing to a URL, so credentials cannot leak into a query string', () => {
    render(<SignupForm />);

    const form = getSubmit().closest('form');

    expect(form).not.toHaveAttribute('action');
    expect(form).toHaveAttribute('method', 'post');
    expect(form).toHaveAttribute('novalidate');
  });
});

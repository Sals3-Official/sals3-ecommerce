import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import SignupPage, { generateMetadata } from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
}));

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Signup page', () => {
  it('renders the split hero and the create-account card', () => {
    render(<SignupPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /one price\./i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { level: 2, name: /create your/i }),
    ).toBeInTheDocument();
  });

  it('collects a name, an address, and a confirmed password', () => {
    render(<SignupPage />);

    expect(screen.getByLabelText(/full name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^password$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
  });

  it('asks the password manager to generate a new credential', () => {
    render(<SignupPage />);

    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
    expect(screen.getByLabelText(/full name/i)).toHaveAttribute(
      'autocomplete',
      'name',
    );
  });

  it('points the already-registered visitor at the sign-in screen', () => {
    render(<SignupPage />);

    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('is not indexed, because a credential form has nothing to rank', () => {
    expect(generateMetadata().robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it('keeps any visitor detail out of the page title', () => {
    expect(String(generateMetadata().title)).not.toMatch(/@/);
  });
});

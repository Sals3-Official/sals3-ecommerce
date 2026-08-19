import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LoginPage, { generateMetadata } from './page';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

describe('Login page', () => {
  it('renders the hero value proposition as the page heading', async () => {
    render(await LoginPage({}));

    expect(
      screen.getByRole('heading', {
        level: 1,
        name: /one price\.\s*no surprises\./i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/shipping and tax\s+included/i),
    ).toBeInTheDocument();
  });

  it('renders the sign-in card with the brand mark and its own heading', async () => {
    render(await LoginPage({}));

    expect(
      screen.getByRole('heading', {
        level: 2,
        name: /sign in or create an account/i,
      }),
    ).toBeInTheDocument();
    expect(screen.getByAltText('Sals3')).toBeInTheDocument();
  });

  it('gives the hero photo a descriptive alternative text', async () => {
    render(await LoginPage({}));

    expect(screen.getByAltText(/shopper smiling/i)).toBeInTheDocument();
  });

  it('offers a labelled way back to the home page', async () => {
    render(await LoginPage({}));

    expect(
      screen.getByRole('link', { name: /go back to the sals3 home page/i }),
    ).toHaveAttribute('href', '/');
  });

  it('points every supporting link at the site path already used elsewhere', async () => {
    render(await LoginPage({}));

    const expected: [RegExp, string][] = [
      [/how pricing works/i, '/help/pricing'],
      [/forgot password/i, '/login/reset'],
      [/create an account/i, '/signup'],
      [/terms of use/i, '/legal/terms'],
      [/privacy policy/i, '/legal/privacy'],
    ];

    expected.forEach(([name, href]) => {
      expect(screen.getByRole('link', { name })).toHaveAttribute('href', href);
    });
  });

  it('carries an allow-listed destination across to signup', async () => {
    render(
      await LoginPage({ searchParams: Promise.resolve({ next: 'checkout' }) }),
    );

    expect(
      screen.getByRole('link', { name: /create an account/i }),
    ).toHaveAttribute('href', '/signup?next=checkout');
  });

  /*
   * The `next` parameter is a key, not a path: an attacker-supplied URL must
   * not survive the hop to signup, where it would become a link the visitor
   * trusts because it sits on a Sals3 credential screen.
   */
  it('drops a destination it does not recognise', async () => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ next: 'https://evil.example' }),
      }),
    );

    expect(
      screen.getByRole('link', { name: /create an account/i }),
    ).toHaveAttribute('href', '/signup');
  });

  it('is kept out of search and AI answer surfaces', () => {
    expect(generateMetadata().robots).toMatchObject({
      index: false,
      follow: false,
    });
  });

  it('does not leak the visitor email into the page title', () => {
    expect(generateMetadata().title).toBe('Sign in — Sals3');
  });
});

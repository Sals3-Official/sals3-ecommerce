import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import renderWithCart from '../../../test/render-with-cart';
import SignupPage, { generateMetadata } from './page';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Signup page', () => {
  it('renders a plain-English placeholder message', () => {
    renderWithCart(<SignupPage />);

    expect(
      screen.getByRole('heading', { level: 1, name: /sign up/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/not ready yet/i)).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /continue browsing/i }),
    ).toHaveAttribute('href', '/');
  });

  it('is not indexed while the page has no real functionality', () => {
    expect(generateMetadata().robots).toMatchObject({
      index: false,
      follow: false,
    });
  });
});

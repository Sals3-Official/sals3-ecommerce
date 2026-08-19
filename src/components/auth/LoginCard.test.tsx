import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LoginCard from './LoginCard';

/**
 * `postLoginPath` is optional on `LoginForm` so the existing render sites keep
 * meaning "go home". That default is convenient and silent: a card that forgot
 * to pass the destination would still compile, still render, and still sign
 * people in — just to the wrong page. This file is what makes it noisy.
 */
vi.mock('./LoginForm', () => ({
  default: ({ postLoginPath }: { postLoginPath?: string }) => (
    <div data-testid="login-form">{postLoginPath}</div>
  ),
}));

describe('LoginCard', () => {
  it('hands the form the destination the key stands for', () => {
    render(<LoginCard nextKey="checkout" />);

    expect(screen.getByTestId('login-form')).toHaveTextContent('/checkout');
    expect(
      screen.getByRole('link', { name: /create an account/i }),
    ).toHaveAttribute('href', '/signup?next=checkout');
  });

  it('falls back to the home page when no destination was requested', () => {
    render(<LoginCard />);

    expect(screen.getByTestId('login-form')).toHaveTextContent('/');
    expect(
      screen.getByRole('link', { name: /create an account/i }),
    ).toHaveAttribute('href', '/signup');
  });

  it('keeps the destination off links that lead out of the flow', () => {
    render(<LoginCard nextKey="checkout" />);

    expect(screen.getByRole('link', { name: /terms of use/i })).toHaveAttribute(
      'href',
      '/legal/terms',
    );
    expect(
      screen.getByRole('link', { name: /privacy policy/i }),
    ).toHaveAttribute('href', '/legal/privacy');
  });
});

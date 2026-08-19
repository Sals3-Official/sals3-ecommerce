import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import SignupCard from './SignupCard';

/** Same reasoning as `LoginCard.test.tsx`: the optional prop needs a witness. */
vi.mock('./SignupForm', () => ({
  default: ({ postLoginPath }: { postLoginPath?: string }) => (
    <div data-testid="signup-form">{postLoginPath}</div>
  ),
}));

describe('SignupCard', () => {
  it('hands the form the destination the key stands for', () => {
    render(<SignupCard nextKey="checkout" />);

    expect(screen.getByTestId('signup-form')).toHaveTextContent('/checkout');
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login?next=checkout',
    );
  });

  it('falls back to the home page when no destination was requested', () => {
    render(<SignupCard />);

    expect(screen.getByTestId('signup-form')).toHaveTextContent('/');
    expect(screen.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });
});

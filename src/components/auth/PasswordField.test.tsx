import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { MIN_PASSWORD_LENGTH } from '@/lib/auth/login-schema';
import PasswordField from './PasswordField';
import type { PasswordPurpose } from './password-purposes';

function renderField(purpose?: PasswordPurpose, value = '') {
  return render(
    <PasswordField
      value={value}
      purpose={purpose}
      onValueChange={vi.fn()}
      onBlurValidate={vi.fn()}
    />,
  );
}

describe('PasswordField', () => {
  it('defaults to the sign-in variant so existing call sites are unchanged', () => {
    renderField();

    const input = screen.getByLabelText(/^password$/i);

    expect(input).toHaveAttribute('autocomplete', 'current-password');
    expect(input).toHaveAttribute('name', 'password');
    expect(
      screen.getByRole('link', { name: /forgot password/i }),
    ).toBeInTheDocument();
  });

  it('asks the password manager to generate a credential on signup', () => {
    renderField('signUp');

    expect(screen.getByLabelText(/^password$/i)).toHaveAttribute(
      'autocomplete',
      'new-password',
    );
  });

  it('hides the reset link on signup, where there is no account to reset yet', () => {
    renderField('signUp');

    expect(
      screen.queryByRole('link', { name: /forgot password/i }),
    ).not.toBeInTheDocument();
  });

  it('labels and names the confirm variant distinctly', () => {
    renderField('confirm');

    const input = screen.getByLabelText(/confirm password/i);

    expect(input).toHaveAttribute('name', 'confirmPassword');
    expect(input).toHaveAttribute('autocomplete', 'new-password');
  });

  it('shows the length requirement as persistent helper text, not a placeholder', () => {
    renderField('signUp');

    const input = screen.getByLabelText(/^password$/i);
    const describedBy = input.getAttribute('aria-describedby');

    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy!)).toHaveTextContent(
      new RegExp(`at least ${MIN_PASSWORD_LENGTH} characters`, 'i'),
    );
  });

  it('keeps the helper wording identical once the requirement is met', () => {
    // The helper is an aria-describedby target. Its text must not change as the
    // visitor types, or screen readers re-announce the description on every
    // keystroke — only the icon and colour may change.
    const expected = `Must be at least ${MIN_PASSWORD_LENGTH} characters.`;

    const unmet = renderField('signUp');
    const unmetText = screen.getByText(expected).textContent;
    unmet.unmount();

    renderField('signUp', 'a'.repeat(MIN_PASSWORD_LENGTH));

    expect(unmetText).toBe(expected);
    expect(screen.getByText(expected).textContent).toBe(expected);
  });

  it('shows no length helper on the sign-in and confirm variants', () => {
    renderField('signIn');
    renderField('confirm');

    expect(
      screen.queryByText(new RegExp(`at least ${MIN_PASSWORD_LENGTH}`, 'i')),
    ).not.toBeInTheDocument();
  });

  it('keeps the reveal toggle at the 44px touch minimum', () => {
    renderField();

    expect(screen.getByRole('button', { name: /show password/i })).toHaveClass(
      'h-[44px]',
    );
  });
});

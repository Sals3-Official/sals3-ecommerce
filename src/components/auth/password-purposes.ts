export type PasswordPurpose = 'signIn' | 'signUp' | 'confirm';

type PasswordVariant = {
  readonly label: string;
  readonly name: 'password' | 'confirmPassword';
  readonly placeholder: string;
  readonly autoComplete: 'current-password' | 'new-password';
  readonly hasResetLink: boolean;
  readonly hasLengthHelper: boolean;
};

/**
 * One discriminant rather than independent `autoComplete` / `showResetLink` /
 * `label` props: the incoherent combinations (a `new-password` field offering a
 * reset link, a sign-in field showing a "create a password" hint) are then
 * unrepresentable instead of merely discouraged.
 */
export const PASSWORD_PURPOSES: Record<PasswordPurpose, PasswordVariant> = {
  signIn: {
    label: 'Password',
    name: 'password',
    placeholder: 'Enter your password',
    autoComplete: 'current-password',
    hasResetLink: true,
    hasLengthHelper: false,
  },
  signUp: {
    label: 'Password',
    name: 'password',
    placeholder: 'Create a password',
    autoComplete: 'new-password',
    hasResetLink: false,
    hasLengthHelper: true,
  },
  confirm: {
    label: 'Confirm password',
    name: 'confirmPassword',
    placeholder: 'Re-enter your password',
    autoComplete: 'new-password',
    hasResetLink: false,
    hasLengthHelper: false,
  },
};

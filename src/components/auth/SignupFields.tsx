'use client';

import type {
  SignupFieldErrors,
  SignupFieldName,
} from '@/lib/auth/signup-schema';
import EmailField from './EmailField';
import NameField from './NameField';
import PasswordField from './PasswordField';

export type SignupFieldValues = Record<SignupFieldName, string>;

type SignupFieldsProps = {
  values: SignupFieldValues;
  errors: SignupFieldErrors;
  onFieldChange: (field: SignupFieldName, value: string) => void;
  onFieldBlur: (field: SignupFieldName) => void;
};

/**
 * The four registration inputs, in the order `SIGNUP_FIELD_ORDER` declares —
 * which is what makes "focus the first invalid field" mean the topmost one.
 */
export default function SignupFields({
  values,
  errors,
  onFieldChange,
  onFieldBlur,
}: SignupFieldsProps) {
  return (
    <>
      <NameField
        value={values.fullName}
        error={errors.fullName}
        onValueChange={(value) => onFieldChange('fullName', value)}
        onBlurValidate={() => onFieldBlur('fullName')}
      />

      <EmailField
        value={values.email}
        error={errors.email}
        onValueChange={(value) => onFieldChange('email', value)}
        onBlurValidate={() => onFieldBlur('email')}
      />

      <PasswordField
        purpose="signUp"
        value={values.password}
        error={errors.password}
        onValueChange={(value) => onFieldChange('password', value)}
        onBlurValidate={() => onFieldBlur('password')}
      />

      <PasswordField
        purpose="confirm"
        value={values.confirmPassword}
        error={errors.confirmPassword}
        onValueChange={(value) => onFieldChange('confirmPassword', value)}
        onBlurValidate={() => onFieldBlur('confirmPassword')}
      />
    </>
  );
}

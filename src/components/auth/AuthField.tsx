import type { ReactNode } from 'react';
import { AUTH_ERROR_CLASS, AUTH_LABEL_CLASS } from './auth-field-styles';

type AuthFieldProps = {
  /** Must match the control's `id` so the label is programmatically bound. */
  id: string;
  label: string;
  /** Optional trailing element on the label row, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode;
  /** Rendered when validation fails. The control owns `aria-describedby`. */
  error?: string;
  children: ReactNode;
};

/**
 * Label + control + error layout shared by every auth input. The error node
 * always carries the `<id>-error` id so a control can point `aria-describedby`
 * at it, and `role="alert"` so a screen reader announces it on appearance.
 */
export default function AuthField({
  id,
  label,
  labelAside,
  error,
  children,
}: AuthFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      {labelAside ? (
        <div className="flex items-baseline justify-between gap-4">
          <label htmlFor={id} className={AUTH_LABEL_CLASS}>
            {label}
          </label>
          {labelAside}
        </div>
      ) : (
        <label htmlFor={id} className={AUTH_LABEL_CLASS}>
          {label}
        </label>
      )}

      {children}

      {error ? (
        <p id={`${id}-error`} role="alert" className={AUTH_ERROR_CLASS}>
          {error}
        </p>
      ) : null}
    </div>
  );
}

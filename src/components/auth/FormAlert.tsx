import { AlertTriangleIcon } from '@/components/icons/StatusIcon';
import { AUTH_ALERT_CLASS } from './auth-field-styles';

type FormAlertProps = {
  /** Null renders an empty region rather than removing it. */
  message: string | null;
};

/**
 * Form-level failure: a wrong credential, a throttled attempt, a network
 * fault.
 *
 * The wrapper is always mounted and always carries `role="alert"`. A live
 * region inserted in the same tick as its content is announced unreliably, so
 * the region has to exist in the accessibility tree before the text arrives.
 * `aria-atomic` makes the whole message read as one utterance rather than a
 * diff.
 *
 * Assertive, not polite: a failure the visitor must act on cannot be queued
 * behind other announcements. It sits directly above the submit button, since
 * for a form-level error the thing that went wrong is the submit itself — and
 * placing it there keeps it out of the fields the visitor is editing, so
 * nothing shifts under the cursor.
 */
export default function FormAlert({ message }: FormAlertProps) {
  return (
    <div role="alert" aria-atomic="true">
      {message ? (
        <div className={AUTH_ALERT_CLASS}>
          <AlertTriangleIcon
            width={16}
            height={16}
            className="mt-0.5 shrink-0"
          />
          <p>{message}</p>
        </div>
      ) : null}
    </div>
  );
}

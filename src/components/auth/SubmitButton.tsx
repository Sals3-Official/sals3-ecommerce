import { SpinnerIcon } from '@/components/icons/StatusIcon';
import { AUTH_PRIMARY_BUTTON_CLASS } from './auth-field-styles';

type SubmitButtonProps = {
  label: string;
  pendingLabel: string;
  isPending: boolean;
  /** True only before hydration, or while another sign-in method is running. */
  isDisabled: boolean;
};

/**
 * Primary submit control for the auth forms.
 *
 * While a request is in flight the button is marked `aria-disabled`, never
 * `disabled`. Setting the real attribute on a button that currently holds
 * focus makes the browser blur it, so a keyboard visitor who pressed Enter is
 * dropped to the top of the document mid-request and has no idea where the
 * eventual error appeared. The handler guards against a second submit instead.
 *
 * `disabled` is still correct before hydration: nothing is focused yet, and
 * the real attribute is what stops a pre-hydration click falling through to a
 * native form submit.
 *
 * The label swap is the pending signal, not the spinner: the global
 * `prefers-reduced-motion` rule in `globals.css` clamps animation duration, so
 * a spinning icon freezes at an arbitrary angle rather than slowing down.
 */
export default function SubmitButton({
  label,
  pendingLabel,
  isPending,
  isDisabled,
}: SubmitButtonProps) {
  return (
    <button
      type="submit"
      disabled={isDisabled}
      aria-disabled={isPending || undefined}
      className={`${AUTH_PRIMARY_BUTTON_CLASS} flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70 aria-disabled:cursor-wait aria-disabled:opacity-70`}
    >
      {isPending ? <SpinnerIcon width={16} height={16} /> : null}
      {isPending ? pendingLabel : label}
    </button>
  );
}

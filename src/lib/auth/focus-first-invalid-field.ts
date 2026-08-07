/**
 * Moves focus to the first field in `order` that has an error.
 *
 * Reads the control straight off the form's elements collection by `name`, so
 * no field component has to expose a ref and the caller only supplies data it
 * already has. `LOGIN_FIELD_ORDER` and `SIGNUP_FIELD_ORDER` mirror the visual
 * top-to-bottom order, so "first invalid" means the topmost one.
 *
 * Applies only to field-level failures. When a submit fails for a reason no
 * field can fix, focus stays on the submit button: the alert announces itself,
 * and keeping focus there means Enter retries.
 */
export default function focusFirstInvalidField<TField extends string>(
  form: HTMLFormElement,
  errors: Partial<Record<TField, string>>,
  order: readonly TField[],
) {
  const field = order.find((name) => errors[name]);

  if (!field) {
    return;
  }

  const control = form.elements.namedItem(field);

  if (control instanceof HTMLElement) {
    control.focus();
  }
}

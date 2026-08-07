/**
 * Shared control styling for the auth surface, so the email input, password
 * input, and both buttons stay pixel-identical without duplicated class
 * strings.
 *
 * `focus-visible:outline-none` is deliberate and always paired with a ring: the
 * global `:focus-visible` rule in `globals.css` paints a `brand-600` outline
 * that clashes with this screen's navy palette, so the outline is replaced
 * here — never simply removed.
 */

const CONTROL_BASE =
  'h-[58px] w-full rounded-2xl text-base outline-none transition-colors duration-150';

const INPUT_SKIN =
  'border border-auth-field bg-white text-auth-ink placeholder:text-auth-muted focus:border-auth-navy focus:ring-[3px] focus:ring-auth-azure/25 focus-visible:outline-none aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus:ring-red-600/25';

export const AUTH_INPUT_CLASS = `${CONTROL_BASE} ${INPUT_SKIN} px-4`;

/** Right padding clears the absolutely positioned Show/Hide button. */
export const AUTH_INPUT_WITH_TRAILING_CLASS = `${CONTROL_BASE} ${INPUT_SKIN} pr-[82px] pl-4`;

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-auth-azure/40 focus-visible:ring-offset-2';

export const AUTH_PRIMARY_BUTTON_CLASS = `${CONTROL_BASE} ${FOCUS_RING} cursor-pointer border-0 bg-auth-navy text-[15px] font-bold tracking-[0.09em] text-white uppercase hover:bg-auth-azure active:bg-auth-navy-dark`;

export const AUTH_SECONDARY_BUTTON_CLASS = `${CONTROL_BASE} ${FOCUS_RING} flex cursor-pointer items-center justify-center gap-3 border border-auth-google-border bg-white text-[15px] font-semibold text-auth-google-ink hover:border-auth-google-border-hover hover:bg-auth-tint-soft active:bg-auth-tint-strong`;

export const AUTH_LABEL_CLASS = 'text-[15px] font-medium text-auth-label';

export const AUTH_LINK_CLASS =
  'text-auth-navy underline decoration-1 underline-offset-[3px] hover:text-auth-azure';

export const AUTH_ERROR_CLASS = 'text-[13px] font-medium text-red-600';

/**
 * Persistent guidance under a control (a requirement, not a failure). Muted
 * rather than red, and it stays in place whether or not the rule is satisfied,
 * so the text bound by `aria-describedby` never changes mid-typing.
 */
export const AUTH_HELPER_CLASS =
  'flex items-center gap-1.5 text-[13px] text-auth-muted';

/** Applied to the helper row once its requirement is met. */
export const AUTH_HELPER_MET_CLASS = 'text-auth-navy';

/**
 * Boxed form-level failure.
 *
 * `red-700` rather than the `red-600` used for field errors: red-600 clears
 * 4.5:1 on white but drops to 4.40:1 on the rose-50 surface and fails. The
 * paired icon means the state is never signalled by colour alone.
 */
export const AUTH_ALERT_CLASS =
  'flex items-start gap-2.5 rounded-2xl border border-red-600/30 bg-rose-50 px-4 py-3 text-[13px] leading-relaxed text-red-700';

/**
 * Secondary control inside a notice panel. Shorter than the 58px form controls,
 * which look crushed in a tinted box, but still at the 44px touch minimum.
 */
export const AUTH_INLINE_BUTTON_CLASS = `${FOCUS_RING} inline-flex min-h-[44px] cursor-pointer items-center justify-center gap-2 rounded-xl border border-auth-navy bg-transparent px-4 text-sm font-semibold text-auth-navy transition-colors duration-150 hover:bg-auth-tint aria-disabled:cursor-not-allowed aria-disabled:opacity-70`;

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

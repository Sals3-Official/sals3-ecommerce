type IconProps = {
  width?: number;
  height?: number;
  className?: string;
};

/**
 * Status glyphs for the auth surface: an alert marker, an envelope, and a
 * spinner.
 *
 * Kept out of `Icon.tsx` because that barrel is already oversized, and these
 * three are only ever used together by the credential screens.
 */

export function AlertTriangleIcon({
  width = 18,
  height = 18,
  className,
}: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

export function MailIcon({ width = 18, height = 18, className }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      className={className}
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="m2 7 10 6 10-6" />
    </svg>
  );
}

export function SpinnerIcon({ width = 18, height = 18, className }: IconProps) {
  return (
    <svg
      width={width}
      height={height}
      className={`animate-spin ${className ?? ''}`}
      viewBox="0 0 24 24"
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <circle cx="12" cy="12" r="9" opacity={0.3} />
      <path d="M21 12a9 9 0 0 0-9-9" />
    </svg>
  );
}

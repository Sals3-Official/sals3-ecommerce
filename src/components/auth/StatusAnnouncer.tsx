type StatusAnnouncerProps = {
  message: string;
};

/**
 * Screen-reader-only progress ticker.
 *
 * Carries the states a sighted visitor reads somewhere other than a live
 * region — the button label swapping to "Signing in", a client-side redirect
 * that is otherwise completely silent, a confirmation rendered inside a panel
 * that deliberately is not a live region.
 *
 * Polite, because none of it needs to interrupt. Always mounted so the text
 * change is what triggers the announcement.
 */
export default function StatusAnnouncer({ message }: StatusAnnouncerProps) {
  return (
    <p role="status" aria-atomic="true" className="sr-only">
      {message}
    </p>
  );
}

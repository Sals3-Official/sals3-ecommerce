'use client';

import Spinner from '@/components/ui/Spinner';

type LoadingOverlayProps = {
  isVisible: boolean;
  label: string;
};

/**
 * A full-screen "we are working on it" curtain.
 *
 * The checkout steps wait on real upstream work — a CJ freight quote, then a
 * Portal intent and a Stripe session — and those take long enough that a
 * disabled button alone reads as a dead click. This covers the page so the wait
 * is unmistakable and so a second click cannot land on anything underneath.
 *
 * Kept in the DOM only while visible, but the live region announces the label,
 * so the wait is spoken once in words while `Spinner` stays `aria-hidden`.
 * `role="alert"` rather than `status`: this interrupts the buyer's task, and it
 * should be announced immediately rather than at the next pause.
 */
export default function LoadingOverlay({
  isVisible,
  label,
}: LoadingOverlayProps) {
  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-busy="true"
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-surface/85 backdrop-blur-sm"
    >
      <Spinner size="lg" className="text-brand-blue-500" />
      <p className="font-display text-sm font-bold tracking-[0.18em] text-ink uppercase">
        {label}
      </p>
    </div>
  );
}

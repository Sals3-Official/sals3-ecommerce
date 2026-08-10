'use client';

type KlaviyoConsentBannerProps = {
  onAccept: () => void;
  onDecline: () => void;
};

export default function KlaviyoConsentBanner({
  onAccept,
  onDecline,
}: KlaviyoConsentBannerProps) {
  return (
    <section
      aria-labelledby="klaviyo-consent-title"
      className="fixed right-0 bottom-0 left-0 z-50 border-t border-border bg-white/95 px-4 py-4 shadow-[0_-16px_40px_rgba(19,31,36,0.14)] backdrop-blur-md sm:right-auto sm:bottom-4 sm:left-4 sm:max-w-md sm:rounded-xl sm:border"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:max-w-none">
        <div>
          <h2 id="klaviyo-consent-title" className="text-sm font-bold text-ink">
            Analytics consent
          </h2>
          <p className="mt-1 text-sm leading-6 text-ink-muted">
            Sals3 can use Klaviyo to remember product views, cart activity, and
            signed-in profile details for better shopping messages. No
            passwords, payment data, session cookies, or precise location are
            sent.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onDecline}
            className="min-h-11 cursor-pointer rounded-lg border border-border px-4 text-sm font-bold text-ink transition-all duration-200 hover:bg-black/5 focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 focus:outline-none active:scale-[0.98]"
          >
            Decline
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="min-h-11 cursor-pointer rounded-lg bg-brand-600 px-4 text-sm font-bold text-white transition-all duration-200 hover:bg-brand-700 focus:ring-2 focus:ring-brand-600 focus:ring-offset-2 focus:outline-none active:scale-[0.98]"
          >
            Accept analytics
          </button>
        </div>
      </div>
    </section>
  );
}

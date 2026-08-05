import Link from 'next/link';

type AuthComingSoonProps = {
  heading: string;
  message: string;
};

export default function AuthComingSoon({
  heading,
  message,
}: AuthComingSoonProps) {
  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <h1 className="text-xl font-bold">{heading}</h1>
      <p className="text-sm text-ink-muted">{message}</p>
      <Link
        href="/"
        className="mt-2 rounded-lg border border-brand-600 px-5 py-2.5 text-sm font-bold text-brand-600 transition-all duration-200 hover:bg-brand-600/10 hover:no-underline active:scale-[0.98]"
      >
        Continue browsing
      </Link>
    </div>
  );
}

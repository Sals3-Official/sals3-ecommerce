import type { Metadata } from 'next';
import Link from 'next/link';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { SITE_NAME } from '@/lib/site';

export const metadata: Metadata = {
  title: `No such category — ${SITE_NAME}`,
  robots: { index: false, follow: true },
};

/**
 * A real 404 (via `notFound()` in `page.tsx`), not a soft 404: the slug isn't
 * one of the taxonomy's 21 departments, so this address genuinely has no
 * page rather than an empty one. The message never echoes the invalid slug
 * back — nothing here needs to, and it keeps arbitrary path input off the
 * rendered page entirely.
 */
export default function CategoryNotFound() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-5 pb-16">
        <div className="mx-auto mt-10 max-w-xl rounded-xl border border-border bg-white p-8">
          <p className="m-0 text-xs font-semibold tracking-wide text-brand-600 uppercase">
            Not a category
          </p>
          <h1 className="mt-1.5 mb-0 text-2xl font-bold text-ink">
            No such category
          </h1>
          <p className="mt-3 mb-0 text-sm leading-relaxed text-ink-muted">
            Sals3 files its catalogue under 21 categories. This address is not
            one of them, so there is nothing to list — rather than show an empty
            grid that looks like a category with no stock.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <Link
              href="/categories"
              className="bg-brand-gradient flex min-h-11 items-center rounded-lg px-5.5 text-sm font-bold text-white hover:no-underline"
            >
              All categories
            </Link>
            <Link
              href="/"
              className="flex min-h-11 items-center rounded-lg border border-brand-blue-500 px-5.5 text-sm font-bold text-brand-blue-900 hover:no-underline"
            >
              Home
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

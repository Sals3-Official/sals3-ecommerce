import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import { SkeletonBar } from '@/components/ui/Skeleton';

/**
 * Shown while the department list resolves.
 *
 * The heading is real, not a bar: "All departments" is fixed copy in
 * `categories/page.tsx:44`, so skeletonising it would hide a fact the page
 * already knows. Only the list — whose length and names come from the Portal —
 * is unknown.
 */
export default function CategoriesLoading() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-5 pb-16">
        <h1 className="mb-1 text-2xl font-bold">All departments</h1>
        <div aria-busy className="animate-s3pulse mt-4 flex flex-col gap-2">
          {[
            '62%',
            '48%',
            '71%',
            '55%',
            '44%',
            '66%',
            '52%',
            '59%',
            '46%',
            '68%',
            '50%',
            '57%',
          ].map((width, index) => (
            <div
              key={`${width}-${String(index)}`}
              className="rounded-lg border border-border bg-white px-4 py-3.5"
            >
              <SkeletonBar width={width} height={10} />
            </div>
          ))}
        </div>
        <p aria-live="polite" className="mt-3.5 text-[13px] text-ink-muted">
          Loading departments…
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

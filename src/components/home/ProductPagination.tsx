import Link from 'next/link';

type ProductPaginationProps = {
  currentPage: number;
  totalPages: number;
};

function getPageHref(page: number): string {
  return page === 1 ? '/#for-you' : `/?page=${page}#for-you`;
}

function PaginationLink({
  page,
  children,
  ariaLabel,
}: {
  page: number;
  children: string;
  ariaLabel: string;
}) {
  return (
    <Link
      href={getPageHref(page)}
      scroll={false}
      aria-label={ariaLabel}
      className="flex min-h-11 items-center rounded-lg border border-border-strong bg-white px-4 text-sm font-bold text-brand-600 hover:border-brand-600 hover:no-underline"
    >
      {children}
    </Link>
  );
}

export default function ProductPagination({
  currentPage,
  totalPages,
}: ProductPaginationProps) {
  const hasPrevious = currentPage > 1;
  const hasNext = currentPage < totalPages;

  return (
    <nav
      className="mt-5 flex flex-wrap items-center justify-center gap-3"
      aria-label="Product pages"
    >
      {hasPrevious ? (
        <PaginationLink
          page={currentPage - 1}
          ariaLabel="Go to previous product page"
        >
          Previous
        </PaginationLink>
      ) : null}
      <span
        className="flex min-h-11 items-center rounded-lg border border-border bg-surface px-4 text-sm font-bold text-ink"
        aria-current="page"
      >
        Page {currentPage} of {totalPages}
      </span>
      {hasNext ? (
        <PaginationLink
          page={currentPage + 1}
          ariaLabel="Go to next product page"
        >
          Next
        </PaginationLink>
      ) : null}
    </nav>
  );
}

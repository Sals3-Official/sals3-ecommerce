import Link from 'next/link';
import { buildPageList } from '@/lib/pagination';
import { ChevronLeftIcon, ChevronRightIcon } from '@/components/icons/Icon';

type ProductPaginationProps = {
  currentPage: number;
  totalPages: number;
  /**
   * Required, with no default any more.
   *
   * It used to default to the home "For You" section's own address, `/`. Every
   * shopping route once lived one market deep, so there was no route-independent
   * address left to fall back to — and a default that quietly meant "Australia"
   * was exactly the market-less link that refactor existed to remove. Each caller
   * builds its own, which is what kept route knowledge out of here to begin
   * with.
   */
  getPageHref: (page: number) => string;
};

function PageNumberLink({
  page,
  href,
  isCurrent,
}: {
  page: number;
  href: string;
  isCurrent: boolean;
}) {
  if (isCurrent) {
    return (
      <span
        aria-current="page"
        className="flex h-11 w-11 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white"
      >
        {page}
      </span>
    );
  }

  return (
    <Link
      href={href}
      scroll={false}
      aria-label={`Go to page ${page}`}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-strong bg-white text-sm font-bold text-ink hover:border-brand-600 hover:no-underline"
    >
      {page}
    </Link>
  );
}

function StepControl({
  page,
  href,
  direction,
  ariaLabel,
}: {
  page: number | null;
  href: string | null;
  direction: 'previous' | 'next';
  ariaLabel: string;
}) {
  const Icon = direction === 'previous' ? ChevronLeftIcon : ChevronRightIcon;

  if (page === null || href === null) {
    return (
      <span
        aria-disabled="true"
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-ink-faint"
      >
        <Icon width={18} height={18} />
      </span>
    );
  }

  return (
    <Link
      href={href}
      scroll={false}
      aria-label={ariaLabel}
      className="flex h-11 w-11 items-center justify-center rounded-lg border border-border-strong bg-white text-ink hover:border-brand-600 hover:no-underline"
    >
      <Icon width={18} height={18} />
    </Link>
  );
}

export default function ProductPagination({
  currentPage,
  totalPages,
  getPageHref,
}: ProductPaginationProps) {
  const pageItems = buildPageList(currentPage, totalPages);

  if (totalPages <= 1) {
    return null;
  }

  return (
    <nav className="mt-5 flex justify-center" aria-label="Product pages">
      <ul className="flex flex-wrap items-center justify-center gap-2">
        <li>
          <StepControl
            page={currentPage > 1 ? currentPage - 1 : null}
            href={currentPage > 1 ? getPageHref(currentPage - 1) : null}
            direction="previous"
            ariaLabel="Go to previous product page"
          />
        </li>
        {pageItems.map((item) =>
          typeof item === 'number' ? (
            <li key={item}>
              <PageNumberLink
                page={item}
                href={getPageHref(item)}
                isCurrent={item === currentPage}
              />
            </li>
          ) : (
            <li
              key={`ellipsis-${item.ellipsisAfter}`}
              className="px-1 text-sm text-ink-faint"
              aria-hidden="true"
            >
              …
            </li>
          ),
        )}
        <li>
          <StepControl
            page={currentPage < totalPages ? currentPage + 1 : null}
            href={
              currentPage < totalPages ? getPageHref(currentPage + 1) : null
            }
            direction="next"
            ariaLabel="Go to next product page"
          />
        </li>
      </ul>
    </nav>
  );
}

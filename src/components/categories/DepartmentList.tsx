import Link from 'next/link';
import type { Category } from '@/lib/home-placeholder-data';
import { ChevronRightIcon } from '@/components/icons/Icon';
import LinkPendingVeil from '@/components/ui/LinkPendingVeil';

type DepartmentListProps = {
  departments: Category[];
};

/**
 * The "All departments" list: one row per main category, name and chevron,
 * hairline-separated inside a single card.
 *
 * A list, not the home page's icon grid. This surface exists to be scanned
 * and read alphabetically — 21 rows of plain text beat 21 tiles a buyer has
 * to visually parse, and it needs no icon for the two departments that
 * deliberately have none.
 */
export default function DepartmentList({ departments }: DepartmentListProps) {
  if (departments.length === 0) {
    return (
      <p className="m-0 rounded-xl border border-border bg-white px-4 py-8 text-center text-sm text-ink-muted">
        No departments are listed yet.
      </p>
    );
  }

  return (
    <nav
      aria-label="All departments"
      className="overflow-hidden rounded-xl border border-border bg-white"
    >
      <ul className="m-0 flex list-none flex-col p-0">
        {departments.map((department) => (
          <li
            key={department.id}
            className="border-b border-border last:border-b-0"
          >
            <Link
              href={`/c/${department.id}`}
              className="relative flex min-h-11 items-center justify-between gap-4 px-4 py-3 text-[15px] text-ink transition duration-200 ease-out hover:bg-surface hover:no-underline focus-visible:-outline-offset-2"
            >
              {/* Square: this row is a hairline-separated slice of one card,
                  so a rounded veil would show its corners mid-list. */}
              <LinkPendingVeil radiusClass="rounded-none" />
              {department.name}
              <ChevronRightIcon
                width={16}
                height={16}
                className="shrink-0 text-ink-faint"
              />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

import Link from 'next/link';
import type { Category } from '@/lib/home-placeholder-data';

type CategoryStripProps = {
  categories: Category[];
};

export default function CategoryStrip({ categories }: CategoryStripProps) {
  return (
    <nav
      aria-label="Categories"
      className="flex gap-2.5 overflow-x-auto border-b border-border pb-3.5"
    >
      {categories.map((category) => (
        <Link
          key={category.id}
          href={`/c/${category.id}`}
          className="flex w-24 shrink-0 flex-col items-center gap-2 rounded-xl px-1 py-2.5 hover:bg-black/5 hover:no-underline"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-600/10 font-mono text-xs text-brand-600">
            {category.code}
          </span>
          <span className="text-center text-xs leading-tight text-ink-muted">
            {category.name}
          </span>
        </Link>
      ))}
    </nav>
  );
}

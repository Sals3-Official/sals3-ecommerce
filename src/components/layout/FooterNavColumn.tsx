import Link from 'next/link';
import type { FooterColumn } from '@/lib/footer-data';

type FooterNavColumnProps = {
  column: FooterColumn;
};

export default function FooterNavColumn({ column }: FooterNavColumnProps) {
  return (
    <nav aria-label={column.title} className="flex flex-col gap-0.5">
      <div className="mb-2.5 text-xs font-bold tracking-wider text-footer-label uppercase">
        {column.title}
      </div>
      {column.links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className="py-1.5 text-sm leading-snug text-footer-link hover:text-white hover:no-underline"
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

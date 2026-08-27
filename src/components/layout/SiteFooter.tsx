import FooterBrand from '@/components/layout/FooterBrand';
import FooterNavColumn from '@/components/layout/FooterNavColumn';
import FooterCategoryLinks from '@/components/layout/FooterCategoryLinks';
import { FOOTER_COLUMNS } from '@/lib/footer-data';
import { categories } from '@/lib/home-placeholder-data';

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-surface-dark text-footer-ink">
      <div className="mx-auto max-w-6xl px-6 pt-11">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-9 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1.15fr)_repeat(3,minmax(0,0.85fr))] lg:gap-8">
          <FooterBrand />
          {FOOTER_COLUMNS.map((column) => (
            <FooterNavColumn key={column.title} column={column} />
          ))}
        </div>

        <FooterCategoryLinks categories={categories} />

        <div className="py-6 text-xs leading-relaxed text-footer-label">
          © {year} SALS3. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

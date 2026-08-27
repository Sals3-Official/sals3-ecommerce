import FooterBrand from '@/components/layout/FooterBrand';
import FooterNavColumn from '@/components/layout/FooterNavColumn';
import FooterCategoryLinks from '@/components/layout/FooterCategoryLinks';
import { FOOTER_COLUMNS } from '@/lib/footer-data';
import { categories } from '@/lib/home-placeholder-data';
import { DEFAULT_MARKET, type MarketSegment } from '@/lib/destination/markets';

/**
 * `market` is optional for the same reason it is on `SiteHeader`: the account
 * routes render this footer with no market in their URL. Only the category
 * links use it — `FOOTER_COLUMNS` is help, legal and account pages, none of
 * which are market-scoped.
 */
export default function SiteFooter({
  market,
}: { market?: MarketSegment } = {}) {
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

        <FooterCategoryLinks
          categories={categories}
          market={market ?? DEFAULT_MARKET}
        />

        <div className="py-6 text-xs leading-relaxed text-footer-label">
          © {year} SALS3. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

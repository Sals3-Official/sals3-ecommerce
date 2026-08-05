import type { Category } from '@/lib/home-placeholder-data';
import CategoryScroller from '@/components/home/CategoryScroller';
import CategoryRowItem from '@/components/home/CategoryRowItem';

/**
 * Build spec section 15.1: "8 to 10 category icons. Horizontal scroll. It
 * shows the true top categories, not a fixed list." The list is therefore
 * fed live from the storefront feed by the caller (`src/app/page.tsx`) and
 * only capped here — deliberately not a hardcoded array. If the feed
 * returns fewer than 8, that is the catalogue's real state, not something
 * to pad with invented categories.
 */
const MAX_CATEGORIES = 10;

type CategoryRowProps = {
  categories: Category[];
};

export default function CategoryRow({ categories }: CategoryRowProps) {
  const visibleCategories = categories.slice(0, MAX_CATEGORIES);

  if (visibleCategories.length === 0) {
    return null;
  }

  return (
    <CategoryScroller label="Categories">
      {visibleCategories.map((category) => (
        <CategoryRowItem key={category.id} category={category} />
      ))}
    </CategoryScroller>
  );
}

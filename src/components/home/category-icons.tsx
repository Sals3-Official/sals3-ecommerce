import type { ReactNode } from 'react';

/**
 * Inline 24x24 line-icon geometry, keyed by category id. Inline SVG rather
 * than an icon package: no new dependency, no network request, no layout
 * shift, and the stroke inherits `currentColor` so one icon serves every
 * state (build spec sections 11.4, 4.2 — the icon stays quiet grey/brand,
 * it never competes with a product photo).
 *
 * The live storefront feed (`ProductCategorySchema`) has no icon field, so
 * this map is the only icon source. It intentionally does NOT cover every
 * possible CJ category id — an unmapped id falls back to the category's
 * real `code` initials in `CategoryRow`. Add an entry here when a category
 * becomes a confirmed top-level category; do not invent an icon for a
 * category the catalogue does not actually have.
 */
const CATEGORY_ICON_PATHS: Record<string, ReactNode> = {
  'home-living': (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.8V20h12V9.8" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  'mobile-gadgets': (
    <>
      <rect x="7" y="3" width="10" height="18" rx="2" />
      <path d="M11 18.5h2" />
    </>
  ),
  fashion: (
    <>
      <path d="M9 4 6 6l-2 4 3 1.5V20h10v-8.5L20 10l-2-4-3-2" />
      <path d="M9 4a3 3 0 0 0 6 0" />
    </>
  ),
  tops: (
    <>
      <path d="M9 4 6 6l-2 4 3 1.5V20h10v-8.5L20 10l-2-4-3-2" />
      <path d="M9 4a3 3 0 0 0 6 0" />
    </>
  ),
  bottoms: (
    <>
      <path d="M7 3h10l1 18h-4l-2-9-2 9H7Z" />
      <path d="M7 7h10" />
    </>
  ),
  outerwear: (
    <>
      <path d="M12 4 8 5 5 9v11h14V9l-3-4-4-1Z" />
      <path d="M12 4v16" />
      <path d="M9 9h1.5M14.5 9H16" />
    </>
  ),
  footwear: (
    <>
      <path d="M3 16v-4h4l3 2h6a4 4 0 0 1 4 4v1H3Z" />
      <path d="M7 12V9" />
    </>
  ),
  bags: (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  accessories: (
    <>
      <circle cx="12" cy="12" r="4.5" />
      <path d="M10 7.5V4h4v3.5M10 16.5V20h4v-3.5" />
    </>
  ),
  outdoor: (
    <>
      <path d="M3 19 12 5l9 14H3Z" />
      <path d="M8.5 19 12 13l3.5 6" />
    </>
  ),
  sports: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5c3 3 3 14 0 17M3.5 12h17" />
    </>
  ),
  beauty: (
    <>
      <path d="M10 3h4v3h-4z" />
      <path d="M8.5 6h7l1 4v10h-9V10l1-4Z" />
      <path d="M9 14h6" />
    </>
  ),
  appliances: (
    <>
      <rect x="5" y="3" width="14" height="18" rx="2" />
      <circle cx="12" cy="13" r="4" />
      <path d="M8.5 6.5h.01" />
    </>
  ),
  groceries: (
    <>
      <path d="M4 8h16l-1.5 11H5.5L4 8Z" />
      <path d="M9 8 10.5 4M15 8 13.5 4" />
    </>
  ),
  'baby-toys': (
    <>
      <circle cx="12" cy="9" r="4.5" />
      <path d="M8 6.5 6 4M16 6.5 18 4" />
      <path d="M12 13.5V20" />
      <path d="M9 20h6" />
    </>
  ),
  automotive: (
    <>
      <path d="M4 15v-3l2-5h12l2 5v3" />
      <path d="M4 15h16v3H4z" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="16.5" cy="18" r="1.5" />
    </>
  ),
};

export default CATEGORY_ICON_PATHS;

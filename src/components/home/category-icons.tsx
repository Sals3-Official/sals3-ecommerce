import type { ReactNode } from 'react';

/**
 * Inline 24x24 line-icon geometry, keyed by **main category** id. Inline SVG
 * rather than an icon package: no new dependency, no network request, no
 * layout shift, and the stroke inherits `currentColor` so one icon serves
 * every state (build spec sections 11.4, 4.2 — the icon stays quiet
 * grey/brand, it never competes with a product photo).
 *
 * The keys are the L1 slugs of the Sals3 taxonomy, which is what the live
 * feed now emits (`toStorefrontCategories` in the portal rolls every
 * published leaf up to its top-level category). That is deliberate and it is
 * what makes a complete icon set possible: the taxonomy has 21 main
 * categories and 5,595 leaves, so keying icons by leaf could never be
 * finished.
 *
 * Two main categories are intentionally left unmapped — `mature` and
 * `religious-ceremonial`. An unmapped id falls back to its `code` initials in
 * `CategoryTile`, which is the honest outcome for categories where any glyph
 * we picked would editorialise. Do not invent an icon for a category the
 * catalogue does not actually have either.
 */
const CATEGORY_ICON_PATHS: Record<string, ReactNode> = {
  'animals-pet-supplies': (
    <>
      <circle cx="7" cy="9" r="1.6" />
      <circle cx="11" cy="6.5" r="1.6" />
      <circle cx="15.5" cy="7.5" r="1.6" />
      <path d="M8 15.5a4 4 0 0 1 7.6-1.2c.7 1.6 2.4 2.2 2.4 3.9A2.8 2.8 0 0 1 15.2 21c-1.3 0-2-.6-3.2-.6s-1.9.6-3.2.6A2.8 2.8 0 0 1 6 18.2c0-1.4 1.4-1.9 2-2.7Z" />
    </>
  ),
  'apparel-accessories': (
    <>
      <path d="M9 4 6 6l-2 4 3 1.5V20h10v-8.5L20 10l-2-4-3-2" />
      <path d="M9 4a3 3 0 0 0 6 0" />
    </>
  ),
  'arts-entertainment': (
    <>
      <path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.4 0 2-.9 2-1.8 0-1.6-1.6-1.7-1.6-3 0-1 .8-1.7 2-1.7h1.6a4.5 4.5 0 0 0 4.5-4.5C20.5 6 16.8 3.5 12 3.5Z" />
      <path d="M8 9h.01M11.5 7h.01M15 8.5h.01" />
    </>
  ),
  'baby-toddler': (
    <>
      <circle cx="12" cy="9" r="4.5" />
      <path d="M8 6.5 6 4M16 6.5 18 4" />
      <path d="M12 13.5V20" />
      <path d="M9 20h6" />
    </>
  ),
  'business-industrial': (
    <>
      <path d="M3 20V11l5 3V11l5 3V8l8 4v8" />
      <path d="M3 20h18" />
      <path d="M18 8V4h2v4" />
    </>
  ),
  'cameras-optics': (
    <>
      <path d="M3 8h4l1.5-2h7L17 8h4v11H3V8Z" />
      <circle cx="12" cy="13" r="3.5" />
    </>
  ),
  electronics: (
    <>
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M9 20h6M12 16v4" />
    </>
  ),
  'food-beverages-tobacco': (
    <>
      <path d="M4 8h16l-1.5 11H5.5L4 8Z" />
      <path d="M9 8 10.5 4M15 8 13.5 4" />
    </>
  ),
  furniture: (
    <>
      <path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
      <path d="M4 11a2 2 0 0 1 2 2v3h12v-3a2 2 0 0 1 2-2" />
      <path d="M6 16v3M18 16v3" />
    </>
  ),
  hardware: (
    <path d="M15.5 3.5a5 5 0 0 0-4.3 7.6L4 18.3 5.7 20l7.2-7.2a5 5 0 0 0 6.2-6.9l-2.7 2.7-2.4-2.4 2.5-2.5a5 5 0 0 0-1-.2Z" />
  ),
  'health-beauty': (
    <>
      <path d="M10 3h4v3h-4z" />
      <path d="M8.5 6h7l1 4v10h-9V10l1-4Z" />
      <path d="M9 14h6" />
    </>
  ),
  'home-garden': (
    <>
      <path d="M4 10.5 12 4l8 6.5" />
      <path d="M6 9.8V20h12V9.8" />
      <path d="M10 20v-5h4v5" />
    </>
  ),
  'luggage-bags': (
    <>
      <path d="M5 8h14l-1 12H6L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  media: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="2" />
    </>
  ),
  'office-supplies': (
    <>
      <path d="M4 17.5 16.5 5a2.1 2.1 0 0 1 3 3L7 20.5l-4 1 1-4Z" />
      <path d="M14.5 7 17 9.5" />
    </>
  ),
  software: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 8h18" />
      <path d="M9.5 12 8 14l1.5 2M14.5 12 16 14l-1.5 2" />
    </>
  ),
  'sporting-goods': (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5c3 3 3 14 0 17M3.5 12h17" />
    </>
  ),
  'toys-games': (
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M9 9h.01M15 9h.01M9 15h.01M15 15h.01M12 12h.01" />
    </>
  ),
  'vehicles-parts': (
    <>
      <path d="M4 15v-3l2-5h12l2 5v3" />
      <path d="M4 15h16v3H4z" />
      <circle cx="7.5" cy="18" r="1.5" />
      <circle cx="16.5" cy="18" r="1.5" />
    </>
  ),
};

export default CATEGORY_ICON_PATHS;

import { usd, type Money } from '@/lib/money';

export type PlaceholderTone = 'ocean' | 'dusk' | 'meadow' | 'clay';

export type Category = {
  id: string;
  code: string;
  name: string;
};

/**
 * The fallback products rendered when the live feed is unavailable.
 *
 * They carry no invented star rating, no invented delivery date, and no
 * was/now price: this array is shown to a **real visitor** on a real page
 * whenever the portal is unreachable, so anything fabricated here is a
 * fabricated claim on the storefront, not a design placeholder.
 */
export type Product = {
  id: string;
  title: string;
  price: Money;
  /**
   * Only ever set from real price-history evidence. The fallback products below
   * deliberately carry none: they were invented was/now pairs, and they are
   * shown to a real visitor whenever the live feed fails, which made them a
   * fabricated discount claim on a real page (ADR-003 prohibits this).
   */
  oldPrice?: Money;
  ratingLine: string;
  shipLine: string;
  tone: PlaceholderTone;
  imageUrl?: string;
  imageAlt?: string;
};

export type AdSlot = {
  id: string;
  badge: string;
  headline: string;
  brand: string;
  sub: string;
};

/**
 * The main categories — the 21 L1 departments of the Sals3 taxonomy, verbatim
 * and in the taxonomy's own order.
 *
 * Two jobs. It is the fallback when the live category feed is unreachable,
 * and it is the vocabulary every browse surface speaks: the same `/c/<slug>`
 * ids the feed emits, so a fallback tile and a live tile link to the same
 * place and every id has a mapped icon (bar the two left to initials on
 * purpose — see `category-icons.tsx`).
 *
 * These are departments, not merchandising buckets: the list is not curated,
 * shortened, or reordered for effect, because the taxonomy is what the
 * catalogue is actually filed under. It is also not the deep leaf names the
 * feed used to send — a leaf set 5,595 rows deep can be filed in but not
 * browsed.
 */
export const categories: Category[] = [
  { id: 'animals-pet-supplies', code: 'AP', name: 'Animals & Pet Supplies' },
  { id: 'apparel-accessories', code: 'AA', name: 'Apparel & Accessories' },
  { id: 'arts-entertainment', code: 'AE', name: 'Arts & Entertainment' },
  { id: 'baby-toddler', code: 'BT', name: 'Baby & Toddler' },
  { id: 'business-industrial', code: 'BI', name: 'Business & Industrial' },
  { id: 'cameras-optics', code: 'CO', name: 'Cameras & Optics' },
  { id: 'electronics', code: 'EL', name: 'Electronics' },
  {
    id: 'food-beverages-tobacco',
    code: 'FB',
    name: 'Food, Beverages & Tobacco',
  },
  { id: 'furniture', code: 'FU', name: 'Furniture' },
  { id: 'hardware', code: 'HA', name: 'Hardware' },
  { id: 'health-beauty', code: 'HB', name: 'Health & Beauty' },
  { id: 'home-garden', code: 'HG', name: 'Home & Garden' },
  { id: 'luggage-bags', code: 'LB', name: 'Luggage & Bags' },
  { id: 'mature', code: 'MA', name: 'Mature' },
  { id: 'media', code: 'ME', name: 'Media' },
  { id: 'office-supplies', code: 'OS', name: 'Office Supplies' },
  { id: 'religious-ceremonial', code: 'RC', name: 'Religious & Ceremonial' },
  { id: 'software', code: 'SO', name: 'Software' },
  { id: 'sporting-goods', code: 'SG', name: 'Sporting Goods' },
  { id: 'toys-games', code: 'TG', name: 'Toys & Games' },
  { id: 'vehicles-parts', code: 'VP', name: 'Vehicles & Parts' },
];

const tones: PlaceholderTone[] = ['ocean', 'dusk', 'meadow', 'clay'];

function tonefor(index: number): PlaceholderTone {
  return tones[index % tones.length]!;
}

export const deals: Product[] = [
  {
    id: 'deal-1',
    title: 'Solar wall lamp, motion sensor, 3 colour modes',
    price: usd(2299),
    ratingLine: 'No reviews yet',
    shipLine: 'Delivery quoted at checkout',
    tone: 'ocean',
  },
  {
    id: 'deal-2',
    title: 'Stainless steel insulated tumbler, 750 ml',
    price: usd(1899),
    ratingLine: 'No reviews yet',
    shipLine: 'Delivery quoted at checkout',
    tone: 'dusk',
  },
  {
    id: 'deal-3',
    title: 'Wireless earbuds, active noise cancelling',
    price: usd(4599),
    ratingLine: 'No reviews yet',
    shipLine: 'Delivery quoted at checkout',
    tone: 'meadow',
  },
  {
    id: 'deal-4',
    title: 'Non-stick cooking pan set, 3 pieces',
    price: usd(3299),
    ratingLine: 'No reviews yet',
    shipLine: 'Delivery quoted at checkout',
    tone: 'clay',
  },
  {
    id: 'deal-5',
    title: 'Ergonomic mesh office chair',
    price: usd(12900),
    ratingLine: 'No reviews yet',
    shipLine: 'Delivery quoted at checkout',
    tone: 'ocean',
  },
];

export const adSlot: AdSlot = {
  id: 'ad-1',
  badge: 'Sponsored',
  headline: 'Save more on kitchen essentials',
  brand: 'Casa Home',
  sub: 'Cookware, storage, and small appliances in one shop.',
};

export const forYouProducts: Product[] = Array.from({ length: 10 }, (_, i) => ({
  id: `fy-${i + 1}`,
  title: [
    'Cotton crew-neck shirt, unisex fit',
    'Aluminium phone stand, adjustable',
    'Refillable travel bottle set',
    'LED desk lamp, 3 brightness levels',
    'Canvas tote bag, water-resistant',
    'Bluetooth mini speaker',
    'Bamboo cutting board set',
    'Foldable laundry basket',
    'Ceramic coffee mug, 350 ml',
    'Anti-slip yoga mat',
  ][i]!,
  price: usd(899 + i * 640),
  ratingLine: 'No reviews yet',
  shipLine: 'Delivery quoted at checkout',
  tone: tonefor(i),
}));

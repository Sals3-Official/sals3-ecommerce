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

export const categories: Category[] = [
  { id: 'home-living', code: 'HL', name: 'Home & Living' },
  { id: 'mobile-gadgets', code: 'MG', name: 'Mobile & Gadgets' },
  { id: 'fashion', code: 'FA', name: 'Fashion' },
  { id: 'beauty', code: 'BE', name: 'Beauty' },
  { id: 'appliances', code: 'AP', name: 'Appliances' },
  { id: 'groceries', code: 'GR', name: 'Groceries' },
  { id: 'sports', code: 'SP', name: 'Sports & Outdoors' },
  { id: 'baby-toys', code: 'BT', name: 'Baby & Toys' },
  { id: 'automotive', code: 'AU', name: 'Automotive' },
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

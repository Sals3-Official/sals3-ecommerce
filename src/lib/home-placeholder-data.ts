import { peso, type Money } from '@/lib/money';

export type PlaceholderTone = 'ocean' | 'dusk' | 'meadow' | 'clay';

export type Category = {
  id: string;
  code: string;
  name: string;
};

export type Product = {
  id: string;
  title: string;
  price: Money;
  oldPrice: Money;
  ratingLine: string;
  shipLine: string;
  tone: PlaceholderTone;
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
    price: peso(124000),
    oldPrice: peso(189000),
    ratingLine: '★ 4.7 (1,284)',
    shipLine: 'Free shipping to Metro Manila',
    tone: 'ocean',
  },
  {
    id: 'deal-2',
    title: 'Stainless steel insulated tumbler, 750 ml',
    price: peso(39900),
    oldPrice: peso(69900),
    ratingLine: '★ 4.8 (642)',
    shipLine: 'Arrives 4 to 6 September',
    tone: 'dusk',
  },
  {
    id: 'deal-3',
    title: 'Wireless earbuds, active noise cancelling',
    price: peso(179000),
    oldPrice: peso(249000),
    ratingLine: '★ 4.6 (3,051)',
    shipLine: 'Free shipping, COD available',
    tone: 'meadow',
  },
  {
    id: 'deal-4',
    title: 'Non-stick cooking pan set, 3 pieces',
    price: peso(89900),
    oldPrice: peso(159900),
    ratingLine: '★ 4.9 (211)',
    shipLine: 'Arrives 5 to 8 September',
    tone: 'clay',
  },
  {
    id: 'deal-5',
    title: 'Ergonomic mesh office chair',
    price: peso(349000),
    oldPrice: peso(529000),
    ratingLine: '★ 4.5 (98)',
    shipLine: 'Free shipping to Metro Manila',
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
  price: peso(19900 + i * 15300),
  oldPrice: peso(29900 + i * 21300),
  ratingLine: `★ ${(4.3 + (i % 5) * 0.1).toFixed(1)} (${120 + i * 37})`,
  shipLine:
    i % 3 === 0 ? 'Free shipping, COD available' : 'Arrives 3 to 6 September',
  tone: tonefor(i),
}));

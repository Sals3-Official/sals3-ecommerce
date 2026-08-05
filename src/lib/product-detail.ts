import type { Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';

export type ProductDetail = {
  id: string;
  title: string;
  category: string;
  price: Money;
  oldPrice: Money;
  ratingLine: string;
  shipLine: string;
  imageUrl?: string;
  imageAlt: string;
  tone: PlaceholderTone;
};

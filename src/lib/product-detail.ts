import type { Money } from '@/lib/money';
import type { PlaceholderTone } from '@/lib/home-placeholder-data';

export type ProductReview = {
  id: string;
  starsLine: string;
  comment: string;
  reviewerName: string;
  dateLine: string;
};

export type ProductDetail = {
  id: string;
  title: string;
  description: string;
  brand?: string;
  category: string;
  price: Money;
  oldPrice: Money;
  ratingLine: string;
  reviewCountLine: string;
  images: string[];
  imageAlt: string;
  tone: PlaceholderTone;
  shipLine: string;
  returnPolicy: string;
  warranty: string;
  inStock: boolean;
  stockLine: string;
  reviews: ProductReview[];
};

const STAR_FILLED = '★';
const STAR_EMPTY = '☆';

export function starsLine(rating: number): string {
  const rounded = Math.round(Math.min(Math.max(rating, 0), 5));
  return STAR_FILLED.repeat(rounded) + STAR_EMPTY.repeat(5 - rounded);
}

export function formatReviewDate(iso: string): string {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  return date.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

'use client';

import { useEffect } from 'react';
import type { Money } from '@/lib/money';
import { trackKlaviyoViewedProduct } from '@/lib/klaviyo/client';

type KlaviyoViewedProductProps = {
  productId: string;
  title: string;
  imageUrl?: string;
  unitPrice: Money;
  category: string;
};

export default function KlaviyoViewedProduct({
  productId,
  title,
  imageUrl,
  unitPrice,
  category,
}: KlaviyoViewedProductProps) {
  useEffect(() => {
    trackKlaviyoViewedProduct({
      productId,
      title,
      imageUrl,
      unitPrice,
      category,
    });
  }, [category, imageUrl, productId, title, unitPrice]);

  return null;
}

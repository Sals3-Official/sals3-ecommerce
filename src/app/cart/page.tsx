import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import CartPageClient from '@/components/cart/CartPageClient';
import { SITE_NAME } from '@/lib/site';

export function generateMetadata(): Metadata {
  return {
    title: `Cart — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

export default function CartPage() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-5 pb-16">
        <CartPageClient />
      </main>
      <SiteFooter />
    </div>
  );
}

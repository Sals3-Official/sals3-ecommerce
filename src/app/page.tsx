import SiteHeader from '@/components/layout/SiteHeader';
import CategoryStrip from '@/components/home/CategoryStrip';
import PromoBanner from '@/components/home/PromoBanner';
import DealsSection from '@/components/home/DealsSection';
import ForYouSection from '@/components/home/ForYouSection';
import {
  categories,
  deals,
  forYouProducts,
  adSlot,
} from '@/lib/home-placeholder-data';

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-6 py-5 pb-16">
        <CategoryStrip categories={categories} />
        <PromoBanner />
        <DealsSection deals={deals} />
        <ForYouSection
          products={forYouProducts}
          ad={adSlot}
          regionNote="Shown for Metro Manila"
        />
      </main>
    </div>
  );
}

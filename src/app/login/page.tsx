import type { Metadata } from 'next';
import SiteHeader from '@/components/layout/SiteHeader';
import SiteFooter from '@/components/layout/SiteFooter';
import AuthComingSoon from '@/components/auth/AuthComingSoon';
import { SITE_NAME } from '@/lib/site';

export function generateMetadata(): Metadata {
  return {
    title: `Log In — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="flex flex-1 flex-col">
        <AuthComingSoon
          heading="Log In"
          message="Sign-in is not ready yet. Please check back soon."
        />
      </main>
      <SiteFooter />
    </div>
  );
}

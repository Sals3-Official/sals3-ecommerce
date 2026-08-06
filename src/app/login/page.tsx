import type { Metadata } from 'next';
import AuthHeroPanel from '@/components/auth/AuthHeroPanel';
import LoginCard from '@/components/auth/LoginCard';
import { SITE_NAME } from '@/lib/site';

export function generateMetadata(): Metadata {
  return {
    title: `Sign in — ${SITE_NAME}`,
    /*
     * Credential screens stay out of search and AI answer surfaces: there is no
     * content to rank, and an indexed sign-in page is a standing phishing and
     * credential-stuffing target. This is the SEO/GEO/AEO decision for the
     * route — deliberately no `generateMetadata` description, canonical, or
     * JSON-LD, since none of those belong on a noindex form.
     */
    robots: { index: false, follow: false },
  };
}

/**
 * Full-bleed split login screen. The site header and footer are intentionally
 * absent: this route is a focused single-task surface, and the hero's back
 * control is the way out.
 */
export default function LoginPage() {
  return (
    <div className="flex w-full flex-1 flex-col bg-white font-auth text-auth-ink lg:flex-row">
      <AuthHeroPanel />
      <LoginCard />
    </div>
  );
}

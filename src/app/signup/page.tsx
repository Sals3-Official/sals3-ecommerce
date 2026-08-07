import type { Metadata } from 'next';
import AuthHeroPanel from '@/components/auth/AuthHeroPanel';
import SignupCard from '@/components/auth/SignupCard';
import { SITE_NAME } from '@/lib/site';

export function generateMetadata(): Metadata {
  return {
    title: `Create your account — ${SITE_NAME}`,
    /*
     * Credential screens stay out of search and AI answer surfaces: there is no
     * content to rank, and an indexed registration page is a standing phishing
     * and spam-signup target. Same decision, and same reasoning, as `/login`.
     */
    robots: { index: false, follow: false },
  };
}

/**
 * Full-bleed split signup screen, matching `/login`.
 *
 * The site header and footer are intentionally absent. The two credential
 * screens cross-link to each other, so giving them different chrome would
 * throw the visitor between two layouts mid-task; the hero's back control is
 * the way out of both.
 */
export default function SignupPage() {
  return (
    <div className="flex w-full flex-1 flex-col bg-white font-auth text-auth-ink lg:flex-row">
      <AuthHeroPanel />
      <SignupCard />
    </div>
  );
}

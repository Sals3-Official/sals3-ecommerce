import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import privacyPolicy from '@/lib/legal/privacy-policy';

export const metadata: Metadata = {
  title: 'Privacy Policy — Sals3',
  description:
    'How Anything Supplies Pty Ltd handles the personal information collected through SALS3.com.',
};

/** `/legal/privacy`. Same shell as the Terms; see `LegalPage`. */
export default function PrivacyPolicyPage() {
  return <LegalPage document={privacyPolicy} />;
}

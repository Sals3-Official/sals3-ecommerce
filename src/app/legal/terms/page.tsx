import type { Metadata } from 'next';
import LegalPage from '@/components/legal/LegalPage';
import termsOfUse from '@/lib/legal/terms-of-use';

export const metadata: Metadata = {
  title: 'Terms of Use — Sals3',
  description:
    'The terms that govern your use of SALS3.com, its services, applications and mobile apps.',
};

/**
 * `/legal/terms`.
 *
 * The footer's Legal column and the sign-up card both linked here before the
 * route existed, which meant a shopper was asked to agree to terms that
 * answered 404. The document is static, so this page is too — no revalidation,
 * no fetch, nothing to fail at request time.
 */
export default function TermsOfUsePage() {
  return <LegalPage document={termsOfUse} />;
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import OrganizationSchema from '@/components/schema/OrganizationSchema';
import { CartProvider } from '@/components/cart/CartProvider';
import KlaviyoConsentProvider from '@/components/klaviyo/KlaviyoConsentProvider';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';
import './globals.css';

export const metadata: Metadata = {
  title: `${SITE_NAME} — Shop smarter, pay less`,
  description: SITE_DESCRIPTION,
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="flex min-h-full flex-col font-sans">
        <OrganizationSchema />
        <KlaviyoConsentProvider>
          <CartProvider>{children}</CartProvider>
        </KlaviyoConsentProvider>
      </body>
    </html>
  );
}

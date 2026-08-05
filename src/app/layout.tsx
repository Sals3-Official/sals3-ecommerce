import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Plus_Jakarta_Sans as PlusJakartaSans, Outfit } from 'next/font/google';
import OrganizationSchema from '@/components/schema/OrganizationSchema';
import { CartProvider } from '@/components/cart/CartProvider';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';
import './globals.css';

const jakarta = PlusJakartaSans({
  variable: '--font-jakarta',
  subsets: ['latin'],
  weight: ['400', '700'],
});

const outfit = Outfit({
  variable: '--font-outfit',
  subsets: ['latin'],
  weight: ['600'],
});

export const metadata: Metadata = {
  title: `${SITE_NAME} — Shop smarter, pay less`,
  description: SITE_DESCRIPTION,
};

type RootLayoutProps = Readonly<{
  children: ReactNode;
}>;

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html
      lang="en"
      className={`${jakarta.variable} ${outfit.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <OrganizationSchema />
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
/*
  Aliased on import: `next/font/google` names its exports after the Google
  family (`Plus_Jakarta_Sans`), which the `camelcase` rule rejects. Renaming at
  the boundary keeps the rule satisfied without disabling it for the file.
*/
import {
  Instrument_Sans as InstrumentSans,
  Outfit,
  Plus_Jakarta_Sans as PlusJakartaSans,
} from 'next/font/google';
import OrganizationSchema from '@/components/schema/OrganizationSchema';
import { CartProvider } from '@/components/cart/CartProvider';
import KlaviyoConsentProvider from '@/components/klaviyo/KlaviyoConsentProvider';
import { SITE_DESCRIPTION, SITE_NAME } from '@/lib/site';
import './globals.css';

/**
 * The three families the design system names, actually loaded.
 *
 * `globals.css` has declared `'Plus Jakarta Sans'`, `'Outfit'` and
 * `'Instrument Sans'` since the first landing page, and `@theme inline` maps
 * them to `--font-sans`, `--font-display` and `--font-auth`. Nothing ever
 * fetched a font file: there was no `next/font` import anywhere in `src/`, no
 * `@font-face` rule in the built CSS, and no stylesheet link. Every one of them
 * fell through to the same system fallback, so the display-versus-body
 * distinction the approved designs are built on had never rendered — verified
 * against production 2026-08-21, where `Outfit` and `Plus Jakarta Sans` measured
 * byte-identically.
 *
 * Self-hosted by `next/font` rather than linked from Google: the files are
 * emitted as static assets on our own origin, so no browser request reaches
 * Google and there is no third-party connection to consent to.
 *
 * Each declares its own `--font-*-webfont` variable rather than overwriting
 * `--font-jakarta` / `--font-outfit` / `--font-instrument` directly. Those stay
 * in `globals.css` as the single place a family's whole fallback chain is
 * written, and they now begin with these variables. One name per concern: the
 * loader owns "which file", the stylesheet owns "what to fall back to".
 *
 * `display: 'swap'` so text is readable in a fallback face while the webfont
 * arrives, rather than invisible. `adjustFontFallback` is left at its default,
 * which synthesises a size-matched local fallback and is what keeps the swap
 * from shifting layout.
 *
 * `latin` only, and normal style only. Nothing on the storefront renders
 * italic — the description editor's italic marks are portal-side and the
 * storefront's block renderer has no `em` path — so an italic axis would be
 * bytes every visitor downloads and none of them sees. Both need revisiting if
 * italic rendering or a non-latin market lands.
 */
const jakarta = PlusJakartaSans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta-webfont',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit-webfont',
});

const instrument = InstrumentSans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-instrument-webfont',
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
    /*
      The variables go on `html`, which is also what `:root` in `globals.css`
      selects — the same element, so the `--font-*` chains there resolve against
      these without an inheritance hop.
    */
    <html
      lang="en"
      className={`h-full antialiased ${jakarta.variable} ${outfit.variable} ${instrument.variable}`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <OrganizationSchema />
        <KlaviyoConsentProvider>
          <CartProvider>{children}</CartProvider>
        </KlaviyoConsentProvider>
      </body>
    </html>
  );
}

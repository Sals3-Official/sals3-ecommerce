import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the server/client module boundary.
 *
 * A Node-only import reaching a client component does not fail typecheck, does
 * not fail a jsdom unit test, and does not fail the build — it fails silently
 * in the browser, where the page stops hydrating and every control stays
 * inert. That happened once already: `login-status.ts` reached
 * `session-cookies.ts` through the auth error codes, dragging `node:crypto`
 * into the login bundle.
 *
 * The walk is static and deliberately simple: follow relative imports from
 * each client entry point and fail on any `node:` builtin or `server-only`
 * marker found along the way.
 */

const SOURCE_ROOT = resolve(import.meta.dirname, '..', 'src');

/** Modules the browser loads directly, or through a `'use client'` component. */
const CLIENT_ENTRY_POINTS = [
  'components/auth/LoginForm.tsx',
  'components/auth/LoginFormActions.tsx',
  'components/auth/SignupForm.tsx',
  'components/auth/SignupFields.tsx',
  'components/auth/GoogleSignInButton.tsx',
  'components/auth/PasswordField.tsx',
  'components/auth/EmailField.tsx',
  'components/auth/NameField.tsx',
  'components/cart/CartPageClient.tsx',
  'components/cart/CartProvider.tsx',
  // The checkout flow, split across three routes: each step is a client
  // component reached from the group's layout.
  'components/checkout/CheckoutFlowProvider.tsx',
  'components/checkout/CheckoutFlowChrome.tsx',
  'components/checkout/CheckoutInformationStep.tsx',
  'components/checkout/CheckoutDeliveryStep.tsx',
  'components/checkout/CheckoutPaymentStep.tsx',
  'components/checkout/CheckoutStepper.tsx',
  'components/klaviyo/KlaviyoConsentProvider.tsx',
  'components/klaviyo/KlaviyoLoader.tsx',
  'components/klaviyo/KlaviyoViewedProduct.tsx',
  'components/layout/HeaderAuthContext.tsx',
  // The header's two session-gated controls: the utility-bar account menu
  // (full name, Orders, Log out) and the main-row Orders shortcut.
  'components/layout/AccountHeaderLink.tsx',
  'components/layout/GuestAuthLinks.tsx',
  'components/layout/HeaderOrdersLink.tsx',
  // Owns the header's scroll state; every child it wraps stays server-rendered.
  'components/layout/SiteHeaderShell.tsx',
  // The utility bar's destination control, added 2026-08-27. Its server half,
  // `HeaderDestination`, is deliberately not an entry point: it reads
  // `cookies()` and stays on the server, and only this half reaches the browser.
  'components/layout/DestinationPicker.tsx',
  // The shopping link for the boundaries Next renders without `params`
  // (`not-found.tsx`, `error.tsx`), added with the market URL segments on
  // 2026-08-27. It reaches `useMarket`, and through it `markets.ts` and the
  // whole destination vocabulary, so the walk has something real to check.
  'components/layout/MarketLink.tsx',
  // The buyer orders surface. Everything else on `/orders` and
  // `/orders/[orderNumber]` is a Server Component; this is the whole client
  // boundary — a filter form that routes, a clipboard button, the success toast
  // the review redirect lands on, and the review controls.
  //
  // `RateReviewButton` reaches `ReviewModalForm` through `next/dynamic`, which
  // this walk cannot follow (the specifier is inside a call, not an import), so
  // the lazy half is listed as its own entry point rather than trusted to be
  // covered by its parent.
  'components/orders/OrdersToolbar.tsx',
  'components/orders/CopyOrderNumber.tsx',
  'components/orders/OrdersFlashToast.tsx',
  'components/orders/RateReviewButton.tsx',
  'components/orders/ReviewModalForm.tsx',
  'components/orders/ReviewModal.tsx',
  'components/orders/ReviewDraftItem.tsx',
  'components/orders/StarRatingInput.tsx',
  // The route form at `/orders/[orderNumber]/review/[lineId]`, which was a
  // client component before this list knew about it.
  'components/orders/WriteReviewForm.tsx',
  'components/ui/SuccessToast.tsx',
  'app/orders/error.tsx',
  'components/product/ProductAddToCartButtons.tsx',
  'components/product/ProductOptionList.tsx',
  'components/product/ProductRecordPanel.tsx',
  // The variant path and the gallery, added 2026-08-13. `ProductGallery` was
  // already a client component and simply missing from this list.
  //
  // `ProductPurchasePanel.tsx` and `ProductVariantSelector.tsx` were removed on
  // 2026-08-21 with the components themselves. This array has no
  // auto-discovery, so a deleted entry left behind here would fail the walk on
  // a missing file rather than degrade quietly — which is the right direction,
  // and the reason the list is hand-maintained.
  'components/product/ProductGallery.tsx',
  // The review filter chips. Client because a chip narrows a list already on the
  // page rather than changing what is fetched — and deliberately not behind
  // `next/dynamic` with `ssr: false`, so the review text stays in the initial
  // HTML for crawlers and answer engines.
  'components/product/ProductReviewList.tsx',
  'lib/klaviyo/client.ts',
  'lib/auth/password-login.ts',
  'lib/auth/password-signup.ts',
  'lib/auth/logout-session.ts',
  'lib/auth/firebase-google-login.ts',
  'lib/auth/login-status.ts',
];

const IMPORT_PATTERN = /(?:from|import)\s+'([^']+)'/g;

const CANDIDATE_SUFFIXES = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function resolveModule(specifier: string, fromFile: string) {
  const base = specifier.startsWith('@/')
    ? resolve(SOURCE_ROOT, specifier.slice(2))
    : resolve(dirname(fromFile), specifier);

  return CANDIDATE_SUFFIXES.map((suffix) => `${base}${suffix}`).find((path) => {
    try {
      readFileSync(path);
      return true;
    } catch {
      return false;
    }
  });
}

/** Every server-only import reachable from `entry`, with the path that led there. */
function findServerOnlyImports(entry: string) {
  const visited = new Set<string>();
  const violations: string[] = [];

  function walk(file: string, trail: readonly string[]) {
    if (visited.has(file)) {
      return;
    }

    visited.add(file);

    const source = readFileSync(file, 'utf8');

    /*
     * A `'use server'` module is itself a boundary: the client receives a
     * reference the bundler replaces with a network call, never the module's
     * imports. Walking through one would report every Server Action's
     * server-side dependencies as if the browser loaded them, which is the
     * false positive that kept the checkout components out of this guard.
     */
    if (
      file !== resolve(SOURCE_ROOT, entry) &&
      /^\s*['"]use server['"]/.test(source)
    ) {
      return;
    }

    const specifiers = Array.from(
      source.matchAll(IMPORT_PATTERN),
      (m) => m[1]!,
    );

    specifiers.forEach((specifier) => {
      const step = [...trail, specifier];

      if (specifier.startsWith('node:') || specifier === 'server-only') {
        violations.push(step.join(' -> '));
        return;
      }

      if (!specifier.startsWith('.') && !specifier.startsWith('@/')) {
        return;
      }

      const resolved = resolveModule(specifier, file);

      if (resolved) {
        walk(resolved, step);
      }
    });
  }

  walk(resolve(SOURCE_ROOT, entry), [entry]);

  return violations;
}

describe('client bundle boundary', () => {
  it.each(CLIENT_ENTRY_POINTS)('%s pulls in no server-only module', (entry) => {
    expect(findServerOnlyImports(entry)).toEqual([]);
  });

  it('detects a violation when one exists', () => {
    // Proves the walk actually follows the graph rather than always passing:
    // this route legitimately reaches `node:crypto` through the CSRF check.
    expect(
      findServerOnlyImports('app/api/auth/login/route.ts').length,
    ).toBeGreaterThan(0);
  });
});

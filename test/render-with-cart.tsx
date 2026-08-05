import { render, type RenderResult } from '@testing-library/react';
import type { ReactElement } from 'react';
import { CartProvider } from '@/components/cart/CartProvider';

/**
 * SiteHeader renders a live cart-count badge, so any page that composes it
 * needs a CartProvider ancestor in tests, the same way it gets one from
 * src/app/layout.tsx at runtime.
 */
export default function renderWithCart(ui: ReactElement): RenderResult {
  return render(<CartProvider>{ui}</CartProvider>);
}

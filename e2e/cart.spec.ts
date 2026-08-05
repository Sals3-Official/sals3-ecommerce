import { expect, test } from '@playwright/test';

const CART_STORAGE_KEY = 'sals3-cart-v1';

function seedCartItem(page: import('@playwright/test').Page) {
  return page.addInitScript(
    ({ key, state }) => {
      window.localStorage.setItem(key, JSON.stringify(state));
    },
    {
      key: CART_STORAGE_KEY,
      state: {
        items: [
          {
            productId: 'air-cooler',
            title: 'Quiet tower air cooler',
            imageAlt: 'Quiet tower air cooler',
            tone: 'ocean',
            unitPrice: { amountMinor: 199900, currency: 'PHP' },
            quantity: 1,
          },
        ],
      },
    },
  );
}

// Cart mechanics (quantity/remove/subtotal) are seeded directly into
// localStorage rather than added via the product page's Add to Cart button:
// this repo has no reachable `sals3-portal` instance/token configured
// locally, so /p/<slug> currently 404s (see product.spec.ts) and can't be
// used to seed the cart end-to-end. The cart itself is client-only and
// doesn't depend on the product API, so this still exercises real cart code.
test('adjust quantity and remove an item from the cart', async ({ page }) => {
  await seedCartItem(page);
  await page.goto('/cart');

  await expect(
    page.getByRole('heading', { level: 1, name: /cart \(1 item\)/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /increase quantity/i }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: /cart \(2 items\)/i }),
  ).toBeVisible();

  await page.getByRole('button', { name: /^remove$/i }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: /your cart is empty/i }),
  ).toBeVisible();
});

// Not run: Buy Now is a product-page button, and the product page can't
// render without a reachable sals3-portal instance/token (see
// product.spec.ts). Unwired once that backend is configured locally/in CI.
test.skip('Buy Now adds the item and goes straight to the cart', async () => {});

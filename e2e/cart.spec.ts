import { expect, test } from '@playwright/test';

const CART_STORAGE_KEY = 'sals3-cart-v2';
const LEGACY_CART_STORAGE_KEY = 'sals3-cart-v1';

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
            unitPrice: { amountMinor: 199900, currency: 'USD' },
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
  await page.goto('/au/cart');

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

/**
 * Guards a cascade bug that no unit test can see.
 *
 * `globals.css` styles bare links with the brand colour. While that rule sat
 * outside `@layer base`, it outranked every Tailwind utility — utilities live
 * in `@layer utilities`, and unlayered CSS beats layered CSS whatever the
 * specificity — so `text-white` lost and this button rendered brand blue on
 * brand blue: a 1:1 contrast ratio with the label invisible. jsdom does not
 * apply Tailwind, so `toHaveClass('text-white')` passes either way; only a real
 * browser can tell. Assert the computed colour, not the class.
 */
test('the checkout call to action renders readable white text', async ({
  page,
}) => {
  await seedCartItem(page);
  await page.goto('/au/cart');

  const cta = page.getByRole('link', { name: /proceed to checkout/i });

  await expect(cta).toHaveCSS('color', 'rgb(255, 255, 255)');
});

/**
 * Checkout requires a signed-in buyer.
 *
 * Runnable without Firebase credentials on purpose: a signed-out visitor has
 * no session cookie, and the guard returns before it ever reaches the Admin
 * SDK. The other half of the round trip — landing back on /checkout after
 * signing in — is a unit test, because `login.spec.ts` stubs the login API at
 * the network layer and so never mints a real session cookie to come back
 * with.
 */
test('a signed-out visitor is sent to sign in, and pointed back at checkout', async ({
  page,
}) => {
  await seedCartItem(page);
  await page.goto('/au/cart');

  await page.getByRole('link', { name: /proceed to checkout/i }).click();

  await expect(page).toHaveURL(/\/login\?next=checkout$/);
  await expect(
    page.getByRole('heading', { name: /sign in or create an account/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /create an account/i }),
  ).toHaveAttribute('href', '/signup?next=checkout');
});

// The guard is on the route, not on the cart button: a bookmark, a typed URL,
// and a Back navigation all have to hit it too. Checkout is three routes now,
// and delivery and payment are each directly addressable, so the guard on the
// shared layout has to cover all three.
['/checkout', '/checkout/delivery', '/checkout/payment'].forEach((path) => {
  test(`${path} cannot be reached directly while signed out`, async ({
    page,
  }) => {
    await page.goto(path);

    await expect(page).toHaveURL(/\/login\?next=checkout$/);
  });
});

// Not run: Buy Now is a product-page button, and the product page can't
// render without a reachable sals3-portal instance/token (see
// product.spec.ts). Unwired once that backend is configured locally/in CI.
test.skip('Buy Now adds the item and goes straight to the cart', async () => {});

/**
 * A v1 blob is PHP-priced and product-keyed. It must not be converted — a
 * converted price is one that was never quoted to that buyer — so the cart
 * starts empty and the stale key is removed rather than left holding purchase
 * intent nothing reads.
 */
test('a legacy v1 cart is discarded, not converted', async ({ page }) => {
  await page.addInitScript(
    ({ key, value }) => {
      window.localStorage.setItem(key, value);
    },
    {
      key: LEGACY_CART_STORAGE_KEY,
      value: JSON.stringify({
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
      }),
    },
  );

  await page.goto('/au/cart');

  await expect(page.getByText(/your cart is empty/i)).toBeVisible();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => window.localStorage.getItem(key),
        LEGACY_CART_STORAGE_KEY,
      ),
    )
    .toBeNull();
});

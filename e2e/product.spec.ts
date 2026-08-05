import { expect, test } from '@playwright/test';

test('clicking a product on the home page opens its product page', async ({
  page,
}) => {
  await page.goto('/');

  const firstProductLink = page.locator('a[href^="/p/"]').first();
  await expect(firstProductLink).toBeVisible();
  await firstProductLink.click();

  await expect(page).toHaveURL(/\/p\/\d+$/);
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(
    page.getByRole('heading', { level: 2, name: /reviews/i }),
  ).toBeVisible();
  // Stock varies per live product, so only assert the button renders here —
  // e2e/cart.spec.ts covers the enabled/working state against a known
  // in-stock product id.
  await expect(
    page.getByRole('button', { name: /add to cart/i }),
  ).toBeVisible();
});

test('an unknown product id shows the not-found page', async ({ page }) => {
  const response = await page.goto('/p/999999999');

  expect(response?.status()).toBe(404);
});

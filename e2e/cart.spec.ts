import { expect, test } from '@playwright/test';

test('add to cart from the product page, adjust quantity, and remove it', async ({
  page,
}) => {
  await page.goto('/p/1', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: /add to cart/i }).click();
  await expect(page.getByText(/added to your cart/i)).toBeVisible();

  const cartLink = page.getByRole('link', { name: /^cart/i });
  await expect(cartLink).toContainText('1');
  await cartLink.click();

  await expect(page).toHaveURL(/\/cart$/);
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

test('Buy Now adds the item and goes straight to the cart', async ({
  page,
}) => {
  await page.goto('/p/2', { waitUntil: 'networkidle' });

  await page.getByRole('button', { name: /buy now/i }).click();

  await expect(page).toHaveURL(/\/cart$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /cart \(1 item\)/i }),
  ).toBeVisible();
});

import { expect, test } from '@playwright/test';

test('clicking a product on the home page reaches either a live PDP or honest not-found', async ({
  page,
}) => {
  await page.goto('/');

  const firstProductLink = page.locator('a[href^="/p/"]').first();
  await expect(firstProductLink).toBeVisible();

  await firstProductLink.click();
  await expect(page).toHaveURL(/\/p\//);

  await expect
    .poll(async () => {
      const notFound = await page
        .getByRole('heading', { name: /this page could not be found/i })
        .isVisible()
        .catch(() => false);
      const livePdp = await page
        .getByRole('button', { name: /add to cart/i })
        .isVisible()
        .catch(() => false);

      return notFound || livePdp;
    })
    .toBe(true);
});

test('an unknown product slug shows the not-found page', async ({ page }) => {
  const response = await page.goto('/p/this-slug-does-not-exist');

  expect(response?.status()).toBe(404);
});

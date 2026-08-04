import { expect, test } from '@playwright/test';

test('loads the home page', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: /deals/i })).toBeVisible();
  await expect(page.getByRole('heading', { name: /for you/i })).toBeVisible();
  await expect(page).toHaveTitle(/Sals3/);
});

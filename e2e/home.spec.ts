import { expect, test } from '@playwright/test';

test('loads the home page', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: /to get started/i }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Create Next App/);
});

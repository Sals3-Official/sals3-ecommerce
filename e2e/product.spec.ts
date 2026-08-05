import { expect, test } from '@playwright/test';

// This repo has no reachable `sals3-portal` instance or
// SALS3_STOREFRONT_API_TOKEN configured locally (see README.md's Product
// Page (PDP) section and hot.md). The home page falls back to local
// placeholder products, none of which exist in a real backend, so following
// a product card through to its detail page currently 404s honestly rather
// than rendering — that's the true state of this dev environment today, not
// a bug in this test. Revisit once a real backend + token are configured.
test('clicking a product on the home page falls back to not-found without a configured backend', async ({
  page,
}) => {
  await page.goto('/');

  const firstProductLink = page.locator('a[href^="/p/"]').first();
  await expect(firstProductLink).toBeVisible();

  await firstProductLink.click();
  await expect(page).toHaveURL(/\/p\//);

  // A client-side Next.js Link navigation doesn't produce a fresh
  // navigation response to assert an HTTP status against — check the
  // rendered not-found content instead.
  await expect(
    page.getByRole('heading', { name: /this page could not be found/i }),
  ).toBeVisible();
});

test('an unknown product slug shows the not-found page', async ({ page }) => {
  const response = await page.goto('/p/this-slug-does-not-exist');

  expect(response?.status()).toBe(404);
});

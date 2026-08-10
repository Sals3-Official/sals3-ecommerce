import { expect, test } from '@playwright/test';

const CONSENT_KEY = 'sals3_klaviyo_consent_v1';
const KLAVIYO_SCRIPT_PATTERN =
  'script[src*="static.klaviyo.com/onsite/js/RuXpVU/klaviyo.js"]';

test('Klaviyo script loads only after analytics consent', async ({ page }) => {
  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'x'.repeat(43) }),
    });
  });
  await page.route('**/api/klaviyo/profile-sync', async (route) => {
    await route.fulfill({
      status: 401,
      contentType: 'application/json',
      body: JSON.stringify({ status: 'signed-out' }),
    });
  });
  await page.route('**/static.klaviyo.com/onsite/js/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: 'window.klaviyo = window.klaviyo || {};',
    });
  });

  await page.goto('/');

  await expect(
    page.getByRole('region', { name: /analytics consent/i }),
  ).toBeVisible();
  await expect(page.locator(KLAVIYO_SCRIPT_PATTERN)).toHaveCount(0);

  await page.getByRole('button', { name: /accept analytics/i }).click();

  await expect(page.locator(KLAVIYO_SCRIPT_PATTERN)).toHaveCount(1);
  await expect
    .poll(() =>
      page.evaluate((key) => window.localStorage.getItem(key), CONSENT_KEY),
    )
    .toContain('accepted');
});

test('declining analytics keeps Klaviyo unloaded', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('button', { name: /decline/i }).click();

  await expect(page.locator(KLAVIYO_SCRIPT_PATTERN)).toHaveCount(0);
  await expect
    .poll(() =>
      page.evaluate((key) => window.localStorage.getItem(key), CONSENT_KEY),
    )
    .toContain('declined');
});

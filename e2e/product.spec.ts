import { expect, test } from '@playwright/test';

/**
 * The PDP is server-rendered, and its data comes from `sals3-portal`, which
 * proxies a supplier API capped at one request per second. Under the parallel
 * suite several specs can queue behind that cap, so the navigation can take
 * seconds to commit — and until it does, `page.url()` still reports the page
 * the visitor came from. Playwright's default five-second budget is not enough
 * for a hop that waits on a rate-limited third party.
 */
const UPSTREAM_NAVIGATION_TIMEOUT = 30_000;

test('clicking a product on the home page reaches either a live PDP or honest not-found', async ({
  page,
}) => {
  await page.goto('/');

  const firstProductLink = page.locator('a[href^="/p/"]').first();
  await expect(firstProductLink).toBeVisible();

  // The wait is armed before the click, so a fast navigation cannot complete
  // in the gap between the two and leave nothing left to observe.
  await Promise.all([
    page.waitForURL(/\/p\//, { timeout: UPSTREAM_NAVIGATION_TIMEOUT }),
    firstProductLink.click(),
  ]);

  await expect
    .poll(
      async () => {
        const notFound = await page
          .getByRole('heading', { name: /this page could not be found/i })
          .isVisible()
          .catch(() => false);
        const livePdp = await page
          .getByRole('button', { name: /add to cart/i })
          .isVisible()
          .catch(() => false);

        return notFound || livePdp;
      },
      { timeout: UPSTREAM_NAVIGATION_TIMEOUT },
    )
    .toBe(true);
});

test('an unknown product slug shows the not-found page', async ({ page }) => {
  const response = await page.goto('/p/this-slug-does-not-exist');

  expect(response?.status()).toBe(404);
});

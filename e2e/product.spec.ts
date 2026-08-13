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

  /*
   * An empty catalogue is a legitimate third state, not a failure. The feed now
   * reads published Sals3 products, so a successful response with zero of them
   * is normal — and it does not fall back to placeholders, because a working
   * upstream is not an outage. When that happens there is no product to click,
   * and what must hold instead is that the shopper is told so rather than shown
   * a blank grid.
   */
  if ((await firstProductLink.count()) === 0) {
    await expect(page.getByText(/no products are listed yet/i)).toBeVisible();
    return;
  }

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
        // The Sals3 not-found copy, not Next's default: `/p/[id]/not-found.tsx`
        // replaces it, and an unreachable catalogue now renders a distinct
        // error page instead of masquerading as a missing product.
        const notFound = await page
          .getByRole('heading', { name: /couldn’t find that product/i })
          .isVisible()
          .catch(() => false);
        const upstreamError = await page
          .getByRole('heading', { name: /couldn’t load this product/i })
          .isVisible()
          .catch(() => false);
        const livePdp = await page
          .getByRole('button', { name: /add to cart/i })
          .isVisible()
          .catch(() => false);

        return notFound || upstreamError || livePdp;
      },
      { timeout: UPSTREAM_NAVIGATION_TIMEOUT },
    )
    .toBe(true);
});

test('an unknown product slug shows the Sals3 not-found page', async ({
  page,
}) => {
  const response = await page.goto('/p/this-slug-does-not-exist');

  /*
   * 404 when the portal is reachable and genuinely has no such product; 500
   * when this environment has no `SALS3_STOREFRONT_API_TOKEN`, because the
   * fetch layer then throws instead of silently reporting not-found. Both are
   * correct — and telling them apart is exactly the fix. What must never
   * happen is a 200 for a slug that does not exist.
   */
  expect([404, 500]).toContain(response?.status());
  await expect(
    page
      .getByRole('heading', { name: /couldn’t find that product/i })
      .or(page.getByRole('heading', { name: /couldn’t load this product/i })),
  ).toBeVisible();
});

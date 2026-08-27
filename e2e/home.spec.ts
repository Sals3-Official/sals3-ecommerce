import { expect, test } from '@playwright/test';

const homeViewports = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

homeViewports.forEach((viewport) => {
  test(`loads the home page on ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });
    await page.goto('/');

    await expect(
      page.getByRole('region', { name: /featured deals/i }),
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: /portable air cooler/i }),
    ).toBeVisible();
    const promoImage = page.getByAltText(
      /portable hydrocooling air cooler promotion/i,
    );
    await expect
      .poll(() =>
        promoImage.evaluate(
          (element) =>
            element instanceof HTMLImageElement &&
            element.complete &&
            element.naturalWidth > 0,
        ),
      )
      .toBe(true);
    await expect(page.getByText(/free shipping this weekend/i)).toHaveCount(0);
    /*
     * "For you" is always present — it carries either products or an honest
     * "no products are listed yet". "Deals" is not: a Deals heading with an
     * empty grid under it is worse than no section, so it renders only when
     * there is something to put in it. An empty published catalogue is a real
     * state, not a failure.
     */
    await expect(page.getByRole('heading', { name: /for you/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /^log in$/i })).toBeVisible();
    await expect(page).toHaveTitle(/Sals3/);
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            document.documentElement.scrollWidth <=
            document.documentElement.clientWidth,
        ),
      )
      .toBe(true);
  });
});

test('pages the category carousel with the arrows', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');

  const track = page.getByRole('navigation', { name: 'Categories' });

  await expect(track).toBeVisible();

  const forward = page.getByRole('button', { name: /show more categories/i });
  const back = page.getByRole('button', { name: /show previous categories/i });

  /*
   * The arrows are state, not decoration: the forward one appears once the
   * shell has measured a track wider than one page, and at the start there is
   * nowhere to page back to, so that control must not exist at all. Waiting on
   * `toBeVisible` rather than counting immediately is deliberate — the count
   * races the client shell's first measurement, which is what made an earlier
   * version of this test skip itself intermittently.
   */
  await expect(forward).toBeVisible();
  await expect(back).toHaveCount(0);

  const scrolled = () => track.evaluate((element) => element.scrollLeft);

  expect(await scrolled()).toBe(0);

  await forward.click();
  await expect.poll(scrolled).toBeGreaterThan(0);
  await expect(back).toBeVisible();

  await back.click();
  await expect.poll(scrolled).toBe(0);
  await expect(back).toHaveCount(0);
});

test('opens the signed-in account menu and logs out', async ({ page }) => {
  let didDeleteSession = false;

  await page.route('**/api/auth/session', async (route) => {
    if (route.request().method() === 'DELETE') {
      didDeleteSession = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ status: 'signed-out' }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(
        didDeleteSession
          ? { signedIn: false }
          : { signedIn: true, fullName: 'AJ Shopper' },
      ),
    });
  });
  await page.route('**/api/auth/csrf', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: 'x'.repeat(43) }),
    });
  });

  await page.goto('/');
  const accountMenu = page.getByRole('button', {
    name: /aj shopper account menu/i,
  });

  await expect(accountMenu).toBeVisible();
  await expect(page.getByRole('link', { name: /^log in$/i })).toHaveCount(0);
  await expect(page.getByRole('link', { name: /^sign up$/i })).toHaveCount(0);
  await accountMenu.click();
  await expect(page.getByRole('menu', { name: /account menu/i })).toBeVisible();

  await page.getByRole('menuitem', { name: /log out/i }).click();

  await expect(page.getByRole('link', { name: /^log in$/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /my account/i })).toHaveCount(0);
  expect(didDeleteSession).toBe(true);
});

/*
  The market URLs were live for a day (2026-08-27 to 2026-08-28), so they are in
  browser history and possibly in an index. They carry back to the one storefront
  rather than 404 — the same courtesy the market split extended to the URLs it
  replaced, in the other direction.

  Temporary, not permanent: the owner's word was `muna`, for now, and a 308 is
  cached by every browser and proxy for as long as it takes someone to notice.
*/
test.describe('the retired market URLs', () => {
  [
    { from: '/au', to: '/' },
    { from: '/ph', to: '/' },
    { from: '/fj', to: '/' },
    { from: '/au/cart', to: '/cart' },
    { from: '/ph/categories', to: '/categories' },
  ].forEach(({ from, to }) => {
    test(`${from} lands on ${to}`, async ({ page }) => {
      const response = await page.goto(from);

      expect(new URL(page.url()).pathname).toBe(to);
      expect(response?.status()).toBe(200);

      const chain = response?.request().redirectedFrom();

      // 307, never 308: a permanent redirect would outlive the decision.
      expect(chain?.response().then((first) => first?.status())).resolves.toBe(
        307,
      );
    });
  });

  test('an unknown segment is still a 404, not a redirect', async ({
    page,
  }) => {
    const response = await page.goto('/xx');

    expect(response?.status()).toBe(404);
    expect(new URL(page.url()).pathname).toBe('/xx');
  });
});

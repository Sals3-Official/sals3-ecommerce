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
          : { signedIn: true, firstName: 'AJ' },
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
  const accountMenu = page.getByRole('button', { name: /aj account menu/i });

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

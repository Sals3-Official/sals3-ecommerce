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
    await expect(page.getByRole('heading', { name: /deals/i })).toBeVisible();
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

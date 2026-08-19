import { expect, test } from '@playwright/test';

/**
 * The guard on the buyer orders surface, exercised through a real browser.
 *
 * Signed-out is the only state this can reach without credentials: the pages
 * read the session cookie server-side, and there is no reachable `sals3-portal`
 * instance locally to create one. What that leaves is still the part worth
 * proving end to end — that an unauthenticated request never renders order
 * content and never reveals whether an order number exists.
 */

test('a signed-out visitor is sent to sign-in carrying the orders key', async ({
  page,
}) => {
  await page.goto('/orders');

  await expect(page).toHaveURL(/\/login\?next=orders$/);
  await expect(
    page.getByRole('heading', { level: 1, name: /my orders/i }),
  ).toHaveCount(0);
});

test('an order number in the URL does not open an order for a signed-out visitor', async ({
  page,
}) => {
  await page.goto('/orders/S3-20260812-9F3C1A7B2E');

  await expect(page).toHaveURL(/\/login\?next=orders$/);
  await expect(page.locator('body')).not.toContainText(
    'S3-20260812-9F3C1A7B2E',
  );
});

test('the orders link in the header points at the guarded route', async ({
  page,
}) => {
  await page.goto('/');

  await expect(
    page.getByRole('link', { name: 'Orders', exact: true }).first(),
  ).toHaveAttribute('href', '/orders');
});

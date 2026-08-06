import { expect, test } from '@playwright/test';

test.describe('Login screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
  });

  test('shows the split hero and the sign-in card', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: /one price\./i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', {
        level: 2,
        name: /sign in or create an account/i,
      }),
    ).toBeVisible();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Continue', exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /continue with google/i }),
    ).toBeVisible();
  });

  test('blocks an invalid credential pair with field-level messages', async ({
    page,
  }) => {
    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect(page.getByText(/valid email address/i)).toBeVisible();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    await expect(page.getByRole('status')).toBeHidden();
  });

  test('never puts credentials in the URL on submit', async ({ page }) => {
    await page.getByLabel('Email address').fill('shopper@example.com');
    await page.getByLabel('Password', { exact: true }).fill('correct-horse-1');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();

    await expect(page.getByRole('status')).toContainText(
      /not switched on yet/i,
    );
    expect(new URL(page.url()).search).toBe('');
    await expect(page.getByLabel('Password', { exact: true })).toHaveValue('');
  });

  test('reveals the password only while Show is toggled on', async ({
    page,
  }) => {
    const password = page.getByLabel('Password', { exact: true });

    await password.fill('correct-horse-1');
    await expect(password).toHaveAttribute('type', 'password');

    await page.getByRole('button', { name: /show password/i }).click();
    await expect(password).toHaveAttribute('type', 'text');

    await page.getByRole('button', { name: /hide password/i }).click();
    await expect(password).toHaveAttribute('type', 'password');
  });

  test('sends response hardening headers and does not cache the form', async ({
    page,
  }) => {
    const response = await page.goto('/login');
    const headers = response?.headers() ?? {};

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
    expect(headers['referrer-policy']).toBe('strict-origin-when-cross-origin');

    // `next dev` replaces the configured `no-store` with its own directive, so
    // the assertion here is the invariant that holds in both modes: the form is
    // never storable in a shared cache. The exact production value is asserted
    // in `test/next-config-headers.test.ts`.
    expect(headers['cache-control']).not.toContain('public');
    expect(headers['cache-control']).toMatch(/no-store|no-cache/);
  });

  test('keeps the layout free of horizontal scroll on a phone viewport', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.reload();

    const overflow = await page.evaluate(
      () =>
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    );

    expect(overflow).toBeLessThanOrEqual(1);
    await expect(
      page.getByRole('button', { name: 'Continue', exact: true }),
    ).toBeVisible();
  });
});

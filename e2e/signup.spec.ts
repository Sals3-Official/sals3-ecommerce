import { expect, test, type Page, type Route } from '@playwright/test';

const CSRF_TOKEN = 'x'.repeat(43);
const VALID_NAME = 'AJ Shopper';
const VALID_EMAIL = 'newcomer@example.com';
const VALID_PASSWORD = 'correct-horse-1';

/**
 * As with the login spec, real Firebase is never reachable here. These tests
 * cover the client half — form, request, state, redirect. The
 * server guards live in `src/app/api/auth/signup/route.test.ts`.
 */
async function stubAuthEndpoints(
  page: Page,
  signup?: (route: Route) => Promise<void>,
) {
  await page.route('https://identitytoolkit.googleapis.com/**', (route) =>
    route.abort(),
  );

  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: CSRF_TOKEN }),
    }),
  );

  if (signup) {
    await page.route('**/api/auth/signup', signup);
  }
}

function jsonRoute(status: number, body: unknown) {
  return (route: Route) =>
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
}

async function fillRegistration(page: Page) {
  await page.getByLabel('Full name').fill(VALID_NAME);
  await page.getByLabel('Email address').fill(VALID_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(VALID_PASSWORD);
  await page.getByLabel(/confirm password/i).fill(VALID_PASSWORD);
}

function submitButton(page: Page) {
  return page.getByRole('button', { name: 'Create account', exact: true });
}

test.describe('Signup screen', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/signup');
  });

  test('shows the split hero and the create-account card', async ({ page }) => {
    await expect(
      page.getByRole('heading', { level: 1, name: /one price\./i }),
    ).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: /create your/i }),
    ).toBeVisible();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await expect(page.getByLabel(/confirm password/i)).toBeVisible();
    await expect(submitButton(page)).toBeVisible();
  });

  test('links back to sign-in for a visitor who already has an account', async ({
    page,
  }) => {
    await expect(page.getByRole('link', { name: /sign in/i })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  test('blocks a mismatched confirmation without reaching the network', async ({
    page,
  }) => {
    let signupCalls = 0;

    await stubAuthEndpoints(page, async (route) => {
      signupCalls += 1;
      await jsonRoute(200, { status: 'success' })(route);
    });

    await fillRegistration(page);
    await page.getByLabel(/confirm password/i).fill('a-different-password');
    await submitButton(page).click();

    await expect(page.getByText(/must match/i)).toBeVisible();
    expect(signupCalls).toBe(0);
  });

  test('signs the new account in and lands on the home page', async ({
    page,
  }) => {
    await stubAuthEndpoints(page, jsonRoute(200, { status: 'success' }));
    await page.route('**/api/auth/session', jsonRoute(200, { signedIn: true }));

    await fillRegistration(page);
    await submitButton(page).click();

    // No interstitial: the account is usable immediately.
    await page.waitForURL('**/');
    expect(new URL(page.url()).pathname).toBe('/');
    expect(new URL(page.url()).search).toBe('');
  });

  test('reports an address that is already in use', async ({ page }) => {
    // The one place signup does not mirror sign-in's generic posture: success
    // means "you are signed in", which cannot be faked for someone else's
    // account, so the visitor has to be told.
    await stubAuthEndpoints(
      page,
      jsonRoute(409, { error: 'email_unavailable' }),
    );

    await fillRegistration(page);
    await submitButton(page).click();

    await expect(page.getByRole('alert').first()).toContainText(
      /already uses that email/i,
    );
    expect(new URL(page.url()).pathname).toBe('/signup');
  });

  test('shows a generic notice when registration fails', async ({ page }) => {
    await stubAuthEndpoints(
      page,
      jsonRoute(503, { error: 'service_unavailable' }),
    );

    await fillRegistration(page);
    await submitButton(page).click();

    await expect(page.getByRole('alert').first()).toContainText(
      /something went wrong on our side/i,
    );
  });

  test('sends response hardening headers and does not cache the form', async ({
    page,
  }) => {
    const response = await page.goto('/signup');
    const headers = response?.headers() ?? {};

    expect(headers['x-content-type-options']).toBe('nosniff');
    expect(headers['x-frame-options']).toBe('DENY');
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
    await expect(submitButton(page)).toBeVisible();
  });
});

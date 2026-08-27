import { expect, test, type Page, type Route } from '@playwright/test';

const CSRF_TOKEN = 'x'.repeat(43);
const VALID_EMAIL = 'shopper@example.com';
const VALID_PASSWORD = 'correct-horse-1';

/**
 * Playwright never reaches real Firebase: no credentials are configured for
 * `next dev` or CI, so the server routes are stubbed at the network layer and
 * the upstream hosts are aborted as a tripwire.
 *
 * That means these specs cover the client half only — form, request, state,
 * redirect. The server guards (CSRF, origin, throttling, enumeration parity)
 * are covered by `src/app/api/auth/login/route.test.ts`.
 */
async function stubAuthEndpoints(
  page: Page,
  login?: (route: Route) => Promise<void>,
) {
  await page.route('https://identitytoolkit.googleapis.com/**', (route) =>
    route.abort(),
  );
  await page.route('https://securetoken.googleapis.com/**', (route) =>
    route.abort(),
  );

  await page.route('**/api/auth/csrf', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ csrfToken: CSRF_TOKEN }),
    }),
  );

  if (login) {
    await page.route('**/api/auth/login', login);
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

async function fillCredentials(page: Page) {
  await page.getByLabel('Email address').fill(VALID_EMAIL);
  await page.getByLabel('Password', { exact: true }).fill(VALID_PASSWORD);
}

function continueButton(page: Page) {
  return page.getByRole('button', { name: 'Continue', exact: true });
}

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
    await expect(continueButton(page)).toBeVisible();
    await expect(
      page.getByRole('button', { name: /continue with google/i }),
    ).toBeVisible();
  });

  test('blocks an invalid credential pair without reaching the network', async ({
    page,
  }) => {
    let loginCalls = 0;

    await stubAuthEndpoints(page, async (route) => {
      loginCalls += 1;
      await jsonRoute(200, { status: 'success' })(route);
    });

    await page.getByLabel('Email address').fill('not-an-email');
    await page.getByLabel('Password', { exact: true }).fill('short');
    await continueButton(page).click();

    await expect(page.getByText(/valid email address/i)).toBeVisible();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
    // Field errors also carry role="alert", so the check is that no
    // form-level message appeared: the failure is the input, not the submit.
    await expect(page.getByText(/do not match an account/i)).toHaveCount(0);
    expect(loginCalls).toBe(0);
  });

  test('signs in and lands home without putting credentials in the URL', async ({
    page,
  }) => {
    await stubAuthEndpoints(page, jsonRoute(200, { status: 'success' }));
    await page.route('**/api/auth/session', jsonRoute(200, { signedIn: true }));

    await fillCredentials(page);
    await continueButton(page).click();

    /*
      Sign-in still sends the visitor to `/`, which is now a dispatcher rather
      than a page: it redirects to the market their stored destination names.
      Nothing has been chosen in this run and there is no geo header locally, so
      it resolves to the default market.
    */
    await page.waitForURL('**/au');
    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).pathname).toBe('/au');
  });

  test('keeps the password out of the query string when sign-in fails', async ({
    page,
  }) => {
    await stubAuthEndpoints(
      page,
      jsonRoute(401, { error: 'invalid_credentials' }),
    );

    await fillCredentials(page);
    await continueButton(page).click();

    await expect(page.getByRole('alert').first()).toContainText(
      /do not match an account/i,
    );
    expect(new URL(page.url()).search).toBe('');
    expect(page.url()).not.toContain(VALID_PASSWORD);
  });

  test('never names the reason a credential was rejected', async ({ page }) => {
    await stubAuthEndpoints(
      page,
      jsonRoute(401, { error: 'invalid_credentials' }),
    );

    await fillCredentials(page);
    await continueButton(page).click();

    const alert = page.getByRole('alert').first();

    await expect(alert).toContainText(/do not match an account/i);
    await expect(alert).not.toContainText(
      /no account|not found|wrong password/i,
    );
  });

  test('signs in an account whose address was never verified', async ({
    page,
  }) => {
    // Address verification is out of scope, so an unverified account is an
    // ordinary account.
    await stubAuthEndpoints(page, jsonRoute(200, { status: 'success' }));
    await page.route('**/api/auth/session', jsonRoute(200, { signedIn: true }));

    await fillCredentials(page);
    await continueButton(page).click();

    // `/` dispatches to the default market — see the note above.
    await page.waitForURL('**/au');
    expect(new URL(page.url()).pathname).toBe('/au');
  });

  test('tells the visitor to wait when the attempt is throttled', async ({
    page,
  }) => {
    await stubAuthEndpoints(
      page,
      jsonRoute(429, { error: 'too_many_requests' }),
    );

    await fillCredentials(page);
    await continueButton(page).click();

    await expect(page.getByRole('alert').first()).toContainText(
      /too many sign-in attempts/i,
    );
  });

  test('reveals the password only while Show is toggled on', async ({
    page,
  }) => {
    const password = page.getByLabel('Password', { exact: true });

    await password.fill(VALID_PASSWORD);
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
    await expect(continueButton(page)).toBeVisible();
  });
});

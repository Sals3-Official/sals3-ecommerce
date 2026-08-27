import { expect, test, type Page } from '@playwright/test';

/**
 * `/search` and the header box that feeds it.
 *
 * Like `category.spec.ts`, these assert what holds for *any* catalogue: which
 * term matches which product is the portal's business and a seller can change
 * it between runs. What must not vary is that the box navigates, that the
 * keyword survives every filter, and that each result state says the right
 * thing about itself.
 */

const UPSTREAM_TIMEOUT = 30_000;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'sals3_klaviyo_consent_v1',
      JSON.stringify({
        decision: 'declined',
        decidedAt: '2026-08-25T00:00:00.000Z',
      }),
    );
  });
});

async function hasResults(page: Page): Promise<boolean> {
  return (await page.locator('a[href*="/p/"]').count()) > 0;
}

/**
 * Whether the catalogue answered at all.
 *
 * `/search` reaches the portal, and this suite's `webServer` starts only this
 * app — so in a normal local or CI run the upstream is simply not there and
 * `SearchResults` renders its `isUnavailable` panel. A test that asserts
 * empty-state copy without checking this is really asserting that the portal
 * happened to be running, which is why the case below failed on a green
 * branch.
 *
 * Matched on the heading rather than the body copy: the body names the search
 * term, and a term is exactly the thing these tests vary.
 */
async function catalogueIsUnavailable(page: Page): Promise<boolean> {
  return (
    (await page.getByRole('heading', { name: /search can't run/i }).count()) > 0
  );
}

test('the header box searches from the home page', async ({ page }) => {
  await page.goto('/', { timeout: UPSTREAM_TIMEOUT });

  await page.getByRole('searchbox', { name: /search products/i }).fill('a');
  await page
    .getByRole('searchbox', { name: /search products/i })
    .press('Enter');

  await expect(page).toHaveURL(/\/search\?q=a/, { timeout: UPSTREAM_TIMEOUT });
  await expect(
    page.getByRole('heading', { level: 1, name: /results for/i }),
  ).toBeVisible();
});

/** Submitting nothing must not land on "no results for" an unentered term. */
test('an empty box does not navigate', async ({ page }) => {
  await page.goto('/', { timeout: UPSTREAM_TIMEOUT });

  await page
    .getByRole('searchbox', { name: /search products/i })
    .press('Enter');

  await expect(page).not.toHaveURL(/\/search/);
});

test('/search with no term invites a search rather than reporting none', async ({
  page,
}) => {
  await page.goto('/search', { timeout: UPSTREAM_TIMEOUT });

  await expect(
    page.getByRole('heading', { level: 1, name: /^search$/i }),
  ).toBeVisible();
  await expect(page.getByText(/search the catalogue/i)).toBeVisible();
  await expect(page.getByText(/no products match/i)).toHaveCount(0);
});

test('the box keeps the keyword on the results page', async ({ page }) => {
  await page.goto('/search?q=lamp', { timeout: UPSTREAM_TIMEOUT });

  await expect(
    page.getByRole('searchbox', { name: /search products/i }),
  ).toHaveValue('lamp');
});

/** The core requirement: filters calibrate while the keyword stays. */
test('filtering keeps the keyword in the URL and in the box', async ({
  page,
}) => {
  await page.goto('/search?q=a', { timeout: UPSTREAM_TIMEOUT });

  // Scoped to the sidebar: the footer lists every department too, and an
  // unscoped name matches both.
  const sidebar = page.getByRole('complementary');

  await sidebar.getByRole('link', { name: /^apparel & accessories$/i }).click();
  await expect(page).toHaveURL(/q=a/, { timeout: UPSTREAM_TIMEOUT });
  await expect(page).toHaveURL(/category=apparel-accessories/);

  const band = page.getByRole('radio', { name: /under us\$15/i });
  await band.click();
  await expect(page).toHaveURL(/q=a/, { timeout: UPSTREAM_TIMEOUT });
  await expect(page).toHaveURL(/band=u15/);

  await expect(
    page.getByRole('searchbox', { name: /search products/i }),
  ).toHaveValue('a');
});

test('sorting keeps the keyword', async ({ page }) => {
  await page.goto('/search?q=a', { timeout: UPSTREAM_TIMEOUT });

  await page.getByLabel(/sort/i).selectOption('price-desc');

  await expect(page).toHaveURL(/sort=price-desc/, {
    timeout: UPSTREAM_TIMEOUT,
  });
  await expect(page).toHaveURL(/q=a/);
});

/**
 * Clearing filters must not clear the search — that is the difference between
 * widening a result set and abandoning it.
 */
test('clearing filters keeps the search', async ({ page }) => {
  await page.goto('/search?q=a&band=u15', { timeout: UPSTREAM_TIMEOUT });

  const clear = page.getByRole('link', { name: /^clear all$/i });

  if ((await clear.count()) > 0) {
    await clear.click();
    await expect(page).toHaveURL(/q=a/, { timeout: UPSTREAM_TIMEOUT });
    await expect(page).not.toHaveURL(/band=u15/);
  }
});

test('a term nothing can match says so without blaming filters', async ({
  page,
}) => {
  await page.goto('/search?q=zzzznotathinganyonesells', {
    timeout: UPSTREAM_TIMEOUT,
  });

  test.skip(await hasResults(page), 'catalogue unexpectedly matched');

  /**
   * Branch rather than skip, the same way `category.spec.ts` handles its four
   * result states. The invariant this test exists for holds in both: **nothing
   * may blame filters when no filter was applied.** Skipping the unreadable
   * case would drop that assertion in exactly the run where it is cheapest to
   * make.
   */
  if (await catalogueIsUnavailable(page)) {
    // An unreadable catalogue must not be reported as an empty one — the same
    // distinction `SearchResults` draws between its own two panels.
    await expect(page.getByText(/no products match/i)).toHaveCount(0);
  } else {
    await expect(page.getByText(/no products match/i)).toBeVisible();
  }

  await expect(page.getByText(/with these filters/i)).toHaveCount(0);
});

test('search results are not indexed', async ({ page }) => {
  await page.goto('/search?q=a', { timeout: UPSTREAM_TIMEOUT });

  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    'content',
    /noindex/,
  );
});

test('does not scroll sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/search?q=a', { timeout: UPSTREAM_TIMEOUT });

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

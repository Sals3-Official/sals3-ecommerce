import { expect, test, type Page } from '@playwright/test';

/**
 * `/c/[slug]` — the category listing.
 *
 * ## What these assert, and what they deliberately do not
 *
 * The products come from `sals3-portal`, so which departments have stock is not
 * this suite's to decide: a department with nothing published is a real state,
 * and so is a portal that cannot be reached. Asserting "Animals & Pet Supplies
 * shows one product" would encode today's catalogue into a test that fails the
 * moment a seller publishes or pauses anything — the same reasoning
 * `product.spec.ts` records for the PDP.
 *
 * So each test asserts on what holds for *any* catalogue: the page shell, the
 * controls, the URL contract behind them, and that whichever of the four result
 * states renders, it is one of the four and it says the right thing. The one
 * fully deterministic case is the unknown slug, because the allow-list is
 * static.
 */

const UPSTREAM_TIMEOUT = 30_000;

/**
 * The consent banner is a fixed overlay anchored bottom-left, which is exactly
 * where the sidebar's price radios and the mobile "Filters" trigger sit. Seeded
 * before any script runs so it never renders, rather than dismissed per test —
 * these specs are about the listing, and `klaviyo-consent.spec.ts` already owns
 * the banner's own behaviour.
 */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'sals3_klaviyo_consent_v1',
      JSON.stringify({
        decision: 'declined',
        decidedAt: '2026-08-24T00:00:00.000Z',
      }),
    );
  });
});

/** The four states the results area may legitimately be in. */
async function resultState(
  page: Page,
): Promise<'products' | 'empty' | 'filtered-empty' | 'unavailable'> {
  if ((await page.locator('a[href*="/p/"]').count()) > 0) return 'products';
  if (await page.getByText(/can't be loaded right now/i).isVisible()) {
    return 'unavailable';
  }
  if (await page.getByText(/no product here matches/i).isVisible()) {
    return 'filtered-empty';
  }

  return 'empty';
}

test('renders the department shell with its filter sidebar', async ({
  page,
}) => {
  await page.goto('/c/animals-pet-supplies', { timeout: UPSTREAM_TIMEOUT });

  await expect(
    page.getByRole('heading', { name: 'Animals & Pet Supplies', level: 1 }),
  ).toBeVisible();
  await expect(page).toHaveTitle(/Animals & Pet Supplies/);

  // The breadcrumb's every link is real — this page exists precisely because
  // `/c/<slug>` used to 404.
  const breadcrumb = page.getByRole('navigation', { name: /breadcrumb/i });
  await expect(breadcrumb.getByRole('link', { name: /^home$/i })).toBeVisible();
  await expect(
    breadcrumb.getByRole('link', { name: /all categories/i }),
  ).toBeVisible();

  await expect(page.getByRole('heading', { name: /^price$/i })).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /^category$/i }),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { name: /not filterable yet/i }),
  ).toBeVisible();
});

/**
 * The absent facets are a stated decision, not a gap — and the rating one is
 * load-bearing: a rating filter would have nothing real behind it.
 */
test('names the facets it cannot offer, and why', async ({ page }) => {
  await page.goto('/c/apparel-accessories', { timeout: UPSTREAM_TIMEOUT });

  await expect(page.getByText(/buyer rating/i).first()).toBeVisible();
  await expect(page.getByText(/sals3 has no reviews yet/i)).toBeVisible();
  await expect(page.getByRole('radio', { name: /star/i })).toHaveCount(0);
});

test('an unknown department is a real 404, not an empty page', async ({
  page,
}) => {
  const response = await page.goto('/c/not-a-department', {
    timeout: UPSTREAM_TIMEOUT,
  });

  expect(response?.status()).toBe(404);
  await expect(
    page.getByRole('heading', { name: /no such category/i }),
  ).toBeVisible();
  // Never the empty-department wording: the address is not a department at all.
  await expect(page.getByText(/nothing published/i)).toHaveCount(0);
});

test('a price band navigates and is reflected back in the URL and a chip', async ({
  page,
}) => {
  await page.goto('/c/apparel-accessories', { timeout: UPSTREAM_TIMEOUT });

  const band = page.getByRole('radio', { name: /under us\$15/i });
  await expect(band).toBeVisible();
  // `click`, not `check`: these radios are controlled by the URL, so the
  // checked state flips only once the navigation lands. `check()` asserts the
  // state changed the instant it clicked, which no navigation-driven control
  // can satisfy.
  await band.click();

  // `toHaveURL` polls; `waitForURL` waits for a `load` event, which a soft
  // App Router navigation never fires.
  await expect(page).toHaveURL(/band=u15/, { timeout: UPSTREAM_TIMEOUT });
  await expect(band).toBeChecked();
  await expect(
    page.getByRole('link', { name: /under us\$15/i }).first(),
  ).toBeVisible();

  // Clearing returns to the department's own address, with no query left over.
  await page.getByRole('link', { name: /^clear all$/i }).click();
  await expect(page).toHaveURL(/\/c\/apparel-accessories$/, {
    timeout: UPSTREAM_TIMEOUT,
  });
  await expect(band).not.toBeChecked();
});

test('sorting is a navigation, so it survives a reload', async ({ page }) => {
  await page.goto('/c/apparel-accessories', { timeout: UPSTREAM_TIMEOUT });

  const sort = page.getByLabel(/sort/i);

  await sort.selectOption('price-desc');
  await expect(page).toHaveURL(/sort=price-desc/, {
    timeout: UPSTREAM_TIMEOUT,
  });

  await page.reload({ timeout: UPSTREAM_TIMEOUT });
  await expect(page.getByLabel(/sort/i)).toHaveValue('price-desc');
});

test('the list view is a link, not client state', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/c/apparel-accessories', { timeout: UPSTREAM_TIMEOUT });

  const listView = page.getByRole('link', { name: /list view/i });
  await expect(listView).toBeVisible();
  await listView.click();

  await expect(page).toHaveURL(/view=list/, { timeout: UPSTREAM_TIMEOUT });
});

/**
 * Whatever the catalogue holds, the results area must be in exactly one of its
 * four states — never a blank column, and never an outage wearing the empty
 * department's words.
 */
test('always renders one of its four honest result states', async ({
  page,
}) => {
  await page.goto('/c/electronics', { timeout: UPSTREAM_TIMEOUT });

  const state = await resultState(page);

  if (state === 'products') {
    await expect(page.locator('a[href*="/p/"]').first()).toBeVisible();
  }
  if (state === 'empty') {
    await expect(page.getByText(/nothing published in/i)).toBeVisible();
  }
  if (state === 'unavailable') {
    // An unreadable catalogue must not be reported as an empty one.
    await expect(page.getByText(/nothing published in/i)).toHaveCount(0);
  }
});

/**
 * The in-feed sponsored carousel.
 *
 * Asserted against any catalogue, the way the rest of this file is: the slot is
 * interleaved into the *product* results, so it exists in exactly the state
 * where products do and in none of the other three.
 *
 * The three things checked beyond that are the three that would each be a real
 * failure on a live page. Its links must carry `rel="sponsored"` and must not
 * look like product links. The placement must keep its accessible name, which
 * since the visible label was removed (owner, 2026-08-26) is the only thing
 * announcing an advertisement to a screen reader. And every creative must
 * actually resolve — the artwork is the whole advertisement now, so a 404 here
 * is a blank navy box where an ad was sold.
 */
test('carries the sponsored carousel wherever products are', async ({
  page,
}) => {
  await page.goto('/c/animals-pet-supplies', { timeout: UPSTREAM_TIMEOUT });

  const state = await resultState(page);
  const placement = page.getByRole('region', { name: /sponsored placement/i });

  if (state !== 'products') {
    // An empty department, an unreadable catalogue, and a filter that excluded
    // everything are the page explaining itself. No ad goes on top of that.
    await expect(placement).toHaveCount(0);

    return;
  }

  await expect(placement).toHaveCount(1);

  // One slot, every creative in rotation — the campaign cycles in place rather
  // than taking a cell each. Two today: the third is held back until its
  // comparison-rate warning is complete (`sponsored-slides.test.ts` owns that
  // rule, so this asserts the count the rotation actually has).
  const creatives = placement.locator('img[src*="/ads/psf/"]');
  await expect(creatives).toHaveCount(2);
  await expect(placement.locator('img[src*="psf-refinance"]')).toHaveCount(0);

  // A paid link is marked as one, and is not mistakable for a product link.
  const adLinks = placement.locator('a');
  await expect(adLinks.first()).toHaveAttribute('rel', /sponsored/);
  await expect(placement.locator('a[href*="/p/"]')).toHaveCount(0);

  // Every creative resolves. `naturalWidth` is 0 for an image that 404ed, which
  // a visibility assertion would not catch.
  const decoded = await creatives.evaluateAll((images) =>
    images.every((image) => (image as HTMLImageElement).naturalWidth > 0),
  );
  expect(decoded).toBe(true);

  // The list view carries the same slot, still labelled.
  await page.goto('/c/animals-pet-supplies?view=list', {
    timeout: UPSTREAM_TIMEOUT,
  });
  await expect(
    page.getByRole('region', { name: /sponsored placement/i }),
  ).toHaveCount(1);
});

test('a filtered-empty result blames the filters, not the catalogue', async ({
  page,
}) => {
  // A window no real product can sit in, so this state is reachable without
  // depending on what happens to be published.
  await page.goto('/c/apparel-accessories?priceMin=999990', {
    timeout: UPSTREAM_TIMEOUT,
  });

  const state = await resultState(page);

  test.skip(state === 'unavailable', 'catalogue unreachable in this run');

  await expect(page.getByText(/no product here matches/i)).toBeVisible();
  await expect(page.getByText(/nothing published in/i)).toHaveCount(0);
  await expect(
    page.getByRole('link', { name: /clear every filter/i }),
  ).toBeVisible();
});

test('the mobile sheet carries the same filters as the sidebar', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/c/apparel-accessories', { timeout: UPSTREAM_TIMEOUT });

  // The sidebar is hidden below `lg`; the trigger replaces it.
  await expect(page.getByRole('button', { name: /^filters/i })).toBeVisible();
  await page.getByRole('button', { name: /^filters/i }).click();

  const sheet = page.getByRole('dialog', { name: /filters/i });
  await expect(sheet).toBeVisible();
  await expect(
    sheet.getByRole('radio', { name: /under us\$15/i }),
  ).toBeVisible();
  await expect(sheet.getByRole('heading', { name: /^price$/i })).toBeVisible();

  await sheet.getByRole('button', { name: /close filters/i }).click();
  await expect(sheet).toBeHidden();
});

test('does not scroll sideways on a phone', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/c/apparel-accessories', { timeout: UPSTREAM_TIMEOUT });

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

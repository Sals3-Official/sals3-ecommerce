import { defineConfig, devices } from '@playwright/test';

const port = Number(process.env.PORT ?? 3000);
/**
 * `127.0.0.1` by default, which is what the suite's own `webServer` binds to.
 *
 * Overridable because `reuseExistingServer` is on locally: a `next dev` started
 * by hand binds `localhost`, and Next serves the document over `127.0.0.1`
 * while its RSC stream and HMR socket do not — so the suite would drive a page
 * that renders blank and never hydrates, and every interaction assertion would
 * fail for a reason that has nothing to do with the app.
 */
const host = process.env.PLAYWRIGHT_HOST ?? '127.0.0.1';
const baseURL = `http://${host}:${port}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
    env: {
      ...process.env,
      NEXT_PUBLIC_KLAVIYO_SITE_ID:
        process.env.NEXT_PUBLIC_KLAVIYO_SITE_ID ?? 'RuXpVU',
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    url: baseURL,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});

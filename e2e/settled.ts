import { expect, type Locator } from '@playwright/test';

/**
 * Wait until a streamed results area has committed to one of the states it can
 * legitimately render, so the caller can classify it honestly.
 *
 * Why this exists: `locator.count()` and `locator.isVisible()` are **snapshots**.
 * They answer for the DOM as it stands at that instant and never wait. Since
 * `loading.tsx` landed on 2026-09-01 the catalogue pages answer immediately with
 * a skeleton and stream their results in, so `page.goto()` now returns at first
 * paint rather than when the Portal has answered.
 *
 * A helper that classifies from a snapshot therefore reads *"not here yet"* as
 * *"empty"*, and the test asserts the wrong branch. That is what made
 * `search.spec.ts` fail a **different** test on every full-suite run while
 * passing in isolation: under parallel load the skeleton is still on screen when
 * the helper samples, and serialising the suite (`--workers=1`) hid it entirely.
 *
 * Waiting for the union of the terminal states first is what makes the snapshot
 * that follows mean something. It deliberately does **not** assert *which* state
 * arrived — which one is correct is the caller's business, and the point of
 * these suites is that every state is legitimate for some catalogue.
 */
export default async function waitForOneOf(
  states: Locator[],
  timeout: number,
): Promise<void> {
  if (states.length === 0) {
    throw new Error('waitForOneOf needs at least one state to wait for');
  }

  const anyState = states.reduce((combined, state) =>
    combined.or(state.first()),
  );

  await expect(anyState.first()).toBeVisible({ timeout });
}

import { describe, expect, it } from 'vitest';
import {
  PSF_HELD_BACK_SLIDES,
  PSF_RATE_DISCLOSURE,
  PSF_SLIDES,
} from './sponsored-slides';

/**
 * The campaign is a real advertiser's claims on a public storefront, so what is
 * checked here is not shape — it is the two rules that decide whether a
 * creative may be shown at all.
 */

/** The unfilled template field ASIC requires to be replaced with a real basis. */
const UNFILLED_BASIS = '[loan type and amount details';

describe('the live rotation', () => {
  it('runs the two creatives that advertise no rate', () => {
    expect(PSF_SLIDES.map((slide) => slide.id)).toEqual([
      'psf-car-loans',
      'psf-home-loans',
    ]);
  });

  it('carries no incomplete comparison-rate warning', () => {
    // The gate, and the reason this file exists. A creative whose warning still
    // has its template bracket may not be in rotation — not because someone
    // remembers, but because this fails if it is. Re-exporting the artwork with
    // the real loan example, and updating `PSF_RATE_DISCLOSURE` to match, is
    // what moves the third creative into `PSF_SLIDES`.
    const withUnfilledWarning = PSF_SLIDES.filter((slide) =>
      slide.alt.includes(UNFILLED_BASIS),
    );

    expect(withUnfilledWarning).toEqual([]);
  });

  it('describes each creative in full, because the copy is all pixels', () => {
    // An empty or decorative `alt` would drop the entire advertisement for a
    // screen-reader user — there is no live text in the slot to fall back on.
    PSF_SLIDES.forEach((slide) => {
      expect(slide.alt.length).toBeGreaterThan(40);
      expect(slide.alt).toContain('Premium Select Finance');
      expect(slide.href).toMatch(/^https:\/\/premiumselectfinance\.com\.au\//);
    });
  });
});

describe('the held-back creative', () => {
  it('is the refinance one, and is not in rotation', () => {
    const heldBackIds = PSF_HELD_BACK_SLIDES.map((slide) => slide.id);
    const liveIds = new Set(PSF_SLIDES.map((slide) => slide.id));

    expect(heldBackIds).toEqual(['psf-refinance']);
    expect(heldBackIds.filter((id) => liveIds.has(id))).toEqual([]);
  });

  it('is held back for the reason recorded, not an unrelated one', () => {
    // If this ever fails, the bracket is gone from the disclosure and the
    // creative can be promoted — the assertion is the reminder.
    expect(PSF_RATE_DISCLOSURE).toContain(UNFILLED_BASIS);
  });
});

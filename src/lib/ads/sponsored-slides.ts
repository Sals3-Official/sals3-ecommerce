/**
 * The sponsored creatives carried by the in-feed ad slot.
 *
 * ## The creative is the advertiser's artwork, not a re-typeset copy of it
 *
 * Each slide is the finished image Premium Select Finance supplied. An earlier
 * pass rebuilt the comps as HTML so the type could reflow; this does not,
 * because an advertiser's artwork is the thing they bought the placement for
 * and re-setting it is editing someone else's ad. What the storefront adds
 * around the artwork is its own: the "Sponsored" label, the advertiser strip,
 * and the comparison-rate warning below.
 *
 * ## Why the rate warning is also real text
 *
 * The warning is baked into the third creative at a size that survives a
 * 1528px social post and disappears in a 224px grid cell. Rendered again as
 * live text it can be zoomed, selected, and read aloud, none of which a raster
 * can do. It is not a second version of the claim — it is the same sentence,
 * verbatim, in a form a reader can actually use.
 */

/**
 * The one colour the frame still needs: the advertiser's navy, so the letterbox
 * around the artwork reads as part of the creative rather than as a gap.
 *
 * Deliberately *not* added to the Sals3 design tokens in `globals.css` — this
 * is a third party's brand, and folding an advertiser's colours into the
 * storefront's own system is how a sponsored slot stops looking sponsored. It
 * held a second, darker shade for the label and control bars until the owner
 * removed both (2026-08-26); there is nothing left to paint with it.
 */
export const PSF_BRAND = {
  navy: '#0e2c4d',
} as const;

/**
 * The advertiser's name, credential line, and site are not constants here.
 * They were, until the frame stopped printing them (owner, 2026-08-26) — every
 * one of them is composed into the artwork, and a second copy in a second
 * typeface underneath was the storefront talking over its own advertiser.
 *
 * TODO(owner): the creatives say "Australian Credit Representative" with no
 * ACL or ACR number. Australian credit advertising has to carry one, and it is
 * omitted rather than invented — an unnumbered licence claim is a claim with
 * nothing behind it. Fixing it means re-exporting the artwork, not editing
 * this file.
 */

/**
 * Verbatim from the third creative, bracket and all.
 *
 * TODO(owner): the bracket is an unfilled template field inside a warning ASIC
 * requires to be complete. It is left exactly as supplied rather than quietly
 * filled with a plausible loan example, because a guessed comparison-rate
 * basis is a fabricated financial claim and this campaign must not carry one.
 * Replace `[loan type and amount details, e.g., $150,000 car loan]` with the
 * real basis before this goes live.
 */
export const PSF_RATE_DISCLOSURE =
  'Terms and conditions apply. Comparison rate based on a [loan type and amount details, e.g., $150,000 car loan] over 5 years. WARNING: This comparison rate applies only to the example or examples given and may not include all fees and charges. Different terms, fees or other loan amounts might result in a different comparison rate.';

/**
 * TODO(owner): per-slide deep links. Every creative currently lands on the
 * advertiser's home page because no landing-page URLs were supplied, and a
 * guessed `/car-loans` path that 404s costs the advertiser the click.
 */
const PSF_HOME = 'https://premiumselectfinance.com.au/';

/** Every creative was exported at the same size, so one pair covers all three. */
const CREATIVE_WIDTH = 800;
const CREATIVE_HEIGHT = 1072;

export type SponsoredSlide = {
  id: string;
  src: string;
  /**
   * What the artwork says, for a reader who cannot see it. The creatives carry
   * all of their copy as pixels, so an empty or decorative `alt` here would
   * drop the entire advertisement for anyone using a screen reader.
   */
  alt: string;
  href: string;
};

export const CREATIVE_ASPECT = `${CREATIVE_WIDTH}/${CREATIVE_HEIGHT}`;

export const PSF_SLIDES: readonly SponsoredSlide[] = [
  {
    id: 'psf-car-loans',
    src: '/ads/psf/psf-car-loans.webp',
    alt: "Premium Select Finance, car and vehicle loans. Never take the dealership's first finance offer. We beat dealer rates and get you pre-approved in 24 hours. Get fast pre-approval.",
    href: PSF_HOME,
  },
  {
    id: 'psf-home-loans',
    src: '/ads/psf/psf-home-loans.webp',
    alt: "Premium Select Finance. Ready to stop paying your landlord's mortgage? First home buyer grants and low-deposit options made simple. Check my eligibility.",
    href: PSF_HOME,
  },
  {
    id: 'psf-refinance',
    src: '/ads/psf/psf-refinance.webp',
    alt: `Premium Select Finance, mortgages, car loans and refinancing. Is your bank quietly charging you too much? 5.49 per cent comparison rate. Calculate your savings. ${PSF_RATE_DISCLOSURE}`,
    href: PSF_HOME,
  },
];

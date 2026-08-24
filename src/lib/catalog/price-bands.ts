/**
 * Price bands for the category listing sidebar.
 *
 * Bounds are in minor units (cents) to compare directly against
 * `Product.priceMinor` with no float conversion at filter time.
 */
export type PriceBand = {
  id: 'any' | 'u15' | '15-30' | '30-50' | 'o50';
  label: string;
  minMinor: number;
  maxMinor: number;
};

export const PRICE_BANDS: readonly PriceBand[] = [
  { id: 'any', label: 'Any price', minMinor: 0, maxMinor: Infinity },
  { id: 'u15', label: 'Under US$15', minMinor: 0, maxMinor: 1500 },
  { id: '15-30', label: 'US$15 – US$30', minMinor: 1500, maxMinor: 3000 },
  { id: '30-50', label: 'US$30 – US$50', minMinor: 3000, maxMinor: 5000 },
  { id: 'o50', label: 'US$50 and up', minMinor: 5000, maxMinor: Infinity },
];

export type PriceBandId = PriceBand['id'];

const PRICE_BAND_IDS = PRICE_BANDS.map((band) => band.id);

export function isPriceBandId(value: string): value is PriceBandId {
  return (PRICE_BAND_IDS as readonly string[]).includes(value);
}

export function priceBandById(id: PriceBandId): PriceBand {
  return PRICE_BANDS.find((band) => band.id === id) ?? PRICE_BANDS[0]!;
}

/**
 * The three availability values the card feed actually publishes
 * (`StorefrontProductSchema.availability`). No stock count exists anywhere in
 * the contract, on purpose — see `services/storefront/schemas.ts`.
 */
export type AvailabilityKey = 'AVAILABLE' | 'UNKNOWN' | 'UNAVAILABLE';

export const AVAILABILITY_LABELS: Record<AvailabilityKey, string> = {
  AVAILABLE: 'Supplier reports in stock',
  UNKNOWN: 'Availability unknown',
  UNAVAILABLE: 'Reported unavailable',
};

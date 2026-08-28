export const SHIPPING_TIERS = ['Standard', 'Express', 'Expedited'] as const;

export type ShippingTier = (typeof SHIPPING_TIERS)[number];

export function formatArrivalWindow(arrivalTime: string): string {
  return arrivalTime.replace(/\s*[-\u2013]\s*/, '–');
}

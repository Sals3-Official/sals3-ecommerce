import type { PlaceholderTone } from '@/lib/home-placeholder-data';

const TONE_GRADIENTS: Record<PlaceholderTone, string> = {
  ocean: 'linear-gradient(142deg, #9ad9e6 0%, #6aa9d4 46%, #4f7fc0 100%)',
  dusk: 'linear-gradient(142deg, #f3c6a0 0%, #e08a8a 46%, #b45f8e 100%)',
  meadow: 'linear-gradient(142deg, #bfe6b0 0%, #7fc199 46%, #3f8f7c 100%)',
  clay: 'linear-gradient(142deg, #f0d3a8 0%, #d9a05f 46%, #a86b3e 100%)',
};

type ProductImagePlaceholderProps = {
  tone: PlaceholderTone;
  className?: string;
};

/**
 * No product photography exists yet (catalog service is not built, see
 * sals3-ux-build-specification stage 3). This decorative gradient stands in
 * for a real photo, so it intentionally carries no <img> or alt text.
 */
export default function ProductImagePlaceholder({
  tone,
  className = '',
}: ProductImagePlaceholderProps) {
  return (
    <div
      className={`aspect-square ${className}`}
      style={{ background: TONE_GRADIENTS[tone] }}
    />
  );
}

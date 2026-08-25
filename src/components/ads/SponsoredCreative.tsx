import Image from 'next/image';
import {
  CREATIVE_ASPECT,
  type SponsoredSlide,
} from '@/lib/ads/sponsored-slides';

type SponsoredCreativeProps = {
  slide: SponsoredSlide;
  /** The first slide is the one on screen at load, so it does not lazy-load. */
  isFirst: boolean;
  /** `sizes` differs between a grid cell and a centred list row. */
  sizes: string;
};

/**
 * One creative: the advertiser's artwork, and nothing on top of it.
 *
 * The "Sponsored" label lives in the frame above rather than overlaid here. It
 * is the storefront's word, not the advertiser's, and every one of these
 * layouts puts its headline in the top third — an overlaid badge sat on the
 * word "dealership's".
 *
 * `object-contain` and the artwork's own aspect ratio, so nothing is cropped.
 * These are finished layouts: a crop that trimmed the dead space under the
 * third creative would also take the call-to-action button off the second.
 */
export default function SponsoredCreative({
  slide,
  isFirst,
  sizes,
}: SponsoredCreativeProps) {
  return (
    <a
      href={slide.href}
      target="_blank"
      /* `sponsored` has been a valid `rel` value since 2019 and this rule's
         allow-list predates it. Google requires a paid link to carry
         `sponsored` or `nofollow`; an unmarked paid link is a search-policy
         violation, so the value stays and the stale rule gives way. */
      // eslint-disable-next-line react/no-invalid-html-attribute
      rel="sponsored noopener noreferrer"
      className="relative block w-full hover:no-underline"
      style={{ aspectRatio: CREATIVE_ASPECT }}
    >
      <Image
        src={slide.src}
        alt={slide.alt}
        fill
        sizes={sizes}
        className="object-contain"
        loading={isFirst ? 'eager' : 'lazy'}
      />
    </a>
  );
}

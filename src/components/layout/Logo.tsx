import Image from 'next/image';
import Link from 'next/link';

/**
 * The mark is 640x219 and is drawn in navy and teal on transparency, so it
 * disappears against the expanded header's gradient. `--header-logo-filter`
 * flips it to solid white there and back to its own colours once the header
 * compacts; both states are written as the same filter list so the swap
 * interpolates instead of snapping. The white state is a clean knockout because
 * the asset carries no opaque white pixels at all — the counter inside the bag
 * is transparent, so it shows the gradient through rather than filling in.
 *
 * Height is the only dimension set (40px expanded, 30px compact, from
 * `--header-logo-height`). `width: auto` keeps the intrinsic 2.92:1 proportion
 * at every height, and the `width`/`height` attributes stay at the intrinsic
 * pixel size so the browser reserves the right box before the file arrives.
 *
 * The mark points at `/`, the storefront home. It pointed at the current
 * market's home (`/au`, `/ph`, `/fj`) for the day the markets existed, because
 * `/` was then a dispatcher that re-resolved the destination and could move a
 * buyer to another country's shopfront.
 */
export default function Logo() {
  return (
    <Link href="/" className="flex shrink-0 items-center rounded-lg">
      <Image
        src="/sals3-logo.webp"
        alt="Sals3"
        width={640}
        height={219}
        priority
        className="h-[var(--header-logo-height)] w-auto transition-[height,filter] duration-250 ease-out"
        style={{ filter: 'var(--header-logo-filter)' }}
      />
    </Link>
  );
}

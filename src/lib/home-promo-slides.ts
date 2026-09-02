export type HomePromoSlide = {
  id: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
};

/**
 * Seven trust slides, not seven product ads.
 *
 * The previous set were supplier promo images copied out of a Downloads folder
 * on 2026-08-05 and never replaced. Every one of them linked to
 * `/deals?promo=<id>`, which has always returned 404 — the highest-intent click
 * on the home page failed every time — and one of them printed `MID YEAR SALE`
 * over a catalogue that has no discount concept at all, the same unbacked
 * marketing claim that was stripped out of `DealsSection` in August.
 *
 * This set answers the only question a first-time visitor to an unknown shop is
 * actually asking, which the build spec states as "Is this shop safe?": one
 * clear price, real breadth, real sizes, free delivery over the cart threshold,
 * tracked parcels, an encrypted checkout, and the brand itself. Nothing here
 * claims a saving, a deadline, a rating or a stock level, so nothing here can
 * go stale or turn out to be false.
 *
 * Every `href` below is verified to return 200 in production. Keep it that way:
 * a hero that promises something and lands on a 404 costs more trust than it
 * ever buys.
 */
export const homePromoSlides: HomePromoSlide[] = [
  {
    id: 'one-price',
    title: 'One clear price',
    imageSrc: '/home-promos/one-price.png',
    imageAlt: 'One clear price promotion',
    href: '/categories',
  },
  {
    id: 'departments',
    title: '21 categories, one cart',
    imageSrc: '/home-promos/departments.png',
    imageAlt: 'Twenty-one categories promotion',
    href: '/categories',
  },
  {
    id: 'sizes',
    title: 'Many styles go up to 8XL',
    imageSrc: '/home-promos/sizes.png',
    imageAlt: 'Extended clothing sizes promotion',
    href: '/c/apparel-accessories',
  },
  {
    id: 'free-delivery',
    title: 'Free standard delivery',
    imageSrc: '/home-promos/free-delivery.png',
    imageAlt: 'Free standard delivery promotion',
    href: '/categories',
  },
  {
    id: 'tracking',
    title: 'We track every parcel',
    imageSrc: '/home-promos/tracking.png',
    imageAlt: 'Order tracking promotion',
    href: '/orders',
  },
  {
    id: 'secure-checkout',
    title: 'Safe and secure checkout',
    imageSrc: '/home-promos/secure-checkout.png',
    imageAlt: 'Safe and secure checkout promotion',
    href: '/categories',
  },
  {
    id: 'brand',
    title: 'Smart affordable lifestyle shopping',
    imageSrc: '/home-promos/brand.png',
    imageAlt: 'Sals3 brand promotion',
    href: '/categories',
  },
];

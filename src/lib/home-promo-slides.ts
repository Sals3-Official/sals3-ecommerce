export type HomePromoSlide = {
  id: string;
  title: string;
  imageSrc: string;
  imageAlt: string;
  href: string;
};

export const homePromoSlides: HomePromoSlide[] = [
  {
    id: 'air-cooler',
    title: 'Portable air cooler',
    imageSrc: '/home-promos/air-cooler.png',
    imageAlt: 'Portable hydrocooling air cooler promotion',
    href: '/deals?promo=air-cooler',
  },
  {
    id: 'nightstand-lamp',
    title: 'Smart LED nightstand',
    imageSrc: '/home-promos/nightstand-lamp.png',
    imageAlt: 'Smart LED nightstand promotion',
    href: '/deals?promo=nightstand-lamp',
  },
  {
    id: 'portable-blender',
    title: 'Portable blender',
    imageSrc: '/home-promos/portable-blender.png',
    imageAlt: 'Portable blender promotion',
    href: '/deals?promo=portable-blender',
  },
  {
    id: 'sunscreen',
    title: 'SPF 90 sunscreen',
    imageSrc: '/home-promos/sunscreen.png',
    imageAlt: 'SPF 90 isolation sunscreen promotion',
    href: '/deals?promo=sunscreen',
  },
  {
    id: 'waterproof-sandals',
    title: 'Waterproof sandals',
    imageSrc: '/home-promos/waterproof-sandals.png',
    imageAlt: 'Mens waterproof sandals promotion',
    href: '/deals?promo=waterproof-sandals',
  },
  {
    id: 'gym-tote',
    title: 'Large capacity gym tote',
    imageSrc: '/home-promos/gym-tote.png',
    imageAlt: 'Large capacity gym tote promotion',
    href: '/deals?promo=gym-tote',
  },
  {
    id: 'mid-year-sale',
    title: 'Sals3 mid year sale',
    imageSrc: '/home-promos/mid-year-sale.png',
    imageAlt: 'Sals3 mid year sale promotion',
    href: '/deals?promo=mid-year-sale',
  },
];

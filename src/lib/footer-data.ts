export type FooterLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: FooterLink[];
};

export const FOOTER_COLUMNS: FooterColumn[] = [
  {
    title: 'Company',
    links: [
      { label: 'Vision statement', href: '/about/vision' },
      { label: 'Careers', href: '/careers' },
      { label: 'Sals3 blog', href: '/blog' },
      { label: 'Sell on Sals3', href: '/sell' },
      { label: 'Contact us', href: '/contact' },
    ],
  },
  {
    title: 'Help',
    links: [
      { label: 'Track an order', href: '/orders' },
      { label: 'Shipping information', href: '/help/shipping' },
      { label: 'Returns and refunds', href: '/help/returns' },
      { label: 'How pricing works', href: '/help/pricing' },
      { label: 'Report a listing', href: '/help/report' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy policy', href: '/legal/privacy' },
      { label: 'Terms of use', href: '/legal/terms' },
      { label: 'Return and refund policy', href: '/legal/returns' },
      { label: 'Intellectual property policy', href: '/legal/ip' },
      { label: 'Seller agreement', href: '/legal/seller' },
    ],
  },
];

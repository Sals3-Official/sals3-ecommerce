export type GuestUtilityLink = {
  label: string;
  href: string;
};

/**
 * Shown above the main header row. Account-specific links are now rendered by
 * `GuestAuthLinks` only after the verified server session reports signed out.
 */
export const GUEST_UTILITY_LEFT_LINKS: GuestUtilityLink[] = [
  { label: 'Feedback', href: '/contact' },
];

export const GUEST_UTILITY_RIGHT_LINKS: GuestUtilityLink[] = [
  { label: 'Sell on Sals3', href: '/sell' },
  { label: 'Customer Care', href: '/help' },
];

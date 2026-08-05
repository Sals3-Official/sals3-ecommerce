export type GuestUtilityLink = {
  label: string;
  href: string;
};

/**
 * Shown above the main header row while no account is signed in. Sals3 has
 * no auth/session system yet (see hot.md), so this always renders the
 * signed-out state — swap for a real check once sign-in exists.
 */
export const GUEST_UTILITY_LEFT_LINKS: GuestUtilityLink[] = [
  { label: 'Feedback', href: '/contact' },
];

export const GUEST_UTILITY_RIGHT_LINKS: GuestUtilityLink[] = [
  { label: 'Sell on Sals3', href: '/sell' },
  { label: 'Customer Care', href: '/help' },
];

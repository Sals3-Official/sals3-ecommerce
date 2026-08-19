export type GuestUtilityLink = {
  label: string;
  href: string;
  /**
   * The two support links fold away below `sm` for space; `Feedback` stays at
   * every width. Visibility is the only thing that differs between them — all
   * three share one type style (owner decision, 2026-08-20).
   */
  hideOnMobile: boolean;
};

/**
 * Shown above the main header row, all right-aligned: `Feedback` sat alone on
 * the left until the owner moved it beside `Customer Care` (2026-08-20), which
 * left nothing on that side. It sits last so it reads as part of the support
 * group rather than competing with `Sell on Sals3` for the first slot.
 *
 * Account-specific links are not in this list: `GuestAuthLinks` renders those
 * only after the verified server session reports signed out.
 */
export const GUEST_UTILITY_LINKS: GuestUtilityLink[] = [
  { label: 'Sell on Sals3', href: '/sell', hideOnMobile: true },
  { label: 'Customer Care', href: '/help', hideOnMobile: true },
  { label: 'Feedback', href: '/contact', hideOnMobile: false },
];

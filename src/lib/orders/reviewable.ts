import type { BuyerOrder, BuyerOrderLine } from './contracts';

/**
 * Which lines of an order the buyer may review right now.
 *
 * ## Nothing here decides eligibility
 *
 * `line.reviewable` is the portal's answer — the line's own parcel `DELIVERED`,
 * inside the window, not already reviewed — and this function only reads it. The
 * extra `review === undefined` test is not a second rule: it is the same
 * defensive order `OrderLineReviewControl` already takes, so a payload that
 * shipped a stale `reviewable: true` beside a recorded review still offers
 * nothing. A written review wins over a flag that disagrees with it.
 *
 * The gate that matters is the portal's, in a single `WHERE`, on submit. This is
 * the usability half (rule 19): it decides whether a button is drawn, never
 * whether a write is allowed.
 *
 * ## Why the shape is narrower than `BuyerOrderLine`
 *
 * The modal is a client component, so every field returned here is serialized
 * into the RSC payload for every order on the page. It needs four: the id to
 * submit against, and the title, variant and image so the buyer can see which
 * item they are rating. The frozen listing, the money strings and the accepted
 * date are all on the line and none of them belong in a browser payload.
 */

export type ReviewableLine = {
  id: string;
  title: string;
  variant: string | null;
  imageUrl: string | null;
};

function isOpen(line: BuyerOrderLine): boolean {
  return line.reviewable && line.review === undefined;
}

export default function reviewableLinesOf(order: BuyerOrder): ReviewableLine[] {
  return order.packages.flatMap((pkg) =>
    pkg.lines.filter(isOpen).map((line) => ({
      id: line.id,
      title: line.title,
      variant: line.variant,
      imageUrl: line.imageUrl,
    })),
  );
}

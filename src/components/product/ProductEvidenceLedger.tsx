import type { ProductAvailability } from '@/lib/product-detail';
import { PRODUCT_MICRO_LABEL } from './product-label-styles';

type ProductEvidenceLedgerProps = {
  availability?: ProductAvailability;
  /** ISO-8601 publish time, when the payload carries one. */
  publishedAt?: string;
  /** Real Sals3 buyer ratings. Absent means nobody has reviewed this product. */
  rating?: { average: number; count: number };
  /**
   * Whether the reviews section rendered on this page.
   *
   * `ProductReviews` bows out when the review list could not be fetched, even
   * though the product payload still carries the rating. Linking on the rating
   * alone would therefore produce a dead anchor exactly when the review read is
   * failing, so the row states the rating either way and only becomes a link
   * when there is something to land on.
   */
  reviewsAnchored?: boolean;
};

/**
 * "What we know" — the PDP's signature element.
 *
 * Sals3 cannot show ratings, review counts, stock numbers, delivery dates, or a
 * was/now price: each is prohibited without evidence it does not have. The usual
 * response to that is a row of unverifiable trust badges. This does the opposite
 * and states the unknowns as content, with the reason each one is unknown.
 *
 * A filled mark is a claim the payload supports. A hollow mark is a stated
 * unknown. The marks are `aria-hidden` and every row's meaning lives in its
 * `<dd>` text, so the distinction is never carried by colour alone.
 *
 * ## No invented dates
 *
 * `publishedAt` is real — the price is resolved once at publish time and frozen
 * onto the offer, so "fixed when published" is a claim the data supports. There
 * is deliberately **no** stock-observation date: no such field exists anywhere in
 * the contract, so the stock row is dateless rather than carrying a plausible
 * number. A fabricated date in the one element whose entire purpose is evidence
 * would be the worst available failure on this page.
 */

/**
 * Corrected 2026-08-21. This row used to read "No estimate exists yet. Nothing
 * is added to this price at checkout." The second sentence was true when it was
 * written and is **false now**: live CJ freight quotes shipped on 2026-08-17,
 * `quoteCheckoutShippingAction` prices each package against the buyer's own
 * address, and `selectionTotal` adds the chosen amount to the Stripe session.
 * So a delivery charge is added, and the ledger was denying it — on the one
 * element of this page whose whole purpose is to be the part a buyer can trust.
 *
 * The mark stays **hollow**, and that is still correct: what remains genuinely
 * unknown here is what delivery will cost *this* buyer, because it depends on
 * an address the PDP does not have. The row now states that unknown and where
 * it resolves, instead of making a price claim on its behalf.
 */
const DELIVERY =
  'No estimate until checkout, where it is quoted for your address and added to this price.';
/**
 * The reviews row.
 *
 * This used to be the constant `'None. Sals3 has no reviews yet.'`, and the
 * ledger was never handed a rating — so on a product with published reviews the
 * page said it had none, directly above the reviews themselves. That is the
 * worst available failure on the one element whose entire purpose is to be the
 * part a buyer can trust: a visible self-contradiction there discredits the
 * other three rows as well.
 *
 * The mark is filled when a review exists, because it then rests on evidence the
 * payload carries, and the row links to that evidence — the reviews section sits
 * far below the fold, so a claim the reader cannot get to is barely a claim.
 */
function reviewsRow(
  rating: { average: number; count: number } | undefined,
  anchored: boolean,
): {
  filled: boolean;
  value: string;
  href?: string;
} {
  if (rating === undefined || rating.count === 0) {
    return { filled: false, value: 'None yet. Be the first to review this.' };
  }

  const count =
    rating.count === 1
      ? '1 verified purchase'
      : `${rating.count} verified purchases`;

  return {
    filled: true,
    value: `${rating.average.toFixed(1)} out of 5, from ${count}.`,
    href: anchored ? '#reviews-heading' : undefined,
  };
}

/**
 * `14 August 2026`. Day-first because both approved buyer destinations read it
 * that way, and the month is spelled out so no reader has to guess the order.
 * An unparseable value yields `undefined` and the row falls back to dateless
 * copy rather than rendering "Invalid Date".
 */
function formatPublishedOn(iso: string): string | undefined {
  const date = new Date(iso);

  if (Number.isNaN(date.getTime())) return undefined;

  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function stockRow(availability: ProductAvailability | undefined): {
  filled: boolean;
  value: string;
} {
  if (availability === 'AVAILABLE') {
    return { filled: true, value: 'Reported available by the supplier.' };
  }

  if (availability === 'UNAVAILABLE') {
    return { filled: true, value: 'Reported unavailable by the supplier.' };
  }

  return { filled: false, value: 'Not confirmed recently.' };
}

function Mark({ filled }: { filled: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={`mt-[5px] size-[9px] shrink-0 rounded-full ${
        filled ? 'bg-teal-500' : 'border-[1.5px] border-ink-faint'
      }`}
    />
  );
}

function Row({
  term,
  value,
  filled,
  href,
}: {
  term: string;
  value: string;
  filled: boolean;
  href?: string;
}) {
  return (
    <div className="grid grid-cols-[9px_minmax(0,110px)_minmax(0,1fr)] items-start gap-x-2.5">
      <Mark filled={filled} />
      <dt className="text-sm text-ink">{term}</dt>
      <dd className="text-sm text-ink-muted">
        {href === undefined ? value : <a href={href}>{value}</a>}
      </dd>
    </div>
  );
}

export default function ProductEvidenceLedger({
  availability,
  publishedAt,
  rating,
  reviewsAnchored = false,
}: ProductEvidenceLedgerProps) {
  const stock = stockRow(availability);
  const reviews = reviewsRow(rating, reviewsAnchored);
  const publishedOn =
    publishedAt === undefined ? undefined : formatPublishedOn(publishedAt);
  /*
    Built as data rather than as four `<Row>` elements so the count in the
    header is derived from what actually renders. A hardcoded "4 facts" would
    be a fact about the ledger that the ledger itself could contradict — in the
    one element on this page whose entire purpose is not doing that.
  */
  const rows = [
    { term: 'Supplier stock', value: stock.value, filled: stock.filled },
    {
      term: 'Price',
      value:
        publishedOn === undefined
          ? 'Fixed when this product was published.'
          : `Fixed when published, ${publishedOn}.`,
      filled: true,
    },
    { term: 'Delivery', value: DELIVERY, filled: false },
    {
      term: 'Buyer reviews',
      value: reviews.value,
      filled: reviews.filled,
      href: reviews.href,
    },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-x-2.5">
        <h2 className={PRODUCT_MICRO_LABEL}>What we know</h2>
        <span className="text-[11.5px] text-ink-subtle">
          {rows.length} facts
        </span>
      </div>
      <dl className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <Row
            key={row.term}
            href={row.href}
            term={row.term}
            value={row.value}
            filled={row.filled}
          />
        ))}
      </dl>
      {/*
        The key to the marks, in words. The marks themselves are `aria-hidden`
        and every row's meaning already lives in its `<dd>`, so this is the
        sighted reader's equivalent of what a screen reader already gets.
      */}
      <p className="mt-3 text-xs leading-relaxed text-ink-subtle">
        A filled mark is a claim with evidence behind it. A hollow mark is
        something we do not know, and why.
      </p>
    </>
  );
}

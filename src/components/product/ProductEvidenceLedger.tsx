import type { ProductAvailability } from '@/lib/product-detail';

type ProductEvidenceLedgerProps = {
  availability?: ProductAvailability;
  /** ISO-8601 publish time, when the payload carries one. */
  publishedAt?: string;
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

const DELIVERY =
  'No estimate exists yet. Nothing is added to this price at checkout.';
const REVIEWS = 'None. Sals3 has no reviews yet.';

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
}: {
  term: string;
  value: string;
  filled: boolean;
}) {
  return (
    <div className="grid grid-cols-[9px_minmax(0,110px)_minmax(0,1fr)] items-start gap-x-2.5">
      <Mark filled={filled} />
      <dt className="text-sm text-ink">{term}</dt>
      <dd className="text-sm text-ink-muted">{value}</dd>
    </div>
  );
}

export default function ProductEvidenceLedger({
  availability,
  publishedAt,
}: ProductEvidenceLedgerProps) {
  const stock = stockRow(availability);
  const publishedOn =
    publishedAt === undefined ? undefined : formatPublishedOn(publishedAt);

  return (
    <>
      <h2 className="mb-2.5 text-[11px] font-bold tracking-[0.08em] text-ink-subtle uppercase">
        What we know
      </h2>
      <dl className="flex flex-col gap-2.5">
        <Row term="Supplier stock" value={stock.value} filled={stock.filled} />
        <Row
          term="Price"
          value={
            publishedOn === undefined
              ? 'Fixed when this product was published.'
              : `Fixed when published, ${publishedOn}.`
          }
          filled
        />
        <Row term="Delivery" value={DELIVERY} filled={false} />
        <Row term="Buyer reviews" value={REVIEWS} filled={false} />
      </dl>
    </>
  );
}

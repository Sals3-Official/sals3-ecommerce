import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import SiteFooter from '@/components/layout/SiteFooter';
import SiteHeader from '@/components/layout/SiteHeader';
import WriteReviewForm from '@/components/orders/WriteReviewForm';
import AUTH_LINKS from '@/lib/auth/auth-links';
import { getBuyerSession } from '@/lib/auth/dal';
import { withPostLoginKey } from '@/lib/auth/post-login-redirect';
import maskBuyerName from '@/lib/orders/buyer-name';
import type { BuyerOrderLine } from '@/lib/orders/contracts';
import { readBuyerOrder } from '@/lib/orders/read';
import { SITE_NAME } from '@/lib/site';

/**
 * `/orders/[orderNumber]/review/[lineId]` — write a review for one purchased
 * item.
 *
 * ## A route *and* a modal (owner decision 2026-08-25)
 *
 * This page's earlier note claimed the route existed *instead of* a modal,
 * because a review is long enough to lose to an accidental dismissal. The modal
 * now exists on the order list — `RateReviewButton` — and it answers that
 * objection by holding the draft outside the dialog, so a dismissal costs
 * nothing.
 *
 * The route did not become dead code. It is the only path that works with
 * JavaScript off, the only one a link can point at, the one the order detail
 * page's per-line control uses, and the one whose back button behaves. Both post
 * through the same `reviewItemSchema` and the same portal endpoint, so neither
 * can accept a review the other would refuse.
 *
 * ## Holding the ids is not authorisation
 *
 * `readBuyerOrder` takes the verified session email first and resolves only
 * within the orders that session owns, so somebody else's order takes the same
 * `notFound()` path as one that does not exist. The line is then looked up
 * inside that order — never queried on its own — so a valid line id from
 * another buyer's order finds nothing here.
 *
 * ## The `reviewable` check is UX, and the portal is the gate
 *
 * A line that is not reviewable renders the explanation instead of the form.
 * That is a usability measure, not the security boundary (rule 19): the portal
 * re-decides eligibility in a single `WHERE` on submit and answers `404` for
 * anything it refuses, so a buyer who reaches this form by hand still cannot
 * write a review they are not entitled to.
 */
const MAX_ORDER_NUMBER_LENGTH = 40;
const MAX_LINE_ID_LENGTH = 120;

type WriteReviewPageProps = {
  params: Promise<{ orderNumber: string; lineId: string }>;
};

async function readOwnLine(orderNumber: string, lineId: string) {
  const session = await getBuyerSession();

  if (session === null) {
    redirect(withPostLoginKey(AUTH_LINKS.signIn, 'orders'));
  }

  const order = await readBuyerOrder(
    session.email ?? '',
    decodeURIComponent(orderNumber).slice(0, MAX_ORDER_NUMBER_LENGTH),
    session.uid,
  );

  if (order === null) return null;

  const wanted = decodeURIComponent(lineId).slice(0, MAX_LINE_ID_LENGTH);
  const line = order.packages
    .flatMap((pkg) => pkg.lines)
    .find((candidate) => candidate.id === wanted);

  return line === undefined ? null : { order, line };
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `Write a review — ${SITE_NAME}`,
    robots: { index: false, follow: false },
  };
}

/**
 * Which of the three answers this line gets, extracted so the page body stays a
 * layout and the branch stays readable — three outcomes in one JSX expression
 * is where an inverted condition hides.
 */
function ReviewPanel({
  line,
  orderNumber,
  shipToName,
  orderHref,
}: {
  line: BuyerOrderLine;
  orderNumber: string;
  shipToName: string;
  orderHref: string;
}) {
  if (line.review !== undefined) {
    return (
      <p className="text-sm leading-relaxed text-ink-muted">
        You have already reviewed this item. A review can be written once for
        each item in an order.
      </p>
    );
  }

  if (!line.reviewable) {
    return (
      <p className="text-sm leading-relaxed text-ink-muted">
        You can write a review once the package that carried this item is
        delivered. Nothing is needed from you before then.
      </p>
    );
  }

  return (
    <WriteReviewForm
      orderNumber={orderNumber}
      orderLineId={line.id}
      maskedName={maskBuyerName(shipToName)}
      returnHref={orderHref}
    />
  );
}

export default async function WriteReviewPage({
  params,
}: WriteReviewPageProps) {
  const { orderNumber, lineId } = await params;
  const found = await readOwnLine(orderNumber, lineId);

  if (found === null) notFound();

  const { order, line } = found;
  const orderHref = `/orders/${encodeURIComponent(order.number)}`;

  return (
    <div className="flex flex-1 flex-col bg-surface">
      <SiteHeader />
      <main className="mx-auto w-full max-w-[47.5rem] px-6 py-8">
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-sm"
        >
          <Link href="/orders">Your orders</Link>
          <span aria-hidden className="text-border-strong">
            /
          </span>
          <Link href={orderHref}>{order.number}</Link>
          <span aria-hidden className="text-border-strong">
            /
          </span>
          <span className="text-ink-muted">Write a review</span>
        </nav>

        <h1 className="mt-4 font-display text-2xl font-semibold tracking-[-0.02em] text-ink">
          How was this item?
        </h1>

        <div className="mt-5 rounded-[10px] border border-border bg-white p-6">
          <div className="flex gap-3.5 border-b border-border pb-5">
            {line.imageUrl === null ? (
              <span
                aria-hidden
                className="block h-[4.5rem] w-[4.5rem] shrink-0 rounded-lg border border-border bg-surface-sunken"
              />
            ) : (
              <Image
                src={line.imageUrl}
                alt=""
                width={72}
                height={72}
                className="h-[4.5rem] w-[4.5rem] shrink-0 rounded-lg border border-border object-cover"
              />
            )}
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[15px] leading-snug font-semibold text-ink">
                {line.title}
              </span>
              {line.variant === null ? null : (
                <span className="text-[13.5px] font-medium text-ink-muted">
                  {line.variant}
                </span>
              )}
            </div>
          </div>

          <div className="pt-5">
            <ReviewPanel
              line={line}
              orderNumber={order.number}
              shipToName={order.shipTo.name}
              orderHref={orderHref}
            />
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

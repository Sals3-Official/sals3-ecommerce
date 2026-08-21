import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { BuyerOrderLine } from '@/lib/orders/contracts';
import OrderLineReviewControl from './OrderLineReviewControl';

const LINE: BuyerOrderLine = {
  id: 'line-1',
  title: 'Men Cargo Shorts 6 Pocket',
  variant: 'Digital Black / 31"-35"',
  quantity: 1,
  unitAmountLabel: 'US$14.90',
  lineTotalLabel: 'US$14.90',
  acceptedOnLabel: '12 Aug 2026',
  imageUrl: null,
  reviewable: false,
};

function renderControl(
  line: Partial<BuyerOrderLine>,
  parcelDelivered: boolean,
) {
  return render(
    <OrderLineReviewControl
      line={{ ...LINE, ...line }}
      orderNumber="S3-2608-1194"
      parcelDelivered={parcelDelivered}
    />,
  );
}

/**
 * The trigger, as a buyer meets it. Each of the four states has to say something
 * different — a control that is present but dead tells nobody why.
 */
describe('OrderLineReviewControl', () => {
  it('offers the link for a delivered, unreviewed line', () => {
    renderControl({ reviewable: true }, true);

    const link = screen.getByRole('link', { name: /write a review/i });

    expect(link).toHaveAttribute('href', '/orders/S3-2608-1194/review/line-1');
  });

  it('encodes both ids into the href', () => {
    renderControl({ id: 'a/b c', reviewable: true }, true);

    expect(
      screen.getByRole('link', { name: /write a review/i }),
    ).toHaveAttribute('href', '/orders/S3-2608-1194/review/a%2Fb%20c');
  });

  /** Their own rating, with no invitation to redo something done once. */
  it('shows the rating instead of the link once reviewed', () => {
    renderControl({ reviewable: false, review: { id: 'r1', rating: 4 } }, true);

    expect(screen.getByText(/you rated this/i)).toBeInTheDocument();
    expect(screen.getByText('4 out of 5')).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /write a review/i }),
    ).not.toBeInTheDocument();
  });

  /**
   * Not yet delivered and window-closed are different news, and neither is a
   * disabled button.
   */
  it('explains that an undelivered item can be reviewed later', () => {
    renderControl({ reviewable: false }, false);

    expect(screen.getByText(/after it is delivered/i)).toBeInTheDocument();
  });

  it('says reviews are closed for a delivered item past its window', () => {
    renderControl({ reviewable: false }, true);

    expect(
      screen.getByText(/reviews for this item are closed/i),
    ).toBeInTheDocument();
  });

  /**
   * `parcelDelivered` only chooses the wording for the absent case. It must
   * never grant the control on its own — the portal's `reviewable` is the gate,
   * and this is what keeps the closed-window state safe to distinguish.
   */
  it('never offers the link on a delivered parcel whose line is not reviewable', () => {
    renderControl({ reviewable: false }, true);

    expect(
      screen.queryByRole('link', { name: /write a review/i }),
    ).not.toBeInTheDocument();
  });

  /** An existing review wins over everything, including a stale `reviewable`. */
  it('prefers the recorded review over a stale reviewable flag', () => {
    renderControl({ reviewable: true, review: { id: 'r1', rating: 5 } }, true);

    expect(
      screen.queryByRole('link', { name: /write a review/i }),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/you rated this/i)).toBeInTheDocument();
  });
});

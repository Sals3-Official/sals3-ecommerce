import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReviewableLine } from '@/lib/orders/reviewable';
import RateReviewButton from './RateReviewButton';

const routerPush = vi.hoisted(() => vi.fn());
const routerRefresh = vi.hoisted(() => vi.fn());
const submitOrderReviews = vi.hoisted(() => vi.fn());

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, refresh: routerRefresh }),
}));

vi.mock('@/app/orders/review-actions', () => ({
  default: submitOrderReviews,
}));

const SHORTS: ReviewableLine = {
  id: 'line-1',
  title: 'Men Cargo Shorts 6 Pocket',
  variant: 'Digital Black / 31"-35"',
  imageUrl: null,
};

const LAMP: ReviewableLine = {
  id: 'line-2',
  title: 'Solar Garden Lamp',
  variant: 'Warm white',
  imageUrl: null,
};

function renderTrigger(lines: ReviewableLine[], maskedName: string | null) {
  return render(
    <RateReviewButton
      orderNumber="S3-2608-1194"
      lines={lines}
      maskedName={maskedName}
    />,
  );
}

function trigger() {
  return screen.getByRole('button', { name: /rate & review/i });
}

/** Opens the dialog and waits for the dynamically imported form to arrive. */
async function open() {
  fireEvent.click(trigger());

  return waitFor(() => screen.getByRole('dialog'));
}

function star(lineId: string, rating: number) {
  return screen.getByLabelText(`${rating} out of 5`, {
    selector: `#rating-${lineId}-${rating}`,
  });
}

function submitButton() {
  return screen.getByRole('button', { name: /^submit$|^posting/i });
}

beforeEach(() => {
  routerPush.mockClear();
  routerRefresh.mockClear();
  submitOrderReviews.mockReset();
  submitOrderReviews.mockResolvedValue({ status: 'success', posted: 1 });
});

describe('RateReviewButton', () => {
  /**
   * The gate is the portal's `reviewable`, resolved server-side into this list.
   * An empty list is an order with nothing to rate, and the footer says nothing
   * rather than offering a control that cannot go anywhere.
   */
  it('renders nothing when no line is reviewable', () => {
    const { container } = renderTrigger([], 'Aljon G.');

    expect(container).toBeEmptyDOMElement();
  });

  it('names the item count so the buyer knows what the press commits to', () => {
    renderTrigger([SHORTS, LAMP], 'Aljon G.');

    expect(trigger().textContent).toContain('2 items');
  });

  it('ships no dialog until the button is pressed', () => {
    renderTrigger([SHORTS], 'Aljon G.');

    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('opens a modal naming the order', async () => {
    renderTrigger([SHORTS], 'Aljon G.');

    const dialog = await open();

    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByText('Order S3-2608-1194')).toBeInTheDocument();
    expect(screen.getByText(SHORTS.title)).toBeInTheDocument();
  });

  /** A rating is the one required field, and every item needs its own. */
  it('holds Submit closed until every item is rated', async () => {
    renderTrigger([SHORTS, LAMP], 'Aljon G.');
    await open();

    expect(submitButton()).toBeDisabled();

    fireEvent.click(star('line-1', 5));
    expect(submitButton()).toBeDisabled();

    fireEvent.click(star('line-2', 4));
    expect(submitButton()).toBeEnabled();
  });

  it('posts each rated line once and sends the buyer to the completed lane', async () => {
    renderTrigger([SHORTS, LAMP], 'Aljon G.');
    await open();

    fireEvent.click(star('line-1', 5));
    fireEvent.click(star('line-2', 3));
    fireEvent.change(
      screen.getByLabelText(/what should other buyers know/i, {
        selector: '#review-body-line-1',
      }),
      {
        target: { value: '  Fits well.  ' },
      },
    );
    submitOrderReviews.mockResolvedValue({ status: 'success', posted: 2 });

    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(submitOrderReviews).toHaveBeenCalledWith({
        orderNumber: 'S3-2608-1194',
        items: [
          {
            orderLineId: 'line-1',
            rating: 5,
            body: 'Fits well.',
            attribution: 'named',
          },
          { orderLineId: 'line-2', rating: 3, attribution: 'named' },
        ],
      }),
    );

    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith(
        '/orders?lane=completed&posted=2',
      ),
    );
  });

  it('sends anonymous when the buyer unticks their name', async () => {
    renderTrigger([SHORTS], 'Aljon G.');
    await open();

    fireEvent.click(star('line-1', 4));
    fireEvent.click(screen.getByLabelText(/show my name on this review/i));
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(submitOrderReviews).toHaveBeenCalledWith({
        orderNumber: 'S3-2608-1194',
        items: [{ orderLineId: 'line-1', rating: 4, attribution: 'anonymous' }],
      }),
    );
  });

  /**
   * No name on the order means there is nothing to shorten, so the choice is not
   * offered and the review posts unnamed — the same answer the route form gives.
   */
  it('cannot be credited when the order carries no usable name', async () => {
    renderTrigger([SHORTS], null);
    await open();

    expect(
      screen.getByLabelText(/show my name on this review/i),
    ).toBeDisabled();

    fireEvent.click(star('line-1', 5));
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(submitOrderReviews).toHaveBeenCalledWith(
        expect.objectContaining({
          items: [
            { orderLineId: 'line-1', rating: 5, attribution: 'anonymous' },
          ],
        }),
      ),
    );
  });

  it('keeps the dialog open and shows the reason when nothing posts', async () => {
    submitOrderReviews.mockResolvedValue({
      status: 'error',
      message: 'You have already reviewed this item.',
    });
    renderTrigger([SHORTS], 'Aljon G.');
    await open();

    fireEvent.click(star('line-1', 5));
    fireEvent.click(submitButton());

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'You have already reviewed this item.',
      ),
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
  });

  /**
   * Two of three posted is neither. Navigating away would hide which one was
   * refused, so the dialog stays and the list refreshes underneath it.
   */
  it('stays open and refreshes the list on a partial post', async () => {
    submitOrderReviews.mockResolvedValue({
      status: 'partial',
      posted: 1,
      message: 'You have already reviewed this item.',
    });
    renderTrigger([SHORTS, LAMP], 'Aljon G.');
    await open();

    fireEvent.click(star('line-1', 5));
    fireEvent.click(star('line-2', 5));
    fireEvent.click(submitButton());

    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(routerPush).not.toHaveBeenCalled();
  });

  /**
   * The draft lives in the trigger, not the dialog. That is what makes Escape
   * and the backdrop safe to honour — the objection that kept this form on a
   * route of its own was that a dismissal loses the writing, and here it does
   * not.
   */
  it('keeps what was typed when the dialog is dismissed and reopened', async () => {
    renderTrigger([SHORTS], 'Aljon G.');
    await open();

    fireEvent.click(star('line-1', 4));
    fireEvent.change(
      screen.getByLabelText(/what should other buyers know/i, {
        selector: '#review-body-line-1',
      }),
      { target: { value: 'Arrived in nine days.' } },
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());

    await open();

    expect(
      screen.getByLabelText(/what should other buyers know/i, {
        selector: '#review-body-line-1',
      }),
    ).toHaveValue('Arrived in nine days.');
    expect(star('line-1', 4)).toBeChecked();
  });
});

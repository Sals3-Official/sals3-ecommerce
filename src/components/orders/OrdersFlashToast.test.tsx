import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import OrdersFlashToast from './OrdersFlashToast';

afterEach(() => {
  vi.restoreAllMocks();
  window.history.replaceState(null, '', '/orders');
});

function atUrl(search: string) {
  window.history.replaceState(null, '', `/orders${search}`);
}

/**
 * The toast the review redirect lands on. The count arrives in the URL, is
 * validated by the page, and is taken back out of the address bar once shown.
 */
describe('OrdersFlashToast', () => {
  it('shows nothing when nothing was posted', () => {
    const { container } = render(<OrdersFlashToast posted={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('announces the count as a polite status region', () => {
    atUrl('?lane=completed&posted=2');

    render(<OrdersFlashToast posted={2} />);

    const status = screen.getByRole('status');

    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('2 reviews posted. Thank you.');
  });

  /**
   * Otherwise a refresh or a shared link re-announces a review from ten minutes
   * ago. The lane must survive — it is what the buyer is looking at.
   */
  it('strips only the count from the address bar', () => {
    atUrl('?lane=completed&posted=1');

    render(<OrdersFlashToast posted={1} />);

    expect(window.location.search).toBe('?lane=completed');
  });

  it('leaves the URL alone when there is no count on it', () => {
    atUrl('?lane=completed');
    const replaceState = vi.spyOn(window.history, 'replaceState');

    render(<OrdersFlashToast posted={1} />);

    expect(replaceState).not.toHaveBeenCalled();
  });

  it('closes on the dismiss button rather than waiting out the timer', () => {
    atUrl('?posted=1');

    render(<OrdersFlashToast posted={1} />);

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(screen.queryByRole('status')).toBeNull();
  });
});

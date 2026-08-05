import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import CartToast from './CartToast';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('CartToast', () => {
  it('renders nothing when there is no toast', () => {
    const { container } = render(
      <CartToast toast={null} onDismiss={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('announces the message as a polite status region', () => {
    render(
      <CartToast
        toast={{ id: 1, text: 'Added to your cart.' }}
        onDismiss={vi.fn()}
      />,
    );

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-live', 'polite');
    expect(status).toHaveTextContent('Added to your cart.');
  });

  it('calls onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn();
    render(
      <CartToast
        toast={{ id: 1, text: 'Added to your cart.' }}
        onDismiss={onDismiss}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('auto-dismisses after a few seconds', () => {
    vi.useFakeTimers();
    const onDismiss = vi.fn();
    render(
      <CartToast
        toast={{ id: 1, text: 'Added to your cart.' }}
        onDismiss={onDismiss}
      />,
    );

    expect(onDismiss).not.toHaveBeenCalled();
    vi.advanceTimersByTime(4000);

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});

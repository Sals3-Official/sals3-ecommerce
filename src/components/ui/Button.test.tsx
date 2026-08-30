import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Button from './Button';

describe('Button', () => {
  it('fills the solid variant with the brand gradient while it is live', () => {
    render(
      <Button variant="solid">
        <span>Buy Now</span>
      </Button>,
    );

    expect(screen.getByRole('button')).toHaveClass('bg-brand-gradient');
  });

  /**
   * The regression this file exists for.
   *
   * `.bg-brand-gradient` is an unlayered rule in `globals.css`, and CSS ranks
   * unlayered declarations above anything in `@layer utilities` — which is every
   * Tailwind utility. So the `disabled:bg-none` that used to sit beside it never
   * applied: a disabled Buy Now kept the full navy-to-blue fill and painted
   * `--color-ink-subtle` text on top, unreadable and claiming to be live.
   *
   * It hid for months because this button was almost never disabled. It stopped
   * hiding on 2026-08-31, when buyers began arriving with no variant chosen and
   * every options product painted one on first load.
   *
   * Asserting the absence of the class is the point: a `disabled:` utility here
   * would pass this test and still lose in the browser.
   */
  it('drops the gradient entirely when the solid variant is disabled', () => {
    render(
      <Button variant="solid" disabled>
        <span>Buy Now</span>
      </Button>,
    );

    const button = screen.getByRole('button');

    expect(button).toBeDisabled();
    expect(button).not.toHaveClass('bg-brand-gradient');
    expect(button).toHaveClass('disabled:bg-surface-sunken');
  });

  it('drops it while pending too, so the label stays readable', () => {
    render(
      <Button variant="solid" isPending>
        <span>Buy Now</span>
      </Button>,
    );

    const button = screen.getByRole('button');

    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).not.toHaveClass('bg-brand-gradient');
  });

  /** The gradient belongs to `solid` alone; the other two never carried it. */
  it('never puts the gradient on the other variants', () => {
    const { rerender } = render(
      <Button variant="outline">
        <span>Add to Cart</span>
      </Button>,
    );

    expect(screen.getByRole('button')).not.toHaveClass('bg-brand-gradient');

    rerender(
      <Button variant="confirm">
        <span>Added</span>
      </Button>,
    );

    expect(screen.getByRole('button')).not.toHaveClass('bg-brand-gradient');
    expect(screen.getByRole('button')).toHaveClass('bg-teal-500');
  });
});

import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LinkPendingVeil from './LinkPendingVeil';

const linkStatus = vi.hoisted(() => ({ pending: false }));

vi.mock('next/link', () => ({
  useLinkStatus: () => linkStatus,
}));

describe('LinkPendingVeil', () => {
  it('renders nothing while the link is idle', () => {
    linkStatus.pending = false;

    const { container } = render(<LinkPendingVeil />);

    // Not "renders an invisible element": an un-pressed card should carry no
    // extra node at all, so ten cards in a grid do not each grow one.
    expect(container).toBeEmptyDOMElement();
  });

  it('covers the card once the navigation is pending', () => {
    linkStatus.pending = true;

    const { container } = render(<LinkPendingVeil />);
    const veil = container.firstElementChild;

    expect(veil).not.toBeNull();
    expect(veil).toHaveClass('s3-pending-veil');
    // `absolute inset-0` over a `relative` card is what keeps the veil from
    // moving anything in the grid; `pointer-events-none` keeps the anchor
    // underneath clickable, so a second press is not swallowed.
    expect(veil).toHaveClass('absolute');
    expect(veil).toHaveClass('inset-0');
    expect(veil).toHaveClass('pointer-events-none');
  });

  it('takes the card radius by default and yields it on request', () => {
    linkStatus.pending = true;

    const { container: card } = render(<LinkPendingVeil />);
    expect(card.firstElementChild).toHaveClass('rounded-xl');

    // The category tile and the department row are both clipped by something
    // else, so a rounded veil would show its corners against a square edge.
    const { container: tile } = render(
      <LinkPendingVeil radiusClass="rounded-none" />,
    );
    expect(tile.firstElementChild).toHaveClass('rounded-none');
    expect(tile.firstElementChild).not.toHaveClass('rounded-xl');
  });

  it('is hidden from assistive technology', () => {
    linkStatus.pending = true;

    const { container } = render(<LinkPendingVeil />);

    // The destination route's skeleton carries the polite announcement. Two
    // things narrating one navigation is worse than one, so this is visual only.
    expect(container.firstElementChild).toHaveAttribute('aria-hidden');
  });
});

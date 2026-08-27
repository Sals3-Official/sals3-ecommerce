import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  describeCheckoutReadyDestinations,
  findDestination,
  GLOBAL_DESTINATION_CODE,
} from '@/lib/destination/destinations';
import DestinationNotice from './DestinationNotice';

function renderNotice(code: string) {
  return render(<DestinationNotice destination={findDestination(code)} />);
}

describe('DestinationNotice', () => {
  it('tells a Global buyer where orders can be placed', () => {
    renderNotice(GLOBAL_DESTINATION_CODE);

    expect(
      screen.getByRole('heading', { name: /where orders can be placed/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(new RegExp(describeCheckoutReadyDestinations(), 'i')),
    ).toBeInTheDocument();
  });

  it('names the destination when it is a country checkout does not take', () => {
    renderNotice('NZ');

    expect(screen.getByText(/new zealand/i)).toBeInTheDocument();
  });

  /*
    `proseLabel` carries its own article, so "does not take a ${proseLabel}
    delivery address" rendered "a **the** United States delivery address". Found
    in a browser, on the cart, 2026-08-28 — no unit test looked at the sentence
    as a sentence.
  */
  it('reads as English for a destination whose name takes an article', () => {
    renderNotice('US');

    expect(screen.getByText(/in the united states/i)).toBeInTheDocument();
    expect(screen.queryByText(/a the united states/i)).not.toBeInTheDocument();
  });

  it('renders nothing for a destination orders can be placed to', () => {
    const { container } = renderNotice('AU');

    expect(container).toBeEmptyDOMElement();
  });

  /*
    ADR-003 §1 bans the worldwide claim, and this banner is the copy most
    tempted by it — a buyer being told "not here" is exactly who a promise
    would be aimed at. No date, no "coming soon", and nothing about what
    shipping or duty would cost, because this codebase knows none of it.
  */
  it('promises nothing about dates, cost or duties', () => {
    renderNotice(GLOBAL_DESTINATION_CODE);

    const notice = screen.getByRole('heading', {
      name: /where orders can be placed/i,
    }).parentElement;

    expect(notice?.textContent ?? '').not.toMatch(
      /coming soon|worldwide|shipping cost|duty|duties|tax|sorry|apolog/i,
    );
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findDestination } from '@/lib/destination/destinations';
import DestinationPicker from './DestinationPicker';

const routerRefresh = vi.hoisted(() => vi.fn());
const setDestinationAction = vi.hoisted(() =>
  vi.fn<
    (code: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  >(),
);

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh }),
}));

/*
  The action is a `'use server'` module: importing it from a test would pull
  `next/headers` into jsdom, where there is no request. Mocking it is also what
  keeps these assertions about the picker rather than about cookie writing,
  which `actions.ts` owns.
*/
vi.mock('@/lib/destination/actions', () => ({
  setDestinationAction,
}));

beforeEach(() => {
  routerRefresh.mockClear();
  setDestinationAction.mockReset();
  setDestinationAction.mockResolvedValue({ ok: true });
});

function renderPicker(
  code = 'AU',
  source: 'chosen' | 'suggested' | 'default' = 'chosen',
) {
  return render(
    <DestinationPicker destination={findDestination(code)} source={source} />,
  );
}

function openPicker() {
  fireEvent.click(screen.getByRole('button', { name: /ship to/i }));
}

describe('DestinationPicker', () => {
  it('names the current destination while collapsed, and lists none of the others', () => {
    renderPicker('AU');

    expect(
      screen.getByRole('button', { name: /ship to: australia/i }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /^philippines$/i }),
    ).not.toBeInTheDocument();
  });

  it('marks the current destination and only that one', () => {
    renderPicker('AU');
    openPicker();

    expect(
      screen.getByRole('button', { name: /^australia$/i }),
    ).toHaveAttribute('aria-current', 'true');
    expect(
      screen.getByRole('button', { name: /^philippines$/i }),
    ).not.toHaveAttribute('aria-current');
  });

  it('offers every destination, Global included', () => {
    renderPicker('AU');
    openPicker();

    expect(
      screen.getByRole('list', { name: /shipping destinations/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('listitem')).toHaveLength(7);
    expect(
      screen.getByRole('button', { name: /somewhere else/i }),
    ).toBeInTheDocument();
  });

  /*
    The point of the whole feature: a destination that can be priced but not
    ordered has to say so in words. `New Zealand` is priced; checkout takes
    `CHECKOUT_ALLOWED_COUNTRIES` only.
  */
  it('flags a destination orders cannot be placed to, in text', () => {
    renderPicker('AU');
    openPicker();

    expect(
      screen.getByRole('button', { name: /new zealand/i }),
    ).toHaveTextContent(/ordering not available yet/i);
    expect(
      screen.getByRole('button', { name: /somewhere else/i }),
    ).toHaveTextContent(/ordering not available yet/i);
    expect(
      screen.getByRole('button', { name: /^philippines$/i }),
    ).not.toHaveTextContent(/ordering not available yet/i);
  });

  it('records the chosen destination and refreshes the server-rendered tree', async () => {
    renderPicker('AU');
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /^philippines$/i }));

    await waitFor(() =>
      expect(setDestinationAction).toHaveBeenCalledWith('PH'),
    );
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
  });

  it('says so and stays open when the destination could not be saved', async () => {
    setDestinationAction.mockResolvedValue({
      ok: false,
      reason: 'unknown_destination',
    });

    renderPicker('AU');
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /^philippines$/i }));

    expect(await screen.findByRole('status')).toHaveTextContent(
      /did not save/i,
    );
    expect(routerRefresh).not.toHaveBeenCalled();
    expect(
      screen.getByRole('button', { name: /^philippines$/i }),
    ).toBeInTheDocument();
  });

  /*
    `resolve.ts` is explicit that only a `chosen` destination may be presented
    as the buyer's own, so a geo suggestion has to say what it is.
  */
  it('does not present a geo suggestion as a decision the buyer made', () => {
    renderPicker('AU', 'suggested');
    openPicker();

    expect(
      screen.getByText(/suggested from where you are browsing/i),
    ).toBeInTheDocument();
  });

  it('says nothing extra once the buyer has chosen', () => {
    renderPicker('AU', 'chosen');
    openPicker();

    expect(
      screen.queryByText(/suggested from where you are browsing/i),
    ).not.toBeInTheDocument();
    expect(screen.queryByText(/not set yet/i)).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { findDestination } from '@/lib/destination/destinations';
import DestinationPicker from './DestinationPicker';

const routerRefresh = vi.hoisted(() => vi.fn());
const routerPush = vi.hoisted(() => vi.fn());
const currentPathname = vi.hoisted(() => ({ value: '/au' }));
const setDestinationAction = vi.hoisted(() =>
  vi.fn<
    (code: string) => Promise<{ ok: true } | { ok: false; reason: string }>
  >(),
);

/*
  The picker is a market switcher as well as a preference control, so it reads
  the current path to work out where the equivalent page in another market is.
  `currentPathname` is a box rather than a plain string so a test can stand the
  picker on a different route before rendering it.
*/
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: routerRefresh, push: routerPush }),
  usePathname: () => currentPathname.value,
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
  routerPush.mockClear();
  currentPathname.value = '/au';
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

  /*
    The cookie is written whatever else happens — it is what the `/` dispatcher
    reads, and the only record that the buyer chose rather than that geo
    guessed.
  */
  it('records the chosen destination', async () => {
    renderPicker('AU');
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /^philippines$/i }));

    await waitFor(() =>
      expect(setDestinationAction).toHaveBeenCalledWith('PH'),
    );
  });

  it('moves the buyer into the market they chose', async () => {
    renderPicker('AU');
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /^philippines$/i }));

    await waitFor(() => expect(routerPush).toHaveBeenCalledWith('/ph'));
    // The navigation re-renders the target route on the server with the new
    // cookie, so a refresh on top of it would be a second round trip for the
    // same answer.
    expect(routerRefresh).not.toHaveBeenCalled();
  });

  /*
    The markets serve one catalogue, so the same product exists in each of them.
    Landing the buyer on the home page after they corrected their destination
    halfway down a product would read as a reset rather than a switch.
  */
  it('keeps the buyer on the same page one market over', async () => {
    currentPathname.value = '/au/p/air-cooler';

    renderPicker('AU');
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /^philippines$/i }));

    await waitFor(() =>
      expect(routerPush).toHaveBeenCalledWith('/ph/p/air-cooler'),
    );
  });

  /*
    `US` is priced but has no shopfront of its own, so there is nowhere to send
    anyone. The preference still has to be recorded: it is what `/` reads.
  */
  it('records a destination with no market of its own without navigating', async () => {
    renderPicker('AU');
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /united states/i }));

    await waitFor(() =>
      expect(setDestinationAction).toHaveBeenCalledWith('US'),
    );
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
    expect(routerPush).not.toHaveBeenCalled();
  });

  /*
    `/checkout` belongs to a person, not to a country. Throwing away a
    half-filled checkout because the buyer corrected their shipping destination
    would destroy work in order to honour a preference the cookie has already
    recorded.
  */
  it('does not navigate away from an account route', async () => {
    currentPathname.value = '/checkout/delivery';

    renderPicker('AU');
    openPicker();

    fireEvent.click(screen.getByRole('button', { name: /^philippines$/i }));

    await waitFor(() =>
      expect(setDestinationAction).toHaveBeenCalledWith('PH'),
    );
    await waitFor(() => expect(routerRefresh).toHaveBeenCalledTimes(1));
    expect(routerPush).not.toHaveBeenCalled();
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
    expect(routerPush).not.toHaveBeenCalled();
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

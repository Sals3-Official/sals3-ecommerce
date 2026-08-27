'use client';

import { useEffect, useId, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronDownIcon } from '@/components/icons/Icon';
import { setDestinationAction } from '@/lib/destination/actions';
import {
  DESTINATIONS,
  canCheckOutTo,
  type Destination,
} from '@/lib/destination/destinations';
import {
  destinationCodeToMarket,
  isMarketSegment,
  marketHref,
  type MarketSegment,
} from '@/lib/destination/markets';

type DestinationPickerProps = {
  destination: Destination;
  /**
   * How `resolveDestination` reached the value above. Only `chosen` came from
   * the buyer, and the picker must not present the other two as if it did —
   * `resolve.ts` states that rule and this prop is how it is honoured here.
   */
  source: 'chosen' | 'suggested' | 'default';
};

/**
 * Where the buyer is shipping, said in the header instead of at checkout.
 *
 * ## Why it is in the utility bar at all
 *
 * Before 2026-08-27 the storefront never named a destination until the checkout
 * address form, which is behind the sign-in wall. A buyer in a country Sals3
 * cannot ship to browsed, added to a cart, and created an account before
 * anything told them so. This control moves that fact to the first screen.
 *
 * ## It is also the market switcher
 *
 * Since the shopfronts split into `/au`, `/ph` and `/fj`, choosing a
 * destination that has a market of its own moves the buyer into it as well as
 * recording the choice. The two halves are separate on purpose and both are
 * needed: the cookie is what the `/` dispatcher reads on a later visit, and the
 * navigation is what stops a buyer who picked the Philippines from standing on
 * `/au/...` under a header that says Philippines. See `choose` below for what
 * happens when a destination has no market, and for why an account route is
 * left where it is.
 *
 * ## Why the list is seven entries and not a country list
 *
 * `DESTINATIONS` is the pricing vocabulary, not a shipping promise —
 * `destinations.ts` explains why a ~190-country dropdown would state something
 * untrue. Every entry `canCheckOutTo` rejects carries the note in
 * `UNAVAILABLE_NOTE` as **text**, not a colour or an opacity: the gap between
 * "priced" and "orderable" is the honest thing this feature exists to show, so
 * it has to survive greyscale, a screen reader, and a buyer who does not know
 * that dimmed means unavailable.
 *
 * ## Why a plain button and list
 *
 * No Radix, no base-ui, no headless-menu package — this repo ships none, and a
 * disclosure is not worth a dependency. `AccountDropdownMenu` in this folder is
 * the same shape (trigger, outside-pointer close, Escape close), and copying it
 * keeps the two controls in the utility bar behaving identically. A native
 * `<details>` was the other candidate and was not used because the trigger has
 * to be disabled while the action is in flight, which `<summary>` does not
 * support.
 *
 * ## Sizes, and why the trigger is not 44px
 *
 * **Every option in the open panel is `min-h-11 sm:min-h-9`** — 44px of touch
 * target on a phone, the pattern this repo settled on for
 * `ProductReviewList`'s filter chips. That is where mis-taps actually cost
 * something: the options sit in a stack, and hitting the wrong one silently
 * changes where the buyer believes their order is going.
 *
 * **The trigger deliberately matches the strip instead.** The utility bar is
 * `min-h-6` — a 24px rule of 12px text — and a 44px control inside it grows the
 * strip to roughly 60px on a phone, which is not a picker change but a header
 * redesign. It also sits beside `Sell on Sals3`, `Customer Care` and `Feedback`,
 * which the owner deliberately levelled to one type style on 2026-08-20; making
 * one of the four three times taller undoes that. It clears WCAG 2.5.8's 24px
 * AA minimum, which is the criterion that applies, rather than 2.5.5's 44px AAA
 * one — and it opens a panel whose own targets are 44px.
 */

/** Stated once so the picker and any future copy review find it in one place. */
const UNAVAILABLE_NOTE = 'Ordering not available yet';

const SAVE_FAILED_MESSAGE = 'That did not save. Try again.';

/**
 * The same page, one market over — or `undefined` when there is no such page.
 *
 * ## Why the sub-path is carried across
 *
 * The markets serve one catalogue, so `/au/p/air-cooler` and `/ph/p/air-cooler`
 * are the same product. Dropping a buyer on the home page after they changed
 * destination halfway down a product would make the control feel like a reset
 * rather than a switch, and they would have to find the item again.
 *
 * ## Why an account route returns `undefined` instead of the market home
 *
 * `/login`, `/checkout/*` and `/orders/*` are deliberately not market-scoped —
 * they belong to a person, not to a country. There is no "equivalent path" for
 * them, and sending a buyer from a half-filled checkout to `/ph` because they
 * corrected their shipping destination would destroy work in order to honour a
 * preference the cookie has already recorded. On those routes the choice is
 * saved and nothing moves.
 */
function equivalentPathIn(
  pathname: string | null,
  target: MarketSegment,
): string | undefined {
  const [first, ...rest] = (pathname ?? '').split('/').filter(Boolean);

  if (first === undefined || !isMarketSegment(first)) return undefined;
  if (first === target) return undefined;

  return marketHref(target, rest.length === 0 ? '/' : `/${rest.join('/')}`);
}

const TRIGGER_CLASSES =
  'flex min-h-6 items-center gap-1 rounded-md px-1.5 font-bold text-[color:var(--header-fg)] transition-colors duration-200 hover:text-[color:var(--header-fg-hover)] focus-visible:ring-2 focus-visible:ring-[color:var(--header-focus-ring)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50';

export default function DestinationPicker({
  destination,
  source,
}: DestinationPickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [isSaving, startTransition] = useTransition();

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);

    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  /*
    Since the markets split, this control does two things rather than one, and
    the order matters.

    **The cookie is always written**, market or no market. It is what the `/`
    dispatcher reads, and it is the only record that the buyer chose rather than
    that geo guessed — a destination with no shopfront of its own (`US`, `NZ`,
    `CA`, Global) has nowhere to navigate to, and for those the write *is* the
    whole action.

    **Then, when the destination has a market, the buyer is moved into it.** A
    cookie alone would leave someone who picked the Philippines standing on
    `/au/...`, reading a header that says Philippines — the control would look
    like it had failed. `equivalentPathIn` decides where, and answers
    `undefined` when the current URL has no counterpart (an account route, or
    already the target market); then the refresh below does the work instead.

    The refresh is not a nicety in that case: the action writes a cookie the
    server read to render this page, so without it the header — and anything
    else that resolved the old destination — keeps showing the previous answer
    until the next navigation. A `push` re-renders the destination route on the
    server anyway, so the two are alternatives rather than a pair.

    The panel is closed only on success; a failed save leaves the list open with
    the message under it, so the buyer can retry without reopening.
  */
  function choose(code: string) {
    setError(undefined);

    startTransition(async () => {
      const result = await setDestinationAction(code);

      if (!result.ok) {
        setError(SAVE_FAILED_MESSAGE);
        return;
      }

      setIsOpen(false);

      const market = destinationCodeToMarket(code);
      const target =
        market === undefined ? undefined : equivalentPathIn(pathname, market);

      if (target === undefined) {
        router.refresh();
        return;
      }

      router.push(target);
    });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        disabled={isSaving}
        aria-controls={listId}
        aria-expanded={isOpen}
        onClick={() => {
          setIsOpen((current) => !current);
          setError(undefined);
        }}
        className={TRIGGER_CLASSES}
      >
        <span className="truncate">Ship to: {destination.label}</span>
        <ChevronDownIcon
          width={14}
          height={14}
          className={`shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen ? (
        <div
          id={listId}
          className="absolute top-full right-0 z-40 mt-2 w-64 rounded-md border border-border bg-white p-1 text-sm shadow-lg"
        >
          {source === 'chosen' ? null : (
            <p className="px-3 py-2 text-xs text-ink-subtle">
              {source === 'suggested'
                ? 'Suggested from where you are browsing. Pick one to set it.'
                : 'Not set yet. Pick where your order is going.'}
            </p>
          )}
          <ul aria-label="Shipping destinations" className="flex flex-col">
            {DESTINATIONS.map((option) => {
              const isCurrent = option.code === destination.code;

              return (
                <li key={option.code}>
                  <button
                    type="button"
                    disabled={isSaving}
                    aria-current={isCurrent ? 'true' : undefined}
                    onClick={() => choose(option.code)}
                    className={`flex min-h-11 w-full flex-col justify-center rounded-sm px-3 py-1.5 text-left font-semibold text-ink hover:bg-surface focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:min-h-9 ${
                      isCurrent ? 'bg-surface' : ''
                    }`}
                  >
                    <span>{option.label}</span>
                    {canCheckOutTo(option.code) ? null : (
                      <span className="text-xs font-normal text-ink-subtle">
                        {UNAVAILABLE_NOTE}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          {error ? (
            <p role="status" className="px-3 py-2 text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

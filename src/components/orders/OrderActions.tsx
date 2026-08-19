import Link from 'next/link';
import type { BuyerOrderAction } from '@/lib/orders/contracts';

/**
 * Order actions, including the ones that cannot run.
 *
 * ## Why a blocked action stays on screen
 *
 * Hiding it is the cheaper build and the worse answer: a buyer looking for
 * "Cancel order" and not finding it cannot tell whether Sals3 never had the
 * feature, whether it moved, or whether this particular order is past the
 * point of cancelling. So a blocked action keeps its place, greyed, and the
 * reason becomes the label — "Cannot be cancelled — one package has shipped"
 * says more than a tooltip on a control the buyer has to discover first.
 *
 * The reason is therefore also the accessible name, which is why it replaces
 * the label rather than sitting in `title`: a screen reader user gets the same
 * sentence a sighted user does.
 *
 * ## Why `disabled` is not the whole story
 *
 * `disabled` is presentational here. Nothing behind these controls is reachable
 * by pressing them, because `Cancel order` and `Request return` have no server
 * path in this repository at all (there is no cancel route and no returns
 * entity). When those land, authorisation is theirs to enforce — a greyed
 * button is never an access control (rule 19).
 */

/**
 * 44px and full width below `sm`, 40px and content width above it. The mobile
 * minimum is the touch-target floor; the desktop size is what keeps four
 * actions on one footer row without the card turning into a toolbar.
 */
const BASE =
  'inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 text-[13px] font-bold whitespace-nowrap transition-colors sm:min-h-10 sm:w-auto';

const KINDS = {
  primary: 'bg-brand-600 text-white hover:opacity-90',
  secondary:
    'border border-brand-600 text-brand-600 hover:bg-brand-600/10 hover:no-underline',
  quiet:
    'border border-border-strong bg-white text-ink-muted hover:bg-surface-sunken hover:no-underline',
} as const;

const BLOCKED =
  'inline-flex min-h-11 w-full cursor-not-allowed items-center rounded-lg border border-border bg-surface-sunken px-3 py-2 text-left text-[13px] leading-snug font-bold text-ink-subtle sm:min-h-10 sm:w-auto';

type OrderActionsProps = {
  actions: readonly BuyerOrderAction[];
  /** Full-width stack for the detail rail and for mobile. */
  stacked?: boolean;
};

type OrderActionControlProps = {
  action: BuyerOrderAction;
  stacked: boolean;
};

/**
 * One control, in the one of three shapes its own data asks for: a blocked
 * button, a link when the action has somewhere to go, or a button when it does
 * not yet. Split out of the map so each branch reads on its own.
 */
function OrderActionControl({ action, stacked }: OrderActionControlProps) {
  // The stacked rail is full width at every size; the card footer is only full
  // width on mobile, which `BASE` and `BLOCKED` already carry.
  const width = stacked ? 'w-full sm:w-full' : '';

  if (action.blockedReason !== null) {
    return (
      <button
        type="button"
        disabled
        aria-disabled
        className={`${BLOCKED} ${width}`}
      >
        {action.blockedReason}
      </button>
    );
  }

  if (action.href !== null) {
    return (
      <Link
        href={action.href}
        className={`${BASE} ${KINDS[action.kind]} ${width}`}
      >
        {action.label}
      </Link>
    );
  }

  return (
    <button type="button" className={`${BASE} ${KINDS[action.kind]} ${width}`}>
      {action.label}
    </button>
  );
}

export default function OrderActions({
  actions,
  stacked = false,
}: OrderActionsProps) {
  return (
    <div
      className={
        stacked
          ? 'flex flex-col gap-2'
          : 'flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center'
      }
    >
      {actions.map((action) => (
        <OrderActionControl key={action.id} action={action} stacked={stacked} />
      ))}
    </div>
  );
}

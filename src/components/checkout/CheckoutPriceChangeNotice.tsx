import { formatMoney } from '@/lib/money';
import type { CheckoutPriceChange } from '@/lib/checkout/price-change';

/**
 * Says out loud that a price moved between the cart and this screen.
 *
 * The alternative that was shipping is the one thing a checkout may not do:
 * show a figure it already knows it will not charge, and correct it silently on
 * the card form. Whether the change is up or down does not decide whether it is
 * mentioned — a buyer who is charged less than they agreed to has still been
 * shown a number that was not true, and finding that out from a bank statement
 * costs more trust than the discount is worth.
 *
 * Both figures, not just the new one. "The price changed" invites a buyer to go
 * and check what it used to be, which they cannot do from here; the old price
 * beside the new one is the whole answer in one line.
 *
 * Not a blocking dialog, and no "accept" button. The buyer has not committed to
 * anything yet — the summary beside this already shows the corrected total, and
 * two more steps stand between here and paying. A modal would make them
 * acknowledge a number they are about to be shown anyway.
 */
export default function CheckoutPriceChangeNotice({
  changes,
}: {
  changes: CheckoutPriceChange[];
}) {
  if (changes.length === 0) return null;

  return (
    <div
      role="status"
      className="mb-4 rounded-[10px] border border-amber-300 bg-amber-50 p-3.5 text-ink dark:border-amber-500/40 dark:bg-amber-500/10"
    >
      <p className="text-[13.5px] font-semibold">
        {changes.length === 1
          ? 'A price changed since you added it'
          : 'Some prices changed since you added them'}
      </p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {changes.map((change) => (
          <li key={change.title} className="text-[12.5px] leading-relaxed">
            <span className="text-ink-muted">{change.title}: </span>
            <span className="text-ink-subtle line-through">
              {formatMoney(change.from)}
            </span>{' '}
            <span className="font-medium">{formatMoney(change.to)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-1.5 text-[12px] text-ink-muted">
        The total beside this is the corrected one, and it is what you will be
        charged.
      </p>
    </div>
  );
}

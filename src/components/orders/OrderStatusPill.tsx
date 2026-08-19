import type { OrderStatusTone } from '@/lib/orders/contracts';

/**
 * The status pill, in the storefront's own four tones.
 *
 * The portal ships a five-tone `StatusPill` for the seller center. It is not
 * imported here: two of its surfaces (`success`, `warning`) have no token in
 * this repository, so reusing it would introduce colours the storefront has
 * never approved and would tie a buyer screen to a seller component's future.
 *
 * A pill never travels alone. Every place this renders, a sentence beside it
 * says what the status means for the buyer, so the status is never carried by
 * colour or by a single word.
 */

const TONES: Record<OrderStatusTone, string> = {
  info: 'bg-brand-600/10 text-brand-900',
  neutral: 'bg-surface-sunken-strong text-ink-muted',
  delivered: 'bg-teal-500/12 text-teal-500',
  alert: 'bg-red-600/10 text-red-600',
};

type OrderStatusPillProps = {
  tone: OrderStatusTone;
  children: string;
  className?: string;
};

export default function OrderStatusPill({
  tone,
  children,
  className = '',
}: OrderStatusPillProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-[3px] text-xs font-semibold whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

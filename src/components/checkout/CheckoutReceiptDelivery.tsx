import type {
  ReceiptDelivery,
  ReceiptShipTo,
} from '@/services/checkout/receipt';

type CheckoutReceiptDeliveryProps = {
  shipTo?: ReceiptShipTo;
  delivery?: ReceiptDelivery;
  email?: string;
};

/**
 * Where the order is going and how it travels.
 *
 * Mirrors `CheckoutAddressRecap`'s wording — "Ship to" — so the address a buyer
 * confirmed one screen earlier is recognisable here rather than reading as new
 * information. The two cannot share a component: the recap is a client
 * component with an Edit control over form state, and nothing on this page is
 * editable any more.
 */
export default function CheckoutReceiptDelivery({
  shipTo,
  delivery,
  email,
}: CheckoutReceiptDeliveryProps) {
  if (shipTo === undefined && delivery === undefined) {
    return null;
  }

  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {shipTo === undefined ? null : (
        <section
          aria-labelledby="receipt-shipto-heading"
          className="rounded-lg border border-border p-4"
        >
          <h2
            id="receipt-shipto-heading"
            className="text-xs font-semibold tracking-wide text-ink-muted uppercase"
          >
            Ship to
          </h2>
          {shipTo.fullName === undefined ? null : (
            <p className="mt-1 font-display text-base font-semibold text-ink">
              {shipTo.fullName}
            </p>
          )}
          <p className="mt-0.5 text-sm text-pretty text-ink">
            {shipTo.addressLine}
          </p>
          {email === undefined && shipTo.phone === undefined ? null : (
            <p className="mt-0.5 text-sm text-ink-muted">
              {[email, shipTo.phone].filter(Boolean).join(' · ')}
            </p>
          )}
        </section>
      )}

      {delivery === undefined ? null : (
        <section
          aria-labelledby="receipt-delivery-heading"
          className="rounded-lg border border-border p-4"
        >
          <h2
            id="receipt-delivery-heading"
            className="text-xs font-semibold tracking-wide text-ink-muted uppercase"
          >
            Delivery
          </h2>
          <p className="mt-1 font-display text-base font-semibold text-ink">
            {delivery.carrier ?? 'Selected at checkout'}
          </p>
          {delivery.packages.length === 0 ? null : (
            <ul className="mt-0.5 text-sm text-ink">
              {delivery.packages.map((shipment, index) => (
                <li key={shipment.id}>
                  {delivery.packages.length > 1
                    ? `Package ${index + 1}: `
                    : null}
                  {shipment.arrivalTime === undefined
                    ? 'Arrival window unavailable'
                    : `Arrives in ${shipment.arrivalTime} days`}
                </li>
              ))}
            </ul>
          )}
          {delivery.amount === undefined ? null : (
            <p className="mt-0.5 text-sm text-ink-muted">
              Shipping {delivery.amount}
            </p>
          )}
        </section>
      )}
    </div>
  );
}

/**
 * What we can honestly say about delivery, which is not much yet.
 *
 * Sals3 has no rate table and no carrier integration, and freight is
 * destination-specific: one representative country cannot prove another
 * (ADR-003). So this card states that a quote comes at checkout rather than
 * printing an invented "arrives in 3-6 days" — the previous storefront did
 * exactly that from a `shipLine` string with no logistics evidence behind it.
 *
 * `shipsFrom` is not in the contract yet either: no product, variant, or offer
 * column holds a stock-origin country, and the only source is seller-scoped
 * screening evidence the public API must not join to. When an origin column
 * exists, it belongs here.
 */
export default function ProductShippingCard() {
  return (
    <section className="rounded-xl border border-border bg-white p-4">
      <h2 className="text-sm font-bold text-ink">Delivery</h2>
      <p className="mt-1 text-sm text-ink-muted">
        Shipping is quoted at checkout for your address. No delivery estimate is
        available for this product yet.
      </p>
    </section>
  );
}

/**
 * One notice above the cards, when the visible set contains something the buyer
 * should know before they start scanning.
 *
 * Only two things earn it: a payment still settling, and a delivery exception.
 * Both are cases where the buyer's next thought is "do I need to do something",
 * and both are answered in the notice's second sentence so they do not have to
 * find the card first. Anything else stays on its own card — a notice that
 * fires often is a notice nobody reads.
 */

type OrdersPageNoticeProps = {
  title: string;
  body: string;
};

export default function OrdersPageNotice({
  title,
  body,
}: OrdersPageNoticeProps) {
  return (
    <section className="mt-3.5 rounded-lg border border-border border-l-[3px] border-l-brand-600 bg-white px-4 py-3.5">
      <h2 className="text-[13px] font-bold text-ink">{title}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{body}</p>
    </section>
  );
}

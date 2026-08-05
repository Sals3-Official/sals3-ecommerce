type ProductFulfillmentCardProps = {
  shipLine: string;
  returnPolicy: string;
  warranty: string;
};

export default function ProductFulfillmentCard({
  shipLine,
  returnPolicy,
  warranty,
}: ProductFulfillmentCardProps) {
  return (
    <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-white p-4 text-sm">
      <div>
        <span className="font-bold text-ink">Shipping: </span>
        <span className="text-ink-muted">{shipLine}</span>
      </div>
      <div>
        <span className="font-bold text-ink">Returns: </span>
        <span className="text-ink-muted">{returnPolicy}</span>
      </div>
      <div>
        <span className="font-bold text-ink">Warranty: </span>
        <span className="text-ink-muted">{warranty}</span>
      </div>
    </div>
  );
}

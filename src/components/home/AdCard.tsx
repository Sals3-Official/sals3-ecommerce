import type { AdSlot } from '@/lib/home-placeholder-data';

type AdCardProps = {
  ad: AdSlot;
};

export default function AdCard({ ad }: AdCardProps) {
  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-border bg-surface-dark">
      <div className="flex aspect-square flex-col justify-between p-3">
        <span className="self-start rounded-md bg-slate-900/55 px-2 py-0.5 text-xs font-bold tracking-wide text-white">
          {ad.badge}
        </span>
        <div className="font-display text-[22px] leading-tight font-semibold tracking-tight text-white text-pretty">
          {ad.headline}
        </div>
      </div>
      <div className="flex flex-col gap-1 p-2.5 pb-3">
        <div className="text-xs font-bold text-white">{ad.brand}</div>
        <p className="line-clamp-2 min-h-[33px] text-xs text-slate-300 text-pretty">
          {ad.sub}
        </p>
        <div className="text-xs text-slate-400">
          Sponsored placement, disclosed above
        </div>
      </div>
    </div>
  );
}

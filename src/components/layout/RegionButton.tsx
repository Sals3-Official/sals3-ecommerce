'use client';

import { useState } from 'react';

const REGIONS = ['Metro Manila', 'Cebu', 'Davao'];

type RegionButtonProps = {
  className?: string;
};

export default function RegionButton({
  className = 'flex',
}: RegionButtonProps) {
  const [regionIndex, setRegionIndex] = useState(0);

  return (
    <button
      type="button"
      onClick={() => setRegionIndex((i) => (i + 1) % REGIONS.length)}
      className={`items-center gap-1.5 rounded-lg border border-border-strong bg-white px-2.5 py-2 text-xs text-ink-muted hover:border-brand-600 ${className}`}
    >
      <span className="text-ink-faint">Deliver to</span>
      <span className="font-bold">{REGIONS[regionIndex]}</span>
    </button>
  );
}

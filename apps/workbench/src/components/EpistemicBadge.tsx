import React from 'react';
import { EPISTEMIC_META } from '../engine/presets';
import { EpistemicTier } from '../engine/types';

interface EpistemicBadgeProps {
  tier: EpistemicTier;
  compact?: boolean;
}

export const EpistemicBadge: React.FC<EpistemicBadgeProps> = ({ tier, compact = false }) => {
  const meta = EPISTEMIC_META[tier];

  return (
    <span
      title={`${meta.label}: ${meta.shortDesc} — ${meta.detail}`}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] border font-mono text-[10px] leading-none tracking-wide whitespace-nowrap shrink-0 select-none ${meta.bgClass} ${meta.borderClass} ${meta.textClass}`}
    >
      <span className="font-bold opacity-80">{meta.code}</span>
      {!compact && <span>{meta.label}</span>}
    </span>
  );
};

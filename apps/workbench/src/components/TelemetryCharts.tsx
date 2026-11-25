import React, { useState } from 'react';
import { SimulationState, TelemetryPoint } from '../engine/types';
import { EpistemicBadge } from './EpistemicBadge';

interface TelemetryChartsProps {
  state: SimulationState;
}

interface MiniChartProps {
  title: string;
  tier: 'FACT' | 'ESTIMATE' | 'INTERPRETATION';
  history: TelemetryPoint[];
  series: Array<{
    label: string;
    color: string;
    accessor: (pt: TelemetryPoint) => number;
    format: (val: number) => string;
  }>;
  showRejections?: boolean;
}

const MiniSvgChart: React.FC<MiniChartProps> = ({
  title,
  tier,
  history,
  series,
  showRejections = false,
}) => {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const w = 320;
  const h = 92;
  const padX = 8;
  const padY = 10;

  const activeIdx = hoverIdx !== null && hoverIdx < history.length ? hoverIdx : history.length - 1;
  const activePt = history[activeIdx];

  const allVals = history.flatMap((pt) => series.map((s) => s.accessor(pt)));
  const minVal = Math.min(...allVals, 0);
  const maxVal = Math.max(...allVals, minVal + 1e-6);
  const range = maxVal - minVal || 1;

  const xOf = (idx: number) =>
    history.length <= 1 ? padX : padX + (idx / (history.length - 1)) * (w - padX * 2);
  const yOf = (val: number) => h - padY - ((val - minVal) / range) * (h - padY * 2);

  return (
    <div className="bg-[#0F1420] border border-slate-800 rounded p-3 flex flex-col gap-2 min-w-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-200 truncate">{title}</span>
        <EpistemicBadge tier={tier} compact />
      </div>

      {/* Live readout row */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] tabular-nums">
        {series.map((s) => (
          <span key={s.label} className="whitespace-nowrap">
            <span style={{ color: s.color }}>{s.label}:</span>{' '}
            <span className="text-slate-100">{activePt ? s.format(s.accessor(activePt)) : '—'}</span>
          </span>
        ))}
        {activePt && (
          <span className="text-slate-500 ml-auto">t={activePt.tick}</span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-[92px] bg-[#080B12] border border-slate-800/80 rounded-[3px] overflow-visible"
        onMouseMove={(e) => {
          if (history.length < 2) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          setHoverIdx(Math.round(ratio * (history.length - 1)));
        }}
        onMouseLeave={() => setHoverIdx(null)}
      >
        {/* Horizontal reference lines */}
        <line x1={padX} y1={padY} x2={w - padX} y2={padY} stroke="#1E293B" strokeDasharray="2 3" />
        <line x1={padX} y1={h / 2} x2={w - padX} y2={h / 2} stroke="#1E293B" strokeDasharray="2 3" />
        <line x1={padX} y1={h - padY} x2={w - padX} y2={h - padY} stroke="#1E293B" />

        {/* Projective step rejection vertical ticks */}
        {showRejections &&
          history.map((pt, idx) =>
            pt.stepRejected ? (
              <line
                key={`rej-${pt.tick}-${idx}`}
                x1={xOf(idx)}
                y1={4}
                x2={xOf(idx)}
                y2={h - 4}
                stroke="rgba(245, 158, 11, 0.55)"
                strokeWidth="1.5"
              />
            ) : null
          )}

        {/* Series polylines */}
        {series.map((s) => {
          const pts = history.map((pt, idx) => `${xOf(idx).toFixed(1)},${yOf(s.accessor(pt)).toFixed(1)}`).join(' ');
          return (
            <polyline
              key={s.label}
              fill="none"
              stroke={s.color}
              strokeWidth="1.75"
              points={pts}
            />
          );
        })}

        {/* Hover hairline */}
        {hoverIdx !== null && history[hoverIdx] && (
          <line
            x1={xOf(hoverIdx)}
            y1={2}
            x2={xOf(hoverIdx)}
            y2={h - 2}
            stroke="#94A3B8"
            strokeWidth="1"
            strokeDasharray="2 2"
          />
        )}
      </svg>
    </div>
  );
};

export const TelemetryCharts: React.FC<TelemetryChartsProps> = ({ state }) => {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0" data-testid="telemetry-charts">
      <MiniSvgChart
        title="Entropy Production & Emergence"
        tier="FACT"
        history={state.history}
        series={[
          {
            label: 'Entropy',
            color: '#06B6D4',
            accessor: (p) => p.entropyProduction,
            format: (v) => `${v.toFixed(2)} J/K`,
          },
          {
            label: state.regime === 1 ? 'RAF' : 'Master',
            color: '#10B981',
            accessor: (p) => (state.regime === 1 ? p.rafClosureRatio : p.masterSequenceFraction),
            format: (v) => `${(v * 100).toFixed(0)}%`,
          },
        ]}
      />

      <MiniSvgChart
        title="Carbon Pool Partition (0 Drift)"
        tier="FACT"
        history={state.history}
        series={[
          {
            label: 'Biomass C',
            color: '#10B981',
            accessor: (p) => p.biomassCarbon / 1000,
            format: (v) => `${v.toFixed(1)}k`,
          },
          {
            label: 'Detritus C',
            color: '#F59E0B',
            accessor: (p) => p.detritusCarbon / 1000,
            format: (v) => `${v.toFixed(1)}k`,
          },
        ]}
      />

      <MiniSvgChart
        title={`Biodiversity & Rejections (${state.projectiveStepRejections})`}
        tier="ESTIMATE"
        history={state.history}
        showRejections
        series={[
          {
            label: 'Clades',
            color: '#818CF8',
            accessor: (p) => p.biodiversity,
            format: (v) => `${Math.round(v)}`,
          },
          {
            label: 'Jump',
            color: '#F59E0B',
            accessor: (p) => p.projectiveMagnification,
            format: (v) => `${Math.round(v)}x`,
          },
        ]}
      />
    </div>
  );
};

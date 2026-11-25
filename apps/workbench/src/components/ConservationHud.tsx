import React from 'react';
import { ShieldCheck, AlertTriangle, Atom, Layers } from 'lucide-react';

export interface ElementalBudget {
  carbon: number;
  hydrogen: number;
  oxygen: number;
  nitrogen: number;
  phosphorus: number;
  sulfur: number;
  iron: number;
}

interface ConservationHudProps {
  livingBiomass: ElementalBudget;
  abioticReservoir: ElementalBudget;
  driftAtoms: number;
  activeRegime: number;
  currentEpoch: number;
  simulatedTimeSec: number;
}

export const ConservationHud: React.FC<ConservationHudProps> = ({
  livingBiomass,
  abioticReservoir,
  driftAtoms,
  activeRegime,
  currentEpoch,
  simulatedTimeSec,
}) => {
  const isConserved = driftAtoms === 0;

  const totalCarbon = livingBiomass.carbon + abioticReservoir.carbon;
  const biomassCarbonPercent = totalCarbon > 0 ? (livingBiomass.carbon / totalCarbon) * 100 : 0;

  const elements = [
    { label: 'C', name: 'Carbon', count: livingBiomass.carbon, color: 'text-emerald-400' },
    { label: 'H', name: 'Hydrogen', count: livingBiomass.hydrogen, color: 'text-sky-300' },
    { label: 'O', name: 'Oxygen', count: livingBiomass.oxygen, color: 'text-blue-400' },
    { label: 'N', name: 'Nitrogen', count: livingBiomass.nitrogen, color: 'text-indigo-400' },
    { label: 'P', name: 'Phosphorus', count: livingBiomass.phosphorus, color: 'text-amber-400' },
    { label: 'S', name: 'Sulfur', count: livingBiomass.sulfur, color: 'text-yellow-400' },
    { label: 'Fe', name: 'Iron', count: livingBiomass.iron, color: 'text-rose-400' },
  ];

  return (
    <div className="bg-[#101726]/90 backdrop-blur-md border-b border-slate-800 px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
      {/* Simulation Master Metadata */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Atom className="w-5 h-5 text-emerald-400 animate-spin-slow" />
          <span className="font-bold text-sm tracking-wider text-slate-100">EVOCHRONOS HUD</span>
        </div>
        <div className="h-4 w-px bg-slate-700" />
        <div className="text-slate-400">
          EPOCH: <span className="text-slate-200 font-semibold">{currentEpoch.toLocaleString()}</span>
        </div>
        <div className="text-slate-400">
          TIME: <span className="text-slate-200 font-semibold">{simulatedTimeSec.toFixed(2)}s</span>
        </div>
        <div className="text-slate-400">
          REGIME: <span className="text-emerald-400 font-semibold font-sans uppercase">Regime {activeRegime}</span>
        </div>
      </div>

      {/* Discrete 7-Element Atom Counters */}
      <div className="flex items-center gap-3 bg-slate-900/80 px-3 py-2 rounded-lg border border-slate-800">
        <Layers className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400 text-[10px] uppercase tracking-wide">Biomass Atoms:</span>
        {elements.map((el) => (
          <div key={el.label} className="flex items-center gap-1">
            <span className={`${el.color} font-bold`}>{el.label}:</span>
            <span className="text-slate-200">{el.count.toLocaleString()}</span>
          </div>
        ))}
      </div>

      {/* Conservation Ledger Drift Status Badge */}
      <div className="flex items-center gap-3">
        <div className="flex flex-col text-right">
          <span className="text-[10px] text-slate-400 uppercase">Living Carbon Fraction</span>
          <span className="text-xs font-semibold text-emerald-400">{biomassCarbonPercent.toFixed(2)}%</span>
        </div>
        {isConserved ? (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
            <ShieldCheck className="w-4 h-4 animate-pulse" />
            <span className="font-semibold text-[11px] tracking-wide">0.0 ATOMIC DRIFT: CONSERVED</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400">
            <AlertTriangle className="w-4 h-4" />
            <span className="font-semibold text-[11px] tracking-wide">DRIFT DETECTED: {driftAtoms} ATOMS</span>
          </div>
        )}
      </div>
    </div>
  );
};

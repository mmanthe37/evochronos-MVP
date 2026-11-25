import React from 'react';
import { Play, Pause, StepForward, ArrowRight, RotateCcw, FastForward } from 'lucide-react';

interface RegimeControlsProps {
  activeRegime: number;
  onSelectRegime: (regime: number) => void;
  onPromoteBridge: () => void;
  isRunning: boolean;
  onTogglePlay: () => void;
  onStep: (steps: number) => void;
  onReset: () => void;
}

export const RegimeControls: React.FC<RegimeControlsProps> = ({
  activeRegime,
  onSelectRegime,
  onPromoteBridge,
  isRunning,
  onTogglePlay,
  onStep,
  onReset,
}) => {
  const regimes = [
    { id: 1, title: 'I: Prebiotic Geochemistry', subtitle: 'Kinetics & maxRAF' },
    { id: 2, title: 'II: Protocells & Quasispecies', subtitle: 'Vesicles & Error Catastrophe' },
    { id: 3, title: 'III: Prokaryote dFBA', subtitle: 'Metabolic Guilds & Loop-Laws' },
    { id: 4, title: 'IV: Eukaryogenesis & rFBA', subtitle: 'Chimeric Matrix & Hill GRN' },
    { id: 5, title: 'V: Multicellularity & DEB', subtitle: 'Michod ETI & Turing Morphogens' },
    { id: 6, title: 'VI: Macroevolution & tskit', subtitle: 'Lande G-Matrix & BDMI Speciation' },
  ];

  const bridgeNames: Record<number, string> = {
    1: 'Trigger B_I->II (Vesicle Encapsulation)',
    2: 'Trigger B_I/II->III (Autopoietic Closure)',
    3: 'Trigger B_III->IV (Syntrophic Endosymbiosis)',
    4: 'Trigger B_IV->V (Multicellular Differentiation)',
    5: 'Trigger B_V->VI (Macroevolutionary Continuum)',
  };

  return (
    <div className="bg-[#101726] border-b border-slate-800 p-4 flex flex-col md:flex-row items-center justify-between gap-4">
      {/* Simulation Playback Toolbar */}
      <div className="flex items-center gap-2">
        <button
          onClick={onTogglePlay}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-xs transition-colors shadow-sm ${
            isRunning
              ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 border border-amber-500/30'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-950'
          }`}
        >
          {isRunning ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
          {isRunning ? 'PAUSE' : 'RUN SIMULATION'}
        </button>

        <button
          onClick={() => onStep(1)}
          disabled={isRunning}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium border border-slate-700"
          title="Advance 1 step"
        >
          <StepForward className="w-4 h-4" />
          <span>Step 1</span>
        </button>

        <button
          onClick={() => onStep(10)}
          disabled={isRunning}
          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 disabled:opacity-50 text-xs font-medium border border-slate-700"
          title="Advance 10 steps"
        >
          <FastForward className="w-4 h-4" />
          <span>+10</span>
        </button>

        <button
          onClick={onReset}
          className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700 text-xs border border-slate-700"
          title="Reset Simulation"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Regime Switcher Carousel */}
      <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-1">
        {regimes.map((r) => {
          const isActive = activeRegime === r.id;
          return (
            <button
              key={r.id}
              onClick={() => onSelectRegime(r.id)}
              className={`flex flex-col text-left px-3 py-2 rounded-lg border transition-all min-w-[128px] ${
                isActive
                  ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 shadow-inner'
                  : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
              }`}
            >
              <span className="text-[11px] font-bold tracking-tight">{r.title}</span>
              <span className="text-[9px] text-slate-500 truncate">{r.subtitle}</span>
            </button>
          );
        })}
      </div>

      {/* Coarse-Graining Bridge Promotion Trigger */}
      {activeRegime < 6 && (
        <button
          onClick={onPromoteBridge}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/30 border border-indigo-500/30 text-xs font-medium whitespace-nowrap transition-colors"
        >
          <span>{bridgeNames[activeRegime]}</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

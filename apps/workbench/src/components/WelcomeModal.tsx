import React from 'react';
import { ShieldCheck, GitFork, Sliders, AlertCircle } from 'lucide-react';
import { EpistemicBadge } from './EpistemicBadge';

interface WelcomeModalProps {
  onEnterWorkbench: () => void;
  onExplorePresets: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({
  onEnterWorkbench,
  onExplorePresets,
}) => {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="w-full max-w-2xl bg-[#0F1420] border border-slate-700 rounded p-6 flex flex-col gap-5 max-h-[90dvh] overflow-y-auto">
        <div className="flex flex-col gap-1.5 border-b border-slate-800 pb-4">
          <h1 id="welcome-modal-title" className="text-xl font-semibold text-slate-100">
            Welcome to EvoChronos
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed">
            An interactive, deterministic evolutionary modeling workbench spanning prebiotic reaction networks, protocell quasispecies, metabolic flux balance, morphogenesis, and macroevolutionary trait landscapes.
          </p>
        </div>

        {/* 3 Core Workflow Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#080B12] border border-slate-800 rounded p-3.5 flex flex-col gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-semibold text-slate-100">1. Choose a Scenario</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pick a preset (Alkaline Vent vs. Wet-Dry Cycling, Eigen Error Catastrophe, or Lande G-Matrix) and run from a reproducible Philox seed.
            </p>
          </div>

          <div className="bg-[#080B12] border border-slate-800 rounded p-3.5 flex flex-col gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h2 className="text-xs font-semibold text-slate-100">2. Audit Physical Invariants</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every tick enforces exact BigInt conservation across [C, H, O, N, P, S, Fe] (0 drift) and gates transitions only on biophysical thresholds.
            </p>
          </div>

          <div className="bg-[#080B12] border border-slate-800 rounded p-3.5 flex flex-col gap-2">
            <GitFork className="w-4 h-4 text-amber-400" />
            <h2 className="text-xs font-semibold text-slate-100">3. Fork Counterfactuals</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Pause at any tick, fork into Branch B, perturb temperature, mutation rate, or covariance, and compare trajectories in the DAG view.
            </p>
          </div>
        </div>

        {/* Epistemic Labeling & Honest Boundaries */}
        <div className="bg-[#080B12] border border-slate-800 rounded p-4 flex flex-col gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-medium text-slate-300 mr-1">5-Tier Epistemic Tags:</span>
            <EpistemicBadge tier="FACT" />
            <EpistemicBadge tier="ASSUMPTION" />
            <EpistemicBadge tier="ESTIMATE" />
            <EpistemicBadge tier="INTERPRETATION" />
            <EpistemicBadge tier="UNCERTAINTY" />
          </div>
          <div className="flex items-start gap-2 text-xs text-slate-400 leading-relaxed pt-1 border-t border-slate-800/80">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>
              <strong className="text-slate-200 font-medium">Honest Scientific Scope:</strong> EvoChronos models bounded mathematical scenarios and does not claim to reconstruct Earth&apos;s historical origin of life or detect life.
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
          <button
            type="button"
            onClick={onExplorePresets}
            className="px-4 py-2 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs"
          >
            Browse Scenario Presets
          </button>
          <button
            type="button"
            onClick={onEnterWorkbench}
            className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
          >
            Enter Workbench
          </button>
        </div>
      </div>
    </div>
  );
};

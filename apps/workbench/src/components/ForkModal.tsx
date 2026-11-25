import React, { useState } from 'react';
import { GitFork, X } from 'lucide-react';
import { EnvironmentMode, ExperimentBranch, ScenarioParameters } from '../engine/types';
import { EpistemicBadge } from './EpistemicBadge';

interface ForkModalProps {
  parentBranch: ExperimentBranch;
  nextBranchIndex: number;
  onClose: () => void;
  onConfirmFork: (
    branchName: string,
    perturbedParams: ScenarioParameters,
    perturbationSummary: string
  ) => void;
}

export const ForkModal: React.FC<ForkModalProps> = ({
  parentBranch,
  nextBranchIndex,
  onClose,
  onConfirmFork,
}) => {
  const letter = String.fromCharCode(65 + Math.min(25, nextBranchIndex));
  const [name, setName] = useState<string>(`Branch ${letter} (t=${parentBranch.state.tick})`);
  const [params, setParams] = useState<ScenarioParameters>({ ...parentBranch.parameters });
  const [summary, setSummary] = useState<string>('Custom counterfactual perturbation');
  const [error, setError] = useState<string | null>(null);

  const applyQuickPerturbation = (label: string, patch: Partial<ScenarioParameters>) => {
    setParams((prev) => ({ ...prev, ...patch }));
    setSummary(label);
    setName(`Branch ${letter}: ${label}`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter a branch name.');
      return;
    }
    onConfirmFork(trimmed, params, summary);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="fork-modal-title"
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-xl bg-[#0F1420] border border-slate-700 rounded p-5 flex flex-col gap-4 max-h-[90dvh] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h2 id="fork-modal-title" className="text-base font-semibold text-slate-100 flex items-center gap-2">
              <GitFork className="w-4 h-4 text-cyan-400" />
              <span>Fork Counterfactual Branch</span>
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Cloning <span className="text-slate-200 font-medium">{parentBranch.name}</span> at tick{' '}
              <span className="font-mono text-cyan-300">{parentBranch.state.tick}</span> with identical BigInt elemental pools and PRNG state.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close Fork Dialog"
            className="p-1 text-slate-400 hover:text-slate-100 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Branch Name */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="fork-branch-name" className="text-xs font-medium text-slate-300">
            Counterfactual Branch Name
          </label>
          <input
            id="fork-branch-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (error) setError(null);
            }}
            className="px-3 py-2 bg-[#080B12] border border-slate-700 rounded text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
          />
          {error && <span className="text-xs text-rose-400">{error}</span>}
        </div>

        {/* Quick Counterfactual Perturbation Presets */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium text-slate-300">Quick Perturbation Experiments</span>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                applyQuickPerturbation(
                  params.environmentMode === 'alkaline_vent' ? 'Wet-Dry Cycling' : 'Alkaline Vent',
                  {
                    environmentMode:
                      params.environmentMode === 'alkaline_vent' ? 'wet_dry_cycling' : 'alkaline_vent',
                  }
                )
              }
              className="px-2.5 py-1.5 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200"
            >
              Toggle Vent / Wet-Dry
            </button>

            <button
              type="button"
              onClick={() =>
                applyQuickPerturbation('High Mutation (Eigen Stress)', {
                  mutationRate: Math.min(0.08, Number((parentBranch.parameters.mutationRate + 0.022).toFixed(3))),
                })
              }
              className="px-2.5 py-1.5 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200"
            >
              +0.022 Mutation Rate
            </button>

            <button
              type="button"
              onClick={() =>
                applyQuickPerturbation('Thermal Spike (+28 K)', {
                  temperatureK: Math.min(390, parentBranch.parameters.temperatureK + 28),
                })
              }
              className="px-2.5 py-1.5 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200"
            >
              +28 K Thermal Stress
            </button>

            <button
              type="button"
              onClick={() =>
                applyQuickPerturbation('Weak Syntrophy (-10 kJ/mol)', {
                  syntrophyDeltaG: -10,
                })
              }
              className="px-2.5 py-1.5 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200"
            >
              Block Syntrophy (-10 kJ/mol)
            </button>

            <button
              type="button"
              onClick={() =>
                applyQuickPerturbation('Zero Covariance (G_12 = 0)', {
                  landeG12: 0,
                })
              }
              className="px-2.5 py-1.5 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-[11px] text-slate-200"
            >
              Zero Lande Covariance
            </button>
          </div>
        </div>

        {/* Fine-Grained Counterfactual Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="fork-env" className="text-slate-300">Environment Mode</label>
              <EpistemicBadge tier="ASSUMPTION" compact />
            </div>
            <select
              id="fork-env"
              value={params.environmentMode}
              onChange={(e) => {
                setParams((p) => ({ ...p, environmentMode: e.target.value as EnvironmentMode }));
                setSummary(`Switched environment to ${e.target.value}`);
              }}
              className="px-2.5 py-1.5 bg-[#080B12] border border-slate-700 rounded text-xs text-slate-100"
            >
              <option value="alkaline_vent">Alkaline Hydrothermal Vent</option>
              <option value="wet_dry_cycling">Wet-Dry Cycling Pond</option>
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="fork-temp" className="text-slate-300">Temperature ({params.temperatureK} K)</label>
              <EpistemicBadge tier="ASSUMPTION" compact />
            </div>
            <input
              id="fork-temp"
              type="range"
              min={280}
              max={390}
              step={1}
              value={params.temperatureK}
              onChange={(e) => {
                const v = Number(e.target.value);
                setParams((p) => ({ ...p, temperatureK: v }));
                setSummary(`Temperature set to ${v} K`);
              }}
              className="accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="fork-mut" className="text-slate-300">
                Mutation Rate ({params.mutationRate.toFixed(3)})
              </label>
              <EpistemicBadge tier="ESTIMATE" compact />
            </div>
            <input
              id="fork-mut"
              type="range"
              min={0.002}
              max={0.08}
              step={0.001}
              value={params.mutationRate}
              onChange={(e) => {
                const v = Number(e.target.value);
                setParams((p) => ({ ...p, mutationRate: v }));
                setSummary(`Mutation rate set to ${v.toFixed(3)}`);
              }}
              className="accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="fork-influx" className="text-slate-300">
                Resource Flux ({params.resourceInfluxRate.toFixed(2)}x)
              </label>
              <EpistemicBadge tier="ESTIMATE" compact />
            </div>
            <input
              id="fork-influx"
              type="range"
              min={0.25}
              max={2.5}
              step={0.05}
              value={params.resourceInfluxRate}
              onChange={(e) => {
                const v = Number(e.target.value);
                setParams((p) => ({ ...p, resourceInfluxRate: v }));
                setSummary(`Resource flux set to ${v.toFixed(2)}x`);
              }}
              className="accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="fork-turing" className="text-slate-300">
                Turing D_v/D_u ({params.turingDiffusionRatio}x)
              </label>
              <EpistemicBadge tier="ESTIMATE" compact />
            </div>
            <input
              id="fork-turing"
              type="range"
              min={2}
              max={40}
              step={1}
              value={params.turingDiffusionRatio}
              onChange={(e) => {
                const v = Number(e.target.value);
                setParams((p) => ({ ...p, turingDiffusionRatio: v }));
                setSummary(`Turing ratio set to ${v}x`);
              }}
              className="accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between text-xs">
              <label htmlFor="fork-g12" className="text-slate-300">
                Lande G_12 ({params.landeG12.toFixed(2)})
              </label>
              <EpistemicBadge tier="ESTIMATE" compact />
            </div>
            <input
              id="fork-g12"
              type="range"
              min={-0.85}
              max={0.85}
              step={0.05}
              value={params.landeG12}
              onChange={(e) => {
                const v = Number(e.target.value);
                setParams((p) => ({ ...p, landeG12: v }));
                setSummary(`Lande G_12 set to ${v.toFixed(2)}`);
              }}
              className="accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-slate-300 text-xs font-medium"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Create Fork & Activate</span>
          </button>
        </div>
      </form>
    </div>
  );
};

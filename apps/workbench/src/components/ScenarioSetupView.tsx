import React, { useState } from 'react';
import { Play, RefreshCw, Info } from 'lucide-react';
import {
  PARAMETER_SPECS,
  REGIME_LABELS,
  SCENARIO_PRESETS,
} from '../engine/presets';
import {
  computeEigenMetrics,
  computeLandeResponse,
  computeTuringMetrics,
} from '../engine/simulation';
import { EnvironmentMode, RegimeId, ScenarioParameters } from '../engine/types';
import { EpistemicBadge } from './EpistemicBadge';

interface ScenarioSetupViewProps {
  currentPresetId: string;
  currentParameters: ScenarioParameters;
  onLaunchScenario: (
    presetId: string,
    params: ScenarioParameters,
    magnification: number,
    autoRun: boolean
  ) => void;
}

export const ScenarioSetupView: React.FC<ScenarioSetupViewProps> = ({
  currentPresetId,
  currentParameters,
  onLaunchScenario,
}) => {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(currentPresetId);
  const [draft, setDraft] = useState<ScenarioParameters>({ ...currentParameters });
  const [draftMag, setDraftMag] = useState<number>(1);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const selectPreset = (presetId: string) => {
    const preset = SCENARIO_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setSelectedPresetId(preset.id);
    setDraft({ ...preset.parameters });
    setDraftMag(preset.recommendedMagnification);
  };

  const updateField = <K extends keyof ScenarioParameters>(key: K, value: ScenarioParameters[K]) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const randomizeSeed = () => {
    const nextSeed = Math.floor(10000 + Math.random() * 89999);
    updateField('seed', nextSeed);
  };

  const eigen = computeEigenMetrics(draft);
  const turing = computeTuringMetrics(draft.turingDiffusionRatio);
  const lande = computeLandeResponse(draft.landeG12, draft.landeBeta1, draft.landeBeta2);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        {/* Section 1: Preset Scenarios */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold text-slate-100">Scenario & Experiment Setup</h1>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Choose a bounded scientific preset or calibrate custom boundary conditions. Every parameter is explicitly tagged by its epistemic tier.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onLaunchScenario(selectedPresetId, draft, draftMag, true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Apply & Run Scenario</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {SCENARIO_PRESETS.map((preset) => {
              const selected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset.id)}
                  className={`text-left p-4 rounded border transition-colors flex flex-col justify-between gap-3 ${
                    selected
                      ? 'bg-[#151C2C] border-cyan-500/60'
                      : 'bg-[#0F1420] border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[11px] text-slate-400">
                        Start: Regime {REGIME_LABELS[preset.parameters.initialRegime].roman} · Seed {preset.parameters.seed}
                      </span>
                      <EpistemicBadge tier={preset.epistemicFocus} compact />
                    </div>
                    <h2 className="text-sm font-semibold text-slate-100">{preset.name}</h2>
                    <p className="text-xs text-slate-400 leading-relaxed">{preset.description}</p>
                  </div>

                  <div className="pt-2.5 border-t border-slate-800/80 text-[11px] text-slate-400">
                    <span className="text-slate-500">Counterfactual idea: </span>
                    <span className="text-slate-300">{preset.recommendedForkHint}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section 2: Boundary Axioms & Analytical Preview */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Core Reproducibility & Boundary Conditions */}
          <div className="lg:col-span-2 bg-[#0F1420] border border-slate-800 rounded p-5 flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-100">Core Boundary Axioms & Reproducibility</h2>
              <EpistemicBadge tier="ASSUMPTION" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Deterministic Seed */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="param-seed" className="text-xs font-medium text-slate-300 flex items-center justify-between">
                  <span>PRNG Seed (Philox)</span>
                  <EpistemicBadge tier="FACT" compact />
                </label>
                <div className="flex gap-1.5">
                  <input
                    id="param-seed"
                    type="number"
                    min={1}
                    max={9999999}
                    value={draft.seed}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10);
                      if (Number.isFinite(val) && val > 0) updateField('seed', val);
                    }}
                    className="w-full px-2.5 py-1.5 bg-[#080B12] border border-slate-700 rounded font-mono text-xs text-slate-100 tabular-nums focus:outline-none focus:border-cyan-500"
                  />
                  <button
                    type="button"
                    onClick={randomizeSeed}
                    aria-label="Randomize Seed"
                    title="Generate new deterministic seed"
                    className="px-2.5 py-1.5 bg-[#151C2C] hover:bg-slate-800 border border-slate-700 rounded text-slate-300"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Environment Boundary Mode */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="param-env-mode" className="text-xs font-medium text-slate-300">
                  Prebiotic Environment
                </label>
                <select
                  id="param-env-mode"
                  value={draft.environmentMode}
                  onChange={(e) => updateField('environmentMode', e.target.value as EnvironmentMode)}
                  className="px-2.5 py-1.5 bg-[#080B12] border border-slate-700 rounded text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  <option value="alkaline_vent">Alkaline Hydrothermal Vent</option>
                  <option value="wet_dry_cycling">Wet-Dry Cycling Pond</option>
                </select>
              </div>

              {/* Initial Regime */}
              <div className="flex flex-col gap-1.5">
                <label htmlFor="param-initial-regime" className="text-xs font-medium text-slate-300">
                  Starting Regime
                </label>
                <select
                  id="param-initial-regime"
                  value={draft.initialRegime}
                  onChange={(e) => updateField('initialRegime', Number(e.target.value) as RegimeId)}
                  className="px-2.5 py-1.5 bg-[#080B12] border border-slate-700 rounded text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                >
                  {([1, 2, 3, 4, 5, 6] as RegimeId[]).map((r) => (
                    <option key={r} value={r}>
                      Regime {REGIME_LABELS[r].roman}: {REGIME_LABELS[r].short}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-slate-800/80 text-xs">
              <label className="inline-flex items-center gap-2 text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draft.autoPromoteRegimes}
                  onChange={(e) => updateField('autoPromoteRegimes', e.target.checked)}
                  className="accent-cyan-500"
                />
                <span>Enable non-teleological regime promotion when biophysical bridge gates are met</span>
              </label>

              <button
                type="button"
                onClick={() => onLaunchScenario(selectedPresetId, draft, draftMag, false)}
                className="px-3.5 py-1.5 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-xs"
              >
                Load Paused
              </button>
            </div>
          </div>

          {/* Analytical Threshold Preview */}
          <div className="bg-[#0F1420] border border-slate-800 rounded p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-semibold text-slate-100">Analytical Threshold Preview</h2>
              <EpistemicBadge tier="INTERPRETATION" compact />
            </div>

            <div className="flex flex-col gap-3 font-mono text-xs tabular-nums">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Eigen L_max vs L</span>
                <span className={eigen.isStable ? 'text-emerald-300' : 'text-rose-400'}>
                  {eigen.lMax.toFixed(1)} / {draft.polymerLength} ({eigen.isStable ? 'Stable' : 'Catastrophe'})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Syntrophic Gate</span>
                <span className={draft.syntrophyDeltaG <= -15 ? 'text-emerald-300' : 'text-amber-300'}>
                  {draft.syntrophyDeltaG.toFixed(1)} kJ/mol ({draft.syntrophyDeltaG <= -15 ? 'Open' : 'Blocked'})
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Turing Instability</span>
                <span className={turing.isUnstable ? 'text-emerald-300' : 'text-slate-400'}>
                  {turing.isUnstable ? `Pattern (${turing.wavelengthUm.toFixed(1)} um)` : 'Homogeneous'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-sans">Lande Deflection</span>
                <span className="text-cyan-300">{lande.deflectionDeg.toFixed(1)}°</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-2 border-t border-slate-800">
              All presets initialize with an identical closed 7-element BigInt budget (0.0 drift guaranteed).
            </p>
          </div>
        </section>

        {/* Section 3: Custom Parameter Sliders with Epistemic Tags & Tooltips */}
        <section className="bg-[#0F1420] border border-slate-800 rounded p-5 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Calibrated Model Parameters</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Adjust kinetic, thermodynamic, genetic, and morphogenetic priors within empirically bounded ranges.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-5">
            {PARAMETER_SPECS.map((spec) => {
              const rawVal = draft[spec.key] as number;
              const isTipOpen = activeTooltip === spec.key;
              return (
                <div key={spec.key} className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor={`slider-${spec.key}`} className="text-xs font-medium text-slate-200 truncate">
                      {spec.label}
                    </label>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <EpistemicBadge tier={spec.epistemicTier} compact />
                      <button
                        type="button"
                        onClick={() => setActiveTooltip(isTipOpen ? null : spec.key)}
                        aria-label={`Explain ${spec.label}`}
                        title={spec.tooltip}
                        className="text-slate-500 hover:text-cyan-300 transition-colors"
                      >
                        <Info className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-slate-400">
                    <span>{spec.regimeScope}</span>
                    <span className="text-cyan-300 font-semibold">
                      {spec.step < 0.01 ? rawVal.toFixed(3) : spec.step < 1 ? rawVal.toFixed(2) : rawVal}{' '}
                      <span className="text-slate-500 font-normal">{spec.unit}</span>
                    </span>
                  </div>

                  <input
                    id={`slider-${spec.key}`}
                    type="range"
                    min={spec.min}
                    max={spec.max}
                    step={spec.step}
                    value={rawVal}
                    onChange={(e) => updateField(spec.key, parseFloat(e.target.value) as never)}
                    className="w-full accent-cyan-400 h-1.5 bg-slate-800 rounded cursor-pointer"
                  />

                  <div className="flex justify-between font-mono text-[10px] text-slate-500 tabular-nums">
                    <span>{spec.min}</span>
                    <span>{spec.max}</span>
                  </div>

                  {isTipOpen && (
                    <p className="text-[11px] text-slate-300 bg-[#080B12] border border-slate-800 rounded p-2 leading-relaxed">
                      {spec.tooltip}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
};

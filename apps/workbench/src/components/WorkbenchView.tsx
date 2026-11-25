import React, { useState } from 'react';
import {
  Play,
  Pause,
  StepForward,
  FastForward,
  RotateCcw,
  GitFork,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { computeEigenMetrics } from '../engine/simulation';
import { ExperimentBranch } from '../engine/types';
import { EpistemicBadge } from './EpistemicBadge';
import { SimulationCanvas } from './SimulationCanvas';
import { TelemetryCharts } from './TelemetryCharts';

interface WorkbenchViewProps {
  branch: ExperimentBranch;
  isRunning: boolean;
  magnification: number;
  onToggleRun: () => void;
  onStep: (steps: number) => void;
  onReset: () => void;
  onOpenFork: () => void;
  onToggleAutoPromote: () => void;
  onTriggerAdversarialDriftTest: () => void;
}

export const WorkbenchView: React.FC<WorkbenchViewProps> = ({
  branch,
  isRunning,
  magnification,
  onToggleRun,
  onStep,
  onReset,
  onOpenFork,
  onToggleAutoPromote,
  onTriggerAdversarialDriftTest,
}) => {
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const { state, parameters } = branch;
  const eigen = computeEigenMetrics(parameters);

  return (
    <main className="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 overflow-y-auto lg:overflow-hidden">
      {/* Left Control & Bridge Gate Column */}
      <aside className="w-full lg:w-[336px] shrink-0 flex flex-col gap-4 lg:overflow-y-auto lg:pr-1">
        {/* Playback Controls */}
        <section className="bg-[#0F1420] border border-slate-800 rounded p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-200">Simulation Controls</h2>
            <span className="font-mono text-[11px] text-slate-400">
              {isRunning ? 'Running' : state.invariantViolated ? 'Halted' : 'Paused'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onToggleRun}
              disabled={state.invariantViolated}
              className={`col-span-2 flex items-center justify-center gap-2 px-4 py-2 rounded font-semibold text-xs transition-colors disabled:opacity-40 ${
                isRunning
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                  : 'bg-cyan-500 text-slate-950 hover:bg-cyan-400'
              }`}
            >
              {isRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isRunning ? 'Pause Simulation' : 'Start Simulation'}</span>
            </button>

            <button
              type="button"
              onClick={() => onStep(1)}
              disabled={isRunning || state.invariantViolated}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-[#151C2C] hover:bg-slate-800 text-slate-200 border border-slate-700/80 disabled:opacity-40 text-xs font-medium"
            >
              <StepForward className="w-3.5 h-3.5" />
              <span>Step +1</span>
            </button>

            <button
              type="button"
              onClick={() => onStep(10)}
              disabled={isRunning || state.invariantViolated}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-[#151C2C] hover:bg-slate-800 text-slate-200 border border-slate-700/80 disabled:opacity-40 text-xs font-medium"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Step +10</span>
            </button>

            <button
              type="button"
              onClick={onOpenFork}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-[#151C2C] hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 text-xs font-medium"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Fork Here</span>
            </button>

            <button
              type="button"
              onClick={onReset}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded bg-[#151C2C] hover:bg-slate-800 text-slate-300 border border-slate-700/80 text-xs font-medium"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>

          {/* Projective Stepper Status */}
          <div className="pt-2.5 border-t border-slate-800 flex flex-col gap-1.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Projective Stepper</span>
              <span className="font-mono tabular-nums text-slate-200">
                Req {magnification}x · Eff {state.effectiveMagnification}x
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Step Rejections</span>
              <span
                className={`font-mono tabular-nums font-semibold ${
                  state.projectiveStepRejections > 0 ? 'text-amber-300' : 'text-slate-300'
                }`}
              >
                {state.projectiveStepRejections}
              </span>
            </div>
            {state.lastRejectionReason && (
              <div className="mt-1 p-2 rounded bg-amber-500/10 border border-amber-500/30 text-[11px] text-amber-200 leading-snug flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                <span>{state.lastRejectionReason}</span>
              </div>
            )}
          </div>
        </section>

        {/* Live Biophysical Readouts */}
        <section className="bg-[#0F1420] border border-slate-800 rounded p-3.5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-slate-200">Active Regime Telemetry</h2>
            <span className="text-[11px] text-slate-400 font-mono">
              {parameters.environmentMode === 'alkaline_vent' ? 'Vent' : 'Wet-Dry'} · {parameters.temperatureK} K
            </span>
          </div>

          <div className="divide-y divide-slate-800/80 text-xs font-mono tabular-nums">
            <div className="py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-400 font-sans truncate">Gibbs Free Energy</span>
                <EpistemicBadge tier="FACT" compact />
              </div>
              <span className="text-slate-100 whitespace-nowrap">{state.gibbsFreeEnergyKJ.toFixed(2)} kJ/mol</span>
            </div>

            <div className="py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-400 font-sans truncate">Entropy Production</span>
                <EpistemicBadge tier="FACT" compact />
              </div>
              <span className="text-cyan-300 whitespace-nowrap">{state.entropyProduction.toFixed(3)} J/K</span>
            </div>

            <div className="py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-400 font-sans truncate">RAF Autocatalytic Closure</span>
                <EpistemicBadge tier="INTERPRETATION" compact />
              </div>
              <span className="text-emerald-300 whitespace-nowrap">{(state.rafClosureRatio * 100).toFixed(1)}%</span>
            </div>

            <div className="py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-400 font-sans truncate">Eigen Margin</span>
                <EpistemicBadge tier="INTERPRETATION" compact />
              </div>
              <span className={`whitespace-nowrap ${eigen.isStable ? 'text-emerald-300' : 'text-rose-400'}`}>
                {eigen.margin.toFixed(2)}x ({eigen.lMax.toFixed(0)}/{parameters.polymerLength})
              </span>
            </div>

            <div className="py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-400 font-sans truncate">Lande Deflection Angle</span>
                <EpistemicBadge tier="ESTIMATE" compact />
              </div>
              <span className="text-slate-100 whitespace-nowrap">{state.landeDeflectionDeg.toFixed(1)}°</span>
            </div>

            <div className="py-1.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="text-slate-400 font-sans truncate">Orr BDMI Isolation</span>
                <EpistemicBadge tier="UNCERTAINTY" compact />
              </div>
              <span className="text-slate-100 whitespace-nowrap">
                {(state.speciationProb * 100).toFixed(1)}% (k={state.substitutionsK})
              </span>
            </div>
          </div>
        </section>

        {/* Non-Teleological Biophysical Bridge Gate Meters */}
        <section className="bg-[#0F1420] border border-slate-800 rounded p-3.5 flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <h2 className="text-xs font-semibold text-slate-200">Bridge Gate Thresholds</h2>
              <EpistemicBadge tier="INTERPRETATION" compact />
            </div>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-slate-400 cursor-pointer">
              <input
                type="checkbox"
                checked={parameters.autoPromoteRegimes}
                onChange={onToggleAutoPromote}
                className="accent-cyan-500 rounded"
              />
              <span>Auto-Promote</span>
            </label>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            Transitions never fire on fixed clocks; regimes promote only when biophysical gates are met.
          </p>

          <div className="flex flex-col gap-2.5">
            {state.gates.map((gate) => {
              const isCurrent = gate.fromRegime === state.regime;
              const isPassed = state.regime >= gate.toRegime;
              return (
                <div
                  key={gate.id}
                  className={`p-2.5 rounded border text-xs ${
                    isCurrent
                      ? 'bg-[#151C2C] border-cyan-500/40'
                      : 'bg-[#080B12] border-slate-800/80 opacity-85'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="font-medium text-slate-200 text-[11px] truncate" title={gate.name}>
                      {gate.name}
                    </span>
                    <span
                      className={`font-mono text-[10px] shrink-0 ${
                        isPassed
                          ? 'text-emerald-400'
                          : gate.met
                          ? 'text-cyan-300'
                          : 'text-slate-400'
                      }`}
                    >
                      {isPassed ? 'PASSED' : gate.met ? 'MET' : `${Math.round(gate.progress * 100)}%`}
                    </span>
                  </div>

                  <div className="w-full h-1.5 bg-slate-800 rounded-[2px] overflow-hidden mb-1.5">
                    <div
                      className={`h-full transition-all duration-150 ${
                        isPassed ? 'bg-emerald-500' : isCurrent ? 'bg-cyan-400' : 'bg-slate-600'
                      }`}
                      style={{ width: `${Math.round((isPassed ? 1 : gate.progress) * 100)}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between font-mono text-[10px] text-slate-400 tabular-nums">
                    <span className="truncate">{gate.currentDisplay}</span>
                    <span className="text-slate-500 shrink-0 ml-2">Req: {gate.thresholdDisplay}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Collapsible Diagnostics & Invariant Self-Test (Hidden by Default) */}
        <section className="bg-[#0F1420] border border-slate-800 rounded">
          <button
            type="button"
            onClick={() => setShowDiagnostics((prev) => !prev)}
            aria-expanded={showDiagnostics}
            className="w-full px-3.5 py-2.5 flex items-center justify-between text-xs font-medium text-slate-400 hover:text-slate-200"
          >
            <span>Diagnostics & Invariant Self-Test</span>
            {showDiagnostics ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
          </button>

          {showDiagnostics && (
            <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-800 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={onTriggerAdversarialDriftTest}
                disabled={state.invariantViolated}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 text-[11px] font-mono disabled:opacity-40"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Inject +1 C Atom (Verify Hard Halt)</span>
              </button>

              <div className="max-h-36 overflow-y-auto bg-[#080B12] border border-slate-800 rounded p-2 font-mono text-[10px] space-y-1 text-slate-400">
                {state.events.length === 0 ? (
                  <p className="text-slate-500">No gate promotions, rejections, or violations logged yet.</p>
                ) : (
                  [...state.events].reverse().map((ev, idx) => (
                    <div key={`${ev.tick}-${idx}`} className="leading-snug">
                      <span className="text-slate-500">[t={ev.tick}]</span>{' '}
                      <span
                        className={
                          ev.kind === 'violation' || ev.kind === 'catastrophe'
                            ? 'text-rose-400'
                            : ev.kind === 'rejection'
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                        }
                      >
                        {ev.summary}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </section>
      </aside>

      {/* Main Right Stage: Visual Canvas + Live Telemetry Charts */}
      <div className="flex-1 min-w-0 flex flex-col gap-3 min-h-[520px] lg:min-h-0">
        <SimulationCanvas state={state} params={parameters} />
        <TelemetryCharts state={state} />
      </div>
    </main>
  );
};

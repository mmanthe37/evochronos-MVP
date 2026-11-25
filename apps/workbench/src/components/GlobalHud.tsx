import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  GitFork,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
} from 'lucide-react';
import { formatBigIntCompact, sumPools } from '../engine/conservation';
import { REGIME_LABELS } from '../engine/presets';
import { formatSimTime } from '../engine/simulation';
import { ELEMENTS, ExperimentBranch, POOL_NAMES, PoolName } from '../engine/types';
import { EpistemicBadge } from './EpistemicBadge';

export type ActiveTab = 'workbench' | 'setup' | 'dag' | 'epistemic';

interface GlobalHudProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  activeBranch: ExperimentBranch;
  magnification: number;
  onChangeMagnification: (mag: number) => void;
  onOpenForkModal: () => void;
  onOpenOnboarding: () => void;
  onResetBranch: () => void;
}

const MAG_STEPS = [1, 5, 25, 100, 500];

const POOL_LABELS: Record<PoolName, string> = {
  abiotic: 'Abiotic Reservoir',
  biomass: 'Living Biomass',
  detritus: 'Detritus',
  atmosphere: 'Atmosphere / Extracell.',
};

const ELEMENT_COLORS: Record<string, string> = {
  C: 'text-emerald-300',
  H: 'text-sky-300',
  O: 'text-blue-300',
  N: 'text-indigo-300',
  P: 'text-amber-300',
  S: 'text-yellow-300',
  Fe: 'text-rose-300',
};

export const GlobalHud: React.FC<GlobalHudProps> = ({
  activeTab,
  onSelectTab,
  activeBranch,
  magnification,
  onChangeMagnification,
  onOpenForkModal,
  onOpenOnboarding,
  onResetBranch,
}) => {
  const [showPoolAudit, setShowPoolAudit] = useState(false);
  const { state, parameters } = activeBranch;
  const totals = sumPools(state.pools);
  const regimeInfo = REGIME_LABELS[state.regime];

  const navItems: Array<{ id: ActiveTab; label: string }> = [
    { id: 'workbench', label: 'Workbench' },
    { id: 'setup', label: 'Scenario Setup' },
    { id: 'dag', label: 'Counterfactual DAG' },
    { id: 'epistemic', label: 'Epistemic Inspector' },
  ];

  return (
    <div className="shrink-0 z-30 bg-[#0B0F1A] border-b border-slate-800">
      {/* Top Navigation Contract: 3 clean zones */}
      <header className="px-5 h-13 py-2.5 flex items-center justify-between gap-6 border-b border-slate-800/80">
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onSelectTab('workbench')}
            className="text-base font-semibold tracking-tight text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded"
          >
            EvoChronos
          </button>
        </div>

        <nav aria-label="Primary Workspace Views" className="flex items-center gap-1 sm:gap-5 overflow-x-auto">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`px-2 py-1 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 ${
                  active
                    ? 'text-cyan-300 border-cyan-400'
                    : 'text-slate-400 border-transparent hover:text-slate-200'
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenOnboarding}
            aria-label="Open Scientific Guide"
            title="Open Scientific Guide & Boundaries"
            className="p-2 text-slate-400 hover:text-slate-100 rounded border border-slate-800 hover:border-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onOpenForkModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Fork Branch</span>
          </button>
        </div>
      </header>

      {/* Always-Visible Global Telemetry & Conservation Bar */}
      <div className="px-5 py-1.5 bg-[#0F1420] border-b border-slate-800/70 flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 text-xs">
        {/* Left: Active Regime, Seed, Branch, Simulated Time */}
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 font-mono tabular-nums">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400 font-sans text-[11px]">Regime</span>
            <span className="text-cyan-300 font-semibold whitespace-nowrap">
              {regimeInfo.roman} · {regimeInfo.short}
            </span>
          </div>

          <span className="text-slate-700" aria-hidden="true">/</span>

          <div className="flex items-center gap-1.5 text-slate-300 whitespace-nowrap">
            <span className="text-slate-400 font-sans text-[11px]">Branch</span>
            <span className="text-slate-100 font-medium max-w-[160px] truncate" title={activeBranch.name}>
              {activeBranch.name}
            </span>
            <span className="text-slate-500">Seed {parameters.seed}</span>
          </div>

          <span className="text-slate-700" aria-hidden="true">/</span>

          <div className="flex items-center gap-1.5 text-slate-300 whitespace-nowrap">
            <span className="text-slate-400 font-sans text-[11px]">Tick</span>
            <span className="text-slate-100 font-semibold">{state.tick}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-200">{formatSimTime(state.timeSec)}</span>
          </div>
        </div>

        {/* Right: Projective Timescale Scrubber */}
        <div className="flex items-center gap-2">
          <label htmlFor="hud-timescale" className="text-slate-400 font-sans text-[11px] whitespace-nowrap">
            Timescale
          </label>
          <div id="hud-timescale" role="group" aria-label="Projective Timescale Magnification" className="flex items-center bg-[#080B12] border border-slate-800 rounded p-0.5">
            {MAG_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => onChangeMagnification(step)}
                className={`px-2 py-0.5 text-[11px] font-mono rounded-[2px] whitespace-nowrap ${
                  magnification === step
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {step}x
              </button>
            ))}
          </div>
          {state.lastStepRejected && (
            <span
              title={state.lastRejectionReason ?? 'Projective macro-jump throttled down'}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-[3px] bg-amber-500/15 border border-amber-500/40 text-amber-300 text-[10px] font-mono whitespace-nowrap"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Throttled 1x</span>
            </span>
          )}
        </div>
      </div>

      {/* Dedicated Single-Row Global Atomic Conservation Ledger */}
      <div className="px-5 py-1.5 bg-[#0B0F1A] flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-xs font-mono tabular-nums">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 text-[11px]" data-testid="atomic-ledger-totals">
          <span className="font-sans text-[11px] font-medium text-slate-400 mr-1">
            Conserved Atomic Budget
          </span>
          {ELEMENTS.map((el) => (
            <span key={el} className="whitespace-nowrap">
              <span className={`${ELEMENT_COLORS[el]} font-semibold`}>{el}</span>{' '}
              <span className="text-slate-200">{formatBigIntCompact(totals[el])}</span>
            </span>
          ))}
        </div>

        <button
          type="button"
          onClick={() => setShowPoolAudit((prev) => !prev)}
          aria-expanded={showPoolAudit}
          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-[3px] border text-[11px] font-semibold whitespace-nowrap ${
            state.invariantViolated
              ? 'bg-rose-500/20 border-rose-500/60 text-rose-300'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
          }`}
          data-testid="conservation-lock-badge"
        >
          {state.invariantViolated ? (
            <>
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>DRIFT HALT</span>
            </>
          ) : (
            <>
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>0 DRIFT</span>
            </>
          )}
          {showPoolAudit ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Hard Invariant Violation Halt Banner */}
      {state.invariantViolated && (
        <div
          role="alert"
          className="px-5 py-2.5 bg-rose-950/90 border-t border-rose-500/50 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-100"
        >
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-semibold">Simulation Halted — Elemental Conservation Invariant Violated:</span>
            <span className="font-mono text-rose-200">{state.violationMessage}</span>
          </div>
          <button
            type="button"
            onClick={onResetBranch}
            className="px-3 py-1 rounded bg-rose-500 hover:bg-rose-400 text-slate-950 font-semibold text-xs whitespace-nowrap"
          >
            Restore Clean Budget
          </button>
        </div>
      )}

      {/* Collapsible 4-Pool Exact BigInt Conservation Audit Table */}
      {showPoolAudit && (
        <div className="px-5 py-3 bg-[#080B12] border-t border-slate-800 overflow-x-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-200">
                Exact BigInt 4-Pool Atomic Ledger
              </span>
              <EpistemicBadge tier="FACT" />
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Sum(Abiotic + Biomass + Detritus + Atmosphere) - Initial = 0
            </span>
          </div>
          <table className="w-full text-left font-mono text-[11px] tabular-nums border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-1.5 pr-4 font-sans font-medium">Reservoir Pool</th>
                {ELEMENTS.map((el) => (
                  <th key={el} className={`py-1.5 px-2 text-right ${ELEMENT_COLORS[el]}`}>
                    {el}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {POOL_NAMES.map((pool) => (
                <tr key={pool} className="border-b border-slate-800/50 text-slate-200">
                  <td className="py-1.5 pr-4 font-sans text-slate-300">{POOL_LABELS[pool]}</td>
                  {ELEMENTS.map((el) => (
                    <td key={el} className="py-1.5 px-2 text-right">
                      {formatBigIntCompact(state.pools[pool][el])}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="border-b border-slate-700 text-slate-100 font-semibold bg-slate-900/40">
                <td className="py-1.5 pr-4 font-sans">Total Conserved</td>
                {ELEMENTS.map((el) => (
                  <td key={el} className="py-1.5 px-2 text-right">
                    {formatBigIntCompact(totals[el])}
                  </td>
                ))}
              </tr>
              <tr className={state.invariantViolated ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                <td className="py-1.5 pr-4 font-sans">Net Drift (Total - Initial)</td>
                {ELEMENTS.map((el) => (
                  <td key={el} className="py-1.5 px-2 text-right">
                    {formatBigIntCompact(state.drift[el])}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

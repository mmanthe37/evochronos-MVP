import React, { useState } from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';
import {
  EPISTEMIC_META,
  PARAMETER_SPECS,
  REGIME_EVIDENCE_DOCS,
  REGIME_LABELS,
} from '../engine/presets';
import { EpistemicTier, ExperimentBranch, RegimeId } from '../engine/types';
import { EpistemicBadge } from './EpistemicBadge';

interface EpistemicInspectorViewProps {
  activeBranch: ExperimentBranch;
}

const TIER_ORDER: EpistemicTier[] = [
  'FACT',
  'ASSUMPTION',
  'ESTIMATE',
  'INTERPRETATION',
  'UNCERTAINTY',
];

export const EpistemicInspectorView: React.FC<EpistemicInspectorViewProps> = ({
  activeBranch,
}) => {
  const [selectedRegime, setSelectedRegime] = useState<RegimeId>(activeBranch.state.regime);
  const doc = REGIME_EVIDENCE_DOCS.find((d) => d.regime === selectedRegime) ?? REGIME_EVIDENCE_DOCS[0];

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Honest Scientific Boundaries Statement */}
        <section className="bg-[#0F1420] border border-slate-700 rounded p-5 flex flex-col gap-2">
          <div className="flex items-center gap-2 text-slate-100 font-semibold text-sm">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <h1>Honest Scientific Boundaries & Epistemic Transparency</h1>
          </div>
          <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
            EvoChronos models bounded, reproducible mathematical scenarios across evolutionary regimes.
            It does <strong className="text-slate-100 font-semibold">not</strong> claim to reconstruct Earth&apos;s historical origin of life, resolve open prebiotic mysteries (such as homochirality or genetic code origin), or serve as a life-detection instrument. Every rule, prior, and detector below is explicitly tagged with its epistemic basis.
          </p>
        </section>

        {/* 5-Tier Epistemic Taxonomy Reference */}
        <section className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-slate-200">5-Tier Epistemic Classification</h2>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            {TIER_ORDER.map((tier) => {
              const meta = EPISTEMIC_META[tier];
              return (
                <div key={tier} className="bg-[#0F1420] border border-slate-800 rounded p-3.5 flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <EpistemicBadge tier={tier} />
                  </div>
                  <div className="text-xs font-medium text-slate-200">{meta.shortDesc}</div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">{meta.detail}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Regime Selector & Governing Equations */}
        <section className="bg-[#0F1420] border border-slate-800 rounded p-5 flex flex-col gap-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-100">{doc.title}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{doc.summary}</p>
            </div>

            <div role="tablist" aria-label="Inspect Regime Equations" className="flex items-center gap-1 bg-[#080B12] border border-slate-800 rounded p-1">
              {([1, 2, 3, 4, 5, 6] as RegimeId[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  role="tab"
                  aria-selected={selectedRegime === r}
                  onClick={() => setSelectedRegime(r)}
                  className={`px-2.5 py-1 rounded-[3px] font-mono text-xs transition-colors ${
                    selectedRegime === r
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {REGIME_LABELS[r].roman}
                </button>
              ))}
            </div>
          </div>

          {/* Equations List */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {doc.equations.map((eq) => (
              <div key={eq.name} className="bg-[#080B12] border border-slate-800 rounded p-3.5 flex flex-col gap-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-200">{eq.name}</span>
                  <EpistemicBadge tier={eq.epistemicTier} />
                </div>
                <div className="font-mono text-xs text-cyan-300 bg-[#0F1420] px-2.5 py-2 rounded border border-slate-800/80 overflow-x-auto">
                  {eq.formula}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{eq.notes}</p>
              </div>
            ))}
          </div>

          {/* What This Scenario Can vs Cannot Claim */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-slate-800">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-300">
                <ShieldCheck className="w-4 h-4" />
                <span>What This Model Can Scientifically Claim</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4 leading-relaxed">
                {doc.canClaim.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-300">
                <AlertCircle className="w-4 h-4" />
                <span>What This Model Cannot Claim</span>
              </div>
              <ul className="space-y-1.5 text-xs text-slate-300 list-disc pl-4 leading-relaxed">
                {doc.cannotClaim.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* Active Branch Parameter Audit Table */}
        <section className="bg-[#0F1420] border border-slate-800 rounded p-5 flex flex-col gap-3 overflow-x-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">
              Active Branch Parameter Bounds Audit ({activeBranch.name})
            </h2>
            <span className="font-mono text-xs text-slate-400">
              Seed {activeBranch.parameters.seed} · Mode {activeBranch.parameters.environmentMode}
            </span>
          </div>

          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-2 pr-4 font-medium">Parameter</th>
                <th className="py-2 px-3 font-medium">Epistemic Tag</th>
                <th className="py-2 px-3 font-medium">Active Value</th>
                <th className="py-2 px-3 font-medium">Valid Bounds</th>
                <th className="py-2 px-3 font-medium">Scope</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {PARAMETER_SPECS.map((spec) => {
                const val = activeBranch.parameters[spec.key] as number;
                return (
                  <tr key={spec.key} className="text-slate-300">
                    <td className="py-2 pr-4 font-medium text-slate-200">{spec.label}</td>
                    <td className="py-2 px-3">
                      <EpistemicBadge tier={spec.epistemicTier} />
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-cyan-300">
                      {val} {spec.unit}
                    </td>
                    <td className="py-2 px-3 font-mono tabular-nums text-slate-400">
                      [{spec.min}, {spec.max}]
                    </td>
                    <td className="py-2 px-3 text-slate-400">{spec.regimeScope}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
};

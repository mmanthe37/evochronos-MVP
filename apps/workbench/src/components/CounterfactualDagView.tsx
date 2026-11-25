import React, { useMemo, useRef, useState } from 'react';
import {
  GitFork,
  Download,
  Upload,
  CheckCircle2,
  Trash2,
  ArrowRightLeft,
} from 'lucide-react';
import { PARAMETER_SPECS, REGIME_LABELS } from '../engine/presets';
import { formatSimTime } from '../engine/simulation';
import {
  deserializeExperimentBundle,
  exportBranchesToCsv,
  serializeExperimentBundle,
} from '../engine/storage';
import { ExperimentBranch, ExperimentBundle } from '../engine/types';
import { EpistemicBadge } from './EpistemicBadge';

interface CounterfactualDagViewProps {
  branches: ExperimentBranch[];
  activeBranchId: string;
  onSelectBranch: (branchId: string) => void;
  onOpenForkModal: () => void;
  onImportBundle: (branches: ExperimentBranch[], activeBranchId: string) => void;
  onClearSaved: () => void;
  lastSavedAt: string | null;
}

interface OverlayChartProps {
  title: string;
  unit: string;
  branchA: ExperimentBranch;
  branchB: ExperimentBranch | null;
  accessor: (pt: ExperimentBranch['state']['history'][number]) => number;
  format: (v: number) => string;
}

const OverlayComparisonChart: React.FC<OverlayChartProps> = ({
  title,
  unit,
  branchA,
  branchB,
  accessor,
  format,
}) => {
  const w = 440;
  const h = 150;
  const padX = 34;
  const padY = 18;

  const histA = branchA.state.history;
  const histB = branchB ? branchB.state.history : [];

  const maxTick = Math.max(
    1,
    histA[histA.length - 1]?.tick ?? 1,
    histB[histB.length - 1]?.tick ?? 1
  );
  const allVals = [...histA.map(accessor), ...histB.map(accessor), 0];
  const minVal = Math.min(...allVals);
  const maxVal = Math.max(...allVals, minVal + 1e-6);
  const range = maxVal - minVal || 1;

  const xOf = (tick: number) => padX + (tick / maxTick) * (w - padX - 14);
  const yOf = (val: number) => h - padY - ((val - minVal) / range) * (h - padY * 2);

  const ptsA = histA.map((p) => `${xOf(p.tick).toFixed(1)},${yOf(accessor(p)).toFixed(1)}`).join(' ');
  const ptsB = histB.map((p) => `${xOf(p.tick).toFixed(1)},${yOf(accessor(p)).toFixed(1)}`).join(' ');

  const latestA = histA[histA.length - 1];
  const latestB = histB[histB.length - 1];

  return (
    <div className="bg-[#0F1420] border border-slate-800 rounded p-4 flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-semibold text-slate-200">{title}</span>
        <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
          <span className="text-cyan-300">
            A: {latestA ? format(accessor(latestA)) : '—'} {unit}
          </span>
          {branchB && (
            <span className="text-amber-300">
              B: {latestB ? format(accessor(latestB)) : '—'} {unit}
            </span>
          )}
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[150px] bg-[#080B12] border border-slate-800/80 rounded">
        <line x1={padX} y1={padY} x2={w - 14} y2={padY} stroke="#1E293B" strokeDasharray="2 3" />
        <line x1={padX} y1={h / 2} x2={w - 14} y2={h / 2} stroke="#1E293B" strokeDasharray="2 3" />
        <line x1={padX} y1={h - padY} x2={w - 14} y2={h - padY} stroke="#334155" />

        {/* Fork marker vertical line */}
        {branchB && branchB.forkTick !== null && (
          <>
            <line
              x1={xOf(branchB.forkTick)}
              y1={padY}
              x2={xOf(branchB.forkTick)}
              y2={h - padY}
              stroke="#818CF8"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
            <text
              x={xOf(branchB.forkTick) + 4}
              y={padY + 10}
              fill="#A5B4FC"
              fontSize="9"
              fontFamily="JetBrains Mono, monospace"
            >
              Fork t={branchB.forkTick}
            </text>
          </>
        )}

        {/* Y axis bounds */}
        <text x="4" y={padY + 4} fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">
          {format(maxVal)}
        </text>
        <text x="4" y={h - padY} fill="#64748B" fontSize="9" fontFamily="JetBrains Mono, monospace">
          {format(minVal)}
        </text>

        {/* Control branch A (solid cyan) */}
        {ptsA && <polyline fill="none" stroke="#06B6D4" strokeWidth="2" points={ptsA} />}

        {/* Counterfactual branch B (dashed amber) */}
        {ptsB && (
          <polyline
            fill="none"
            stroke="#F59E0B"
            strokeWidth="2"
            strokeDasharray="5 3"
            points={ptsB}
          />
        )}
      </svg>
    </div>
  );
};

export const CounterfactualDagView: React.FC<CounterfactualDagViewProps> = ({
  branches,
  activeBranchId,
  onSelectBranch,
  onOpenForkModal,
  onImportBundle,
  onClearSaved,
  lastSavedAt,
}) => {
  const [compareAId, setCompareAId] = useState<string>(branches[0]?.id ?? activeBranchId);
  const [compareBId, setCompareBId] = useState<string>(
    branches.length > 1 ? branches[branches.length - 1].id : ''
  );
  const [importError, setImportError] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const branchA = branches.find((b) => b.id === compareAId) ?? branches[0];
  const branchB =
    branches.find((b) => b.id === compareBId && b.id !== branchA.id) ??
    branches.find((b) => b.id !== branchA.id) ??
    null;

  // Compute DAG node layout deterministically
  const dagNodes = useMemo(() => {
    const depthMap = new Map<string, number>();
    const getDepth = (b: ExperimentBranch): number => {
      if (depthMap.has(b.id)) return depthMap.get(b.id)!;
      if (!b.parentId) {
        depthMap.set(b.id, 0);
        return 0;
      }
      const parent = branches.find((p) => p.id === b.parentId);
      const d = parent ? getDepth(parent) + 1 : 0;
      depthMap.set(b.id, d);
      return d;
    };

    const rowCounter = new Map<number, number>();
    return branches.map((b) => {
      const col = getDepth(b);
      const row = rowCounter.get(col) ?? 0;
      rowCounter.set(col, row + 1);
      return {
        branch: b,
        x: 112 + col * 265,
        y: 52 + row * 82,
      };
    });
  }, [branches]);

  const dagHeight = Math.max(114, dagNodes.reduce((m, n) => Math.max(m, n.y + 52), 114));
  const dagWidth = Math.max(660, dagNodes.reduce((m, n) => Math.max(m, n.x + 140), 660));

  const downloadFile = (filename: string, content: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setExportNotice(`Exported ${filename}`);
    setTimeout(() => setExportNotice(null), 3000);
  };

  const handleExportJson = () => {
    const bundle = serializeExperimentBundle(branches, activeBranchId);
    downloadFile(
      `evochronos-bundle-seed-${branchA.parameters.seed}.json`,
      JSON.stringify(bundle, null, 2),
      'application/json'
    );
  };

  const handleExportCsv = () => {
    const csv = exportBranchesToCsv(branches);
    downloadFile(
      `evochronos-trajectories-seed-${branchA.parameters.seed}.csv`,
      csv,
      'text/csv;charset=utf-8'
    );
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as ExperimentBundle;
      const restored = deserializeExperimentBundle(parsed);
      onImportBundle(restored.branches, restored.activeBranchId);
      setImportError(null);
      setExportNotice(`Imported ${restored.branches.length} branch(es) from ${file.name}`);
      setTimeout(() => setExportNotice(null), 3000);
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Failed to parse experiment bundle.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Parameter diffs between Branch A and Branch B
  const paramDiffs = useMemo(() => {
    if (!branchB) return [];
    const diffs: Array<{
      label: string;
      valA: string;
      valB: string;
      tier: 'FACT' | 'ASSUMPTION' | 'ESTIMATE' | 'INTERPRETATION' | 'UNCERTAINTY';
    }> = [];

    if (branchA.parameters.environmentMode !== branchB.parameters.environmentMode) {
      diffs.push({
        label: 'Environment Mode',
        valA: branchA.parameters.environmentMode,
        valB: branchB.parameters.environmentMode,
        tier: 'ASSUMPTION',
      });
    }
    if (branchA.parameters.seed !== branchB.parameters.seed) {
      diffs.push({
        label: 'PRNG Seed',
        valA: String(branchA.parameters.seed),
        valB: String(branchB.parameters.seed),
        tier: 'FACT',
      });
    }
    for (const spec of PARAMETER_SPECS) {
      const vA = branchA.parameters[spec.key];
      const vB = branchB.parameters[spec.key];
      if (vA !== vB) {
        diffs.push({
          label: spec.label,
          valA: `${vA} ${spec.unit}`,
          valB: `${vB} ${spec.unit}`,
          tier: spec.epistemicTier,
        });
      }
    }
    return diffs;
  }, [branchA, branchB]);

  return (
    <main className="flex-1 overflow-y-auto p-6">
      <div className="max-w-6xl mx-auto flex flex-col gap-6">
        {/* Header & Bundle Export Controls */}
        <section className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-slate-100">Counterfactual Branch & Comparison DAG</h1>
            <p className="text-sm text-slate-400 mt-1">
              Inspect forked evolutionary lineages, overlay Control vs. Perturbed trajectories, and export reproducible BigInt bundles.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onOpenForkModal}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs whitespace-nowrap"
            >
              <GitFork className="w-3.5 h-3.5" />
              <span>Fork Active Branch</span>
            </button>

            <button
              type="button"
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 rounded bg-[#151C2C] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Import JSON</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
        </section>

        {(exportNotice || importError || lastSavedAt) && (
          <div className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2 bg-[#0F1420] border border-slate-800 rounded text-xs">
            <div className="flex items-center gap-2 text-slate-300">
              {importError ? (
                <span className="text-rose-400">{importError}</span>
              ) : exportNotice ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-300">{exportNotice}</span>
                </>
              ) : (
                <span className="text-slate-400 font-mono text-[11px]">
                  LocalStorage bundle synced · {branches.length} branch(es) · Last saved {lastSavedAt}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={onClearSaved}
              className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-rose-300"
            >
              <Trash2 className="w-3 h-3" />
              <span>Reset All Branches</span>
            </button>
          </div>
        )}

        {/* Visual DAG SVG Tree */}
        <section className="bg-[#0F1420] border border-slate-800 rounded p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-100">Experiment Lineage Graph (Click Node to Activate)</h2>
            <span className="text-xs font-mono text-slate-400">
              Active: {branches.find((b) => b.id === activeBranchId)?.name}
            </span>
          </div>

          <div className="overflow-x-auto bg-[#080B12] border border-slate-800/80 rounded">
            <svg width={dagWidth} height={dagHeight} className="block min-w-full">
              {/* Edges parent -> child */}
              {dagNodes.map((node) => {
                if (!node.branch.parentId) return null;
                const parent = dagNodes.find((n) => n.branch.id === node.branch.parentId);
                if (!parent) return null;
                const midX = (parent.x + 98 + (node.x - 98)) / 2;
                return (
                  <g key={`edge-${node.branch.id}`}>
                    <path
                      d={`M ${parent.x + 98} ${parent.y} C ${midX} ${parent.y}, ${midX} ${node.y}, ${node.x - 98} ${node.y}`}
                      fill="none"
                      stroke="#475569"
                      strokeWidth="1.75"
                    />
                    {node.branch.forkTick !== null && (
                      <text
                        x={midX}
                        y={(parent.y + node.y) / 2 - 6}
                        fill="#94A3B8"
                        fontSize="10"
                        textAnchor="middle"
                        fontFamily="JetBrains Mono, monospace"
                      >
                        t={node.branch.forkTick}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Branch nodes */}
              {dagNodes.map(({ branch, x, y }) => {
                const isActive = branch.id === activeBranchId;
                const displayName =
                  branch.name.length > 24 ? `${branch.name.slice(0, 23)}…` : branch.name;
                return (
                  <g
                    key={branch.id}
                    transform={`translate(${x - 98}, ${y - 29})`}
                    onClick={() => onSelectBranch(branch.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`Select branch ${branch.name}`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectBranch(branch.id);
                      }
                    }}
                    className="cursor-pointer focus:outline-none"
                  >
                    <rect
                      width="196"
                      height="58"
                      rx="4"
                      fill={isActive ? '#152236' : '#0F1420'}
                      stroke={isActive ? '#06B6D4' : '#334155'}
                      strokeWidth={isActive ? 2 : 1}
                    />
                    <text x="10" y="19" fill="#F1F5F9" fontSize="11" fontWeight="600">
                      {displayName}
                    </text>
                    <text x="10" y="35" fill="#94A3B8" fontSize="10" fontFamily="JetBrains Mono, monospace">
                      Reg {REGIME_LABELS[branch.state.regime].roman} · t={branch.state.tick}
                    </text>
                    <text x="10" y="49" fill="#34D399" fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                      {branch.state.invariantViolated ? 'HALTED' : '0 DRIFT'} · {formatSimTime(branch.state.timeSec)}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>
        </section>

        {/* Side-by-Side Comparison Controls & Overlay Charts */}
        <section className="flex flex-col gap-4">
          <div className="bg-[#0F1420] border border-slate-800 rounded p-4 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-semibold text-slate-100">Control vs. Counterfactual Comparison</h2>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-2">
                <label htmlFor="compare-a" className="text-cyan-300 font-mono">
                  Branch A (Solid)
                </label>
                <select
                  id="compare-a"
                  value={branchA.id}
                  onChange={(e) => setCompareAId(e.target.value)}
                  className="px-2.5 py-1.5 bg-[#080B12] border border-slate-700 rounded text-slate-100"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} (t={b.state.tick})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="compare-b" className="text-amber-300 font-mono">
                  Branch B (Dashed)
                </label>
                <select
                  id="compare-b"
                  value={branchB?.id ?? ''}
                  onChange={(e) => setCompareBId(e.target.value)}
                  disabled={branches.length < 2}
                  className="px-2.5 py-1.5 bg-[#080B12] border border-slate-700 rounded text-slate-100 disabled:opacity-50"
                >
                  {branches.length < 2 ? (
                    <option value="">Fork a branch to compare</option>
                  ) : (
                    branches
                      .filter((b) => b.id !== branchA.id)
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} (t={b.state.tick})
                        </option>
                      ))
                  )}
                </select>
              </div>
            </div>
          </div>

          {!branchB ? (
            <div className="bg-[#0F1420] border border-slate-800 rounded p-6 text-center flex flex-col items-center gap-3">
              <p className="text-sm text-slate-300">
                Only one branch exists right now. Fork the current run to perturb a variable (such as temperature, mutation rate, or environment mode) and compare trajectories side by side.
              </p>
              <button
                type="button"
                onClick={onOpenForkModal}
                className="flex items-center gap-1.5 px-4 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs"
              >
                <GitFork className="w-3.5 h-3.5" />
                <span>Create Counterfactual Fork</span>
              </button>
            </div>
          ) : (
            <>
              {/* Parameter Diff Table */}
              <div className="bg-[#0F1420] border border-slate-800 rounded p-4">
                <h3 className="text-xs font-semibold text-slate-200 mb-2.5">
                  Perturbed Variables ({branchA.name} vs. {branchB.name})
                </h3>
                {paramDiffs.length === 0 ? (
                  <p className="text-xs text-slate-400">
                    Parameters are identical between Branch A and Branch B (reproducibility control).
                  </p>
                ) : (
                  <table className="w-full text-left text-xs font-mono tabular-nums border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 text-slate-400 font-sans">
                        <th className="py-1.5 pr-4 font-medium">Parameter</th>
                        <th className="py-1.5 px-3 font-medium">Epistemic Tier</th>
                        <th className="py-1.5 px-3 text-cyan-300 font-medium">{branchA.name}</th>
                        <th className="py-1.5 px-3 text-amber-300 font-medium">{branchB.name}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paramDiffs.map((d) => (
                        <tr key={d.label} className="border-b border-slate-800/50">
                          <td className="py-1.5 pr-4 font-sans text-slate-200">{d.label}</td>
                          <td className="py-1.5 px-3">
                            <EpistemicBadge tier={d.tier} compact />
                          </td>
                          <td className="py-1.5 px-3 text-slate-200">{d.valA}</td>
                          <td className="py-1.5 px-3 text-amber-200">{d.valB}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              {/* Overlaid SVG Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <OverlayComparisonChart
                  title="Living Biomass Carbon"
                  unit="k C"
                  branchA={branchA}
                  branchB={branchB}
                  accessor={(p) => p.biomassCarbon / 1000}
                  format={(v) => v.toFixed(1)}
                />
                <OverlayComparisonChart
                  title="Entropy Production Rate"
                  unit="J/K"
                  branchA={branchA}
                  branchB={branchB}
                  accessor={(p) => p.entropyProduction}
                  format={(v) => v.toFixed(2)}
                />
                <OverlayComparisonChart
                  title="RAF Closure / Master Sequence Fidelity"
                  unit="%"
                  branchA={branchA}
                  branchB={branchB}
                  accessor={(p) =>
                    (p.regime === 1 ? p.rafClosureRatio : p.masterSequenceFraction) * 100
                  }
                  format={(v) => v.toFixed(0)}
                />
                <OverlayComparisonChart
                  title="Biodiversity (Clade Count)"
                  unit="clades"
                  branchA={branchA}
                  branchB={branchB}
                  accessor={(p) => p.biodiversity}
                  format={(v) => String(Math.round(v))}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
};

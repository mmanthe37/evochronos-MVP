import React from 'react';
import { Network, Activity, ArrowRightLeft } from 'lucide-react';

interface MetabolicFluxViewProps {
  growthRate: number;
}

export const MetabolicFluxView: React.FC<MetabolicFluxViewProps> = ({ growthRate }) => {
  const reactions = [
    { name: 'R_Hexokinase', flux: 10.0, bounds: '[0, 10]', compartment: 'Cytosol', color: 'emerald' },
    { name: 'R_Phosphofructokinase', flux: 10.0, bounds: '[0, 10]', compartment: 'Cytosol', color: 'emerald' },
    { name: 'R_Pyruvate_Kinase', flux: 20.0, bounds: '[0, 25]', compartment: 'Cytosol', color: 'emerald' },
    { name: 'T_Pyruvate_Carrier', flux: 18.5, bounds: '[-20, 20]', compartment: 'Transport (MOMP)', color: 'amber' },
    { name: 'R_PDH_Mito', flux: 18.5, bounds: '[0, 20]', compartment: 'Mitochondrion', color: 'sky' },
    { name: 'R_Citrate_Synthase', flux: 18.5, bounds: '[0, 20]', compartment: 'Mitochondrion', color: 'sky' },
    { name: 'R_ATP_Synthase', flux: 48.0, bounds: '[0, 60]', compartment: 'Mitochondrion', color: 'sky' },
  ];

  return (
    <div className="w-full h-full bg-[#0a0f1d] p-6 flex flex-col gap-6 overflow-y-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Network className="w-5 h-5 text-sky-400" />
          <h3 className="font-semibold text-slate-100 text-sm">Tri-Compartment Block-Angular Metabolic Network (dFBA / rFBA)</h3>
        </div>
        <div className="flex items-center gap-2 bg-slate-900 px-3 py-2 rounded-lg border border-slate-800 text-xs font-mono">
          <Activity className="w-4 h-4 text-emerald-400 animate-pulse" />
          <span className="text-slate-400">BIOMASS GROWTH FLUX (mu):</span>
          <span className="text-emerald-400 font-bold">{growthRate.toFixed(4)} hr⁻¹</span>
        </div>
      </div>

      {/* Compartment Architecture Diagram */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Cytosolic Block */}
        <div className="bg-slate-900/60 border border-emerald-500/30 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2">
            <span className="text-xs font-bold text-emerald-400 font-mono uppercase tracking-wider">Compartment I: Cytosol</span>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-2 py-1 rounded">Glycolytic</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {reactions.filter((r) => r.compartment === 'Cytosol').map((r) => (
              <div key={r.name} className="flex items-center justify-between bg-slate-800/40 p-2 rounded">
                <span className="text-slate-300">{r.name}</span>
                <span className="text-emerald-400 font-semibold">{r.flux.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Transport Interface */}
        <div className="bg-slate-900/60 border border-amber-500/30 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
            <div className="flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 font-mono uppercase tracking-wider">Intermembrane Barrier</span>
            </div>
            <span className="text-[10px] bg-amber-500/10 text-amber-400 px-2 py-1 rounded">Transport</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {reactions.filter((r) => r.compartment.includes('Transport')).map((r) => (
              <div key={r.name} className="flex items-center justify-between bg-slate-800/40 p-2 rounded">
                <span className="text-slate-300">{r.name}</span>
                <span className="text-amber-400 font-semibold">{r.flux.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Mitochondrial Block */}
        <div className="bg-slate-900/60 border border-sky-500/30 rounded-xl p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-sky-500/20 pb-2">
            <span className="text-xs font-bold text-sky-400 font-mono uppercase tracking-wider">Compartment II: Mitochondrion</span>
            <span className="text-[10px] bg-sky-500/10 text-sky-400 px-2 py-1 rounded">OxPhos / TCA</span>
          </div>
          <div className="space-y-2 text-xs font-mono">
            {reactions.filter((r) => r.compartment === 'Mitochondrion').map((r) => (
              <div key={r.name} className="flex items-center justify-between bg-slate-800/40 p-2 rounded">
                <span className="text-slate-300">{r.name}</span>
                <span className="text-sky-400 font-semibold">{r.flux.toFixed(1)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

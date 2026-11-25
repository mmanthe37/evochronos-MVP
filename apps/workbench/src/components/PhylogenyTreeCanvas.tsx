import React from 'react';
import { GitBranch, Dna } from 'lucide-react';

export const PhylogenyTreeCanvas: React.FC = () => {
  return (
    <div className="w-full h-full bg-[#0a0f1d] p-6 flex flex-col gap-6 font-mono text-xs">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-indigo-400" />
          <h3 className="font-semibold text-slate-100 font-sans text-sm">Ancestral Recombination Graph & Speciation Cladogram (tskit)</h3>
        </div>
        <div className="flex items-center gap-2 text-slate-400 text-xs">
          <Dna className="w-4 h-4 text-emerald-400" />
          <span>O(N + M log M) SUCCINCT TREE SEQUENCE</span>
        </div>
      </div>

      {/* SVG Tree View */}
      <div className="flex-1 bg-slate-900/50 rounded-xl border border-slate-800/80 p-6 flex items-center justify-center">
        <svg width="600" height="300" viewBox="0 0 600 300" className="w-full max-w-2xl h-auto">
          {/* Root node */}
          <circle cx="50" cy="150" r="6" fill="#10b981" />
          <text x="50" y="130" fill="#6ee7b7" fontSize="10" textAnchor="middle">MRCA (T=120 Myr)</text>

          {/* Branches */}
          <path d="M 50 150 L 250 80" stroke="#334155" strokeWidth="2" fill="none" />
          <path d="M 50 150 L 250 220" stroke="#334155" strokeWidth="2" fill="none" />

          {/* Speciation event 1 */}
          <circle cx="250" cy="80" r="5" fill="#f59e0b" />
          <text x="250" y="65" fill="#fbbf24" fontSize="9" textAnchor="middle">BDMI Speciation</text>
          <path d="M 250 80 L 450 40" stroke="#10b981" strokeWidth="2" fill="none" />
          <path d="M 250 80 L 450 110" stroke="#10b981" strokeWidth="2" fill="none" />

          {/* Speciation event 2 */}
          <circle cx="250" cy="220" r="5" fill="#f59e0b" />
          <text x="250" y="240" fill="#fbbf24" fontSize="9" textAnchor="middle">BDMI Speciation</text>
          <path d="M 250 220 L 450 190" stroke="#38bdf8" strokeWidth="2" fill="none" />
          <path d="M 250 220 L 450 260" stroke="#38bdf8" strokeWidth="2" fill="none" />

          {/* Extant Tips */}
          <circle cx="450" cy="40" r="4" fill="#34d399" />
          <text x="465" y="44" fill="#e2e8f0" fontSize="11">Species A (Soma Specialized)</text>

          <circle cx="450" cy="110" r="4" fill="#34d399" />
          <text x="465" y="114" fill="#e2e8f0" fontSize="11">Species B (Thermophilic Guild)</text>

          <circle cx="450" cy="190" r="4" fill="#60a5fa" />
          <text x="465" y="194" fill="#e2e8f0" fontSize="11">Species C (Chimeric Aerobe)</text>

          <circle cx="450" cy="260" r="4" fill="#60a5fa" />
          <text x="465" y="264" fill="#e2e8f0" fontSize="11">Species D (Syntrophic Methanogen)</text>
        </svg>
      </div>
    </div>
  );
};

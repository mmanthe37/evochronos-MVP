'use client';

import React, { useState } from 'react';
import {
  Atom,
  ShieldCheck,
  Cpu,
  Layers,
  ArrowRight,
  Terminal,
  Activity,
  Compass,
  GitBranch,
  Download,
  ExternalLink,
  ChevronRight,
  Dna,
  Calculator,
  Sliders,
  Sparkles,
  Bot,
  CheckCircle2,
  Play,
  Copy,
  Check,
} from 'lucide-react';

export default function Home() {
  const [selectedRegime, setSelectedRegime] = useState(1);
  const [activeCalculator, setActiveCalculator] = useState<'bdmi' | 'lande' | 'turing'>('bdmi');

  // BDMI Speciation State
  const [kSubstitutions, setKSubstitutions] = useState(16);
  const [pIncompatibility, setPIncompatibility] = useState(0.008);

  // Lande G-Matrix State
  const [beta1, setBeta1] = useState(0.8);
  const [beta2, setBeta2] = useState(-0.3);
  const [g12Covariance, setG12Covariance] = useState(0.5);

  // Turing Morphogenesis State
  const [diffusionRatio, setDiffusionRatio] = useState(18); // Dv / Du
  const [decayRate, setDecayRate] = useState(1.2);

  // MCP Demo Copied State
  const [copiedMcp, setCopiedMcp] = useState(false);

  // BDMI Calculations: C = k*(k-1)/2, E[I] = C * p, P(iso) = 1 - (1-p)^C
  const pairwiseCombinations = (kSubstitutions * (kSubstitutions - 1)) / 2;
  const expectedIncompatibilities = pairwiseCombinations * pIncompatibility;
  const isolationProbability = 1.0 - Math.pow(1.0 - pIncompatibility, pairwiseCombinations);

  // Lande Calculations: G = [[1.0, g12], [g12, 1.0]], delta_z = G * beta
  const dz1 = 1.0 * beta1 + g12Covariance * beta2;
  const dz2 = g12Covariance * beta1 + 1.0 * beta2;
  const normBeta = Math.sqrt(beta1 * beta1 + beta2 * beta2) || 1e-6;
  const normDz = Math.sqrt(dz1 * dz1 + dz2 * dz2) || 1e-6;
  const cosTheta = Math.max(-1.0, Math.min(1.0, (beta1 * dz1 + beta2 * dz2) / (normBeta * normDz)));
  const deflectionAngleDeg = (Math.acos(cosTheta) * 180) / Math.PI;

  // Turing Calculations: Instability requires d > 1 and d*fu + gv > 2*sqrt(d*(fu*gv - fv*gu))
  const fu = 0.6;
  const fv = -0.8;
  const gu = 0.5;
  const gv = -decayRate;
  const detJ = fu * gv - fv * gu;
  const isTuringUnstable = diffusionRatio * fu + gv > 2.0 * Math.sqrt(Math.max(0.01, diffusionRatio * detJ));
  const characteristicWavelength = isTuringUnstable
    ? 2.0 * Math.PI * Math.pow(diffusionRatio / Math.max(0.1, detJ), 0.25)
    : 0;

  const copyMcpCommand = () => {
    navigator.clipboard.writeText('python3 mcp-server/evochronos_mcp.py --demo');
    setCopiedMcp(true);
    setTimeout(() => setCopiedMcp(false), 2000);
  };

  const regimes = [
    {
      id: 1,
      title: 'Regime I: Prebiotic Geochemistry',
      timescale: '10⁻¹⁵ s – 10² s',
      scale: 'Sub-angstrom to Microns',
      desc: 'Mineral-catalyzed chemical reaction networks in Archean hydrothermal alkaline vents. Exact Gillespie SSA, clamped tau-leaping, and Hordijk-Steel maxRAF reflexively autocatalytic sets.',
      invariant: '16 species, 6 reactions, 100% mass balance across [C, H, O, N, P, S, Fe]',
      badge: 'Geochemical Foundation',
    },
    {
      id: 2,
      title: 'Regime II: Protocells & Quasispecies',
      timescale: '10² s – 10⁵ s',
      scale: 'Microns',
      desc: 'Fatty acid bilayer membrane biophysics, spontaneous division at surface area doubling, Manfred Eigen quasispecies replicator dynamics with analytical error threshold μ_crit = ln(σ)/L, and Gánti chemoton stoichiometry.',
      invariant: 'Strict elemental conservation across vesicle fission and RNA replication',
      badge: 'Information Origin',
    },
    {
      id: 3,
      title: 'Regime III: Prokaryotic dFBA',
      timescale: '10³ s – 10⁷ s',
      scale: 'Cellular Populations',
      desc: 'Dynamic Flux Balance Analysis with Monod uptake kinetics, exact Gauss-Jordan nullspace basis reduction LP solver, and thermodynamic loop-law constraints eliminating internal futile cycles.',
      invariant: 'S · v = 0 steady-state with 0.0 constraint violation and mass-balanced biomass synthesis',
      badge: 'Metabolic Autopoiesis',
    },
    {
      id: 4,
      title: 'Regime IV: Eukaryogenesis & rFBA',
      timescale: '10⁶ s – 10¹¹ s',
      scale: 'Cellular Compartments',
      desc: 'Syntrophic hydrogen pull gating (ΔG < -15 kJ/mol), tri-compartment block-angular chimeric stoichiometric merger, Nick Lane bioenergetic expansion (400x ATP/gene), and non-linear Hill-GRN RK4 regulation.',
      invariant: 'Organellar DNA translocation strictly conserving base-pair biogenic stoichiometry',
      badge: 'Endosymbiotic Leap',
    },
    {
      id: 5,
      title: 'Regime V: Multicellularity & DEB',
      timescale: '10⁷ s – 10¹³ s',
      scale: 'Tissue Aggregates to Organisms',
      desc: 'Richard Michod germ-soma convexity criterion, 3D Graph-Laplacian Turing activator-inhibitor reaction-diffusion, Malcolm Steinberg Differential Adhesion Hypothesis (DAH) cell sorting, and Kooijman DEB kappa-rule.',
      invariant: 'Integer conservation between ingested food, structure, reserve, and excreted metabolites',
      badge: 'Morphogenesis & Individuality',
    },
    {
      id: 6,
      title: 'Regime VI: Macroevolution & tskit',
      timescale: '10¹¹ s – 10¹⁴ s',
      scale: 'Planetary Biosphere',
      desc: 'Developmental genotype-phenotype Jacobian J_{G→P}, Russell Lande quantitative genetics Δz̄ = G β, H. Allen Orr snowball effect quadratic BDMI speciation, and Jerome Kelleher O(N + M log M) tskit tree sequences.',
      invariant: 'Coupled biosphere-lithosphere atomic ledger guaranteeing 0.0 drift over geological epochs',
      badge: 'Deep-Time Macroevolution',
    },
  ];

  const mcpTools = [
    { name: 'evochronos_step', params: 'steps: int, dt: float', desc: 'Advances simulation epochs and verifies atomic conservation ledger.' },
    { name: 'evochronos_get_ledger', params: '(none)', desc: 'Inspects all 7 elements across living and abiotic reservoirs (0 drift).' },
    { name: 'evochronos_promote_regime', params: 'target_regime: int (1–6)', desc: 'Executes coarse-grained bridge operators across biological regimes.' },
    { name: 'evochronos_load_metabolic_model', params: 'model_type: str, model_json: str', desc: 'Parses SBML/BiGG networks and verifies stoichiometric atom balance.' },
    { name: 'evochronos_run_benchmark', params: 'benchmark_name: str', desc: 'Executes Hardy-Weinberg, Kimura, Monod, Eigen, or WBE allometry tests.' },
    { name: 'evochronos_fetch_sequence', params: 'accession: str, seq_type: str', desc: 'Retrieves sequences and computes exact biogenic stoichiometry [C,H,O,N,P,S,Fe].' },
    { name: 'evochronos_render_structure', params: 'complex_type: str', desc: 'Builds 3D PDB coordinates for [4Fe-4S] cubane, ribozyme triad, or ATP synthase c-ring.' },
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#090d16] text-slate-100">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-[#0c1220]/90 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
            <Atom className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="font-bold tracking-wider text-base">EVOCHRONOS</span>
            <span className="text-slate-500 text-xs ml-2 font-mono">v0.1.0</span>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400 font-medium">
          <a href="#regimes" className="hover:text-slate-200 transition-colors">Regimes</a>
          <a href="#calculators" className="hover:text-slate-200 transition-colors">Interactive Calculators</a>
          <a href="#mcp" className="hover:text-slate-200 transition-colors">MCP & Agents</a>
          <a href="#conservation" className="hover:text-slate-200 transition-colors">Conservation Invariant</a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-xs hover:bg-emerald-400 transition-all shadow-sm"
          >
            <span>Launch Workbench</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-20 max-w-6xl mx-auto flex flex-col items-center text-center gap-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono">
          <ShieldCheck className="w-4 h-4 animate-pulse" />
          <span>ZERO-DRIFT INTEGER MASS CONSERVATION LEDGER ACROSS 29 ORDERS OF MAGNITUDE</span>
        </div>

        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-50 max-w-4xl leading-tight">
          The Evolutionary Sandbox Spanning <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-sky-400">Prebiotic Chemistry to Macroevolution</span>
        </h1>

        <p className="text-lg md:text-xl text-slate-400 max-w-3xl leading-relaxed">
          EvoChronos unites the 6 canonical biological regimes into a single, physically grounded simulation engine.
          Accelerated by WebGPU integer stencils, Model Context Protocol (MCP) servers, autonomous in-simulation research agents, and exact biogenic stoichiometry.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-4">
          <a
            href="http://localhost:3000"
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 shadow-lg shadow-emerald-950/50 transition-all"
          >
            <span>Open WebGPU Scientific Workbench</span>
            <ArrowRight className="w-4 h-4" />
          </a>

          <a
            href="#calculators"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 text-slate-200 font-semibold text-sm hover:bg-slate-700 border border-slate-700 transition-all"
          >
            <Calculator className="w-4 h-4 text-sky-400" />
            <span>Interactive Calculators</span>
          </a>

          <a
            href="#mcp"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-slate-300 font-semibold text-sm hover:bg-slate-800 border border-slate-800 transition-all font-mono"
          >
            <Bot className="w-4 h-4 text-emerald-400" />
            <span>MCP Server & Agents</span>
          </a>
        </div>
      </section>

      {/* Conservation Ledger Live Showcase */}
      <section id="conservation" className="bg-[#0c1220] border-y border-slate-800 py-16 px-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-8">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider">Absolute Physical Guarantee</div>
              <h2 className="text-2xl font-bold text-slate-100 mt-1">Exact Integer Conservation Across 7 Biogenic Elements</h2>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono text-xs">
              <ShieldCheck className="w-4 h-4" />
              <span>∑ Living + Dissolved + Mineral + Atmosphere ≡ Initial Budget (0.0 Drift)</span>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-7 gap-3 font-mono">
            {[
              { el: 'C', name: 'Carbon', count: '100,000,000,000,000', color: 'border-emerald-500/40 text-emerald-400' },
              { el: 'H', name: 'Hydrogen', count: '200,000,000,000,000', color: 'border-sky-500/40 text-sky-400' },
              { el: 'O', name: 'Oxygen', count: '50,000,000,000,000', color: 'border-blue-500/40 text-blue-400' },
              { el: 'N', name: 'Nitrogen', count: '20,000,000,000,000', color: 'border-indigo-500/40 text-indigo-400' },
              { el: 'P', name: 'Phosphorus', count: '1,000,000,000,000', color: 'border-amber-500/40 text-amber-400' },
              { el: 'S', name: 'Sulfur', count: '500,000,000,000', color: 'border-yellow-500/40 text-yellow-400' },
              { el: 'Fe', name: 'Iron', count: '100,000,000,000', color: 'border-rose-500/40 text-rose-400' },
            ].map((e) => (
              <div key={e.el} className={`bg-slate-900/80 p-3.5 rounded-xl border ${e.color} flex flex-col gap-1`}>
                <span className="text-lg font-bold">{e.el}</span>
                <span className="text-[10px] text-slate-400 uppercase">{e.name}</span>
                <span className="text-xs text-slate-200 mt-1 truncate">{e.count}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6 Biological Regimes Showcase */}
      <section id="regimes" className="py-20 px-6 max-w-6xl mx-auto flex flex-col gap-12">
        <div className="text-center max-w-2xl mx-auto flex flex-col gap-3">
          <span className="text-emerald-400 font-mono text-xs uppercase tracking-wider font-semibold">Regime Taxonomy</span>
          <h2 className="text-3xl md:text-4xl font-extrabold text-slate-100">6 Continuous Scales of Emergence</h2>
          <p className="text-slate-400 text-sm">
            Bridging 29 orders of magnitude in time ($10^{-15}$ s to $10^{14}$ s) via formal mathematical bridge operators.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {regimes.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedRegime(r.id)}
              className={`p-6 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-4 ${
                selectedRegime === r.id
                  ? 'bg-slate-900/90 border-emerald-500/60 shadow-lg shadow-emerald-950/30'
                  : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {r.badge}
                  </span>
                  <span className="text-xs font-mono text-slate-500">{r.timescale}</span>
                </div>
                <h3 className="text-lg font-bold text-slate-100">{r.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p>
              </div>

              <div className="pt-3 border-t border-slate-800/80 text-[11px] font-mono text-emerald-400/90">
                <span className="text-slate-500 block text-[9px] uppercase">Conservation Invariant:</span>
                {r.invariant}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Interactive Biological Calculators Section */}
      <section id="calculators" className="bg-[#0b101d] border-t border-slate-800 py-20 px-6">
        <div className="max-w-5xl mx-auto flex flex-col gap-10">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
            <div>
              <span className="text-sky-400 font-mono text-xs font-semibold uppercase tracking-wider">Scientific Exploration</span>
              <h2 className="text-3xl font-extrabold text-slate-100 mt-1">Interactive Evolutionary & Biophysical Calculators</h2>
              <p className="text-slate-400 text-sm mt-1">
                Directly explore analytical theories from Regimes V and VI implemented inside EvoChronos.
              </p>
            </div>

            {/* Calculator Tab Switcher */}
            <div className="flex items-center gap-2 p-1 bg-slate-900 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveCalculator('bdmi')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCalculator === 'bdmi'
                    ? 'bg-sky-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                BDMI Speciation
              </button>
              <button
                onClick={() => setActiveCalculator('lande')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCalculator === 'lande'
                    ? 'bg-emerald-500 text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Lande G-Matrix
              </button>
              <button
                onClick={() => setActiveCalculator('turing')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeCalculator === 'turing'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Turing Morphogenesis
              </button>
            </div>
          </div>

          {/* Calculator Card */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-8 flex flex-col md:flex-row gap-8">
            {/* 1. BDMI Calculator */}
            {activeCalculator === 'bdmi' && (
              <>
                <div className="flex-1 flex flex-col gap-6">
                  <div>
                    <span className="text-xs font-mono text-sky-400 uppercase font-semibold">Orr 1995 Snowball Model</span>
                    <h3 className="text-xl font-bold text-slate-100 mt-0.5">Bateson-Dobzhansky-Muller Speciation Incompatibility</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      As two lineages diverge through $k$ genetic substitutions, the number of untested epistatic pairwise combinations grows quadratically ($k(k-1)/2$).
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300">Genetic Substitutions ($k$):</span>
                        <span className="text-sky-400 font-bold">{kSubstitutions} substitutions</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="50"
                        value={kSubstitutions}
                        onChange={(e) => setKSubstitutions(parseInt(e.target.value))}
                        className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300">Pairwise Incompatibility Rate ($p_{'{inc}'}$):</span>
                        <span className="text-sky-400 font-bold">{(pIncompatibility * 100).toFixed(2)}%</span>
                      </div>
                      <input
                        type="range"
                        min="0.001"
                        max="0.03"
                        step="0.001"
                        value={pIncompatibility}
                        onChange={(e) => setPIncompatibility(parseFloat(e.target.value))}
                        className="w-full accent-sky-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-80 bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between gap-4 font-mono">
                  <div className="flex flex-col gap-3">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Speciation Metrics</span>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-xs">
                      <span className="text-slate-400">Tested Pairs ($C_2^k$):</span>
                      <span className="text-slate-200 font-bold">{pairwiseCombinations}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-xs">
                      <span className="text-slate-400">Expected Incompatibilities:</span>
                      <span className="text-sky-400 font-bold">{expectedIncompatibilities.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-xs">
                      <span className="text-slate-400">Reproductive Isolation:</span>
                      <span className="text-emerald-400 font-bold">{(isolationProbability * 100).toFixed(1)}%</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/20 text-[11px] text-sky-300">
                    <span className="font-bold block">Snowball Dynamic:</span>
                    {isolationProbability > 0.95
                      ? 'Complete postzygotic isolation achieved. Distinct biological species.'
                      : isolationProbability > 0.4
                      ? 'Incipient speciation underway with significant hybrid inviability.'
                      : 'Free genetic exchange with minimal hybrid breakdown.'}
                  </div>
                </div>
              </>
            )}

            {/* 2. Lande Calculator */}
            {activeCalculator === 'lande' && (
              <>
                <div className="flex-1 flex flex-col gap-6">
                  <div>
                    <span className="text-xs font-mono text-emerald-400 uppercase font-semibold">Lande 1979 Quantitative Genetics</span>
                    <h3 className="text-xl font-bold text-slate-100 mt-0.5">Phenotypic Evolution Under Genetic Covariance (G-Matrix)</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      The multivariate evolutionary response is constrained along the genetic line of least resistance, deflecting adaptation from the directional selection gradient.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300">Selection on Trait 1 ($\beta_1$ - Body Mass):</span>
                        <span className="text-emerald-400 font-bold">{beta1.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="-1.0"
                        max="1.0"
                        step="0.05"
                        value={beta1}
                        onChange={(e) => setBeta1(parseFloat(e.target.value))}
                        className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300">Selection on Trait 2 ($\beta_2$ - Metabolic Rate):</span>
                        <span className="text-emerald-400 font-bold">{beta2.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="-1.0"
                        max="1.0"
                        step="0.05"
                        value={beta2}
                        onChange={(e) => setBeta2(parseFloat(e.target.value))}
                        className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300">Genetic Covariance ($G_{12}$):</span>
                        <span className="text-emerald-400 font-bold">{g12Covariance.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="-0.85"
                        max="0.85"
                        step="0.05"
                        value={g12Covariance}
                        onChange={(e) => setG12Covariance(parseFloat(e.target.value))}
                        className="w-full accent-emerald-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-80 bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between gap-4 font-mono">
                  <div className="flex flex-col gap-3">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Response Vector Δz̄</span>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-xs">
                      <span className="text-slate-400">Δz̄₁ (Trait 1 Response):</span>
                      <span className="text-emerald-400 font-bold">{dz1.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-xs">
                      <span className="text-slate-400">Δz̄₂ (Trait 2 Response):</span>
                      <span className="text-emerald-400 font-bold">{dz2.toFixed(3)}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-xs">
                      <span className="text-slate-400">Deflection Angle ($\theta$):</span>
                      <span className="text-amber-400 font-bold">{deflectionAngleDeg.toFixed(1)}°</span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-300">
                    <span className="font-bold block">Evolutionary Trajectory:</span>
                    {deflectionAngleDeg > 35
                      ? 'Strong genetic constraint: Evolution is forced away from optimal fitness gradient.'
                      : 'Selection and genetic architecture are well-aligned.'}
                  </div>
                </div>
              </>
            )}

            {/* 3. Turing Calculator */}
            {activeCalculator === 'turing' && (
              <>
                <div className="flex-1 flex flex-col gap-6">
                  <div>
                    <span className="text-xs font-mono text-indigo-400 uppercase font-semibold">Turing 1952 Morphogenesis</span>
                    <h3 className="text-xl font-bold text-slate-100 mt-0.5">Diffusion-Driven Instability & Pattern Emergence</h3>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                      Spatially homogeneous reaction kinetics become unstable when an inhibitor morphogen diffuses much faster than an activator ($D_v \gg D_u$), generating standing chemical waves.
                    </p>
                  </div>

                  <div className="flex flex-col gap-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300">Diffusion Ratio ($d = D_v / D_u$):</span>
                        <span className="text-indigo-400 font-bold">{diffusionRatio}x faster inhibitor</span>
                      </div>
                      <input
                        type="range"
                        min="2"
                        max="40"
                        value={diffusionRatio}
                        onChange={(e) => setDiffusionRatio(parseInt(e.target.value))}
                        className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1.5">
                        <span className="text-slate-300">Inhibitor Decay Rate ($b$):</span>
                        <span className="text-indigo-400 font-bold">{decayRate.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="2.5"
                        step="0.1"
                        value={decayRate}
                        onChange={(e) => setDecayRate(parseFloat(e.target.value))}
                        className="w-full accent-indigo-400 h-1.5 bg-slate-800 rounded-lg cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <div className="w-full md:w-80 bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between gap-4 font-mono">
                  <div className="flex flex-col gap-3">
                    <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">Turing Instability Analysis</span>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-xs">
                      <span className="text-slate-400">Diffusion Ratio ($d$):</span>
                      <span className="text-slate-200 font-bold">{diffusionRatio}</span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-xs">
                      <span className="text-slate-400">Turing Instability:</span>
                      <span className={isTuringUnstable ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                        {isTuringUnstable ? "STABLE BIFURCATION (YES)" : "NO PATTERN (HOMOGENEOUS)"}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 text-xs">
                      <span className="text-slate-400">Spatial Wavelength ($\lambda_c$):</span>
                      <span className="text-indigo-400 font-bold">
                        {isTuringUnstable ? `${characteristicWavelength.toFixed(1)} μm` : "N/A"}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-[11px] text-indigo-300">
                    <span className="font-bold block">Morphological Pattern:</span>
                    {isTuringUnstable
                      ? diffusionRatio > 25
                        ? 'Spot morphogenesis: Periodic discrete signaling centers (hair follicles / dermal denticles).'
                        : 'Labyrinthine / Stripe morphogenesis: Extended somite boundary waves.'
                      : 'Inhibitor diffusion insufficient: Flat, patternless tissue state.'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Model Context Protocol (MCP) & Autonomous Agents Section */}
      <section id="mcp" className="py-20 px-6 max-w-6xl mx-auto flex flex-col gap-12">
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
          <div className="flex flex-col gap-2">
            <span className="text-emerald-400 font-mono text-xs font-semibold uppercase tracking-wider">Phase 6 Architecture</span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-100">Model Context Protocol (MCP) & Autonomous Agents</h2>
            <p className="text-slate-400 text-sm max-w-2xl leading-relaxed">
              Exposing the complete multi-scale engine to AI agents (Claude Desktop, Antigravity, VS Code) via JSON-RPC 2.0.
              Includes autonomous in-simulation research agents executing parameter sweeps with zero mass drift.
            </p>
          </div>

          <button
            onClick={copyMcpCommand}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-xs font-mono text-slate-300 transition-all shadow-sm"
          >
            {copiedMcp ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>python3 mcp-server/evochronos_mcp.py --demo</span>
          </button>
        </div>

        {/* MCP Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
          {mcpTools.map((t) => (
            <div key={t.name} className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex flex-col justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                  <Terminal className="w-3.5 h-3.5" />
                  <span>{t.name}</span>
                </div>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">{t.params}</div>
                <p className="text-xs text-slate-300 mt-2 font-sans leading-relaxed">{t.desc}</p>
              </div>
              <div className="text-[10px] text-emerald-500/80 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Zero Atomic Drift Verified</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#070b12] py-12 px-6 text-slate-500 text-xs font-mono">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <span className="font-bold text-slate-300">EvoChronos Evolutionary Sandbox</span> © 2026. Released under MIT / Apache-2.0.
          </div>
          <div className="flex items-center gap-6">
            <a href="https://github.com/evochronos/evochronos" className="hover:text-slate-300">GitHub</a>
            <a href="http://localhost:3000" className="hover:text-slate-300">Workbench</a>
            <a href="#mcp" className="hover:text-slate-300">MCP Server</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

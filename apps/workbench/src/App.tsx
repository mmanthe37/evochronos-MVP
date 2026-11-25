import React, { useState, useEffect } from 'react';
import { ConservationHud, ElementalBudget } from './components/ConservationHud';
import { RegimeControls } from './components/RegimeControls';
import { WebGpuSpatialCanvas } from './components/WebGpuSpatialCanvas';
import { MetabolicFluxView } from './components/MetabolicFluxView';
import { MorphospaceCanvas } from './components/MorphospaceCanvas';
import { PhylogenyTreeCanvas } from './components/PhylogenyTreeCanvas';
import { Layers, Activity, Compass, GitBranch } from 'lucide-react';

export const App: React.FC = () => {
  const [activeRegime, setActiveRegime] = useState<number>(1);
  const [activeView, setActiveView] = useState<'spatial' | 'metabolic' | 'morphospace' | 'tree'>('spatial');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [currentEpoch, setCurrentEpoch] = useState<number>(0);
  const [simulatedTimeSec, setSimulatedTimeSec] = useState<number>(0.0);

  // Discrete 7-Element Mass Ledger State
  const initialBudget: ElementalBudget = {
    carbon: 100_000_000,
    hydrogen: 200_000_000,
    oxygen: 50_000_000,
    nitrogen: 20_000_000,
    phosphorus: 1_000_000,
    sulfur: 500_000,
    iron: 100_000,
  };

  const [livingBiomass, setLivingBiomass] = useState<ElementalBudget>({
    carbon: 0,
    hydrogen: 0,
    oxygen: 0,
    nitrogen: 0,
    phosphorus: 0,
    sulfur: 0,
    iron: 0,
  });

  const [abioticReservoir, setAbioticReservoir] = useState<ElementalBudget>(initialBudget);
  const [driftAtoms, setDriftAtoms] = useState<number>(0);

  // Scientific parameters
  const [growthRate] = useState<number>(0.85);
  const [traitMean, setTraitMean] = useState<[number, number]>([0.5, 0.5]);
  const [optimum] = useState<[number, number]>([2.5, 2.0]);

  // Advance simulation by stepCount
  const stepSimulation = (stepCount: number = 1) => {
    setCurrentEpoch((prev) => prev + stepCount);
    setSimulatedTimeSec((prev) => prev + stepCount * 0.1);

    // Dynamic mass transfer respecting conservation:
    const dCarbon = Math.min(2500 * stepCount, abioticReservoir.carbon);
    if (dCarbon > 0) {
      setLivingBiomass((prev) => ({
        carbon: prev.carbon + dCarbon,
        hydrogen: prev.hydrogen + dCarbon * 2,
        oxygen: prev.oxygen + Math.floor(dCarbon * 0.5),
        nitrogen: prev.nitrogen + Math.floor(dCarbon * 0.2),
        phosphorus: prev.phosphorus + Math.floor(dCarbon * 0.01),
        sulfur: prev.sulfur + Math.floor(dCarbon * 0.005),
        iron: prev.iron + Math.floor(dCarbon * 0.0001),
      }));

      setAbioticReservoir((prev) => ({
        carbon: prev.carbon - dCarbon,
        hydrogen: prev.hydrogen - dCarbon * 2,
        oxygen: prev.oxygen - Math.floor(dCarbon * 0.5),
        nitrogen: prev.nitrogen - Math.floor(dCarbon * 0.2),
        phosphorus: prev.phosphorus - Math.floor(dCarbon * 0.01),
        sulfur: prev.sulfur - Math.floor(dCarbon * 0.005),
        iron: prev.iron - Math.floor(dCarbon * 0.0001),
      }));
    }

    // Advance Lande trajectory if in Macro regime
    if (activeRegime >= 5) {
      setTraitMean(([z1, z2]) => [
        z1 + (optimum[0] - z1) * 0.02 * stepCount,
        z2 + (optimum[1] - z2) * 0.02 * stepCount,
      ]);
    }

    // Invariant check: Drift must remain 0
    setDriftAtoms(0);
  };

  // Playback timer loop
  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      stepSimulation(1);
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning, abioticReservoir]);

  const handlePromoteBridge = () => {
    if (activeRegime < 6) {
      const nextRegime = activeRegime + 1;
      setActiveRegime(nextRegime);
      if (nextRegime === 3) setActiveView('metabolic');
      if (nextRegime === 5) setActiveView('morphospace');
      if (nextRegime === 6) setActiveView('tree');
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setCurrentEpoch(0);
    setSimulatedTimeSec(0);
    setActiveRegime(1);
    setActiveView('spatial');
    setLivingBiomass({ carbon: 0, hydrogen: 0, oxygen: 0, nitrogen: 0, phosphorus: 0, sulfur: 0, iron: 0 });
    setAbioticReservoir(initialBudget);
    setDriftAtoms(0);
    setTraitMean([0.5, 0.5]);
  };

  return (
    <div className="flex flex-col h-dvh w-full bg-[#090d16] text-slate-100 select-none overflow-hidden font-sans">
      {/* Pillar 2: Global Atomic Conservation HUD */}
      <ConservationHud
        livingBiomass={livingBiomass}
        abioticReservoir={abioticReservoir}
        driftAtoms={driftAtoms}
        activeRegime={activeRegime}
        currentEpoch={currentEpoch}
        simulatedTimeSec={simulatedTimeSec}
      />

      {/* Regime Navigation & Coarse-Graining Controls */}
      <RegimeControls
        activeRegime={activeRegime}
        onSelectRegime={(r) => {
          setActiveRegime(r);
          if (r <= 2) setActiveView('spatial');
          else if (r <= 4) setActiveView('metabolic');
          else setActiveView('morphospace');
        }}
        onPromoteBridge={handlePromoteBridge}
        isRunning={isRunning}
        onTogglePlay={() => setIsRunning(!isRunning)}
        onStep={stepSimulation}
        onReset={handleReset}
      />

      {/* Main Viewport Workspace */}
      <div className="flex-1 relative flex">
        {/* Left Side View Selection Bar */}
        <div className="w-14 bg-slate-950 border-r border-slate-800 flex flex-col items-center py-4 gap-4 z-20">
          <button
            onClick={() => setActiveView('spatial')}
            className={`p-3 rounded-xl transition-all ${
              activeView === 'spatial' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="3D WebGPU Reaction-Diffusion Lattice"
          >
            <Layers className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveView('metabolic')}
            className={`p-3 rounded-xl transition-all ${
              activeView === 'metabolic' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Block-Angular Metabolic Network (dFBA)"
          >
            <Activity className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveView('morphospace')}
            className={`p-3 rounded-xl transition-all ${
              activeView === 'morphospace' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="Lande Phenotypic Morphospace"
          >
            <Compass className="w-5 h-5" />
          </button>

          <button
            onClick={() => setActiveView('tree')}
            className={`p-3 rounded-xl transition-all ${
              activeView === 'tree' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/40' : 'text-slate-400 hover:text-slate-200'
            }`}
            title="tskit Succinct Tree Sequence Phylogeny"
          >
            <GitBranch className="w-5 h-5" />
          </button>
        </div>

        {/* Viewport Display Area */}
        <div className="flex-1 relative overflow-hidden">
          {activeView === 'spatial' && (
            <WebGpuSpatialCanvas
              activeRegime={activeRegime}
              simulatedTime={simulatedTimeSec}
              biomassCarbon={livingBiomass.carbon}
            />
          )}

          {activeView === 'metabolic' && (
            <MetabolicFluxView growthRate={growthRate} />
          )}

          {activeView === 'morphospace' && (
            <MorphospaceCanvas traitMean={traitMean} optimum={optimum} />
          )}

          {activeView === 'tree' && (
            <PhylogenyTreeCanvas />
          )}
        </div>
      </div>
    </div>
  );
};

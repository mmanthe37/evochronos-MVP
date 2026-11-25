import React, { useEffect, useState } from 'react';
import { clonePools } from './engine/conservation';
import { SCENARIO_PRESETS } from './engine/presets';
import {
  createInitialState,
  injectAdversarialDrift,
  stepSimulation,
  stepSimulationBatch,
} from './engine/simulation';
import {
  loadBundleFromLocalStorage,
  ONBOARDING_KEY,
  saveBundleToLocalStorage,
  STORAGE_KEY,
} from './engine/storage';
import { ExperimentBranch, ScenarioParameters } from './engine/types';
import { ActiveTab, GlobalHud } from './components/GlobalHud';
import { WorkbenchView } from './components/WorkbenchView';
import { ScenarioSetupView } from './components/ScenarioSetupView';
import { CounterfactualDagView } from './components/CounterfactualDagView';
import { EpistemicInspectorView } from './components/EpistemicInspectorView';
import { ForkModal } from './components/ForkModal';
import { WelcomeModal } from './components/WelcomeModal';

function createControlBranch(presetId: string, params: ScenarioParameters): ExperimentBranch {
  return {
    id: `branch-${params.seed}-control`,
    name: 'Control',
    parentId: null,
    forkTick: null,
    perturbationSummary: 'Baseline scenario',
    createdAt: new Date().toISOString(),
    presetId,
    parameters: { ...params },
    state: createInitialState(params),
  };
}

function shouldShowOnboardingInitially(): boolean {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('autostart') === '1') return false;
  try {
    return window.localStorage.getItem(ONBOARDING_KEY) !== '1';
  } catch {
    return true;
  }
}

export const App: React.FC = () => {
  const [initialData] = useState(() => {
    const saved = loadBundleFromLocalStorage();
    if (saved && saved.branches.length > 0) {
      return saved;
    }
    const defaultPreset = SCENARIO_PRESETS[0];
    const control = createControlBranch(defaultPreset.id, defaultPreset.parameters);
    return { branches: [control], activeBranchId: control.id };
  });

  const [branches, setBranches] = useState<ExperimentBranch[]>(initialData.branches);
  const [activeBranchId, setActiveBranchId] = useState<string>(initialData.activeBranchId);
  const [activeTab, setActiveTab] = useState<ActiveTab>('workbench');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [magnification, setMagnification] = useState<number>(1);
  const [forkModalOpen, setForkModalOpen] = useState<boolean>(false);
  const [onboardingOpen, setOnboardingOpen] = useState<boolean>(() => shouldShowOnboardingInitially());
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const activeBranch =
    branches.find((b) => b.id === activeBranchId) ?? branches[0];

  // Auto-persist experiment DAG to LocalStorage
  useEffect(() => {
    const ok = saveBundleToLocalStorage(branches, activeBranch.id);
    if (ok) {
      setLastSavedAt(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    }
  }, [branches, activeBranch.id]);

  // Stop playback automatically if an invariant violation occurs
  useEffect(() => {
    if (isRunning && activeBranch.state.invariantViolated) {
      setIsRunning(false);
    }
  }, [isRunning, activeBranch.state.invariantViolated]);

  // Deterministic playback interval
  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setBranches((prev) =>
        prev.map((b) =>
          b.id === activeBranchId
            ? { ...b, state: stepSimulation(b.state, b.parameters, magnification) }
            : b
        )
      );
    }, 180);
    return () => window.clearInterval(timer);
  }, [isRunning, activeBranchId, magnification]);

  const dismissOnboarding = (targetTab: ActiveTab) => {
    setOnboardingOpen(false);
    setActiveTab(targetTab);
    try {
      window.localStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      // Ignore storage quota errors
    }
  };

  const handleStep = (steps: number) => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === activeBranch.id
          ? { ...b, state: stepSimulationBatch(b.state, b.parameters, steps, magnification) }
          : b
      )
    );
  };

  const handleResetActiveBranch = () => {
    setIsRunning(false);
    setBranches((prev) =>
      prev.map((b) =>
        b.id === activeBranch.id
          ? { ...b, state: createInitialState(b.parameters) }
          : b
      )
    );
  };

  const handleToggleAutoPromote = () => {
    setBranches((prev) =>
      prev.map((b) =>
        b.id === activeBranch.id
          ? {
              ...b,
              parameters: {
                ...b.parameters,
                autoPromoteRegimes: !b.parameters.autoPromoteRegimes,
              },
            }
          : b
      )
    );
  };

  const handleTriggerAdversarialDriftTest = () => {
    setIsRunning(false);
    setBranches((prev) =>
      prev.map((b) =>
        b.id === activeBranch.id
          ? { ...b, state: injectAdversarialDrift(b.state) }
          : b
      )
    );
  };

  const handleLaunchScenario = (
    presetId: string,
    params: ScenarioParameters,
    recommendedMag: number,
    autoRun: boolean
  ) => {
    setIsRunning(false);
    const control = createControlBranch(presetId, params);
    setBranches([control]);
    setActiveBranchId(control.id);
    setMagnification(recommendedMag);
    setActiveTab('workbench');
    if (autoRun) {
      setIsRunning(true);
    }
  };

  const handleConfirmFork = (
    branchName: string,
    perturbedParams: ScenarioParameters,
    perturbationSummary: string
  ) => {
    setIsRunning(false);
    const parent = activeBranch;
    const forkId = `branch-${Date.now()}-${branches.length + 1}`;
    const forkedState = {
      ...parent.state,
      pools: clonePools(parent.state.pools),
      species: { ...parent.state.species },
      traitMean: [...parent.state.traitMean] as [number, number],
      traitOptimum: [...parent.state.traitOptimum] as [number, number],
      history: parent.state.history.map((pt) => ({
        ...pt,
        traitMean: [...pt.traitMean] as [number, number],
      })),
      events: [
        ...parent.state.events,
        {
          tick: parent.state.tick,
          timeSec: parent.state.timeSec,
          regime: parent.state.regime,
          kind: 'fork' as const,
          summary: `Forked from ${parent.name} at tick ${parent.state.tick}: ${perturbationSummary}`,
        },
      ],
    };

    const newBranch: ExperimentBranch = {
      id: forkId,
      name: branchName,
      parentId: parent.id,
      forkTick: parent.state.tick,
      perturbationSummary,
      createdAt: new Date().toISOString(),
      presetId: parent.presetId,
      parameters: { ...perturbedParams },
      state: forkedState,
    };

    setBranches((prev) => [...prev, newBranch]);
    setActiveBranchId(forkId);
    setForkModalOpen(false);
    setActiveTab('workbench');
  };

  const handleImportBundle = (restoredBranches: ExperimentBranch[], restoredActiveId: string) => {
    setIsRunning(false);
    setBranches(restoredBranches);
    setActiveBranchId(restoredActiveId);
  };

  const handleClearSaved = () => {
    setIsRunning(false);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    const defaultPreset = SCENARIO_PRESETS[0];
    const fresh = createControlBranch(defaultPreset.id, defaultPreset.parameters);
    setBranches([fresh]);
    setActiveBranchId(fresh.id);
    setMagnification(1);
  };

  return (
    <div
      className="flex flex-col h-dvh w-full bg-[#080B12] text-slate-100 font-sans overflow-hidden"
      data-active-tab={activeTab}
      data-active-regime={activeBranch.state.regime}
      data-branch-count={branches.length}
    >
      <GlobalHud
        activeTab={activeTab}
        onSelectTab={(tab) => {
          if (tab !== 'workbench') setIsRunning(false);
          setActiveTab(tab);
        }}
        activeBranch={activeBranch}
        magnification={magnification}
        onChangeMagnification={setMagnification}
        onOpenForkModal={() => {
          setIsRunning(false);
          setForkModalOpen(true);
        }}
        onOpenOnboarding={() => setOnboardingOpen(true)}
        onResetBranch={handleResetActiveBranch}
      />

      {activeTab === 'workbench' && (
        <WorkbenchView
          branch={activeBranch}
          isRunning={isRunning}
          magnification={magnification}
          onToggleRun={() => setIsRunning((r) => !r)}
          onStep={handleStep}
          onReset={handleResetActiveBranch}
          onOpenFork={() => {
            setIsRunning(false);
            setForkModalOpen(true);
          }}
          onToggleAutoPromote={handleToggleAutoPromote}
          onTriggerAdversarialDriftTest={handleTriggerAdversarialDriftTest}
        />
      )}

      {activeTab === 'setup' && (
        <ScenarioSetupView
          currentPresetId={activeBranch.presetId}
          currentParameters={activeBranch.parameters}
          onLaunchScenario={handleLaunchScenario}
        />
      )}

      {activeTab === 'dag' && (
        <CounterfactualDagView
          branches={branches}
          activeBranchId={activeBranch.id}
          onSelectBranch={(id) => {
            setIsRunning(false);
            setActiveBranchId(id);
          }}
          onOpenForkModal={() => {
            setIsRunning(false);
            setForkModalOpen(true);
          }}
          onImportBundle={handleImportBundle}
          onClearSaved={handleClearSaved}
          lastSavedAt={lastSavedAt}
        />
      )}

      {activeTab === 'epistemic' && (
        <EpistemicInspectorView activeBranch={activeBranch} />
      )}

      {forkModalOpen && (
        <ForkModal
          parentBranch={activeBranch}
          nextBranchIndex={branches.length}
          onClose={() => setForkModalOpen(false)}
          onConfirmFork={handleConfirmFork}
        />
      )}

      {onboardingOpen && (
        <WelcomeModal
          onEnterWorkbench={() => dismissOnboarding('workbench')}
          onExplorePresets={() => dismissOnboarding('setup')}
        />
      )}
    </div>
  );
};

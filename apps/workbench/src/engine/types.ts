export type ElementSymbol = 'C' | 'H' | 'O' | 'N' | 'P' | 'S' | 'Fe';

export const ELEMENTS: readonly ElementSymbol[] = ['C', 'H', 'O', 'N', 'P', 'S', 'Fe'] as const;

export type ElementalVector = Record<ElementSymbol, bigint>;

export type PoolName = 'abiotic' | 'biomass' | 'detritus' | 'atmosphere';

export const POOL_NAMES: readonly PoolName[] = [
  'abiotic',
  'biomass',
  'detritus',
  'atmosphere',
] as const;

export type ElementalPools = Record<PoolName, ElementalVector>;

export type EpistemicTier =
  | 'FACT'
  | 'ASSUMPTION'
  | 'ESTIMATE'
  | 'INTERPRETATION'
  | 'UNCERTAINTY';

export type RegimeId = 1 | 2 | 3 | 4 | 5 | 6;

export type EnvironmentMode = 'alkaline_vent' | 'wet_dry_cycling';

export interface ScenarioParameters {
  seed: number;
  environmentMode: EnvironmentMode;
  temperatureK: number;
  resourceInfluxRate: number;
  mutationRate: number;
  polymerLength: number;
  selectiveAdvantage: number;
  monodKm: number;
  syntrophyDeltaG: number;
  turingDiffusionRatio: number;
  landeG12: number;
  landeBeta1: number;
  landeBeta2: number;
  bdmiRate: number;
  initialRegime: RegimeId;
  autoPromoteRegimes: boolean;
}

export interface BridgeGateStatus {
  id: string;
  fromRegime: RegimeId;
  toRegime: RegimeId;
  name: string;
  criterionSummary: string;
  metricLabel: string;
  currentDisplay: string;
  thresholdDisplay: string;
  progress: number; // 0 to 1
  met: boolean;
  epistemicTier: EpistemicTier;
}

export interface TelemetryPoint {
  tick: number;
  timeSec: number;
  regime: RegimeId;
  entropyProduction: number;
  gibbsFreeEnergyKJ: number;
  rafClosureRatio: number;
  eigenMargin: number;
  masterSequenceFraction: number;
  biodiversity: number;
  biomassCarbon: number;
  abioticCarbon: number;
  detritusCarbon: number;
  atmosphereCarbon: number;
  projectiveMagnification: number;
  stepRejected: boolean;
  traitMean: [number, number];
  speciationProb: number;
}

export interface SimulationEvent {
  tick: number;
  timeSec: number;
  regime: RegimeId;
  kind: 'gate' | 'rejection' | 'fork' | 'violation' | 'catastrophe';
  summary: string;
}

export interface SpeciesInventory {
  formate: number;
  acetate: number;
  pyruvate: number;
  monomer: number;
  lipid: number;
  catalyst: number;
  oligoRna: number;
}

export interface SimulationState {
  tick: number;
  timeSec: number;
  regime: RegimeId;
  prngCounter: number;
  pools: ElementalPools;
  initialTotal: ElementalVector;
  drift: ElementalVector;
  invariantViolated: boolean;
  violationMessage: string | null;
  species: SpeciesInventory;
  vesicleCount: number;
  masterSequenceFraction: number;
  eigenMargin: number;
  prokaryoteGrowthRate: number;
  atpPerGene: number;
  turingPatternEnergy: number;
  turingWavelengthUm: number;
  michodConvexity: number;
  cladeCount: number;
  traitMean: [number, number];
  traitOptimum: [number, number];
  landeDeflectionDeg: number;
  substitutionsK: number;
  speciationProb: number;
  entropyProduction: number;
  gibbsFreeEnergyKJ: number;
  rafClosureRatio: number;
  projectiveStepRejections: number;
  lastStepRejected: boolean;
  lastRejectionReason: string | null;
  effectiveMagnification: number;
  gates: BridgeGateStatus[];
  history: TelemetryPoint[];
  events: SimulationEvent[];
}

export interface ExperimentBranch {
  id: string;
  name: string;
  parentId: string | null;
  forkTick: number | null;
  perturbationSummary: string;
  createdAt: string;
  presetId: string;
  parameters: ScenarioParameters;
  state: SimulationState;
}

export interface SerializedElementalVector {
  C: string;
  H: string;
  O: string;
  N: string;
  P: string;
  S: string;
  Fe: string;
}

export interface SerializedElementalPools {
  abiotic: SerializedElementalVector;
  biomass: SerializedElementalVector;
  detritus: SerializedElementalVector;
  atmosphere: SerializedElementalVector;
}

export interface ExperimentBundle {
  schemaVersion: 'evochronos-bundle-v1';
  modelVersion: '0.2.0';
  exportedAt: string;
  activeBranchId: string;
  branches: Array<
    Omit<ExperimentBranch, 'state'> & {
      state: Omit<SimulationState, 'pools' | 'initialTotal' | 'drift'> & {
        pools: SerializedElementalPools;
        initialTotal: SerializedElementalVector;
        drift: SerializedElementalVector;
      };
    }
  >;
}

export interface ParameterSpec {
  key: keyof ScenarioParameters;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  epistemicTier: EpistemicTier;
  tooltip: string;
  regimeScope: string;
}

export interface ScenarioPreset {
  id: string;
  name: string;
  tagline: string;
  description: string;
  primaryAssumption: string;
  epistemicFocus: EpistemicTier;
  parameters: ScenarioParameters;
  recommendedMagnification: number;
  recommendedForkHint: string;
}

export interface RegimeEvidenceDoc {
  regime: RegimeId;
  title: string;
  timescale: string;
  summary: string;
  equations: Array<{
    name: string;
    formula: string;
    epistemicTier: EpistemicTier;
    notes: string;
  }>;
  canClaim: string[];
  cannotClaim: string[];
}

import {
  clonePools,
  createDefaultInitialPools,
  sumPools,
  transferStoichiometricUnits,
  verifyConservation,
} from './conservation';
import { createCounterRng } from './prng';
import {
  BridgeGateStatus,
  ElementalPools,
  ElementalVector,
  RegimeId,
  ScenarioParameters,
  SimulationEvent,
  SimulationState,
  SpeciesInventory,
  TelemetryPoint,
} from './types';

const R_GAS_KJ = 0.008314462618; // kJ / (mol * K)
const MAX_HISTORY_POINTS = 260;

// Exact integer stoichiometries (per reaction unit in atoms of C, H, O, N, P, S, Fe)
const STOICH_FORMATE: ElementalVector = { C: 1n, H: 2n, O: 2n, N: 0n, P: 0n, S: 0n, Fe: 0n };
const STOICH_PYRUVATE: ElementalVector = { C: 3n, H: 4n, O: 3n, N: 0n, P: 0n, S: 0n, Fe: 0n };
const STOICH_MONOMER: ElementalVector = { C: 6n, H: 10n, O: 4n, N: 2n, P: 1n, S: 0n, Fe: 0n };
const STOICH_CATALYST: ElementalVector = { C: 18n, H: 28n, O: 10n, N: 6n, P: 2n, S: 2n, Fe: 1n };
const STOICH_LIPID: ElementalVector = { C: 14n, H: 28n, O: 2n, N: 0n, P: 1n, S: 0n, Fe: 0n };
const STOICH_BIOMASS_UNIT: ElementalVector = { C: 24n, H: 44n, O: 14n, N: 6n, P: 1n, S: 1n, Fe: 0n };
const STOICH_RESPIRATION: ElementalVector = { C: 6n, H: 12n, O: 6n, N: 0n, P: 0n, S: 0n, Fe: 0n };
const STOICH_DETRITUS_RECYCLE: ElementalVector = { C: 12n, H: 22n, O: 7n, N: 3n, P: 1n, S: 1n, Fe: 0n };

export function computeEigenMetrics(params: ScenarioParameters): {
  lMax: number;
  margin: number;
  isStable: boolean;
} {
  const err = Math.max(1e-6, params.mutationRate);
  const sigma = Math.max(1.05, params.selectiveAdvantage);
  const lMax = Math.log(sigma) / err;
  const margin = lMax / Math.max(1, params.polymerLength);
  return {
    lMax,
    margin,
    isStable: margin >= 1.0,
  };
}

export function computeTuringMetrics(diffusionRatio: number): {
  isUnstable: boolean;
  wavelengthUm: number;
  patternStrength: number;
} {
  // Canonical activator-inhibitor Jacobian near homogeneous steady state
  const fu = 0.6;
  const fv = -0.85;
  const gu = 0.55;
  const gv = -1.15;
  const detJ = fu * gv - fv * gu; // positive (~ -0.69 + 0.4675? Wait: (-0.85)*(0.55) = -0.4675 -> detJ = -0.69 - (-0.4675) = -0.2225, let's ensure positive detJ!)
  // Use standard stable Schnakenberg/Gierer-Meinhardt Jacobian: fu > 0, gv < 0, fu+gv < 0, detJ = fu*gv - fv*gu > 0
  const aFu = 0.55;
  const aFv = -0.95;
  const aGu = 0.75;
  const aGv = -1.1;
  const aDetJ = aFu * aGv - aFv * aGu; // -0.605 + 0.7125 = +0.1075 > 0
  const lhs = diffusionRatio * aFu + aGv;
  const rhs = 2.0 * Math.sqrt(Math.max(1e-6, diffusionRatio * aDetJ));
  const excess = lhs - rhs;
  const isUnstable = diffusionRatio > 1 && excess > 0;
  const wavelengthUm = isUnstable
    ? 2.0 * Math.PI * Math.pow(diffusionRatio / Math.max(0.05, aDetJ), 0.25)
    : 0;
  const patternStrength = isUnstable ? Math.min(1.0, excess / (rhs + 3.0)) : 0;
  void detJ;
  return { isUnstable, wavelengthUm, patternStrength };
}

export function computeLandeResponse(
  g12: number,
  beta1: number,
  beta2: number
): {
  dz1: number;
  dz2: number;
  deflectionDeg: number;
} {
  const dz1 = 1.0 * beta1 + g12 * beta2;
  const dz2 = g12 * beta1 + 1.0 * beta2;
  const normB = Math.hypot(beta1, beta2);
  const normDz = Math.hypot(dz1, dz2);
  if (normB < 1e-8 || normDz < 1e-8) {
    return { dz1, dz2, deflectionDeg: 0 };
  }
  const cosTheta = Math.max(-1, Math.min(1, (beta1 * dz1 + beta2 * dz2) / (normB * normDz)));
  const deflectionDeg = (Math.acos(cosTheta) * 180) / Math.PI;
  return { dz1, dz2, deflectionDeg };
}

export function computeOrrSpeciationProb(kSubstitutions: number, pInc: number): number {
  const k = Math.max(0, Math.floor(kSubstitutions));
  const pairs = (k * (k - 1)) / 2;
  if (pairs === 0) return 0;
  return 1.0 - Math.pow(1.0 - Math.max(0, Math.min(0.99, pInc)), pairs);
}

export function evaluateBridgeGates(
  state: Omit<SimulationState, 'gates'>,
  params: ScenarioParameters
): BridgeGateStatus[] {
  const biomassC = Number(state.pools.biomass.C);

  // Gate 1 -> 2: Prebiotic RAF Closure + Lipid Encapsulation + Exergonic drive
  const rafProg = Math.min(1, state.rafClosureRatio / 0.72);
  const lipidProg = Math.min(1, state.species.lipid / 16);
  const thermoOk = state.gibbsFreeEnergyKJ <= -6.0;
  const gate12Progress = Math.min(1, rafProg * 0.55 + lipidProg * 0.35 + (thermoOk ? 0.1 : 0));
  const gate12Met = state.rafClosureRatio >= 0.72 && state.species.lipid >= 16 && thermoOk;

  // Gate 2 -> 3: Eigen Error Threshold Stability + Vesicle Synchrony
  const eigenOk = state.eigenMargin >= 1.15;
  const masterProg = Math.min(1, state.masterSequenceFraction / 0.52);
  const vesicleProg = Math.min(1, state.vesicleCount / 14);
  const gate23Progress = Math.min(
    1,
    (eigenOk ? Math.min(1, state.eigenMargin / 1.15) * 0.4 : (state.eigenMargin / 1.15) * 0.4) +
      masterProg * 0.35 +
      vesicleProg * 0.25
  );
  const gate23Met = eigenOk && state.masterSequenceFraction >= 0.52 && state.vesicleCount >= 14;

  // Gate 3 -> 4: Syntrophic H2 Pull (Delta G < -15 kJ/mol) + Prokaryote Biomass Threshold
  const synDrive = Math.max(0, (-params.syntrophyDeltaG - 5) / 10); // reaches 1.0 at -15 kJ/mol
  const bio34Prog = Math.min(1, biomassC / 140000);
  const gate34Progress = Math.min(1, Math.min(1, synDrive) * 0.55 + bio34Prog * 0.45);
  const gate34Met = params.syntrophyDeltaG <= -15.0 && biomassC >= 140000 && state.prokaryoteGrowthRate > 0.12;

  // Gate 4 -> 5: Eukaryotic Bioenergetic Headroom (ATP/gene >= 220x) + Clade Complexity
  const atpProg = Math.min(1, state.atpPerGene / 220);
  const bio45Prog = Math.min(1, biomassC / 320000);
  const gate45Progress = Math.min(1, atpProg * 0.6 + bio45Prog * 0.4);
  const gate45Met = state.atpPerGene >= 220 && biomassC >= 320000;

  // Gate 5 -> 6: Turing Pattern Instability + Michod Germ-Soma Convexity >= 1.25
  const turingProg = Math.min(1, state.turingPatternEnergy / 0.35);
  const michodProg = Math.min(1, Math.max(0, (state.michodConvexity - 0.9) / 0.35));
  const gate56Progress = Math.min(1, turingProg * 0.5 + michodProg * 0.5);
  const gate56Met = state.turingPatternEnergy >= 0.35 && state.michodConvexity >= 1.25;

  return [
    {
      id: 'gate-1-2',
      fromRegime: 1,
      toRegime: 2,
      name: 'B_I->II: RAF Closure & Vesicle Encapsulation',
      criterionSummary: 'RAF >= 0.72, Lipids >= 16, Delta G <= -6 kJ/mol',
      metricLabel: 'RAF Closure',
      currentDisplay: `${(state.rafClosureRatio * 100).toFixed(0)}% · ${state.species.lipid} lipids`,
      thresholdDisplay: '72% · 16 lipids',
      progress: gate12Progress,
      met: gate12Met,
      epistemicTier: 'INTERPRETATION',
    },
    {
      id: 'gate-2-3',
      fromRegime: 2,
      toRegime: 3,
      name: 'B_II->III: Eigen Stability & Autopoietic Closure',
      criterionSummary: 'L_max/L >= 1.15, Master Seq >= 52%, Vesicles >= 14',
      metricLabel: 'Eigen Margin',
      currentDisplay: `${state.eigenMargin.toFixed(2)}x · ${(state.masterSequenceFraction * 100).toFixed(0)}%`,
      thresholdDisplay: '1.15x · 52%',
      progress: gate23Progress,
      met: gate23Met,
      epistemicTier: 'INTERPRETATION',
    },
    {
      id: 'gate-3-4',
      fromRegime: 3,
      toRegime: 4,
      name: 'B_III->IV: Syntrophic H2 Pull Endosymbiosis',
      criterionSummary: 'Delta G_syn <= -15 kJ/mol, Biomass C >= 140k',
      metricLabel: 'Syntrophic Pull',
      currentDisplay: `${params.syntrophyDeltaG.toFixed(1)} kJ/mol · ${(biomassC / 1000).toFixed(0)}k C`,
      thresholdDisplay: '-15.0 kJ/mol · 140k C',
      progress: gate34Progress,
      met: gate34Met,
      epistemicTier: 'INTERPRETATION',
    },
    {
      id: 'gate-4-5',
      fromRegime: 4,
      toRegime: 5,
      name: 'B_IV->V: Bioenergetic Multicellular Transition',
      criterionSummary: 'ATP/Gene >= 220x, Biomass C >= 320k',
      metricLabel: 'ATP / Gene',
      currentDisplay: `${state.atpPerGene.toFixed(0)}x · ${(biomassC / 1000).toFixed(0)}k C`,
      thresholdDisplay: '220x · 320k C',
      progress: gate45Progress,
      met: gate45Met,
      epistemicTier: 'INTERPRETATION',
    },
    {
      id: 'gate-5-6',
      fromRegime: 5,
      toRegime: 6,
      name: 'B_V->VI: Michod Convexity & Macroevolution',
      criterionSummary: 'Turing Energy >= 0.35, Michod Synergy >= 1.25x',
      metricLabel: 'Michod Synergy',
      currentDisplay: `${state.michodConvexity.toFixed(2)}x · E=${state.turingPatternEnergy.toFixed(2)}`,
      thresholdDisplay: '1.25x · E=0.35',
      progress: gate56Progress,
      met: gate56Met,
      epistemicTier: 'INTERPRETATION',
    },
  ];
}

export function createInitialState(
  params: ScenarioParameters,
  customPools?: ElementalPools
): SimulationState {
  const pools = customPools ? clonePools(customPools) : createDefaultInitialPools();
  const initialTotal = sumPools(pools);

  // If starting at a higher regime preset, transfer a physically balanced seed biomass
  // strictly from abiotic -> biomass so initialTotal stays identically constant (0 drift).
  const startRegime = params.initialRegime;
  const species: SpeciesInventory = {
    formate: 6,
    acetate: 3,
    pyruvate: 2,
    monomer: 2,
    lipid: 2,
    catalyst: 1,
    oligoRna: 1,
  };

  let vesicleCount = 0;
  let masterSequenceFraction = 0.0;
  let prokaryoteGrowthRate = 0.0;
  let atpPerGene = 1.0;
  let turingPatternEnergy = 0.0;
  let turingWavelengthUm = 0.0;
  let michodConvexity = 1.0;
  let cladeCount = 1;
  let rafClosureRatio = 0.14;
  let gibbsFreeEnergyKJ = params.environmentMode === 'alkaline_vent' ? -18.4 : -13.2;

  if (startRegime >= 2) {
    transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_LIPID, 250n);
    transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_CATALYST, 120n);
    species.lipid = 22;
    species.catalyst = 14;
    species.oligoRna = 12;
    rafClosureRatio = 0.82;
    vesicleCount = 6;
    masterSequenceFraction = 0.64;
    cladeCount = 2;
  }
  if (startRegime >= 3) {
    transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_BIOMASS_UNIT, 2400n);
    vesicleCount = 20;
    masterSequenceFraction = 0.78;
    prokaryoteGrowthRate = 0.34;
    cladeCount = 4;
  }
  if (startRegime >= 4) {
    transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_BIOMASS_UNIT, 4200n);
    atpPerGene = 115;
    cladeCount = 7;
  }
  if (startRegime >= 5) {
    transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_BIOMASS_UNIT, 6800n);
    atpPerGene = 310;
    const turing = computeTuringMetrics(params.turingDiffusionRatio);
    turingPatternEnergy = turing.patternStrength * 0.55;
    turingWavelengthUm = turing.wavelengthUm;
    michodConvexity = 1.12;
    cladeCount = 12;
  }
  if (startRegime === 6) {
    transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_BIOMASS_UNIT, 5000n);
    michodConvexity = 1.42;
    cladeCount = 18;
  }

  const eigen = computeEigenMetrics(params);
  const lande = computeLandeResponse(params.landeG12, params.landeBeta1, params.landeBeta2);
  const audit = verifyConservation(pools, initialTotal);

  const traitMean: [number, number] = [0.4, 0.45];
  const traitOptimum: [number, number] = [2.4, 1.85];
  const initialPoint: TelemetryPoint = {
    tick: 0,
    timeSec: 0,
    regime: startRegime,
    entropyProduction: 0.08,
    gibbsFreeEnergyKJ,
    rafClosureRatio,
    eigenMargin: eigen.margin,
    masterSequenceFraction,
    biodiversity: cladeCount,
    biomassCarbon: Number(pools.biomass.C),
    abioticCarbon: Number(pools.abiotic.C),
    detritusCarbon: Number(pools.detritus.C),
    atmosphereCarbon: Number(pools.atmosphere.C),
    projectiveMagnification: 1,
    stepRejected: false,
    traitMean,
    speciationProb: 0,
  };

  const baseState: Omit<SimulationState, 'gates'> = {
    tick: 0,
    timeSec: 0,
    regime: startRegime,
    prngCounter: 0,
    pools,
    initialTotal,
    drift: audit.drift,
    invariantViolated: !audit.ok,
    violationMessage: audit.message,
    species,
    vesicleCount,
    masterSequenceFraction,
    eigenMargin: eigen.margin,
    prokaryoteGrowthRate,
    atpPerGene,
    turingPatternEnergy,
    turingWavelengthUm,
    michodConvexity,
    cladeCount,
    traitMean,
    traitOptimum,
    landeDeflectionDeg: lande.deflectionDeg,
    substitutionsK: 0,
    speciationProb: 0,
    entropyProduction: 0.08,
    gibbsFreeEnergyKJ,
    rafClosureRatio,
    projectiveStepRejections: 0,
    lastStepRejected: false,
    lastRejectionReason: null,
    effectiveMagnification: 1,
    history: [initialPoint],
    events: [],
  };

  return {
    ...baseState,
    gates: evaluateBridgeGates(baseState, params),
  };
}

function dtForRegime(regime: RegimeId): number {
  switch (regime) {
    case 1:
      return 1.5; // seconds (prebiotic kinetics)
    case 2:
      return 45.0; // seconds (protocell cycles)
    case 3:
      return 1800.0; // 30 min (prokaryote generation scale)
    case 4:
      return 86400.0; // 1 day (eukaryotic syntrophy)
    case 5:
      return 86400.0 * 30; // 1 month (multicellular morphogenesis)
    case 6:
      return 86400.0 * 365 * 250; // 250 yr (macroevolutionary steps)
  }
}

interface MicroStepResult {
  pools: ElementalPools;
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
  landeDeflectionDeg: number;
  substitutionsK: number;
  speciationProb: number;
  entropyProduction: number;
  gibbsFreeEnergyKJ: number;
  rafClosureRatio: number;
  stiffReason: string | null;
  catastropheTriggered: boolean;
}

function executeMicroStep(
  state: SimulationState,
  params: ScenarioParameters,
  scaleFactor: number,
  rng: ReturnType<typeof createCounterRng>
): MicroStepResult {
  const pools = clonePools(state.pools);
  const species: SpeciesInventory = { ...state.species };
  const T = params.temperatureK;
  const influx = params.resourceInfluxRate;
  const envIsVent = params.environmentMode === 'alkaline_vent';

  // Arrhenius thermal kinetic factor relative to 330K; high temp (>370K) accelerates hydrolysis
  const arrhenius = Math.exp(-3.4 * (330 / T - 1));
  const hydrolysisStress = T > 362 ? 1.0 + (T - 362) * 0.065 : 1.0;

  let vesicleCount = state.vesicleCount;
  let masterSequenceFraction = state.masterSequenceFraction;
  let prokaryoteGrowthRate = state.prokaryoteGrowthRate;
  let atpPerGene = state.atpPerGene;
  let turingPatternEnergy = state.turingPatternEnergy;
  let turingWavelengthUm = state.turingWavelengthUm;
  let michodConvexity = state.michodConvexity;
  let cladeCount = state.cladeCount;
  let traitMean: [number, number] = [...state.traitMean] as [number, number];
  let substitutionsK = state.substitutionsK;
  let rafClosureRatio = state.rafClosureRatio;
  let gibbsFreeEnergyKJ = state.gibbsFreeEnergyKJ;
  let entropyProduction = 0;
  let stiffReason: string | null = null;
  let catastropheTriggered = false;

  const eigen = computeEigenMetrics(params);
  const eigenMargin = eigen.margin;
  const lande = computeLandeResponse(params.landeG12, params.landeBeta1, params.landeBeta2);

  // Concentration-aware reaction quotient Q = (biomassC + 100) / (abioticC + atmosphereC + 100)
  const bioCBefore = Number(pools.biomass.C);
  const subC = Number(pools.abiotic.C + pools.atmosphere.C);
  const Q = (bioCBefore + 250) / Math.max(1000, subC);
  const deltaG0 = envIsVent ? -26.5 : -19.5;
  gibbsFreeEnergyKJ = deltaG0 + R_GAS_KJ * T * Math.log(Math.max(1e-6, Q * 45));

  if (state.regime === 1) {
    // REGIME I: Prebiotic stochastic reaction network (clamped tau-leaping / SSA)
    const ventCatalysisBoost = envIsVent ? 1.35 : 0.92;
    const wetDryCondensationBoost = envIsVent ? 0.95 : 1.48;
    const drive = Math.max(0.05, -gibbsFreeEnergyKJ / 18.0);

    const kFormate = rng.nextPoisson(18 * influx * arrhenius * ventCatalysisBoost * drive * scaleFactor);
    const kPyruvate = rng.nextPoisson(10 * influx * arrhenius * (1 + species.catalyst * 0.12) * scaleFactor);
    const kMonomer = rng.nextPoisson(
      6 * influx * wetDryCondensationBoost * (1 + species.pyruvate * 0.04) * scaleFactor
    );
    const kCatalyst = rng.nextPoisson(
      2.4 * influx * arrhenius * (1 + species.catalyst * 0.22) * wetDryCondensationBoost * scaleFactor
    );
    const kLipid = rng.nextPoisson(
      3.1 * influx * (envIsVent ? 1.15 : 1.25) * (1 + species.acetate * 0.03) * scaleFactor
    );
    const kDecay = rng.nextPoisson(
      (2.2 + species.catalyst * 0.18 + species.monomer * 0.08) * hydrolysisStress * scaleFactor
    );

    // Exact conservative transfers across pools
    const movedFormate = transferStoichiometricUnits(
      pools,
      'atmosphere',
      'abiotic',
      STOICH_FORMATE,
      BigInt(kFormate * 15)
    );
    const movedPyr = transferStoichiometricUnits(
      pools,
      'abiotic',
      'biomass',
      STOICH_PYRUVATE,
      BigInt(kPyruvate * 8)
    );
    const movedMon = transferStoichiometricUnits(
      pools,
      'abiotic',
      'biomass',
      STOICH_MONOMER,
      BigInt(kMonomer * 6)
    );
    const movedCat = transferStoichiometricUnits(
      pools,
      'abiotic',
      'biomass',
      STOICH_CATALYST,
      BigInt(kCatalyst * 3)
    );
    const movedLip = transferStoichiometricUnits(
      pools,
      'abiotic',
      'biomass',
      STOICH_LIPID,
      BigInt(kLipid * 4)
    );
    const movedDecay = transferStoichiometricUnits(
      pools,
      'biomass',
      'detritus',
      STOICH_MONOMER,
      BigInt(kDecay * 4)
    );
    // Slow mineral remineralization detritus -> abiotic
    transferStoichiometricUnits(
      pools,
      'detritus',
      'abiotic',
      STOICH_DETRITUS_RECYCLE,
      BigInt(Math.max(1, Math.floor(kDecay * 1.2)))
    );

    species.formate = Math.max(0, species.formate + Math.round(Number(movedFormate) / 15) - Math.floor(kPyruvate * 0.3));
    species.acetate = Math.max(0, species.acetate + Math.floor(Number(movedPyr) / 10));
    species.pyruvate = Math.max(0, species.pyruvate + Math.round(Number(movedPyr) / 8) - Math.floor(kMonomer * 0.25));
    species.monomer = Math.max(0, species.monomer + Math.round(Number(movedMon) / 6) - Math.floor(Number(movedDecay) / 6));
    species.catalyst = Math.max(0, species.catalyst + Math.round(Number(movedCat) / 6) - Math.floor(kDecay * 0.14));
    species.lipid = Math.max(0, species.lipid + Math.round(Number(movedLip) / 7));
    species.oligoRna = Math.max(0, species.oligoRna + Math.floor(Number(movedMon) / 16));

    // Hordijk-Steel RAF Closure Index (0..1)
    const catalyticCoverage = Math.min(1, species.catalyst / 12);
    const foodGenerated = Math.min(1, (species.formate + species.pyruvate + species.monomer) / 45);
    const stabilityPenalty = Math.max(0.45, 1.0 - (hydrolysisStress - 1.0) * 0.45);
    const targetRaf = Math.min(0.98, (0.12 + catalyticCoverage * 0.62 + foodGenerated * 0.26) * stabilityPenalty);
    rafClosureRatio = rafClosureRatio * 0.72 + targetRaf * 0.28;

    const totalForwardFlux = Number(movedPyr + movedMon + movedCat + movedLip);
    entropyProduction = Math.max(0.01, (totalForwardFlux * Math.max(1.5, -gibbsFreeEnergyKJ)) / (T * 12));
  } else if (state.regime === 2) {
    // REGIME II: Protocells & Eigen Quasispecies
    const replicationFlux = rng.nextPoisson(14 * influx * arrhenius * scaleFactor);
    const lipidSynthesis = rng.nextPoisson(9 * influx * scaleFactor);

    // Eigen replicator-mutator dynamics for master sequence fraction
    const noise = rng.nextGaussian() * 0.015 * Math.sqrt(scaleFactor);
    if (eigen.isStable) {
      const eqMaster = Math.max(0.08, Math.min(0.94, 1.0 - 1.0 / Math.max(1.05, eigenMargin * 1.25)));
      masterSequenceFraction = Math.max(
        0.02,
        Math.min(0.96, masterSequenceFraction + (eqMaster - masterSequenceFraction) * 0.18 * Math.min(2.5, scaleFactor) + noise)
      );
    } else {
      // Error catastrophe: exponential collapse toward uniform mutant cloud (1 / 4^L -> ~0.01)
      const collapseRate = Math.min(0.45, 0.14 * (1.0 / Math.max(0.2, eigenMargin)) * Math.min(3, scaleFactor));
      const prevMaster = masterSequenceFraction;
      masterSequenceFraction = Math.max(0.01, masterSequenceFraction * (1.0 - collapseRate) + Math.abs(noise) * 0.2);
      if (prevMaster >= 0.22 && masterSequenceFraction < 0.22) {
        catastropheTriggered = true;
        stiffReason = 'Eigen error catastrophe: master sequence collapsed below viability threshold.';
      } else if (scaleFactor > 1 && prevMaster - masterSequenceFraction > 0.08) {
        stiffReason = 'Rapid quasispecies meltdown detected during projective burst.';
      }
    }

    if (masterSequenceFraction >= 0.15) {
      const movedBio = transferStoichiometricUnits(
        pools,
        'abiotic',
        'biomass',
        STOICH_BIOMASS_UNIT,
        BigInt(Math.max(1, Math.round(replicationFlux * (0.4 + masterSequenceFraction))))
      );
      transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_LIPID, BigInt(lipidSynthesis * 3));
      // Division synchrony: vesicles divide when lipid & biomass accumulate
      const divisionDelta = Math.floor((Number(movedBio) + lipidSynthesis) / 14);
      vesicleCount = Math.min(180, Math.max(1, vesicleCount + divisionDelta));
      entropyProduction = Math.max(0.05, (Number(movedBio) * 14.5) / T);
    } else {
      // Catastrophic lysis recycles biomass -> detritus
      const lysed = transferStoichiometricUnits(
        pools,
        'biomass',
        'detritus',
        STOICH_BIOMASS_UNIT,
        BigInt(Math.max(4, Math.round(20 * scaleFactor)))
      );
      vesicleCount = Math.max(1, vesicleCount - Math.max(1, Math.floor(Number(lysed) / 12)));
      entropyProduction = Math.max(0.02, (Number(lysed) * 8.2) / T);
    }

    // Background recycling detritus -> abiotic
    transferStoichiometricUnits(pools, 'detritus', 'abiotic', STOICH_DETRITUS_RECYCLE, BigInt(Math.max(2, Math.round(4 * scaleFactor))));
    cladeCount = Math.max(1, Math.round(1 + vesicleCount * 0.18 * (0.5 + masterSequenceFraction)));
  } else if (state.regime === 3) {
    // REGIME III: Prokaryotic dFBA with Monod uptake kinetics
    const substrateC = Number(pools.abiotic.C);
    const monodFraction = substrateC / (params.monodKm + substrateC + 1);
    prokaryoteGrowthRate = Math.max(0.02, 0.92 * influx * monodFraction * arrhenius);

    const uptakeUnits = rng.nextPoisson(Math.max(1, prokaryoteGrowthRate * 110 * scaleFactor));
    const movedUp = transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_BIOMASS_UNIT, BigInt(uptakeUnits));

    // Maintenance respiration biomass -> atmosphere (CO2/H2O)
    const respUnits = Math.max(1, Math.floor(Number(movedUp) * 0.22));
    transferStoichiometricUnits(pools, 'biomass', 'atmosphere', STOICH_RESPIRATION, BigInt(respUnits));

    // Turnover biomass -> detritus -> abiotic closed loop
    const turnover = Math.max(1, Math.floor(Number(pools.biomass.C) / 16000) * Math.min(4, Math.ceil(scaleFactor)));
    transferStoichiometricUnits(pools, 'biomass', 'detritus', STOICH_BIOMASS_UNIT, BigInt(turnover));
    transferStoichiometricUnits(pools, 'detritus', 'abiotic', STOICH_DETRITUS_RECYCLE, BigInt(Math.max(2, turnover * 2)));
    transferStoichiometricUnits(pools, 'atmosphere', 'abiotic', STOICH_FORMATE, BigInt(Math.max(5, respUnits * 3)));

    cladeCount = Math.max(2, Math.min(28, Math.round(3 + Number(pools.biomass.C) / 38000)));
    entropyProduction = Math.max(0.1, (Number(movedUp) * Math.abs(params.syntrophyDeltaG) * 0.65) / T);
  } else if (state.regime === 4) {
    // REGIME IV: Eukaryogenesis & Tri-Compartment Syntrophy
    const synFactor = Math.max(0.2, Math.min(2.2, -params.syntrophyDeltaG / 18.0));
    const targetAtp = Math.min(400, 40 + 360 * (1.0 - Math.exp(-0.085 * Math.max(1, state.tick + 12) * synFactor)));
    atpPerGene = atpPerGene * 0.8 + targetAtp * 0.2;

    const substrateC = Number(pools.abiotic.C);
    const monod = substrateC / (params.monodKm + substrateC + 1);
    const growthUnits = rng.nextPoisson(Math.max(1, 145 * influx * monod * synFactor * scaleFactor));
    const moved = transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_BIOMASS_UNIT, BigInt(growthUnits));

    const resp = Math.max(1, Math.floor(Number(moved) * 0.28));
    transferStoichiometricUnits(pools, 'biomass', 'atmosphere', STOICH_RESPIRATION, BigInt(resp));
    transferStoichiometricUnits(pools, 'biomass', 'detritus', STOICH_BIOMASS_UNIT, BigInt(Math.max(2, Math.floor(resp * 0.6))));
    transferStoichiometricUnits(pools, 'detritus', 'abiotic', STOICH_DETRITUS_RECYCLE, BigInt(Math.max(4, Math.floor(resp * 1.1))));
    transferStoichiometricUnits(pools, 'atmosphere', 'abiotic', STOICH_FORMATE, BigInt(Math.max(6, resp * 3)));

    cladeCount = Math.max(4, Math.min(48, Math.round(5 + atpPerGene * 0.08 + Number(pools.biomass.C) / 65000)));
    entropyProduction = Math.max(0.2, (Number(moved) * 24.0 * synFactor) / T);
  } else if (state.regime === 5) {
    // REGIME V: Multicellularity, Turing Morphogenesis & Michod Convexity
    const turing = computeTuringMetrics(params.turingDiffusionRatio);
    turingWavelengthUm = turing.wavelengthUm;
    const targetEnergy = turing.isUnstable ? Math.min(0.95, 0.25 + turing.patternStrength * 0.72) : 0.04;
    turingPatternEnergy = turingPatternEnergy * 0.78 + targetEnergy * 0.22;

    const targetMichod = turing.isUnstable
      ? 1.05 + turingPatternEnergy * 0.58 + Math.min(0.25, influx * 0.12)
      : 0.96;
    michodConvexity = michodConvexity * 0.8 + targetMichod * 0.2;

    // DEB reserve/structure conservative flux
    const growthUnits = rng.nextPoisson(Math.max(1, 130 * influx * michodConvexity * scaleFactor));
    const moved = transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_BIOMASS_UNIT, BigInt(growthUnits));
    const maint = Math.max(2, Math.floor(Number(moved) * 0.35));
    transferStoichiometricUnits(pools, 'biomass', 'atmosphere', STOICH_RESPIRATION, BigInt(maint));
    transferStoichiometricUnits(pools, 'biomass', 'detritus', STOICH_BIOMASS_UNIT, BigInt(Math.max(2, Math.floor(maint * 0.75))));
    transferStoichiometricUnits(pools, 'detritus', 'abiotic', STOICH_DETRITUS_RECYCLE, BigInt(Math.max(4, Math.floor(maint * 1.4))));
    transferStoichiometricUnits(pools, 'atmosphere', 'abiotic', STOICH_FORMATE, BigInt(Math.max(8, maint * 3)));

    cladeCount = Math.max(6, Math.min(72, Math.round(10 + turingPatternEnergy * 34 + michodConvexity * 8)));
    entropyProduction = Math.max(0.25, (Number(moved) * 28.0) / T);
  } else {
    // REGIME VI: Macroevolution — Lande G-Matrix & Orr Snowball BDMI Speciation
    const stepAlpha = 0.045 * Math.min(3.5, scaleFactor);
    const localBeta1 = params.landeBeta1 * (state.traitOptimum[0] - traitMean[0]) * 0.55 + params.landeBeta1 * 0.35;
    const localBeta2 = params.landeBeta2 * (state.traitOptimum[1] - traitMean[1]) * 0.55 + params.landeBeta2 * 0.35;
    const stepResp = computeLandeResponse(params.landeG12, localBeta1, localBeta2);

    const drift1 = rng.nextGaussian() * 0.012;
    const drift2 = rng.nextGaussian() * 0.012;
    traitMean = [
      Math.max(-2.5, Math.min(4.0, traitMean[0] + stepResp.dz1 * stepAlpha + drift1)),
      Math.max(-2.5, Math.min(4.0, traitMean[1] + stepResp.dz2 * stepAlpha + drift2)),
    ];

    // Substitutions accumulate stochastically -> quadratic Orr snowball speciation
    const dK = rng.nextPoisson(Math.max(0.35, 0.85 * (0.6 + params.mutationRate * 25) * Math.min(4, scaleFactor)));
    substitutionsK = Math.min(65, substitutionsK + dK);

    // Coupled biosphere-lithosphere carbon cycle (strictly zero-drift)
    const flux = rng.nextPoisson(Math.max(5, 95 * influx * scaleFactor));
    const moved = transferStoichiometricUnits(pools, 'abiotic', 'biomass', STOICH_BIOMASS_UNIT, BigInt(flux));
    const resp = Math.max(3, Math.floor(Number(moved) * 0.45));
    transferStoichiometricUnits(pools, 'biomass', 'atmosphere', STOICH_RESPIRATION, BigInt(resp));
    transferStoichiometricUnits(pools, 'biomass', 'detritus', STOICH_BIOMASS_UNIT, BigInt(Math.max(3, Math.floor(resp * 0.7))));
    transferStoichiometricUnits(pools, 'detritus', 'abiotic', STOICH_DETRITUS_RECYCLE, BigInt(Math.max(5, Math.floor(resp * 1.4))));
    transferStoichiometricUnits(pools, 'atmosphere', 'abiotic', STOICH_FORMATE, BigInt(Math.max(10, resp * 3)));

    const specProb = computeOrrSpeciationProb(substitutionsK, params.bdmiRate);
    cladeCount = Math.max(8, Math.min(120, Math.round(14 + specProb * 42 + substitutionsK * 0.45)));
    entropyProduction = Math.max(0.3, (Number(moved) * 32.0) / T);
  }

  const bioCAfter = Number(pools.biomass.C);
  const relativeSwing = Math.abs(bioCAfter - bioCBefore) / Math.max(25000, bioCBefore + 25000);
  if (!stiffReason && scaleFactor > 1 && relativeSwing > 0.16) {
    stiffReason = `Rapid biomass flux gradient (${(relativeSwing * 100).toFixed(1)}% shift) exceeded projective tolerance.`;
  }

  const speciationProb = computeOrrSpeciationProb(substitutionsK, params.bdmiRate);

  return {
    pools,
    species,
    vesicleCount,
    masterSequenceFraction,
    eigenMargin,
    prokaryoteGrowthRate,
    atpPerGene,
    turingPatternEnergy,
    turingWavelengthUm,
    michodConvexity,
    cladeCount,
    traitMean,
    landeDeflectionDeg: lande.deflectionDeg,
    substitutionsK,
    speciationProb,
    entropyProduction,
    gibbsFreeEnergyKJ,
    rafClosureRatio,
    stiffReason,
    catastropheTriggered,
  };
}

/**
 * Advances simulation by 1 tick using Projective Integration (micro-burst relaxation + macro-jump).
 * Automatically throttles down and logs Projective Step Rejection on stiff phase transitions.
 */
export function stepSimulation(
  prevState: SimulationState,
  params: ScenarioParameters,
  requestedMagnification: number = 1
): SimulationState {
  if (prevState.invariantViolated) {
    return prevState;
  }

  // Re-verify incoming state before stepping (adversarial guard)
  const incomingAudit = verifyConservation(prevState.pools, prevState.initialTotal);
  if (!incomingAudit.ok) {
    return {
      ...prevState,
      drift: incomingAudit.drift,
      invariantViolated: true,
      violationMessage: incomingAudit.message,
      events: [
        ...prevState.events.slice(-49),
        {
          tick: prevState.tick,
          timeSec: prevState.timeSec,
          regime: prevState.regime,
          kind: 'violation',
          summary: incomingAudit.message ?? 'Elemental conservation violation detected.',
        },
      ],
    };
  }

  const rng = createCounterRng(params.seed, prevState.prngCounter);
  const mag = Math.max(1, Math.min(500, Math.round(requestedMagnification)));

  // Step 1: Micro-burst probe (1x scale) to detect stiffness / phase transitions
  const probe = executeMicroStep(prevState, params, 1, rng);

  // Check if probe alone crosses an active biophysical bridge gate
  const probeCandidate: Omit<SimulationState, 'gates'> = {
    ...prevState,
    pools: probe.pools,
    species: probe.species,
    vesicleCount: probe.vesicleCount,
    masterSequenceFraction: probe.masterSequenceFraction,
    eigenMargin: probe.eigenMargin,
    prokaryoteGrowthRate: probe.prokaryoteGrowthRate,
    atpPerGene: probe.atpPerGene,
    turingPatternEnergy: probe.turingPatternEnergy,
    turingWavelengthUm: probe.turingWavelengthUm,
    michodConvexity: probe.michodConvexity,
    cladeCount: probe.cladeCount,
    traitMean: probe.traitMean,
    landeDeflectionDeg: probe.landeDeflectionDeg,
    substitutionsK: probe.substitutionsK,
    speciationProb: probe.speciationProb,
    entropyProduction: probe.entropyProduction,
    gibbsFreeEnergyKJ: probe.gibbsFreeEnergyKJ,
    rafClosureRatio: probe.rafClosureRatio,
  };
  const probeGates = evaluateBridgeGates(probeCandidate, params);
  const activeGate = probeGates.find((g) => g.fromRegime === prevState.regime);
  const gateImminent = Boolean(activeGate && (activeGate.met || activeGate.progress > 0.92));

  let stepRejected = false;
  let rejectionReason: string | null = null;
  let effectiveMag = mag;
  let finalResult = probe;

  if (mag > 1) {
    if (probe.stiffReason) {
      stepRejected = true;
      rejectionReason = probe.stiffReason;
      effectiveMag = 1;
    } else if (gateImminent && params.autoPromoteRegimes) {
      stepRejected = true;
      rejectionReason = `Stiff regime transition imminent (${activeGate?.name}); throttled from ${mag}x to 1x.`;
      effectiveMag = 1;
    } else if (prevState.regime === 2 && !computeEigenMetrics(params).isStable) {
      stepRejected = true;
      rejectionReason = `Eigen error catastrophe regime active (margin ${probe.eigenMargin.toFixed(2)}x < 1.0); projective jump rejected.`;
      effectiveMag = 1;
    } else {
      // Execute projective macro-jump with logarithmic kinetic damping to preserve stability
      const macroScale = Math.min(8, 1 + Math.log2(mag) * 0.9);
      const jumped = executeMicroStep(
        { ...prevState, ...probeCandidate, gates: probeGates },
        params,
        macroScale,
        rng
      );
      if (jumped.stiffReason) {
        stepRejected = true;
        rejectionReason = jumped.stiffReason;
        effectiveMag = 1;
        // Revert to clean micro-burst probe
        finalResult = probe;
      } else {
        finalResult = jumped;
      }
    }
  }

  const nextTick = prevState.tick + 1;
  const dt = dtForRegime(prevState.regime) * effectiveMag;
  const nextTimeSec = prevState.timeSec + dt;

  // Hard Conservation Check (Non-Negotiable Invariant)
  const audit = verifyConservation(finalResult.pools, prevState.initialTotal);

  const nextEvents: SimulationEvent[] = [...prevState.events];
  if (stepRejected && rejectionReason) {
    nextEvents.push({
      tick: nextTick,
      timeSec: nextTimeSec,
      regime: prevState.regime,
      kind: 'rejection',
      summary: rejectionReason,
    });
  }
  if (finalResult.catastropheTriggered) {
    nextEvents.push({
      tick: nextTick,
      timeSec: nextTimeSec,
      regime: prevState.regime,
      kind: 'catastrophe',
      summary: 'Eigen error catastrophe triggered: master sequence lost coherence.',
    });
  }
  if (!audit.ok) {
    nextEvents.push({
      tick: nextTick,
      timeSec: nextTimeSec,
      regime: prevState.regime,
      kind: 'violation',
      summary: audit.message ?? 'Elemental conservation violation.',
    });
  }

  let nextRegime: RegimeId = prevState.regime;
  const preGateState: Omit<SimulationState, 'gates'> = {
    tick: nextTick,
    timeSec: nextTimeSec,
    regime: nextRegime,
    prngCounter: rng.getCounter(),
    pools: finalResult.pools,
    initialTotal: prevState.initialTotal,
    drift: audit.drift,
    invariantViolated: !audit.ok,
    violationMessage: audit.message,
    species: finalResult.species,
    vesicleCount: finalResult.vesicleCount,
    masterSequenceFraction: finalResult.masterSequenceFraction,
    eigenMargin: finalResult.eigenMargin,
    prokaryoteGrowthRate: finalResult.prokaryoteGrowthRate,
    atpPerGene: finalResult.atpPerGene,
    turingPatternEnergy: finalResult.turingPatternEnergy,
    turingWavelengthUm: finalResult.turingWavelengthUm,
    michodConvexity: finalResult.michodConvexity,
    cladeCount: finalResult.cladeCount,
    traitMean: finalResult.traitMean,
    traitOptimum: prevState.traitOptimum,
    landeDeflectionDeg: finalResult.landeDeflectionDeg,
    substitutionsK: finalResult.substitutionsK,
    speciationProb: finalResult.speciationProb,
    entropyProduction: finalResult.entropyProduction,
    gibbsFreeEnergyKJ: finalResult.gibbsFreeEnergyKJ,
    rafClosureRatio: finalResult.rafClosureRatio,
    projectiveStepRejections: prevState.projectiveStepRejections + (stepRejected ? 1 : 0),
    lastStepRejected: stepRejected,
    lastRejectionReason: rejectionReason,
    effectiveMagnification: effectiveMag,
    history: prevState.history,
    events: nextEvents,
  };

  let gates = evaluateBridgeGates(preGateState, params);

  // Non-teleological regime promotion: ONLY if objective biophysical gate is met
  if (audit.ok && params.autoPromoteRegimes && nextRegime < 6) {
    const currentGate = gates.find((g) => g.fromRegime === nextRegime);
    if (currentGate && currentGate.met) {
      const promotedRegime = currentGate.toRegime;
      nextRegime = promotedRegime;
      preGateState.regime = promotedRegime;
      // Initialize regime-specific variables cleanly without creating atoms
      if (promotedRegime === 2) {
        preGateState.vesicleCount = Math.max(4, Math.floor(preGateState.species.lipid / 4));
        preGateState.masterSequenceFraction = Math.max(0.38, preGateState.rafClosureRatio * 0.65);
      } else if (promotedRegime === 3) {
        preGateState.prokaryoteGrowthRate = 0.25;
      } else if (promotedRegime === 4) {
        preGateState.atpPerGene = Math.max(60, preGateState.atpPerGene);
      } else if (promotedRegime === 5) {
        const t = computeTuringMetrics(params.turingDiffusionRatio);
        preGateState.turingPatternEnergy = t.patternStrength * 0.4;
        preGateState.turingWavelengthUm = t.wavelengthUm;
      }
      nextEvents.push({
        tick: nextTick,
        timeSec: nextTimeSec,
        regime: promotedRegime,
        kind: 'gate',
        summary: `Bridge gate satisfied: promoted to Regime ${promotedRegime} via ${currentGate.name}.`,
      });
      gates = evaluateBridgeGates(preGateState, params);
    }
  }

  const telemetryPoint: TelemetryPoint = {
    tick: nextTick,
    timeSec: nextTimeSec,
    regime: nextRegime,
    entropyProduction: preGateState.entropyProduction,
    gibbsFreeEnergyKJ: preGateState.gibbsFreeEnergyKJ,
    rafClosureRatio: preGateState.rafClosureRatio,
    eigenMargin: preGateState.eigenMargin,
    masterSequenceFraction: preGateState.masterSequenceFraction,
    biodiversity: preGateState.cladeCount,
    biomassCarbon: Number(preGateState.pools.biomass.C),
    abioticCarbon: Number(preGateState.pools.abiotic.C),
    detritusCarbon: Number(preGateState.pools.detritus.C),
    atmosphereCarbon: Number(preGateState.pools.atmosphere.C),
    projectiveMagnification: effectiveMag,
    stepRejected,
    traitMean: [...preGateState.traitMean] as [number, number],
    speciationProb: preGateState.speciationProb,
  };

  const nextHistory = [...prevState.history, telemetryPoint];
  const trimmedHistory =
    nextHistory.length > MAX_HISTORY_POINTS
      ? nextHistory.slice(nextHistory.length - MAX_HISTORY_POINTS)
      : nextHistory;

  return {
    ...preGateState,
    gates,
    history: trimmedHistory,
    events: nextEvents.slice(-50),
  };
}

export function stepSimulationBatch(
  state: SimulationState,
  params: ScenarioParameters,
  steps: number,
  magnification: number = 1
): SimulationState {
  let current = state;
  for (let i = 0; i < steps; i++) {
    if (current.invariantViolated) break;
    current = stepSimulation(current, params, magnification);
  }
  return current;
}

/**
 * Adversarial invariant self-test helper: clones state with a 1-atom injection in biomass C
 * so users or tests can verify the hard conservation halt triggers immediately.
 */
export function injectAdversarialDrift(state: SimulationState): SimulationState {
  const corruptedPools = clonePools(state.pools);
  corruptedPools.biomass.C += 1n;
  const audit = verifyConservation(corruptedPools, state.initialTotal);
  return {
    ...state,
    pools: corruptedPools,
    drift: audit.drift,
    invariantViolated: !audit.ok,
    violationMessage: audit.message,
    events: [
      ...state.events.slice(-49),
      {
        tick: state.tick,
        timeSec: state.timeSec,
        regime: state.regime,
        kind: 'violation',
        summary: audit.message ?? 'Adversarial 1-atom drift check triggered halt.',
      },
    ],
  };
}

export function formatSimTime(seconds: number): string {
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  if (seconds < 3600) return `${(seconds / 60).toFixed(1)} min`;
  if (seconds < 86400) return `${(seconds / 3600).toFixed(1)} hr`;
  if (seconds < 86400 * 365) return `${(seconds / 86400).toFixed(1)} d`;
  const yrs = seconds / (86400 * 365);
  if (yrs < 1000) return `${yrs.toFixed(1)} yr`;
  if (yrs < 1e6) return `${(yrs / 1e3).toFixed(2)} kyr`;
  return `${(yrs / 1e6).toFixed(2)} Myr`;
}

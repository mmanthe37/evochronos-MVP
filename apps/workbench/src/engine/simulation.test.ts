import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeEigenMetrics,
  computeLandeResponse,
  computeOrrSpeciationProb,
  computeTuringMetrics,
  createInitialState,
  injectAdversarialDrift,
  stepSimulation,
  stepSimulationBatch,
} from './simulation';
import {
  createDefaultInitialPools,
  hasNonZeroDrift,
  sumPools,
  verifyConservation,
} from './conservation';
import { DEFAULT_PARAMETERS, SCENARIO_PRESETS } from './presets';
import {
  deserializeExperimentBundle,
  exportBranchesToCsv,
  serializeExperimentBundle,
} from './storage';
import { ELEMENTS, ExperimentBranch } from './types';

test('deterministic reproducibility: identical seed and params produce bit-identical trajectories', () => {
  const params = { ...DEFAULT_PARAMETERS, seed: 133791 };
  const s1 = stepSimulationBatch(createInitialState(params), params, 40, 5);
  const s2 = stepSimulationBatch(createInitialState(params), params, 40, 5);

  assert.equal(s1.tick, s2.tick);
  assert.equal(s1.regime, s2.regime);
  assert.equal(s1.prngCounter, s2.prngCounter);
  assert.deepEqual(s1.pools, s2.pools);
  assert.deepEqual(s1.species, s2.species);
  assert.equal(s1.entropyProduction, s2.entropyProduction);
  assert.equal(s1.projectiveStepRejections, s2.projectiveStepRejections);
});

test('different seeds produce distinct stochastic trajectories while preserving exact conservation', () => {
  const pA = { ...DEFAULT_PARAMETERS, seed: 1001 };
  const pB = { ...DEFAULT_PARAMETERS, seed: 2002 };

  const sA = stepSimulationBatch(createInitialState(pA), pA, 25, 1);
  const sB = stepSimulationBatch(createInitialState(pB), pB, 25, 1);

  assert.notEqual(sA.pools.biomass.C, sB.pools.biomass.C);
  assert.equal(hasNonZeroDrift(sA.drift), false);
  assert.equal(hasNonZeroDrift(sB.drift), false);
});

test('exact BigInt 0-drift conservation holds across all 6 scenario presets and high magnification', () => {
  for (const preset of SCENARIO_PRESETS) {
    let state = createInitialState(preset.parameters);
    const initialSum = sumPools(state.pools);

    state = stepSimulationBatch(state, preset.parameters, 45, 25);

    assert.equal(state.invariantViolated, false, `Invariant violated in preset ${preset.id}`);
    const audit = verifyConservation(state.pools, initialSum);
    assert.equal(audit.ok, true, `Conservation audit failed in preset ${preset.id}: ${audit.message}`);
    for (const el of ELEMENTS) {
      assert.equal(audit.drift[el], 0n, `Non-zero drift for ${el} in ${preset.id}`);
      assert.equal(audit.total[el], initialSum[el]);
    }
  }
});

test('adversarial 1-atom drift injection halts simulation immediately and flags violation', () => {
  const params = { ...DEFAULT_PARAMETERS, seed: 42 };
  const initial = stepSimulationBatch(createInitialState(params), params, 5, 1);
  const corrupted = injectAdversarialDrift(initial);

  assert.equal(corrupted.invariantViolated, true);
  assert.equal(corrupted.drift.C, 1n);
  assert.ok(corrupted.violationMessage && corrupted.violationMessage.includes('C:+1'));

  // Further stepping must remain halted
  const afterAttempt = stepSimulation(corrupted, params, 1);
  assert.equal(afterAttempt.tick, corrupted.tick);
  assert.equal(afterAttempt.invariantViolated, true);
});

test('Eigen error catastrophe blocks Regime II -> III promotion and triggers projective step rejection', () => {
  const catastropheParams = {
    ...DEFAULT_PARAMETERS,
    initialRegime: 2 as const,
    polymerLength: 80,
    selectiveAdvantage: 5.0,
    mutationRate: 0.045, // L_max = ln(5)/0.045 = 35.7 < 80 -> unstable!
    autoPromoteRegimes: true,
  };

  const eigen = computeEigenMetrics(catastropheParams);
  assert.equal(eigen.isStable, false);
  assert.ok(eigen.margin < 1.0);

  const initial = createInitialState(catastropheParams);
  const after = stepSimulationBatch(initial, catastropheParams, 20, 25);

  assert.equal(after.regime, 2, 'Should NOT promote to Regime III during Eigen error catastrophe');
  assert.ok(after.masterSequenceFraction < 0.25, 'Master sequence must collapse under error catastrophe');
  assert.ok(after.projectiveStepRejections > 0, 'High magnification should trigger projective step rejections');
  assert.equal(after.invariantViolated, false);
});

test('non-teleological gating promotes Regime I -> II when biophysical RAF and lipid thresholds are met', () => {
  const ventPreset = SCENARIO_PRESETS[0];
  let state = createInitialState(ventPreset.parameters);
  assert.equal(state.regime, 1);

  state = stepSimulationBatch(state, ventPreset.parameters, 80, 5);
  assert.ok(state.regime >= 2, 'Alkaline Vent preset should organically cross RAF/lipid gate into Regime II+');
  assert.equal(state.invariantViolated, false);
});

test('analytical Turing, Lande G-Matrix, and Orr BDMI calculators match theoretical invariants', () => {
  const lowD = computeTuringMetrics(4);
  const highD = computeTuringMetrics(22);
  assert.equal(lowD.isUnstable, false);
  assert.equal(highD.isUnstable, true);
  assert.ok(highD.wavelengthUm > 0);

  const unconstrained = computeLandeResponse(0, 0.8, -0.3);
  const deflected = computeLandeResponse(0.75, 0.8, -0.3);
  assert.ok(unconstrained.deflectionDeg < 0.001);
  assert.ok(deflected.deflectionDeg > 20);

  const pIsoLow = computeOrrSpeciationProb(5, 0.01);
  const pIsoHigh = computeOrrSpeciationProb(25, 0.01);
  assert.ok(pIsoHigh > pIsoLow * 4, 'Orr incompatibilities should snowball quadratically');
});

test('versioned ExperimentBundle JSON and CSV serialization preserve BigInt elemental pools', () => {
  const params = { ...DEFAULT_PARAMETERS, seed: 9911 };
  const state = stepSimulationBatch(createInitialState(params, createDefaultInitialPools()), params, 10, 1);
  const branch: ExperimentBranch = {
    id: 'branch-control',
    name: 'Control',
    parentId: null,
    forkTick: null,
    perturbationSummary: 'Baseline scenario',
    createdAt: '2026-11-24T00:00:00.000Z',
    presetId: 'alkaline-vent-emergence',
    parameters: params,
    state,
  };

  const bundle = serializeExperimentBundle([branch], branch.id);
  const rawJson = JSON.stringify(bundle);
  const restored = deserializeExperimentBundle(JSON.parse(rawJson));

  assert.equal(restored.activeBranchId, 'branch-control');
  assert.deepEqual(restored.branches[0].state.pools, state.pools);
  assert.deepEqual(restored.branches[0].state.initialTotal, state.initialTotal);

  const csv = exportBranchesToCsv([branch]);
  assert.ok(csv.includes('branch_id,branch_name'));
  assert.ok(csv.includes('branch-control'));
});

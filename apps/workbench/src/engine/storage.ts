import {
  deserializePools,
  deserializeVector,
  serializePools,
  serializeVector,
} from './conservation';
import { ExperimentBranch, ExperimentBundle } from './types';

export const STORAGE_KEY = 'evochronos.workbench.bundle.v1';
export const ONBOARDING_KEY = 'evochronos.workbench.onboarded.v1';

export function serializeExperimentBundle(
  branches: ExperimentBranch[],
  activeBranchId: string
): ExperimentBundle {
  return {
    schemaVersion: 'evochronos-bundle-v1',
    modelVersion: '0.2.0',
    exportedAt: new Date().toISOString(),
    activeBranchId,
    branches: branches.map((b) => ({
      ...b,
      state: {
        ...b.state,
        pools: serializePools(b.state.pools),
        initialTotal: serializeVector(b.state.initialTotal),
        drift: serializeVector(b.state.drift),
      },
    })),
  };
}

export function deserializeExperimentBundle(
  bundle: ExperimentBundle
): { branches: ExperimentBranch[]; activeBranchId: string } {
  if (!bundle || bundle.schemaVersion !== 'evochronos-bundle-v1' || !Array.isArray(bundle.branches)) {
    throw new Error('Invalid or unsupported EvoChronos bundle schema.');
  }

  const branches: ExperimentBranch[] = bundle.branches.map((b) => ({
    ...b,
    state: {
      ...b.state,
      pools: deserializePools(b.state.pools),
      initialTotal: deserializeVector(b.state.initialTotal),
      drift: deserializeVector(b.state.drift),
    },
  }));

  const activeExists = branches.some((b) => b.id === bundle.activeBranchId);
  return {
    branches,
    activeBranchId: activeExists ? bundle.activeBranchId : branches[0]?.id ?? '',
  };
}

export function saveBundleToLocalStorage(
  branches: ExperimentBranch[],
  activeBranchId: string
): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const bundle = serializeExperimentBundle(branches, activeBranchId);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(bundle));
    return true;
  } catch {
    return false;
  }
}

export function loadBundleFromLocalStorage(): {
  branches: ExperimentBranch[];
  activeBranchId: string;
} | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ExperimentBundle;
    const restored = deserializeExperimentBundle(parsed);
    if (restored.branches.length === 0) return null;
    return restored;
  } catch {
    return null;
  }
}

export function exportBranchesToCsv(branches: ExperimentBranch[]): string {
  const header = [
    'branch_id',
    'branch_name',
    'parent_id',
    'fork_tick',
    'seed',
    'tick',
    'time_sec',
    'regime',
    'entropy_production',
    'gibbs_free_energy_kj',
    'raf_closure_ratio',
    'eigen_margin',
    'master_sequence_fraction',
    'biodiversity_clades',
    'biomass_carbon',
    'abiotic_carbon',
    'detritus_carbon',
    'atmosphere_carbon',
    'projective_magnification',
    'step_rejected',
    'trait_z1',
    'trait_z2',
    'speciation_prob',
  ].join(',');

  const rows: string[] = [header];
  for (const b of branches) {
    const safeName = `"${b.name.replace(/"/g, '""')}"`;
    for (const pt of b.state.history) {
      rows.push(
        [
          b.id,
          safeName,
          b.parentId ?? '',
          b.forkTick ?? '',
          b.parameters.seed,
          pt.tick,
          pt.timeSec.toFixed(3),
          pt.regime,
          pt.entropyProduction.toFixed(5),
          pt.gibbsFreeEnergyKJ.toFixed(4),
          pt.rafClosureRatio.toFixed(4),
          pt.eigenMargin.toFixed(4),
          pt.masterSequenceFraction.toFixed(4),
          pt.biodiversity,
          pt.biomassCarbon,
          pt.abioticCarbon,
          pt.detritusCarbon,
          pt.atmosphereCarbon,
          pt.projectiveMagnification,
          pt.stepRejected ? '1' : '0',
          pt.traitMean[0].toFixed(4),
          pt.traitMean[1].toFixed(4),
          pt.speciationProb.toFixed(5),
        ].join(',')
      );
    }
  }
  return rows.join('\n');
}

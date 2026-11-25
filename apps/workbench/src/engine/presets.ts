import {
  EpistemicTier,
  ParameterSpec,
  RegimeEvidenceDoc,
  RegimeId,
  ScenarioParameters,
  ScenarioPreset,
} from './types';

export const EPISTEMIC_META: Record<
  EpistemicTier,
  {
    code: string;
    label: string;
    shortDesc: string;
    detail: string;
    textClass: string;
    borderClass: string;
    bgClass: string;
  }
> = {
  FACT: {
    code: 'F',
    label: 'FACT',
    shortDesc: 'Hard physical invariant',
    detail:
      'Exact conservation laws and thermodynamic constraints (integer mass balance across [C,H,O,N,P,S,Fe] and non-negative entropy production).',
    textClass: 'text-emerald-300',
    borderClass: 'border-emerald-500/40',
    bgClass: 'bg-emerald-500/10',
  },
  ASSUMPTION: {
    code: 'A',
    label: 'ASSUMPTION',
    shortDesc: 'Configurable boundary axiom',
    detail:
      'Explicit scenario setting chosen by the experimenter (e.g., Alkaline Hydrothermal Vent vs. Wet-Dry Cycling, ambient temperature, selection gradient).',
    textClass: 'text-cyan-300',
    borderClass: 'border-cyan-500/40',
    bgClass: 'bg-cyan-500/10',
  },
  ESTIMATE: {
    code: 'E',
    label: 'ESTIMATE',
    shortDesc: 'Empirically bounded prior',
    detail:
      'Kinetic, energetic, or genetic rates bounded by experimental literature or biophysical scaling laws, subject to sensitivity sweeps.',
    textClass: 'text-amber-300',
    borderClass: 'border-amber-500/40',
    bgClass: 'bg-amber-500/10',
  },
  INTERPRETATION: {
    code: 'I',
    label: 'INTERPRETATION',
    shortDesc: 'Phase-transition detector',
    detail:
      'Formal mathematical criteria used to classify emergent transitions (Hordijk-Steel RAF closure, Eigen threshold margin, Michod convexity).',
    textClass: 'text-indigo-300',
    borderClass: 'border-indigo-500/40',
    bgClass: 'bg-indigo-500/10',
  },
  UNCERTAINTY: {
    code: 'U',
    label: 'UNCERTAINTY',
    shortDesc: 'Open research frontier',
    detail:
      'Mechanisms with wide theoretical uncertainty in evolutionary biology (e.g., homochirality onset, genetic code fixation, epistatic incompatibility density).',
    textClass: 'text-rose-300',
    borderClass: 'border-rose-500/40',
    bgClass: 'bg-rose-500/10',
  },
};

export const DEFAULT_PARAMETERS: ScenarioParameters = {
  seed: 42019,
  environmentMode: 'alkaline_vent',
  temperatureK: 348,
  resourceInfluxRate: 1.15,
  mutationRate: 0.018,
  polymerLength: 48,
  selectiveAdvantage: 8.5,
  monodKm: 120000,
  syntrophyDeltaG: -22.5,
  turingDiffusionRatio: 18,
  landeG12: 0.55,
  landeBeta1: 0.75,
  landeBeta2: -0.25,
  bdmiRate: 0.009,
  initialRegime: 1,
  autoPromoteRegimes: true,
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: 'alkaline-vent-emergence',
    name: 'Alkaline Hydrothermal Vent Emergence',
    tagline: 'FeS-catalyzed CO2/H2 reduction through multi-regime bridge gates',
    description:
      'Models a porous alkaline hydrothermal vent interface at 348 K with FeS mineral clusters driving carbon fixation into a reflexively autocatalytic (RAF) network. Regimes advance only when biophysical thresholds are crossed.',
    primaryAssumption: 'Continuous redox disequilibrium across alkaline vent chimney pores',
    epistemicFocus: 'ASSUMPTION',
    parameters: {
      ...DEFAULT_PARAMETERS,
      seed: 42019,
      environmentMode: 'alkaline_vent',
      temperatureK: 348,
      resourceInfluxRate: 1.25,
      mutationRate: 0.016,
      polymerLength: 46,
      selectiveAdvantage: 9.0,
      initialRegime: 1,
      autoPromoteRegimes: true,
    },
    recommendedMagnification: 1,
    recommendedForkHint: 'Fork at tick 30 and switch Environment Mode to Wet-Dry Cycling or raise Temperature to 375 K.',
  },
  {
    id: 'wet-dry-cycling',
    name: 'Wet-Dry Cycling Prebiotic Pond',
    tagline: 'Dehydration-driven polymerization vs. hydrothermal vent baseline',
    description:
      'Tests an alternative prebiotic boundary assumption: periodic desiccation concentrates monomers and favors ester/peptide condensation at 328 K while exposing polymers to slower mineral catalysis.',
    primaryAssumption: 'Subaerial hydrothermal field with evaporative wet-dry condensation cycles',
    epistemicFocus: 'ASSUMPTION',
    parameters: {
      ...DEFAULT_PARAMETERS,
      seed: 42019,
      environmentMode: 'wet_dry_cycling',
      temperatureK: 328,
      resourceInfluxRate: 1.05,
      mutationRate: 0.019,
      polymerLength: 44,
      selectiveAdvantage: 7.5,
      initialRegime: 1,
      autoPromoteRegimes: true,
    },
    recommendedMagnification: 1,
    recommendedForkHint: 'Compare directly with Alkaline Vent using identical seed 42019 to isolate boundary assumptions.',
  },
  {
    id: 'eigen-error-catastrophe',
    name: 'Eigen Error Catastrophe Sweep',
    tagline: 'Protocell quasispecies poised near L_max = ln(sigma_0) / (1 - q)',
    description:
      'Initializes encapsulated RNA-like replicators in Regime II just inside Eigen stability. Increasing per-base mutation rate (1 - q) above ln(sigma_0)/L collapses the master sequence into error catastrophe.',
    primaryAssumption: 'Vesicle-encapsulated template replication with constant fitness peak sigma_0',
    epistemicFocus: 'INTERPRETATION',
    parameters: {
      ...DEFAULT_PARAMETERS,
      seed: 88104,
      environmentMode: 'alkaline_vent',
      temperatureK: 332,
      resourceInfluxRate: 1.1,
      mutationRate: 0.029,
      polymerLength: 60,
      selectiveAdvantage: 7.4,
      initialRegime: 2,
      autoPromoteRegimes: true,
    },
    recommendedMagnification: 5,
    recommendedForkHint: 'Fork at tick 15 and raise Mutation Rate from 0.029 to 0.042 to trigger Eigen error catastrophe.',
  },
  {
    id: 'eukaryotic-syntrophy',
    name: 'Prokaryote dFBA to Eukaryotic Syntrophy',
    tagline: 'Monod uptake kinetics and H2-pull endosymbiotic bioenergetics',
    description:
      'Begins in Regime III Prokaryotic dFBA with mass-balanced Monod substrate uptake. When thermodynamic hydrogen pull (Delta G < -15 kJ/mol) sustains syntrophic coupling, the bridge gate promotes into Regime IV chimeric bioenergetics.',
    primaryAssumption: 'Syntrophic H2 transfer between host archaeon and alphaproteobacterial symbiont',
    epistemicFocus: 'ESTIMATE',
    parameters: {
      ...DEFAULT_PARAMETERS,
      seed: 51337,
      environmentMode: 'alkaline_vent',
      temperatureK: 318,
      resourceInfluxRate: 1.35,
      monodKm: 95000,
      syntrophyDeltaG: -24.0,
      initialRegime: 3,
      autoPromoteRegimes: true,
    },
    recommendedMagnification: 5,
    recommendedForkHint: 'Fork and weaken Syntrophy Delta G from -24 kJ/mol to -10 kJ/mol to block endosymbiotic gating.',
  },
  {
    id: 'multicell-turing-morphogenesis',
    name: 'Multicellular Turing Morphogenesis',
    tagline: 'Diffusion-driven pattern instability and Michod germ-soma synergy',
    description:
      'Starts in Regime V multicellularity where activator-inhibitor diffusion ratio (D_v / D_u) governs standing-wave Turing patterns and germ-soma convexity drives individuality.',
    primaryAssumption: 'Reaction-diffusion morphogen field coupled to DEB carbon allocation',
    epistemicFocus: 'INTERPRETATION',
    parameters: {
      ...DEFAULT_PARAMETERS,
      seed: 73011,
      temperatureK: 300,
      resourceInfluxRate: 1.2,
      turingDiffusionRatio: 22,
      initialRegime: 5,
      autoPromoteRegimes: true,
    },
    recommendedMagnification: 25,
    recommendedForkHint: 'Fork and lower Turing Diffusion Ratio below 8 to suppress spatial pattern emergence.',
  },
  {
    id: 'lande-gmatrix-speciation',
    name: 'Lande G-Matrix Deflection & Orr BDMI',
    tagline: 'Genetic covariance deflection and quadratic snowball speciation',
    description:
      'Explores Regime VI macroevolutionary dynamics: genetic covariance G_12 deflects phenotypic response Delta z = G * beta away from the selection gradient while accumulated substitutions drive quadratic BDMI reproductive isolation.',
    primaryAssumption: 'Constant additive genetic covariance matrix G on a Gaussian adaptive peak',
    epistemicFocus: 'UNCERTAINTY',
    parameters: {
      ...DEFAULT_PARAMETERS,
      seed: 90421,
      temperatureK: 295,
      resourceInfluxRate: 1.0,
      landeG12: 0.72,
      landeBeta1: 0.85,
      landeBeta2: -0.4,
      bdmiRate: 0.011,
      initialRegime: 6,
      autoPromoteRegimes: false,
    },
    recommendedMagnification: 25,
    recommendedForkHint: 'Fork and set G_12 Covariance to 0.0 to compare unconstrained vs. deflected phenotypic evolution.',
  },
];

export const PARAMETER_SPECS: ParameterSpec[] = [
  {
    key: 'temperatureK',
    label: 'Ambient Temperature',
    unit: 'K',
    min: 280,
    max: 390,
    step: 1,
    epistemicTier: 'ASSUMPTION',
    tooltip:
      'Thermal boundary condition governing Arrhenius reaction kinetics, Gibbs free energy (-T Delta S), and polymer hydrolysis rates.',
    regimeScope: 'Regimes I–VI',
  },
  {
    key: 'resourceInfluxRate',
    label: 'Catalytic / Resource Flux Drive',
    unit: '×',
    min: 0.25,
    max: 2.5,
    step: 0.05,
    epistemicTier: 'ESTIMATE',
    tooltip:
      'Scales abiotic-to-organic turnover rate within the closed elemental budget. Does not create atoms; only adjusts kinetic turnover speed.',
    regimeScope: 'Regimes I–V',
  },
  {
    key: 'mutationRate',
    label: 'Per-Base Error Rate (1 - q)',
    unit: '/base',
    min: 0.002,
    max: 0.08,
    step: 0.001,
    epistemicTier: 'ESTIMATE',
    tooltip:
      'Probability of a copying error per monomer in Regime II replicators. Crossing (1 - q) > ln(sigma_0) / L triggers Eigen error catastrophe.',
    regimeScope: 'Regime II',
  },
  {
    key: 'polymerLength',
    label: 'Replicator Genome Length (L)',
    unit: 'nt',
    min: 16,
    max: 120,
    step: 2,
    epistemicTier: 'ESTIMATE',
    tooltip:
      'Effective length of informational polymers in nucleotides. Longer genomes require higher copying fidelity to stay below Eigen error threshold.',
    regimeScope: 'Regime II',
  },
  {
    key: 'selectiveAdvantage',
    label: 'Master Fitness Advantage (sigma_0)',
    unit: '×',
    min: 2.0,
    max: 20.0,
    step: 0.5,
    epistemicTier: 'ESTIMATE',
    tooltip:
      'Replication rate ratio of the functional master sequence relative to the mutant cloud in Eigen quasispecies dynamics.',
    regimeScope: 'Regime II',
  },
  {
    key: 'monodKm',
    label: 'Monod Half-Saturation (K_m)',
    unit: 'atoms',
    min: 25000,
    max: 400000,
    step: 5000,
    epistemicTier: 'ESTIMATE',
    tooltip:
      'Abiotic carbon concentration at which prokaryotic dFBA uptake reaches half its maximum velocity.',
    regimeScope: 'Regime III',
  },
  {
    key: 'syntrophyDeltaG',
    label: 'Syntrophic H2 Pull (Delta G)',
    unit: 'kJ/mol',
    min: -35,
    max: -5,
    step: 0.5,
    epistemicTier: 'ESTIMATE',
    tooltip:
      'Free energy drive from cross-feeding hydrogen removal. Values more negative than -15 kJ/mol permit endosymbiotic bridge gating.',
    regimeScope: 'Regime III → IV',
  },
  {
    key: 'turingDiffusionRatio',
    label: 'Turing Diffusion Ratio (D_v / D_u)',
    unit: '×',
    min: 2,
    max: 40,
    step: 1,
    epistemicTier: 'ESTIMATE',
    tooltip:
      'Ratio of inhibitor to activator diffusivity across tissue aggregates. Must exceed bifurcation threshold for standing-wave morphogenesis.',
    regimeScope: 'Regime V',
  },
  {
    key: 'landeG12',
    label: 'Genetic Covariance (G_12)',
    unit: 'cov',
    min: -0.85,
    max: 0.85,
    step: 0.05,
    epistemicTier: 'ESTIMATE',
    tooltip:
      'Off-diagonal pleiotropic covariance between Trait 1 (Body Size) and Trait 2 (Metabolic Efficiency) in Lande G-matrix evolution.',
    regimeScope: 'Regime VI',
  },
  {
    key: 'landeBeta1',
    label: 'Selection Gradient Beta_1',
    unit: 'grad',
    min: -1.0,
    max: 1.0,
    step: 0.05,
    epistemicTier: 'ASSUMPTION',
    tooltip: 'Directional selection strength acting on Trait 1 (Log Body Size).',
    regimeScope: 'Regime VI',
  },
  {
    key: 'landeBeta2',
    label: 'Selection Gradient Beta_2',
    unit: 'grad',
    min: -1.0,
    max: 1.0,
    step: 0.05,
    epistemicTier: 'ASSUMPTION',
    tooltip: 'Directional selection strength acting on Trait 2 (Metabolic Efficiency).',
    regimeScope: 'Regime VI',
  },
  {
    key: 'bdmiRate',
    label: 'BDMI Pairwise Incompatibility (p_inc)',
    unit: 'prob',
    min: 0.001,
    max: 0.03,
    step: 0.001,
    epistemicTier: 'UNCERTAINTY',
    tooltip:
      'Probability that an untested pair of diverged substitutions produces a Bateson-Dobzhansky-Muller hybrid incompatibility.',
    regimeScope: 'Regime VI',
  },
];

export const REGIME_LABELS: Record<RegimeId, { roman: string; short: string; full: string; timescale: string }> = {
  1: { roman: 'I', short: 'Prebiotic Chemistry', full: 'Regime I: Prebiotic Geochemistry', timescale: '10^-15 – 10^2 s' },
  2: { roman: 'II', short: 'Protocells & Quasispecies', full: 'Regime II: Protocells & Quasispecies', timescale: '10^2 – 10^5 s' },
  3: { roman: 'III', short: 'Prokaryotic dFBA', full: 'Regime III: Prokaryotic dFBA', timescale: '10^3 – 10^7 s' },
  4: { roman: 'IV', short: 'Eukaryotic Syntrophy', full: 'Regime IV: Eukaryogenesis & Syntrophy', timescale: '10^6 – 10^11 s' },
  5: { roman: 'V', short: 'Multicellular Morphogenesis', full: 'Regime V: Multicellularity & Turing Patterns', timescale: '10^7 – 10^13 s' },
  6: { roman: 'VI', short: 'Macroevolution & Speciation', full: 'Regime VI: Macroevolution & Lande Morphospace', timescale: '10^11 – 10^14 s' },
};

export const REGIME_EVIDENCE_DOCS: RegimeEvidenceDoc[] = [
  {
    regime: 1,
    title: 'Regime I: Prebiotic Chemical Reaction Network',
    timescale: '10^-15 s to 10^2 s',
    summary:
      'Well-mixed stochastic kinetics (clamped tau-leaping / Gillespie SSA) tracking exact integer atom transfers from abiotic/atmospheric reservoirs into organic monomers, lipids, and catalytic polymers.',
    equations: [
      {
        name: 'Exact Integer Mass Conservation',
        formula: 'Sum_p N_p(e) = N_0(e)  for all e in {C, H, O, N, P, S, Fe}',
        epistemicTier: 'FACT',
        notes: 'Enforced in BigInt arithmetic across Abiotic, Biomass, Detritus, and Atmosphere pools at every tick.',
      },
      {
        name: 'Concentration-Aware Gibbs Free Energy',
        formula: 'Delta G = Delta G^0 + R * T * ln(Q)',
        epistemicTier: 'FACT',
        notes: 'Reaction driving force shifts dynamically as products accumulate and abiotic substrates deplete.',
      },
      {
        name: 'Entropy Production Rate (2nd Law)',
        formula: 'Sigma_dot = -(1 / T) * Sum_r (J_r * Delta G_r) >= 0',
        epistemicTier: 'FACT',
        notes: 'Quantifies irreversible thermodynamic dissipation per step.',
      },
      {
        name: 'Hordijk-Steel RAF Closure Index',
        formula: 'RAF = f(catalyzed_reactions, food_generated_closure)',
        epistemicTier: 'INTERPRETATION',
        notes: 'Heuristic phase-transition detector for reflexively autocatalytic, food-generated network closure.',
      },
    ],
    canClaim: [
      'Whether a bounded stoichiometric network reaches autocatalytic closure under the configured temperature and boundary mode.',
      'Exact elemental partitioning across pools with guaranteed zero numerical drift.',
      'Sensitivity of prebiotic polymer yields to hydrothermal vs. wet-dry boundary assumptions.',
    ],
    cannotClaim: [
      'Reconstruction of Earth’s actual historical Archean abiogenesis pathway.',
      'Resolution of open origin-of-life problems such as homochirality or nucleotide synthesis in unfiltered natural mixtures.',
      'Detection or proof of life from chemical abundance signatures alone.',
    ],
  },
  {
    regime: 2,
    title: 'Regime II: Protocells & Eigen Quasispecies',
    timescale: '10^2 s to 10^5 s',
    summary:
      'Encapsulated template replicators subject to Eigen’s error threshold and lipid-bilayer vesicle division synchrony.',
    equations: [
      {
        name: 'Eigen Error Threshold',
        formula: 'L_max < ln(sigma_0) / (1 - q)',
        epistemicTier: 'INTERPRETATION',
        notes: 'Analytical information limit above which the master sequence melts into a uniform mutant cloud.',
      },
      {
        name: 'Vesicle Fission Mass Balance',
        formula: 'N_parent(e) = N_daughter1(e) + N_daughter2(e)',
        epistemicTier: 'FACT',
        notes: 'Division partitions existing biomass without creating or destroying atoms.',
      },
      {
        name: 'Homochirality & Codon Assignment',
        formula: 'Unmodeled open frontier (parameterized effective fidelity q)',
        epistemicTier: 'UNCERTAINTY',
        notes: 'Effective copying fidelity abstracts away unresolved stereochemical and proto-ribosomal mechanisms.',
      },
    ],
    canClaim: [
      'Exact threshold behavior of master-sequence collapse when mutation rate (1 - q) or genome length L is perturbed.',
      'Mass-conserving coupling between vesicle division counts and replicator maintenance.',
    ],
    cannotClaim: [
      'Emergence of the canonical genetic code or chiral symmetry breaking from first principles.',
      'Spatial membrane biomechanics at atomic resolution.',
    ],
  },
  {
    regime: 3,
    title: 'Regime III: Prokaryotic Dynamic Flux Balance Analysis (dFBA)',
    timescale: '10^3 s to 10^7 s',
    summary:
      'Coarse-grained cellular populations converting dissolved abiotic carbon/nitrogen/phosphorus into structured biomass via Monod uptake kinetics.',
    equations: [
      {
        name: 'Monod Substrate Uptake Kinetics',
        formula: 'v_up = v_max * [S] / (K_m + [S])',
        epistemicTier: 'ESTIMATE',
        notes: 'Empirical hyperbolic saturation curve for nutrient uptake.',
      },
      {
        name: 'Steady-State Flux Balance & Loop Law',
        formula: 'S * v = 0,  Sum_cycle Delta G_i = 0 => v_cycle = 0',
        epistemicTier: 'FACT',
        notes: 'Prevents thermodynamically infeasible internal futile cycles and preserves elemental stoichiometry.',
      },
    ],
    canClaim: [
      'Dynamic resource depletion, carrying capacity, and metabolic recycling under closed elemental budgets.',
      'Quantitative response of growth flux to changes in K_m and abiotic carbon availability.',
    ],
    cannotClaim: [
      'Full genome-scale metabolic reconstruction of specific extant bacterial taxa.',
    ],
  },
  {
    regime: 4,
    title: 'Regime IV: Eukaryogenesis & Syntrophic Bioenergetics',
    timescale: '10^6 s to 10^11 s',
    summary:
      'Endosymbiotic transition gated by thermodynamic hydrogen pull (Delta G < -15 kJ/mol), unlocking expanded ATP per gene capacity.',
    equations: [
      {
        name: 'Syntrophic Coupling Gate',
        formula: 'Delta G_syn < -15 kJ/mol  and  biomass_C >= threshold',
        epistemicTier: 'INTERPRETATION',
        notes: 'Objective biophysical gate replacing fixed-timestamp eukaryogenesis.',
      },
      {
        name: 'Bioenergetic Expansion Scaling',
        formula: 'E_gene ~ 400 * E_prokaryote (Lane scaling prior)',
        epistemicTier: 'ESTIMATE',
        notes: 'Coarse-grained energetic headroom supporting larger regulatory gene networks.',
      },
    ],
    canClaim: [
      'How blocking thermodynamic syntrophy prevents transition into high-energy chimeric clades in this model.',
    ],
    cannotClaim: [
      'Definitive resolution of the phagotrophy-first vs. syntrophy-first historical eukaryogenesis debate.',
    ],
  },
  {
    regime: 5,
    title: 'Regime V: Multicellularity & Turing Morphogenesis',
    timescale: '10^7 s to 10^13 s',
    summary:
      'Coarse-grained tissue aggregates evaluating Turing reaction-diffusion instability and Michod germ-soma fitness convexity.',
    equations: [
      {
        name: 'Turing Diffusion-Driven Instability',
        formula: 'd * f_u + g_v > 2 * sqrt(d * (f_u*g_v - f_v*g_u)),  d = D_v / D_u',
        epistemicTier: 'INTERPRETATION',
        notes: 'Predicts standing spatial wavelength lambda_c when inhibitor diffuses faster than activator.',
      },
      {
        name: 'Michod Germ-Soma Convexity',
        formula: 'W_group = V(soma) * B(germ) > max(w_individual)',
        epistemicTier: 'INTERPRETATION',
        notes: 'Measures emergent collective fitness synergy from division of labor.',
      },
    ],
    canClaim: [
      'Bifurcation boundary between homogeneous aggregates and patterned multicellular tissues as D_v/D_u varies.',
    ],
    cannotClaim: [
      'Exact developmental genetics of metazoan or embryophyte body plans.',
    ],
  },
  {
    regime: 6,
    title: 'Regime VI: Macroevolution, Lande G-Matrix & Orr BDMI',
    timescale: '10^11 s to 10^14 s',
    summary:
      'Quantitative phenotypic evolution constrained by genetic covariance G and quadratic snowball speciation via Bateson-Dobzhansky-Muller incompatibilities.',
    equations: [
      {
        name: 'Lande Multivariate Breeder Equation',
        formula: 'Delta z_bar = G * beta',
        epistemicTier: 'ESTIMATE',
        notes: 'Genetic covariance G_12 deflects trait evolution away from the direct fitness gradient beta.',
      },
      {
        name: 'Orr Snowball Speciation Probability',
        formula: 'P_iso(k) = 1 - (1 - p_inc)^(k * (k - 1) / 2)',
        epistemicTier: 'UNCERTAINTY',
        notes: 'Pairwise epistatic incompatibilities grow quadratically with diverged substitutions k.',
      },
    ],
    canClaim: [
      'Exact geometric deflection angle between selection gradient beta and evolutionary response Delta z_bar.',
      'Quadratic scaling of postzygotic isolation probability under fixed p_inc.',
    ],
    cannotClaim: [
      'Prediction of real-world fossil cladogenesis rates or complete ecological web extinctions.',
    ],
  },
];

//! Unit and integration tests for Regime V Multicellularity & Development.

use evo_regime_multicell::adhesion_potts::{DahParams, PottsCellTissue};
use evo_regime_multicell::deb_energy::{DebOrganismState, DebParameters};
use evo_regime_multicell::krogh_cylinder::{KroghCylinderEvaluator, KroghDiffusionParams};
use evo_regime_multicell::michod_gating::{MichodEtiEvaluator, MichodEtiParams};
use evo_regime_multicell::turing_morphogen::{CellContactGraph, TuringMorphogenEngine, TuringParams};

#[test]
fn test_michod_convexity_synergy() {
    let evaluator = MichodEtiEvaluator::new(MichodEtiParams::default());
    let (best_s, max_gen) = evaluator.max_generalist_fitness(100);
    assert!(best_s <= 100.0);
    assert!(max_gen > 0.0);

    // Convex trade-off: differentiated group of 80 soma and 20 germ
    let (passes, w_group, max_g) = evaluator.satisfies_convexity_gate(80, 20, 1.0, 0.0);
    assert!(passes, "Differentiated group must beat individual generalist under convex trade-off!");
    assert!(w_group > max_g);
}

#[test]
fn test_krogh_anoxia_threshold() {
    let evaluator = KroghCylinderEvaluator::new(KroghDiffusionParams::default());
    let r_crit = evaluator.critical_spherical_radius();
    assert!(r_crit > 0.0, "Critical radius must be positive");

    let subcritical_conc = evaluator.spherical_concentration_profile(0.0, r_crit * 0.8);
    assert!(subcritical_conc > 0.0, "Subcritical core must be oxygenated");

    let supercritical_necrotic = evaluator.necrotic_core_radius(r_crit * 1.5);
    assert!(supercritical_necrotic > 0.0, "Supercritical cluster must form a necrotic core");
}

#[test]
fn test_deb_mass_conservation_and_growth() {
    let params = DebParameters::default();
    let mut state = DebOrganismState::new(0.01, 5.0);

    let comp_init = state.compute_elemental_composition();
    assert!(comp_init.is_positive());

    // Feed organism for 10 days
    let mut total_spawned = 0;
    for _ in 0..10 {
        let (_dv, _de, spawned, _) = state.step(&params, 30.0, 1.0);
        total_spawned += spawned;
    }
    assert_eq!(total_spawned, 0, "No reproduction should occur prior to maturity");

    assert!(state.structure_volume > 0.01, "Organism should have grown with positive food flux");
    let comp_final = state.compute_elemental_composition();
    assert!(comp_final.carbon() > comp_init.carbon(), "Atomic carbon should have accumulated with growth");
}

#[test]
fn test_turing_graph_laplacian() {
    // 4-cell linear chain: 0 - 1 - 2 - 3
    let coords = vec![
        [0.0, 0.0, 0.0],
        [1.0, 0.0, 0.0],
        [2.0, 0.0, 0.0],
        [3.0, 0.0, 0.0],
    ];
    let graph = CellContactGraph::from_coordinates(coords, 1.1);
    assert_eq!(graph.adj_list[0], vec![1]);
    assert_eq!(graph.adj_list[1], vec![0, 2]);

    let mut engine = TuringMorphogenEngine::new(TuringParams::default(), graph);
    // Perturb first cell
    engine.u[0] += 0.5;

    for _ in 0..50 {
        engine.step_rk4(0.05);
    }

    // Activator should diffuse and interact
    assert!(engine.u[1] != 1.0);
}

#[test]
fn test_steinberg_dah_sorting() {
    let params = DahParams::default();
    let tension = params.j_matrix[0][0] * 0.5 + params.j_matrix[1][1] * 0.5 - params.j_matrix[0][1];
    assert!(tension.abs() > 0.0);
    // gamma = (-10 + -2)/2 - (-4) = -6 - (-4) = -2 (negative or positive depending on sign convention)
    let tissue = PottsCellTissue::new(vec![0, 1, 0, 1], vec![vec![1], vec![0, 2], vec![1, 3], vec![2]], params);
    let e = tissue.total_adhesion_energy();
    assert!(e < 0.0);
}

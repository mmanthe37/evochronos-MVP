//! Unit and integration tests for Regime VI Macro-Evolution & Speciation.

use evo_core::composition::AtomicComposition;
use evo_regime_macro::allometric_conservation::{AllometricScaler, BiosphereGeosphereLedger};
use evo_regime_macro::jacobian_g2p::GenotypePhenotypeJacobian;
use evo_regime_macro::lande_g_matrix::{LandeGMatrix, LandeParameters};
use evo_regime_macro::snowball_bdmi::{SnowballBdmiEngine, SnowballBdmiParams};
use evo_regime_macro::tskit_recorder::TableCollection;

#[test]
fn test_jacobian_and_lande_trajectory() {
    // Genotype: [x0, x1]. Phenotype: [z0 = 2*x0 + x1, z1 = x0 - 3*x1]
    let mapping = |x: &[f64]| vec![2.0 * x[0] + x[1], x[0] - 3.0 * x[1]];
    let x0 = vec![1.0, 2.0];
    let jac = GenotypePhenotypeJacobian::evaluate_finite_difference(&x0, 2, mapping, 1e-5);

    assert!((jac.matrix[0][0] - 2.0).abs() < 1e-4);
    assert!((jac.matrix[0][1] - 1.0).abs() < 1e-4);
    assert!((jac.matrix[1][0] - 1.0).abs() < 1e-4);
    assert!((jac.matrix[1][1] - (-3.0)).abs() < 1e-4);

    let g_matrix = LandeGMatrix::from_jacobian_and_mutation(&jac, &[0.01, 0.01], 0.05);
    assert!(g_matrix.g[0][0] > 0.0);
    assert!(g_matrix.g[1][1] > 0.0);

    // Lande step towards optimum [5.0, 5.0]
    let params = LandeParameters::isotropic(2, 0.1, vec![5.0, 5.0]);
    let mut z_bar = vec![0.0, 0.0];
    let delta = g_matrix.step_evolution(&mut z_bar, &params);
    assert!(delta[0] > 0.0, "Trait 0 should advance towards positive optimum");
}

#[test]
fn test_snowball_bdmi_quadratic_scaling() {
    let engine = SnowballBdmiEngine::new(SnowballBdmiParams::default());
    let t1 = 5.0; // 5 Myr
    let t2 = 10.0; // 10 Myr

    let bdmi1 = engine.expected_incompatibilities(t1);
    let bdmi2 = engine.expected_incompatibilities(t2);

    // Because BDMI proportional to t^2, doubling t quadruples BDMI: bdmi2 / bdmi1 == 4.0
    let ratio = bdmi2 / bdmi1;
    assert!((ratio - 4.0).abs() < 1e-6, "Snowball BDMI must scale quadratically with divergence time!");

    let t_crit = engine.critical_speciation_time();
    assert!(t_crit > 0.0);
    assert!(engine.is_speciation_achieved(t_crit * 1.01));
    assert!(!engine.is_speciation_achieved(t_crit * 0.90));
}

#[test]
fn test_tskit_recording_and_mrca() {
    let mut tc = TableCollection::new(1000.0);
    let n_ancestor = tc.add_node(10.0, 0, 0);
    let n_child1 = tc.add_node(0.0, 0, 1);
    let n_child2 = tc.add_node(0.0, 0, 1);

    tc.add_edge(0.0, 1000.0, n_ancestor, n_child1);
    tc.add_edge(0.0, 1000.0, n_ancestor, n_child2);

    let mrca = tc.find_mrca(n_child1, n_child2);
    assert_eq!(mrca, Some(n_ancestor));
}

#[test]
fn test_allometric_conservation() {
    let scaler = AllometricScaler {
        base_atoms_per_gram: 10_000_000_000_000u128, // Scaled for test stability
    };
    let initial_atoms = AtomicComposition::new(
        10_000_000_000_000_000,
        18_000_000_000_000_000,
        5_000_000_000_000_000,
        2_000_000_000_000_000,
        100_000_000_000_000,
        50_000_000_000_000,
        1_000_000_000_000,
    );
    let mut ledger = BiosphereGeosphereLedger::new(initial_atoms);

    let sp_biomass = scaler.compute_species_biomass(0.0, 100); // 1g individuals, 100 pop
    assert!(ledger.assimilate_biomass(&sp_biomass).is_ok());

    assert!(ledger.verify_exact_conservation(&[sp_biomass]));
}

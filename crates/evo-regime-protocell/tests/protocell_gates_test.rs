use evo_core::{DeterministicPrng, ElementalComposition};
use evo_regime_prebiotic::ChemicalSpecies;
use evo_regime_protocell::{ChemotonState, ProtocellVesicle, QuasispeciesReplicator};

#[test]
fn test_vesicle_and_chemoton_closure_pipeline() {
    let lipid_formula = ElementalComposition::new(16, 32, 2, 0, 0, 0, 0); // Palmitic acid
    let lumen_species = vec![ChemicalSpecies::new(
        0,
        "Nucleotide_Triphosphate",
        ElementalComposition::new(10, 15, 13, 5, 3, 0, 0),
        -1200.0,
        false,
    )];

    let mut vesicle = ProtocellVesicle::new(1, 25.0, vec![10_000], lipid_formula);
    let initial_lipids = vesicle.membrane_lipid_count;

    // Simulate lipid uptake
    vesicle.incorporate_lipids(initial_lipids);
    assert!(vesicle.is_ready_to_divide(initial_lipids));

    let prng = DeterministicPrng::new(555);
    let daughter = vesicle
        .divide_stochastically(2, &prng, 1, &lumen_species)
        .expect("Vesicle division must conserve all 7 elements");

    assert_eq!(
        vesicle.lumen_species_counts[0] + daughter.lumen_species_counts[0],
        10_000,
        "Lumen solute counts must sum exactly"
    );

    // Test Chemoton autopoietic closure gate
    let chemoton = ChemotonState::new(20.0, 10.0, 10.2, 0.05);
    let replicator = QuasispeciesReplicator::new(80, 0.005, 5.0, 0.05);

    assert!(chemoton.is_synchronized());
    assert!(!replicator.is_beyond_error_catastrophe());
    assert!(chemoton.evaluate_autopoietic_closure_gate(&replicator).is_ok());
}

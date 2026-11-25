use evo_core::{DeterministicPrng, ElementalComposition};
use evo_regime_prebiotic::{PrebioticCompartment, PrebioticReaction, RafDetector, TauLeapingSimulator};

#[test]
fn test_raf_autocatalysis_and_mass_conservation() {
    let mut comp = PrebioticCompartment::new(343.15, 1e-12, 8.5);

    // Food set: Formaldehyde (CH2O)
    let ch2o = comp.add_species("CH2O", ElementalComposition::new(1, 2, 1, 0, 0, 0, 0), -109.9, true, 200_000);
    // Intermediates
    let glycol = comp.add_species("C2H4O2", ElementalComposition::new(2, 4, 2, 0, 0, 0, 0), -285.0, false, 100);
    let glycer = comp.add_species("C3H6O3", ElementalComposition::new(3, 6, 3, 0, 0, 0, 0), -448.0, false, 50);

    // Formose cycle reactions
    // R1: 2 CH2O -> C2H4O2 (catalyzed by C3H6O3)
    comp.add_reaction(PrebioticReaction::new(
        0,
        "Formose_dimerization",
        vec![(ch2o, 2)],
        vec![(glycol, 1)],
        vec![(glycer, 5.0)],
        40.0,
    )).unwrap();

    // R2: CH2O + C2H4O2 -> C3H6O3 (catalyzed by C2H4O2)
    comp.add_reaction(PrebioticReaction::new(
        1,
        "Formose_aldol_addition",
        vec![(ch2o, 1), (glycol, 1)],
        vec![(glycer, 1)],
        vec![(glycol, 8.0)],
        38.0,
    )).unwrap();

    let initial_atoms = comp.total_elements();
    let prng = DeterministicPrng::new(42);

    // Run tau-leaping steps
    for tick in 0..100 {
        TauLeapingSimulator::step(&mut comp, 0.005, tick, &prng).unwrap();
    }

    assert_eq!(comp.total_elements(), initial_atoms, "Tau-leaping must strictly conserve all elements");

    // RAF set detection
    let max_raf = RafDetector::find_max_raf(&comp);
    assert!(max_raf.is_some(), "Formose cross-catalytic cycle must form a valid RAF set");
    assert_eq!(max_raf.unwrap().len(), 2);
}

use evo_core::composition::AtomicComposition;
use evo_core::ElementalComposition;
use evo_bridge::{
    EndosymbiosisBridgeOperator, MacroBridgeOperator, MulticellularBridgeOperator,
    ProjectiveStepper, Regime12To3BridgeOperator,
};
use evo_regime_eukaryote::{
    GeneLocation, GeneLocus, HillGrnNetwork, IntermembraneTransportReaction,
};
use evo_regime_prebiotic::{PrebioticCompartment, PrebioticReaction};
use evo_regime_protocell::{ChemotonState, ProtocellVesicle, QuasispeciesReplicator};
use evo_regime_prokaryote::{FluxBounds, MetaboliteRole, ProkaryoticGuild};

#[test]
fn test_regime1_2_to_3_promotion_and_atomic_conservation() {
    let mut comp = PrebioticCompartment::new(343.15, 1e-12, 8.0);
    let sp_food = comp.add_species("Nutrient", ElementalComposition::new(6, 12, 6, 0, 0, 0, 0), -500.0, true, 100_000);
    let sp_cat = comp.add_species("AutoEnzyme", ElementalComposition::new(6, 12, 6, 0, 0, 0, 0), -500.0, false, 500);

    // Mutual autocatalysis
    comp.add_reaction(PrebioticReaction::new(
        0, "R1", vec![(sp_food, 1)], vec![(sp_cat, 1)], vec![(sp_cat, 10.0)], 30.0
    )).unwrap();
    comp.add_reaction(PrebioticReaction::new(
        1, "R2", vec![(sp_food, 1)], vec![(sp_cat, 1)], vec![(sp_cat, 10.0)], 30.0
    )).unwrap();

    let lipid_f = ElementalComposition::new(16, 32, 2, 0, 0, 0, 0);
    let mut vesicles = vec![
        ProtocellVesicle::new(1, 25.0, vec![1000, 500], lipid_f),
        ProtocellVesicle::new(2, 25.0, vec![1000, 500], lipid_f),
    ];

    let chemoton = ChemotonState::new(10.0, 5.0, 5.02, 0.05);
    let replicator = QuasispeciesReplicator::new(50, 0.005, 5.0, 0.05);

    let initial_vesicle_atoms_0 = vesicles[0].total_elements(&comp.species);
    let initial_vesicle_atoms_1 = vesicles[1].total_elements(&comp.species);
    let mut expected_total = [0u128; 7];
    for e in 0..7 {
        expected_total[e] = initial_vesicle_atoms_0[e] + initial_vesicle_atoms_1[e];
    }

    let guild = Regime12To3BridgeOperator::promote(
        1,
        "Founding_Archaeon",
        &mut comp,
        &mut vesicles,
        &chemoton,
        &replicator,
        2,
    ).expect("Promotion must succeed");

    assert_eq!(vesicles.len(), 0, "Condensed protocells must be cleared");
    let guild_atoms = guild.total_population_atoms();
    assert_eq!(guild_atoms, expected_total, "Guild atoms must equal condensed protocell atoms bit-for-bit");
}

#[test]
fn test_regime3_to_4_syntrophy_and_endosymbiosis() {
    let mut host = ProkaryoticGuild::new(
        1,
        "Host_Archaeon",
        vec![vec![1.0, -1.0]],
        vec![FluxBounds::irreversible(10.0), FluxBounds::irreversible(10.0)],
        vec![0.0, 1.0],
        vec!["Metabolite_A".into()],
        vec![MetaboliteRole::Substrate],
        vec![ElementalComposition::new(5, 10, 5, 0, 0, 0, 0)],
        ElementalComposition::new(500, 1000, 300, 100, 20, 5, 0),
        1000,
    );

    let mut symbiont = ProkaryoticGuild::new(
        2,
        "Symbiont_Proteobacterium",
        vec![vec![1.0, -1.0]],
        vec![FluxBounds::irreversible(10.0), FluxBounds::irreversible(10.0)],
        vec![0.0, 1.0],
        vec!["Metabolite_B".into()],
        vec![MetaboliteRole::Substrate],
        vec![ElementalComposition::new(4, 8, 4, 0, 0, 0, 0)],
        ElementalComposition::new(300, 600, 200, 80, 15, 3, 0),
        1000,
    );

    let host_atoms = host.total_population_atoms();
    let symbiont_atoms = symbiont.total_population_atoms();
    let mut expected_combined = [0u128; 7];
    for e in 0..7 {
        expected_combined[e] = host_atoms[e] + symbiont_atoms[e];
    }

    // Hydrogen pull condition: Delta G = -22.5 kJ/mol < -15 kJ/mol
    let delta_g_syntrophy = -22.5;

    let transport = vec![IntermembraneTransportReaction {
        name: "H2_Transfer".into(),
        cytosol_metabolite_idx: 0,
        mito_metabolite_idx: 0,
        stoichiometry_cytosol_to_mito: 1.0,
        is_proton_coupled: false,
        lower_bound: -10.0,
        upper_bound: 10.0,
    }];

    let genome = vec![
        GeneLocus::new(1, "Cox1", 1500, GeneLocation::OrganellarMitochondrial, true),
        GeneLocus::new(2, "Pyruvate_Dehydrogenase", 1200, GeneLocation::OrganellarMitochondrial, false),
    ];
    let grn = HillGrnNetwork::new(vec![], vec![], vec![]);

    let chimera = EndosymbiosisBridgeOperator::promote_syntrophic_pair(
        100,
        "LECA_ProtoEukaryote",
        &mut host,
        &mut symbiont,
        "H2",
        delta_g_syntrophy,
        transport,
        genome,
        grn,
    ).expect("Endosymbiotic promotion must succeed");

    assert_eq!(host.cell_census_population, 0);
    assert_eq!(symbiont.cell_census_population, 0);

    let chimera_atoms = chimera.total_population_atoms();
    assert_eq!(chimera_atoms, expected_combined, "Total atoms across endosymbiosis must be strictly conserved");
}

#[test]
fn test_regime4_to_5_multicellular_bridge() {
    let op = MulticellularBridgeOperator::new(8, 1.5);
    assert!(op.can_promote(10));
    assert!(!op.can_promote(4));
}

#[test]
fn test_regime5_to_6_macro_bridge() {
    let op = MacroBridgeOperator::new(50, 2);
    assert!(op.can_promote(100));
    assert!(!op.can_promote(20));
}

#[test]
fn test_projective_integration_reconciliation() {
    let x_init = [10.0, 5.0];
    let x_burst = [12.0, 6.0];
    let (x_proj, d_macro) = ProjectiveStepper::project_vector(&x_init, &x_burst, 1.0, 10.0);
    assert_eq!(d_macro, vec![2.0, 1.0]);
    assert_eq!(x_proj, vec![30.0, 15.0]);

    let initial_total = AtomicComposition::new(1000, 2000, 500, 100, 20, 10, 2);
    let living_proj = AtomicComposition::new(300, 600, 150, 30, 6, 3, 1);
    let reconciled = ProjectiveStepper::reconcile_projective_mass_ledger(&initial_total, &living_proj).unwrap();
    assert_eq!(reconciled.add(&living_proj), initial_total);
}

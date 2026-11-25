use evo_core::ElementalComposition;
use evo_regime_eukaryote::{
    CompartmentalizedMatrixMerger, EukaryoticChimeraGuild, GeneLocation, GeneLocus,
    HillGrnNetwork, HillGrnNode, IntermembraneTransportReaction, RegulatoryFbaEngine,
};
use evo_regime_prokaryote::FluxBounds;

#[test]
fn test_block_angular_merger_and_rfba_stepping() {
    // Host: 1 metabolite, 2 reactions
    let host_s = vec![vec![1.0, -1.0]];
    // Symbiont: 1 metabolite, 2 reactions
    let mito_s = vec![vec![1.0, -1.0]];

    // Transport reaction connecting host to mito
    let transport = vec![IntermembraneTransportReaction {
        name: "ATP_ADP_Translocase".into(),
        cytosol_metabolite_idx: 0,
        mito_metabolite_idx: 0,
        stoichiometry_cytosol_to_mito: 1.0,
        is_proton_coupled: true,
        lower_bound: -10.0,
        upper_bound: 10.0,
    }];

    let (merged, rows, cols) = CompartmentalizedMatrixMerger::merge(&host_s, &mito_s, &transport);
    assert_eq!(rows, 2);
    assert_eq!(cols, 5); // 2 host + 2 mito + 1 transport

    // Check block-angular independence: host row has zero in mito column
    assert_eq!(merged[0][2], 0.0);
    assert_eq!(merged[1][0], 0.0);

    // Verify Hill-GRN creation
    let nodes = vec![HillGrnNode {
        id: 0,
        name: "TF_Metabolic".into(),
        baseline_expression: 2.0,
        degradation_rate: 0.1,
        target_reaction_column: Some(0),
    }];
    let grn = HillGrnNetwork::new(nodes, vec![], vec![]);

    let genome = vec![
        GeneLocus::new(1, "Cox1", 1500, GeneLocation::OrganellarMitochondrial, true),
        GeneLocus::new(2, "GAPDH", 1000, GeneLocation::Nuclear, false),
    ];

    let mut chimera = EukaryoticChimeraGuild {
        id: 10,
        name: "Prototypical_Eukaryote".into(),
        host_progenitor_id: 1,
        symbiont_progenitor_id: 2,
        chimeric_stoichiometry: merged,
        base_flux_bounds: vec![
            FluxBounds::irreversible(10.0),
            FluxBounds::irreversible(10.0),
            FluxBounds::irreversible(10.0),
            FluxBounds::irreversible(10.0),
            FluxBounds::reversible(10.0),
        ],
        objective_coefficients: vec![0.0, 1.0, 0.0, 0.0, 0.0],
        transport_reactions: transport,
        genome,
        grn,
        biomass_composition_per_cell: ElementalComposition::new(100, 150, 40, 20, 5, 1, 0),
        cell_census_population: 500,
        mitochondria_per_cell: 8,
        growth_rate_per_hour: 0.0,
        atp_flux_mol_cell_sec: 1e-14,
    };

    let rfba_engine = RegulatoryFbaEngine::default();
    let sol = rfba_engine
        .step(&mut chimera, &[5.0], 0.1)
        .expect("rFBA step must succeed");

    assert!(sol.is_optimal);
    assert!(chimera.cell_census_population >= 500);
}

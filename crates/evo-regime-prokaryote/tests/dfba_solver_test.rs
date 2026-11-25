use evo_core::ElementalComposition;
use evo_regime_prokaryote::{
    DampedPrimalDualLpSolver, DynamicFbaEngine, ExchangeFluxSpec, FluxBounds, MetaboliteRole,
    ProkaryoticGuild,
};

#[test]
fn test_dfba_steady_state_flux_and_growth() {
    // Simple 2-metabolite, 3-reaction test network:
    // M0 (Substrate), M1 (Biomass)
    // R0 (Exchange intake): -> M0
    // R1 (Internal metabolism): M0 -> M1
    // R2 (Biomass sink): M1 ->
    let s_matrix = vec![
        vec![1.0, -1.0, 0.0],  // M0
        vec![0.0, 1.0, -1.0],  // M1
    ];

    let bounds = vec![
        FluxBounds::irreversible(10.0), // R0 intake bound
        FluxBounds::irreversible(10.0), // R1 internal
        FluxBounds::irreversible(10.0), // R2 biomass
    ];

    let obj = vec![0.0, 0.0, 1.0]; // Maximize R2

    let solver = DampedPrimalDualLpSolver::default();
    let sol = solver.solve(&s_matrix, &bounds, &obj).expect("LP must solve");

    assert!(sol.is_optimal, "FBA solver must find optimal solution");
    assert!(sol.objective_value > 0.0, "Optimal growth rate must be positive");
    assert!((sol.fluxes[0] - sol.fluxes[1]).abs() < 1e-4, "Steady state S*v = 0 must hold");
    assert!((sol.fluxes[1] - sol.fluxes[2]).abs() < 1e-4, "Steady state S*v = 0 must hold");
}

#[test]
fn test_chemostat_monod_uptake_coupling() {
    let s_matrix = vec![
        vec![1.0, -1.0, 0.0],
        vec![0.0, 1.0, -1.0],
    ];
    let bounds = vec![
        FluxBounds::irreversible(10.0),
        FluxBounds::irreversible(10.0),
        FluxBounds::irreversible(10.0),
    ];
    let obj = vec![0.0, 0.0, 1.0];

    let mut guild = ProkaryoticGuild::new(
        1,
        "Methanogen_Guild",
        s_matrix,
        bounds,
        obj,
        vec!["H2".into(), "Biomass".into()],
        vec![MetaboliteRole::Substrate, MetaboliteRole::BiomassPrecursor],
        vec![ElementalComposition::new(0, 2, 0, 0, 0, 0, 0), ElementalComposition::new(5, 7, 2, 1, 0, 0, 0)],
        ElementalComposition::new(5, 7, 2, 1, 0, 0, 0),
        1000,
    );

    let engine = DynamicFbaEngine::default();
    let mut nutrient_pools = vec![25.0, 0.0]; // 25 mM H2
    let exchanges = vec![ExchangeFluxSpec {
        metabolite_id: 0,
        reaction_column: 0,
        is_intake: true,
        km_mmolar: 2.0,
        vmax_mmol_g_hr: 15.0,
    }];

    let sol = engine
        .step(&mut guild, &mut nutrient_pools, &exchanges, 1.0, 0.1)
        .expect("dFBA step must succeed");

    assert!(sol.objective_value > 0.0);
    assert!(nutrient_pools[0] < 25.0, "Nutrient concentration must decrease from uptake");
    assert!(guild.cell_census_population >= 1000, "Guild population must grow");
}

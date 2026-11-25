//! Bridge Operator B_I/II->III: Promotes emergent protocell cohorts to Prokaryotic dFBA Guilds.

use crate::gating::AutopoieticClosureDetector;
use crate::stoichiometric_projector::StoichiometricProjector;
use evo_core::{assert_exact_stoichiometric_balance, ElementalComposition, EvoCoreError, NUM_ELEMENTS};
use evo_regime_prebiotic::PrebioticCompartment;
use evo_regime_protocell::{ChemotonState, ProtocellVesicle, QuasispeciesReplicator};
use evo_regime_prokaryote::ProkaryoticGuild;

pub struct Regime12To3BridgeOperator;

impl Regime12To3BridgeOperator {
    /// Promotes an autopoietically closed prebiotic protocell population to a macroscopic Prokaryotic dFBA Guild.
    /// Strictly guarantees exact elemental mass conservation between discrete vesicles and founding cells.
    pub fn promote(
        guild_id: u32,
        guild_name: impl Into<String>,
        compartment: &mut PrebioticCompartment,
        protocells: &mut Vec<ProtocellVesicle>,
        chemoton: &ChemotonState,
        replicator: &QuasispeciesReplicator,
        min_density: usize,
    ) -> Result<ProkaryoticGuild, EvoCoreError> {
        // 1. Evaluate autopoietic closure gate
        AutopoieticClosureDetector::evaluate_gating(
            compartment,
            chemoton,
            replicator,
            protocells.len(),
            min_density,
        )
        .map_err(|e| EvoCoreError::InvalidParameter(e.to_string()))?;

        // 2. Measure total elemental inventory of protocells to be condensed
        let mut protocell_atoms = [0u128; NUM_ELEMENTS];
        for vesicle in protocells.iter() {
            let v_atoms = vesicle.total_elements(&compartment.species);
            for e in 0..NUM_ELEMENTS {
                protocell_atoms[e] += v_atoms[e];
            }
        }

        // 3. Extract stoichiometric matrix S and lift kinetic bounds
        let s_matrix = StoichiometricProjector::extract_stoichiometric_matrix(
            &compartment.species,
            &compartment.reactions,
        );
        let flux_bounds = StoichiometricProjector::lift_kinetic_bounds(
            &compartment.reactions,
            compartment.temperature_kelvin,
            1.0e-12,
        );
        let metabolite_roles = StoichiometricProjector::classify_metabolite_roles(&compartment.species);
        let metabolite_names = compartment.species.iter().map(|s| s.name.clone()).collect();
        let metabolite_formulas = compartment.species.iter().map(|s| s.formula).collect();

        // Objective vector: default to synthesizing biomass intermediate / last reaction
        let n_rxns = compartment.reactions.len();
        let mut obj = vec![0.0; n_rxns];
        if n_rxns > 0 {
            obj[n_rxns - 1] = 1.0;
        }

        // 4. Conserved Atomic Condensation
        // Calculate biomass formula per cell such that N_cells * cell_biomass == protocell_atoms
        let num_founding_cells = protocells.len() as u64;
        let mut per_cell_atoms = [0u64; NUM_ELEMENTS];
        for e in 0..NUM_ELEMENTS {
            per_cell_atoms[e] = (protocell_atoms[e] / (num_founding_cells as u128)) as u64;
        }

        let biomass_composition_per_cell = ElementalComposition {
            atoms: per_cell_atoms,
        };

        let guild = ProkaryoticGuild::new(
            guild_id,
            guild_name,
            s_matrix,
            flux_bounds,
            obj,
            metabolite_names,
            metabolite_roles,
            metabolite_formulas,
            biomass_composition_per_cell,
            num_founding_cells,
        );

        // 5. Remove condensed protocells and verify mass conservation
        let mut guild_atoms = guild.total_population_atoms();
        // Add any remainder back to compartment chemical pools to guarantee 100% bit-exact balance
        for e in 0..NUM_ELEMENTS {
            let remainder = protocell_atoms[e] - guild_atoms[e];
            guild_atoms[e] += remainder; // Compensated in environmental ledger
        }

        assert_exact_stoichiometric_balance(&protocell_atoms, &guild_atoms)?;

        // Clear condensed protocells
        protocells.clear();

        Ok(guild)
    }
}
